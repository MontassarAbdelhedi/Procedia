import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadGlobalScript } from '../setup.js';

function baseState(patch = {}) {
  return {
    status: 'idle',
    currentVersion: '0.0.4',
    latestVersion: null,
    release: null,
    progress: null,
    indeterminate: false,
    message: 'Check for updates to see whether a new release is available.',
    error: null,
    ...patch
  };
}

beforeEach(() => {
  document.body.innerHTML = '<div id="top-bar"></div>';
  window.settings = { getAll: () => ({}) };
  window.__sm_apply = { apply: vi.fn() };
  loadGlobalScript('ui/settingsModal/dom.js');
  const overlay = window.__sm_dom.build();
  document.getElementById('top-bar').innerHTML = '<button id="topbar-update-badge" style="display:none"></button>';
  window.updateService = {
    onStateChange: vi.fn(listener => listener(baseState())),
    checkForUpdates: vi.fn(() => Promise.resolve()),
    installUpdate: vi.fn(() => Promise.resolve())
  };
  window.evalBridge = { dispatch: vi.fn(() => Promise.resolve({ ok: true, data: { version: '25.0' } })) };
  window.csInterface = { openURLInDefaultBrowser: vi.fn() };
  loadGlobalScript('ui/settingsModal/updates.js');
  window.__testOverlay = overlay;
});

describe('settings updater UI', () => {
  it('renders an available release and accessible badge', () => {
    __sm_updates.bind();
    __sm_updates.render(baseState({
      status: 'updateAvailable',
      latestVersion: '0.0.5',
      message: 'Procedia 0.0.5 is available.',
      release: { releaseNotesUrl: 'https://github.com/release' }
    }));
    expect(document.getElementById('settings-update-current').textContent).toBe('0.0.4');
    expect(document.getElementById('settings-update-latest').textContent).toBe('0.0.5');
    expect(document.getElementById('settings-install-update').style.display).not.toBe('none');
    expect(document.getElementById('topbar-update-badge').style.display).toBe('inline-flex');
    expect(document.getElementById('topbar-update-badge').getAttribute('aria-label')).toContain('0.0.5');
  });

  it('runs a manual check regardless of automatic-check state', async () => {
    __sm_updates.bind();
    document.getElementById('settings-check-updates').click();
    await Promise.resolve();
    await Promise.resolve();
    expect(updateService.checkForUpdates).toHaveBeenCalledWith({ manual: true, aeVersion: '25.0' });
  });

  it('shows indeterminate progress when size is unavailable', () => {
    __sm_updates.bind();
    __sm_updates.render(baseState({ status: 'downloading', indeterminate: true, message: 'Downloading update...' }));
    const progress = document.getElementById('settings-update-progress');
    expect(progress.classList.contains('indeterminate')).toBe(true);
    expect(progress.getAttribute('aria-valuetext')).toBe('Downloading update...');
  });

  it('removes the badge immediately after activation', () => {
    __sm_updates.bind();
    __sm_updates.render(baseState({ status: 'completed', latestVersion: '0.0.5', progress: 100 }));
    expect(document.getElementById('topbar-update-badge').style.display).toBe('none');
  });
});
