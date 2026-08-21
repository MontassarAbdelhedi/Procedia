'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const build = path.join(root, 'build');
const dist = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const archiveName = 'procedia-v' + version + '.zip';
const archive = path.join(dist, archiveName);

if (!fs.existsSync(path.join(build, 'CSXS', 'manifest.xml'))) throw new Error('Run npm run build before packaging a release.');
fs.mkdirSync(dist, { recursive: true });
if (fs.existsSync(archive)) fs.unlinkSync(archive);

const command = "Compress-Archive -Path (Join-Path $args[0] '*') -DestinationPath $args[1] -CompressionLevel Optimal";
const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command, build, archive], { stdio: 'inherit' });
if (result.status !== 0 || !fs.existsSync(archive)) throw new Error('Release ZIP creation failed.');

const sha256 = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
fs.writeFileSync(path.join(dist, archiveName + '.sha256'), sha256 + '  ' + archiveName + '\n', 'utf8');

const metadata = {
  version,
  downloadUrl: 'https://github.com/MontassarAbdelhedi/Procedia/releases/download/v' + version + '/' + archiveName,
  sha256,
  publishedAt: new Date().toISOString(),
  minimumAfterEffectsVersion: '17.0',
  minimumUpdaterVersion: '1.0.0',
  releaseNotesUrl: 'https://github.com/MontassarAbdelhedi/Procedia/releases/tag/v' + version
};
fs.writeFileSync(path.join(root, 'latest.json'), JSON.stringify(metadata, null, 2) + '\n', 'utf8');
fs.writeFileSync(path.join(dist, 'latest.json'), JSON.stringify(metadata, null, 2) + '\n', 'utf8');
console.log('[release] wrote ' + archiveName + ', checksum, and latest.json');
