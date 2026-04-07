# Architecture

本页用于集中说明视频算子系统的结构设计，包括系统分层、主数据流、中间态、数据血缘和预设管线关系。

## System Overview

当前版本的系统围绕 9 个视频算子展开。它不是一组互不相关的工具集合，而是一条受统一中间态约束且具有上下游关系的数据处理链路。

系统目标有三点：

- 为视频增强和标注构建提供稳定入口
- 在不同需求下复用同一套数据流
- 让最终标注能够回溯到明确证据

需要特别强调的是：

- 算子编号是稳定身份标识
- 不代表所有 preset 都必须遵循唯一的数字顺序

在当前默认主链路中，`A7 -> A8` 会先于 `A4/A5/A6` 执行；而在 route-two 推理模式中，外部问题甚至可以直接从 `A8` 进入系统。

## Layered Architecture

系统分为四层。

### Base system layer
该层负责建立主链路、控制预算并组织可消费上下文。

| Operator | Responsibility |
|---|---|
| A1 Partition | 将原视频切成可处理片段 |
| A2 Context Orchestration | 合并、附着和整理片段上下文 |
| A3 Sampling | 统一基础采样与自适应采样 |

### Draft and Query layer
该层负责先形成低成本草案，再把草案或外部问题转成可执行的 grounding query。

| Operator | Responsibility |
|---|---|
| A7 Draft Generation | 生成粗 caption、QA 草案和 claim slots |
| A8 Query Normalization | 把草案或外部问题改写成 query bundles，并控制证据分支预算 |

### Grounding revisit layer
该层负责围绕 query bundle 回到视频中显式取证。

| Operator | Responsibility |
|---|---|
| A4 Temporal Evidence Localization | 先缩小时序范围，找出支持或反驳 claim 的关键 span |
| A5 Spatial Evidence Focus | 在候选 span 内生成区域级和对象级视觉证据 |
| A6 Textual Auxiliary Extraction | 在候选 span 内汇聚 OCR、字幕和 ASR 文本辅证 |

### Audit and release layer
该层负责 grounded 回修、严格审查和最终出站控制。

| Operator | Responsibility |
|---|---|
| A9 Grounded Revision and Quality Screening | 执行证据摘要、答案回修、严格审查与质量筛查 |

## End-to-End Flow

默认主数据流如下：

```text
Raw Video
  -> A1 Partition
  -> A2 Context Orchestration
  -> A3 Sampling
  -> A7 Draft Generation
  -> A8 Query Normalization
  -> A4 Temporal Evidence Localization
  -> [A5 Spatial Evidence Focus + A6 Textual Auxiliary Extraction]
  -> A9 Grounded Revision and Quality Screening
```

更细一点的结构可以写成：

```text
video
  -> segments
  -> orchestrated segments
  -> samples
  -> draft units
  -> query bundles
  -> temporal / spatial / textual evidence
  -> revised qa pairs
  -> verified outputs
```

路线二中的常见变体是：

```text
External Question
  -> A8 Query Normalization
  -> A4 Temporal Evidence Localization
  -> [A5 Spatial Evidence Focus + A6 Textual Auxiliary Extraction]
  -> A9 Grounded Revision and Quality Screening
```

## Operator Interaction

并非所有算子都严格串行。

### Serial edges in default route
- `A1 -> A2`
- `A2 -> A3`
- `A3 -> A7`
- `A7 -> A8`
- `A8 -> A4`
- `A4 -> A5/A6`
- `A4/A5/A6 -> A9`

### Route-two shortcut
- `External Question -> A8`
- `A8 -> A4`
- `A4 -> A5/A6`
- `A4/A5/A6 -> A9`

### Parallel evidence branches
- `A4` 负责先缩小时序范围，并把 claim 挂到候选 span 上
- `A5` 在候选 span 内继续提取空间证据
- `A6` 在候选 span 内继续提取文本辅证

这三条分支最终在 `A9` 汇合，之后由 `A9` 完成证据摘要、答案回修、严格审查和最终质量筛查。

## 设计原则

1. 算子只追加结果，不覆盖上游原始对象。
2. 下游只通过对象引用消费上游产物。
3. 每条最终标注都必须挂到至少一种显式证据上。
4. 草案可以先于 full grounding 出现，但最终结果不能绕过 grounded 闭环。

## Data Lineage

当前系统的数据血缘关系如下：

```text
video_id
  -> segment_id
    -> sample_id
      -> draft_id
        -> query_bundle_id
          -> event_id
          -> region_id
          -> text_signal_id
            -> qa_id
              -> verification_id
```

这条血缘链意味着：

- 标注可以回溯到时间范围
- 标注可以回溯到样本帧
- 标注可以回溯到最初草案、规范化 query 与最终证据对象
- 裁决结果可以明确指出保留或拒绝原因

## Preset Architecture

我们采用经典文献工作的主链路作为预设，具体请参考 [预设管线与文献对照](../02-预设管线/预设管线与文献对照.md)。

## Scope

- 本页只说明系统结构，不重复单算子参数细节
- 基础设施层如调度器、缓存、对象存储不在当前页面范围内
- 详细字段定义请看 [统一中间态与数据流协议](统一中间态与数据流协议.md)
