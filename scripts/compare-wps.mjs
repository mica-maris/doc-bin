/**
 * 对照：本仓 HTML 预览 vs WPS 打开同一 .doc
 *
 * Usage:
 *   node scripts/compare-wps.mjs [path-to.doc | directory]
 *   pnpm compare:wps
 *   pnpm compare:wps -- fixtures/smoke
 *   pnpm compare:wps -- fixtures/forms
 */
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDoc } from '../packages/core/dist/index.js';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outDir = join(root, 'tmp/compare');
mkdirSync(outDir, { recursive: true });

function findWps() {
  const local = join(
    process.env.LOCALAPPDATA ?? '',
    'Kingsoft/WPS Office',
  );
  if (existsSync(local)) {
    const vers = readdirSync(local)
      .filter((n) => /^\d+\./.test(n))
      .sort()
      .reverse();
    for (const v of vers) {
      const exe = join(local, v, 'office6', 'wps.exe');
      if (existsSync(exe)) return exe;
    }
  }
  const pf = join(
    process.env['ProgramFiles'] ?? 'C:\\Program Files',
    'Kingsoft/WPS Office',
  );
  if (existsSync(pf)) {
    const hit = readdirSync(pf, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => join(pf, d.name, 'office6', 'wps.exe'))
      .find((p) => existsSync(p));
    if (hit) return hit;
  }
  return null;
}

function collectDocs(inputPath) {
  const abs = resolve(root, inputPath);
  if (!existsSync(abs)) {
    throw new Error(`Path not found: ${abs}`);
  }
  if (statSync(abs).isFile()) {
    if (extname(abs).toLowerCase() !== '.doc') {
      throw new Error(`Not a .doc file: ${abs}`);
    }
    return [abs];
  }
  return readdirSync(abs)
    .filter(
      (n) =>
        n.toLowerCase().endsWith('.doc')
        && !n.startsWith('~$'), // 跳过 WPS/Word 锁文件
    )
    .map((n) => join(abs, n))
    .sort();
}

function openPath(target) {
  spawn('cmd', ['/c', 'start', '', target], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();
}

function openWithWps(wpsExe, docPath) {
  spawn(wpsExe, [docPath], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  }).unref();
}

const arg = process.argv.slice(2).filter((a) => a !== '--')[0]
  ?? 'fixtures/smoke';
const docs = collectDocs(arg);
if (!docs.length) {
  console.error(`No .doc files under ${resolve(root, arg)}`);
  console.error('Put desensitized form samples in fixtures/forms/ then retry.');
  process.exit(1);
}

const wps = findWps();
if (!wps) {
  console.warn('WPS not found; will only write HTML previews.');
} else {
  console.log('WPS:', wps);
}

const indexRows = [];

for (const docPath of docs) {
  const name = basename(docPath, '.doc');
  const bytes = readFileSync(docPath);
  const result = await parseDoc(bytes);
  const htmlPath = join(outDir, `${name}.preview.html`);
  const metaPath = join(outDir, `${name}.meta.json`);

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>docbin vs WPS · ${name}</title>
<style>
  body { margin: 0; font-family: "IBM Plex Sans", "Segoe UI", sans-serif; background: #e8e2d6; }
  .bar { padding: 12px 16px; background: #1c1914; color: #f7f2e8; }
  .bar code { color: #9fd0c2; }
  .hint { padding: 8px 16px; background: #fff4d6; border-bottom: 1px solid #e6c86a; font-size: 13px; }
</style>
</head>
<body>
  <div class="bar">docbin 预览 · <code>${name}.doc</code> · status=${result.status}</div>
  <div class="hint">请对照已打开的 WPS 窗口，记录：分页 / 合并格 / 边框 / 字号间距差异。</div>
  ${result.html ?? `<pre>${result.plainText ?? result.error?.message ?? 'no output'}</pre>`}
</body>
</html>`;

  writeFileSync(htmlPath, html);
  writeFileSync(
    metaPath,
    JSON.stringify(
      {
        source: docPath,
        status: result.status,
        warnings: result.warnings,
        unsupported: result.unsupported,
        error: result.error,
        pageCount: result.html?.match(/data-page-count="(\d+)"/)?.[1] ?? null,
        plainTextPreview: (result.plainText ?? '').slice(0, 400),
      },
      null,
      2,
    ),
  );

  indexRows.push({ name, docPath, htmlPath, status: result.status });
  console.log(`\n=== ${name} ===`);
  console.log('status:', result.status);
  console.log('html:', htmlPath);
  if (wps) openWithWps(wps, docPath);
  openPath(htmlPath);
}

writeFileSync(
  join(outDir, 'index.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), rows: indexRows }, null, 2),
);

console.log(`\nDone. Opened ${docs.length} file(s). Notes → tmp/compare/*.meta.json`);
console.log('Fill gaps in docs/compare-notes.md after visual check.');
