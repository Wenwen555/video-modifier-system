# Q/A/E 共同合成算子（A8）

## 1. 当前实现

| 项目 | 内容 |
|---|---|
| 注册名 | `video_qae_materialization` |
| 实现类 | `VideoQaeMaterializationOperation` |
| 源码 | `AscendDataForge/multimodal_data_processor/operations/augmentation/video_qae_materialization_operation.py` |
| 基类 | `VideoAugmentationOperation` |
| operation_type | `OperationType.AUGMENTATION` |

A8 从 `scaffold_units`、可选 `qa_drafts` 和证据字段生成 `qae_triplets`。它可以先按规则构造 triplet，再可选调用 OpenAI-compatible LLM 客户端改写 question/answer。

## 2. 支持模式

| 模式 | 行为 |
|---|---|
| `JOINT_SYNTHESIS` | 从 scaffold 生成 question/answer/evidence refs |
| `DRAFT_BINDING` | 优先绑定 scaffold 中引用的 QA draft |
| `ANSWER_VERIFY_FILL` | 当前走与 scaffold 物化相同的规则路径，保留模式名 |
| `QA_FIRST_GROUNDING` | 依据 QA draft 的 clip/segment/time grounding 收集 temporal、description、text、sample 证据 |

## 3. 输入字段

| 参数 | 默认值 | 说明 |
|---|---:|---|
| `scaffold_units_key` | `scaffold_units` | 输入 scaffold |
| `qa_drafts_key` | `qa_drafts` | 输入 QA 草稿 |
| `evidence_units_key` | `evidence_units` | 可选证据单元 |
| `temporal_structures_key` | `temporal_structures` | QA-first grounding 使用 |
| `description_units_key` | `description_units` | QA-first grounding 使用 |
| `text_signals_key` | `text_signals` | QA-first grounding 使用 |
| `samples` | 固定读取 row 中 `samples` | QA-first grounding 和图像证据使用 |

`QA_FIRST_GROUNDING` 要求 scaffold 中有 `source_qa_draft_ids`，并能在 `qa_drafts` 中找到对应 question/answer。QA 草稿还必须提供 `clip_id`、`clip_ids`、`segment_id`、`segment_ids` 或时间范围之一，否则无法收集证据。

## 4. 输出字段

A8 写回：

- `qae_triplets`
- `materialization_result`
- `materialization_mode`
- `materialization_metrics`

每个 triplet 包含：

- `id`
- `triplet_id`
- `scaffold_id`
- `source_qa_draft_id`
- `question`
- `answer`
- `evidence_refs`
- `triplet_type`
- `grounding_level`
- `materialization_mode`
- `llm_materialization_analysis`：可选
- `materialized_by`：可选

当前不会写 `dataset_tier`、`difficulty` 或 `status`。数据层级由 A10 在 `quality_records[].assigned_dataset_tier` 中分配。

## 5. Evidence Refs

A8 输出的 `evidence_refs` 结构为：

```json
{
  "text": {
    "description_ids": [],
    "text_signal_ids": [],
    "evidence_unit_ids": []
  },
  "image": {
    "frame_refs": [],
    "sample_ids": [],
    "frame_paths": []
  },
  "temporal": {
    "temporal_unit_ids": []
  }
}
```

## 6. LLM 客户端

默认值：

- `use_llm_client=True`
- `require_llm_client=True`

如果没有 LLM 配置或注入客户端，默认会报错：`Missing llm_client for video_qae_materialization.`

可用方式：

- 传入 `llm_client`
- 提供 `llm_base_url`、`llm_api_key`、`llm_model`
- 提供 `llm_config_path`
- 或设置 `use_llm_client=False` 使用规则路径

## 7. 参数

| 参数 | 默认值 | 说明 |
|---|---:|---|
| `output_key` | `qae_triplets` | 输出字段 |
| `result_key` | `materialization_result` | 完整结果字段 |
| `materialization_mode` | `JOINT_SYNTHESIS` | 支持 4 种模式 |
| `triplet_type` | `single_hop` | 当前归一化为 `single_hop` 或 `multihop` |
| `temperature` | `0.0` | LLM 调用温度 |

## 8. 最小示例

```python
from multimodal_data_processor.core.operation_registry import OperationRegistry

op = OperationRegistry.create_operation(
    "video_qae_materialization",
    {"materialization_mode": "JOINT_SYNTHESIS", "use_llm_client": False},
)
result_dataset = op.execute(dataset)
```
