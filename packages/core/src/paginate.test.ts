import { describe, expect, it } from 'vitest';
import {
  canBreakAfterRow,
  findTableRowEnd,
  paginateSection,
} from './paginate.js';
import type { Section, Table } from './types.js';

function para(text: string) {
  return {
    type: 'paragraph' as const,
    runs: [{ text, fontSizePt: 12 }],
  };
}

describe('paginateSection', () => {
  it('splits on explicit pageBreak', () => {
    const section: Section = {
      pageSize: { widthPt: 595.3, heightPt: 841.9 },
      margins: { topPt: 56.7, rightPt: 56.7, bottomPt: 56.7, leftPt: 56.7 },
      blocks: [para('page1'), { type: 'pageBreak' }, para('page2')],
    };
    const pages = paginateSection(section);
    expect(pages).toHaveLength(2);
    expect(pages[0]?.blocks).toHaveLength(1);
    expect(pages[1]?.blocks).toHaveLength(1);
    expect(pages[1]?.explicitBreakBefore).toBe(true);
  });

  it('splits tall tables across pages by rows', () => {
    const rows = Array.from({ length: 40 }, (_, i) => ({
      heightPt: 40,
      cells: [
        {
          rowSpan: 1,
          colSpan: 1,
          blocks: [para(`R${i}`)],
        },
      ],
    }));
    const table: Table = {
      type: 'table',
      columnWidthsPt: [400],
      rows,
    };
    const section: Section = {
      pageSize: { widthPt: 595.3, heightPt: 400 },
      margins: { topPt: 36, rightPt: 36, bottomPt: 36, leftPt: 36 },
      blocks: [table],
    };
    const pages = paginateSection(section);
    expect(pages.length).toBeGreaterThan(1);
    const rowCount = pages.reduce((n, p) => {
      const t = p.blocks.find((b) => b.type === 'table');
      return n + (t && t.type === 'table' ? t.rows.length : 0);
    }, 0);
    expect(rowCount).toBe(40);
    // 每页应是表片段而非整表
    for (const p of pages) {
      const t = p.blocks.find((b) => b.type === 'table');
      if (t && t.type === 'table') {
        expect(t.rows.length).toBeLessThan(40);
      }
    }
  });

  it('keeps title and fitting table on one page', () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({
      heightPt: 40,
      cells: [
        {
          rowSpan: 1,
          colSpan: 1,
          blocks: [para(`R${i}`)],
        },
      ],
    }));
    const section: Section = {
      pageSize: { widthPt: 595.3, heightPt: 842 },
      margins: { topPt: 72, rightPt: 72, bottomPt: 72, leftPt: 72 },
      blocks: [
        {
          type: 'paragraph',
          align: 'center',
          runs: [{ text: '变更登记申请表', fontSizePt: 18 }],
        },
        {
          type: 'table',
          columnWidthsPt: [400],
          rows,
        },
        para('注：测试说明一行'),
      ],
    };
    const pages = paginateSection(section);
    expect(pages).toHaveLength(1);
    expect(pages[0]?.blocks.some((b) => b.type === 'table')).toBe(true);
    expect(
      pages[0]?.blocks.some(
        (b) => b.type === 'paragraph' && b.runs[0]?.text.includes('变更'),
      ),
    ).toBe(true);
  });

  it('does not break inside vertical merges', () => {
    const table: Table = {
      type: 'table',
      columnWidthsPt: [100, 100],
      rows: [
        {
          heightPt: 50,
          cells: [
            { rowSpan: 2, colSpan: 1, blocks: [para('span')] },
            { rowSpan: 1, colSpan: 1, blocks: [para('a')] },
          ],
        },
        {
          heightPt: 50,
          cells: [
            { rowSpan: 1, colSpan: 1, covered: true, blocks: [] },
            { rowSpan: 1, colSpan: 1, blocks: [para('b')] },
          ],
        },
        {
          heightPt: 50,
          cells: [
            { rowSpan: 1, colSpan: 1, blocks: [para('c')] },
            { rowSpan: 1, colSpan: 1, blocks: [para('d')] },
          ],
        },
      ],
    };
    expect(canBreakAfterRow(table, 0)).toBe(false);
    expect(canBreakAfterRow(table, 1)).toBe(true);
    const fit = findTableRowEnd(table, 0, 60, 400);
    // 60pt 装不下两行合并，应至少走到可断点或单行溢出
    expect(fit.endRow).toBeGreaterThanOrEqual(1);
  });
});
