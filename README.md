# msdoc-form

**表格优先**的 Word 97–2003（`.doc`）解析与预览引擎：面向中文公文套表（合并单元格、边框、页边距），诚实降级。

> 状态：**v0.1.0 预发布**。二进制读取委托 [doc-codec](https://www.npmjs.com/package/doc-codec)（MIT）；公开 API / AST / HTML / Vue·React 组件由本仓拥有。

## 定位

| 做 | 不做（至少 v0.x） |
|----|------------------|
| `parse → AST → HTML` 框架无关核心 | 打印级像素 1:1 Word |
| Vue / React 薄渲染层 | VBA / 宏 / ActiveX |
| 套表观感（合并格、边框、对齐、页边距） | 任意艺术字 / 复杂浮动版式 |
| 诚实支持矩阵 + 降级策略 | 静默吞掉解析失败 |
| 公开 fixture 回归 | 依赖服务端转码才能「能用」 |

## 包

| 包 | 说明 |
|----|------|
| `@msdoc-form/core` | `parseDoc` / `renderDocumentHtml` |
| `@msdoc-form/vue` | `<DocFormPreview />` |
| `@msdoc-form/react` | `<DocFormPreview />` |

本地 tarball（无 npm 登录时）：仓库根目录 `release/*.tgz`。

```bash
pnpm install
pnpm fixtures
pnpm test
pnpm build
pnpm pack:all
pnpm demo          # http://localhost:5173
```

```ts
import { parseDoc } from '@msdoc-form/core';

const result = await parseDoc(await file.arrayBuffer());
// result.status: ok | partial | unsupported | error
// result.html   — 可直接插入预览
// result.document — 套表 AST
```

## 支持矩阵

见 [docs/support-matrix.md](./docs/support-matrix.md)。产品决策见 [docs/product.md](./docs/product.md)。

## 许可

MIT
