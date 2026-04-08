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
    grid-template-columns: repeat(4, minmax(0, 1fr));
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
    min-width: 2.7rem;
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
    面向视频数据构造的高自由度算子系统。当前版本围绕 10 个原子算子组织，
    默认主链路收敛为 `A1 -> A2 -> A3 -> A4 -> A5/A6 -> A7 -> A8 -> A9 -> A10`，
    覆盖从片段划分、结构骨架构建、Q/A/E 共同合成，到最终回修与质量筛查的完整闭环。
  </p>
</div>

<div class="landing-meta">
  <div class="landing-chip">
    <strong>10</strong>
    <span>原子算子</span>
  </div>
  <div class="landing-chip">
    <strong>4</strong>
    <span>总览页面</span>
  </div>
  <div class="landing-chip">
    <strong>3</strong>
    <span>文献入口</span>
  </div>
</div>

## 目标

- 给出一套面向数据构造、可复用、可扩展的视频算子系统设计。
- 明确结构骨架先行、Q/A/E 共同合成、最终审查出站的默认链路。
- 为单算子实现、预设管线和文献支撑提供清晰入口。

## 主要入口

<div class="entry-grid">
  <section class="entry-card">
    <div class="entry-card__header">
      <span class="card-title-with-icon"><strong>系统总览</strong></span>
    </div>
    <p class="entry-card__desc">先理解 10 个算子的整体设计、默认主链路和统一协议。</p>
    <div class="entry-card__links">
      <a href="00-总览/高自由度视频算子系统总览/">高自由度视频算子系统总览</a>
      <a href="00-总览/Architecture/">Architecture</a>
      <a href="00-总览/Grounded-QA-路径对比/">Grounded QA 路径对比</a>
      <a href="00-总览/统一中间态与数据流协议/">统一中间态与数据流协议</a>
    </div>
  </section>

  <section class="entry-card">
    <div class="entry-card__header">
      <span class="card-title-with-icon"><strong>算子定义</strong></span>
    </div>
    <p class="entry-card__desc">查看 A1 到 A10 的接口、实现边界，以及“结构骨架优先”的新命名体系。</p>
    <div class="entry-card__links">
      <a href="01-算子定义/A1-划分算子/">A1-划分算子</a>
      <a href="01-算子定义/A4-粗Caption算子/">A4-粗Caption算子</a>
      <a href="01-算子定义/A7-结构骨架构建算子/">A7-结构骨架构建算子</a>
      <a href="01-算子定义/A8-QAE共同合成算子/">A8-QAE共同合成算子</a>
    </div>
  </section>

  <section class="entry-card">
    <div class="entry-card__header">
      <span class="card-title-with-icon"><strong>预设与文献</strong></span>
    </div>
    <p class="entry-card__desc">查看结构骨架式数据构造路线与代表论文之间的对照关系。</p>
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
    <h3>基础入口</h3>
    <p class="operator-group__desc">负责把原视频切成稳定可消费的上下文单元，并完成统一采样。</p>
    <div class="operator-group__chips">
      <a class="operator-chip" href="01-算子定义/A1-划分算子/"><span>A1</span>划分</a>
      <a class="operator-chip" href="01-算子定义/A2-上下文编排算子/"><span>A2</span>编排</a>
      <a class="operator-chip" href="01-算子定义/A3-采样算子/"><span>A3</span>采样</a>
    </div>
  </section>

  <section class="operator-group">
    <p class="operator-group__eyebrow">Scaffold</p>
    <h3>结构骨架</h3>
    <p class="operator-group__desc">负责粗描述、时序结构、文本辅证和骨架单元构建，是数据构造的主干。</p>
    <div class="operator-group__chips">
      <a class="operator-chip" href="01-算子定义/A4-粗Caption算子/"><span>A4</span>粗Caption</a>
      <a class="operator-chip" href="01-算子定义/A5-时序结构抽取算子/"><span>A5</span>时序结构</a>
      <a class="operator-chip" href="01-算子定义/A6-文本辅证抽取算子/"><span>A6</span>文本辅证</a>
      <a class="operator-chip" href="01-算子定义/A7-结构骨架构建算子/"><span>A7</span>结构骨架</a>
    </div>
  </section>

  <section class="operator-group">
    <p class="operator-group__eyebrow">Synthesis</p>
    <h3>共同合成</h3>
    <p class="operator-group__desc">负责在结构骨架约束下共同生成 Question、Answer 和 Evidence，并做一致性回修。</p>
    <div class="operator-group__chips">
      <a class="operator-chip" href="01-算子定义/A8-QAE共同合成算子/"><span>A8</span>QAE合成</a>
      <a class="operator-chip" href="01-算子定义/A9-一致性回修算子/"><span>A9</span>一致性回修</a>
    </div>
  </section>

  <section class="operator-group">
    <p class="operator-group__eyebrow">Audit</p>
    <h3>最终出站</h3>
    <p class="operator-group__desc">负责按规则、评分和样本价值做质量筛查，是系统的最终出口。</p>
    <div class="operator-group__chips">
      <a class="operator-chip" href="01-算子定义/A10-质量筛查算子/"><span>A10</span>质量筛查</a>
    </div>
  </section>
</div>

## 建议阅读顺序

1. 先读 [高自由度视频算子系统总览](00-总览/高自由度视频算子系统总览.md)，了解 10 个算子的整体设计和默认主链路。
2. 再读 [Architecture](00-总览/Architecture.md)，理解系统层次、数据流和血缘关系。
3. 然后读 [Grounded QA 路径对比](00-总览/Grounded-QA-路径对比.md)，理解“结构骨架优先”和其他 grounded QA 路线的区别。
4. 再读 [统一中间态与数据流协议](00-总览/统一中间态与数据流协议.md)，确认 `coarse_captions`、`temporal_structures`、`scaffold_units`、`qae_triplets` 等统一对象。
5. 最后按需进入具体算子页面、预设页面和文献支撑页面。
