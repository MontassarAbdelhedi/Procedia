import { beforeAll, describe, expect, it } from 'vitest';
import { loadGlobalScript } from '../setup.js';

beforeAll(() => loadGlobalScript('updater/core.js'));

const release = {
  version: '1.2.0',
  downloadUrl: 'https://github.com/MontassarAbdelhedi/Procedia/releases/download/v1.2.0/procedia-v1.2.0.zip',
  sha256: 'a'.repeat(64),
  publishedAt: '2026-08-20T12:00:00Z',
  minimumAfterEffectsVersion: '17.0',
  minimumUpdaterVersion: '1.0.0',
  releaseNotesUrl: 'https://github.com/MontassarAbdelhedi/Procedia/releases/tag/v1.2.0'
};

describe('updaterCore semantic versions', () => {
  it.each([
    ['1.10.0', '1.9.9', 1],
    ['v2.0.0', '1.99.99', 1],
    ['1.2.3', '1.2.3', 0],
    ['1.2.3-beta.2', '1.2.3-beta.10', -1],
    ['1.2.3', '1.2.3-rc.1', 1]
  ])('compares %s with %s', (left, right, expected) => {
    expect(Math.sign(updaterCore.compareVersions(left, right))).toBe(expected);
  });

  it.each(['1.2', '01.2.3', 'latest', '', null])('rejects malformed version %s', value => {
    expect(updaterCore.parseVersion(value)).toBeNull();
  });
});

describe('updaterCore daily checks', () => {
  it('allows a first check and checks after 24 hours', () => {
    const now = Date.parse('2026-08-20T12:00:00Z');
    expect(updaterCore.shouldRunDailyCheck(null, now)).toBe(true);
    expect(updaterCore.shouldRunDailyCheck('2026-08-19T12:00:01Z', now)).toBe(false);
    expect(updaterCore.shouldRunDailyCheck('2026-08-19T12:00:00Z', now)).toBe(true);
  });
});

describe('updaterCore metadata and compatibility', () => {
  it('normalizes valid stable metadata', () => {
    expect(updaterCore.validateMetadata(release)).toMatchObject({ version: '1.2.0', sha256: 'a'.repeat(64) });
  });

  it.each([
    ['prerelease', { version: '1.2.0-beta.1' }],
    ['insecure URL', { downloadUrl: 'http://github.com/file.zip' }],
    ['bad checksum', { sha256: 'abc' }],
    ['bad date', { publishedAt: 'never' }],
    ['missing field', { minimumUpdaterVersion: '' }]
  ])('rejects %s metadata', (_name, patch) => {
    expect(() => updaterCore.validateMetadata({ ...release, ...patch })).toThrow();
  });

  it('rejects assets outside the official repository and tag path', () => {
    expect(() => updaterCore.validateMetadata({
      ...release,
      downloadUrl: 'https://github.com/another/repo/releases/download/v1.2.0/procedia-v1.2.0.zip'
    })).toThrow('official Procedia release');
  });

  it('enforces AE and updater minimums', () => {
    const metadata = updaterCore.validateMetadata(release);
    expect(updaterCore.checkCompatibility(metadata, '17.0.6x45', '1.0.0').compatible).toBe(true);
    expect(updaterCore.checkCompatibility(metadata, '16.1', '1.0.0').compatible).toBe(false);
    expect(updaterCore.checkCompatibility({ ...metadata, minimumUpdaterVersion: '2.0.0' }, '25.0', '1.0.0').compatible).toBe(false);
  });
});

describe('updaterCore archive paths', () => {
  it.each(['../escape.js', 'dir/../../escape.js', '/absolute.js', 'C:\\absolute.js', '..\\escape.js'])('rejects %s', value => {
    expect(updaterCore.isUnsafeArchivePath(value)).toBe(true);
  });

  it.each(['CSXS/manifest.xml', 'graph/nodes/Text.js', 'dir/..name/file'])('accepts %s', value => {
    expect(updaterCore.isUnsafeArchivePath(value)).toBe(false);
  });
});
