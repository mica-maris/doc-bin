# @docbin/core

[![npm](https://img.shields.io/npm/v/@docbin/core.svg)](https://www.npmjs.com/package/@docbin/core)

框架无关：`parseDoc` → AST / HTML。安装与完整示例见仓库根目录 **[README.md](../../README.md)**（一页文档）。

```bash
pnpm add @docbin/core
```

```ts
import { parseDoc } from '@docbin/core';
const result = await parseDoc(await file.arrayBuffer());
```

能力边界：[docs/support-matrix.md](../../docs/support-matrix.md) · License：MIT
