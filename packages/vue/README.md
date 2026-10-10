# @docbin/vue

Vue 3 预览组件。安装与完整示例见仓库根目录 **[README.md](../../README.md)**（一页文档）。

```bash
pnpm add @docbin/core @docbin/vue
```

```vue
<script setup lang="ts">
import { DocPreview } from '@docbin/vue';
import { ref } from 'vue';
const source = ref<File | string | null>(null);
</script>
<template>
  <DocPreview :source="source" />
</template>
```

Peer：`vue` ^3.5 · License：MIT
