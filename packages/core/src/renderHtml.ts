import type {
  Block,
  BorderEdge,
  FormDocument,
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
  return body ? ` style="${body}"` : '';
}

function renderRun(run: TextRun): string {
  const styles: Record<string, string | undefined> = {
    'font-size': pt(run.fontSizePt),
    color: run.color,
    'font-family': run.fontFamily
      ? `"${run.fontFamily.replace(/"/g, '')}", "Microsoft YaHei", "PingFang SC", sans-serif`
      : undefined,
    'font-weight': run.bold ? '700' : undefined,
    'font-style': run.italic ? 'italic' : undefined,
    'text-decoration': run.underline ? 'underline' : undefined,
  };
  return `<span${styleAttr(styles)}>${escapeHtml(run.text)}</span>`;
}

function renderParagraph(p: Paragraph): string {
  const styles: Record<string, string | undefined> = {
    margin: '0',
    'text-align': p.align ?? 'left',
    'padding-top': pt(p.spacingBeforePt),
    'padding-bottom': pt(p.spacingAfterPt),
    'line-height': '1.35',
    'word-break': 'break-word',
  };
  return `<p class="msdoc-p"${styleAttr(styles)}>${p.runs.map(renderRun).join('') || '&nbsp;'}</p>`;
}

function shouldEmitCell(cell: TableCell): boolean {
  if (cell.covered) return false;
  return true;
}

function renderCell(cell: TableCell): string {
  const styles: Record<string, string | undefined> = {
    'vertical-align':
      cell.verticalAlign === 'middle'
        ? 'middle'
        : cell.verticalAlign === 'bottom'
          ? 'bottom'
          : 'top',
    width: pt(cell.widthPt),
    'background-color': cell.background,
    'border-top': borderCss(cell.borders?.top),
    'border-right': borderCss(cell.borders?.right),
    'border-bottom': borderCss(cell.borders?.bottom),
    'border-left': borderCss(cell.borders?.left),
    padding: '4pt 6pt',
  };

  if (cell.textDirection === 'ttb') {
    styles['writing-mode'] = 'vertical-rl';
    styles['text-orientation'] = 'mixed';
  }

  const span =
    `${cell.colSpan > 1 ? ` colspan="${cell.colSpan}"` : ''}`
    + `${cell.rowSpan > 1 ? ` rowspan="${cell.rowSpan}"` : ''}`;

  return `<td class="msdoc-td"${span}${styleAttr(styles)}>${renderBlocks(cell.blocks)}</td>`;
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
      return `<tr class="msdoc-tr"${trStyle}>${cells}</tr>`;
    })
    .join('');

  return `<table class="msdoc-table"${styleAttr({
    'border-collapse': 'collapse',
    'table-layout': 'fixed',
    width: table.columnWidthsPt.length
      ? pt(table.columnWidthsPt.reduce((a, b) => a + b, 0))
      : '100%',
  })}>${colgroup}${rows}</table>`;
}

function renderBlocks(blocks: Block[]): string {
  if (!blocks.length) return '&nbsp;';
  return blocks
    .map((b) => (b.type === 'paragraph' ? renderParagraph(b) : renderTable(b)))
    .join('');
}

/** 套表观感用基础 CSS（组件层可再包一层） */
export const MSDOC_FORM_BASE_CSS = `
.msdoc-form-root {
  color: #111;
  font-family: "SimSun", "Songti SC", "Microsoft YaHei", serif;
  font-size: 12pt;
  background:
    radial-gradient(ellipse 80% 50% at 10% 0%, rgba(180, 140, 90, 0.08), transparent 55%),
    linear-gradient(180deg, #f7f3ec 0%, #efe8dc 100%);
  padding: 16px;
}
.msdoc-page {
  background: #fffef9;
  box-shadow: 0 1px 0 rgba(0,0,0,0.04), 0 12px 40px rgba(40, 30, 10, 0.08);
  margin: 0 auto 24px;
  box-sizing: border-box;
}
.msdoc-table { border-spacing: 0; }
.msdoc-p { min-height: 1em; }
`.trim();

export function renderDocumentHtml(
  document: FormDocument,
  options: { includeStyleTag?: boolean } = {},
): string {
  const pages = document.sections
    .map((section) => {
      const width = section.pageSize?.widthPt ?? 595.3;
      const minHeight = section.pageSize?.heightPt;
      const m = section.margins;
      const pageStyle = styleAttr({
        width: pt(width),
        'min-height': pt(minHeight),
        'padding-top': pt(m?.topPt, 56.7),
        'padding-right': pt(m?.rightPt, 56.7),
        'padding-bottom': pt(m?.bottomPt, 56.7),
        'padding-left': pt(m?.leftPt, 56.7),
      });
      return `<section class="msdoc-page"${pageStyle}>${renderBlocks(section.blocks)}</section>`;
    })
    .join('');

  const style =
    options.includeStyleTag === false
      ? ''
      : `<style>${MSDOC_FORM_BASE_CSS}</style>`;

  const title = document.title
    ? `<header class="msdoc-title"${styleAttr({
        'text-align': 'center',
        'font-size': '14pt',
        'margin-bottom': '12pt',
      })}>${escapeHtml(document.title)}</header>`
    : '';

  return `${style}<div class="msdoc-form-root">${title}${pages}</div>`;
}
