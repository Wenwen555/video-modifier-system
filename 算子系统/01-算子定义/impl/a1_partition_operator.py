from __future__ import annotations

import argparse
import json
import math
import re
import time
from dataclasses import asdict, dataclass, field, is_dataclass
from pathlib import Path
from typing import Any, Sequence

try:
    from op_util import Modifier
except ImportError:  # pragma: no cover
    from .op_util import Modifier


SRT_TIME_PATTERN = re.compile(
    r"(?P<start>\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(?P<end>\d{2}:\d{2}:\d{2}[,.]\d{3})"
)
VTT_TIME_PATTERN = re.compile(
    r"(?P<start>\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})\s*-->\s*(?P<end>\d{2}:\d{2}:\d{2}\.\d{3}|\d{2}:\d{2}\.\d{3})"
)
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
    detector_type: str = "opencv-hist"
    sensitivity_threshold: float = 0.45
    similarity_threshold: float = 0.70
    min_segment_duration_sec: float = 2.0
    max_segment_duration_sec: float | None = None
    merge_adjacent_small_segments: bool = True
    modality_weights: dict[str, float] = field(
        default_factory=lambda: {"visual": 0.7, "text": 0.3}
    )
    sample_stride: int = 6
    subtitle_path: str | None = None
    asr_path: str | None = None
    semantic_gap_sec: float = 3.0


class A1_Partition_Operator(Modifier):
    operator_version = "0.2.0"

    def __init__(
        self,
        partition_mode="FIXED",
        chunk_duration_sec=5.0,
        detector_type="opencv-hist",
        sensitivity_threshold=0.45,
        similarity_threshold=0.70,
        min_segment_duration_sec=2.0,
        max_segment_duration_sec=None,
        merge_adjacent_small_segments=True,
        modality_weights=None,
        sample_stride=6,
        subtitle_path=None,
        asr_path=None,
        semantic_gap_sec=3.0,
        video_metadata_key="video_metadata",
        packet_video_key="video",
        transcript_key="transcript_entries",
        config_key="partition_config",
        output_key="segments",
        result_key="partition_result",
        strict=True,
        operator_name="a1_partition_operator",
        accelerator="cpu",
        *args,
        **kwargs,
    ):
        super().__init__(operator_name, accelerator=accelerator, *args, **kwargs)

        self.video_metadata_key = video_metadata_key
        self.packet_video_key = packet_video_key
        self.transcript_key = transcript_key
        self.config_key = config_key
        self.output_key = output_key
        self.result_key = result_key
        self.strict = strict
        self.partition_config = PartitionConfig(
            partition_mode=partition_mode,
            chunk_duration_sec=chunk_duration_sec,
            detector_type=detector_type,
            sensitivity_threshold=sensitivity_threshold,
            similarity_threshold=similarity_threshold,
            min_segment_duration_sec=min_segment_duration_sec,
            max_segment_duration_sec=max_segment_duration_sec,
            merge_adjacent_small_segments=merge_adjacent_small_segments,
            modality_weights=modality_weights or {"visual": 0.7, "text": 0.3},
            sample_stride=sample_stride,
            subtitle_path=subtitle_path,
            asr_path=asr_path,
            semantic_gap_sec=semantic_gap_sec,
        )

    def process(self, instance: dict[str, Any]) -> dict[str, Any]:
        record = dict(instance)

        try:
            config = self._resolve_config(record)
            video = self._build_video_metadata(record)
            transcript_entries = self._extract_transcript_entries(record)
            result = self.partition(
                video=video,
                config=config,
                transcript_entries=transcript_entries,
            )

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
        video: VideoMetadata | dict[str, Any],
        config: PartitionConfig | dict[str, Any] | None = None,
        transcript_entries: Sequence[TranscriptEntry | dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        start_time = time.perf_counter()
        video_meta = self._coerce_video_metadata(video)
        cfg = self._coerce_config(config) if config is not None else self.partition_config
        transcript = self._load_transcript_entries(cfg, transcript_entries)
        mode = cfg.partition_mode.upper()
        fallback_mode = mode

        if mode == "FIXED":
            segments = self._partition_fixed(video_meta, cfg)
        elif mode == "SEMANTIC":
            if transcript:
                segments = self._partition_semantic(video_meta, cfg, transcript)
            else:
                fallback_mode = "FIXED"
                segments = self._partition_fixed(video_meta, cfg)
        elif mode == "SHOT":
            segments = self._partition_shot(video_meta, cfg)
        elif mode == "HYBRID":
            segments, fallback_mode = self._partition_hybrid(video_meta, cfg, transcript)
        else:
            raise ValueError(f"Unsupported partition mode: {cfg.partition_mode}")

        normalized = self._normalize_segments(video_meta, cfg, segments, fallback_mode)
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        return {
            "video_id": video_meta.video_id,
            "video_uri": video_meta.video_uri,
            "operator_name": self.operator_name,
            "operator_version": self.operator_version,
            "partition_mode": fallback_mode,
            "requested_partition_mode": mode,
            "global_metrics": {
                "total_segments": len(normalized),
                "processing_time_ms": duration_ms,
            },
            "segments": normalized,
        }

    def _partition_fixed(self, video: VideoMetadata, cfg: PartitionConfig) -> list[dict[str, Any]]:
        if cfg.chunk_duration_sec <= 0:
            raise ValueError("chunk_duration_sec must be positive")

        boundaries = [0.0]
        cursor = 0.0
        while cursor < video.duration_sec:
            cursor = min(video.duration_sec, cursor + cfg.chunk_duration_sec)
            boundaries.append(cursor)

        return self._build_segments_from_boundaries(
            video=video,
            boundaries=boundaries,
            partition_mode="FIXED",
            boundary_type="FIXED_WINDOW",
            confidence=1.0,
        )

    def _partition_semantic(
        self,
        video: VideoMetadata,
        cfg: PartitionConfig,
        transcript: Sequence[TranscriptEntry],
    ) -> list[dict[str, Any]]:
        if not transcript:
            return self._partition_fixed(video, cfg)

        transcript = sorted(transcript, key=lambda item: item.start_sec)
        boundaries = [0.0]
        boundary_scores: list[float] = []

        current_start = 0.0
        current_tokens = set(self._tokenize(transcript[0].text))
        last_end = max(0.0, transcript[0].end_sec)

        for entry in transcript[1:]:
            next_tokens = set(self._tokenize(entry.text))
            similarity = self._jaccard_similarity(current_tokens, next_tokens)
            text_shift_score = 1.0 - similarity
            gap_sec = max(0.0, entry.start_sec - last_end)
            current_duration = max(0.0, last_end - current_start)

            should_cut = False
            if gap_sec >= cfg.semantic_gap_sec:
                should_cut = True
            if text_shift_score >= cfg.similarity_threshold:
                should_cut = True
            if cfg.max_segment_duration_sec and current_duration >= cfg.max_segment_duration_sec:
                should_cut = True

            if should_cut and current_duration >= cfg.min_segment_duration_sec:
                cut_time = min(video.duration_sec, max(last_end, entry.start_sec))
                if cut_time > boundaries[-1]:
                    boundaries.append(cut_time)
                    boundary_scores.append(round(text_shift_score, 4))
                current_start = cut_time
                current_tokens = set(next_tokens)
            else:
                current_tokens.update(next_tokens)

            last_end = max(last_end, entry.end_sec)

        if boundaries[-1] < video.duration_sec:
            boundaries.append(video.duration_sec)

        return self._build_segments_from_boundaries(
            video=video,
            boundaries=boundaries,
            partition_mode="SEMANTIC",
            boundary_type="SEMANTIC_SHIFT",
            confidence=0.85,
            score_key="semantic_shift_score",
            boundary_scores=boundary_scores,
        )

    def _partition_shot(self, video: VideoMetadata, cfg: PartitionConfig) -> list[dict[str, Any]]:
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
        visual_scores: list[float] = []
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
                        boundaries.append(min(video.duration_sec, timestamp_sec))
                        visual_scores.append(round(diff_score, 4))

                previous_hist = hist
                frame_index += 1
        finally:
            capture.release()

        if boundaries[-1] < video.duration_sec:
            boundaries.append(video.duration_sec)

        return self._build_segments_from_boundaries(
            video=video,
            boundaries=boundaries,
            partition_mode="SHOT",
            boundary_type="HARD_CUT",
            confidence=0.90,
            score_key="visual_change_score",
            boundary_scores=visual_scores,
        )

    def _partition_hybrid(
        self,
        video: VideoMetadata,
        cfg: PartitionConfig,
        transcript: Sequence[TranscriptEntry],
    ) -> tuple[list[dict[str, Any]], str]:
        shot_segments: list[dict[str, Any]] | None = None
        semantic_segments: list[dict[str, Any]] | None = None

        try:
            shot_segments = self._partition_shot(video, cfg)
        except RuntimeError:
            shot_segments = None

        if transcript:
            semantic_segments = self._partition_semantic(video, cfg, transcript)

        if shot_segments and semantic_segments:
            boundaries = {0.0, video.duration_sec}
            boundary_scores: list[float] = []

            for segment in shot_segments[:-1]:
                end_sec = segment["timestamp_range"]["end_sec"]
                if 0.0 < end_sec < video.duration_sec:
                    boundaries.add(end_sec)
                    boundary_scores.append(segment.get("visual_change_score", 0.0))

            for segment in semantic_segments[:-1]:
                end_sec = segment["timestamp_range"]["end_sec"]
                if 0.0 < end_sec < video.duration_sec:
                    boundaries.add(end_sec)
                    boundary_scores.append(segment.get("semantic_shift_score", 0.0))

            merged_boundaries = sorted(boundaries)
            hybrid_segments = self._build_segments_from_boundaries(
                video=video,
                boundaries=merged_boundaries,
                partition_mode="HYBRID",
                boundary_type="HYBRID_CHANGE",
                confidence=0.88,
                score_key="hybrid_score",
                boundary_scores=boundary_scores,
            )
            return hybrid_segments, "HYBRID"

        if shot_segments:
            for segment in shot_segments:
                segment["partition_mode"] = "HYBRID"
            return shot_segments, "HYBRID"

        if semantic_segments:
            for segment in semantic_segments:
                segment["partition_mode"] = "HYBRID"
            return semantic_segments, "SEMANTIC_FALLBACK"

        return self._partition_fixed(video, cfg), "FIXED_FALLBACK"


    def _normalize_segments(
        self,
        video: VideoMetadata,
        cfg: PartitionConfig,
        segments: Sequence[dict[str, Any]],
        partition_mode: str,
    ) -> list[dict[str, Any]]:
        if not segments:
            return []

        normalized = [dict(segment) for segment in segments]
        normalized[0]["timestamp_range"]["start_sec"] = 0.0
        normalized[-1]["timestamp_range"]["end_sec"] = round(video.duration_sec, 3)

        for index, segment in enumerate(normalized):
            start_sec = max(0.0, float(segment["timestamp_range"]["start_sec"]))
            end_sec = min(video.duration_sec, float(segment["timestamp_range"]["end_sec"]))
            if index > 0:
                previous_end = normalized[index - 1]["timestamp_range"]["end_sec"]
                start_sec = max(start_sec, float(previous_end))
            if end_sec <= start_sec:
                end_sec = min(video.duration_sec, start_sec + max(cfg.min_segment_duration_sec, 0.001))

            duration_sec = round(end_sec - start_sec, 3)
            segment["timestamp_range"] = {
                "start_sec": round(start_sec, 3),
                "end_sec": round(end_sec, 3),
            }
            segment["frame_range"] = {
                "start_frame": self._sec_to_frame(start_sec, video.fps),
                "end_frame": self._sec_to_frame(end_sec, video.fps),
            }
            segment["duration_sec"] = duration_sec
            segment["partition_mode"] = partition_mode

        if cfg.merge_adjacent_small_segments:
            normalized = self._merge_small_segments(normalized, cfg, video)

        for index, segment in enumerate(normalized):
            segment_id = f"seg_{index + 1:04d}"
            segment["id"] = segment_id
            segment["segment_id"] = segment_id
            segment["source_ids"] = [video.video_id]
            segment["operator_name"] = self.operator_name
            segment["operator_version"] = self.operator_version
            segment.setdefault("resource_refs", {})

        return normalized

    def _merge_small_segments(
        self,
        segments: Sequence[dict[str, Any]],
        cfg: PartitionConfig,
        video: VideoMetadata,
    ) -> list[dict[str, Any]]:
        if not segments:
            return []

        merged: list[dict[str, Any]] = [dict(segments[0])]
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

    def _build_segments_from_boundaries(
        self,
        video: VideoMetadata,
        boundaries: Sequence[float],
        partition_mode: str,
        boundary_type: str,
        confidence: float,
        score_key: str | None = None,
        boundary_scores: Sequence[float] | None = None,
    ) -> list[dict[str, Any]]:
        unique_boundaries = sorted({round(max(0.0, min(video.duration_sec, value)), 3) for value in boundaries})
        if unique_boundaries[0] != 0.0:
            unique_boundaries.insert(0, 0.0)
        if unique_boundaries[-1] != round(video.duration_sec, 3):
            unique_boundaries.append(round(video.duration_sec, 3))

        segments: list[dict[str, Any]] = []
        boundary_scores = list(boundary_scores or [])

        for index in range(len(unique_boundaries) - 1):
            start_sec = unique_boundaries[index]
            end_sec = unique_boundaries[index + 1]
            if end_sec <= start_sec:
                continue

            metadata_score = boundary_scores[index - 1] if index > 0 and index - 1 < len(boundary_scores) else 0.0
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
                segment[score_key] = metadata_score
            segments.append(segment)

        return segments

    def _resolve_config(self, instance: dict[str, Any]) -> PartitionConfig:
        config = asdict(self.partition_config)
        override = instance.get(self.config_key)
        if isinstance(override, dict):
            config.update(override)
        return PartitionConfig(**config)

    def _build_video_metadata(self, instance: dict[str, Any]) -> VideoMetadata:
        packet_video = instance.get(self.packet_video_key) or {}
        packet_metadata = packet_video.get("metadata", {}) if isinstance(packet_video, dict) else {}
        flat_metadata = instance.get(self.video_metadata_key, {})

        video_uri = (
            instance.get(self.video_key)
            or instance.get("video_uri")
            or (packet_video.get("video_uri") if isinstance(packet_video, dict) else None)
        )
        if not video_uri:
            raise ValueError(
                f"Missing video path. Expected '{self.video_key}' or nested '{self.packet_video_key}.video_uri'."
            )

        video_id = (
            instance.get("video_id")
            or (packet_video.get("video_id") if isinstance(packet_video, dict) else None)
            or Path(str(video_uri)).stem
        )
        fps = packet_metadata.get("fps") or flat_metadata.get("fps") or instance.get("fps")
        total_frames = (
            packet_metadata.get("total_frames")
            or flat_metadata.get("total_frames")
            or instance.get("total_frames")
        )
        duration_sec = (
            packet_metadata.get("duration_sec")
            or flat_metadata.get("duration_sec")
            or instance.get("duration_sec")
        )

        if fps is None:
            raise ValueError("Missing fps. Provide video metadata or a flat 'fps' field.")
        if total_frames is None and duration_sec is None:
            raise ValueError("Missing video length. Provide either total_frames or duration_sec.")

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

    def _extract_transcript_entries(
        self, instance: dict[str, Any]
    ) -> Sequence[TranscriptEntry | dict[str, Any]] | None:
        if self.transcript_key in instance:
            return instance[self.transcript_key]

        packet_video = instance.get(self.packet_video_key) or {}
        subtitle_path = (
            instance.get("subtitle_path")
            or (packet_video.get("subtitle_uri") if isinstance(packet_video, dict) else None)
            or self.partition_config.subtitle_path
        )
        asr_path = (
            instance.get("asr_path")
            or (packet_video.get("asr_uri") if isinstance(packet_video, dict) else None)
            or self.partition_config.asr_path
        )

        if subtitle_path:
            return self._load_transcript_entries(PartitionConfig(subtitle_path=subtitle_path), None)
        if asr_path:
            return self._load_transcript_entries(PartitionConfig(asr_path=asr_path), None)
        return None

    def _load_transcript_entries(
        self,
        cfg: PartitionConfig,
        transcript_entries: Sequence[TranscriptEntry | dict[str, Any]] | None,
    ) -> list[TranscriptEntry]:
        if transcript_entries:
            return [self._coerce_transcript_entry(entry) for entry in transcript_entries]

        transcript_path = cfg.subtitle_path or cfg.asr_path
        if not transcript_path:
            return []

        path = Path(transcript_path)
        if not path.exists():
            raise FileNotFoundError(f"Transcript file not found: {path}")

        suffix = path.suffix.lower()
        if suffix == ".srt":
            return self._parse_srt(path)
        if suffix == ".vtt":
            return self._parse_vtt(path)
        if suffix == ".json":
            return self._parse_json_transcript(path)

        raise ValueError(f"Unsupported transcript file: {path}")

    # 粗粒度的类型转换，支持 dict、dataclass 实例和原始类型的灵活输入
    @staticmethod
    def _coerce_video_metadata(video: VideoMetadata | dict[str, Any]) -> VideoMetadata:
        if isinstance(video, VideoMetadata):
            return video
        if is_dataclass(video):
            return VideoMetadata(**asdict(video))
        return VideoMetadata(**video)

    @staticmethod
    def _coerce_config(config: PartitionConfig | dict[str, Any]) -> PartitionConfig:
        if isinstance(config, PartitionConfig):
            return config
        if is_dataclass(config):
            return PartitionConfig(**asdict(config))
        return PartitionConfig(**config)

    @staticmethod
    def _coerce_transcript_entry(entry: TranscriptEntry | dict[str, Any]) -> TranscriptEntry:
        if isinstance(entry, TranscriptEntry):
            return entry
        if is_dataclass(entry):
            return TranscriptEntry(**asdict(entry))
        return TranscriptEntry(**entry)

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

    @staticmethod
    def _parse_timestamp(value: str) -> float:
        if value.count(":") == 1:
            minutes, seconds = value.replace(",", ".").split(":")
            return int(minutes) * 60 + float(seconds)
        hours, minutes, seconds = value.replace(",", ".").split(":")
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)

    def _parse_srt(self, path: Path) -> list[TranscriptEntry]:
        entries: list[TranscriptEntry] = []
        blocks = re.split(r"\n\s*\n", path.read_text(encoding="utf-8"))
        for block in blocks:
            lines = [line.strip("\ufeff") for line in block.strip().splitlines() if line.strip()]
            if len(lines) < 2:
                continue
            time_line = lines[1] if lines[0].isdigit() else lines[0]
            match = SRT_TIME_PATTERN.search(time_line)
            if not match:
                continue
            text_lines = lines[2:] if lines[0].isdigit() else lines[1:]
            entries.append(
                TranscriptEntry(
                    start_sec=self._parse_timestamp(match.group("start")),
                    end_sec=self._parse_timestamp(match.group("end")),
                    text=" ".join(text_lines).strip(),
                )
            )
        return entries

    def _parse_vtt(self, path: Path) -> list[TranscriptEntry]:
        entries: list[TranscriptEntry] = []
        blocks = re.split(r"\n\s*\n", path.read_text(encoding="utf-8"))
        for block in blocks:
            lines = [line.strip("\ufeff") for line in block.strip().splitlines() if line.strip()]
            if not lines:
                continue
            match = VTT_TIME_PATTERN.search(lines[0])
            if not match:
                continue
            entries.append(
                TranscriptEntry(
                    start_sec=self._parse_timestamp(match.group("start")),
                    end_sec=self._parse_timestamp(match.group("end")),
                    text=" ".join(lines[1:]).strip(),
                )
            )
        return entries

    def _parse_json_transcript(self, path: Path) -> list[TranscriptEntry]:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(raw, dict):
            raw = raw.get("entries", [])
        return [self._coerce_transcript_entry(item) for item in raw]


PartitionOperator = A1_Partition_Operator


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="A1 partition operator reference implementation")
    parser.add_argument("--video-id", required=True)
    parser.add_argument("--video-uri", required=True)
    parser.add_argument("--fps", required=True, type=float)
    parser.add_argument("--total-frames", required=True, type=int)
    parser.add_argument("--duration-sec", required=True, type=float)
    parser.add_argument("--mode", default="FIXED", choices=["FIXED", "SHOT", "SEMANTIC", "HYBRID"])
    parser.add_argument("--chunk-duration-sec", type=float, default=5.0)
    parser.add_argument("--sensitivity-threshold", type=float, default=0.45)
    parser.add_argument("--similarity-threshold", type=float, default=0.70)
    parser.add_argument("--min-segment-duration-sec", type=float, default=2.0)
    parser.add_argument("--max-segment-duration-sec", type=float, default=None)
    parser.add_argument("--subtitle-path", default=None)
    parser.add_argument("--asr-path", default=None)
    parser.add_argument("--sample-stride", type=int, default=6)
    parser.add_argument("--output", default=None)
    return parser


def main() -> None:
    parser = build_argument_parser()
    args = parser.parse_args()

    operator = A1_Partition_Operator(
        partition_mode=args.mode,
        chunk_duration_sec=args.chunk_duration_sec,
        sensitivity_threshold=args.sensitivity_threshold,
        similarity_threshold=args.similarity_threshold,
        min_segment_duration_sec=args.min_segment_duration_sec,
        max_segment_duration_sec=args.max_segment_duration_sec,
        subtitle_path=args.subtitle_path,
        asr_path=args.asr_path,
        sample_stride=args.sample_stride,
        strict=True,
    )

    payload = {
        "video_id": args.video_id,
        "video_path": args.video_uri,
        "fps": args.fps,
        "total_frames": args.total_frames,
        "duration_sec": args.duration_sec,
    }
    result = operator.process(payload)
    serialized = json.dumps(result[operator.result_key], ensure_ascii=False, indent=2)

    if args.output:
        Path(args.output).write_text(serialized, encoding="utf-8")
        return

    print(serialized)


if __name__ == "__main__":
    main()
