import { mkdirSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const outDir = join(root, 'release');
mkdirSync(outDir, { recursive: true });

const pkgs = [
  'packages/core',
  'packages/vue',
  'packages/react',
];

for (const pkg of pkgs) {
  execSync('pnpm pack --pack-destination ../../release', {
    cwd: join(root, pkg),
    stdio: 'inherit',
  });
}

const files = readdirSync(outDir).filter((f) => f.endsWith('.tgz'));
console.log('Packed:', files.join(', '));
console.log(`Install locally: npm i ./${files[0]?.replace(/\\/g, '/')}`);
