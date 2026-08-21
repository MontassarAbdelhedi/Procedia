'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const packagePath = path.join(root, 'package.json');
const version = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;

if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
  throw new Error('package.json must contain a stable semantic version.');
}

function replace(relativePath, pattern, replacement, expectedCount) {
  const filePath = path.join(root, relativePath);
  const source = fs.readFileSync(filePath, 'utf8');
  const matches = source.match(pattern) || [];
  if (matches.length !== expectedCount) {
    throw new Error(relativePath + ': expected ' + expectedCount + ' version match(es), found ' + matches.length);
  }
  fs.writeFileSync(filePath, source.replace(pattern, replacement), 'utf8');
}

replace('CSXS/manifest.xml', /(ExtensionBundleVersion=")[^"]+(")/g, '$1' + version + '$2', 1);
replace('CSXS/manifest.xml', /(<Extension Id="com\.uppercut\.procedia" Version=")[^"]+("\/?>)/g, '$1' + version + '$2', 1);
replace('scripts/installer.iss', /(#define MyAppVersion ")[^"]+(".*)/g, '$1' + version + '$2', 1);
replace('reporting/envSnapshot.js', /(var _pluginVersion = ')[^']+(')/g, '$1' + version + '$2', 1);
replace('reporting/reporter/core.js', /(\? envSnapshot\.getPluginVersion\(\) : ')[^']+(')/g, '$1' + version + '$2', 1);

console.log('[version] synchronized ' + version);
