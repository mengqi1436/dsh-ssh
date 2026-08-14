/**
 * Single-file client + ESM host build for dsh-ssh.
 *
 * The web server serves exactly one file per plugin
 * (`/plugins/dsh-ssh/client.js`), so the client half is one CJS bundle
 * wrapped in the ModuleLoader factory handshake; `@deepseek-ai/dsh-*` and
 * `react` stay external. The host half is plain ESM for Node, externalising
 * `@deepseek-ai/dsh-*` plus `cordis` while bundling the runtime deps.
 */
import { build } from 'esbuild'
import { mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

mkdirSync('lib', { recursive: true })

const dshExternal = ['@deepseek-ai/cordis', '@deepseek-ai/dsh-*']
// ssh2 has an optional native dep `cpu-features`; we don't need arch
// detection at runtime and esbuild must not try to resolve the native binary.
const runtimeExternal = [...dshExternal, 'ssh2', 'cpu-features', 'cpu_features']

await build({
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: runtimeExternal,
  logLevel: 'info',
})

await build({
  entryPoints: ['src/invariant.ts'],
  outfile: 'lib/invariant.js',
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: ['node22'],
  sourcemap: true,
  external: runtimeExternal,
  logLevel: 'info',
})

await build({
  entryPoints: ['src/client/index.ts'],
  outfile: 'lib/client.js',
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: ['es2022'],
  sourcemap: true,
  jsx: 'automatic',
  external: [...dshExternal, 'react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'scheduler'],
  banner: {
    js: "window.__ModuleLoader__.load({ id: 'dsh-ssh', factory: (require) => { var module = { exports: {} }; var exports = module.exports;",
  },
  footer: {
    js: 'return module.exports; } });',
  },
  logLevel: 'info',
})

try {
  execFileSync(process.execPath, ['node_modules/typescript/lib/tsc.js', '-p', 'tsconfig.json', '--emitDeclarationOnly', '--declaration', '--outDir', 'lib'], { stdio: 'inherit' })
} catch (err) {
  // tsc emit is only meaningful inside a DSH monorepo where every
  // `@deepseek-ai/dsh-*` peer resolves; esbuild produced the runtime bundle
  // above either way. Re-run this from inside the monorepo for full type
  // coverage.
  console.warn('tsc emit skipped (run inside the DSH monorepo for typed .d.ts):', err.message)
}
