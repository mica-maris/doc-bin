import {
  parseDoc,
  type ParseResult,
  type ParseStatus,
  type ParseWarning,
} from '@docbin/core';
import {
  computed,
  defineComponent,
  h,
  onBeforeUnmount,
  ref,
  watch,
  type PropType,
} from 'vue';

/** 二进制、本地文件，或可 fetch 的远程/相对 URL */
export type DocSource =
  | ArrayBuffer
  | Uint8Array
  | File
  | Blob
  | string
  | null;

export type DocFetchOptions = RequestInit;

function isAllowedUrl(url: string): boolean {
  if (/^https?:\/\//i.test(url)) return true;
  // 相对路径（无 scheme）；拒绝 javascript: / data: 等
  return !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url);
}

function fetchErrorResult(err: unknown): ParseResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    status: 'error',
    warnings: [],
    unsupported: [],
    error: { code: 'FETCH_FAILED', message },
  };
}

async function toBytes(
  source: DocSource,
  fetchOptions?: DocFetchOptions,
): Promise<Uint8Array | null> {
  if (!source) return null;
  if (typeof source === 'string') {
    const url = source.trim();
    if (!url) return null;
    if (!isAllowedUrl(url)) {
      throw new Error('仅支持 http(s) 或相对路径的远程地址');
    }
    let res: Response;
    try {
      res = await fetch(url, { credentials: 'omit', ...fetchOptions });
    } catch {
      throw new Error('无法下载远程文件（网络错误或 CORS 被拦截）');
    }
    if (!res.ok) {
      throw new Error(`下载失败：HTTP ${res.status}`);
    }
    return new Uint8Array(await res.arrayBuffer());
  }
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

export const DocPreview = defineComponent({
  name: 'DocPreview',
  props: {
    source: {
      type: [Object, String, null] as unknown as PropType<DocSource>,
      default: null,
    },
    password: { type: String, default: undefined },
    /** 传给 fetch 的选项（如 headers / credentials）；默认 credentials: 'omit' */
    fetchOptions: {
      type: Object as PropType<DocFetchOptions>,
      default: undefined,
    },
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
      loading.value = true;
      try {
        const bytes = await toBytes(props.source, props.fetchOptions);
        if (id !== seq) return;
        if (!bytes) {
          result.value = null;
          return;
        }
        const parsed = await parseDoc(bytes, { password: props.password });
        if (id !== seq) return;
        result.value = parsed;
        emit('parsed', parsed);
      } catch (err) {
        if (id !== seq) return;
        const parsed = fetchErrorResult(err);
        result.value = parsed;
        emit('parsed', parsed);
      } finally {
        if (id === seq) loading.value = false;
      }
    }

    watch(
      () => [props.source, props.password, props.fetchOptions] as const,
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
          { class: 'docbin-vue docbin-idle' },
          slots.empty?.() ?? '选择或传入 .doc 文件以预览',
        );
      }
      if (status.value === 'loading') {
        return h('div', { class: 'docbin-vue docbin-loading' }, '解析中…');
      }
      const r = result.value!;
      if (r.status === 'error') {
        return h('div', { class: 'docbin-vue docbin-error', role: 'alert' }, [
          h('strong', '无法打开文档'),
          h('p', r.error?.message ?? '未知错误'),
        ]);
      }
      if (r.status === 'unsupported') {
        return h('div', { class: 'docbin-vue docbin-unsupported' }, [
          h('strong', '当前无法安全展示套表'),
          h(
            'p',
            r.unsupported
              .map((u: ParseWarning) => u.message)
              .join('；') || '请下载原文件查看',
          ),
          r.plainText
            ? h('pre', { class: 'docbin-plain' }, r.plainText)
            : null,
        ]);
      }
      return h('div', { class: 'docbin-vue' }, [
        r.status === 'partial'
          ? h(
              'div',
              { class: 'docbin-warn', role: 'status' },
              [
                '部分构造已近似或跳过：',
                r.warnings
                  .filter((w: ParseWarning) => w.code !== 'ENGINE_DOC_CODEC')
                  .map((w: ParseWarning) => w.message)
                  .join('；') || '见 warnings',
              ],
            )
          : null,
        h('div', {
          class: 'docbin-html',
          innerHTML: r.html ?? '',
        }),
      ]);
    };
  },
});
