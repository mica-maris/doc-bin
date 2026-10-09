# 产品设计：msdoc-form

## 一句话

做「公文套表优先」的开源 `.doc` 引擎：先解析成可测 AST，再挂 Vue/React 渲染；能力写进矩阵，做不到就降级。

## 用户是谁

1. 管理端 / 表单系统开发者：要在浏览器预览单位上传的旧 `.doc` 申请表  
2. 工具作者：只要 AST，自己画 UI  
3. 需要回归样例的贡献者：用公开 fixture 验证边界

## 保真档位（已锁定）

| 项 | 决策 |
|----|------|
| 档位 | **B · 观感像**（边框、对齐、行高、页边距尽量接近 Word；非打印级 1:1） |
| 样张范围 | **公文套表**（封面 / 说明页 / 复杂表）；非任意 `.doc` |
| 技术路径 | **纯前端** AST → HTML/CSS；不做服务端转 PDF 主路径 |

## 核心体验（成功标准）

1. **套表观感**：约定 fixture 上，合并格/竖排结构正确，且边框、对齐、行高、页边距肉眼可接受；残余偏差写入 `warnings`，不静默吞掉  
2. **边界诚实**：文本框/浮动对象等矩阵外构造不装作成功——`partial` / `unsupported` + 可读原因，渲染层可降级  
3. **可回归**：至少 3 类套表样例有 AST 快照；M3+ 对关键样张做视觉对照（截图或手工对照清单）

## 非目标（v0）

- 打印级 DPI / 像素级 1:1 Word  
- 任意 `.doc`（艺术字、复杂浮动版式、嵌套对象全集）  
- 服务端 LibreOffice/KKFileView 作为预览主路径  
- `.docx`（可另包或后续扩展，不抢主轴）  
- 在线编辑、修订协作  
- 加密 / DRM / ActiveX
## 信息架构

```text
File/ArrayBuffer
  → @msdoc-form/core parseDoc()
  → ParseResult { status, document?, warnings[], unsupported[] }
  → @msdoc-form/vue|react 根据 status 渲染或降级 UI
```

### AST 草图（可演进）

- `Document`：sections（页边距）/ pages / stories  
- `Table`：grid、rowSpan/colSpan、边框、行高、竖排 cell  
- `Paragraph` / `Run`：文本、对齐、基础字符样式  
- `HeaderFooter`：首页/奇偶（能解析多少算多少，写进矩阵）
## 发布策略

- npm scope：`@msdoc-form/*`（若名占用再改 `msdoc-form-*`）  
- `core` 零 UI 依赖；`vue` / `react` peer 依赖对应框架  
- semver：解析 AST 破坏性变更升 major；矩阵「降级」项收紧可 minor

## 里程碑

| 阶段 | 交付 |
|------|------|
| M0 | 仓结构、产品/调研/矩阵文档、占位 API、CI 空跑 |
| M1 | CFB/OLE 打开 + 纯文本抽取 + fixture 冒烟 |
| M2 | 表格模型（合并格）+ 边框/对齐 POC + HTML/CSS 渲染 |
| M3 | 竖排、行高/页边距、分页启发式、页眉页脚尽力而为 + 套表视觉对照 |
| M4 | Vue/React 正式组件 + 降级 UI + 首个 npm 预发布 |

## 风险

- 规格公开但实现细节极多，易无限扩张 → **用矩阵卡住范围**（只对套表追 B 档）  
- 「观感像」主观 → 用固定 fixture + 对照清单 / 后期截图回归收口  
- 真实公文版权 → fixture 必须脱敏或自制仿样  
- 与现有库重叠 → 叙事坚持「套表观感 + 可测 AST」，不卷通用阅读器