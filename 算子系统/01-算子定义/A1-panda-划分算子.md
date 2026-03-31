# A1-Panda-划分算子

## 1. 文档定位
本文件用于整理 Panda-70M 在 `splitting/` 目录中的视频切分逻辑，并将其转写为适合当前算子系统引用的工程技术文档。

这里关注的不是 Panda-70M 数据集本身，而是它在长视频切分问题上的实现方法：如何把长视频切成多个语义一致、长度可控、便于后续打标和 caption 的短片段。

Panda-70M 在仓库中把这部分逻辑明确描述为“将长视频切成多个语义一致的短片段”，其实现建立在 **PySceneDetect + ImageBind** 之上。  
参考：

- [Panda-70M splitting 目录](https://github.com/snap-research/Panda-70M/tree/main/splitting)

## 2. 算子定位
如果把 Panda-70M 的 splitting 逻辑抽象成当前系统里的一个 A1 系列算子，那么它并不是单一的“边界检测器”，而是一个**分层 split-and-stitch 划分算子**。

它解决的问题可以表述为：

- 先高召回地产生候选切点
- 再用轻量语义表示判断哪些候选段应当合并
- 最后对事件级片段做质量控制
- 仅在最后一步才将切分决策物化为真实短视频文件

对应到当前算子系统，它更像是一个：

`Hierarchical Semantic Video Split Operator`

## 3. 整体流水线
Panda-70M 的 splitting 主流程由三个脚本组成：

- `cutscene_detect.py`
- `event_stitching.py`
- `video_splitting.py`

它们之间通过 JSON 中间结果交接：

1. `cutscene_detect.py` 输出 `cutscene_frame_idx.json`
2. `event_stitching.py` 读取候选切分结果并输出 `event_timecode.json`
3. `video_splitting.py` 根据最终 event timecode 调用 ffmpeg 导出实际视频片段

这个设计有两个明显特征：

- 前两步输出的是**切分决策元数据**
- 第三步才是**物化执行器**

这是一种非常适合算子系统的设计，因为它天然把“决策层”和“执行层”解耦开了。

## 4. 阶段一：候选切点生成

### 4.1 输入与目标
第一阶段的目标不是直接找到最终语义边界，而是尽可能高召回地提出**候选 cutscene**。

这里的核心脚本是：

- `cutscene_detect.py`

### 4.2 实现方法
它调用 `scenedetect.detect(..., ContentDetector(...))` 做镜头边界检测。

已知实现细节包括：

- 检测函数默认 `min_scene_len=15` 帧
- 主程序运行时使用 `cutscene_threshold=25`
- 主程序运行时使用 `max_cutscene_len=5`

### 4.3 兜底硬切规则
这一阶段最值得借鉴的点不是镜头检测本身，而是它加了一个**硬切兜底规则**：

- 如果相邻检测边界之间的时长超过 `(max_cutscene_len + 2) * fps`
- 则按 `max_cutscene_len * fps` 继续递归硬切

这意味着：

- 即使 cut detector 漏掉了 fade in / fade out
- 即使视频几乎没有明显剪辑点
- 过长片段也不会直接流入后续事件拼接阶段

工程上，这一步体现的是一种很稳的策略：

- 宁可先切得碎一点
- 也不要一开始就漏掉潜在边界

对于算子化设计来说，这一阶段可以被抽象为：

- `boundary_proposal`

### 4.4 工程含义
这一阶段的目标是**候选边界召回率优先**，而不是最终最优分段质量优先。

原因是：

- 漏掉边界，后面通常补不回来
- 候选边界过多，后面还可以拼回去

这是 Panda-70M splitting 里非常关键的设计哲学。

## 5. 阶段二：事件拼接

### 5.1 输入与目标
第二阶段读取 `cutscene_frame_idx.json`，把镜头级候选段进一步整理成语义级 event。

核心脚本：

- `event_stitching.py`

它是整个 splitting 目录中最核心的逻辑。

### 5.2 依赖与运行环境
该脚本在实现上依赖：

- ImageBind
- torch
- torchvision
- scenedetect
- opencv-python

脚本内部设备默认写成：

- `cuda`

这说明该实现偏研究代码风格，而不是生产级算子风格。

### 5.3 片段表征策略
Panda-70M 这里采取的表示方式非常轻：

- 对每个 cutscene 只取两帧
- 一帧靠近开头
- 一帧靠近结尾

具体索引写法为：

- 开头帧：`0.95 * start + 0.05 * (end - 1)`
- 结尾帧：`0.05 * start + 0.95 * (end - 1)`

之后：

- resize 到 `224 x 224`
- 做标准化
- 输入 ImageBind 的 `VISION` 模态
- 得到 `1024` 维视觉特征

此外，它还用：

- `Pool(8)` 并行读帧
- 每批最多处理 `128` 个 cutscene

### 5.4 第一层验证：verify_cutscene
在真正做 event merge 前，Panda-70M 先对候选 cutscene 做筛选。

逻辑是：

- 比较首帧特征和尾帧特征的欧氏距离
- 如果首尾帧加载失败，则丢弃
- 如果首尾差异过大，则丢弃

相关阈值：

- 函数默认 `transition_threshold=0.8`
- 主程序实际使用 `1.0`

它背后的假设是：

- 一个好的候选段内部应当相对稳定
- 如果一段的头尾差异太大，说明这个 cutscene 本身已经混入了跨场景内容

这一步可以抽象为：

- `segment_repr`
- `segment_verify` 的候选级子步骤

### 5.5 第二层拼接：cutscene_stitching
在验证通过后，脚本执行真正的邻接拼接。

规则非常明确：

1. 只比较**相邻段**
2. 如果当前 cutscene 与上一个 event 在时间上不连续，则直接开新 event
3. 如果连续，则比较：
   上一个 event 最后一个特征 vs 当前 cutscene 第一个特征
4. 如果欧氏距离大于 `eventcut_threshold`，则断开
5. 否则合并到当前 event

主程序中的 `eventcut_threshold` 为：

- `0.6`

这一阶段不做全局聚类，不追求全局最优，而是把整条视频看成一个线性序列，只做**局部邻接 merge**。

它的工程优势非常明显：

- 复杂度低
- 内存占用稳定
- 容易流式处理
- 非常适合长视频预处理

这一阶段可以抽象为：

- `adjacent_merge`

## 6. 阶段三：事件级质量控制

### 6.1 verify_event 的作用
Panda-70M 在 cutscene 拼接成 event 后，还会再做一轮 event 级验证。

主要规则包括：

- 去掉过短事件
- 去掉“首尾差异太小”的静止事件
- 计算事件平均特征，与历史保留事件比较，去掉冗余 event
- 对过长事件做截断
- 按比例 trim 头尾

### 6.2 当前脚本中的参数策略
值得注意的是，Panda-70M README 明确说明他们改过参数以获得“更好的 splitting 结果”，而不是完全使用原始数据采集配置。

当前主程序实际使用的是一个更宽松的设置：

- `min_event_len=2.0`
- `max_event_len=1200`
- `redundant_event_threshold=0.0`
- `trim_begin_last_percent=0.0`
- `still_event_threshold=0.15`

而注释掉的另一套参数更接近原始数据集构建风格，例如：

- 60 秒事件上限
- 0.3 冗余阈值
- 10% 头尾裁剪

这说明一个非常重要的工程原则：

- **算子逻辑**
- **策略 profile**

应该分开管理。

也就是说，Panda-70M 这套 splitting 最值得学的，不是某个具体阈值，而是：

- 同一套切分逻辑
- 可以挂不同 profile
- 面向不同目标做参数化运行

这一阶段可以抽象为：

- `segment_verify`

## 7. 阶段四：片段物化

### 7.1 video_splitting.py 的角色
第三个脚本 `video_splitting.py` 非常薄，它并不参与边界决策，只负责把 `event_timecode.json` 里的结果真正导出为短视频。

流程为：

- 读取 `event_timecode.json`
- 将 timecode 转成开始时间和结束时间
- 计算持续时长
- 调用 `ffmpeg -ss ... -t ... -i ...`
- 输出到 `outputs/`

### 7.2 工程含义
这一步的核心意义在于：

- 前两步只产生 metadata
- 最后一步才是 materialization

这是一种很好的算子化实践，因为：

- 调参容易
- 回放和审核容易
- 可先离线评测切分决策，再决定是否物化成视频文件

这一阶段可以抽象为：

- `materialize`

## 8. Panda-70M 划分算子的工程抽象
如果把 Panda-70M splitting 重写成一个更抽象的 A1 系列算子，可以定义为：

### Operator name
`Hierarchical Semantic Video Split Operator`

### Input
- `video`

### Output
- `[{start, end, score, metadata}]`
- 或者 `clips + metadata`

### Internal stages
1. `boundary_proposal`
2. `segment_repr`
3. `adjacent_merge`
4. `segment_verify`
5. `materialize`（可选）

这个命名不是 Panda-70M 仓库中的原词，而是基于其三脚本结构、JSON 中间结果和参数组织方式做出的工程化抽象。

## 9. 对当前算子系统的直接启发

### 9.1 Proposal + Merge + Verify 三层设计
Panda-70M 最值得借鉴的地方，是不要把“划分”理解成一次性找最终边界的问题，而是拆成：

- proposal
- merge
- verify

这种层次化拆法通常比单一阈值切分更可控，也更适合系统化实现。

### 9.2 边界层与语义层解耦
在 Panda-70M 里：

- PySceneDetect 负责边界候选
- ImageBind 负责语义邻接判断

这说明 A1 算子的内部完全可以拆成：

- 结构信号层
- 语义信号层
- 验证层

后续要升级时，只需要替换局部模块，而不必重写整条链路。

### 9.3 片段表示可以先轻后重
Panda-70M 只取每段首尾两帧做特征，这个设计虽然朴素，但工程上极强：

- 吞吐高
- 批处理友好
- 缓存容易
- 适合长视频预处理

这提示当前算子系统可以先实现轻表征版 A1，再逐步升级成多帧池化、短视频编码或多模态联合表征。

### 9.4 输出优先 metadata，而不是直接输出 mp4
Panda-70M 先输出 `cutscene_frame_idx.json` 和 `event_timecode.json`，最后才 ffmpeg 切片。

这说明更合理的算子输出顺序应该是：

- 先输出切分决策
- 再决定是否做物化执行

### 9.5 参数策略要版本化
Panda-70M 的脚本和 README 已经体现出“参数 profile”和“核心逻辑”分离的必要性。

对于正式算子系统，更合理的做法是把参数策略拆成：

- `dataset_profile`
- `retrieval_profile`
- `caption_profile`
- `live_profile`

## 10. 推荐的子算子拆分
如果后续要把这一思路进一步拆成当前系统可复用的子算子，推荐拆成：

- `BoundaryProposalOp`
- `SegmentEmbeddingOp`
- `AdjacentMergeOp`
- `EventVerifyOp`
- `ClipMaterializeOp`

这样不同任务场景就能复用同一套切分骨架，只替换：

- proposal 策略
- embedding 策略
- verify 策略

## 11. 生产化改造注意事项
Panda-70M 当前 splitting 目录更接近研究代码，而不是直接可上生产的算子实现。主要问题包括：

- `event_stitching.py` 设备写死为 `cuda`
- 使用 `video_path.split("/")[-1]` 作为 JSON key，存在同名视频冲突风险
- 导出阶段通过 `os.system` 调 ffmpeg
- 脚本以串联方式运行，而不是库式 API

如果把它改造成正式算子，建议补齐：

- ID 管理
- 设备抽象
- 异常处理
- 评分输出
- 参数 profile
- 流式接口

## 12. 一句话总结
Panda-70M splitting 最值得借鉴的，不是某个具体阈值，而是它的层次化设计哲学：

- 先高召回地产生候选切点
- 再用轻量语义表示做邻接拼接
- 最后用规则验证事件质量
- 并把切分决策元数据和物化执行彻底分开

这套思路非常适合抽象成通用视频划分算子，也是当前 A1 系列算子设计中最值得保留的参考范式之一。

## 13. 参考
- [Panda-70M/splitting 目录](https://github.com/snap-research/Panda-70M/tree/main/splitting)
- [cutscene_detect.py](https://github.com/snap-research/Panda-70M/blob/main/splitting/cutscene_detect.py)
- [event_stitching.py](https://github.com/snap-research/Panda-70M/blob/main/splitting/event_stitching.py)
- [video_splitting.py](https://github.com/snap-research/Panda-70M/blob/main/splitting/video_splitting.py)
