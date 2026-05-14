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
    面向 AscendDataForge 当前实现的视频算子文档。A1-A10 对应已注册的
    `video_partition`、`video_sampling`、`video_qae_materialization` 等操作，
    覆盖从片段划分、采样、描述、时序/文本证据、结构骨架、QAE 物化，到回修与质量筛查的完整字段链路。
  </p>
</div>

<div class="landing-meta">
  <div class="landing-chip">
    <strong>10</strong>
    <span>A 编号算子</span>
  </div>
  <div class="landing-chip">
    <strong>10+3</strong>
    <span>主链/辅助算子</span>
  </div>
  <div class="landing-chip">
    <strong>1</strong>
    <span>源码对齐口径</span>
  </div>
</div>

## 目标

- 给出和当前源码一致的视频算子接口、字段、参数和模式。
- 区分“已实现能力”和“可扩展设计方向”。
- 为主链路、预设管线和文献映射提供清晰入口。

## 主要入口

<div class="entry-grid">
  <section class="entry-card">
    <div class="entry-card__header">
      <span class="card-title-with-icon"><strong>系统总览</strong></span>
    </div>
    <p class="entry-card__desc">先理解 A1-A10 的真实注册名、源码位置、字段流和实现边界。</p>
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
    <p class="entry-card__desc">查看每个算子的实现类、输入输出、参数默认值、支持模式和错误边界。</p>
    <div class="entry-card__links">
      <a href="01-算子定义/A1-划分算子/">A1-划分算子</a>
      <a href="01-算子定义/A4-多粒度描述算子/">A4-多粒度描述算子</a>
      <a href="01-算子定义/A7-结构骨架构建算子/">A7-结构骨架构建算子</a>
      <a href="01-算子定义/A8-QAE共同合成算子/">A8-QAE共同合成算子</a>
    </div>
  </section>

  <section class="entry-card">
    <div class="entry-card__header">
      <span class="card-title-with-icon"><strong>预设与文献</strong></span>
    </div>
    <p class="entry-card__desc">查看当前实现可以落地的管线组合，以及它们与代表论文流程的关系。</p>
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
      <p class="operator-group__desc">A1-A3 负责从视频路径生成 `segments` 和 `samples`。</p>
      <div class="operator-group__chips">
        <a class="operator-chip" href="01-算子定义/A1-划分算子/"><span>A1</span>划分</a>
        <a class="operator-chip" href="01-算子定义/A2-上下文编排算子/"><span>A2</span>编排</a>
        <a class="operator-chip" href="01-算子定义/A3-采样算子/"><span>A3</span>采样</a>
      </div>
    </section>

    <section class="operator-group">
      <p class="operator-group__eyebrow">Scaffold</p>
      <h3>结构骨架</h3>
      <p class="operator-group__desc">A4-A7 负责生成描述、时序、文本信号和 scaffold。</p>
      <div class="operator-group__chips">
        <a class="operator-chip" href="01-算子定义/A4-多粒度描述算子/"><span>A4</span>多粒度描述</a>
        <a class="operator-chip" href="01-算子定义/A5-时序结构抽取算子/"><span>A5</span>时序结构</a>
        <a class="operator-chip" href="01-算子定义/A6-文本辅证抽取算子/"><span>A6</span>文本辅证</a>
        <a class="operator-chip" href="01-算子定义/A7-结构骨架构建算子/"><span>A7</span>结构骨架</a>
      </div>
    </section>

    <section class="operator-group">
      <p class="operator-group__eyebrow">Synthesis</p>
      <h3>物化与回修</h3>
      <p class="operator-group__desc">A8-A9 负责生成 `qae_triplets` 和 `revisions`。</p>
      <div class="operator-group__chips">
        <a class="operator-chip" href="01-算子定义/A8-QAE共同合成算子/"><span>A8</span>QAE物化</a>
        <a class="operator-chip" href="01-算子定义/A9-一致性回修算子/"><span>A9</span>一致性回修</a>
      </div>
    </section>

    <section class="operator-group">
      <p class="operator-group__eyebrow">Audit</p>
      <h3>最终出站</h3>
      <p class="operator-group__desc">A10 负责输出 `quality_records`，记录保留、丢弃和层级分配。</p>
      <div class="operator-group__chips">
        <a class="operator-chip" href="01-算子定义/A10-质量筛查算子/"><span>A10</span>质量筛查</a>
      </div>
    </section>
  </div>

## 建议阅读顺序

1. 先读 [高自由度视频算子系统总览](00-总览/高自由度视频算子系统总览.md)，确认 A1-A10 与源码文件的对应关系。
2. 再读 [Architecture](00-总览/Architecture.md)，理解当前 `MultimodalDataset` row 字段流。
3. 然后读 [统一中间态与数据流协议](00-总览/统一中间态与数据流协议.md)，确认各对象实际字段。
4. 最后按需进入具体算子页面、预设页面和文献支撑页面。
