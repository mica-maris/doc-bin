<script setup lang="ts">
import { DocFormPreview } from '@msdoc-form/vue';
import { onMounted, ref } from 'vue';

const source = ref<File | ArrayBuffer | null>(null);
const fileName = ref('');
const statusNote = ref('');

async function loadSample() {
  const res = await fetch('/samples/form-merge.doc');
  const buf = await res.arrayBuffer();
  source.value = buf;
  fileName.value = 'form-merge.doc（内置样张）';
  statusNote.value = '已加载套表合并格样张';
}

function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  source.value = file;
  fileName.value = file.name;
  statusNote.value = '已选择本地文件';
}

onMounted(() => {
  void loadSample();
});
</script>

<template>
  <div class="shell">
    <h1 class="brand">msdoc-form</h1>
    <p class="lede">
      公文套表优先的纯前端 <code>.doc</code> 预览：合并单元格、边框与页边距尽量贴近 Word 观感；做不到的构造诚实降级。
    </p>

    <div class="actions">
      <button class="btn btn-primary" type="button" @click="loadSample">
        加载样张
      </button>
      <label class="btn">
        打开本地 .doc
        <input
          type="file"
          accept=".doc,application/msword"
          hidden
          @change="onFile"
        />
      </label>
    </div>

    <p v-if="fileName" class="meta">{{ statusNote }} · {{ fileName }}</p>

    <div class="preview">
      <DocFormPreview :source="source" />
    </div>
  </div>
</template>
