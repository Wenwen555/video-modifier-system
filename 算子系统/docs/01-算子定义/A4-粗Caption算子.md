# 粗Caption算子（A4）技术文档

## 1. 在系统中的定位
A4 负责在 `A2 + A3` 给出的上下文单元和采样结果上生成片段级或上下文级粗描述。

它不是最终标注，也不是细粒度 dense caption，而是结构骨架的语义底座。当前默认链路中，A4 的输出主要服务于：

- A5 时序结构抽取
- A7 结构骨架构建
- A8 Q/A/E 共同合成

## 2. 文献依赖等级

- 文献依赖等级：`P1 论文拆解`
- 最新支撑强度：`中`

### 2.1 文献锚点
- TimeChat-Captioner
- Shot2Story
- LongViTU

### 2.2 从文献保留了什么
- 长视频数据构造通常先要有片段级语义描述
- 这些描述是树结构、时间结构和问答生成的基础素材

## 3. 子模式定义

### 3.1 SEGMENT_CAPTION
为单个 segment 生成粗描述。

### 3.2 CONTEXT_CAPTION
结合 A2 的 pack 或 context window 生成上下文级粗描述。

### 3.3 MULTI_SENTENCE_SUMMARY
输出多句描述，为后续骨架构建保留更丰富语义。

## 4. 输入规范

### 4.1 必需输入
- `segments[].segment_id`
- `samples[].sample_id`

### 4.2 可选输入
- `segments[].context_group_id`
- `config.caption_scope`
- `config.max_sentences`

## 5. 输出规范
写入 `coarse_captions[]`，推荐字段：

- `caption_id`
- `segment_id`
- `caption_text`
- `caption_scope`
- `anchor_sample_ids`
- `summary_tags`

## 6. 与上下游的绑定关系
- 上游：A2、A3
- 下游：A5、A7、A8

## 7. 典型失败模式
- 描述过泛，无法支持后续结构抽取
- 只写单帧内容，丢失片段级动态语义
- 对同一上下文单元生成彼此冲突的描述

## 8. 推荐使用场景
- 结构骨架式数据构造默认开启
- 需要从 caption/tree/graph 派生后续问答样本时
