import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';

const entry = 'extension.js';
const outdir = 'dist';

// Clean dist
if (existsSync(outdir)) {
  rmSync(outdir, { recursive: true, force: true });
}
mkdirSync(outdir, { recursive: true });

await build({
  entryPoints: [entry],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: ['node18'],
  outfile: `${outdir}/extension.js`,
  sourcemap: false,
  external: [
    'vscode',
    // Native modules or binaries we should not bundle
    'fsevents'
  ],
  define: {
    'process.env.NODE_ENV': '"production"'
  },
  logLevel: 'info'
});

// Copy assets that are required at runtime
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
if (pkg && pkg.contributes) {
  writeFileSync(`${outdir}/package.contributes.json`, JSON.stringify(pkg.contributes, null, 2));
}
