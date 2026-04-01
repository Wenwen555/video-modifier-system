from __future__ import annotations

import math
import time
from dataclasses import asdict, dataclass
from typing import Any, Sequence

from utils.op_util import Modifier


@dataclass
class VideoMetadata:
    video_id: str
    video_uri: str
    fps: float
    total_frames: int
    duration_sec: float


@dataclass
class SegmentMetadata:
    segment_id: str
    start_sec: float
    end_sec: float
    start_frame: int
    end_frame: int
    duration_sec: float


@dataclass
class SamplingConfig:
    sampling_mode: str = "CENTER"
    num_frames: int = 4
    padding_frames: int = 2
    target_fps: float | None = None
    max_frames_per_segment: int | None = None


class A3_Sampling_Operator(Modifier):
    operator_version = "0.1.0"
    video_metadata_key = "video_metadata"
    segments_key = "segments"
    output_key = "samples"
    result_key = "sampling_result"

    def __init__(
        self,
        sampling_mode="CENTER",
        num_frames=4,
        padding_frames=2,
        target_fps=None,
        max_frames_per_segment=None,
        strict=True,
        operator_name="a3_sampling_operator",
        accelerator="cpu",
        *args,
        **kwargs,
    ):
        super().__init__(operator_name, accelerator=accelerator, *args, **kwargs)

        self.strict = strict
        self.sampling_config = SamplingConfig(
            sampling_mode=sampling_mode,
            num_frames=num_frames,
            padding_frames=padding_frames,
            target_fps=target_fps,
            max_frames_per_segment=max_frames_per_segment,
        )

    def process(self, instance: dict[str, Any]) -> dict[str, Any]:
        record = dict(instance)

        try:
            video = self._build_video_metadata(record)
            segments = self._normalize_segments(record.get(self.segments_key), video)
            result = self.sample(video, segments)

            record.setdefault("video_id", video.video_id)
            record.setdefault("video_uri", video.video_uri)
            record.setdefault(self.video_metadata_key, asdict(video))
            record[self.output_key] = result["samples"]
            record[self.result_key] = result
            record["sampling_mode"] = result["sampling_mode"]
            record["sampling_metrics"] = result["global_metrics"]
            return record
        except Exception as exc:
            if self.strict:
                raise
            record[self.output_key] = []
            record[self.result_key] = {
                "operator_name": self.operator_name,
                "operator_version": self.operator_version,
                "status": "error",
                "error": str(exc),
            }
            record["sampling_error"] = str(exc)
            return record

    def sample(
        self,
        video: VideoMetadata,
        segments: Sequence[SegmentMetadata],
    ) -> dict[str, Any]:
        start_time = time.perf_counter()
        sampling_mode = self.sampling_config.sampling_mode.upper()
        supported_modes = {"CENTER", "UNIFORM", "HEAD_TAIL", "STATE"}
        if sampling_mode not in supported_modes:
            raise ValueError(f"Unsupported sampling mode: {self.sampling_config.sampling_mode}")

        samples: list[dict[str, Any]] = []
        for segment in segments:
            samples.extend(self._sample_segment(video, segment, sampling_mode))

        for index, sample in enumerate(samples, start=1):
            sample_id = f"smp_{index:06d}"
            sample["id"] = sample_id
            sample["sample_id"] = sample_id
            sample["operator_name"] = self.operator_name
            sample["operator_version"] = self.operator_version

        duration_ms = int((time.perf_counter() - start_time) * 1000)

        return {
            "video_id": video.video_id,
            "video_uri": video.video_uri,
            "operator_name": self.operator_name,
            "operator_version": self.operator_version,
            "sampling_mode": sampling_mode,
            "global_metrics": {
                "total_segments": len(segments),
                "total_samples": len(samples),
                "processing_time_ms": duration_ms,
            },
            "samples": samples,
        }

    def _sample_segment(
        self,
        video: VideoMetadata,
        segment: SegmentMetadata,
        sampling_mode: str,
    ) -> list[dict[str, Any]]:
        frame_indices, sample_types = self._select_frame_indices(segment, sampling_mode)
        frame_indices = self._unique_preserve_order(frame_indices)
        limited_frames = self._apply_segment_limit(frame_indices)

        samples = []
        for rank, frame_index in enumerate(limited_frames, start=1):
            sample_type = sample_types[min(rank - 1, len(sample_types) - 1)]
            samples.append(
                self._build_sample(
                    video=video,
                    segment=segment,
                    frame_index=frame_index,
                    sampling_mode=sampling_mode,
                    sample_type=sample_type,
                    rank=rank,
                    total=len(limited_frames),
                )
            )
        return samples

    def _select_frame_indices(
        self,
        segment: SegmentMetadata,
        sampling_mode: str,
    ) -> tuple[list[int], list[str]]:
        last_frame = max(segment.start_frame, segment.end_frame - 1)

        if sampling_mode == "CENTER":
            frame_index = segment.start_frame + (last_frame - segment.start_frame) // 2
            return [frame_index], ["CENTER"]
        if sampling_mode == "UNIFORM":
            frame_indices = self._build_uniform_frame_indices(segment)
            return frame_indices, ["UNIFORM"] * len(frame_indices)
        if sampling_mode == "HEAD_TAIL":
            return [segment.start_frame, last_frame], ["HEAD", "TAIL"]

        offset = min(
            max(0, int(self.sampling_config.padding_frames)),
            max(0, (last_frame - segment.start_frame) // 2),
        )
        return [segment.start_frame + offset, last_frame - offset], ["STATE_HEAD", "STATE_TAIL"]

    def _build_uniform_frame_indices(self, segment: SegmentMetadata) -> list[int]:
        start_frame = segment.start_frame
        last_frame = max(segment.start_frame, segment.end_frame - 1)
        available_frames = max(1, last_frame - start_frame + 1)

        if self.sampling_config.target_fps is not None:
            if self.sampling_config.target_fps <= 0:
                raise ValueError("target_fps must be positive")
            frame_count = int(math.ceil(segment.duration_sec * self.sampling_config.target_fps))
        else:
            frame_count = int(self.sampling_config.num_frames)

        frame_count = max(1, frame_count)
        frame_count = min(frame_count, available_frames)

        if frame_count == 1:
            return [start_frame + (last_frame - start_frame) // 2]

        step = (last_frame - start_frame) / max(1, frame_count - 1)
        return [
            int(round(start_frame + index * step))
            for index in range(frame_count)
        ]

    def _apply_segment_limit(self, frame_indices: Sequence[int]) -> list[int]:
        limited = list(frame_indices)
        if self.sampling_config.max_frames_per_segment is not None:
            limit = max(1, int(self.sampling_config.max_frames_per_segment))
            limited = limited[:limit]
        return limited

    def _build_sample(
        self,
        video: VideoMetadata,
        segment: SegmentMetadata,
        frame_index: int,
        sampling_mode: str,
        sample_type: str,
        rank: int,
        total: int,
    ) -> dict[str, Any]:
        timestamp_sec = min(video.duration_sec, round(frame_index / video.fps, 3))
        relative_position = self._compute_relative_position(segment, frame_index)

        return {
            "segment_id": segment.segment_id,
            "source_ids": [video.video_id, segment.segment_id],
            "timestamp_sec": timestamp_sec,
            "frame_index": frame_index,
            "sample_type": sample_type,
            "sampling_mode": sampling_mode,
            "relative_position": relative_position,
            "sample_rank": rank,
            "samples_in_segment": total,
            "is_representative": True,
            "confidence": 1.0,
            "status": "active",
            "resource_refs": {
                "video_uri": video.video_uri,
            },
        }

    def _normalize_segments(
        self,
        segments: Sequence[dict[str, Any]] | None,
        video: VideoMetadata,
    ) -> list[SegmentMetadata]:
        if not segments:
            raise ValueError("Missing segments. Expected A1 output in 'segments'.")

        normalized = []
        for index, segment in enumerate(segments, start=1):
            frame_range = segment.get("frame_range")
            if not isinstance(frame_range, dict):
                raise ValueError("Each segment must provide a 'frame_range' dict from A1 output.")

            start_frame = frame_range.get("start_frame")
            end_frame = frame_range.get("end_frame")
            if start_frame is None or end_frame is None:
                raise ValueError("Each segment must provide frame_range.start_frame and frame_range.end_frame.")

            start_frame = max(0, min(video.total_frames - 1, int(start_frame)))
            end_frame = max(start_frame + 1, min(video.total_frames, int(end_frame)))
            start_sec = round(start_frame / video.fps, 3)
            end_sec = min(video.duration_sec, round(end_frame / video.fps, 3))

            segment_id = (
                segment.get("segment_id")
                or segment.get("id")
                or f"seg_{index:04d}"
            )

            normalized.append(
                SegmentMetadata(
                    segment_id=str(segment_id),
                    start_sec=start_sec,
                    end_sec=end_sec,
                    start_frame=start_frame,
                    end_frame=end_frame,
                    duration_sec=round(max(0.0, end_sec - start_sec), 3),
                )
            )
        return normalized

    def _build_video_metadata(self, instance: dict[str, Any]) -> VideoMetadata:
        metadata = instance.get(self.video_metadata_key, {}) or {}

        video_uri = instance.get(self.video_key) or instance.get("video_uri")
        if not video_uri:
            raise ValueError(f"Missing video path. Expected '{self.video_key}' or 'video_uri'.")

        video_id = instance.get("video_id") or self._build_video_id(str(video_uri))
        fps = metadata.get("fps") or instance.get("fps")
        total_frames = metadata.get("total_frames") or instance.get("total_frames")
        duration_sec = metadata.get("duration_sec") or instance.get("duration_sec")

        if fps is None or (total_frames is None and duration_sec is None):
            probed_metadata = self._probe_video_metadata(str(video_uri))
            fps = fps if fps is not None else probed_metadata["fps"]
            total_frames = total_frames if total_frames is not None else probed_metadata["total_frames"]
            duration_sec = duration_sec if duration_sec is not None else probed_metadata["duration_sec"]

        fps = float(fps)
        if fps <= 0:
            raise ValueError("fps must be positive")

        if duration_sec is None:
            duration_sec = float(total_frames) / fps
        if total_frames is None:
            total_frames = int(math.ceil(float(duration_sec) * fps))

        total_frames = max(1, int(total_frames))
        duration_sec = max(1.0 / fps, float(duration_sec))

        return VideoMetadata(
            video_id=str(video_id),
            video_uri=str(video_uri),
            fps=fps,
            total_frames=total_frames,
            duration_sec=duration_sec,
        )

    @staticmethod
    def _probe_video_metadata(video_uri: str) -> dict[str, float | int]:
        try:
            import cv2  # type: ignore
        except ImportError as exc:
            raise ValueError(
                "Missing fps or duration metadata, and OpenCV is not available to probe the video."
            ) from exc

        capture = cv2.VideoCapture(video_uri)
        if not capture.isOpened():
            raise ValueError(f"Failed to open video for metadata probing: {video_uri}")

        try:
            fps = float(capture.get(cv2.CAP_PROP_FPS) or 0.0)
            total_frames = int(capture.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
        finally:
            capture.release()

        if fps <= 0:
            raise ValueError(f"Failed to probe fps from video: {video_uri}")
        if total_frames <= 0:
            raise ValueError(f"Failed to probe frame count from video: {video_uri}")

        return {
            "fps": fps,
            "total_frames": total_frames,
            "duration_sec": total_frames / fps,
        }

    @staticmethod
    def _build_video_id(video_uri: str) -> str:
        return video_uri.replace("\\", "/").rsplit("/", 1)[-1].rsplit(".", 1)[0]

    @staticmethod
    def _sec_to_frame(sec: float, fps: float) -> int:
        return max(0, int(math.floor(sec * fps)))

    @staticmethod
    def _compute_relative_position(segment: SegmentMetadata, frame_index: int) -> float:
        last_frame = max(segment.start_frame, segment.end_frame - 1)
        denominator = max(1, last_frame - segment.start_frame)
        return round((frame_index - segment.start_frame) / denominator, 4)

    @staticmethod
    def _unique_preserve_order(values: Sequence[int]) -> list[int]:
        seen = set()
        ordered = []
        for value in values:
            if value in seen:
                continue
            seen.add(value)
            ordered.append(value)
        return ordered
