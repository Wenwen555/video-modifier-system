# Grounded QA 路径对比

## 1. 为什么还需要这页

虽然当前算子系统已经把默认主链路改成“结构骨架优先”的数据构造路线，但 grounded QA 文献里仍然并存多种工作流。

如果当前目标是构造适合 `post-training / instruction tuning` 的高质量 LVLM QA 数据，那么最需要区分的是：

1. `narration / caption-first`
2. `structure-first / scaffold-first`
3. `QA-first / post-hoc grounding`
4. `ground-first / answer-later`

其中前 3 条是主要的数据构造路线，第 4 条更接近 question-given 推理旁路。

## 2. 四条典型路径总表

| 路径 | 代表论文 | 最关键前置条件 | 更适合什么场景 | 与当前系统关系 |
|---|---|---|---|---|
| 路径A：narration / caption-first | [Grounded Question-Answering in Long Egocentric Videos](https://openaccess.thecvf.com/content/CVPR2024/papers/Di_Grounded_Question-Answering_in_Long_Egocentric_Videos_CVPR_2024_paper.pdf), Just Ask / HowToVQA69M | 需要 narration、subtitle、ASR 或 dense captions | 大规模自动化 QA、弱监督 grounded QA | 当前系统已兼容，作为正式数据入口 |
| 路径B：structure-first / scaffold-first | [Grounded Multi-Hop VideoQA in Long-Form Egocentric Videos](https://arxiv.org/abs/2408.14469), [LongViTU](https://arxiv.org/abs/2501.05037) | 必须先构建 chunk、tree、graph 或其他结构骨架 | 组合推理型 grounded QA、强证据 QA | 当前默认主链路 |
| 路径C：QA-first / post-hoc grounding | [Pinpointing Trigger Moment for Grounded Video QA](https://arxiv.org/abs/2511.02182) 等 | 需要先有人工 QA 或外部 QA 草案 | 把现有 QA 升级成 grounded QA、人工高质数据补证据 | 当前系统已兼容，作为正式数据入口 |
| 路径D：ground-first / answer-later | [Video-in-the-Loop](https://arxiv.org/abs/2510.04022), [Can I Trust Your Answer?](https://arxiv.org/abs/2309.01327) | 必须已给定 question | benchmark 推理、交互式问答 | 当前系统作为推理旁路 |

## 3. 路径A：narration / caption-first

### 3.1 核心思想

这条路线的典型做法是：

- 先组织 narration chunks、subtitle spans、ASR segments 或 dense captions
- 再补充必要的时间结构和视觉描述
- 最后从这些 chunk 中共同导出 `Question / Answer / Evidence`

### 3.2 为什么它对 post-training 很重要

- 它最容易规模化
- 它对 instructional / narrated videos 很自然
- 它适合构造大规模 QA 或弱 grounding QA 训练集

### 3.3 当前系统中的展开方式

- `A1 -> A2 -> A3`
- `A6` 抽 narration / subtitle / ASR 文本信号
- `A4 / A5` 可按预算补充视觉描述和时间结构
- `A7` 构造 narration scaffold 或 caption-event scaffold
- `A8` 共同物化 Q/A/E
- `A9 -> A10` 完成回修与筛查

## 4. 路径B：structure-first / scaffold-first

### 4.1 核心思想

这条路线不是：

- 先自由生成 QA
- 再回视频里检索证据

而是：

- 先构造结构骨架
- 再从这份骨架里共同生成 `Question / Answer / Evidence`

默认主链路写成：

`A1 -> A2 -> A3 -> A4 -> A5/A6 -> A7 -> A8 -> A9 -> A10`

### 4.2 为什么它仍是默认主链

- 它最适合高质量 grounded QA 数据构造
- Q/A/E 三者共享同一个 scaffold，血缘最稳
- 更容易做批量生成、回修和筛查
- 更适合作为 instruction tuning 的强监督样本来源

## 5. 路径C：QA-first / post-hoc grounding

### 5.1 核心思想

先有 QA 草案、人工标注或外部 benchmark QA，再回视频里做 temporal / spatial grounding，并把它们物化成统一 triplet。

一个常见写法是：

`External QA Drafts -> Evidence Extraction -> Query Scaffold -> Evidence Binding / Answer Fill`

### 5.2 为什么这条路必须进入协议层

- 很多现有数据资源本来只有 QA，没有强 evidence
- 人工高质量 QA 常常比自动生成 QA 更可靠
- 如果不把它纳入协议层，就无法把现有 benchmark / 人工数据系统化升级成 grounded QA

### 5.3 当前系统中的展开方式

- 通过 `qa_drafts[]` 导入外部 question / answer
- `A4 / A5 / A6` 抽取候选证据
- 规约为 `evidence_units[]`
- `A7` 构造 query scaffold 或 verification scaffold
- `A8` 绑定 evidence，并校验或补全 answer
- `A9 -> A10` 完成回修与筛查

## 6. 路径D：ground-first / answer-later

### 6.1 核心思想

- 已有 question
- 先 localize 关键 span
- 再生成或修订答案

这是 benchmark 推理里非常常见的路线，但它不一定天然适合离线数据构造。

### 6.2 当前系统中的地位

当前系统保留它作为“推理旁路”，但不把它作为默认 post-training 数据构造主链。

## 7. 当前建议

对于当前算子系统，建议采用：

- 默认主链路：路径B
- 正式兼容的数据入口：路径A 与路径C
- 推理旁路：路径D

也就是说，当前系统的定位不是：

- “只支持 structure-first 一条路”

而是：

- “系统默认采用更贴近高质量数据构造的 structure-first 路线，同时把 narration-first 与 QA-first 正式纳入统一协议，以服务 LVLM post-training / instruction tuning”
