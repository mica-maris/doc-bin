<script setup lang="ts">
import { DocPreview } from '@docbin/vue';
import { computed, onMounted, ref } from 'vue';

type SampleName = 'form-merge.doc' | 'paged.doc';

const source = ref<File | string | null>(null);
const fileName = ref('');
const statusNote = ref('');
const urlInput = ref('');
const activeSample = ref<SampleName | null>(null);
const copied = ref(false);

const installCmd = 'pnpm add @docbin/core @docbin/vue';

const sourceKind = computed(() => {
  if (activeSample.value) return 'sample';
  if (source.value instanceof File) return 'file';
  if (typeof source.value === 'string' && source.value) return 'url';
  return 'idle';
});

function loadSample(name: SampleName = 'form-merge.doc') {
  source.value = `/samples/${name}`;
  activeSample.value = name;
  fileName.value = name;
  statusNote.value =
    name === 'paged.doc' ? '分页样张 · 封面 + 第二页' : '套表样张 · 合并格';
}

function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  source.value = file;
  activeSample.value = null;
  fileName.value = file.name;
  statusNote.value = '本地文件';
  input.value = '';
}

function loadUrl() {
  const url = urlInput.value.trim();
  if (!url) return;
  source.value = url;
  activeSample.value = null;
  fileName.value = url;
  statusNote.value = '远程 URL';
}

async function copyInstall() {
  try {
    await navigator.clipboard.writeText(installCmd);
    copied.value = true;
    window.setTimeout(() => {
      copied.value = false;
    }, 1600);
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  loadSample();
});
</script>

<template>
  <div class="desk">
    <header class="topbar">
      <div class="brand-block">
        <p class="eyebrow">open source · browser-only</p>
        <h1 class="brand">docbin</h1>
        <p class="lede">
          纯前端 <code>.doc</code> 引擎：parse → AST → HTML。
        </p>
      </div>
      <div class="install-card">
        <p class="install-label">装包试一下</p>
        <button class="install-cmd" type="button" :title="installCmd" @click="copyInstall">
          <code>{{ installCmd }}</code>
          <span class="install-hint">{{ copied ? '已复制' : '复制' }}</span>
        </button>
        <p class="install-links">
          <span>@docbin/core · vue · react</span>
          <span class="dot">·</span>
          <span>MIT · v0.1.12</span>
        </p>
      </div>
    </header>

    <section class="console" aria-label="预览控制台">
      <div class="console-row">
        <div class="sample-group" role="group" aria-label="内置样张">
          <button
            class="chip"
            type="button"
            :class="{ active: activeSample === 'form-merge.doc' }"
            @click="loadSample('form-merge.doc')"
          >
            套表样张
          </button>
          <button
            class="chip"
            type="button"
            :class="{ active: activeSample === 'paged.doc' }"
            @click="loadSample('paged.doc')"
          >
            分页样张
          </button>
          <label class="chip chip-file">
            打开本地 .doc
            <input
              type="file"
              accept=".doc,application/msword"
              hidden
              @change="onFile"
            />
          </label>
        </div>

        <form class="url-form" @submit.prevent="loadUrl">
          <label class="sr-only" for="doc-url">远程 .doc URL</label>
          <input
            id="doc-url"
            v-model="urlInput"
            class="url-input"
            type="text"
            placeholder="远程 .doc URL（需 CORS）或 /samples/xxx.doc"
            autocomplete="off"
          />
          <button class="chip chip-go" type="submit">预览 URL</button>
        </form>
      </div>

      <p class="status" :data-kind="sourceKind">
        <span class="status-dot" aria-hidden="true" />
        <span v-if="fileName">{{ statusNote }} · {{ fileName }}</span>
        <span v-else>选择样张、本地文件或 URL 开始预览</span>
      </p>
    </section>

    <main class="stage">
      <div class="stage-glow" aria-hidden="true" />
      <div class="paper-frame">
        <DocPreview :source="source" />
      </div>
    </main>

    <footer class="foot">
      <p>
        本地与远程走同一解析路径。能力边界见仓内
        <code>docs/support-matrix.md</code>。
      </p>
    </footer>
  </div>
</template>
