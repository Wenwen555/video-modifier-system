# 视频算子系统文档

本目录同时作为源码文档目录和 MkDocs 站点配置目录。

当前文档面向的是一套用于 `post-training / instruction tuning` 的视频数据构造系统。它的默认目标不是在线问答推理，而是稳定生成高质量的 LVLM `QA / Grounded QA` 数据集，并保留可追溯的结构骨架、证据链和质量筛查记录。

系统当前默认采用 `structure-first` 主链，同时通过统一中间态兼容：

- `narration / caption -> QA`
- `structure-first -> Q/A/E`
- `QA-first -> post-hoc grounding`

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
