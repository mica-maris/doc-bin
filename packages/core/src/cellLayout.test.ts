import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseDoc } from './parseDoc.js';
import { renderDocumentHtml } from './renderHtml.js';
import type { DocDocument, Paragraph, Table } from './types.js';

/**
 * 本机私有样张（gitignore）。开发者可复制为：
 *   fixtures/forms/private-grid.doc
 */
const privateForm = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/forms/private-grid.doc',
);

const hasPrivate = existsSync(privateForm);

describe('table cell layout width', () => {
  it.skipIf(!hasPrivate)(
    'does not invent horizontal cell padding',
    async () => {
      const r = await parseDoc(readFileSync(privateForm));
      expect(r.html).toMatch(/docbin-td[^>]*padding: 0/);
      expect(r.html).not.toMatch(/docbin-td[^>]*padding: 2pt 4pt/);
    },
  );

  it('maps negative paragraph indent to margin (padding cannot be negative)', () => {
    const para: Paragraph = {
      type: 'paragraph',
      runs: [{ text: '负缩进单元格排版测试', fontSizePt: 12 }],
      align: 'justify',
      indentLeftPt: -3.4,
      indentRightPt: -3.4,
      indentFirstLinePt: 23.8,
    };
    const table: Table = {
      type: 'table',
      columnWidthsPt: [372],
      rows: [
        {
          cells: [
            {
              blocks: [para],
              colSpan: 1,
              rowSpan: 1,
              widthPt: 372,
            },
          ],
        },
      ],
    };
    const doc: DocDocument = {
      sections: [
        {
          blocks: [table],
          pageSize: { widthPt: 595, heightPt: 842 },
          margins: { topPt: 72, rightPt: 72, bottomPt: 72, leftPt: 72 },
        },
      ],
    };
    const html = renderDocumentHtml(doc);
    expect(html).toContain('margin-left: -3.4pt');
    expect(html).toContain('margin-right: -3.4pt');
    expect(html).toContain('text-indent: 23.8pt');
    expect(html).not.toMatch(/padding-left: -3\.4pt/);
  });
});

describe.skipIf(!hasPrivate)('cover letter-spacing (private fixture)', () => {
  it('emits title/issuer letter-spacing when file has no inter-char spaces', async () => {
    const r = await parseDoc(readFileSync(privateForm));
    expect(r.html).toContain('docbin-cover-title');
    expect(r.html).toContain('docbin-cover-issuer');
    expect(r.html).toMatch(/letter-spacing:\s*12pt/);
    expect(r.html).toMatch(/letter-spacing:\s*18pt/);
  });
});
