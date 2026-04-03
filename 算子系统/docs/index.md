---
hide:
  - toc
---

<style>
  .entry-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .entry-card,
  .operator-group {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.2rem;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 1.1rem;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0.96) 0%, rgba(249, 251, 255, 0.9) 100%);
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  }

  .entry-card__desc,
  .operator-group__desc {
    margin: 0;
    line-height: 1.75;
    color: rgba(15, 23, 42, 0.76);
  }

  .entry-card__links,
  .operator-group__chips {
    display: grid;
    gap: 0.65rem;
  }

  .entry-card__links a,
  .operator-chip {
    display: block;
    padding: 0.9rem 1rem;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 0.9rem;
    background: rgba(255, 255, 255, 0.92);
    text-decoration: none;
    line-height: 1.45;
    font-weight: 600;
  }

  .operator-section-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }

  .operator-group__eyebrow {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #155e75;
  }

  .operator-group h3 {
    margin: 0;
  }

  .operator-chip {
    color: inherit;
  }

  .operator-chip span {
    display: inline-block;
    min-width: 2.5rem;
    margin-right: 0.65rem;
    padding: 0.18rem 0.48rem;
    border-radius: 999px;
    background: rgba(15, 118, 110, 0.12);
    color: #0f766e;
    font-weight: 800;
    font-size: 0.8rem;
    text-align: center;
  }

  @media screen and (max-width: 76.1875em) {
    .entry-grid,
    .operator-section-grid {
      grid-template-columns: 1fr;
    }
  }
</style>

<div class="landing-hero">
  <p class="landing-overline">Video Operator System</p>
  <h1>视频算子系统</h1>
  <p class="landing-subtitle">
    面向视频增强、样本构建与标注生成的高自由度算子系统。当前版本围绕 9 个原子算子组织，
    覆盖从片段划分、采样、证据提取到标注生成与质量裁决的完整链路。
  </p>
</div>

<div class="landing-meta">
  <div class="landing-chip">
    <strong>9</strong>
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

<div class="entry-grid">
  <section class="entry-card">
    <div class="entry-card__header">
      <span class="card-title-with-icon"><span class="twemoji"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 8a4 4 0 0 0-4 4c0 1.11.45 2.11 1.17 2.83L12 22l2.83-7.17A4 4 0 0 0 16 12a4 4 0 0 0-4-4m0 2a2 2 0 0 1 2 2c0 .55-.22 1.05-.59 1.41L12 17l-1.41-3.59A1.99 1.99 0 0 1 10 12a2 2 0 0 1 2-2m8-7l-8.59 3.44L4 4l2.57 7.41L3 20l8.59-3.44L20 20l-3.44-8.59z"/></svg></span><strong>系统总览</strong></span>
    </div>
    <p class="entry-card__desc">先理解系统目标、结构分层与统一协议。</p>
    <div class="entry-card__links">
      <a href="00-总览/高自由度视频算子系统总览/">高自由度视频算子系统总览</a>
      <a href="00-总览/Architecture/">Architecture</a>
      <a href="00-总览/统一中间态与数据流协议/">统一中间态与数据流协议</a>
    </div>
  </section>

  <section class="entry-card">
    <div class="entry-card__header">
      <span class="card-title-with-icon"><span class="twemoji"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M3 17v2h6v-2zm0-12v2h10V5zm10 16v-2h8v-2h-8v-2l-4 3 4 3zm8-12V7h-2V5h-2v2H9v2h8v2h2V9zm-12 4v2H3v-2z"/></svg></span><strong>算子定义</strong></span>
    </div>
    <p class="entry-card__desc">查看 A1 到 A9 的接口、实现边界和技术文档。</p>
    <div class="entry-card__links">
      <a href="01-算子定义/A1-划分算子/">A1-划分算子</a>
      <a href="01-算子定义/A3-采样算子/">A3-采样算子（含自适应）</a>
      <a href="01-算子定义/A4-去重算子/">A4-去重算子</a>
      <a href="01-算子定义/A2-片段清洗算子/">其余算子见左侧导航</a>
    </div>
  </section>

  <section class="entry-card">
    <div class="entry-card__header">
      <span class="card-title-with-icon"><span class="twemoji"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 4H3c-1.1 0-2 .9-2 2v13a1 1 0 0 0 1.5.86C4.74 18.59 6.78 18 9 18c2.28 0 4.42.61 6.72 1.89.17.07.36.11.55.11H21c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 14h-4.18C14.37 16.75 11.9 16 9 16c-2.45 0-4.66.54-6 1.38V6h18zM9 7c-1.11 0-2.16.12-3.15.35l.46 1.66C7.17 8.79 8.07 8.68 9 8.68c2.03 0 3.94.52 5.68 1.56l.82-1.47C13.5 7.59 11.3 7 9 7m0 3c-.88 0-1.72.09-2.53.26l.46 1.67c.66-.15 1.36-.23 2.07-.23 1.56 0 3.03.4 4.38 1.19l.82-1.47C12.61 10.47 10.84 10 9 10m0 3c-.65 0-1.29.06-1.9.18l.46 1.67c.46-.1.95-.15 1.44-.15 1.09 0 2.11.28 3.06.84l.82-1.47A7.98 7.98 0 0 0 9 13"/></svg></span><strong>预设与文献</strong></span>
    </div>
    <p class="entry-card__desc">查看经典工作对照、算子映射与近期文献趋势。</p>
    <div class="entry-card__links">
      <a href="02-预设管线/预设管线与文献对照/">预设管线与文献对照</a>
      <a href="03-文献支撑/算子-论文映射/">算子-论文映射</a>
      <a href="03-文献支撑/文献支撑与最新趋势总结/">文献支撑与最新趋势总结</a>
    </div>
  </section>
</div>

## 算子索引

<div class="operator-section-grid">
  <section class="operator-group">
    <p class="operator-group__eyebrow">Foundation</p>
    <h3>基础链路</h3>
    <p class="operator-group__desc">负责建立稳定的片段入口、统一采样、去重压缩和文本证据汇聚。</p>
    <div class="operator-group__chips">
      <a class="operator-chip" href="01-算子定义/A1-划分算子/"><span>A1</span>划分</a>
      <a class="operator-chip" href="01-算子定义/A2-片段清洗算子/"><span>A2</span>片段清洗</a>
      <a class="operator-chip" href="01-算子定义/A3-采样算子/"><span>A3</span>采样</a>
      <a class="operator-chip" href="01-算子定义/A4-去重算子/"><span>A4</span>去重</a>
      <a class="operator-chip" href="01-算子定义/A5-文本抽取算子/"><span>A5</span>文本抽取</a>
    </div>
  </section>

  <section class="operator-group">
    <p class="operator-group__eyebrow">Enhancement</p>
    <h3>增强链路</h3>
    <p class="operator-group__desc">负责在有限预算内补强时序敏感性、空间证据和变化建模能力。</p>
    <div class="operator-group__chips">
      <a class="operator-chip" href="01-算子定义/A6-空间聚焦算子/"><span>A6</span>空间聚焦</a>
      <a class="operator-chip" href="01-算子定义/A7-时序定位与变化摘要算子/"><span>A7</span>时序定位与变化摘要</a>
    </div>
  </section>

  <section class="operator-group">
    <p class="operator-group__eyebrow">Generation</p>
    <h3>生成与裁决</h3>
    <p class="operator-group__desc">负责把多路证据组织成训练标注，并在最终出口做质量筛选与保留决策。</p>
    <div class="operator-group__chips">
      <a class="operator-chip" href="01-算子定义/A8-标注生成算子/"><span>A8</span>标注生成</a>
      <a class="operator-chip" href="01-算子定义/A9-候选选择与质量裁决算子/"><span>A9</span>质量裁决</a>
    </div>
  </section>
</div>

## 建议阅读顺序

1. 先读 [高自由度视频算子系统总览](00-总览/高自由度视频算子系统总览.md)，了解系统目标和 9 个算子的整体设计。
2. 再读 [Architecture](00-总览/Architecture.md)，了解系统层次、主数据流和文献驱动的预设架构。
3. 然后读 [统一中间态与数据流协议](00-总览/统一中间态与数据流协议.md)，确认统一对象结构和数据血缘约束。
4. 最后按需要进入具体算子页面、预设页面和文献支撑页面。
