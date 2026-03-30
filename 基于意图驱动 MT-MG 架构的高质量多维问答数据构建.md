本文定位：**一篇聚焦于“程序性长视频 (Procedural Long Videos)”的 Data-centric Method 论文**。

逻辑核查：
- [x] 聚焦于“程序性长视频”这个数据方向是否合理？这是一个成熟的，并且有清晰的研究路线的数据领域


## 核心Part(The 1-Pager)

#### 1. 研究问题 (Research Question)

**“如何在程序性长视频中，通过联合层次化任务树 (Macro-Tree) 与局部时空场景图 (Micro-Graph) 的结构化中间表示，构建能有效抑制 Video-LLM 语言先验幻觉并提升多粒度推理能力的指令数据集？”**

#### 2. 贡献边界 (Contribution Boundary)

- **主贡献:** 提出一种基于 MT-MG（宏观树-微观图）联合表示的自动化视频 QA 数据构建管线 (Data Generation Pipeline)。
    
- **子贡献 A (采样策略):** 提出一种基于宏观意图驱动的微观图稀疏化策略 (Intent-driven Sparsification)，作为一种归纳偏置 (Inductive Bias)，在降低图解析计算复杂度的同时，提取与任务强相关的核心子图。
    
- **子贡献 B (负样本机制):** 定义了一套“拓扑级反事实扰动规则 (Topological Counterfactual Perturbation)”，通过对特定关系边的合法修改，自动化生成用于抑制模型幻觉的高难度负样本 (Hard Negatives)。
    

#### 3. 核心消融矩阵 (Ablation Matrix)

为证明数据的有效性，将在统一的基座模型和相近的 Token 规模下进行如下消融：

|**数据构建策略**|**宏观规划能力评估 (如 Task Prediction)**|**细粒度对齐评估 (如 Temporal Grounding)**|**幻觉率评估 (如 Factual Consistency)**|
|---|---|---|---|
|**Baseline:** 纯文本重写 (Caption $\rightarrow$ QA)|基础基线|基础基线|基础基线 (较高幻觉)|
|**Variant 1:** 仅用树先验 (Tree-only $\rightarrow$ QA)|提升显著|提升微弱|改善有限|
|**Variant 2:** 仅用图先验 (Graph-only $\rightarrow$ QA)|提升微弱|提升显著|改善有限 (缺乏宏观约束)|
|**Variant 3:** MT-MG (全量图，无稀疏化)|提升|提升|改善，但存在较高计算成本与噪声干扰|
|**Ours:** MT-MG + 意图稀疏化 + 反事实负样本|**全面最优**|**全面最优**|**显著降低语言先验幻觉**|

---

## 重构后的汇报大纲 (Introduction + Literature Review)

### 第一部分：Introduction

**1. 动因：程序性长视频理解的困境与数据瓶颈**

程序性长视频（Instructional / Procedural Videos，如烹饪、维修指南）要求模型同时具备宏观的长期任务规划能力（Long-horizon Planning）和微观的细粒度实体-动作对齐能力（Fine-grained Grounding）。

当前基于“视频 $\rightarrow$ 扁平文本描述 $\rightarrow$ LLM 生成 QA”的数据构建范式，容易导致 Video-LLM 产生严重的“语言先验幻觉（Language-prior Hallucination）”，且难以捕获精确的时序因果逻辑。本研究认为，缺乏结构化的中间表示（Structured Intermediate Representation）是导致该问题的核心数据瓶颈。

**2. 方法：MT-MG 数据构建管线与标注协议**

我们提出一种 Data-centric 的自动化构建方法，通过联合表示解决上述问题：

- **数据流转与标注协议:** 明确界定数据的生产链条。Macro-Tree 由通用大语言模型结合 ASR/密集字幕自顶向下解析生成（提供任务与步骤边界）；Micro-Graph 由预训练的 VidSGG 模型和跟踪器在步骤切片内自底向上抽取。
    
- **联合约束接口:** 提出一种将树的层次规划与图的局部交互相融合的数据组装格式，作为生成多粒度（Multi-granularity）QA 的上下文约束。
    

**3. 关键机制：意图稀疏化与拓扑级反事实**

为解决图解析的复杂度与 LLM 幻觉问题，我们在管线中引入两个核心机制：

- **作为归纳偏置的意图稀疏化 (Intent-driven Sparsification):** 引入一种采样启发式策略，利用宏观步骤意图过滤微观图中低相关性的冗余边。我们明确分析该策略的 Trade-off：它能大幅压缩 $O(N^2)$ 的图节点规模并降低背景噪声，但也伴随过滤掉“意图外但真实发生”事件的风险（通过设置置信度阈值和保留高频背景节点来缓解这种 Confirmation Bias）。
    
- **拓扑级反事实生成 (Topological Counterfactuals):** 区别于纯文本域的随机修改，我们在图结构层面定义了合法的扰动算子（如：实体替换 Entity Substitution、状态阻断 State Corruption）。基于扰动后的图生成负样本 QA，明确强制模型依赖视觉证据而非语言共现性进行推理。
    

**4. 实验验证与主要发现**

我们构建了一个规模为 X 万条的程序性视频指令数据集，并设计了系统性的评测：

- 通过严格的消融实验证明，MT-MG 联合先验在下游模型的长程因果推理和时空定位指标上，显著优于传统的纯文本重写范式。
    
- 通过对比评测验证，注入拓扑反事实样本能使基座模型的视觉幻觉率绝对下降 Y%。
    
- 提供详细的 Error Analysis，量化分析上游图谱漏检和宏观意图错误对下游 QA 质量的级联影响。
    

---

### 第二部分：Literature Review (生态定位)

>现有 procedure-video 的 data-centric 工作已经分别探索了  
（1）**宏观层次结构**：goal-step-substep、guideline、task graphs；  
（2）**微观关系结构**：scene graphs、action scene graphs、verb-argument tuples；  
（3）**鲁棒性数据设计**：mistakes、corrections、state-change counterfactuals。  
但这些结构大多被用于单独的 benchmark、表示学习或识别任务，较少被**作为联合约束接口**嵌入自动化问答/指令数据生产管线。  
你的 MT-MG 贡献因此应被表述为：**在数据生产阶段，以 macro procedural structure 约束 micro factual graph，并以 micro evidence 反校 macro intent。**

- **procedural 主线**：YouCook2 → CrossTask / COIN / HowTo100M → DistantSup / Paprika / Procedure-aware VRL → Ego4D Goal-Step / GUIDE / Video-Mined Task Graphs → Assembly101 / CaptainCook4D / State-change Counterfactuals
- **micro-graph 旁支**：Action Genome、EASG、structured procedural knowledge extraction


#### 一、什么叫 data-centric 的 procedure videos 工作

在这个子领域里，“data-centric” 不只是“做个数据集”。更准确地说，它包含四类工作：

**1）设计新的标注粒度**：从视频级 task label，发展到 step、substep、goal、guideline、error state、object state。  
**2）设计新的数据来源与采样方式**：从人工精标视频，发展到 narrated web videos、ASR、wikiHow、跨视角采集、自动收集与过滤。  
**3）设计新的结构化中间表示**：比如 ordered step list、goal-step-substep hierarchy、task graph、procedural knowledge graph、action scene graph、verb-argument tuples。  
**4）设计新的数据增强/对抗样本机制**：比如利用错误执行、状态变化、反事实结果来提升 procedure reasoning。
这个定义下，Ego4D Goal-Step、GUIDE、Paprika、Video-Mined Task Graphs、CaptainCook4D 都属于 data-centric；而单纯做 backbone 改进但不改变 supervision/formulation 的方法，不是你该重点写的文献。

---
#### 二、这条线怎么发展起来的

##### 1）早期：把 procedure 从“长视频”切成“步骤片段”

**YouCook2** 是这一代最重要的起点之一。它把 cooking videos 从“整段视频描述”推进到“带时间边界的 procedure segments + step descriptions”，让 procedure segmentation、dense captioning、step-level understanding 成为可评测问题。它很重要，但局限也很明显：**单领域、第三人称、正确执行为主、结构仍然偏平坦。**
2
**CrossTask** 往前走了一步：它不再只给精确 temporal labels，而是把 **ordered list of steps** 与 narration 当作弱监督，用来学习 ordinary tasks 的步骤视觉模型。这个工作很关键，因为它第一次把“书面脚本/步骤表”明确地作为 procedure supervision 资源，而不是只把视频当作 action recognition 数据。缺点是它的结构本质上还是 **task → ordered steps**，没有显式的 object-state 或 interaction graph。

**COIN** 则把规模和多样性做起来了。它把 instructional video 组织成 **domain–task–step** 的层次体系，覆盖 180 个任务、12 个领域，并给出 step descriptions 与 temporal boundaries。对你来说，COIN 的价值不是“它已经解决了 hierarchy”，而是它证明了 procedural data 不能只在 cooking 里做。缺点同样明显：它有任务层级，但没有微观实体关系层。

**HowTo100M** 则代表另一条 data-centric 路线：不追求人手密标，而是用 1.22M narrated instructional videos 的规模换监督噪声。它极大推动了 procedure-aware pretraining，但也把这个方向的核心矛盾暴露出来了：**规模上去了，结构纯度下来了，ASR 与 narration 也未必真的对齐视觉步骤。** 这正是后来弱监督、远监督、结构化知识图方法不断出现的原因。

##### 2）中期：从人工密标转向可扩展的弱监督/远监督数据构建

**TIPS** 很典型。它不是强调某个新模型，而是先自动收集了一个大规模 procedure segmentation 数据集：63K videos、300K+ procedure segments，覆盖 cooking、health、beauty、parenting、gardening 等多域。它说明 procedure data 不一定非要靠昂贵精标，也可以通过自动收集与边界学习做规模化扩展。

**Learning to Recognize Procedural Activities with Distant Supervision（CVPR 2022）** 更进一步，把 **wikiHow + ASR + narration matching** 变成自动步骤挖掘机制。它不是简单利用视频文本对，而是显式把 textual knowledge base 当成 procedure prior，用语言模型把 narration 对齐到 step descriptions，再把这些 match 作为 step-level supervision。对 MT-MG 来说，这篇论文的意义很大：它证明了**程序知识库可以作为视频 procedure supervision 的上层约束源**。

这一阶段的一个共同特征是：**大家开始承认 procedure understanding 的瓶颈不是纯视觉 backbone，而是 supervision 如何以低成本保留结构。** 但这一阶段保留的大多还是 step identity 和 temporal order，微观事实层还不够。

##### 3）近年：从平坦 step 序列走向层次结构、任务图与程序知识图

这是你最该补的部分。

**Ego4D Goal-Step（NeurIPS 2023）** 是目前 procedure literature 里最值得写的一篇之一。它把 egocentric activities 标成 **goal–step–substep** 的层次结构，并提供 goal labels、step/substep labels，以及与 goal 相关的辅助信息，如 step completion status、step-to-goal relevance、summary description。它的重要性不只是“大”，而是它把 procedure 从“动作时间边界”升级成了**功能层级结构**。你文中的“Macro-Tree”如果要找最强近邻，首先就该对接 Ego4D Goal-Step，而不是只泛泛说“Ego4D 的步骤分解”。

**GUIDE（IJCAI 2024）** 是另一条很值得写的线。它不是标注每个视频自己的步骤而已，而是引入 **task-level guideline**，也就是多个同任务视频共享的抽象指南，再在视频级标 specific steps，并设计 guideline summarization、guideline-guided captioning 等任务。这个设计很像你想做的宏观层：它不是简单时间顺序，而是**跨实例抽象出来的 canonical task scaffold**。如果你要论证 MT 中的上层意图/任务树是合理的，GUIDE 比旧的数据集更贴切。

**Paprika / Procedure-Aware Pretraining（CVPR 2023）** 则代表“结构不是人工标出来，而是从文本知识库和视频语料共同诱导出来”。它构建 **Procedural Knowledge Graph (PKG)**，节点是离散 step，边表示顺序关系，再用这个图生成 pseudo labels 做预训练。对你的方法最相关的一点是：它已经证明 **procedural graph 作为训练监督载体** 是有效的；但它的图还是以 step-level procedural knowledge 为主，不是你想要的 micro fact graph。

**Video-Mined Task Graphs（NeurIPS 2023）** 又往前走了一步：它不是从书面脚本拿图，而是**直接从 how-to videos 中发现 probabilistic task graph**，并用它来正则化 keystep recognition。这个工作非常值得你写，因为它表明 procedure graph 不必是静态脚本，真实视频中存在**多路径、可变顺序、概率化执行图**。这正好支持你以后在 MT 里避免把程序树写得过于刚性。

**Learning Procedure-Aware Video Representation from Instructional Videos and Their Narrations（CVPR 2023）** 则强调 temporal ordering 本身是可学的结构，而不是简单 step classification。它用 narrations 学 step concepts，并用 diffusion-style probabilistic model 学 step ordering 与 missing-step prediction。对你的启发是：**procedure data 的结构不只是树，还是带不确定性的序列分布。**

##### 4）从“正确执行”到“错误、偏差、反事实、状态变化”

这是你第二部分 literature review 现在最薄弱的地方。

**Assembly101（CVPR 2022）** 很重要，因为它把 procedural activities 从 cooking/tutorial 场景扩展到 **assembly**，而且视频中包含 **natural variations in action ordering, mistakes, and corrections**。这意味着 procedure data 不该只建模“标准流程”，还要建模真实世界里的偏差和修正。它还提供 multi-view 和 egocentric 视角，是 procedure data 从理想脚本走向真实执行的重要节点。

**CaptainCook4D（NeurIPS 2024 Datasets & Benchmarks）** 则更直接，它专门采集了遵循 recipe 与故意引入错误两类执行，并提供 step annotations、fine-grained action annotations，用于 error recognition、multistep localization、procedure learning。对你而言，这类工作比“泛泛谈 hard negatives”更自然，因为它告诉你：**procedure videos 的 data-centric 对抗样本，不一定要靠文本伪造，真实世界本来就有错误执行数据。**

**What Changed and What Could Have Changed? State-Change Counterfactuals for Procedure-Aware Video Representation Learning（ICCV 2025）** 更接近你现在想写的“拓扑级反事实”。它把实际 state changes 和 counterfactual state changes 都作为监督信号，让模型学到动作如何改变场景，以及如果某一步失败会导致什么后果。它的重点不是 generic hard negatives，而是 **procedure-aware state counterfactuals**。这说明你的反事实线是有生态基础的，但你不能只引用“大模型幻觉抑制”论文；你应该把它放回 procedure/state-change literature 里。

---

#### 三、微观图表示这条线该怎么写

你现在的写法里把 **Action Genome** 直接放进 procedure videos 的主文献线里，这不够准。

**Action Genome** 的贡献是视频中的 **spatio-temporal scene graphs**：对象、关系、状态变化，强调动作由人-物交互及其时空关系组成。它非常适合当你 **Micro-Graph** 的视觉先验参考，因为它证明图式表示能细化动作理解。**但它不是 procedural benchmark**，也不提供 goal-step hierarchy。你可以引用它来支持“图擅长局部事实与关系建模”，但不要把它写成 procedure videos 生态里的代表性数据集。

更贴近你主线的是 **EASG / Action Scene Graphs for Long-Form Understanding of Egocentric Videos（CVPR 2024）**。这篇工作在 Ego4D 上扩展出 **Egocentric Action Scene Graphs**，把传统 verb-noun label 扩展成时变图结构，显式编码 camera wearer 的动作、交互对象、关系以及动作如何随时间展开。它是 procedure-ish、egocentric、long-form、graph-based 这几个关键词真正同时出现的一篇。你现在文献回顾里如果只写 Action Genome，不写 EASG，会显得停留在 2020 年。

还有一篇你很值得知道的跨模态工作：**A Benchmark for Structured Procedural Knowledge Extraction from Cooking Videos（ACL 2020）**。它的目标是从 instructional video + transcript 中抽取 **verb-argument tuples**，比如 `(heat, skillet)`、`(add, pepper, to soup)` 这类结构化 procedure units。它不是 CV benchmark，但和你的 MT-MG 很近，因为它说明 procedure structuring 不是只有 temporal steps，一样可以下沉到“动作-论元-对象”的半符号层。

#### 文献回顾（Version I）
**Intermediate representations for procedural videos.**  
Early procedural-video benchmarks mainly model videos as temporally ordered step segments with textual descriptions, as exemplified by YouCook2, CrossTask, and COIN. Recent data-centric work has moved beyond flat step lists toward richer procedural abstractions, including goal-step-substep hierarchies in Ego4D Goal-Step and task-level guidelines in GUIDE. In parallel, graph-based representations have been explored to model local interactions and evolving scene structure, from spatio-temporal scene graphs in Action Genome to egocentric action scene graphs in EASG. These works suggest that hierarchical structures are effective for capturing global task intent, whereas graph-structured representations are better suited for local action grounding, object interaction, and state evolution. However, the two forms of structure are still mostly used in isolation, either as separate benchmarks or as standalone supervision for recognition and pretraining tasks.

**Scalable data construction for procedure understanding.**  
A major trend in procedural-video research is the shift from expensive dense annotation to scalable weak or distant supervision. HowTo100M demonstrates the viability of leveraging narrated instructional videos at web scale, while TIPS shows that automatically collected data can support procedure segmentation at large scale. CrossTask, DistantSup, Paprika, and procedure-aware representation learning from narrations further show that step-level supervision, temporal ordering, and procedural knowledge can be induced from weak signals such as narrations, ASR, wikiHow step descriptions, and mined task graphs. This line of work highlights that the main bottleneck is not only model capacity, but also how to preserve procedural structure under scalable data collection pipelines.

**Error-aware and counterfactual procedural data.**  
Recent procedural datasets increasingly model non-ideal execution rather than only canonical step sequences. Assembly101 explicitly includes natural variations, mistakes, and corrections in multi-view assembly videos, while CaptainCook4D collects egocentric cooking videos with both correct executions and induced errors. More recently, state-change counterfactuals have been introduced to model how scene states could evolve under failed or alternative outcomes, enabling procedure-aware supervision beyond observed trajectories. These developments suggest that robust procedural data should encode not only what happened, but also what should have happened and what could have gone wrong.

**Position of our work.**  
Our work is not to propose a new primitive data structure. Instead, we introduce a data-production interface that conditionally couples a macro-level procedural hierarchy with a micro-level factual interaction graph. Compared with prior work, the proposed MT-MG framework aims to use high-level intent and step structure to constrain local evidence selection, while using fine-grained object-relation-state evidence to verify or refine macro procedural interpretations during data construction. This differs from existing works that typically emphasize either hierarchy, graph structure, or counterfactual robustness alone.