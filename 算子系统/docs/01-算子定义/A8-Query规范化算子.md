# Query规范化算子（A8）技术文档

## 1. 在系统中的定位
Query规范化算子位于默认主链路的中枢位置。它负责把 A7 输出的自然语言草案，或者外部直接给定的问题，改写成可供 `A4 / A5 / A6` 消费的结构化 query bundles。

它解决的不是“要不要问这个问题”，而是“这个问题该怎样被拆成可执行的 temporal / spatial / textual grounding 指令”。

当前系统默认把 A8 视为：

- 路线一中的 `draft -> grounded query` 转换器
- 路线二中的 `external question -> grounded query` 入口

因此，A8 是后半段 grounding 链真正开始之前的规范化与预算控制节点。

## 2. 文献依赖等级

- 文献依赖等级：`P1 论文拆解`
- 最新支撑强度：`中`

### 2.1 文献锚点
- Video-in-the-Loop
- Can I Trust Your Answer? Visually Grounded Video Question Answering
- Think with Grounding
- LeAdQA
- VDC-Agent

### 2.2 从文献保留了什么
- question 或 draft 不能原样直接送入 grounding；通常需要改写、拆分和约束。
- 长视频 grounding 常常先做 temporal query，再决定是否触发更贵的 spatial / textual 分支。
- query rewrite 本身往往隐含在 prompt decomposition、retrieval instruction 或 agent routing 中，虽然不总被显式单独命名。

## 3. 子模式定义

### 3.1 DRAFT_TO_QUERY
把 A7 产生的 `question_draft + claim_slots` 改写成结构化 grounding query。

这是默认主链路的推荐模式。

### 3.2 EXTERNAL_QUESTION
直接消费外部给定问题，不经过 A7。

这是路线二的标准入口模式。

### 3.3 MULTI_CLAIM_SPLIT
把一个复合问题拆成多个可局部检索的 claim query，并定义它们之间的组合关系。

### 3.4 BUDGET_ROUTER
在 query 规范化的同时，决定各证据分支是否触发，以及优先级如何分配。

## 4. 输入规范
消费 `draft_units[]`，或直接消费外部问题对象。

### 4.1 必需输入
以下两类输入至少满足一类：

- `draft_units[].draft_id`
- `draft_units[].question_draft`
- `draft_units[].claim_slots`

或

- `external_question.question`

### 4.2 可选输入
- `draft_units[].answer_contract`
- `draft_units[].budget_hint`
- `draft_units[].uncertainty_points`
- `config.query_mode`
- `config.temporal_first`
- `config.max_claims_per_bundle`
- `config.enable_text_branch`
- `config.enable_spatial_branch`

## 5. 输出规范
写入 `query_bundles[]`。

每个 `query_bundle` 至少应包含：

- `bundle_id`
- `source_draft_id`
- `normalized_question`
- `normalized_claims`
- `temporal_query`
- `spatial_query`
- `text_query`
- `branch_policy`
- `budget_profile`
- `must_support_claim_ids`
- `status`

推荐补充字段：

- `fallback_policy`
- `answer_contract`
- `trigger_reason`
- `priority_score`

推荐结构如下：

```json
{
  "bundle_id": "qb_0003",
  "source_draft_id": "draft_0003",
  "normalized_question": "教师在切到目录页之后是否开始讲第一节？",
  "normalized_claims": [
    {
      "claim_id": "claim_01",
      "query_text": "Locate the moment when the slide switches to the agenda page."
    },
    {
      "claim_id": "claim_02",
      "query_text": "Locate the moment when the teacher starts section one after the agenda page."
    }
  ],
  "temporal_query": {
    "strategy": "temporal_first",
    "target_events": ["slide switch", "start section one"]
  },
  "spatial_query": {
    "enabled": false,
    "target_regions": []
  },
  "text_query": {
    "enabled": true,
    "keywords": ["目录", "第一节"]
  },
  "branch_policy": {
    "run_a4": true,
    "run_a5": false,
    "run_a6": true
  },
  "budget_profile": {
    "temporal_budget": "high",
    "spatial_budget": "off",
    "text_budget": "medium"
  },
  "must_support_claim_ids": ["claim_02"],
  "status": "active"
}
```

## 6. 关键参数

| 参数 | 作用 |
|---|---|
| `query_mode` | 指定从草案还是外部问题生成 query |
| `temporal_first` | 是否强制先走 A4 缩小时序范围 |
| `max_claims_per_bundle` | 单个 bundle 最多保留多少 claim |
| `enable_text_branch` | 是否启用 A6 文本辅证分支 |
| `enable_spatial_branch` | 是否启用 A5 空间分支 |

## 7. 与上下游的绑定关系
- 上游：A7 草案生成算子，或外部 Question 输入
- 下游：A4 默认作为第一触发分支；A5 和 A6 通常在 A4 缩小时序范围后按需触发
- 下游：A9 会检查 `must_support_claim_ids` 是否真的被证据覆盖

## 8. 典型失败模式
- 过度改写问题，导致原始语义丢失
- 没把复合问题拆开，导致 A4/A5/A6 都只能拿到模糊 query
- 预算路由过激，错误关闭了关键证据分支
- 没把 `answer_contract` 一起传下去，导致后续回修阶段答案粒度漂移

## 9. 推荐使用场景
- 路线一中的 post-hoc grounding 主链路
- 路线二中的 external question grounding 主链路
- 需要显式区分 temporal / spatial / textual 分支预算时
