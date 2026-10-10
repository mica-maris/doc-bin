import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { looksLikeDocCfb, parseDoc } from './parseDoc.js';

const fixtures = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/smoke',
);

describe('parseDoc', () => {
  it('rejects empty buffer', async () => {
    const result = await parseDoc(new Uint8Array());
    expect(result.status).toBe('error');
    expect(result.error?.code).toBe('EMPTY_INPUT');
  });

  it('rejects non-CFB bytes', async () => {
    const result = await parseDoc(new TextEncoder().encode('PK\x03\x04'));
    expect(result.status).toBe('error');
    expect(result.error?.code).toBe('NOT_CFB');
  });

  it('detects CFB magic but rejects truncated non-Word CFB head', async () => {
    const cfbHead = new Uint8Array([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0,
    ]);
    expect(looksLikeDocCfb(cfbHead)).toBe(true);
    const result = await parseDoc(cfbHead);
    expect(['error', 'unsupported']).toContain(result.status);
  });

  it('extracts plain text from smoke fixture', async () => {
    const bytes = readFileSync(join(fixtures, 'plain-text.doc'));
    const result = await parseDoc(bytes);
    expect(result.status).toBe('ok');
    expect(result.plainText).toContain('Hello MS-DOC');
    expect(result.plainText).toContain('中文纯文本');
    expect(result.document?.sections[0]?.blocks[0]).toMatchObject({
      type: 'paragraph',
    });
  });

  it('maps merged table cells and borders', async () => {
    const bytes = readFileSync(join(fixtures, 'form-merge.doc'));
    const result = await parseDoc(bytes);
    expect(['ok', 'partial']).toContain(result.status);
    expect(result.plainText).toContain('职工困难补助申请表');
    const table = result.document?.sections[0]?.blocks.find(
      (b) => b.type === 'table',
    );
    expect(table?.type).toBe('table');
    if (table?.type !== 'table') throw new Error('expected table');
    expect(table.columnWidthsPt.length).toBeGreaterThanOrEqual(3);
    const firstRow = table.rows[0];
    expect(firstRow?.cells.some((c) => !c.covered)).toBe(true);
    const unitRow = table.rows[1];
    const merged = unitRow?.cells.find((c) => c.colSpan >= 3);
    expect(merged).toBeTruthy();
    expect(merged?.borders?.top).toBeTruthy();
    expect(result.html).toContain('docbin-table');
    expect(result.html).toContain('colspan=');
  });

  it('splits explicit page breaks into multiple preview pages', async () => {
    const bytes = readFileSync(join(fixtures, 'paged.doc'));
    const result = await parseDoc(bytes);
    expect(['ok', 'partial']).toContain(result.status);
    const blocks = result.document?.sections[0]?.blocks ?? [];
    expect(blocks.some((b) => b.type === 'pageBreak')).toBe(true);
    const pageCount = Number(
      result.html?.match(/data-page-count="(\d+)"/)?.[1] ?? 0,
    );
    // 显式分页 + 表可能另起一页 → 至少 2 页
    expect(pageCount).toBeGreaterThanOrEqual(2);
    expect(result.html).toMatch(/data-page="1"/);
    expect(result.plainText).toContain('封面说明页');
    expect(result.plainText).toContain('第二页');
    expect(result.html).toContain('封面说明页');
    expect(result.html).toContain('第二页');
  });
});
