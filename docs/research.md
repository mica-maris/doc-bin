# 横向 / 纵向调研（摘要）

调研日期：2026-04-09（随实现更新本页）

## 横向：现有方案

| 方案 | 类型 | 套表表现（经验） | 可借鉴 |
|------|------|------------------|--------|
| `@zhenghy/doc-preview` | 纯前端 Vue | 复杂公文套表易乱页/乱表 | Worker、UI 能力全 |
| `@file-viewer/doc` / `msdoc-viewer` | 纯前端解析→HTML | 表格容错在增强，仍非 Word | AST/HTML 拆分思路 |
| KKFileView / LibreOffice | 服务端转 PDF | 套表最稳 | 对照「黄金样张」，不当竞品主轴 |
| mammoth / vue-office | 偏 docx | 不覆盖 `.doc` | 渲染层体验参考 |
| `doc-codec` | 纯前端 MS-DOC codec | 表格合并/边框扎实 | v0.1 二进制层 |

**空白**：公开、可复现的「中文公文套表」fixture + 以表格模型为中心的 AST 与支持矩阵，社区仍薄。

## 纵向：技术路径

1. **容器**：MS-CFB（OLE Compound File）打开 `WordDocument` / `0Table`/`1Table` 流  
2. **文档**：MS-DOC（FIB、CLX/Piece Table、PAPX/CHPX、表格 sprm）  
3. **策略**：先表格拓扑（grid + span + 边框/行列尺寸），再段落对齐与字符样式；页边距/分页/页眉页脚后置  
4. **验证**：fixture 字节级稳定 + AST JSON 快照 + 套表视觉对照（M3+；本机 Word 对照，非服务端转 PDF 主路径）

参考规范（实现时精读，不整页粘贴）：

- [MS-CFB](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-cfb/)  
- [MS-DOC](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-doc/)

## 竞品差异（本仓坚持）

```text
通用阅读器：功能面铺开，套表翻车时用户无预期
docbin：通用 `.doc` 引擎 + 矩阵诚实 + fixture 回归（套表为强验收样张）→ 可预期的失败也好过静默错乱
```

## v0.1 实现备注（2026-10-09）

- **二进制层**：`doc-codec`（MIT）负责 CFB/FIB/Piece Table/PAPX/表格 TAP。  
- **本仓边界**：映射为 `DocDocument` AST、套表 HTML、Vue/React 降级 UI、支持矩阵与 fixture。  
- **竖排**：`document-schema.js` 的 `TextDirection` 仅 `ltr`/`rtl`，中文竖排暂无法从底层可靠取出 → 矩阵标 🟡，CSS 预留。

## 结论

值得开源。金标已升格为：**套表预览与 WPS/Word 对照一致**（纯前端）。  
v0.1.1 本机复杂套表：边框 OK、合并格 Δ、分页 FAIL → 下一刀优先分页（M5）。  
不做任意文档像素级复刻，也不把服务端转 PDF 当预览主路径。
