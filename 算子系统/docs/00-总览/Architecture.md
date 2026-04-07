# Architecture

本页用于集中说明视频算子系统的结构设计，包括系统分层、主数据流、中间态、数据血缘和预设管线关系。

## System Overview

当前版本的系统围绕 9 个视频算子展开。它不是一组互不相关的工具集合，而是一条受统一中间态约束且具有上下游关系的数据处理链路。

系统目标有三点：

- 为视频增强和标注构建提供稳定入口
- 在不同需求下复用同一套数据流
- 让最终标注能够回溯到明确证据

## Layered Architecture

系统分为两层。

### Base system layer
该层负责建立主链路、控制预算并组织可消费上下文。

| Operator | Responsibility |
|---|---|
| A1 Partition | 将原视频切成可处理片段 |
| A2 Context Orchestration | 合并、附着和整理片段上下文 |
| A3 Sampling | 统一基础采样与自适应采样 |

### Evidence and QA layer
该层负责提取多路证据，并把证据组织成可核验的 QA 数据。

| Operator | Responsibility |
|---|---|
| A4 Temporal Evidence Localization | 构建 question-ready but not question-bound 的候选时序证据池 |
| A5 Spatial Evidence Focus | 生成区域级和对象级视觉证据 |
| A6 Textual Auxiliary Extraction | 汇聚 OCR、字幕和 ASR 文本辅证 |
| A7 Question Planning | 规划题型、证据引用和答案形式 |
| A8 QA Generation | 生成 grounded QA 候选 |
| A9 Grounded Verification and Repair | 核验 QA 并执行回修或拒绝 |

## End-to-End Flow

主数据流如下：

```text
Raw Video
  -> A1 Partition
  -> A2 Context Orchestration
  -> A3 Sampling
  -> A4 Temporal Evidence Localization
  -> A5 Spatial Evidence Focus
  -> A6 Textual Auxiliary Extraction
  -> A7 Question Planning
  -> A8 QA Generation
  -> A9 Grounded Verification and Repair
```

更细一点的结构可以写成：

```text
video
  -> segments
  -> orchestrated segments
  -> samples
  -> temporal / spatial / textual evidence
  -> question plans
  -> qa pairs
  -> verified outputs
```

## Operator Interaction

并非所有算子都严格串行。

### Serial edges
- `A1 -> A2`
- `A2 -> A3`
- `A3 -> A4/A5/A6`
- `A4/A5/A6 -> A7`
- `A7 -> A8`
- `A8 -> A9`

### Parallel evidence branches
- `A4` 从样本中提取可供后续问题规划消费的时间边界和关键事件
- `A5` 从样本中提取空间证据
- `A6` 从样本与外挂资源中提取文本辅证

这三条分支最终在 `A7` 汇合，之后由 `A8` 负责具体 QA 生成。



## 设计原则：

1. 算子只追加结果，不覆盖上游原始对象
2. 下游只通过对象引用消费上游产物
3. 每条最终标注都必须挂到至少一种显式证据上

## Data Lineage

当前系统的数据血缘关系如下：

```text
video_id
  -> segment_id
    -> sample_id
      -> event_id
      -> region_id
      -> text_signal_id
        -> plan_id
          -> qa_id
            -> verification_id
```

这条血缘链意味着：

- 标注可以回溯到时间范围
- 标注可以回溯到样本帧
- 标注可以回溯到文本、区域或时间事件证据
- 裁决结果可以明确指出保留或拒绝原因

## Preset Architecture

我们采用经典文献工作的主链路作为预设，具体请参考 [预设管线与文献对照](../02-预设管线/预设管线与文献对照.md)。



## Scope

- 本页只说明系统结构，不重复单算子参数细节
- 基础设施层如调度器、缓存、对象存储不在当前页面范围内
- 详细字段定义请看 [统一中间态与数据流协议](统一中间态与数据流协议.md)
