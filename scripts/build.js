// scripts/build.js — creates build/ with secrets injected at build time.
// Source never contains real credentials; the __SENTRY_DSN__ and
// __REPORTING_API_URL__ placeholders in reporting/reporter.js are replaced
// from env vars (SENTRY_DSN / REPORTING_API_URL) or .secrets/build.config.json.
// Unresolved placeholders are left in place — the panel degrades to no-Sentry
// and console-only reporting for those.
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'build');

const PLACEHOLDERS = [
  { token: '__SENTRY_DSN__', env: 'SENTRY_DSN', configKey: 'sentryDsn' },
  { token: '__REPORTING_API_URL__', env: 'REPORTING_API_URL', configKey: 'reportingApiUrl' }
];

// Entries at the repo root that never ship in the extension bundle.
const EXCLUDE = new Set([
  '.git', '.gitignore', '.debug', '.secrets', '.opencode', '.cursor',
  'node_modules', 'tests', '_docs', 'build', 'dist', 'scripts',
  'package.json', 'package-lock.json', 'vitest.config.js', 'latest.json',
  'AGENTS.md', 'CHANGELOG.md', 'README.md', 'RELEASING.md'
]);

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.json', '.html', '.css', '.xml', '.md', '.txt', '.svg'
]);

function loadConfig() {
  const cfgPath = path.join(ROOT, '.secrets', 'build.config.json');
  try {
    return JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
  } catch (e) {
    return {};
  }
}

function resolveValues(cfg) {
  const values = {};
  const missing = [];
  for (const p of PLACEHOLDERS) {
    let v = process.env[p.env] || cfg[p.configKey];
    if (v && typeof v === 'string' && v.trim()) {
      values[p.token] = v.trim();
    } else {
      missing.push(p.token);
    }
  }
  return { values, missing };
}

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function copyDir(srcDir, outDir, values) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (EXCLUDE.has(entry.name)) continue;
    const src = path.join(srcDir, entry.name);
    const dest = path.join(outDir, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      copyDir(src, dest, values);
    } else {
      let data = fs.readFileSync(src);
      if (isTextFile(src)) {
        let text = data.toString('utf-8');
        for (const token of Object.keys(values)) {
          text = text.split(token).join(values[token]);
        }
        data = Buffer.from(text, 'utf-8');
      }
      fs.writeFileSync(dest, data);
    }
  }
}

function main() {
  const cfg = loadConfig();
  const { values, missing } = resolveValues(cfg);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  copyDir(ROOT, OUT, values);

  for (const token of missing) {
    console.warn('[build] warning: ' + token + ' left as placeholder (set the env var or .secrets/build.config.json)');
  }
  console.log('[build] wrote build/ (' + Object.keys(values).length + ' of ' + PLACEHOLDERS.length + ' secrets injected)');
}

main();
