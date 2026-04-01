---
hide:
  - toc
---

<div class="landing-hero">
  <p class="landing-overline">Video Operator System</p>
  <h1>视频算子系统</h1>
  <p class="landing-subtitle">
    面向视频增强与标注构建的高自由度算子系统。
    当前版本围绕 10 个原子算子组织，覆盖从片段划分、采样、证据提取到标注生成与质量裁决的完整链路。
  </p>
</div>

<div class="landing-meta">
  <div class="landing-chip">
    <strong>10</strong>
    <span>原子算子</span>
  </div>
  <div class="landing-chip">
    <strong>3</strong>
    <span>总览页面</span>
  </div>
  <div class="landing-chip">
    <strong>3</strong>
    <span>文献入口</span>
  </div>
</div>

## 目标

- 给出一套可复用、可扩展的视频算子系统设计，而不是一次性实验脚本。
- 明确系统结构、算子边界、统一协议和上下游关系。
- 为单算子实现、预设管线和文献支撑提供清晰入口。

## 主要入口

<div class="grid cards" markdown>

- :material-compass-outline:{ .lg .middle } __系统总览__

  ---

  先理解系统目标、结构分层与统一协议。

  - [高自由度视频算子系统总览](00-总览/高自由度视频算子系统总览.md)
  - [Architecture](00-总览/Architecture.md)
  - [统一中间态与数据流协议](00-总览/统一中间态与数据流协议.md)

- :material-tune-variant:{ .lg .middle } __算子定义__

  ---

  查看 A1 到 A10 的接口、实现边界和技术文档。

  - [A1-划分算子](01-算子定义/A1-划分算子.md)
  - [A3-采样算子](01-算子定义/A3-采样算子.md)
  - [A4-自适应采样算子](01-算子定义/A4-自适应采样算子.md)
  - [其余算子见左侧导航](01-算子定义/A2-片段清洗算子.md)

- :material-book-open-page-variant-outline:{ .lg .middle } __预设与文献__

  ---

  查看经典工作对照、算子映射与近期文献趋势。

  - [预设管线与文献对照](02-预设管线/预设管线与文献对照.md)
  - [算子-论文映射](03-文献支撑/算子-论文映射.md)
  - [文献支撑与最新趋势总结](03-文献支撑/文献支撑与最新趋势总结.md)

</div>

## 算子索引

<div class="operator-chip-grid">
  <a class="operator-chip" href="01-算子定义/A1-划分算子.md"><span>A1</span>划分</a>
  <a class="operator-chip" href="01-算子定义/A2-片段清洗算子.md"><span>A2</span>片段清洗</a>
  <a class="operator-chip" href="01-算子定义/A3-采样算子.md"><span>A3</span>采样</a>
  <a class="operator-chip" href="01-算子定义/A4-自适应采样算子.md"><span>A4</span>自适应采样</a>
  <a class="operator-chip" href="01-算子定义/A5-去重算子.md"><span>A5</span>去重</a>
  <a class="operator-chip" href="01-算子定义/A6-文本抽取算子.md"><span>A6</span>文本抽取</a>
  <a class="operator-chip" href="01-算子定义/A7-空间聚焦算子.md"><span>A7</span>空间聚焦</a>
  <a class="operator-chip" href="01-算子定义/A8-时序定位与变化摘要算子.md"><span>A8</span>时序定位与变化摘要</a>
  <a class="operator-chip" href="01-算子定义/A9-标注生成算子.md"><span>A9</span>标注生成</a>
  <a class="operator-chip" href="01-算子定义/A10-候选选择与质量裁决算子.md"><span>A10</span>质量裁决</a>
</div>

## 建议阅读顺序

1. 先读 [高自由度视频算子系统总览](00-总览/高自由度视频算子系统总览.md)，了解系统目标和 10 个算子的整体设计。
2. 再读 [Architecture](00-总览/Architecture.md)，了解系统层次、主数据流和文献驱动的预设架构。
3. 然后读 [统一中间态与数据流协议](00-总览/统一中间态与数据流协议.md)，确认统一对象结构和数据血缘约束。
4. 最后按需要进入具体算子页面、预设页面和文献支撑页面。
