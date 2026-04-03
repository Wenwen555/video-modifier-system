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
该层负责建立主链路、控制预算和清理输入。

| Operator | Responsibility |
|---|---|
| A1 Partition | 将原视频切成可处理片段 |
| A2 Segment Cleaning | 过滤低质量片段和低价值片段 |
| A3 Sampling | 统一基础采样与自适应采样 |
| A4 Deduplication | 压缩冗余样本 |
| A5 Text Extraction | 汇聚 OCR、字幕和 ASR 文本证据 |

### Data-Augmentation layer
该层负责提供近期文献更强调的高价值能力。

| Operator | Responsibility |
|---|---|
| A6 Spatial Focus | 生成区域级和对象级视觉证据 |
| A7 Temporal Localization and Change Summary | 显式建模时间边界和变化事件 |
| A8 Annotation Generation | 生成 caption、QA 和 summary |
| A9 Selection and Quality Judgement | 选择高质量候选并过滤不可靠结果 |

## End-to-End Flow

主数据流如下：

```text
Raw Video
  -> A1 Partition
  -> A2 Segment Cleaning
  -> A3 Sampling
  -> A4 Deduplication
  -> A5 Text Extraction
  -> A6 Spatial Focus
  -> A7 Temporal Localization and Change Summary
  -> A8 Annotation Generation
  -> A9 Selection and Quality Judgement
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
- `A2 -> A3`
- `A3 -> A4`
- `A4 -> A5/A6/A7`
- `A5/A6/A7 -> A8`
- `A8 -> A9`

### Parallel evidence branches
- `A5` 从样本中提取文本证据
- `A6` 从样本中提取空间证据
- `A7` 从样本和局部证据中提取时间事件

这三条分支最终在 `A8` 汇合。



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

我们采用经典文献工作的主链路作为预设，具体请参考 [预设管线与文献对照](../02-预设管线/预设管线与文献对照.md)。



## Scope

- 本页只说明系统结构，不重复单算子参数细节
- 基础设施层如调度器、缓存、对象存储不在当前页面范围内
- 详细字段定义请看 [统一中间态与数据流协议](统一中间态与数据流协议.md)
