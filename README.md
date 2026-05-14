# 视频算子系统文档

本目录同时作为源码文档目录和 MkDocs 站点配置目录。

本文档以 AscendDataForge 当前代码为准，描述 `multimodal_data_processor.operations` 中已经注册的视频算子。A1-A10 对应主链路中的 10 个视频数据构造算子；`video_loading`、`video_saving`、`video_resize_aspect_ratio` 是已注册的视频 I/O 或通用增强算子，但不纳入 A 编号主链。

当前实现的默认执行模型是：算子接收 `MultimodalDataset`，在 `execute()` 或 `filter()` 中通过 `dataset.map(...)` 逐行读取字典字段并写回结果字段。文档中的字段、参数和模式均按当前源码的 `PARAMS_SCHEMA` 与方法实现校准。

## 已对齐的实现目录

- A1/A3/A4/A5/A6/A7/A8/A9：`AscendDataForge/multimodal_data_processor/operations/augmentation/`
- A2/A10：`AscendDataForge/multimodal_data_processor/operations/filtering/`
- 注册表：`AscendDataForge/multimodal_data_processor/core/operation_registry.py`

## 目录结构

- `index.md`
- `00-总览/`
- `01-算子定义/`
- `02-预设管线/`
- `03-文献支撑/`
- `99-归档/`

## 本地预览

```powershell
python -m mkdocs serve -f "算子系统/mkdocs.yml"
```

## 构建站点

```powershell
python -m mkdocs build -f "算子系统/mkdocs.yml"
```
