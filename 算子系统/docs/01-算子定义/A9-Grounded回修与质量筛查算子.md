# Grounded回修与质量筛查算子（A9）技术文档

## 1. 在系统中的定位
Grounded回修与质量筛查算子是当前系统的最终出口。它负责把 `A4 / A5 / A6` 回看的证据重新组织为可提交结果，并对草案或外部问题对应的答案执行 grounded 回修、严格审查与最终筛查。

在当前落地版中，A9 内部承担四个连续动作：

1. 证据摘要
2. 答案回修
3. 严格审查
4. 质量筛查

因此，A9 不再只是“给 QA 打分”，而是整条后验闭环真正完成落地的地方。

## 2. 文献依赖等级

- 文献依赖等级：`P2 论文原生`
- 最新支撑强度：`很强`

### 2.1 文献锚点
- Pinpointing Trigger Moment for Grounded Video QA
- Can I Trust Your Answer? Visually Grounded Video Question Answering
- LongViTU
- VDC-Agent
- MVQA-68K
- Omni-Judge

### 2.2 从文献保留了什么
- grounded QA 不能停留在“先生成一个答案”；它需要回到证据侧做核验或重写。
- 高质量流程需要把 unsupported claim 删除、替换或拒绝，而不是只输出一个总分。
- 最终保留决策应建立在 claim-level coverage、证据冲突和错误原因上。

## 3. 子模式定义

### 3.1 EVIDENCE_SUMMARY
把 A4/A5/A6 返回的时序、空间、文本证据压缩成可直接支撑答案的 evidence summary。

### 3.2 ANSWER_REVISION
依据 evidence summary，对 `answer_draft` 或外部问题的候选答案做 grounded 改写。

### 3.3 STRICT_AUDIT
逐条检查 claim 是否真的被证据覆盖，并显式标记 unsupported / contradictory / ambiguous 项。

### 3.4 FILTER_GATE
综合审查结果，决定保留、拒绝、回退重试或降级为 caption-only 样本。

## 4. 输入规范
消费 `query_bundles[]`、`temporal_events[]`、`regions[]`、`text_signals[]`，并可回读 `draft_units[]`。

### 4.1 必需输入
- `query_bundles[].bundle_id`
- 至少一种证据分支结果：
  - `temporal_events[]`
  - `regions[]`
  - `text_signals[]`

### 4.2 可选输入
- `draft_units[].answer_draft`
- `draft_units[].claim_slots`
- `config.audit_mode`
- `config.score_threshold`
- `config.max_candidates_keep`
- `config.allow_partial_accept`
- `config.revision_policy`

## 5. 输出规范
A9 同时写入：

- `qa_pairs[]`
- `verification[]`

`qa_pairs[]` 推荐至少包含：

- `qa_id`
- `source_bundle_id`
- `question`
- `answer`
- `evidence_summary`
- `evidence_refs`
- `unsupported_claim_ids`
- `status`

`verification[]` 推荐至少包含：

- `verification_id`
- `target_qa_id`
- `claim_coverage`
- `contradiction_flags`
- `scores.factuality`
- `scores.temporal_consistency`
- `scores.spatial_grounding`
- `scores.text_visual_alignment`
- `revision_action`
- `audit_decision`
- `final_decision`
- `reason`

推荐的 `verification` 结构如下：

```json
{
  "verification_id": "ver_0003",
  "target_qa_id": "qa_0003",
  "claim_coverage": {
    "supported_claim_ids": ["claim_01", "claim_02"],
    "unsupported_claim_ids": [],
    "ambiguous_claim_ids": []
  },
  "contradiction_flags": [],
  "scores": {
    "factuality": 0.95,
    "temporal_consistency": 0.96,
    "spatial_grounding": 0.82,
    "text_visual_alignment": 0.94
  },
  "revision_action": "replace_answer_with_grounded_revision",
  "audit_decision": "pass",
  "final_decision": "accepted",
  "reason": "All required claims are supported by temporal and textual evidence."
}
```

## 6. 关键参数

| 参数 | 作用 |
|---|---|
| `audit_mode` | 控制审查严格度 |
| `score_threshold` | 最终保留阈值 |
| `max_candidates_keep` | 每个 bundle 最多保留候选数 |
| `allow_partial_accept` | 是否允许部分 claim 被删除后保留 |
| `revision_policy` | 答案回修策略 |

## 7. 与上下游的绑定关系
- 上游：A8 提供 query bundles；A4/A5/A6 提供显式证据
- 上游补充：A7 提供 draft 与 claim slots，供回修与审查阶段回读
- 下游：无视频算子下游。A9 输出最终 QA 与筛查记录，是系统出站口

## 8. 典型失败模式
- 证据摘要写得很漂亮，但没有和 claim slots 一一对齐
- 只修答案流畅性，不删除 unsupported claim
- 审查阶段只打总分，不给出拒绝原因
- 有文本证据和视觉证据冲突时，没有显式触发拒答或回退

## 9. 推荐使用场景
- 当前默认主链路的最终落地节点
- 需要从草案过渡到 grounded 成品 QA 的场景
- 需要显式保留“回修前后差异”和“拒绝原因”的数据构建流程
