# Grounded核验与回修算子（A9）技术文档

## 1. 在系统中的定位
Grounded核验与回修算子是整条链路的最终出口。它负责检查 A8 生成的 QA 是否真的被证据支撑，并在必要时执行回修、回退或拒绝。

它的重点不只是“打分”，而是“核验 + 解释 + 回修 + 最终决策”。

## 2. 文献依赖等级

- 文献依赖等级：`P2 论文原生`
- 最新支撑强度：`中强`

### 2.1 文献锚点
- LongViTU
- VDC-Agent
- MVQA-68K
- Omni-Judge

### 2.2 从文献保留了什么
- 自动生成 QA 必须经过 grounded 后验筛选。
- 评分应是多维度的，而不是单个总分。
- 高级流程应支持基于错误原因的修正闭环。

## 3. 子模式定义

### 3.1 RULE_CHECK
使用规则检查明显错误，如证据缺失、时间越界、对象引用错误。

### 3.2 EVIDENCE_REPLAY
回放证据片段，检查问题和答案是否真正对应。

### 3.3 SELF_REPAIR
在证据仍然有效的前提下对问题或答案做局部回修。

### 3.4 FILTER_GATE
根据综合得分决定保留、拒绝或回退重试。

## 4. 输入规范
消费 `qa_pairs[]` 及其关联证据。

### 4.1 必需输入
- `qa_pairs[].qa_id`
- `qa_pairs[].evidence_refs`

### 4.2 可选输入
- `config.rule_set`
- `config.score_threshold`
- `config.repair_policy`
- `config.max_candidates_keep`

## 5. 输出规范
写入 `verification[]`，并更新 `qa_pairs[].status`。

核验对象推荐字段：

- `verification_id`
- `target_qa_id`
- `scores.factuality`
- `scores.temporal_consistency`
- `scores.spatial_grounding`
- `scores.text_visual_alignment`
- `repair_action`
- `decision`
- `reason`

## 6. 关键参数

| 参数 | 作用 |
|---|---|
| `score_threshold` | 最终保留阈值 |
| `max_candidates_keep` | 每个目标保留候选数 |
| `rule_set` | 规则集选择 |
| `repair_policy` | 回修策略 |

## 7. 与上下游的绑定关系
- 上游：A8 提供候选 QA
- 下游：无视频算子下游，A9 是系统出口，但可向 A7/A8 回传错误原因

## 8. 典型失败模式
- 评分偏向语言流畅性而忽略证据真实性
- 回修直接改写文本，但没有重新绑定证据
- 多维评分存在冲突却没有明确的决策逻辑

## 9. 推荐使用场景
- 自动化 QA 数据构建的最终过滤
- 高质量数据子集筛选
- 汇报和实验中展示“从候选到黄金样本”的闭环流程
