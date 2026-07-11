// Global test setup — provides minimal browser-like environment for CEP panel tests
// CSInterface is not available in test environment; tests must mock it explicitly.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize the Procedia internal namespace
globalThis.__procedia_internal = {};

/**
 * Loads a legacy IIFE source file as a global script (var -> window assignment).
 * The .jsx and legacy .js files use `var X = (function() { ... })()` which
 * is module-scoped in ESM. This loads them in the global scope so they
 * become available as window.X.
 */
export function loadGlobalScript(relativePath) {
  const absPath = path.resolve(__dirname, '..', relativePath);
  let code = fs.readFileSync(absPath, 'utf-8');
  // Fix: convert top-level `var Name = (function() {` to `window.Name = (function() {`
  code = code.replace(/\nvar (\w+) = \(function\(\)/g, '\nwindow.$1 = (function()');
  code = code.replace(/^var (\w+) = \(function\(\)/, 'window.$1 = (function()');
  (0, eval)(code);
}
