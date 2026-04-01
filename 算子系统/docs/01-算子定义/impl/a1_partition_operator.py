from __future__ import annotations

import math
import re
import time
from dataclasses import asdict, dataclass
from typing import Any, Sequence

from utils.op_util import Modifier


TOKEN_PATTERN = re.compile(r"[\u4e00-\u9fff]+|[a-z0-9]+", re.IGNORECASE)


@dataclass
class VideoMetadata:
    video_id: str
    video_uri: str
    fps: float
    total_frames: int
    duration_sec: float


@dataclass
class TranscriptEntry:
    start_sec: float
    end_sec: float
    text: str


@dataclass
class PartitionConfig:
    partition_mode: str = "FIXED"
    chunk_duration_sec: float = 5.0
    sensitivity_threshold: float = 0.45
    similarity_threshold: float = 0.70
    min_segment_duration_sec: float = 2.0
    max_segment_duration_sec: float | None = None
    merge_adjacent_small_segments: bool = True
    sample_stride: int = 6
    semantic_gap_sec: float = 3.0


class A1_Partition_Operator(Modifier):
    operator_version = "0.3.0"
    video_metadata_key = "video_metadata"
    transcript_key = "transcript_entries"
    output_key = "segments"
    result_key = "partition_result"

    def __init__(
        self,
        partition_mode="FIXED",
        chunk_duration_sec=5.0,
        sensitivity_threshold=0.45,
        similarity_threshold=0.70,
        min_segment_duration_sec=2.0,
        max_segment_duration_sec=None,
        merge_adjacent_small_segments=True,
        sample_stride=6,
        semantic_gap_sec=3.0,
        strict=True,
        operator_name="a1_partition_operator",
        accelerator="cpu",
        *args,
        **kwargs,
    ):
        super().__init__(operator_name, accelerator=accelerator, *args, **kwargs)

        self.strict = strict
        self.partition_config = PartitionConfig(
            partition_mode=partition_mode,
            chunk_duration_sec=chunk_duration_sec,
            sensitivity_threshold=sensitivity_threshold,
            similarity_threshold=similarity_threshold,
            min_segment_duration_sec=min_segment_duration_sec,
            max_segment_duration_sec=max_segment_duration_sec,
            merge_adjacent_small_segments=merge_adjacent_small_segments,
            sample_stride=sample_stride,
            semantic_gap_sec=semantic_gap_sec,
        )

    def process(self, instance: dict[str, Any]) -> dict[str, Any]:
        record = dict(instance)

        try:
            video = self._build_video_metadata(record)
            transcript_entries = self._normalize_transcript_entries(record.get(self.transcript_key))
            result = self.partition(video, transcript_entries)

            record.setdefault("video_id", video.video_id)
            record.setdefault("video_uri", video.video_uri)
            record.setdefault(self.video_metadata_key, asdict(video))
            record[self.output_key] = result["segments"]
            record[self.result_key] = result
            record["partition_mode"] = result["partition_mode"]
            record["partition_metrics"] = result["global_metrics"]
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
            record["partition_error"] = str(exc)
            return record

    def partition(
        self,
        video: VideoMetadata,
        transcript_entries: Sequence[TranscriptEntry] | None = None,
    ) -> dict[str, Any]:
        start_time = time.perf_counter()
        cfg = self.partition_config
        transcript = list(transcript_entries or [])
        requested_mode = cfg.partition_mode.upper()

        score_key = None
        score_by_boundary: dict[float, float] | None = None

        if requested_mode == "FIXED":
            boundaries = self._partition_fixed(video, cfg)
            actual_mode = "FIXED"
            boundary_type = "FIXED_WINDOW"
            confidence = 1.0
        elif requested_mode == "SEMANTIC":
            if transcript:
                boundaries, score_by_boundary = self._partition_semantic(video, cfg, transcript)
                actual_mode = "SEMANTIC"
                boundary_type = "SEMANTIC_SHIFT"
                confidence = 0.85
                score_key = "semantic_shift_score"
            else:
                boundaries = self._partition_fixed(video, cfg)
                actual_mode = "FIXED"
                boundary_type = "FIXED_WINDOW"
                confidence = 1.0
        elif requested_mode == "SHOT":
            boundaries, score_by_boundary = self._partition_shot(video, cfg)
            actual_mode = "SHOT"
            boundary_type = "HARD_CUT"
            confidence = 0.90
            score_key = "visual_change_score"
        else:
            raise ValueError(f"Unsupported partition mode: {cfg.partition_mode}")

        segments = self._build_segments(
            video=video,
            cfg=cfg,
            boundaries=boundaries,
            partition_mode=actual_mode,
            boundary_type=boundary_type,
            confidence=confidence,
            score_key=score_key,
            score_by_boundary=score_by_boundary,
        )
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        return {
            "video_id": video.video_id,
            "video_uri": video.video_uri,
            "operator_name": self.operator_name,
            "operator_version": self.operator_version,
            "partition_mode": actual_mode,
            "requested_partition_mode": requested_mode,
            "global_metrics": {
                "total_segments": len(segments),
                "processing_time_ms": duration_ms,
            },
            "segments": segments,
        }

    def _partition_fixed(self, video: VideoMetadata, cfg: PartitionConfig) -> list[float]:
        if cfg.chunk_duration_sec <= 0:
            raise ValueError("chunk_duration_sec must be positive")

        boundaries = [0.0]
        cursor = 0.0
        while cursor < video.duration_sec:
            cursor = min(video.duration_sec, cursor + cfg.chunk_duration_sec)
            boundaries.append(cursor)
        return boundaries

    def _partition_semantic(
        self,
        video: VideoMetadata,
        cfg: PartitionConfig,
        transcript: Sequence[TranscriptEntry],
    ) -> tuple[list[float], dict[float, float]]:
        transcript = sorted(transcript, key=lambda item: item.start_sec)
        boundaries = [0.0]
        score_by_boundary: dict[float, float] = {}

        current_start = 0.0
        current_tokens = set(self._tokenize(transcript[0].text))
        last_end = max(0.0, transcript[0].end_sec)

        for entry in transcript[1:]:
            next_tokens = set(self._tokenize(entry.text))
            text_shift_score = 1.0 - self._jaccard_similarity(current_tokens, next_tokens)
            gap_sec = max(0.0, entry.start_sec - last_end)
            current_duration = max(0.0, last_end - current_start)

            should_cut = (
                gap_sec >= cfg.semantic_gap_sec
                or text_shift_score >= cfg.similarity_threshold
                or (
                    cfg.max_segment_duration_sec is not None
                    and current_duration >= cfg.max_segment_duration_sec
                )
            )

            if should_cut and current_duration >= cfg.min_segment_duration_sec:
                cut_time = round(min(video.duration_sec, max(last_end, entry.start_sec)), 3)
                if cut_time > boundaries[-1]:
                    boundaries.append(cut_time)
                    score_by_boundary[cut_time] = round(text_shift_score, 4)
                current_start = cut_time
                current_tokens = set(next_tokens)
            else:
                current_tokens.update(next_tokens)

            last_end = max(last_end, entry.end_sec)

        if boundaries[-1] < video.duration_sec:
            boundaries.append(round(video.duration_sec, 3))

        return boundaries, score_by_boundary

    def _partition_shot(
        self,
        video: VideoMetadata,
        cfg: PartitionConfig,
    ) -> tuple[list[float], dict[float, float]]:
        try:
            import cv2  # type: ignore
        except ImportError as exc:
            raise RuntimeError(
                "SHOT mode requires OpenCV. Install 'opencv-python' and 'numpy' first."
            ) from exc

        capture = cv2.VideoCapture(video.video_uri)
        if not capture.isOpened():
            raise RuntimeError(f"Failed to open video: {video.video_uri}")

        boundaries = [0.0]
        score_by_boundary: dict[float, float] = {}
        previous_hist = None
        frame_index = 0
        stride = max(1, int(cfg.sample_stride))

        try:
            while True:
                success, frame = capture.read()
                if not success:
                    break

                if frame_index % stride != 0:
                    frame_index += 1
                    continue

                gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
                hist = cv2.calcHist([gray], [0], None, [64], [0, 256])
                cv2.normalize(hist, hist)

                if previous_hist is not None:
                    diff_score = float(
                        cv2.compareHist(previous_hist, hist, cv2.HISTCMP_BHATTACHARYYA)
                    )
                    timestamp_sec = frame_index / video.fps
                    if (
                        diff_score >= cfg.sensitivity_threshold
                        and timestamp_sec - boundaries[-1] >= cfg.min_segment_duration_sec
                    ):
                        cut_time = round(min(video.duration_sec, timestamp_sec), 3)
                        boundaries.append(cut_time)
                        score_by_boundary[cut_time] = round(diff_score, 4)

                previous_hist = hist
                frame_index += 1
        finally:
            capture.release()

        if boundaries[-1] < video.duration_sec:
            boundaries.append(round(video.duration_sec, 3))

        return boundaries, score_by_boundary

    def _build_segments(
        self,
        video: VideoMetadata,
        cfg: PartitionConfig,
        boundaries: Sequence[float],
        partition_mode: str,
        boundary_type: str,
        confidence: float,
        score_key: str | None = None,
        score_by_boundary: dict[float, float] | None = None,
    ) -> list[dict[str, Any]]:
        normalized_boundaries = self._normalize_boundaries(video, boundaries)

        segments = []
        score_by_boundary = score_by_boundary or {}

        for index in range(len(normalized_boundaries) - 1):
            start_sec = normalized_boundaries[index]
            end_sec = normalized_boundaries[index + 1]
            if end_sec <= start_sec:
                continue

            segment = {
                "timestamp_range": {
                    "start_sec": round(start_sec, 3),
                    "end_sec": round(end_sec, 3),
                },
                "frame_range": {
                    "start_frame": self._sec_to_frame(start_sec, video.fps),
                    "end_frame": self._sec_to_frame(end_sec, video.fps),
                },
                "duration_sec": round(end_sec - start_sec, 3),
                "partition_mode": partition_mode,
                "boundary_type": "START" if index == 0 else boundary_type,
                "confidence": confidence if index == 0 else round(max(0.5, min(1.0, confidence)), 4),
                "status": "active",
            }
            if score_key:
                segment[score_key] = 0.0 if index == 0 else score_by_boundary.get(start_sec, 0.0)
            segments.append(segment)

        if cfg.merge_adjacent_small_segments:
            segments = self._merge_small_segments(segments, cfg, video)

        for index, segment in enumerate(segments, start=1):
            segment_id = f"seg_{index:04d}"
            segment["id"] = segment_id
            segment["segment_id"] = segment_id
            segment["source_ids"] = [video.video_id]
            segment["operator_name"] = self.operator_name
            segment["operator_version"] = self.operator_version
            segment.setdefault("resource_refs", {})

        return segments

    def _merge_small_segments(
        self,
        segments: Sequence[dict[str, Any]],
        cfg: PartitionConfig,
        video: VideoMetadata,
    ) -> list[dict[str, Any]]:
        if not segments:
            return []

        merged = [dict(segments[0])]
        for segment in segments[1:]:
            candidate = dict(segment)
            if candidate["duration_sec"] < cfg.min_segment_duration_sec:
                previous = merged[-1]
                previous["timestamp_range"]["end_sec"] = candidate["timestamp_range"]["end_sec"]
                previous["frame_range"]["end_frame"] = candidate["frame_range"]["end_frame"]
                previous["duration_sec"] = round(
                    previous["timestamp_range"]["end_sec"] - previous["timestamp_range"]["start_sec"],
                    3,
                )
                previous["boundary_type"] = "MERGED_SMALL_SEGMENT"
                previous["confidence"] = round(
                    (previous.get("confidence", 1.0) + candidate.get("confidence", 1.0)) / 2.0,
                    4,
                )
            else:
                merged.append(candidate)

        if merged:
            merged[-1]["timestamp_range"]["end_sec"] = round(video.duration_sec, 3)
            merged[-1]["frame_range"]["end_frame"] = self._sec_to_frame(video.duration_sec, video.fps)
            merged[-1]["duration_sec"] = round(
                merged[-1]["timestamp_range"]["end_sec"] - merged[-1]["timestamp_range"]["start_sec"],
                3,
            )

        return merged

    @staticmethod
    def _normalize_boundaries(video: VideoMetadata, boundaries: Sequence[float]) -> list[float]:
        normalized = sorted(
            {
                round(max(0.0, min(video.duration_sec, float(value))), 3)
                for value in boundaries
            }
        )
        if not normalized or normalized[0] != 0.0:
            normalized.insert(0, 0.0)
        video_end = round(video.duration_sec, 3)
        if normalized[-1] != video_end:
            normalized.append(video_end)
        return normalized

    def _build_video_metadata(self, instance: dict[str, Any]) -> VideoMetadata:
        metadata = instance.get(self.video_metadata_key, {}) or {}

        video_uri = instance.get(self.video_key) or instance.get("video_uri")
        if not video_uri:
            raise ValueError(f"Missing video path. Expected '{self.video_key}' or 'video_uri'.")

        video_id = instance.get("video_id") or self._build_video_id(video_uri)
        fps = metadata.get("fps") or instance.get("fps")
        total_frames = metadata.get("total_frames") or instance.get("total_frames")
        duration_sec = metadata.get("duration_sec") or instance.get("duration_sec")

        if fps is None or (total_frames is None and duration_sec is None):
            probed_metadata = self._probe_video_metadata(str(video_uri))
            fps = fps if fps is not None else probed_metadata["fps"]
            total_frames = total_frames if total_frames is not None else probed_metadata["total_frames"]
            duration_sec = duration_sec if duration_sec is not None else probed_metadata["duration_sec"]

        fps = float(fps)
        if duration_sec is None:
            duration_sec = float(total_frames) / fps
        if total_frames is None:
            total_frames = int(math.floor(float(duration_sec) * fps))

        return VideoMetadata(
            video_id=str(video_id),
            video_uri=str(video_uri),
            fps=fps,
            total_frames=int(total_frames),
            duration_sec=float(duration_sec),
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
    def _normalize_transcript_entries(
        transcript_entries: Sequence[TranscriptEntry | dict[str, Any]] | None,
    ) -> list[TranscriptEntry]:
        if not transcript_entries:
            return []

        normalized = []
        for entry in transcript_entries:
            if isinstance(entry, TranscriptEntry):
                normalized.append(entry)
            else:
                normalized.append(TranscriptEntry(**entry))
        return normalized

    @staticmethod
    def _build_video_id(video_uri: str) -> str:
        return video_uri.replace("\\", "/").rsplit("/", 1)[-1].rsplit(".", 1)[0]

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return TOKEN_PATTERN.findall(text.lower())

    @staticmethod
    def _jaccard_similarity(tokens_a: set[str], tokens_b: set[str]) -> float:
        if not tokens_a and not tokens_b:
            return 1.0
        if not tokens_a or not tokens_b:
            return 0.0
        intersection = tokens_a.intersection(tokens_b)
        union = tokens_a.union(tokens_b)
        return len(intersection) / max(1, len(union))

    @staticmethod
    def _sec_to_frame(sec: float, fps: float) -> int:
        return max(0, int(math.floor(sec * fps)))
