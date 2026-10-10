import { describe, expect, it } from 'vitest';
import { renderDocumentHtml } from './renderHtml.js';
import type { DocDocument } from './types.js';

describe('lineSpacing rendering', () => {
  it('uses document lineSpacing multiple when present', () => {
    const doc: DocDocument = {
      sections: [
        {
          pageSize: { widthPt: 595, heightPt: 842 },
          margins: { topPt: 72, rightPt: 72, bottomPt: 72, leftPt: 72 },
          blocks: [
            {
              type: 'paragraph',
              lineSpacing: 1.5,
              runs: [{ text: '1.5倍行距', fontSizePt: 12 }],
            },
          ],
        },
      ],
    };
    const html = renderDocumentHtml(doc);
    expect(html).toContain('line-height: 1.5');
  });

  it('uses file default single spacing (1.0) when lineSpacing omitted', () => {
    const doc: DocDocument = {
      sections: [
        {
          pageSize: { widthPt: 595, heightPt: 842 },
          margins: { topPt: 72, rightPt: 72, bottomPt: 72, leftPt: 72 },
          blocks: [
            {
              type: 'paragraph',
              runs: [{ text: '文件未写行距=单倍', fontSizePt: 12 }],
            },
          ],
        },
      ],
    };
    const html = renderDocumentHtml(doc);
    expect(html).toContain('line-height: 1');
    expect(html).not.toContain('line-height: 1.15');
    expect(html).not.toContain('line-height: 1.35');
  });
});
