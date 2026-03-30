视频问答对构建（Video QA / Instruction Generation）的核心任务是将视频的感知信息转化为大模型可供学习的逻辑推理链路与交互指令。当前文献中，这一过程已经演化出几种明确的构建范式。
以下是当前主流的视频指令生成范式、核心技术、所需设定以及代表性文献的系统性总结：
1. 文本驱动的 LLM 离线生成范式 (Text-Prompted Generation)
这是早期及当前开源社区最广泛使用的高性价比方案。其核心思想是将视频“降维”为纯文本，再利用强大的闭源 LLM（如 GPT-4）的文本推理能力生成 QA。
 * 对应技术： 多级感知信息融合（Dense Captioning + ASR + OCR），Prompt 工程（Few-shot prompting, In-context learning）。
 * 需要的设定：
   * 前置数据： 必须先通过专家模型（如 Whisper, BLIP-2, Tag2Text）提取视频的帧描述、全局描述、时间戳、字幕和音频标签。
   * Prompt 设定： 需要为 LLM 设计极其详尽的系统提示词，通常要求 LLM 扮演“严谨的视频分析师”，并输入 <时间戳> - <描述> 格式的字典。设定中必须包含多个生成规则（如：控制问答长度、避免提及“基于提供的文本”等穿帮词汇、涵盖空间/时间/因果等不同维度的提问模板）。
 * 代表性 Paper：
   * VideoChat: Chat-Centric Video Understanding (通过大模型组合多种视觉模型的文本输出，生成多轮对话)
   * Video-ChatGPT: Towards Detailed Video Understanding via Large Vision and Language Models (提出结合人工校验与 GPT-3.5/4 生成详细描述、复杂推理 QA 的管线)
2. 原生多模态大模型的端到端生成 (MLLM-based End-to-End Generation)
随着 GPT-4V、Gemini 1.5 Pro 等原生多模态模型的普及，研究者开始直接将视频帧和指令输入给这些“教师模型”，让其直接看着画面生成高质量的问答对。
 * 对应技术： 时序采样策略（均匀采样、基于运动变化的非均匀采样），长上下文多模态 Prompt 注入。
 * 需要的设定：
   * 输入设定： 将视频降采样为固定数量的帧序列（如 8、16 或 32 帧），或者直接以视频流格式（如果 API 支持）输入。
   * Prompt 设定： 直接向 MLLM 强调“观察画面中的动态变化”，要求模型生成包含特定行为、物体轨迹、场景转换的问答。设定中需要限制模型避免过度发散，要求其回答必须严格锚定在提供的视频帧内。
 * 代表性 Paper：
   * ShareGPT4Video: Improving Video Understanding and Generation with Better Captions (利用 GPT-4V 生成极其详尽的视频时空描述，并转化为高质量 QA)
   * LLaVA-NeXT-Video (AnyRes 技术，将高分辨率视频切分为多网格帧序列输入给大语言模型生成精细指令数据)
1. 时空图谱与结构化驱动生成 (Structure & Graph-Driven Generation)，详情参考[[时空图谱和结构化驱动生成的具体技术]]
为了解决模型“只懂画面、不懂逻辑”的问题，这种范式强调先建立视频的底层逻辑骨架，再沿着骨架生成具有强逻辑约束的 QA（如因果、反事实、长时序动作依赖）。
 * 对应技术： 动态场景图生成（Dynamic Scene Graphs），动作关系检测，基于规则或模板的树状遍历生成。
 * 需要的设定：
   * 图谱设定： 将视频解析为三元组 <主体, 动作/关系, 客体> 并在时间轴上串联。例如 [T1: 人-走向-门] -> [T2: 人-打开-门]。
   * 生成规则： 设定一套结构化的提问逻辑。例如，触发“原因”模板：“在 T2 动作发生前，T1 发生了什么？”；触发“预测”模板：“基于 T1，T2 可能发生什么？”。随后用 LLM 对这些模板化的 QA 进行自然语言润色。
 * 代表性 Paper：
   * NExT-QA: Next Phase of Question-Answering to Explaining Temporal Actions (虽包含人工标注，但其时序因果图谱的构建逻辑是自动化结构生成的基石)
   * STAR: A Benchmark for Situated Reasoning in Real-World Videos (基于真实世界的时空逻辑推理，利用行为树和图谱生成复杂的结构化指令)
4. 纠偏与负样本对抗生成 (Adversarial & Hard-Negative Generation)
当前 Video-LLM 容易产生“幻觉”（如语言模型凭借惯性瞎猜）。此范式专注于生成极具迷惑性的负样本或需要严苛时序感知才能回答的 QA 对，用于微调阶段的“强迫对齐”。
 * 对应技术： 实体替换（Object Swap），时序倒放模拟，反事实 Prompt 生成。
 * 需要的设定：
   * 扰动设定： 输入正确的视频描述或问答对，要求 LLM 生成逻辑上的“反义词”。例如，将“男子把杯子放在桌上”修改为“男子把杯子从桌上拿走”，或者打乱动作发生的先后时间戳。
   * 对抗设定： 设定模型必须学会回答“视频中并没有发生 X”或“无法根据当前视频判断”，建立拒绝回答（Rejection Response）的指令集。
 * 代表性 Paper：
   * TimeChat: A Time-sensitive Multimodal Large Language Model for Long Video Understanding (针对性地构建时间敏感的指令数据，包含大量时间戳高光定位的问答对)
   * HA-VQA (Hallucination-Aware Video Question Answering) (相关文献中讨论如何通过对抗性数据生成减轻视频幻觉)

## 构建范式总结对照表

| 构建范式                     | 核心驱动力          | 输入数据源要求                     | 生成 QA 的强项            | 典型代表作                            |
| ------------------------ | -------------- | --------------------------- | -------------------- | -------------------------------- |
| 文本驱动 (Text-Prompted)     | 文本大模型 (GPT-4)  | 密集的帧描述、ASR 文本、时间戳字典         | 综合信息聚合、长对话、低成本生成海量数据 | Video-ChatGPT, VideoChat         |
| 端到端多模态 (E2E MLLM)        | 视觉大模型 (GPT-4V) | 采样的视频帧序列 (Frames)           | 精细的视觉动态追踪、微表情与复杂场景理解 | ShareGPT4Video, LLaVA-NeXT-Video |
| 结构化图谱 (Structure-Driven) | 逻辑规则 + LLM 润色  | 时空场景图、动作三元组 (Action Graphs) | 严格的因果推理、动作前置与后置关系解析  | NExT-QA (逻辑框架), STAR             |
| 纠偏对抗 (Adversarial)       | LLM 逻辑反转       | 现有 QA 对 + 逻辑扰动规则            | 消除时序幻觉、提升模型对负样本的拒绝能力 | TimeChat, 幻觉对齐相关论文               |
