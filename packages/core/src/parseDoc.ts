import {
  DocFormatError,
  DocUnsupportedError,
  isDocBytes,
  readDocContent,
} from 'doc-codec';
import { mapFromDocCodec } from './mapFromDocCodec.js';
import { renderDocumentHtml } from './renderHtml.js';
import type { ParseOptions, ParseResult } from './types.js';

/**
 * 解析 `.doc`（Word 97–2003）为套表优先 AST。
 * v0.1：二进制读取委托 doc-codec（MIT），映射为本仓 FormDocument，并可选输出 HTML。
 */
export async function parseDoc(
  input: ArrayBuffer | Uint8Array,
  options: ParseOptions = {},
): Promise<ParseResult> {
  const bytes = (
    input instanceof Uint8Array ? input : new Uint8Array(input)
  ) as Uint8Array<ArrayBuffer>;

  if (bytes.byteLength === 0) {
    return {
      status: 'error',
      warnings: [],
      unsupported: [],
      error: { code: 'EMPTY_INPUT', message: 'Empty buffer' },
    };
  }

  if (!looksLikeDocCfb(bytes)) {
    return {
      status: 'error',
      warnings: [],
      unsupported: [],
      error: {
        code: 'NOT_CFB',
        message: 'Not an OLE/CFB .doc compound file (or unsupported variant)',
      },
    };
  }

  if (!isDocBytes(bytes)) {
    return {
      status: 'error',
      warnings: [],
      unsupported: [],
      error: {
        code: 'NOT_WORD_DOC',
        message: 'CFB container is not a WordDocument (.doc) stream',
      },
    };
  }

  try {
    const raw = readDocContent(bytes, options.password);
    const mapped = mapFromDocCodec(raw);
    const wantHtml = options.renderHtml !== false;
    const html = wantHtml
      ? renderDocumentHtml(mapped.document, { includeStyleTag: true })
      : undefined;

    if (mapped.unsupported.length > 0 && mapped.document.sections.every((s) => s.blocks.length === 0)) {
      return {
        status: 'unsupported',
        plainText: mapped.plainText || undefined,
        warnings: mapped.warnings,
        unsupported: mapped.unsupported,
      };
    }

    const status =
      mapped.unsupported.length > 0 || mapped.warnings.some((w) =>
        w.code === 'IMAGE_SKIPPED' || w.code === 'BLOCK_UNSUPPORTED',
      )
        ? 'partial'
        : 'ok';

    return {
      status,
      document: mapped.document,
      plainText: mapped.plainText || undefined,
      html,
      warnings: [
        {
          code: 'ENGINE_DOC_CODEC',
          message:
            'Binary layer uses doc-codec; public API/AST/HTML owned by @msdoc-form/core',
        },
        ...mapped.warnings,
      ],
      unsupported: mapped.unsupported,
    };
  } catch (err) {
    if (err instanceof DocUnsupportedError) {
      return {
        status: 'unsupported',
        warnings: [],
        unsupported: [
          {
            code: 'DOC_UNSUPPORTED',
            message: err.message,
          },
        ],
      };
    }
    if (err instanceof DocFormatError) {
      return {
        status: 'error',
        warnings: [],
        unsupported: [],
        error: { code: 'DOC_FORMAT', message: err.message },
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    if (/password|encrypt|obfuscat/i.test(message)) {
      return {
        status: 'unsupported',
        warnings: [],
        unsupported: [
          {
            code: 'ENCRYPTED',
            message: 'Encrypted or password-protected document',
          },
        ],
      };
    }
    return {
      status: 'error',
      warnings: [],
      unsupported: [],
      error: { code: 'PARSE_FAILED', message },
    };
  }
}

/** 同步探测是否可能是 CFB 容器（不保证是合法 Word） */
export function looksLikeDocCfb(input: ArrayBuffer | Uint8Array): boolean {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  return (
    bytes.length >= 8
    && bytes[0] === 0xd0
    && bytes[1] === 0xcf
    && bytes[2] === 0x11
    && bytes[3] === 0xe0
  );
}
