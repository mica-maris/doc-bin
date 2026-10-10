# @docbin/react

React 预览组件。安装与完整示例见仓库根目录 **[README.md](../../README.md)**（一页文档）。

```bash
pnpm add @docbin/core @docbin/react
```

```tsx
import { DocPreview } from '@docbin/react';

export function App() {
  return <DocPreview source={null} empty="请选择 .doc" />;
}
```

Peer：`react` ^18 \|\| ^19 · License：MIT
