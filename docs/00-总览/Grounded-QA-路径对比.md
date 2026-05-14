# Grounded QA 路径对比

## 1. 当前实现支持的路径

当前 A1-A10 实现可以支撑三类 grounded QA 数据构造路径，但支持程度不同：

| 路径 | 当前实现状态 | 关键算子 |
|---|---|---|
| `structure-first` | 主链最完整 | A1-A10 |
| `narration / caption-first` | 可通过 A6 + A7 `NARRATION_CHUNK` 落地 | A1/A2/A3/A6/A5/A7/A8/A9/A10 |
| `QA-first / post-hoc grounding` | A8 有 `QA_FIRST_GROUNDING`，但 A7 尚无 `QUERY_SCAFFOLD` 模式 | A1/A2/A3/A4/A5/A6/A7/A8 |
| `ground-first / answer-later` | 不作为 A1-A10 主链实现 | 需要额外推理或定位模块 |

## 2. Structure-First

当前最贴近源码的默认链路是：

```text
A1 video_partition
  -> A2 video_context_orchestration
  -> A3 video_sampling
  -> A4 video_multigranularity_description
  -> A5 video_temporal_structure
  -> A6 video_text_evidence
  -> A7 video_scaffold_construction
  -> A8 video_qae_materialization
  -> A9 video_consistency_revision
  -> A10 video_quality_screening
```

这个路径依赖的真实字段包括：

- `segments`
- `samples`
- `description_units`
- `temporal_structures`
- `text_signals`
- `scaffold_units`
- `qae_triplets`
- `revisions`
- `quality_records`

## 3. Narration / Caption-First

当前实现中，narration-first 路径主要通过 A6 和 A7 落地：

1. A6 `SUBTITLE_PARSE` 或 `ASR_ALIGN` 从 `row["video"]["subtitle_uri"]` 或 `row["video"]["asr_uri"]` 读取 JSON/JSONL 文本。
2. A5 可把 segment 组织为 `EVENT_WINDOW` 或 `EVENT_CHAIN`。
3. A7 `NARRATION_CHUNK` 将 `description_units`、`text_signals` 和 `temporal_structures` 规约为 `scaffold_units`。
4. A8 从 scaffold 物化 `qae_triplets`。

如果只使用 A6 文本而不运行 A4，A7 仍可从 `text_signals` 构造 narration summary。

## 4. QA-First / Post-Hoc Grounding

A8 当前实现了 `QA_FIRST_GROUNDING` 模式。该模式会读取：

- `scaffold_units[].source_qa_draft_ids`
- `qa_drafts[].qa_draft_id`
- `qa_drafts[].question`
- `qa_drafts[].answer`
- QA 草稿中的 `clip_id`、`clip_ids`、`segment_id`、`segment_ids` 或 `timestamp_range`
- `temporal_structures`、`description_units`、`text_signals`、`samples`

当前限制：A7 源码没有 `QUERY_SCAFFOLD` 模式，也不直接消费 `qa_drafts`。因此 QA-first 路线需要上游先提供带 `source_qa_draft_ids` 的 scaffold，或复用已有 scaffold 后再进入 A8。

## 5. Ground-First / Answer-Later

`ground-first / answer-later` 更接近在线推理或 benchmark 评测路径。当前 A1-A10 没有专门的 localization/re-read/answer 模块；只能通过 A5/A6/A8 的组合间接承载部分 evidence 绑定能力。

## 6. 建议

当前文档和代码的稳定对齐建议是：

- 默认展示 `structure-first` 主链。
- 对 narration-first，强调 A6 的字幕/ASR/OCR 与 A7 `NARRATION_CHUNK`。
- 对 QA-first，强调 A8 `QA_FIRST_GROUNDING` 已实现，同时说明 A7 `QUERY_SCAFFOLD` 尚未实现。
- 不把 ground-first 推理路径描述为当前主链已实现能力。
