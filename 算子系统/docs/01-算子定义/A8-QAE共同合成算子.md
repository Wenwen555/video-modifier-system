# Q/A/E共同合成算子（A8）技术文档

## 1. 在系统中的定位
A8 负责在 A7 提供的结构骨架约束下，生成最终可出站的 `Question / Answer / Evidence` triplets。

在当前版本里，A8 仍然保留“共同合成”这一默认能力，但它的职责已经从单纯的 `joint synthesis` 扩展为更一般的 `triplet materialization`：

- 对 `narration-first` 和 `structure-first` 路线，它可以共同生成 `Q/A/E`
- 对 `QA-first / post-hoc grounding` 路线，它可以把 `qa_drafts + scaffold + evidence` 装配成最终 triplet

因此，A8 是当前系统三条数据主线共享的统一出口。

## 2. 文献依赖等级

- 文献依赖等级：`P2 论文原生`
- 最新支撑强度：`很强`

### 2.1 文献锚点
- Grounded Question-Answering in Long Egocentric Videos
- Grounded Multi-Hop VideoQA in Long-Form Egocentric Videos
- LongViTU

### 2.2 从文献保留了什么
- QA 和 evidence 经常共享同一上游结构骨架
- 在数据构造场景里，joint synthesis 很常见
- 但对于人工 QA 或 benchmark QA，常常需要先有 QA 再做 post-hoc grounding
- 因此最终统一的关键不是“问题从哪来”，而是“triplet 如何被定稿”

## 3. 子模式定义

### 3.1 JOINT_SYNTHESIS
在共享 scaffold 上共同生成 `Question / Answer / Evidence`。

### 3.2 DRAFT_BINDING
把已有 `qa_draft` 与证据和 scaffold 绑定，生成最终 triplet。

### 3.3 ANSWER_VERIFY_FILL
在已有 question 或草案 answer 的情况下，利用证据验证、修订或补全 answer。

`triplet_type` 仍可额外取值为：

- `single_hop`
- `multihop`
- `instruction`

## 4. 输入规范

### 4.1 必需输入
- `scaffold_units[].scaffold_id`
- `scaffold_units[].scaffold_summary`

### 4.2 可选输入
- `qa_drafts[]`
- `evidence_units[]`
- `config.triplet_type`
- `config.route_mode`
- `config.max_triplets_per_unit`
- `config.require_explicit_evidence`
- `config.answer_style`

## 5. 输出规范
写入 `qae_triplets[]`，推荐字段：

- `triplet_id`
- `scaffold_id`
- `source_qa_draft_id`
- `question`
- `answer`
- `evidence_refs`
- `triplet_type`
- `triplet_origin`
- `grounding_level`
- `dataset_tier`
- `materialization_mode`
- `difficulty`
- `status`

## 6. 与上下游的绑定关系
- 上游：A7
- 兼容上游：`qa_drafts[]`、`evidence_units[]`
- 下游：A9、A10

## 7. 典型失败模式
- 问题、答案和 evidence 来自不同粒度的骨架节点
- evidence 只保留自然语言描述，不保留显式引用
- 多跳问题实际上只依赖单个时间窗
- 导入了人工 QA，但 `source_qa_draft_id` 丢失
- QA-first 路线里 answer 被重写后，没有明确记录是 `verify` 还是 `fill`
- `dataset_tier` 与 `grounding_level` 不一致

## 8. 推荐使用场景
- 自动构造 grounded QA
- narration / caption-first 构题
- QA-first / post-hoc grounding 的最终定稿
- 长视频数据集生成
- 面向 LVLM post-training / instruction tuning 的高质量 Q/A/E 出站
