/**
 * Update controls and top-bar availability badge synchronization.
 * DEPENDS ON: updater/updateService.js, ui/settingsModal/index.js, ui/topBar/dom.js
 * MUST LOAD BEFORE: index.js
 */
var __sm_updates = (function() {
  var _bound = false;

  function getAEVersion() {
    if (typeof evalBridge === 'undefined' || !evalBridge.dispatch) return Promise.reject(new Error('After Effects is not ready.'));
    return evalBridge.dispatch({ action: 'getAEVersion' }).then(function(result) {
      if (!result || !result.ok || !result.data) throw new Error('After Effects version could not be read.');
      return result.data.version || result.data;
    });
  }

  function setButtonState(button, visible, disabled) {
    if (!button) return;
    button.style.display = visible ? '' : 'none';
    button.disabled = disabled;
  }

  function render(state) {
    var current = document.getElementById('settings-update-current');
    var latest = document.getElementById('settings-update-latest');
    var status = document.getElementById('settings-update-status');
    var progress = document.getElementById('settings-update-progress');
    var progressWrap = document.getElementById('settings-update-progress-wrap');
    var check = document.getElementById('settings-check-updates');
    var install = document.getElementById('settings-install-update');
    var retry = document.getElementById('settings-retry-update');
    var notes = document.getElementById('settings-update-notes');
    var busy = ['checking', 'downloading', 'verifying', 'extracting', 'installing'].indexOf(state.status) !== -1;

    if (current) current.textContent = state.currentVersion;
    if (latest) latest.textContent = state.latestVersion || 'Not checked';
    if (status) {
      status.textContent = state.message;
      status.setAttribute('data-state', state.status);
    }
    if (progressWrap) progressWrap.style.display = busy || state.status === 'readyToInstall' || state.status === 'restartRequired' ? '' : 'none';
    if (progress) {
      progress.classList.toggle('indeterminate', state.indeterminate === true);
      progress.value = state.progress === null ? 0 : state.progress;
      progress.setAttribute('aria-valuetext', state.indeterminate ? state.message : String(state.progress || 0) + '%');
    }
    setButtonState(check, true, busy || state.status === 'restartRequired');
    setButtonState(install, state.status === 'updateAvailable' || state.status === 'readyToInstall', busy);
    setButtonState(retry, state.status === 'failed', false);
    if (notes) {
      notes.style.display = state.release && state.release.releaseNotesUrl ? '' : 'none';
      notes.dataset.url = state.release && state.release.releaseNotesUrl ? state.release.releaseNotesUrl : '';
    }

    var badge = document.getElementById('topbar-update-badge');
    if (badge) {
      var available = state.status === 'updateAvailable' || state.status === 'readyToInstall' || state.status === 'restartRequired';
      badge.style.display = available ? 'inline-flex' : 'none';
      badge.title = state.status === 'restartRequired'
        ? 'Restart After Effects to finish updating Procedia'
        : 'Procedia ' + (state.latestVersion || '') + ' is available';
      badge.setAttribute('aria-label', badge.title);
    }
  }

  function check() {
    return getAEVersion().then(function(version) {
      return updateService.checkForUpdates({ manual: true, aeVersion: version });
    }).catch(function() {});
  }

  function bind() {
    if (_bound || typeof updateService === 'undefined') return;
    _bound = true;
    var checkButton = document.getElementById('settings-check-updates');
    var installButton = document.getElementById('settings-install-update');
    var retryButton = document.getElementById('settings-retry-update');
    var notes = document.getElementById('settings-update-notes');
    if (checkButton) checkButton.addEventListener('click', check);
    if (retryButton) retryButton.addEventListener('click', check);
    if (installButton) installButton.addEventListener('click', function() {
      getAEVersion().then(function(version) { return updateService.installUpdate(version); }).catch(function() {});
    });
    if (notes) notes.addEventListener('click', function() {
      var url = notes.dataset.url;
      if (url && typeof csInterface !== 'undefined') csInterface.openURLInDefaultBrowser(url);
    });
    updateService.onStateChange(render);
  }

  return { bind: bind, render: render, getAEVersion: getAEVersion };
})();
