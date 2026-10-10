import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeDocContent } from 'doc-codec';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const smokeDir = join(root, 'fixtures/smoke');
mkdirSync(smokeDir, { recursive: true });

const border = { style: 'solid', widthPt: 0.75, color: '#000000' };
const borders = { top: border, bottom: border, left: border, right: border };
const p = (text, align = 'left') => ({
  kind: 'paragraph',
  runs: [{ text, sizePt: 12 }],
  alignment: align,
});

const formMerge = {
  kind: 'wordprocessing',
  metadata: { title: '仿公文套表-合并格' },
  sections: [
    {
      pageSize: { widthPt: 595.3, heightPt: 841.9 },
      margins: { topPt: 56.7, rightPt: 56.7, bottomPt: 56.7, leftPt: 56.7 },
      blocks: [
        {
          kind: 'paragraph',
          runs: [{ text: '职工困难补助申请表（仿样）', bold: true, sizePt: 18 }],
          alignment: 'center',
        },
        {
          kind: 'paragraph',
          runs: [{ text: '（脱敏自制 fixture，仅供解析回归）', sizePt: 10 }],
          alignment: 'center',
          spacingAfterPt: 12,
        },
        {
          kind: 'table',
          columns: [
            { widthPt: 90 },
            { widthPt: 150 },
            { widthPt: 90 },
            { widthPt: 150 },
          ],
          rows: [
            {
              heightPt: 28,
              cells: [
                { blocks: [p('姓名', 'center')], borders },
                { blocks: [p('张三')], borders },
                { blocks: [p('性别', 'center')], borders },
                { blocks: [p('男')], borders },
              ],
            },
            {
              heightPt: 28,
              cells: [
                { blocks: [p('单位', 'center')], borders },
                {
                  colSpan: 3,
                  blocks: [p('某某市总工会（仿）')],
                  borders,
                },
                { blocks: [] },
                { blocks: [] },
              ],
            },
            {
              heightPt: 72,
              cells: [
                {
                  rowSpan: 2,
                  blocks: [p('事由', 'center')],
                  borders,
                  verticalAlign: 'center',
                },
                {
                  colSpan: 3,
                  rowSpan: 2,
                  blocks: [
                    p(
                      '家庭突发变故，申请临时困难补助。本格为合并单元格（横向+纵向）回归样例。',
                    ),
                  ],
                  borders,
                },
                { blocks: [] },
                { blocks: [] },
              ],
            },
            {
              heightPt: 28,
              cells: [
                { blocks: [] },
                { blocks: [] },
                { blocks: [] },
                { blocks: [] },
              ],
            },
            {
              heightPt: 28,
              cells: [
                { blocks: [p('填表日期', 'center')], borders },
                { colSpan: 3, blocks: [p('2026年10月9日')], borders },
                { blocks: [] },
                { blocks: [] },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const plain = {
  kind: 'wordprocessing',
  metadata: { title: '纯文本冒烟' },
  sections: [
    {
      pageSize: { widthPt: 595.3, heightPt: 841.9 },
      margins: { topPt: 72, rightPt: 72, bottomPt: 72, leftPt: 72 },
      blocks: [
        {
          kind: 'paragraph',
          runs: [{ text: 'Hello MS-DOC', bold: true, sizePt: 14 }],
          alignment: 'left',
        },
        {
          kind: 'paragraph',
          runs: [{ text: '中文纯文本抽取冒烟。', sizePt: 12 }],
        },
      ],
    },
  ],
};

const paged = {
  kind: 'wordprocessing',
  metadata: { title: '分页样张' },
  sections: [
    {
      pageSize: { widthPt: 595.3, heightPt: 841.9 },
      margins: { topPt: 56.7, rightPt: 56.7, bottomPt: 56.7, leftPt: 56.7 },
      blocks: [
        {
          kind: 'paragraph',
          runs: [{ text: '封面说明页', bold: true, sizePt: 22 }],
          alignment: 'center',
        },
        {
          kind: 'paragraph',
          runs: [{ text: '本页之后为显式分页符。', sizePt: 12 }],
          alignment: 'center',
          spacingAfterPt: 24,
        },
        { kind: 'pageBreak' },
        {
          kind: 'paragraph',
          runs: [{ text: '第二页 · 套表区', bold: true, sizePt: 16 }],
          alignment: 'center',
          spacingAfterPt: 12,
        },
        {
          kind: 'table',
          columns: [{ widthPt: 120 }, { widthPt: 300 }],
          rows: [
            {
              heightPt: 32,
              cells: [
                { blocks: [p('项目', 'center')], borders },
                { blocks: [p('内容填写区')], borders },
              ],
            },
            {
              heightPt: 64,
              cells: [
                { blocks: [p('备注', 'center')], borders },
                { blocks: [p('分页回归：封面与套表应分成两张纸。')], borders },
              ],
            },
          ],
        },
      ],
    },
  ],
};

writeFileSync(join(smokeDir, 'form-merge.doc'), writeDocContent(formMerge));
writeFileSync(join(smokeDir, 'plain-text.doc'), writeDocContent(plain));
writeFileSync(join(smokeDir, 'paged.doc'), writeDocContent(paged));
writeFileSync(
  join(smokeDir, 'SOURCES.md'),
  `# Smoke fixtures

自制于 doc-codec \`writeDocContent\`，非真实单位空白表。

| 文件 | 用途 |
|------|------|
| plain-text.doc | 纯文本 + 加粗 |
| form-merge.doc | 合并单元格 + 边框 + 页边距 |
| paged.doc | 显式分页符（封面 + 第二页套表） |
`,
);

console.log('Wrote fixtures to', smokeDir);
