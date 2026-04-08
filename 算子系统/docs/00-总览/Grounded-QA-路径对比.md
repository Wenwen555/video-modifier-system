# Grounded QA 路径对比

## 1. 为什么还需要这页

虽然当前算子系统已经把默认主链路改成“结构骨架优先”的数据构造路线，但 grounded QA 文献里仍然并存多种工作流。

当前最值得区分的有四类：

1. 结构骨架优先、Q/A/E 共同合成
2. 先生成草案，再回视频做 post-hoc grounding
3. 先根据问题做 grounding，再生成答案
4. 多路径协同与反思聚合

## 2. 四条典型路径总表

| 路径 | 代表论文 | 最关键前置条件 | 更适合什么场景 | 与当前系统关系 |
|---|---|---|---|---|
| 路径A：scaffold-first / joint synthesis | [Grounded Question-Answering in Long Egocentric Videos](https://openaccess.thecvf.com/content/CVPR2024/papers/Di_Grounded_Question-Answering_in_Long_Egocentric_Videos_CVPR_2024_paper.pdf), [Grounded Multi-Hop VideoQA in Long-Form Egocentric Videos](https://arxiv.org/abs/2408.14469), [LongViTU](https://arxiv.org/abs/2501.05037) | 必须先构建 chunk、tree、graph 或其他结构骨架 | 数据构造 | 当前默认主链路 |
| 路径B：QA-first / post-hoc grounding | [Pinpointing Trigger Moment for Grounded Video QA](https://arxiv.org/abs/2511.02182) | 需要先有草案或 reasoning 结果 | 推理式 grounded QA、challenge 式流程 | 当前系统保留为旁路，不再是默认 |
| 路径C：ground-first / answer-later | [Video-in-the-Loop](https://arxiv.org/abs/2510.04022), [Can I Trust Your Answer?](https://arxiv.org/abs/2309.01327) | 必须已给定 question | benchmark 推理、交互式问答 | 当前系统作为推理旁路 |
| 路径D：multi-path / agentic aggregation | [MUPA](https://arxiv.org/abs/2506.18071) | 需要多代理、多路径和聚合器 | 研究型系统 | 后续高级模式 |

## 3. 当前默认主链路：结构骨架优先

### 3.1 核心思想

这条路线不是：

- 先自由生成 QA
- 再回视频里检索证据

而是：

- 先构造结构骨架
- 再从这份骨架里共同生成 `Question / Answer / Evidence`

默认主链路写成：

`A1 -> A2 -> A3 -> A4 -> A5/A6 -> A7 -> A8 -> A9 -> A10`

### 3.2 为什么它更适合数据构造

- 更符合现有数据构造论文的真实 pipeline
- Q/A/E 三者共享同一个 scaffold，血缘更稳
- 更容易做批量生成、回修和筛查

### 3.3 当前系统中的展开方式

- `A4` 生成粗描述
- `A5` 抽时序结构
- `A6` 抽文本辅证
- `A7` 组织成骨架单元
- `A8` 共同合成 Q/A/E
- `A9` 做一致性回修
- `A10` 做最终筛查

## 4. 路径B：QA-first / post-hoc grounding

### 4.1 核心思想

先有 QA 草案或 reasoning 结果，再回视频里做 temporal / spatial grounding。

最接近的代表是 [Pinpointing Trigger Moment for Grounded Video QA](https://arxiv.org/abs/2511.02182)，其 pipeline 明确写成：

`Video Reasoning & QA -> Spatio-temporal Grounding -> Tracking`

### 4.2 为什么当前系统不再把它当默认路线

- 它更适合 question-given 推理链
- 对数据构造而言，结构骨架式共同合成更常见
- 它通常没有完整的 scaffold-first 可复用中间层

## 5. 路径C：ground-first / answer-later

### 5.1 核心思想

- 已有 question
- 先 localize 关键 span
- 再生成或修订答案

这是 benchmark 推理里非常常见的路线。

### 5.2 当前系统中的地位

当前系统保留它作为“推理旁路”，但不把它作为默认数据构造主链。

## 6. 路径D：multi-path / agentic aggregation

### 6.1 核心思想

同时保留不同顺序的 reasoning / grounding path，再交给聚合器做最终裁决。

### 6.2 当前系统中的地位

它不是第一版默认流程，因为：

- 成本高
- 结构复杂
- 需要额外 reflection / aggregation 机制

## 7. 当前建议

对于当前算子系统，建议采用：

- 默认主链路：路径A
- 推理旁路：路径B 与路径C
- 高级研究模式：路径D

也就是说，当前系统的定位不是：

- “所有 grounded QA 论文都遵循同一条链路”

而是：

- “系统默认采用更贴近数据构造文献的 scaffold-first 路线，同时保留其他 grounded QA workflow 作为旁路”
