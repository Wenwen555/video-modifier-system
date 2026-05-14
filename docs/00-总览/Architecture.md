# Architecture

本页说明当前视频算子实现的工程结构、注册关系和数据流。所有描述均以 AscendDataForge 当前源码为准。

## System Overview

A 编号主链由 10 个已注册视频算子组成。算子运行在 `MultimodalDataset` 上，使用 `dataset.map(...)` 对每条 row 字典读取输入字段并写回结果字段。

核心实现分布：

- `operations/augmentation/`：A1、A3、A4、A5、A6、A7、A8、A9
- `operations/filtering/`：A2、A10
- `core/operation_registry.py`：注册名到实现类的映射

## Layered Architecture

### Base System Layer

| Operator | Registry name | Responsibility |
|---|---|---|
| A1 Partition | `video_partition` | 生成 `segments` 与 `partition_result` |
| A2 Context Orchestration | `video_context_orchestration` | 对 `segments` 做轻量 stitch、上下文引用或清洗标记 |
| A3 Sampling | `video_sampling` | 从 `segments` 生成 `samples`，可选保存帧图像 |

### Evidence And Structure Layer

| Operator | Registry name | Responsibility |
|---|---|---|
| A4 Multi-granular Description | `video_multigranularity_description` | 使用视觉 caption 模型生成 `description_units` |
| A5 Temporal Structure | `video_temporal_structure` | 构建 `temporal_structures` |
| A6 Text Evidence | `video_text_evidence` | 从 OCR、字幕或 ASR 生成 `text_signals` |

### Scaffold And Materialization Layer

| Operator | Registry name | Responsibility |
|---|---|---|
| A7 Scaffold Construction | `video_scaffold_construction` | 基于描述、时序结构、文本信号和采样帧构建 `scaffold_units` |
| A8 QAE Materialization | `video_qae_materialization` | 从 scaffold、QA 草稿和证据字段生成 `qae_triplets` |

### Revision And Screening Layer

| Operator | Registry name | Responsibility |
|---|---|---|
| A9 Consistency Revision | `video_consistency_revision` | 生成 `revisions`，记录字段修订建议 |
| A10 Quality Screening | `video_quality_screening` | 应用 revisions 后打分、保留或丢弃 triplet |

## End-To-End Flow

当前可直接落地的默认字段流：

```text
row[video_path]
  -> A1 row[segments]
  -> A2 row[segments]
  -> A3 row[samples]
  -> A4 row[description_units]
  -> A5 row[temporal_structures]
  -> A6 row[text_signals]
  -> A7 row[scaffold_units]
  -> A8 row[qae_triplets]
  -> A9 row[revisions]
  -> A10 row[quality_records]
```

A4、A5、A6 的顺序需要按模式调整：

- A4 `EVENT_DESCRIPTION` 需要先有 `temporal_structures`。
- A5 `EVENT_WINDOW` 可以在 A4/A6 之前运行，只要有 `segments` 和 `samples`。
- A5 `EVENT_CHAIN` 会调用语言模型生成事件链摘要。
- A6 `OCR` 默认需要 `samples[].frame_path`，通常要求 A3 设置 `save_sample_frames=True`。

## Data Lineage

当前实现通过显式 ID 字段维护血缘，但不是所有对象都有统一的公共元信息。主要 ID 链如下：

```text
segment_id
  -> sample_id
  -> description_id / text_signal_id
  -> temporal_unit_id
  -> scaffold_id
  -> triplet_id
  -> revision_id
  -> quality_id
```

A8 的 `evidence_refs` 以 modality 分组：

- `text.description_ids`
- `text.text_signal_ids`
- `text.evidence_unit_ids`
- `image.frame_refs`
- `image.sample_ids`
- `image.frame_paths`
- `temporal.temporal_unit_ids`

## Implementation Constraints

- A2 默认 `output_key="segments"`，会用编排后的分段覆盖 row 中的 `segments` 字段。
- A9 不直接修改 `qae_triplets`，只输出 `revisions`。
- A10 在筛查时会把 `revisions[].after_fields` 临时应用到 triplet 副本上，再计算质量记录。
- A7 当前不实现 `QUERY_SCAFFOLD`，QA-first 路线需要由上游提供带 `source_qa_draft_ids` 的 scaffold，或使用 A8 的 `QA_FIRST_GROUNDING` 路径配合已有 scaffold。
- 多个算子会在依赖缺失时直接抛出 `ValueError`；当前没有统一的 `strict=False` 降级协议。

## Scope

本页只描述已实现的 A1-A10 视频主链。视频加载、保存和宽高比调整已有注册实现，但属于 I/O 或通用增强能力，不在 A 编号主链内展开。
