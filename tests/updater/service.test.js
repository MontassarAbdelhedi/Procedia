import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadGlobalScript } from '../setup.js';

const validRelease = {
  version: '0.0.5',
  downloadUrl: 'https://github.com/MontassarAbdelhedi/Procedia/releases/download/v0.0.5/procedia-v0.0.5.zip',
  sha256: 'a'.repeat(64),
  publishedAt: '2026-08-20T12:00:00Z',
  minimumAfterEffectsVersion: '17.0',
  minimumUpdaterVersion: '1.0.0',
  releaseNotesUrl: 'https://github.com/MontassarAbdelhedi/Procedia/releases/tag/v0.0.5'
};

function releaseForVersion(version) {
  return {
    ...validRelease,
    version,
    downloadUrl: `https://github.com/MontassarAbdelhedi/Procedia/releases/download/v${version}/procedia-v${version}.zip`,
    releaseNotesUrl: `https://github.com/MontassarAbdelhedi/Procedia/releases/tag/v${version}`
  };
}

function manifestXHR(version) {
  return class {
    open() {}
    send() { this.responseText = `<ExtensionManifest ExtensionBundleVersion="${version}"></ExtensionManifest>`; }
  };
}

function createHarness(options = {}) {
  const files = options.files || {};
  const adapter = {
    nodeRequire: name => name === 'path' ? path : { pid: 1234 },
    mkdirp: vi.fn(),
    copyFile: vi.fn(),
    readJson: vi.fn((file, fallback) => files[file] ? JSON.parse(JSON.stringify(files[file])) : fallback),
    writeJsonAtomic: vi.fn((file, value) => { files[file] = JSON.parse(JSON.stringify(value)); }),
    getJson: vi.fn(() => options.metadataError ? Promise.reject(options.metadataError) : Promise.resolve(options.release || validRelease)),
    download: vi.fn((_url, _file, progress) => {
      if (options.downloadError) return Promise.reject(options.downloadError);
      progress(50, options.missingSize ? null : 100);
      return Promise.resolve({ bytes: 100, total: options.missingSize ? null : 100 });
    }),
    sha256: vi.fn(() => Promise.resolve(options.hash || 'a'.repeat(64))),
    runHelper: vi.fn(() => options.helperError ? Promise.reject(options.helperError) : Promise.resolve({ code: 0 })),
    assertWritable: vi.fn(() => { if (options.unwritable) throw new Error('access denied'); }),
    removeTree: vi.fn(),
    appendLog: vi.fn()
  };
  window.XMLHttpRequest = manifestXHR(options.currentVersion || '0.0.4');
  window.SystemPath = { USER_DATA: 'userData', EXTENSION: 'extension' };
  window.updaterNodeAdapter = adapter;
  loadGlobalScript('updater/core.js');
  loadGlobalScript('updater/updateService.js');
  updateService._setAdapter(adapter);
  const cs = { getSystemPath: key => key === 'userData' ? 'C:\\Users\\Test\\AppData\\Roaming' : 'C:\\extension' };
  updateService.init(cs);
  return { adapter, files, cs };
}

beforeEach(() => {
  vi.restoreAllMocks();
  window.dispatchEvent = vi.fn();
});

describe('updateService checks', () => {
  it('reports no update when the installed release is current', async () => {
    createHarness({ release: releaseForVersion('0.0.4') });
    await updateService.checkForUpdates({ manual: true, aeVersion: '25.0' });
    expect(updateService.getState().status).toBe('upToDate');
  });

  it('persists a newer compatible release', async () => {
    const { files } = createHarness();
    await updateService.checkForUpdates({ manual: true, aeVersion: '17.0' });
    expect(updateService.getState()).toMatchObject({ status: 'updateAvailable', latestVersion: '0.0.5' });
    expect(Object.values(files)[0].availableVersion).toBe('0.0.5');
  });

  it('throttles automatic checks but always permits a manual check', async () => {
    const { adapter } = createHarness();
    await updateService.checkForUpdates({ manual: false, aeVersion: '25.0' });
    await updateService.checkForUpdates({ manual: false, aeVersion: '25.0' });
    await updateService.checkForUpdates({ manual: true, aeVersion: '25.0' });
    expect(adapter.getJson).toHaveBeenCalledTimes(2);
  });

  it('fails quietly for an offline automatic check', async () => {
    createHarness({ metadataError: new Error('ENOTFOUND offline') });
    await expect(updateService.checkForUpdates({ manual: false, aeVersion: '25.0' })).rejects.toThrow();
    expect(updateService.getState()).toMatchObject({ status: 'idle', error: null });
  });
});

describe('updateService staging and install', () => {
  async function findAndInstall(options) {
    const harness = createHarness(options);
    await updateService.checkForUpdates({ manual: true, aeVersion: '25.0' });
    await updateService.installUpdate('25.0');
    return harness;
  }

  it('downloads, verifies, stages, and waits for restart', async () => {
    const { adapter, files } = await findAndInstall();
    expect(adapter.download).toHaveBeenCalledOnce();
    expect(adapter.sha256).toHaveBeenCalledOnce();
    expect(adapter.runHelper).toHaveBeenCalledTimes(2);
    expect(updateService.getState()).toMatchObject({ status: 'restartRequired', progress: 100 });
    expect(Object.values(files).some(value => value.pendingUpdate && value.pendingUpdate.version === '0.0.5')).toBe(true);
  });

  it('coalesces concurrent install requests into one helper launch', async () => {
    const harness = createHarness();
    await updateService.checkForUpdates({ manual: true, aeVersion: '25.0' });
    const first = updateService.installUpdate('25.0');
    const second = updateService.installUpdate('25.0');
    expect(first).toBe(second);
    await first;
    expect(harness.adapter.runHelper).toHaveBeenCalledTimes(2);
  });

  it('supports downloads without Content-Length', async () => {
    await findAndInstall({ missingSize: true });
    expect(updateService.getState().status).toBe('restartRequired');
  });

  it.each([
    ['interrupted download', { downloadError: new Error('ECONNRESET') }],
    ['invalid checksum', { hash: 'b'.repeat(64) }],
    ['corrupted ZIP', { helperError: new Error('The archive is corrupt') }],
    ['incorrect extension ID', { helperError: new Error('extension ID mismatch') }],
    ['unwritable installation', { unwritable: true }]
  ])('leaves the current install active after %s', async (_name, options) => {
    createHarness(options);
    await updateService.checkForUpdates({ manual: true, aeVersion: '25.0' });
    await expect(updateService.installUpdate('25.0')).rejects.toThrow();
    expect(updateService.getState().status).toBe('failed');
  });
});

describe('updateService restart recovery', () => {
  it('marks the new version completed and clears pending state', () => {
    const stateFile = path.join('C:\\Users\\Test\\AppData\\Roaming', 'Uppercut Studio', 'Procedia', 'updater-state.json');
    const files = {
      [stateFile]: {
        lastUpdateCheckAttempt: null,
        lastSuccessfulUpdateCheck: null,
        availableVersion: '0.0.5',
        availableRelease: validRelease,
        pendingUpdate: { version: '0.0.5', resultFile: 'result.json' },
        lastUpdateError: null
      }
    };
    createHarness({ currentVersion: '0.0.5', files });
    expect(updateService.getState().status).toBe('completed');
    expect(files[stateFile].pendingUpdate.activated).toBe(true);
    expect(updateService.confirmHealthyStart()).toBe(true);
    expect(files[stateFile].pendingUpdate).toBeNull();
  });

  it('reports helper rollback without exposing a stack trace', () => {
    const stateFile = path.join('C:\\Users\\Test\\AppData\\Roaming', 'Uppercut Studio', 'Procedia', 'updater-state.json');
    const files = {
      [stateFile]: {
        lastUpdateCheckAttempt: null,
        lastSuccessfulUpdateCheck: null,
        availableVersion: '0.0.5',
        availableRelease: validRelease,
        pendingUpdate: { version: '0.0.5', resultFile: 'result.json' },
        lastUpdateError: null
      },
      'result.json': { ok: false, error: 'locked file' }
    };
    createHarness({ files });
    expect(updateService.getState()).toMatchObject({ status: 'failed', message: 'The update could not be completed; the previous version was restored.' });
  });
});
