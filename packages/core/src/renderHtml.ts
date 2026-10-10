import {
  coverLetterSpacingPt,
  coverParagraphRole,
  cssFontFamily,
  type CoverRole,
} from './fonts.js';
import { paginateDocument, type LogicalPage } from './paginate.js';
import type {
  Block,
  BorderEdge,
  DocumentGrid,
  DocDocument,
  Paragraph,
  Table,
  TableCell,
  TextRun,
} from './types.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pt(n: number | undefined, fallback?: number): string | undefined {
  if (typeof n === 'number' && Number.isFinite(n)) return `${n}pt`;
  if (typeof fallback === 'number') return `${fallback}pt`;
  return undefined;
}

/**
 * 段落盒模型：Word 负左右缩进扩大排字区；CSS padding 不能为负，改用 margin。
 * spacingBefore/After 仍用 padding，避免与外边距折叠搅在一起。
 */
function paragraphIndentStyles(
  p: Paragraph,
): Record<string, string | undefined> {
  const styles: Record<string, string | undefined> = {
    'padding-top': pt(p.spacingBeforePt),
    'padding-bottom': pt(p.spacingAfterPt),
    'text-indent': pt(p.indentFirstLinePt),
  };
  const left = p.indentLeftPt;
  const right = p.indentRightPt;
  if (typeof left === 'number') {
    if (left < 0) styles['margin-left'] = pt(left);
    else styles['padding-left'] = pt(left);
  }
  if (typeof right === 'number') {
    if (right < 0) styles['margin-right'] = pt(right);
    else styles['padding-right'] = pt(right);
  }
  return styles;
}

function borderCss(edge?: BorderEdge): string {
  if (!edge || edge.style === 'none') return 'none';
  const width = Math.max(edge.widthPt, 0.25);
  return `${width}pt ${edge.style} ${edge.color}`;
}

function styleAttr(styles: Record<string, string | undefined>): string {
  const body = Object.entries(styles)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('; ');
  // font-family 含双引号时必须转义，否则 style="" 被截断、字体整段失效
  return body ? ` style="${body.replace(/"/g, '&quot;')}"` : '';
}

function isSpaceOnly(text: string): boolean {
  return /^[ \u00a0\u3000]+$/.test(text);
}

/** 下划线填空：保留半角空格宽度（全角化会撑破封面行宽导致「称/日」掉行） */
function renderUnderlineSpaces(run: TextRun): string {
  const raw = run.text ?? '';
  const styles: Record<string, string | undefined> = {
    'font-size': pt(run.fontSizePt),
    'font-family': cssFontFamily(run.fontFamily),
    color: run.color,
    'text-decoration': 'underline',
    'text-underline-offset': '0.12em',
    'white-space': 'pre',
  };
  return `<span class="docbin-fill-spaces"${styleAttr(styles)}>${escapeHtml(raw)}</span>`;
}

function renderFillLine(run: TextRun, widthEm: number): string {
  const styles: Record<string, string | undefined> = {
    display: 'inline-block',
    'min-width': `${Math.max(widthEm, 2) * 1}em`,
    'border-bottom': '1px solid currentColor',
    height: '1.05em',
    'vertical-align': 'baseline',
    'font-size': pt(run.fontSizePt),
    'font-family': cssFontFamily(run.fontFamily),
    color: run.color,
  };
  return `<span class="docbin-fill-line"${styleAttr(styles)}></span>`;
}

function renderRun(
  run: TextRun,
  opts?: { coverRole?: CoverRole; inTable?: boolean },
): string {
  const raw = run.text ?? '';
  if (isSpaceOnly(raw) && raw.length >= 4) {
    // 显式 underline 才画填空线；表内无下划线空格只是 Word 版式占位（签名区等），画线会成「多余横线」
    if (run.underline) return renderUnderlineSpaces(run);
    if (opts?.inTable) {
      return `<span${styleAttr({
        'font-size': pt(run.fontSizePt),
        'font-family': cssFontFamily(run.fontFamily),
        'white-space': 'pre',
      })}>${escapeHtml(raw)}</span>`;
    }
    return renderFillLine(run, raw.length);
  }

  const styles: Record<string, string | undefined> = {
    'font-size': pt(run.fontSizePt),
    color: run.color,
    'font-family': cssFontFamily(run.fontFamily),
    'font-weight': run.bold ? '700' : undefined,
    'font-style': run.italic ? 'italic' : undefined,
    'text-decoration': run.underline ? 'underline' : undefined,
    'white-space': 'pre-wrap',
  };

  if (opts?.coverRole) {
    const ls = coverLetterSpacingPt(opts.coverRole, run.fontFamily, raw);
    if (ls != null) styles['letter-spacing'] = pt(ls);
  }

  return `<span${styleAttr(styles)}>${escapeHtml(raw)}</span>`;
}

/**
 * 行高优先级（均来自文件，不自造观感值）：
 * 1) 段落倍数 lineSpacing
 * 2) 节文档网格 linePitchPt（表内不用，避免撑破单元格）
 * 3) MS-DOC 默认单倍 1.0
 */
function cssLineHeight(
  p: Paragraph,
  opts?: { inTable?: boolean; grid?: DocumentGrid },
): string {
  if (typeof p.lineSpacing === 'number' && p.lineSpacing > 0) {
    return String(Math.round(p.lineSpacing * 1000) / 1000);
  }
  if (
    !opts?.inTable
    && opts?.grid
    && opts.grid.linePitchPt > 0
  ) {
    return `${Math.round(opts.grid.linePitchPt * 100) / 100}pt`;
  }
  return '1';
}

/** 封面标题拆成多 run 时合并，保证字距贯穿整行（对标 WPS） */
function renderCoverTitleParagraph(
  p: Paragraph,
  grid?: DocumentGrid,
): string {
  const text = p.runs.map((r) => r.text).join('');
  const head = p.runs.find((r) => (r.text ?? '').trim());
  const styles: Record<string, string | undefined> = {
    margin: '0',
    'text-align': 'center',
    'padding-top': pt(p.spacingBeforePt),
    'padding-bottom': pt(p.spacingAfterPt),
    'line-height': cssLineHeight(p, { grid }),
    'font-size': pt(head?.fontSizePt, 22),
    'font-family': cssFontFamily(head?.fontFamily ?? '文鼎大标宋简'),
    'letter-spacing': '12pt',
    'white-space': 'pre-wrap',
  };
  return `<p class="docbin-p docbin-cover-title"${styleAttr(styles)}>${escapeHtml(text)}</p>`;
}

function renderCoverIssuerParagraph(
  p: Paragraph,
  grid?: DocumentGrid,
): string {
  const text = p.runs.map((r) => r.text).join('').trimEnd();
  const head = p.runs.find((r) => (r.text ?? '').trim());
  const styles: Record<string, string | undefined> = {
    margin: '0',
    'text-align': 'center',
    'padding-top': pt(p.spacingBeforePt),
    'padding-bottom': pt(p.spacingAfterPt),
    'line-height': cssLineHeight(p, { grid }),
    'font-size': pt(head?.fontSizePt, 16),
    'font-family': cssFontFamily(head?.fontFamily ?? '楷体_GB2312'),
    'letter-spacing': '18pt',
    'white-space': 'pre-wrap',
  };
  return `<p class="docbin-p docbin-cover-issuer"${styleAttr(styles)}>${escapeHtml(text)}</p>`;
}

function renderParagraph(
  p: Paragraph,
  opts?: { inTable?: boolean; cover?: boolean; grid?: DocumentGrid },
): string {
  if (opts?.cover) {
    const role = coverParagraphRole(p.runs.map((r) => r.text).join(''));
    if (role === 'title') return renderCoverTitleParagraph(p, opts.grid);
    if (role === 'issuer') return renderCoverIssuerParagraph(p, opts.grid);
  }

  const role = opts?.cover
    ? coverParagraphRole(p.runs.map((r) => r.text).join(''))
    : undefined;

  // 封面填空行：Word 的 justify 在末行等同左齐；强制单行，避免字距/空格把「称」「日」挤掉行
  const field = role === 'field';
  const styles: Record<string, string | undefined> = {
    margin: '0',
    'text-align': field
      ? 'left'
      : (p.align ?? (opts?.inTable ? 'center' : 'left')),
    ...paragraphIndentStyles(p),
    'line-height': cssLineHeight(p, {
      inTable: opts?.inTable,
      grid: opts?.grid,
    }),
    'word-break': field ? 'keep-all' : 'break-word',
    'white-space': field ? 'pre' : 'pre-wrap',
  };
  const cls = [
    'docbin-p',
    opts?.inTable ? 'docbin-p--cell' : '',
    field ? 'docbin-cover-field' : '',
  ]
    .filter(Boolean)
    .join(' ');
  return `<p class="${cls}"${styleAttr(styles)}>${
    p.runs
      .map((r) =>
        renderRun(r, { coverRole: role, inTable: opts?.inTable }),
      )
      .join('') || '&nbsp;'
  }</p>`;
}

function shouldEmitCell(cell: TableCell): boolean {
  if (cell.covered) return false;
  return true;
}

function renderBlocks(
  blocks: Block[],
  opts?: { inTable?: boolean; cover?: boolean; grid?: DocumentGrid },
): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === 'pageBreak') continue;
    if (b.type === 'paragraph') parts.push(renderParagraph(b, opts));
    else parts.push(renderTable(b));
  }
  return parts.length ? parts.join('') : '&nbsp;';
}

function renderCell(cell: TableCell): string {
  // 套表默认垂直居中（doc-codec 常不给 verticalAlign）
  const vAlign =
    cell.verticalAlign === 'top'
      ? 'top'
      : cell.verticalAlign === 'bottom'
        ? 'bottom'
        : 'middle';

  const styles: Record<string, string | undefined> = {
    'vertical-align': vAlign,
    width: pt(cell.widthPt),
    'background-color': cell.background,
    'border-top': borderCss(cell.borders?.top),
    'border-right': borderCss(cell.borders?.right),
    'border-bottom': borderCss(cell.borders?.bottom),
    'border-left': borderCss(cell.borders?.left),
    // 套表单元格贴边排字；硬编码 padding 会少约 8pt 有效宽（信用代码/章程段提前换行）
    padding: '0',
  };

  if (cell.textDirection === 'ttb') {
    styles['writing-mode'] = 'vertical-rl';
    styles['text-orientation'] = 'mixed';
  }

  const span =
    `${cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : ''}`
    + `${cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : ''}`;

  return `<td class="docbin-td"${span}${styleAttr(styles)}>${renderBlocks(cell.blocks, { inTable: true })}</td>`;
}

function renderTable(table: Table): string {
  const colgroup = table.columnWidthsPt.length
    ? `<colgroup>${table.columnWidthsPt
        .map((w) => `<col${styleAttr({ width: pt(w) })} />`)
        .join('')}</colgroup>`
    : '';

  const rows = table.rows
    .map((row) => {
      const trStyle = styleAttr({
        height: pt(row.heightPt),
      });
      const cells = row.cells.filter(shouldEmitCell).map(renderCell).join('');
      return `<tr class="docbin-tr"${trStyle}>${cells}</tr>`;
    })
    .join('');

  const totalW = table.columnWidthsPt.reduce((a, b) => a + b, 0);
  return `<table class="docbin-table"${styleAttr({
    'border-collapse': 'collapse',
    'table-layout': 'fixed',
    width: totalW > 0 ? pt(totalW) : '100%',
  })}>${colgroup}${rows}</table>`;
}

function isCoverLikePage(page: LogicalPage): boolean {
  const hasTable = page.blocks.some((b) => b.type === 'table');
  if (hasTable) return false;
  return page.blocks.some(
    (b) =>
      b.type === 'paragraph'
      && /申请表|登记表/.test(b.runs.map((r) => r.text).join('')),
  );
}

function renderCoverBody(blocks: Block[], grid?: DocumentGrid): string {
  const parts: string[] = [];
  let emptyRun = 0;
  const flushEmpties = (slot: 'top' | 'mid' | 'bottom') => {
    if (emptyRun <= 0) return;
    // 对标 WPS：上段略收、中段拉开标题与填空、底段托住监制
    const grow =
      slot === 'top' ? emptyRun * 0.85
        : slot === 'mid' ? emptyRun * 1.15
          : emptyRun;
    parts.push(
      `<div class="docbin-cover-spacer docbin-cover-spacer--${slot}" style="flex:${grow} 1 0;min-height:${emptyRun * 8}pt"></div>`,
    );
    emptyRun = 0;
  };
  let slot: 'top' | 'mid' | 'bottom' = 'top';
  for (const b of blocks) {
    if (b.type === 'pageBreak') continue;
    if (b.type === 'paragraph' && !b.runs.map((r) => r.text).join('').trim()) {
      emptyRun += 1;
      continue;
    }
    const role =
      b.type === 'paragraph'
        ? coverParagraphRole(b.runs.map((r) => r.text).join(''))
        : 'other';
    flushEmpties(slot);
    if (b.type === 'paragraph') {
      parts.push(renderParagraph(b, { cover: true, grid }));
    } else parts.push(renderTable(b));
    if (role === 'title') slot = 'mid';
    else if (role === 'field') slot = 'bottom';
  }
  flushEmpties(slot);
  return parts.join('') || '&nbsp;';
}

function renderPage(page: LogicalPage, index: number, total: number): string {
  const m = page.margins;
  const cover = isCoverLikePage(page);
  const overflowClass = page.overflow ? ' docbin-page--overflow' : '';
  const coverClass = cover ? ' docbin-page--cover' : '';
  const pageStyle = styleAttr({
    width: pt(page.pageSize.widthPt),
    height: page.overflow ? undefined : pt(page.pageSize.heightPt),
    'min-height': pt(page.pageSize.heightPt),
    'padding-top': pt(m.topPt),
    'padding-right': pt(m.rightPt),
    'padding-bottom': pt(m.bottomPt),
    'padding-left': pt(m.leftPt),
  });

  const grid = page.documentGrid;
  const body = cover
    ? renderCoverBody(page.blocks, grid)
    : renderBlocks(page.blocks, { grid });

  return (
    `<section class="docbin-page${overflowClass}${coverClass}" data-page="${index + 1}" data-pages="${total}"${pageStyle}>`
    + `<div class="docbin-page-body">${body}</div>`
    + `<footer class="docbin-page-num" aria-hidden="true">— ${index + 1} —</footer>`
    + `</section>`
  );
}

/** 套表观感用基础 CSS（组件层可再包一层） */
export const DOCBIN_BASE_CSS = `
.docbin-root {
  color: #000;
  font-family: "仿宋", "仿宋_GB2312", "FangSong", "STFangsong", "宋体", serif;
  font-size: 12pt;
  background:
    radial-gradient(ellipse 80% 50% at 10% 0%, rgba(180, 140, 90, 0.08), transparent 55%),
    linear-gradient(180deg, #f7f3ec 0%, #efe8dc 100%);
  padding: 16px;
}
.docbin-page {
  position: relative;
  background: #fff;
  box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 40px rgba(40, 30, 10, 0.08);
  margin: 0 auto 28px;
  box-sizing: border-box;
  overflow: hidden;
  break-after: page;
}
.docbin-page--overflow {
  overflow: visible;
  height: auto !important;
}
.docbin-page-body {
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
}
.docbin-page--cover .docbin-page-body {
  display: flex;
  flex-direction: column;
  min-height: calc(100% - 28pt);
  padding-bottom: 8pt;
}
.docbin-cover-spacer { flex-grow: 1; }
.docbin-cover-title {
  font-family: "华文中宋", "华文宋体", "宋体", serif !important;
  /* 文件无字间空格/无正 CDxaSpace；字距对标 WPS 封面（亦写在 inline，防宿主 CSS 覆盖） */
  letter-spacing: 12pt !important;
}
.docbin-cover-issuer {
  font-family: "楷体", "华文楷体", "楷体_GB2312", KaiTi, serif !important;
  letter-spacing: 18pt !important;
}
.docbin-cover-field {
  font-family: "楷体", "华文楷体", "楷体_GB2312", KaiTi, serif;
}
.docbin-page-num {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 48pt;
  text-align: center;
  font-size: 10.5pt;
  color: #000;
  font-family: "Times New Roman", "宋体", serif;
  pointer-events: none;
  letter-spacing: 0.05em;
}
.docbin-table { border-spacing: 0; overflow: hidden; }
/* visible：允许单元格负缩进伸出，避免 overflow 裁掉扩宽的排字区 */
.docbin-td { overflow: visible; max-width: 100%; }
.docbin-p { min-height: 1em; }
.docbin-p--cell { text-align: center; }
.docbin-fill-line { margin: 0 1pt; max-width: 100%; box-sizing: border-box; }
`.trim();

export function renderDocumentHtml(
  document: DocDocument,
  options: { includeStyleTag?: boolean; showDocumentTitle?: boolean } = {},
): string {
  const logicalPages = paginateDocument(document.sections);
  const total = logicalPages.length;
  const pages = logicalPages
    .map((page, i) => renderPage(page, i, total))
    .join('');

  const style =
    options.includeStyleTag === false
      ? ''
      : `<style>${DOCBIN_BASE_CSS}</style>`;

  const title =
    options.showDocumentTitle && document.title
      ? `<header class="docbin-title"${styleAttr({
          'text-align': 'center',
          'font-size': '14pt',
          'margin-bottom': '12pt',
        })}>${escapeHtml(document.title)}</header>`
      : '';

  return `${style}<div class="docbin-root" data-page-count="${total}">${title}${pages}</div>`;
}
