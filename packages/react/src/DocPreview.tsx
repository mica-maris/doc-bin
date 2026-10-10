import {
  parseDoc,
  type ParseResult,
} from '@docbin/core';
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';

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

export interface DocPreviewProps {
  source: DocSource;
  password?: string;
  /** 传给 fetch 的选项（如 headers / credentials）；默认 credentials: 'omit' */
  fetchOptions?: DocFetchOptions;
  onParsed?: (result: ParseResult) => void;
  empty?: ReactNode;
}

export function DocPreview({
  source,
  password,
  fetchOptions,
  onParsed,
  empty = '选择或传入 .doc 文件以预览',
}: DocPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const bytes = await toBytes(source, fetchOptions);
        if (!alive) return;
        if (!bytes) {
          setResult(null);
          return;
        }
        const parsed = await parseDoc(bytes, { password });
        if (!alive) return;
        setResult(parsed);
        onParsed?.(parsed);
      } catch (err) {
        if (!alive) return;
        const parsed = fetchErrorResult(err);
        setResult(parsed);
        onParsed?.(parsed);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [source, password, fetchOptions, onParsed]);

  if (!source && !result) {
    return <div className="docbin-react docbin-idle">{empty}</div>;
  }
  if (loading) {
    return <div className="docbin-react docbin-loading">解析中…</div>;
  }
  if (!result) {
    return <div className="docbin-react docbin-idle">{empty}</div>;
  }
  if (result.status === 'error') {
    return (
      <div className="docbin-react docbin-error" role="alert">
        <strong>无法打开文档</strong>
        <p>{result.error?.message ?? '未知错误'}</p>
      </div>
    );
  }
  if (result.status === 'unsupported') {
    return (
      <div className="docbin-react docbin-unsupported">
        <strong>当前无法安全展示套表</strong>
        <p>
          {result.unsupported.map((u) => u.message).join('；')
            || '请下载原文件查看'}
        </p>
        {result.plainText ? (
          <pre className="docbin-plain">{result.plainText}</pre>
        ) : null}
      </div>
    );
  }

  const warnText = result.warnings
    .filter((w) => w.code !== 'ENGINE_DOC_CODEC')
    .map((w) => w.message)
    .join('；');

  return (
    <div className="docbin-react">
      {result.status === 'partial' ? (
        <div className="docbin-warn" role="status">
          部分构造已近似或跳过：
          {warnText || '见 warnings'}
        </div>
      ) : null}
      <div
        className="docbin-html"
        // HTML 由本仓 renderDocumentHtml 生成，非用户原文直出
        dangerouslySetInnerHTML={{ __html: result.html ?? '' }}
      />
    </div>
  );
}
