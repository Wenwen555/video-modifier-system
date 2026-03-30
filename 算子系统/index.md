# 视频算子系统

视频算子系统是一套面向视频增强与标注构建的模块化处理框架。当前版本围绕 10 个原子算子组织，覆盖从片段划分、采样压缩、证据提取到标注生成与质量裁决的完整链路。

本网站用于说明系统结构、数据流、单算子接口、预设管线和文献支撑关系。文档组织方式参考常见工程文档站点，而不是研究笔记或汇报稿。

## Summary

### System goals
- 提供一套可复用的视频增强处理骨架，而不是单次实验脚本。
- 用统一中间态连接不同算子，减少重复实现和链路耦合。
- 同时支持轻量基线、平衡方案和高质量增强方案。
- 保持和近期 Video-LLM / LVLM 文献的能力对齐。

### What this site contains
- 系统总览和统一协议
- A1 到 A10 的单算子定义
- 预设管线与典型组合方式
- 算子与文献的映射关系

## Architecture

当前版本的系统分为两层。

### Base system layer
这一层负责建立稳定入口、控制预算和组织基础证据。

- A1 `Partition`: 将原视频切成可处理片段
- A2 `Segment Cleaning`: 清理低质量或低价值片段
- A3 `Sampling`: 生成低成本基础样本
- A5 `Deduplication`: 压缩冗余样本
- A6 `Text Extraction`: 汇聚 OCR、字幕和 ASR 文本证据

### Literature-driven layer
这一层负责提供当前文献最强调的高价值能力。

- A4 `Adaptive Sampling`: 保留关键时间点和高信息密度样本
- A7 `Spatial Focus`: 生成对象级或区域级证据
- A8 `Temporal Localization and Change Summary`: 显式建模时间边界与变化事件
- A9 `Annotation Generation`: 生成 caption、QA 和 summary
- A10 `Selection and Quality Judgement`: 选择高质量候选并过滤低质量结果

## Data Flow

系统主数据流固定为：

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

其中有三点需要注意：

1. `A3` 和 `A4` 可以二选一，也可以并行运行。
2. `A6`、`A7`、`A8` 共享 `samples`，分别产出文本、空间和时间维度证据。
3. `A9` 只消费中间态中的结构化证据，不直接绕过协议读取原视频生成结果。

## Intermediate Representation

所有算子共享统一的 `VideoPacket` 中间态。当前版本的顶层字段如下：

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

这意味着：

- 划分结果、采样结果和标注结果都处在同一条可追溯链路里
- 下游算子只通过对象引用消费上游产物
- 所有最终标注都可以追溯到片段、帧、局部区域或时间事件

更多细节见 [统一中间态与数据流协议](00-总览/统一中间态与数据流协议.md)。

## Operators At A Glance

| Operator | Name | Input focus | Output focus | Role |
|---|---|---|---|---|
| A1 | Partition | raw video | segments | 定义处理边界 |
| A2 | Segment Cleaning | segments | filtered segments | 清理无效片段 |
| A3 | Sampling | segments | samples | 低成本基础采样 |
| A4 | Adaptive Sampling | segments | high-value samples | 内容感知采样 |
| A5 | Deduplication | samples | compressed samples | 压缩冗余输入 |
| A6 | Text Extraction | samples, subtitles, ASR | text signals | 汇聚文本证据 |
| A7 | Spatial Focus | samples | regions | 生成局部视觉证据 |
| A8 | Temporal Localization and Change Summary | samples, regions, text signals | temporal events | 建模关键时间点 |
| A9 | Annotation Generation | structured evidence | annotations | 生成训练标注 |
| A10 | Selection and Quality Judgement | annotations, evidence | quality decisions | 保留高质量样本 |

## Presets

### Lite
用于快速打底和低成本批处理。

```text
A1 -> A2 -> A3 -> A6 -> A9 -> A10
```

### Balanced
作为默认方案，兼顾基础能力和高质量增强。

```text
A1 -> A2 -> A3 + A4 -> A5 -> A6 + A7 + A8 -> A9 -> A10
```

### Heavy
面向长视频和高价值样本生产，强调关键时刻和局部证据。

```text
A1 -> A2(strict) -> A4 -> A5 -> A6 + A7 + A8 -> A9 -> A10(strict)
```

更多细节见 [预设管线与文献对照](02-预设管线/预设管线与文献对照.md)。

## Documentation Map

### Core docs
- [高自由度视频算子系统总览](00-总览/高自由度视频算子系统总览.md)
- [统一中间态与数据流协议](00-总览/统一中间态与数据流协议.md)

### Operator reference
- [A1-划分算子](01-算子定义/A1-划分算子.md)
- [A2-片段清洗算子](01-算子定义/A2-片段清洗算子.md)
- [A3-采样算子](01-算子定义/A3-采样算子.md)
- [A4-自适应采样算子](01-算子定义/A4-自适应采样算子.md)
- [A5-去重算子](01-算子定义/A5-去重算子.md)
- [A6-文本抽取算子](01-算子定义/A6-文本抽取算子.md)
- [A7-空间聚焦算子](01-算子定义/A7-空间聚焦算子.md)
- [A8-时序定位与变化摘要算子](01-算子定义/A8-时序定位与变化摘要算子.md)
- [A9-标注生成算子](01-算子定义/A9-标注生成算子.md)
- [A10-候选选择与质量裁决算子](01-算子定义/A10-候选选择与质量裁决算子.md)

### Supporting docs
- [预设管线与文献对照](02-预设管线/预设管线与文献对照.md)
- [算子-论文映射](03-文献支撑/算子-论文映射.md)
- [文献支撑与最新趋势总结](03-文献支撑/文献支撑与最新趋势总结.md)

## Reading Guide

如果你是第一次进入这个站点，建议按下面顺序阅读：

1. 先读总览，确认系统边界和 10 个算子的角色
2. 再读统一协议，理解中间态和数据流约束
3. 然后读 A1、A3、A4、A9、A10，把主链路跑通
4. 最后再看 A6、A7、A8 和文献支撑部分

## Scope

- 当前站点只覆盖 `算子系统/` 目录内容。
- 当前版本聚焦工程化和可复用性，不覆盖调度器或基础设施实现。
- 归档目录中的内容仅用于追溯，不作为正式规范文档引用。
