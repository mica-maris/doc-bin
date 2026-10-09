import {
  parseDoc,
  type ParseResult,
} from '@msdoc-form/core';
import {
  useEffect,
  useState,
  type ReactNode,
} from 'react';

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

export interface DocFormPreviewProps {
  source: DocFormSource;
  password?: string;
  onParsed?: (result: ParseResult) => void;
  empty?: ReactNode;
}

export function DocFormPreview({
  source,
  password,
  onParsed,
  empty = '选择或传入 .doc 文件以预览',
}: DocFormPreviewProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const bytes = await toBytes(source);
      if (!alive) return;
      if (!bytes) {
        setResult(null);
        return;
      }
      setLoading(true);
      try {
        const parsed = await parseDoc(bytes, { password });
        if (!alive) return;
        setResult(parsed);
        onParsed?.(parsed);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [source, password, onParsed]);

  if (!source && !result) {
    return <div className="msdoc-form-react msdoc-idle">{empty}</div>;
  }
  if (loading) {
    return <div className="msdoc-form-react msdoc-loading">解析中…</div>;
  }
  if (!result) {
    return <div className="msdoc-form-react msdoc-idle">{empty}</div>;
  }
  if (result.status === 'error') {
    return (
      <div className="msdoc-form-react msdoc-error" role="alert">
        <strong>无法打开文档</strong>
        <p>{result.error?.message ?? '未知错误'}</p>
      </div>
    );
  }
  if (result.status === 'unsupported') {
    return (
      <div className="msdoc-form-react msdoc-unsupported">
        <strong>当前无法安全展示套表</strong>
        <p>
          {result.unsupported.map((u) => u.message).join('；')
            || '请下载原文件查看'}
        </p>
        {result.plainText ? (
          <pre className="msdoc-plain">{result.plainText}</pre>
        ) : null}
      </div>
    );
  }

  const warnText = result.warnings
    .filter((w) => w.code !== 'ENGINE_DOC_CODEC')
    .map((w) => w.message)
    .join('；');

  return (
    <div className="msdoc-form-react">
      {result.status === 'partial' ? (
        <div className="msdoc-warn" role="status">
          部分构造已近似或跳过：
          {warnText || '见 warnings'}
        </div>
      ) : null}
      <div
        className="msdoc-html"
        // HTML 由本仓 renderDocumentHtml 生成，非用户原文直出
        dangerouslySetInnerHTML={{ __html: result.html ?? '' }}
      />
    </div>
  );
}
