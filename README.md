# docbin

浏览器内预览 Word 97–2003（`.doc`）：`parse → AST → HTML`。以 WPS/Word 打开效果为对照；做不到的构造诚实降级。

> **v0.1.12** · MIT · 二进制层 [doc-codec](https://www.npmjs.com/package/doc-codec)；AST / HTML / Vue·React API 由本仓维护。

| | |
|--|--|
| GitHub | https://github.com/mica-maris/doc-bin |
| Gitee | https://gitee.com/onoye/doc-bin |
| 在线 playground | https://mica-maris.github.io/doc-bin/ （GitHub Pages） |
| npm | [`@docbin/core`](https://www.npmjs.com/package/@docbin/core) · [`@docbin/vue`](https://www.npmjs.com/package/@docbin/vue) · [`@docbin/react`](https://www.npmjs.com/package/@docbin/react)（v0.1.12） |

## 功能特色

- **只做 `.doc`**：专攻 OLE/CFB 旧文档，不做 docx/xlsx/pdf 全家桶
- **传文件就能看**：`File` / `ArrayBuffer` / 远程 URL，同一解析路径
- **框架可选**：只要 AST 用 `@docbin/core`；要组件用 `@docbin/vue` 或 `@docbin/react`
- **诚实降级**：`ok` / `partial` / `unsupported` / `error`，不装成功的错乱版式
- **可对照**：`pnpm compare:wps` + [支持矩阵](./docs/support-matrix.md)

本地试玩：`pnpm demo`。线上试玩见上方 Pages 链接。

## 安装

```bash
# 只要解析 / AST / HTML
pnpm add @docbin/core

# Vue 3 预览组件
pnpm add @docbin/core @docbin/vue

# React 18/19 预览组件
pnpm add @docbin/core @docbin/react
```

| 包 | Peer |
|----|------|
| `@docbin/vue` | `vue` ^3.5 |
| `@docbin/react` | `react` ^18 \|\| ^19 |

本地离线试装：`pnpm pack:all` → `release/*.tgz`（不进 Git）。

## 使用示例

`source` 支持：

| 类型 | 说明 |
|------|------|
| `File` / `Blob` | 本地上传 |
| `ArrayBuffer` / `Uint8Array` | 已有二进制 |
| `string` | `http(s)://…` 或相对路径；走 `fetch`（跨域需 CORS） |
| `null` | 空态占位 |

<details>
<summary><b>Vue 3 · DocPreview</b></summary>

```vue
<script setup lang="ts">
import { DocPreview } from '@docbin/vue';
import { ref } from 'vue';

const source = ref<File | string | null>(null);

function onFile(ev: Event) {
  source.value = (ev.target as HTMLInputElement).files?.[0] ?? null;
}
</script>

<template>
  <input type="file" accept=".doc,application/msword" @change="onFile" />

  <!-- 本地文件 -->
  <DocPreview :source="source" @parsed="(r) => console.log(r.status)" />

  <!-- 或远程 URL（可选 fetchOptions） -->
  <!--
  <DocPreview
    source="https://example.com/sample.doc"
    :fetch-options="{ credentials: 'omit' }"
  />
  -->
</template>
```

| | |
|--|--|
| `source` | 见上表 |
| `password` | 加密文档（尽力） |
| `fetchOptions` | 仅 URL 时传给 `fetch` |
| `@parsed` | `(result: ParseResult) => void` |
| `#empty` | 空态插槽 |

</details>

<details>
<summary><b>React · DocPreview</b></summary>

```tsx
import { DocPreview } from '@docbin/react';
import { useState, type ChangeEvent } from 'react';

export function App() {
  const [source, setSource] = useState<File | string | null>(null);

  function onFile(ev: ChangeEvent<HTMLInputElement>) {
    setSource(ev.target.files?.[0] ?? null);
  }

  return (
    <>
      <input type="file" accept=".doc,application/msword" onChange={onFile} />

      <DocPreview
        source={source}
        onParsed={(r) => console.log(r.status)}
        empty="请选择 .doc 文件"
      />

      {/* 或 source="https://example.com/sample.doc" */}
    </>
  );
}
```

| | |
|--|--|
| `source` | 见上表 |
| `password` | 加密文档（尽力） |
| `fetchOptions` | 仅 URL 时传给 `fetch` |
| `onParsed` | `(result: ParseResult) => void` |
| `empty` | 空态 `ReactNode` |

</details>

<details>
<summary><b>仅 Core · 自己渲染</b></summary>

```ts
import { parseDoc } from '@docbin/core';

const result = await parseDoc(await file.arrayBuffer());
// result.status: 'ok' | 'partial' | 'unsupported' | 'error'
// result.html       — 可直接插入预览
// result.document   — DocDocument AST
// result.warnings / result.unsupported
```

`unsupported` / `error` 时请降级 UI，不要硬渲错乱 HTML。

</details>

### 预览状态 class（便于盖样式）

| class | 含义 |
|-------|------|
| `docbin-idle` / `docbin-loading` | 空态 / 解析中 |
| `docbin-error` / `docbin-unsupported` | 失败 / 不能安全展示 |
| `docbin-warn` | `partial` 警告条 |
| `docbin-html` | 成功时的 HTML 容器 |

## 依赖说明

| 层 | 库 |
|----|-----|
| 二进制 / MS-DOC | [doc-codec](https://www.npmjs.com/package/doc-codec)（MIT） |
| AST → HTML、分页、矩阵 | 本仓 `@docbin/core` |
| UI | `@docbin/vue` / `@docbin/react`（薄封装，无第二套解析） |

## 开发

```bash
pnpm install
pnpm fixtures
pnpm test
pnpm build
pnpm demo          # http://localhost:5173
```

更深的决策与对照笔记（可选读）：

- [支持矩阵](./docs/support-matrix.md)
- [产品决策](./docs/product.md)
- [对照笔记](./docs/compare-notes.md)
- [Fixture 版权](./fixtures/README.md)

## 许可

MIT
