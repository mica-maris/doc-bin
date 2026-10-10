/** 解析结果状态：驱动渲染层是否展示或降级 */
export type ParseStatus = 'ok' | 'partial' | 'unsupported' | 'error';

export interface ParseWarning {
  code: string;
  message: string;
}

export interface TextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSizePt?: number;
  color?: string;
  fontFamily?: string;
}

export interface Paragraph {
  type: 'paragraph';
  runs: TextRun[];
  align?: 'left' | 'center' | 'right' | 'justify';
  spacingBeforePt?: number;
  spacingAfterPt?: number;
  /**
   * 行距倍数（doc-codec：LSPD 乘数形式 dyaLine/240）。
   * 未出现时表示文件未写显式行距 → 按 Word/MS-DOC 默认单倍（1.0）渲染。
   */
  lineSpacing?: number;
  indentLeftPt?: number;
  indentRightPt?: number;
  indentFirstLinePt?: number;
}

export interface BorderEdge {
  style: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  widthPt: number;
  color: string;
}

export interface CellBorders {
  top?: BorderEdge;
  right?: BorderEdge;
  bottom?: BorderEdge;
  left?: BorderEdge;
}

export interface TableCell {
  rowSpan: number;
  colSpan: number;
  /** 竖排：tbRl / btLr 等；schema 未暴露时多为 unknown */
  textDirection?: 'ltr' | 'ttb' | 'unknown';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  borders?: CellBorders;
  background?: string;
  widthPt?: number;
  /** dense grid 被合并吞掉的占位格 */
  covered?: boolean;
  blocks: Block[];
}

export interface TableRow {
  cells: TableCell[];
  heightPt?: number;
}

export interface Table {
  type: 'table';
  columnWidthsPt: number[];
  rows: TableRow[];
}

/** 显式分页符（来自 MS-DOC manual page break） */
export interface PageBreak {
  type: 'pageBreak';
}

export type Block = Paragraph | Table | PageBreak;

export interface PageMargins {
  topPt: number;
  rightPt: number;
  bottomPt: number;
  leftPt: number;
}

export interface PageSize {
  widthPt: number;
  heightPt: number;
}

/**
 * 节级文档网格（Sepx）。
 * - linePitchPt：dyaLinePitch（行网格）
 * - charPitchDeltaPt：dxtCharSpace/4096，相对正文（Normal）字号的字符网格增量
 * - clm：网格模式（1=行+字符网格，见 MS-DOC SClmOperand）
 */
export interface DocumentGrid {
  linePitchPt: number;
  clm?: number;
  /** 相对 Normal 字号的字符网格增量（pt），来自 sprmSDxtCharSpace */
  charPitchDeltaPt?: number;
}

export interface Section {
  blocks: Block[];
  pageSize?: PageSize;
  margins?: PageMargins;
  /** 来自 Sepx，优先于段落缺省行距 */
  documentGrid?: DocumentGrid;
}

export interface DocDocument {
  title?: string;
  sections: Section[];
}

export interface ParseResult {
  status: ParseStatus;
  document?: DocDocument;
  /** 纯文本降级用 */
  plainText?: string;
  /** 可选：直接可用的 HTML（含基础套表样式） */
  html?: string;
  warnings: ParseWarning[];
  unsupported: ParseWarning[];
  error?: { code: string; message: string };
}

export interface ParseOptions {
  /** 调试日志（默认关） */
  debug?: boolean;
  /** 加密文档密码（转发给底层读取器） */
  password?: string;
  /** 是否附带 HTML（默认 true） */
  renderHtml?: boolean;
}
