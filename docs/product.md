# 产品设计：docbin

## 一句话

做开源的通用 `.doc`（Word 97–2003）引擎：浏览器预览以 **WPS / Word 打开效果**为对照金标；先解析成可测 AST，再挂 Vue/React 渲染；能力写进矩阵，做不到就降级。公文套表是强验收样张，不是产品边界。

## 用户是谁

1. 管理端 / 业务系统开发者：要在浏览器预览单位上传的旧 `.doc`  
2. 工具作者：只要 AST，自己画 UI  
3. 需要回归样例的贡献者：用公开 fixture 验证边界

## 保真档位（已更新 · 2026-10-10）

| 项 | 决策 |
|----|------|
| 金标 | **与 WPS（及 Word）打开同一 `.doc` 对照一致**——页数/页界、合并格归属、边框成套、阅读顺序一致 |
| 样张范围 | 以公文套表（封面 / 说明页 / 复杂表）为强验收；可逐步扩一般文档样张 |
| 技术路径 | **纯前端** AST → HTML/CSS；不做服务端转 PDF 主路径 |
| 允许偏差 | 字号/字体替换/亚像素间距可有肉眼可接受的轻微差；须记入 `warnings` 或对照笔记，不静默当成功 |

> 旧锁定「B · 观感像」升格为：**主路径样张上 WPS 对照无 FAIL**。仍非任意 `.doc` 的像素级复刻。

## 核心体验（成功标准）

1. **WPS 对照无 FAIL**：约定样张上，分页、合并格、边框三项对照表不得为 `FAIL`；合并格不得错位到影响阅读理解  
2. **边界诚实**：文本框/浮动对象等矩阵外构造不装作成功——`partial` / `unsupported` + 可读原因  
3. **可回归**：`pnpm compare:wps` + `docs/compare-notes.md`；改分页/表格必须更新对照结论

## 非目标（v0）

- 任意 `.doc`（艺术字、复杂浮动版式、嵌套对象全集）像素级 1:1  
- 服务端 LibreOffice/KKFileView 作为预览主路径  
- `.docx`（可另包或后续扩展，不抢主轴）  
- 在线编辑、修订协作  
- 加密 / DRM / ActiveX

## 信息架构

```text
File/ArrayBuffer
  → @docbin/core parseDoc()
  → ParseResult { status, document?, warnings[], unsupported[] }
  → @docbin/vue|react 根据 status 渲染或降级 UI
  → 人工/脚本：compare:wps 对照 WPS 金标
```

### AST 草图（可演进）

- `DocDocument`：sections（页边距）/ pages / stories  
- `Table`：grid、rowSpan/colSpan、边框、行高、竖排 cell  
- `Paragraph` / `Run`：文本、对齐、基础字符样式  
- `HeaderFooter`：首页/奇偶（能解析多少算多少，写进矩阵）

## 发布策略

- npm scope：`@docbin/*`（组织 [docbin](https://www.npmjs.com/org/docbin)；账号 `mica-maris`）  
- **已上架**：[`@docbin/core`](https://www.npmjs.com/package/@docbin/core) / [`@docbin/vue`](https://www.npmjs.com/package/@docbin/vue) / [`@docbin/react`](https://www.npmjs.com/package/@docbin/react)（当前 **v0.1.12**）  
- `core` 零 UI 依赖；`vue` / `react` peer 依赖对应框架  
- semver：解析 AST 破坏性变更升 major；矩阵「降级」项收紧可 minor  
- 再发版顺序：对齐三包 `version` → `pnpm build` + `pnpm test` → 官方 registry 先发 `core` 再发 `vue` / `react`（`workspace:*` 由 pnpm 改写为真实版本）  
- 本机默认若指向 npmmirror：登录与 publish 须显式 `--registry=https://registry.npmjs.org/`；Granular token 需勾 Bypass 2FA

## 文档与预览落点（2026-10-10）

| 面 | 位置 | 说明 |
|----|------|------|
| 仓介绍 + 用法 | 根 `README.md` | **一页文档**：特色 / 安装 / Vue·React·Core 示例（对标 vue-office 信息密度） |
| 包说明 | `packages/*/README.md` | npm 短页，链回根 README |
| 深度决策 | `docs/` | 矩阵 / 产品 / 对照笔记；不做独立文档站（v0） |
| 在线试玩 | `apps/demo` | playground；GitHub Pages 部署（`/.github/workflows/deploy-demo.yml`） |
| npm 包内 | 仅 `dist` | **不**把 demo 打进 tarball |

门面气质：**playground**（控件显眼）+ 纸面预览为舞台；解析金标仍以 WPS 对照为准，demo 壳不假装能力。

## 里程碑

| 阶段 | 交付 |
|------|------|
| M0–M4 | 已交付 v0.1.x：可解析 + HTML + 组件；**npm 三包已发布**（本地 tgz 仅离线备用） |
| **M5** | **分页对齐 WPS**（表按行拆页；本机私有复杂套表页数与对照工具对齐，待目视收口） |
| **M6** | **合并格观感**（样张 Δ → OK；行列归属零错位） |
| M7 | 竖排 / 页眉页脚按矩阵推进；对照笔记全绿关键项 |

## 风险

- 规格公开但实现细节极多 → **用矩阵 + WPS 对照样张卡住范围**  
- 「一致」主观 → 以 `compare-notes.md` 固定样张结论为准  
- 真实公文版权 → 公司样张仅本机 `fixtures/forms/`，不进开源 Git  
- 与现有库重叠 → 叙事坚持「通用 `.doc` + WPS 金标 + 可测 AST」
