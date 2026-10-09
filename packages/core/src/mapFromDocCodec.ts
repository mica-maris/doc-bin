import type {
  Block,
  BorderEdge,
  CellBorders,
  FormDocument,
  PageMargins,
  Paragraph,
  ParseWarning,
  Table,
  TableCell,
  TextRun,
} from './types.js';

/** Minimal structural typing against document-schema / doc-codec output */
interface CodecRun {
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  sizePt?: number;
  color?: string | { r?: number; g?: number; b?: number };
  fontFamily?: string;
}

interface CodecParagraph {
  kind: 'paragraph';
  runs?: CodecRun[];
  alignment?: 'left' | 'center' | 'right' | 'justify';
  spacingBeforePt?: number;
  spacingAfterPt?: number;
}

interface CodecBorder {
  style?: string;
  widthPt?: number;
  color?: string | { r?: number; g?: number; b?: number };
}

interface CodecCell {
  blocks?: CodecBlock[];
  colSpan?: number;
  rowSpan?: number;
  borders?: {
    top?: CodecBorder;
    right?: CodecBorder;
    bottom?: CodecBorder;
    left?: CodecBorder;
  };
  background?: { kind?: string; color?: string | { r?: number; g?: number; b?: number } } | string;
  verticalAlign?: 'top' | 'center' | 'bottom';
}

interface CodecTable {
  kind: 'table';
  columns?: { widthPt: number }[];
  columnWidthsPt?: number[];
  rows?: {
    heightPt?: number;
    direction?: string;
    cells?: CodecCell[];
  }[];
}

interface CodecImage {
  kind: 'image';
}

interface CodecPageBreak {
  kind: 'pageBreak';
}

type CodecBlock = CodecParagraph | CodecTable | CodecImage | CodecPageBreak | { kind: string };

interface CodecSection {
  blocks?: CodecBlock[];
  pageSize?: { widthPt: number; heightPt: number };
  margins?: PageMargins;
}

interface CodecDocument {
  kind?: string;
  metadata?: { title?: string };
  sections?: CodecSection[];
}

export interface MapResult {
  document: FormDocument;
  warnings: ParseWarning[];
  unsupported: ParseWarning[];
  plainText: string;
}

function colorToCss(color: unknown): string | undefined {
  if (typeof color === 'string') {
    if (color.startsWith('#')) return color;
    return undefined;
  }
  if (color && typeof color === 'object') {
    const c = color as { r?: number; g?: number; b?: number };
    if (
      typeof c.r === 'number'
      && typeof c.g === 'number'
      && typeof c.b === 'number'
    ) {
      const hex = (n: number) =>
        Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
      return `#${hex(c.r)}${hex(c.g)}${hex(c.b)}`;
    }
  }
  return undefined;
}

function mapBorder(edge?: CodecBorder): BorderEdge | undefined {
  if (!edge) return undefined;
  const styleRaw = edge.style ?? 'solid';
  const style =
    styleRaw === 'dashed'
    || styleRaw === 'dotted'
    || styleRaw === 'double'
    || styleRaw === 'none'
      ? styleRaw
      : 'solid';
  return {
    style,
    widthPt: typeof edge.widthPt === 'number' ? edge.widthPt : 0.5,
    color: colorToCss(edge.color) ?? '#000000',
  };
}

function mapBorders(borders?: CodecCell['borders']): CellBorders | undefined {
  if (!borders) return undefined;
  const mapped: CellBorders = {
    top: mapBorder(borders.top),
    right: mapBorder(borders.right),
    bottom: mapBorder(borders.bottom),
    left: mapBorder(borders.left),
  };
  if (!mapped.top && !mapped.right && !mapped.bottom && !mapped.left) {
    return undefined;
  }
  return mapped;
}

function mapBackground(bg: CodecCell['background']): string | undefined {
  if (!bg) return undefined;
  if (typeof bg === 'string') return colorToCss(bg);
  return colorToCss(bg.color);
}

function mapRuns(runs: CodecRun[] | undefined): TextRun[] {
  if (!runs?.length) return [{ text: '' }];
  return runs.map((run) => {
    const out: TextRun = { text: run.text ?? '' };
    if (run.bold) out.bold = true;
    if (run.italic) out.italic = true;
    if (run.underline) out.underline = true;
    if (typeof run.sizePt === 'number') out.fontSizePt = run.sizePt;
    const color = colorToCss(run.color);
    if (color) out.color = color;
    if (run.fontFamily) out.fontFamily = run.fontFamily;
    return out;
  });
}

function mapParagraph(p: CodecParagraph): Paragraph {
  const para: Paragraph = {
    type: 'paragraph',
    runs: mapRuns(p.runs),
  };
  if (p.alignment) para.align = p.alignment;
  if (typeof p.spacingBeforePt === 'number') {
    para.spacingBeforePt = p.spacingBeforePt;
  }
  if (typeof p.spacingAfterPt === 'number') {
    para.spacingAfterPt = p.spacingAfterPt;
  }
  return para;
}

function isCoveredCell(cell: CodecCell): boolean {
  const empty = !cell.blocks || cell.blocks.length === 0;
  const noSpan = !(cell.colSpan && cell.colSpan > 1)
    && !(cell.rowSpan && cell.rowSpan > 1);
  const noChrome = !cell.borders && !cell.background;
  return empty && noSpan && noChrome;
}

function mapCell(
  cell: CodecCell,
  columnWidthPt: number | undefined,
  warnings: ParseWarning[],
  unsupported: ParseWarning[],
): TableCell {
  if (isCoveredCell(cell)) {
    return {
      rowSpan: 1,
      colSpan: 1,
      covered: true,
      blocks: [],
    };
  }

  const blocks = mapBlocks(cell.blocks ?? [], warnings, unsupported);
  const mapped: TableCell = {
    rowSpan: cell.rowSpan && cell.rowSpan > 0 ? cell.rowSpan : 1,
    colSpan: cell.colSpan && cell.colSpan > 0 ? cell.colSpan : 1,
    blocks,
  };
  const borders = mapBorders(cell.borders);
  if (borders) mapped.borders = borders;
  const bg = mapBackground(cell.background);
  if (bg) mapped.background = bg;
  if (cell.verticalAlign === 'center') mapped.verticalAlign = 'middle';
  else if (cell.verticalAlign === 'top' || cell.verticalAlign === 'bottom') {
    mapped.verticalAlign = cell.verticalAlign;
  }
  if (typeof columnWidthPt === 'number') mapped.widthPt = columnWidthPt;
  return mapped;
}

function mapTable(
  table: CodecTable,
  warnings: ParseWarning[],
  unsupported: ParseWarning[],
): Table {
  const columnWidthsPt =
    table.columns?.map((c) => c.widthPt)
    ?? table.columnWidthsPt
    ?? [];

  const rows = (table.rows ?? []).map((row) => {
    if (row.direction && row.direction !== 'ltr' && row.direction !== 'rtl') {
      warnings.push({
        code: 'ROW_DIRECTION_APPROX',
        message: `Row text direction "${row.direction}" approximated in CSS`,
      });
    }
    return {
      heightPt: row.heightPt,
      cells: (row.cells ?? []).map((cell, i) =>
        mapCell(cell, columnWidthsPt[i], warnings, unsupported),
      ),
    };
  });

  return {
    type: 'table',
    columnWidthsPt,
    rows,
  };
}

function mapBlocks(
  blocks: CodecBlock[],
  warnings: ParseWarning[],
  unsupported: ParseWarning[],
): Block[] {
  const out: Block[] = [];
  for (const block of blocks) {
    if (block.kind === 'paragraph') {
      out.push(mapParagraph(block as CodecParagraph));
      continue;
    }
    if (block.kind === 'table') {
      out.push(mapTable(block as CodecTable, warnings, unsupported));
      continue;
    }
    if (block.kind === 'pageBreak') {
      warnings.push({
        code: 'PAGE_BREAK_SKIPPED',
        message: 'Manual page break recorded as warning (logical pages are heuristic)',
      });
      continue;
    }
    if (block.kind === 'image') {
      warnings.push({
        code: 'IMAGE_SKIPPED',
        message: 'Inline image skipped in v0.1 AST (matrix: 尽力而为)',
      });
      continue;
    }
    unsupported.push({
      code: 'BLOCK_UNSUPPORTED',
      message: `Unsupported block kind: ${block.kind ?? 'unknown'}`,
    });
  }
  return out;
}

function collectPlainText(blocks: Block[]): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === 'paragraph') {
      parts.push(block.runs.map((r) => r.text).join(''));
      continue;
    }
    for (const row of block.rows) {
      for (const cell of row.cells) {
        if (cell.covered) continue;
        parts.push(collectPlainText(cell.blocks));
      }
    }
  }
  return parts.filter(Boolean).join('\n');
}

export function mapFromDocCodec(raw: unknown): MapResult {
  const doc = raw as CodecDocument;
  const warnings: ParseWarning[] = [];
  const unsupported: ParseWarning[] = [];

  if (doc.kind && doc.kind !== 'wordprocessing') {
    unsupported.push({
      code: 'NOT_WORDPROCESSING',
      message: `Unexpected document kind: ${doc.kind}`,
    });
  }

  const sections = (doc.sections ?? []).map((section) => {
    const blocks = mapBlocks(section.blocks ?? [], warnings, unsupported);
    return {
      blocks,
      pageSize: section.pageSize,
      margins: section.margins,
    };
  });

  const document: FormDocument = {
    title: doc.metadata?.title,
    sections,
  };

  const plainText = sections
    .map((s) => collectPlainText(s.blocks))
    .filter(Boolean)
    .join('\n\n');

  return { document, warnings, unsupported, plainText };
}
