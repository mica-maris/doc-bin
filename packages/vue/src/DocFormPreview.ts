import {
  parseDoc,
  type ParseResult,
  type ParseStatus,
} from '@msdoc-form/core';
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
} from 'vue';

export type DocFormSource = ArrayBuffer | Uint8Array | File | Blob | null;

async function toBytes(source: DocFormSource): Promise<Uint8Array | null> {
  if (!source) return null;
  if (source instanceof Uint8Array) return source;
  if (source instanceof ArrayBuffer) return new Uint8Array(source);
  if (typeof File !== 'undefined' && source instanceof File) {
    return new Uint8Array(await source.arrayBuffer());
  }
  if (typeof Blob !== 'undefined' && source instanceof Blob) {
    return new Uint8Array(await source.arrayBuffer());
  }
  return null;
}

export const DocFormPreview = defineComponent({
  name: 'DocFormPreview',
  props: {
    source: {
      type: [Object, null] as unknown as PropType<DocFormSource>,
      default: null,
    },
    password: { type: String, default: undefined },
  },
  emits: {
    parsed: (_result: ParseResult) => true,
  },
  setup(props, { emit, slots }) {
    const loading = ref(false);
    const result = ref<ParseResult | null>(null);
    let seq = 0;

    async function run() {
      const id = ++seq;
      const bytes = await toBytes(props.source);
      if (!bytes) {
        result.value = null;
        return;
      }
      loading.value = true;
      try {
        const parsed = await parseDoc(bytes, { password: props.password });
        if (id !== seq) return;
        result.value = parsed;
        emit('parsed', parsed);
      } finally {
        if (id === seq) loading.value = false;
      }
    }

    watch(
      () => [props.source, props.password] as const,
      () => {
        void run();
      },
      { immediate: true },
    );

    onBeforeUnmount(() => {
      seq += 1;
    });

    const status = computed<ParseStatus | 'idle' | 'loading'>(() => {
      if (loading.value) return 'loading';
      if (!result.value) return 'idle';
      return result.value.status;
    });

    return () => {
      if (status.value === 'idle') {
        return h(
          'div',
          { class: 'msdoc-form-vue msdoc-idle' },
          slots.empty?.() ?? '选择或传入 .doc 文件以预览',
        );
      }
      if (status.value === 'loading') {
        return h('div', { class: 'msdoc-form-vue msdoc-loading' }, '解析中…');
      }
      const r = result.value!;
      if (r.status === 'error') {
        return h('div', { class: 'msdoc-form-vue msdoc-error', role: 'alert' }, [
          h('strong', '无法打开文档'),
          h('p', r.error?.message ?? '未知错误'),
        ]);
      }
      if (r.status === 'unsupported') {
        return h('div', { class: 'msdoc-form-vue msdoc-unsupported' }, [
          h('strong', '当前无法安全展示套表'),
          h(
            'p',
            r.unsupported.map((u) => u.message).join('；') || '请下载原文件查看',
          ),
          r.plainText
            ? h('pre', { class: 'msdoc-plain' }, r.plainText)
            : null,
        ]);
      }
      return h('div', { class: 'msdoc-form-vue' }, [
        r.status === 'partial'
          ? h(
              'div',
              { class: 'msdoc-warn', role: 'status' },
              [
                '部分构造已近似或跳过：',
                r.warnings
                  .filter((w) => w.code !== 'ENGINE_DOC_CODEC')
                  .map((w) => w.message)
                  .join('；') || '见 warnings',
              ],
            )
          : null,
        h('div', {
          class: 'msdoc-html',
          innerHTML: r.html ?? '',
        }),
      ]);
    };
  },
});
