# QA生成算子（A8）技术文档

## 1. 在系统中的定位
QA生成算子负责把 A7 产出的题目蓝图变成可训练、可筛选、可追溯的问答候选。它是整条链路中最直接面向数据产出的模块。

## 2. 文献依赖等级

- 文献依赖等级：`P2 论文原生`
- 最新支撑强度：`很强`

### 2.1 文献锚点
- LongViTU
- VDC-Agent
- Video-ChatGPT
- VideoRefer Suite
- TimeChat-Captioner

### 2.2 从文献保留了什么
- QA 生成必须显式依赖证据，而不是只依赖全局视频印象。
- 近期数据构建工作越来越强调 grounded QA，而不是泛化 caption。
- 自动生成结果必须为后续核验保留问题计划和证据引用。

## 3. 子模式定义

### 3.1 SINGLE_TURN_QA
生成单轮开放式问答。

### 3.2 MULTIPLE_CHOICE_QA
生成带干扰项的选择题。

### 3.3 TEMPORAL_QA
生成围绕时刻、顺序和变化的问题。

### 3.4 SPATIAL_QA
生成围绕对象、区域和局部细节的问题。

## 4. 输入规范
消费 `question_plans[]` 及其关联证据对象。

### 4.1 必需输入
- `question_plans[].plan_id`
- `question_plans[].evidence_refs`

### 4.2 可选输入
- `config.max_candidates_per_plan`
- `config.answer_style`
- `config.max_answer_length`

## 5. 输出规范
写入 `qa_pairs[]`，每条候选至少包含：

- `qa_id`
- `plan_id`
- `question`
- `answer`
- `evidence_refs`
- `status`

推荐附加字段：

- `candidate_rank`
- `difficulty`
- `distractors`
- `language`

## 6. 关键参数

| 参数 | 作用 |
|---|---|
| `max_candidates_per_plan` | 每个问题计划生成多少候选 |
| `answer_style` | 控制答案风格 |
| `max_answer_length` | 控制答案长度 |

## 7. 与上下游的绑定关系
- 上游：A7 提供问题计划，A4/A5/A6 提供可回放证据
- 下游：A9 对候选 QA 做 grounded 核验与回修

## 8. 典型失败模式
- 问题合理但答案没有真正绑定证据
- 多路证据冲突时直接拼接，导致逻辑错误
- 问题粒度和答案粒度不匹配

## 9. 推荐使用场景
- 自动构建 grounded QA 数据
- 需要控制题型分布的数据集构建
- 需要展示从计划到生成的完整链路
