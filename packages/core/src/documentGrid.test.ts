import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseDoc } from './parseDoc.js';
import { readDocumentGrids } from './readDocumentGrid.js';

/**
 * 本机私有样张（gitignore）。开发者可把复杂套表复制为：
 *   fixtures/forms/private-grid.doc
 * 缺文件时整组跳过，保证公开 clone 的 `pnpm test` 仍绿。
 */
const privateForm = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../fixtures/forms/private-grid.doc',
);

const hasPrivate = existsSync(privateForm);

describe.skipIf(!hasPrivate)('document grid line pitch (private fixture)', () => {
  it('reads 29.25pt pitch from Sepx', () => {
    const buf = readFileSync(privateForm);
    const grids = readDocumentGrids(buf);
    expect(grids[0]?.linePitchPt).toBe(29.25);
    expect(grids[0]?.clm).toBe(1);
    expect(grids[0]?.charPitchDeltaPt).toBeCloseTo(0x1027 / 4096, 5);
  });

  it('applies grid pitch as line-height on body paragraphs', async () => {
    const r = await parseDoc(readFileSync(privateForm));
    expect(r.document?.sections[0]?.documentGrid?.linePitchPt).toBe(29.25);
    expect(r.html).toContain('line-height: 29.25pt');
    expect(r.html).toMatch(/docbin-p--cell[^>]*line-height: 1/);
  });
});
