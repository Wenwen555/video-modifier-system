# 归档说明

本文件保留此前的工作过程性总结，作为归档记录。

当前用于正式汇报和系统文档引用的版本请优先查看：

- `文献支撑与最新趋势总结.md`
- `算子-论文映射.md`
- `预设管线与文献对照.md`

以下内容为早期整理稿，保留原文以便追溯。

以下内容不改动你现有的 10 算子 plan，只作为一份“文献支撑附录”。我把范围控制在你要求的最新窗口内，也就是截至 `2026-03-30`，优先看 `2025-01-01` 到 `2026-03-30` 的论文；如果某个算子在这段时间里没有足够强的直接支撑，我会明确标出来，并单独给你一段“最新文献里的新算子思路”，方便你做汇报展示。

**文献附录总判断**

截至 `2026-03-30`，你现有的 10 个算子里：

- `A3 基础采样`
- `A4 自适应采样`
- `A5 去重/压缩`
- `A7 空间聚焦`
- `A8 时序定位/变化摘要`
- `A9 标注生成`
- `A10 质量裁决`

这 7 个算子已经能被 2025-2026 的最新 Video-LLM / LVLM 文献较好支撑。

相对更弱、更多属于“系统化抽象”而不是“最新论文中单独成立模块”的是：

- `A1 划分算子`
- `A2 片段清洗算子`
- `A6 文本抽取算子`

这里不是说它们不重要，而是说 2025-2026 的最新工作更倾向于把这些功能“折叠进”更大的长视频 grounding / captioning / retrieval 框架里，而不是把它们作为独立算子来写。

**10 算子对应的最新文献支撑**

| 算子 | 最新支撑强度 | 2025-2026 主要文献 | 对你汇报时可讲的支撑点 |
|---|---|---|---|
| `A1 划分算子` | 中 | [Sali4Vid, 2025-09-04](https://arxiv.org/abs/2509.04602), [Video-in-the-Loop, 2025-10-05](https://arxiv.org/abs/2510.04022), [TimeChat-Captioner, 2026-02-09](https://arxiv.org/abs/2602.08711) | 最新趋势仍然需要“先局部化/分段，再做理解或生成”，只是论文更常写成 `semantic adaptive retrieval`、`span localization`、`multi-scene scripting`，不再只叫 shot segmentation。 |
| `A2 片段清洗算子` | 弱 | [MME-VideoOCR, 2025-05-27](https://arxiv.org/abs/2505.21333), [MVQA-68K, 2025-09-15](https://arxiv.org/abs/2509.11589) | 文献明确指出模糊、运动、低清、跨帧整合失败会严重影响 Video-LLM，但“片段清洗”本身更多还是工程支撑算子，不是学术论文里的显式核心模块。 |
| `A3 基础采样算子` | 强 | [Adaptive Keyframe Sampling, 2025-02-28](https://arxiv.org/abs/2502.21271), [Threading Keyframe with Narratives, 2025-05-30](https://arxiv.org/abs/2505.24158), [AdaRD-Key, 2025-10-03](https://arxiv.org/abs/2510.02778) | 最新工作几乎都把 uniform / sparse keyframe 当作 baseline，因此你的基础采样算子必须保留，它是后续 adaptive 方法的参照系。 |
| `A4 自适应采样算子` | 很强 | [Adaptive Keyframe Sampling, 2025-02-28](https://arxiv.org/abs/2502.21271), [STORM, 2025-03-06](https://arxiv.org/abs/2503.04130), [Threading Keyframe with Narratives, 2025-05-30](https://arxiv.org/abs/2505.24158), [AdaRD-Key, 2025-10-03](https://arxiv.org/abs/2510.02778), [Video-in-the-Loop, 2025-10-05](https://arxiv.org/abs/2510.04022), [Think with Grounding, 2026-02-21](https://arxiv.org/abs/2602.18702) | 这是 2025-2026 最强趋势之一。最新工作不再满足于均匀抽帧，而是做 `query relevance + diversity`、`span-aware reallocation`、`on-demand grounding`。 |
| `A5 去重算子` | 强 | [STORM, 2025-03-06](https://arxiv.org/abs/2503.04130), [SlowFast-LLaVA-1.5, 2025-03-24](https://arxiv.org/abs/2503.18943), [Token Reduction via AOT, 2026-03-02](https://arxiv.org/abs/2603.01400), [V-CORE, 2026-01-05](https://arxiv.org/abs/2601.01804) | 最新文献虽然更常说 `token reduction / pruning / compression`，但本质上就是更细粒度的视觉去重与冗余压缩。你完全可以把它汇报成去重算子的学术升级版。 |
| `A6 文本抽取算子` | 中偏弱 | [MME-VideoOCR, 2025-05-27](https://arxiv.org/abs/2505.21333), [LongVideoBench, 2024-07-22](https://arxiv.org/abs/2407.15754), [TimeChat-Captioner, 2026-02-09](https://arxiv.org/abs/2602.08711) | 最新工作证明了视频 OCR、字幕、音频文本对长视频理解非常关键，但 2025-2026 更常把它们当 multimodal evidence，而不是独立单算子来建模。 |
| `A7 空间聚焦算子` | 很强 | [VideoRefer Suite, 2024-12-31](https://arxiv.org/abs/2501.00599), [SpaceVLLM, 2025-03-18](https://arxiv.org/abs/2503.13983), [CAT-V, 2025-04-07](https://arxiv.org/abs/2504.05541), [VideoLoom, 2026-01-12](https://arxiv.org/abs/2601.07290), [SlotVTG, 2026-03-26](https://arxiv.org/abs/2603.25733) | 最新趋势非常明确：Video-LLM 正在从“整段看视频”转向“对象级、区域级、时空联合 grounding”。你的空间聚焦算子非常符合这条线。 |
| `A8 时序变化摘要算子` | 很强 | [LeAdQA, 2025-07-20](https://arxiv.org/abs/2507.14784), [ED-VTG, 2025-10-19](https://arxiv.org/abs/2510.17023), [Video-in-the-Loop, 2025-10-05](https://arxiv.org/abs/2510.04022), [TimeChat-Captioner, 2026-02-09](https://arxiv.org/abs/2602.08711), [Think with Grounding, 2026-02-21](https://arxiv.org/abs/2602.18702) | 最新论文核心都在强调 `temporal grounding`、`moment localization`、`structured timestamped captions`。所以你这个算子最好在汇报时表述为“时序定位 + 变化摘要”的组合，不只是简单做 head-tail diff。 |
| `A9 标注生成算子` | 很强 | [LongViTU, 2025-01-09](https://arxiv.org/abs/2501.05037), [GROVE / HowToGround1M, 2025-03-13](https://arxiv.org/abs/2503.10781), [VideoRefer Suite, 2024-12-31](https://arxiv.org/abs/2501.00599), [TimeChat-Captioner, 2026-02-09](https://arxiv.org/abs/2602.08711), [VDC-Agent, 2025-11-24](https://arxiv.org/abs/2511.19436) | 2025-2026 最新数据构造工作已经非常支持“自动化标注生成”作为核心算子，而且从 caption、grounded caption 到 instruction/QA 都有证据。 |
| `A10 质量裁决算子` | 中强 | [LongViTU, 2025-01-09](https://arxiv.org/abs/2501.05037), [VDC-Agent, 2025-11-24](https://arxiv.org/abs/2511.19436), [MVQA-68K, 2025-09-15](https://arxiv.org/abs/2509.11589), [Omni-Judge, 2026-02-02](https://arxiv.org/abs/2602.01623) | 最新文献支持“自反思评分”“多维质量解释”“LLM/omni-LLM judge”这条线，但需要你在汇报里说清楚：它更强于 `caption / generated video / response quality judging`，对真实网页视频标注管线的直接公开验证还没那么统一。 |

**可以直接写进汇报的“最新文献结论”**

1. `A4 自适应采样` 是当前最被 2025-2026 文献反复验证的方向。
`Adaptive Keyframe Sampling`、`AdaRD-Key`、`Video-in-the-Loop`、`Think with Grounding` 都在强调同一个问题：固定 token budget 下，均匀采样会稀释关键时刻，必须让采样策略对 query、事件密度或时间跨度有感知。

2. `A5 去重/压缩` 在最新文献里实际上已经从“工程优化”升级成“模型能力保障”。
`STORM`、`V-CORE`、`AOT`、`SlowFast-LLaVA-1.5` 说明压缩不是简单删 token，而是要保留时间动态和关键上下文，否则长视频理解会显著退化。

3. `A7 + A8` 的联合，也就是“空间聚焦 + 时序定位”，是 2025-2026 最明显的新支柱。
`VideoRefer Suite`、`SpaceVLLM`、`VideoLoom`、`SlotVTG` 都在推动对象级时空 grounding；`ED-VTG`、`LeAdQA`、`ViTL`、`TimeChat-Captioner` 都在推动显式时间边界和结构化时序表达。

4. `A9 标注生成` 已经不只是 caption 生成，而是向 `grounded caption / span-grounded QA / structured script` 演进。
这一点在 `LongViTU`、`GROVE`、`TimeChat-Captioner` 和 `VideoRefer Suite` 里都很明显。

5. `A10 质量裁决` 的最新趋势是“评分不只输出一个分数，而是同时输出解释、维度分解和反思修正”。
`VDC-Agent`、`MVQA-68K`、`Omni-Judge` 都体现了这点。

**支撑相对不足的算子**

这部分你在汇报时反而可以讲得很稳，因为这是“文献真实空白”，不是你的设计问题。

`A1 划分算子`
- 2025-2026 的最新 Video-LLM 文献仍然需要先做分段或局部化，但更多写成 `span localization`、`semantic adaptive retrieval`、`scene-aware scripting`。
- 也就是说，最新工作支持“先找局部时间范围”这个思想，但不一定把它单独封装成一个传统的 `shot / semantic partition operator`。
- 因此你现有 `A1` 是合理的系统抽象，但它不是当前论文里最常被单独命名的模块。

`A2 片段清洗算子`
- 这基本上仍是系统工程算子。
- 最新论文会承认低质帧、模糊、运动模糊、低分辨率、转场污染会破坏理解质量，但不会单独写一篇“Video-LLM cleaning operator”。
- 所以汇报时建议把它表述为“为保证后续文献算子输入纯度而保留的基础支撑层”。

`A6 文本抽取算子`
- 最新 benchmark 和 captioning 工作都证明 OCR、字幕、ASR 很重要。
- 但 2025-2026 真正主流的做法不是把 OCR/ASR 当独立研究对象，而是把文本证据作为长视频理解和 dense captioning 的一部分。
- 所以它在你系统里应被定义为“多模态证据汇聚算子”，而不是试图声称它本身是最新 Video-LLM 的研究热点。

**如果你要单独加一页“最新文献中的算子新趋势”**

这一页不用改你现有的 10 算子，只作为汇报展示“2025-2026 的新思路补充”。

1. `Query-Conditioned Keyframe Sampler`
来源：[Adaptive Keyframe Sampling, 2025-02-28](https://arxiv.org/abs/2502.21271), [AdaRD-Key, 2025-10-03](https://arxiv.org/abs/2510.02778)  
核心思路：采样不再只依赖视频本身，而是由问题或任务驱动，在 relevance 和 diversity 之间动态折中。

2. `Keyframe + Narrative Interleaver`
来源：[Threading Keyframe with Narratives, 2025-05-30](https://arxiv.org/abs/2505.24158)  
核心思路：只保留关键帧会导致时间断裂，因此在关键帧之间插入由非关键帧生成的简短 narrative，形成“视觉锚点 + 文本桥接”。

3. `Span-Aware Token Reallocator`
来源：[Video-in-the-Loop, 2025-10-05](https://arxiv.org/abs/2510.04022)  
核心思路：先低帧率 skim 视频，再把更多 token 重新分配给被定位出的关键时间段，而不是全视频均匀消耗算力。

4. `On-Demand Grounding Operator`
来源：[Think with Grounding, 2026-02-21](https://arxiv.org/abs/2602.18702)  
核心思路：模型在推理过程中主动决定何时回到视频中“再看一眼”，只对必要片段做二次 grounding。

5. `Structured Time-Aware Dense Captioner`
来源：[TimeChat-Captioner, 2026-02-09](https://arxiv.org/abs/2602.08711)  
核心思路：caption 不再是单句摘要，而是带显式时间戳、多场景、多维结构 schema 的 script-like narration。

6. `Joint Spatial-Temporal Grounder`
来源：[VideoLoom, 2026-01-12](https://arxiv.org/abs/2601.07290), [SpaceVLLM, 2025-03-18](https://arxiv.org/abs/2503.13983)  
核心思路：把空间定位和时间定位当成一个联合问题处理，而不是先时间后空间或先空间后时间。

7. `Object-Centric Temporal Adapter`
来源：[SlotVTG, 2026-03-26](https://arxiv.org/abs/2603.25733)  
核心思路：把视频 token 分解成更接近对象级的 slot，再做 temporal grounding，以提升 OOD 泛化和细粒度定位能力。

8. `Self-Reflective Caption Judge`
来源：[VDC-Agent, 2025-11-24](https://arxiv.org/abs/2511.19436)  
核心思路：captioner 自己生成、自己打分、自己修正，最后形成 preference 数据，用于持续提升视频描述质量。

9. `Local-Global Token Anchor Compressor`
来源：[Token Reduction via AOT, 2026-03-02](https://arxiv.org/abs/2603.01400)  
核心思路：压缩不是简单裁剪，而是通过局部和全局 anchor 汇聚被删 token 的信息，尽量少损失时间与细节。

10. `Temporal-Causal Projection Operator`
来源：[V-CORE, 2026-01-05](https://arxiv.org/abs/2601.01804)  
核心思路：在时序聚合中显式约束信息流方向，避免后帧“污染”前帧表征，突出因果顺序敏感的视频理解。

**你汇报时最推荐的表述方式**

你可以把现有 10 算子分成三层来讲，这样最稳：

- `基础系统层`
  - `A1 划分`
  - `A2 清洗`
  - `A3 基础采样`
  - `A5 去重`
  - `A6 文本抽取`

- `文献强驱动层`
  - `A4 自适应采样`
  - `A7 空间聚焦`
  - `A8 时序定位/变化摘要`
  - `A9 标注生成`
  - `A10 质量裁决`

- `2025-2026 新趋势补充页`
  - query-conditioned sampling
  - span-aware reallocation
  - think-with-grounding
  - structured dense captioning
  - joint spatial-temporal grounding
  - self-reflective judging

这样讲的好处是：
- 不需要改你现有 plan
- 还能明确说明“哪些算子是系统必需，哪些算子是最新文献强支撑”
- 同时你还能展示自己跟上了 `2025-2026` 的新趋势，而不是停留在 2024 的 Video-LLaVA / Panda / Chat-UniVi 时代

如果你愿意，我下一步可以直接基于这份附录，帮你整理成一版“汇报可直接贴到 PPT 里”的中文表格版，格式会更像答辩或组会材料。
