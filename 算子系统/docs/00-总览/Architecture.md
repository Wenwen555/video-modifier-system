# Architecture

本页集中说明视频算子系统的结构设计，包括系统分层、主数据流、中间态、数据血缘和预设管线关系。

## System Overview

当前版本围绕 10 个视频算子展开。系统默认不是“问答推理系统”，而是“视频数据构造系统”。

它的核心目标有三点：

- 建立稳定的结构骨架
- 从骨架中共同合成 `Question / Answer / Evidence`
- 让最终样本可回修、可筛查、可追溯

## Layered Architecture

系统分为四层。

### Base system layer
负责建立主链路入口、组织上下文和控制采样预算。

| Operator | Responsibility |
|---|---|
| A1 Partition | 将原视频切成可处理片段 |
| A2 Context Orchestration | 合并、附着和整理片段上下文 |
| A3 Sampling | 统一基础采样与自适应采样 |

### Scaffold extraction layer
负责从视频中提取可合成数据的结构信息。

| Operator | Responsibility |
|---|---|
| A4 Coarse Caption | 生成片段级或上下文级粗描述 |
| A5 Temporal Structure Extraction | 抽取事件、时间窗和阶段关系 |
| A6 Textual Auxiliary Extraction | 汇聚 OCR、字幕和 ASR 辅证 |

### Scaffold and synthesis layer
负责构建结构骨架并共同合成 Q/A/E。

| Operator | Responsibility |
|---|---|
| A7 Structural Scaffold Construction | 把 caption、时序结构和文本辅证组织成 chunk / tree / graph |
| A8 Joint QAE Synthesis | 在骨架约束下联合生成 Question、Answer 和 Evidence |

### Revision and audit layer
负责回修与最终出站控制。

| Operator | Responsibility |
|---|---|
| A9 Consistency Revision | 对三元组做字段对齐、冲突消解和局部修订 |
| A10 Quality Screening | 执行规则过滤、评分排序和保留决策 |

## End-to-End Flow

默认主数据流如下：

```text
Raw Video
  -> A1 Partition
  -> A2 Context Orchestration
  -> A3 Sampling
  -> A4 Coarse Caption
  -> A5 Temporal Structure Extraction
  -> A6 Textual Auxiliary Extraction
  -> A7 Structural Scaffold Construction
  -> A8 Joint QAE Synthesis
  -> A9 Consistency Revision
  -> A10 Quality Screening
```

更细一点的结构可以写成：

```text
video
  -> segments
  -> orchestrated segments
  -> samples
  -> coarse captions / temporal structures / text signals
  -> scaffold units
  -> qae triplets
  -> revisions
  -> quality-approved outputs
```

## Operator Interaction

### Serial edges in default route
- `A1 -> A2`
- `A2 -> A3`
- `A3 -> A4/A5/A6`
- `A4/A5/A6 -> A7`
- `A7 -> A8`
- `A8 -> A9`
- `A9 -> A10`

### Parallel extraction branches
- `A4` 提供粗描述语义底座
- `A5` 提供事件和时间结构
- `A6` 提供文本辅证

这三条分支最终在 `A7` 汇合，构成可被 `A8` 共同合成消费的结构骨架。

## Design Principles

1. 算子只追加结果，不覆盖上游原始对象。
2. 共同合成必须依赖骨架，而不是直接对原视频自由生成。
3. 最终数据必须经过回修与筛查。
4. 数据血缘必须能回挂到片段、采样、结构节点和原始辅证。

## Data Lineage

当前系统的数据血缘关系如下：

```text
video_id
  -> segment_id
    -> sample_id
      -> caption_id
      -> temporal_unit_id
      -> text_signal_id
        -> scaffold_id
          -> triplet_id
            -> revision_id
              -> quality_id
```

这条血缘链意味着：

- 最终 Q/A/E 可回溯到结构骨架
- 骨架可回溯到 caption、时间结构和文本辅证
- 最终筛查结果可以明确指出保留或拒绝原因

## Preset Architecture

我们采用经典文献中的结构骨架式数据构造流程作为当前默认预设，具体请参考 [预设管线与文献对照](../02-预设管线/预设管线与文献对照.md)。

## Scope

- 本页只说明系统结构，不重复单算子参数细节
- 基础设施层如调度器、缓存、对象存储不在当前页面范围内
- 详细字段定义请看 [统一中间态与数据流协议](统一中间态与数据流协议.md)
