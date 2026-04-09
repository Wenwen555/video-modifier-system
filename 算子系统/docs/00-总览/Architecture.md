# Architecture

本页集中说明视频算子系统的结构设计，包括系统分层、主数据流、中间态、数据血缘和预设管线关系。

## System Overview

当前版本围绕 10 个视频算子展开。此系统是“面向 `post-training / instruction tuning` 的视频数据构造系统”。

它的核心目标有四点：

- 构造高质量的 LVLM `QA / Grounded QA` 样本
- 兼容当前主要的数据构造路线
- 让最终样本可回修、可筛查、可追溯
- 让出站数据可直接服务于 instruction tuning

## Layered Architecture

系统分为四层。

### Base system layer
负责建立主链路入口、做轻量清洗与简单编排，并控制采样预算。

| Operator | Responsibility |
|---|---|
| A1 Partition | 将原视频切成可处理片段 |
| A2 Context Orchestration | `MERGE_STITCH` / `WINDOW_ATTACH` / `FILTER_HINT` |
| A3 Sampling | 统一基础采样与自适应采样 |

### Evidence and structure extraction layer
负责从视频中提取可被后续数据构造消费的证据和结构信息。

| Operator | Responsibility |
|---|---|
| A4 Multi-granular Description | 生成 frame / event / segment / context 多层描述 |
| A5 Temporal Structure Extraction | 抽取事件、时间窗和阶段关系 |
| A6 Textual Auxiliary Extraction | 汇聚 OCR、字幕和 ASR 辅证 |

### Convergence and materialization layer
负责让不同数据主线收敛到统一的骨架与 triplet 出口。

| Operator | Responsibility |
|---|---|
| A7 Structural Scaffold Construction | 把描述、时序结构、文本辅证、证据单元或 QA 草案组织成 narration chunk / event tree / action graph / query scaffold |
| A8 Joint QAE Synthesis | 在骨架或草案约束下联合生成或装配 Question、Answer 和 Evidence |

### Revision and audit layer
负责回修与最终出站控制。

| Operator | Responsibility |
|---|---|
| A9 Consistency Revision | 对三元组做字段对齐、冲突消解和局部修订 |
| A10 Quality Screening | 执行规则过滤、评分排序、分层和保留决策 |

## End-to-End Flow

### Default post-training route
默认主数据流如下：

```text
Raw Video
  -> A1 Partition
  -> A2 Context Orchestration
  -> A3 Sampling
  -> A4 Multi-granular Description
  -> A5 Temporal Structure Extraction
  -> A6 Textual Auxiliary Extraction
  -> A7 Structural Scaffold Construction
  -> A8 Joint QAE Synthesis
  -> A9 Consistency Revision
  -> A10 Quality Screening
```

这是当前推荐的 `structure-first` 数据构造主链，也是系统默认的 post-training preset。

### Compatible route 1: narration / caption-first

```text
Raw Video
  -> A1 / A2 / A3
  -> A6 Textual Auxiliary Extraction
  -> A4 / A5 (optional visual and temporal enrichment)
  -> evidence normalization
  -> A7 narration scaffold construction
  -> A8 Joint QAE Synthesis
  -> A9
  -> A10
```

这条路线更适合 instruction videos、带 ASR / subtitle 的视频，以及弱监督大规模 QA 构造。

### Compatible route 2: QA-first / post-hoc grounding

```text
External QA Drafts + Raw Video
  -> A1 / A2 / A3
  -> A4 / A5 / A6 evidence extraction
  -> evidence normalization
  -> A7 query scaffold construction
  -> A8 draft binding / answer fill
  -> A9
  -> A10
```

这条路线更适合：

- 人工高质量 QA 转 grounded QA
- benchmark QA 补证据
- 先写问题再做 temporal / spatial evidence 绑定的链路

### Unified output view
更细一点的统一结构可以写成：

```text
video
  -> segments
  -> lightly orchestrated segments
  -> samples
  -> description units / temporal structures / text signals
  -> evidence units
  -> scaffold units
  -> qa drafts (optional ingress)
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
- `A4` 提供多粒度语义描述底座
- `A5` 提供事件和时间结构
- `A6` 提供文本辅证

这三条分支最终会先被规约为可回挂的证据或结构节点，再在 `A7` 汇合，构成可被 `A8` 物化消费的结构骨架。

同时需要明确一条边界：

- `A2` 只处理低成本、局部、确定性强的清洗与编排
- 其实现范围只保留 `MERGE_STITCH`、`WINDOW_ATTACH`、`FILTER_HINT`
- 事件级组织和高语义骨架构造由 `A4 / A5 / A7` 负责

### Route convergence rule
对三条主要数据主线，当前系统都要求在 A7/A8 之前完成中间态规约：

- narration-first 路线要规约为 `evidence_units + scaffold_units`
- structure-first 路线要规约为 `scaffold_units`
- QA-first 路线要规约为 `qa_drafts + evidence_units + scaffold_units`

## Design Principles

1. 算子只追加结果，不覆盖上游原始对象。
2. triplet 物化必须依赖规约后的中间层，而不是直接对原视频自由生成。
3. 最终数据必须经过回修与筛查。
4. 数据血缘必须能回挂到片段、采样、结构节点、QA 草案和原始辅证。
5. 入口层不前置高语义结构判断，`A2` 不承担层级 pack 或事件语义归并。
6. 默认优化目标是高质量 LVLM post-training 数据，而不是任意形式的问答输出。

## Data Lineage

当前系统的数据血缘关系如下：

```text
video_id
  -> segment_id
    -> sample_id
      -> description_id
      -> temporal_unit_id
      -> text_signal_id
        -> evidence_unit_id
          -> scaffold_id
            -> triplet_id
              -> revision_id
                -> quality_id

external_qa_source
  -> qa_draft_id
    -> scaffold_id
      -> triplet_id
```

这条血缘链意味着：

- 最终 Q/A/E 可回溯到结构骨架或 QA 草案
- 骨架可回溯到多粒度描述、时间结构、文本辅证和规约后的证据单元
- 最终筛查结果可以明确指出保留或拒绝原因

## Preset Architecture

我们采用经典文献中的 `structure-first` 数据构造流程作为当前默认预设，同时把 `narration-first` 与 `QA-first / post-hoc grounding` 正式纳入统一协议。具体请参考 [预设管线与文献对照](../02-预设管线/预设管线与文献对照.md)。

## Scope

- 本页只说明系统结构，不重复单算子参数细节
- 基础设施层如调度器、缓存、对象存储不在当前页面范围内
- 详细字段定义请看 [统一中间态与数据流协议](统一中间态与数据流协议.md)
