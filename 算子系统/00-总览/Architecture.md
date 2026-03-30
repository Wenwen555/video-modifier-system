# Architecture

本页用于集中说明视频算子系统的结构设计，包括系统分层、主数据流、中间态、数据血缘和预设管线关系。

## System Overview

当前版本的系统围绕 10 个视频算子展开。它不是一组互不相关的工具集合，而是一条受统一中间态约束的数据处理链路。

系统目标有三点：

- 为视频增强和标注构建提供稳定入口
- 在不同预算下复用同一套数据流
- 让最终标注能够回溯到明确证据

## Layered Architecture

系统分为两层。

### Base system layer
该层负责建立主链路、控制预算和清理输入。

| Operator | Responsibility |
|---|---|
| A1 Partition | 将原视频切成可处理片段 |
| A2 Segment Cleaning | 过滤低质量片段和低价值片段 |
| A3 Sampling | 生成基础样本帧 |
| A5 Deduplication | 压缩冗余样本 |
| A6 Text Extraction | 汇聚 OCR、字幕和 ASR 文本证据 |

### Literature-driven layer
该层负责提供近期文献更强调的高价值能力。

| Operator | Responsibility |
|---|---|
| A4 Adaptive Sampling | 在固定预算下保留高价值时刻 |
| A7 Spatial Focus | 生成区域级和对象级视觉证据 |
| A8 Temporal Localization and Change Summary | 显式建模时间边界和变化事件 |
| A9 Annotation Generation | 生成 caption、QA 和 summary |
| A10 Selection and Quality Judgement | 选择高质量候选并过滤不可靠结果 |

## End-to-End Flow

主数据流如下：

```text
Raw Video
  -> A1 Partition
  -> A2 Segment Cleaning
  -> A3 Sampling / A4 Adaptive Sampling
  -> A5 Deduplication
  -> A6 Text Extraction
  -> A7 Spatial Focus
  -> A8 Temporal Localization and Change Summary
  -> A9 Annotation Generation
  -> A10 Selection and Quality Judgement
```

更细一点的结构可以写成：

```text
video
  -> segments
  -> cleaned segments
  -> samples
  -> compressed samples
  -> text / region / temporal evidence
  -> annotations
  -> accepted outputs
```

## Operator Interaction

并非所有算子都严格串行。

### Serial edges
- `A1 -> A2`
- `A2 -> A3/A4`
- `A3/A4 -> A5`
- `A5 -> A9`
- `A9 -> A10`

### Parallel evidence branches
- `A6` 从样本中提取文本证据
- `A7` 从样本中提取空间证据
- `A8` 从样本和局部证据中提取时间事件

这三条分支最终在 `A9` 汇合。

## Intermediate Representation

所有算子共享统一的 `VideoPacket`。顶层结构如下：

```json
{
  "video": {},
  "trace": {},
  "segments": [],
  "samples": [],
  "text_signals": [],
  "regions": [],
  "temporal_events": [],
  "annotations": [],
  "quality": []
}
```

设计原则：

1. 算子只追加结果，不覆盖上游原始对象
2. 下游只通过对象引用消费上游产物
3. 每条最终标注都必须挂到至少一种显式证据上

## Data Lineage

当前系统的数据血缘关系如下：

```text
video_id
  -> segment_id
    -> sample_id
      -> text_signal_id
      -> region_id
      -> event_id
        -> annotation_id
          -> quality_id
```

这条血缘链意味着：

- 标注可以回溯到时间范围
- 标注可以回溯到样本帧
- 标注可以回溯到文本、区域或时间事件证据
- 裁决结果可以明确指出保留或拒绝原因

## Preset Architecture

### Lite

```text
A1 -> A2 -> A3 -> A6 -> A9 -> A10
```

适合：

- 快速打底
- 短视频批处理
- 低算力环境

### Balanced

```text
A1 -> A2 -> A3 + A4 -> A5 -> A6 + A7 + A8 -> A9 -> A10
```

适合：

- 通用网页混合视频
- 默认系统入口
- 对外展示时的主方案

### Heavy

```text
A1 -> A2(strict) -> A4 -> A5 -> A6 + A7 + A8 -> A9 -> A10(strict)
```

适合：

- 长视频
- 高价值样本构建
- 时间和空间对齐要求高的链路

## Recommended Reading Path

建议按下面顺序阅读：

1. [高自由度视频算子系统总览](高自由度视频算子系统总览.md)
2. [Architecture](Architecture.md)
3. [统一中间态与数据流协议](统一中间态与数据流协议.md)
4. A1、A3、A4、A9、A10
5. 其余算子与文献映射

## Scope

- 本页只说明系统结构，不重复单算子参数细节
- 基础设施层如调度器、缓存、对象存储不在当前页面范围内
- 详细字段定义请看 [统一中间态与数据流协议](统一中间态与数据流协议.md)
