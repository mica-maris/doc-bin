import type {
  Block,
  DocumentGrid,
  PageMargins,
  PageSize,
  Section,
  Table,
  TableRow,
} from './types.js';

export interface LogicalPage {
  blocks: Block[];
  pageSize: PageSize;
  margins: PageMargins;
  /** 节文档网格（随节透传，供渲染行高） */
  documentGrid?: DocumentGrid;
  /** 内容估算高度超过页芯，本页可能视觉溢出 */
  overflow?: boolean;
  /** 显式分页符切开 */
  explicitBreakBefore?: boolean;
}

const DEFAULT_PAGE: PageSize = { widthPt: 595.3, heightPt: 841.9 };
const DEFAULT_MARGINS: PageMargins = {
  topPt: 56.7,
  rightPt: 56.7,
  bottomPt: 56.7,
  leftPt: 56.7,
};

/** 页脚占位，避免表尾行顶到页码（对标 WPS 页尾切页） */
const PAGE_FOOTER_RESERVE_PT = 28;

function contentBox(pageSize: PageSize, margins: PageMargins) {
  return {
    widthPt: Math.max(
      72,
      pageSize.widthPt - margins.leftPt - margins.rightPt,
    ),
    heightPt: Math.max(
      72,
      pageSize.heightPt
        - margins.topPt
        - margins.bottomPt
        - PAGE_FOOTER_RESERVE_PT,
    ),
  };
}

function paragraphText(block: Extract<Block, { type: 'paragraph' }>): string {
  return block.runs.map((r) => r.text).join('');
}

function isEmptyParagraph(block: Block): boolean {
  return block.type === 'paragraph' && !paragraphText(block).trim();
}

function hasNonEmptyContent(blocks: Block[]): boolean {
  return blocks.some((b) => {
    if (b.type === 'table') return b.rows.length > 0;
    if (b.type === 'pageBreak') return false;
    return Boolean(paragraphText(b).trim());
  });
}

/** 说明页起点：与封面拆开（对标 WPS） */
function isInstructionsHeading(block: Block): boolean {
  if (block.type !== 'paragraph') return false;
  const t = paragraphText(block).replace(/\s+/g, '');
  return /填表与登记说明|填表说明/.test(t);
}

function estimateParagraphHeightPt(
  block: Extract<Block, { type: 'paragraph' }>,
  contentWidthPt: number,
  gridLinePitchPt?: number,
): number {
  const text = paragraphText(block);
  const trimmed = text.trim();
  const fontSize = Math.max(
    10,
    ...block.runs.map((r) => r.fontSizePt ?? 12),
    12,
  );
  const before = block.spacingBeforePt ?? 0;
  const after = block.spacingAfterPt ?? (trimmed ? 3 : 0);
  // 空段不套文档网格：封面空段在渲染里会收成 spacer，按网格估高会假增页
  if (!trimmed) {
    const emptyH =
      fontSize
      * (typeof block.lineSpacing === 'number' && block.lineSpacing > 0
        ? block.lineSpacing
        : 1);
    return before + after + emptyH;
  }

  // 有内容：文档网格 pitch（pt/行）优先；否则倍数；否则单倍
  const lineH =
    typeof gridLinePitchPt === 'number' && gridLinePitchPt > 0
      ? gridLinePitchPt
      : fontSize
        * (typeof block.lineSpacing === 'number' && block.lineSpacing > 0
          ? block.lineSpacing
          : 1);

  const avgChar = fontSize * 0.92;
  const charsPerLine = Math.max(1, Math.floor(contentWidthPt / avgChar));
  const lines = Math.max(1, Math.ceil(text.length / charsPerLine));
  return before + after + lines * lineH;
}

function cellContentWidthPt(
  table: Table,
  row: TableRow,
  cellIndex: number,
): number {
  const cell = row.cells[cellIndex];
  if (!cell) return 40;
  const span = Math.max(1, cell.colSpan || 1);
  let width = 0;
  for (let i = 0; i < span; i++) {
    width += table.columnWidthsPt[cellIndex + i] ?? cell.widthPt ?? 40;
  }
  return Math.max(width, 12);
}

/**
 * 单行高度：公文套表优先采用文件声明行高（WPS 密集表）。
 * 无声明时再按单元格内容估算。
 */
export function estimateRowHeightPt(
  table: Table,
  rowIndex: number,
  _contentWidthPt: number,
): number {
  const row = table.rows[rowIndex];
  if (!row) return 22;

  const declared =
    typeof row.heightPt === 'number' && row.heightPt > 0 ? row.heightPt : 0;

  let contentH = 0;
  row.cells.forEach((cell, ci) => {
    if (cell.covered) return;
    const cellW = cellContentWidthPt(table, row, ci);
    const inner = cell.blocks.reduce((sum, b) => {
      if (b.type === 'pageBreak') return sum;
      if (b.type === 'paragraph') {
        return sum + estimateParagraphHeightPt(b, cellW);
      }
      return sum + estimateBlockHeightPt(b, cellW);
    }, 0);
    contentH = Math.max(contentH, inner + 4);
  });

  // 套表行高以文件声明为准（对标 WPS 密集表）；无声明再用内容估
  if (declared > 0) return declared;
  return Math.max(contentH, 18);
}

/** 在 rowIndex 行结束后是否可安全分页（无跨页 rowspan） */
export function canBreakAfterRow(table: Table, rowIndex: number): boolean {
  if (rowIndex < 0 || rowIndex >= table.rows.length - 1) return true;
  for (let r = 0; r <= rowIndex; r++) {
    const row = table.rows[r];
    if (!row) continue;
    for (const cell of row.cells) {
      if (cell.covered) continue;
      const span = Math.max(1, cell.rowSpan || 1);
      if (r + span - 1 > rowIndex) return false;
    }
  }
  return true;
}

function sliceTable(table: Table, startRow: number, endRow: number): Table {
  return {
    type: 'table',
    columnWidthsPt: table.columnWidthsPt,
    rows: table.rows.slice(startRow, endRow),
  };
}

/** 启发式块高（非打印 DPI；用于拆页） */
export function estimateBlockHeightPt(
  block: Block,
  contentWidthPt: number,
  gridLinePitchPt?: number,
): number {
  if (block.type === 'pageBreak') return 0;
  if (block.type === 'paragraph') {
    return estimateParagraphHeightPt(block, contentWidthPt, gridLinePitchPt);
  }
  let total = 0;
  for (let i = 0; i < block.rows.length; i++) {
    total += estimateRowHeightPt(block, i, contentWidthPt);
  }
  return total || 24;
}

/** 去掉块序列尾部纯空段，避免「空白页」 */
function trimTrailingEmpties(blocks: Block[]): Block[] {
  let end = blocks.length;
  while (end > 0 && isEmptyParagraph(blocks[end - 1]!)) end -= 1;
  return blocks.slice(0, end);
}

function splitByExplicitBreaks(blocks: Block[]): {
  blocks: Block[];
  explicitBreakBefore: boolean;
}[] {
  const chunks: { blocks: Block[]; explicitBreakBefore: boolean }[] = [
    { blocks: [], explicitBreakBefore: false },
  ];
  for (const block of blocks) {
    if (block.type === 'pageBreak') {
      chunks.push({ blocks: [], explicitBreakBefore: true });
      continue;
    }
    chunks[chunks.length - 1]!.blocks.push(block);
  }
  return chunks.map((c) => ({
    ...c,
    blocks: trimTrailingEmpties(c.blocks),
  }));
}

/**
 * 在不超过 maxHeight 的前提下，从 startRow 起尽可能多装行。
 * 返回 endRow（不含）；至少包含 1 行（即使单行溢出）。
 */
export function findTableRowEnd(
  table: Table,
  startRow: number,
  maxHeight: number,
  contentWidthPt: number,
): { endRow: number; height: number; overflow: boolean } {
  const n = table.rows.length;
  if (startRow >= n) return { endRow: startRow, height: 0, overflow: false };

  let used = 0;
  let end = startRow;

  while (end < n) {
    const h = estimateRowHeightPt(table, end, contentWidthPt);
    if (end > startRow && used + h > maxHeight) break;
    used += h;
    end += 1;
    if (h > maxHeight && end === startRow + 1) {
      // 单行超页芯：只能向前吞到可断点
      while (end < n && !canBreakAfterRow(table, end - 1)) {
        used += estimateRowHeightPt(table, end, contentWidthPt);
        end += 1;
      }
      return { endRow: end, height: used, overflow: true };
    }
  }

  // 优先在页芯内回退到安全断点（避免 rowspan 把半页内容挤到下一页造成空白）
  let safeEnd = end;
  while (safeEnd > startRow + 1 && !canBreakAfterRow(table, safeEnd - 1)) {
    safeEnd -= 1;
  }
  if (canBreakAfterRow(table, safeEnd - 1)) {
    end = safeEnd;
  } else {
    while (end < n && !canBreakAfterRow(table, end - 1)) {
      used += estimateRowHeightPt(table, end, contentWidthPt);
      end += 1;
    }
  }

  used = 0;
  for (let r = startRow; r < end; r++) {
    used += estimateRowHeightPt(table, r, contentWidthPt);
  }
  const overflow = used > maxHeight;
  return { endRow: Math.max(end, startRow + 1), height: used, overflow };
}

function packChunk(
  chunkBlocks: Block[],
  contentWidthPt: number,
  contentHeightPt: number,
  explicitBreakBefore: boolean,
  gridLinePitchPt?: number,
): Omit<LogicalPage, 'pageSize' | 'margins' | 'documentGrid'>[] {
  if (chunkBlocks.length === 0) {
    return [{ blocks: [], explicitBreakBefore }];
  }

  const pages: Omit<LogicalPage, 'pageSize' | 'margins'>[] = [];
  let current: Block[] = [];
  let used = 0;
  let breakFlag = explicitBreakBefore;

  const flush = (overflow?: boolean) => {
    // 丢弃「整页只有空段」的假页（对标 WPS，无空白页）
    if (!current.length) return;
    if (!hasNonEmptyContent(current)) {
      current = [];
      used = 0;
      breakFlag = false;
      return;
    }
    pages.push({
      blocks: trimTrailingEmpties(current),
      overflow,
      explicitBreakBefore: breakFlag,
    });
    current = [];
    used = 0;
    breakFlag = false;
  };

  const appendBlock = (block: Block, height: number, overflow?: boolean) => {
    current.push(block);
    used += height;
    if (overflow) flush(true);
  };

  for (const block of chunkBlocks) {
    // 封面 | 说明：说明标题前强制翻页
    if (
      isInstructionsHeading(block)
      && hasNonEmptyContent(current)
    ) {
      flush();
    }

    if (block.type === 'table') {
      const tableH = estimateBlockHeightPt(block, contentWidthPt);
      // 整表能与标题等同页 → 同页（变更登记）；装不下 → 整表新开页再按行拆（资格大表）
      if (current.length > 0 && used + tableH > contentHeightPt) {
        flush();
      }

      let rowStart = 0;
      while (rowStart < block.rows.length) {
        const remaining = contentHeightPt - used;
        if (current.length > 0 && remaining < 28) {
          flush();
          continue;
        }

        const room = current.length === 0 ? contentHeightPt : remaining;
        const firstRowH = estimateRowHeightPt(block, rowStart, contentWidthPt);
        if (current.length > 0 && firstRowH > room) {
          flush();
          continue;
        }

        const { endRow, height, overflow } = findTableRowEnd(
          block,
          rowStart,
          Math.max(room, 16),
          contentWidthPt,
        );

        const fragment = sliceTable(block, rowStart, endRow);
        const pageOverflow = overflow && endRow === rowStart + 1;
        appendBlock(fragment, height, pageOverflow);
        rowStart = endRow;

        if (rowStart < block.rows.length && current.length > 0) {
          flush();
        }
      }
      continue;
    }

    const h = estimateBlockHeightPt(block, contentWidthPt, gridLinePitchPt);
    if (current.length > 0 && used + h > contentHeightPt) {
      flush();
    }
    appendBlock(block, h, h > contentHeightPt);
  }

  flush();
  if (!pages.length) {
    pages.push({ blocks: [], explicitBreakBefore });
  }
  return pages;
}

/** 将一节拆成逻辑页：显式 pageBreak + 对标 WPS 的套表分页启发式 */
export function paginateSection(section: Section): LogicalPage[] {
  const pageSize = section.pageSize ?? DEFAULT_PAGE;
  const margins = section.margins ?? DEFAULT_MARGINS;
  const box = contentBox(pageSize, margins);
  const gridPitch = section.documentGrid?.linePitchPt;

  const chunks = splitByExplicitBreaks(section.blocks);
  const pages: LogicalPage[] = [];

  for (const chunk of chunks) {
    const packed = packChunk(
      chunk.blocks,
      box.widthPt,
      box.heightPt,
      chunk.explicitBreakBefore,
      gridPitch,
    );
    for (const p of packed) {
      pages.push({
        ...p,
        pageSize,
        margins,
        documentGrid: section.documentGrid,
      });
    }
  }

  if (!pages.length) {
    pages.push({
      blocks: [],
      pageSize,
      margins,
      documentGrid: section.documentGrid,
    });
  }
  return pages;
}

export function paginateDocument(sections: Section[]): LogicalPage[] {
  return sections.flatMap((section) => paginateSection(section));
}
