# Q/A/E共同合成算子（A8）技术文档

## 1. 在系统中的定位
A8 负责在 A7 提供的结构骨架约束下，同时生成：

- Question
- Answer
- Evidence

这里的核心不是“先生成问题，再补证据”，而是让三者共享同一个 scaffold。

因此，A8 是当前系统区别于旧版 grounded 回看链的关键算子。

## 2. 文献依赖等级

- 文献依赖等级：`P2 论文原生`
- 最新支撑强度：`很强`

### 2.1 文献锚点
- Grounded Question-Answering in Long Egocentric Videos
- Grounded Multi-Hop VideoQA in Long-Form Egocentric Videos
- LongViTU

### 2.2 从文献保留了什么
- QA 和 evidence 经常共享同一上游结构骨架
- 在数据构造场景里，更常见的是共同合成，而不是先 QA 再 post-hoc grounding

## 3. 子模式定义

### 3.1 SINGLE_HOP_QAE
生成单跳 Q/A/E 样本。

### 3.2 MULTIHOP_QAE
生成多跳 Q/A/E 样本。

### 3.3 INSTRUCTION_QAE
生成 instruction-style 或 explanation-style 样本。

## 4. 输入规范

### 4.1 必需输入
- `scaffold_units[].scaffold_id`
- `scaffold_units[].scaffold_summary`

### 4.2 可选输入
- `config.triplet_type`
- `config.max_triplets_per_unit`
- `config.require_explicit_evidence`
- `config.answer_style`

## 5. 输出规范
写入 `qae_triplets[]`，推荐字段：

- `triplet_id`
- `scaffold_id`
- `question`
- `answer`
- `evidence_refs`
- `triplet_type`
- `difficulty`
- `status`

## 6. 与上下游的绑定关系
- 上游：A7
- 下游：A9、A10

## 7. 典型失败模式
- 问题、答案和 evidence 来自不同粒度的骨架节点
- evidence 只保留自然语言描述，不保留引用
- 多跳问题实际上只依赖单个时间窗

## 8. 推荐使用场景
- 自动构造 grounded QA
- 长视频数据集生成
- 需要保留 `Q/A/E` 三元组血缘时
