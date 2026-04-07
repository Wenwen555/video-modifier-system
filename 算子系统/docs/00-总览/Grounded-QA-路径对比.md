# Grounded QA 路径对比

## 1. 为什么需要单独比较路径

Grounded QA 并不存在唯一稳定的数据 pipeline。当前文献里至少有三条常见路线：

1. 先生成草案或先推理，再回到视频里做 grounding
2. 先根据问题做 grounding，再生成或修订答案
3. 同时保留多条路径，再用反思或裁决模块聚合

这三条路线都合理，但它们的前置条件、成本结构和适用场景完全不同。因此，算子系统不能假设 A4/A5 永远前置，也不能假设它们永远后置。

## 2. 三条典型路径总表

| 路径 | 代表论文 | 最关键前置条件 | A4/A5 是否 question-conditioned | 优势 | 风险 |
|---|---|---|---|---|---|
| 路径一：QA-first / post-hoc grounding | [Pinpointing Trigger Moment for Grounded Video QA](https://arxiv.org/abs/2511.02182) | 需要先有草案、claim slots 和可执行 query bundle | 是 | 更贴近生成式数据构建；可以先低成本覆盖，再集中算力回看 | 若草案不稳，grounding 会被错误 claim 带偏 |
| 路径二：ground-first / answer-later | [Video-in-the-Loop](https://arxiv.org/abs/2510.04022)；[Can I Trust Your Answer? Visually Grounded Video Question Answering](https://arxiv.org/abs/2309.01327) | 必须已经存在 question，且 question 可转成 grounding query | 是 | 证据链更紧，定位后再回答，解释性更强 | 不适合“还没有问题、要先造数据”的场景 |
| 路径三：multi-path / agentic aggregation | [MUPA](https://arxiv.org/abs/2506.18071) | 需要多代理、多路径和反思聚合模块 | 部分是 | 覆盖面最广，能同时吸收两条顺序不同的优势 | 系统复杂、成本高、实现难度最大 |

## 3. 路径一：先草案，再 grounding

### 3.1 代表思路

这条路线更接近：

- 先用低成本上下文和粗采样生成草案与 claim slots
- 再经 A8 规范化为 grounding query bundles
- 最后回看视频中的时序、空间和文本证据，并在 A9 完成回修与筛查

典型代表是 [Pinpointing Trigger Moment for Grounded Video QA](https://arxiv.org/abs/2511.02182)。其摘要明确把 GVQA 写成三阶段：

`Video Reasoning & QA -> Spatio-temporal Grounding -> Tracking`

### 3.2 前置条件

这条路线成立，至少要满足：

- 已经有划分、编排和粗采样结果
- A7 已经产出 `draft_units[]`
- 草案中已经拆出 `claim_slots`、`answer_contract`、`budget_hint`
- A8 可以把草案改写成可执行的 `query_bundles[]`
- 允许后验地回到视频做证据回放

也就是说，这条路线默认不要求外部先给定 question，但要求系统自己先生成一版“可问的问题草案”并把它拆成可检索 claim。

### 3.3 更适合什么场景

- 数据构建
- 自动生成 grounded QA
- 希望先低成本覆盖大量样本，再对高价值样本做二次回看

### 3.4 算子系统中的推荐映射

推荐写成：

`A1 划分 -> A2 编排 -> A3 粗采样 -> A7 草案生成 -> A8 Query规范化 -> A4 时序grounding回看 -> A5 空间grounding回看 + A6 文本辅证回看 -> A9 Grounded回修与质量筛查`

其中 A9 内部再完成：

- 证据摘要
- 答案回修
- 严格审查
- 最终筛查

### 3.5 主要风险

- 草案幻觉会被传递到 grounding 阶段
- 如果 claim 没拆清楚，A8 很难生成稳定 query
- 回看成本会随着候选草案数量快速增加
- 如果只找支持证据，A9 会更容易错误保留不该保留的答案

## 4. 路径二：先 grounding，再回答

### 4.1 代表思路

这条路线更接近：

- 已有 question
- 先根据 question 找相关时间段或区域
- 只对这些候选证据做高质量重采样或重看
- 最后生成或修订答案

代表论文可以并列看：

- [Video-in-the-Loop](https://arxiv.org/abs/2510.04022)
- [Can I Trust Your Answer? Visually Grounded Video Question Answering](https://arxiv.org/abs/2309.01327)

其中，`Video-in-the-Loop` 的摘要明确写的是：

- 先用低 fps skim 做 localization
- 再对相关 span 做 span-aware reallocation
- 最后给出答案

而 `Can I Trust Your Answer?` 的核心流程也属于同一路线：先给定 question，再做时序证据定位，然后基于定位结果约束或核验答案生成。它更像是路径二里的“时序 grounding 优先版”。

### 4.2 前置条件

这条路线的关键约束最严格：

- 必须已经有 question
- question 必须可被改写成 grounding query
- grounding 本身先于最终答案

因此，它天然不适合“当前还没有 question，要先造 QA 数据”的场景。

### 4.3 更适合什么场景

- benchmark 推理
- 用户交互式问答
- 给定问题条件下的证据检索

### 4.4 算子系统中的推荐映射

推荐写成：

`已有Question -> A8 Query规范化 -> A4 时序grounding -> A5 空间grounding + A6 文本辅证回看 -> A3 局部重采样/重看（可选） -> A9 Grounded回修与质量筛查`

如果要接入你现有系统，则更像是：

`A1 -> A2 -> A3(粗) -> 外部Question -> A8 Query规范化 -> A4/A5/A6 -> A3(局部重采样，可选) -> A9 Grounded回修与质量筛查`

### 4.5 主要风险

- 如果 question 本身表达模糊，grounding 会直接失败
- 不适合离线自动造题
- 对 query 规范化能力依赖很高

## 5. 路径三：多路径协同

### 5.1 代表思路

这条路线不再假设单一顺序，而是同时保留：

- 先草案再 grounding 的路径
- 先 grounding 再答案修订的路径
- 以及中间带反思或裁决的聚合路径

典型代表是 [MUPA](https://arxiv.org/abs/2506.18071)。其摘要明确指出：

- 系统包含 grounding、QA、reflection、aggregation
- 三条路径在 grounding 与 QA 的 chronological order 上不同

### 5.2 前置条件

这条路线要求最高：

- 已有 question 或至少已有 QA 任务目标
- 有多条 reasoning/grounding 子路径
- 有反思与聚合模块来做最终裁决

### 5.3 更适合什么场景

- 高可靠 grounded QA
- 研究型系统
- 需要显式比较不同 grounding 顺序的实验设计

### 5.4 算子系统中的推荐映射

推荐写成：

`A1 -> A2 -> A3 -> [路径A: A7 -> A8 -> A4/A5/A6 -> A9] + [路径B: 外部Question -> A8 -> A4/A5/A6 -> A9] -> Reflection / Aggregation`

### 5.5 主要风险

- 系统复杂度高
- 成本高
- 多路径间结果冲突时需要额外裁决逻辑

## 6. 对当前算子系统的启发

### 6.1 如果目标是数据构建

更推荐把路径一作为默认主链路。原因是：

- 你当前系统的目标之一是“自动构建 grounded QA”
- 当前并不总是先有外部 question
- 先草案、后 grounding 更贴近生成式数据构建

### 6.2 如果目标是在线问答或 benchmark 推理

更推荐把路径二作为推理模式。原因是：

- question 已经存在
- grounding 可以直接围绕 question 做
- 解释链更紧凑

### 6.3 如果目标是做更强的研究原型

可以进一步引入路径三，但不建议把它作为系统第一版默认流程。原因很直接：

- 成本最高
- 实现最复杂
- 需要额外的 reflection / aggregation 机制

## 7. 当前建议

对于当前算子系统，建议采用：

- 默认主链路：路径一
- 额外保留一个推理旁路：路径二
- 把路径三作为后续高级研究模式

也就是说，当前更稳的系统定位不是：

- “当前大多数 grounded QA 论文都遵循同一条链路”

而是：

- “系统默认采用一条更贴近 generate-then-ground 的数据构建链路，同时保留 ground-first 推理旁路，以兼容主流 grounded QA workflow”
