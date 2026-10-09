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

export type Block = Paragraph | Table;

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

export interface Section {
  blocks: Block[];
  pageSize?: PageSize;
  margins?: PageMargins;
}

export interface FormDocument {
  title?: string;
  sections: Section[];
}

export interface ParseResult {
  status: ParseStatus;
  document?: FormDocument;
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
