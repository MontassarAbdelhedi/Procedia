/**
 * Procedia update state machine and orchestration service.
 * DEPENDS ON: updater/core.js, updater/nodeAdapter.js
 * MUST LOAD BEFORE: ui/settingsModal/*, ui/topBar/*, index.js
 */
var updateService = (function() {
  var FEED_URL = 'https://raw.githubusercontent.com/MontassarAbdelhedi/Procedia/main/latest.json';
  var UPDATER_VERSION = '1.0.0';
  var EXTENSION_ID = 'com.uppercut.procedia';
  var _adapter = updaterNodeAdapter;
  var _csInterface = null;
  var _paths = null;
  var _operation = null;
  var _installOperation = null;
  var _listeners = [];
  var _sessionAutoCheck = false;
  var _state = {
    status: 'idle',
    currentVersion: '0.0.0',
    latestVersion: null,
    release: null,
    progress: null,
    indeterminate: false,
    message: 'Check for updates to see whether a new release is available.',
    error: null
  };
  var _persistent = null;

  function defaultPersistentState() {
    return {
      lastUpdateCheckAttempt: null,
      lastSuccessfulUpdateCheck: null,
      availableVersion: null,
      availableRelease: null,
      pendingUpdate: null,
      lastUpdateError: null
    };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readCurrentVersion() {
    try {
      var request = new XMLHttpRequest();
      request.open('GET', 'CSXS/manifest.xml', false);
      request.send();
      var match = request.responseText.match(/ExtensionBundleVersion\s*=\s*["']([^"']+)["']/);
      if (match && updaterCore.parseVersion(match[1])) return updaterCore.parseVersion(match[1]).raw;
    } catch (error) {
      console.warn('[updater] Could not read the installed version:', error);
    }
    return '0.0.0';
  }

  function emit() {
    var snapshot = getState();
    for (var i = 0; i < _listeners.length; i++) {
      try { _listeners[i](snapshot); }
      catch (error) { console.warn('[updater] listener failed:', error); }
    }
    window.dispatchEvent(new CustomEvent('procedia:update-state', { detail: snapshot }));
  }

  function setState(status, values) {
    _state.status = status;
    values = values || {};
    for (var key in values) {
      if (values.hasOwnProperty(key)) _state[key] = values[key];
    }
    emit();
  }

  function savePersistent() {
    if (!_paths) return;
    _adapter.writeJsonAtomic(_paths.stateFile, _persistent);
  }

  function userMessage(error, fallback) {
    var text = error && error.message ? error.message : String(error || '');
    console.error('[updater]', text);
    try { if (_paths && _paths.logFile && _adapter.appendLog) _adapter.appendLog(_paths.logFile, text.replace(/https?:\/\/[^\s]+/g, '[url redacted]')); }
    catch (logError) { console.warn('[updater] log write failed:', logError); }
    if (/checksum|SHA-256/i.test(text)) return 'The downloaded package failed verification.';
    if (/archive|package|manifest|extension id|version/i.test(text)) return 'The update package is invalid.';
    if (/writ|access|permission|denied/i.test(text)) return 'The Procedia installation directory is not writable.';
    if (/timeout|connect|network|ENOTFOUND|ECONN|offline|HTTP/i.test(text)) return 'Unable to connect to the update server.';
    if (/locked|being used|in use/i.test(text)) return 'Some files are currently in use.';
    return fallback || 'The update could not be completed.';
  }

  function reconcilePending() {
    var pending = _persistent.pendingUpdate;
    if (!pending) return;
    if (_state.currentVersion === pending.version) {
      pending.activated = true;
      savePersistent();
      setState('completed', {
        latestVersion: _state.currentVersion,
        release: null,
        progress: 100,
        indeterminate: false,
        message: 'Procedia ' + _state.currentVersion + ' was installed successfully.',
        error: null
      });
      return;
    }
    var result = _adapter.readJson(pending.resultFile, null);
    if (result && result.ok === false) {
      _persistent.pendingUpdate = null;
      _persistent.lastUpdateError = result.error || 'Installation failed.';
      savePersistent();
      setState('failed', {
        progress: null,
        indeterminate: false,
        message: 'The update could not be completed; the previous version was restored.',
        error: _persistent.lastUpdateError
      });
      return;
    }
    if (!pending.helperStarted) {
      setState('readyToInstall', {
        latestVersion: pending.version,
        release: _persistent.availableRelease,
        progress: 96,
        indeterminate: false,
        message: 'Update ready to install.',
        error: null
      });
      return;
    }
    setState('restartRequired', {
      latestVersion: pending.version,
      release: _persistent.availableRelease,
      progress: 100,
      indeterminate: false,
      message: 'Restart After Effects to finish the update.',
      error: null
    });
  }

  function init(csInterface) {
    _csInterface = csInterface;
    _state.currentVersion = readCurrentVersion();
    try {
      var path = _adapter.nodeRequire('path');
      var userData = csInterface.getSystemPath(SystemPath.USER_DATA);
      var extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION);
      var appData = path.join(userData, 'Uppercut Studio', 'Procedia');
      _paths = {
        extensionRoot: extensionRoot,
        appData: appData,
        stateFile: path.join(appData, 'updater-state.json'),
        updates: path.join(appData, 'updates'),
        helper: path.join(appData, 'updater', 'procedia-update-helper.ps1'),
        logFile: path.join(appData, 'logs', 'updater.log')
      };
      _adapter.mkdirp(_paths.updates);
      _adapter.copyFile(path.join(extensionRoot, 'updater', 'helper.ps1'), _paths.helper);
      _persistent = _adapter.readJson(_paths.stateFile, defaultPersistentState());
      var defaults = defaultPersistentState();
      for (var key in defaults) {
        if (!_persistent.hasOwnProperty(key)) _persistent[key] = defaults[key];
      }
      _state.latestVersion = _persistent.availableVersion;
      _state.release = _persistent.availableRelease;
      if (_persistent.availableVersion && updaterCore.compareVersions(_persistent.availableVersion, _state.currentVersion) > 0) {
        _state.status = 'updateAvailable';
        _state.message = 'Procedia ' + _persistent.availableVersion + ' is available.';
      }
      reconcilePending();
      if (!_persistent.pendingUpdate) cleanTemporaryFiles();
    } catch (error) {
      _persistent = defaultPersistentState();
      setState('failed', { message: userMessage(error), error: error.message || String(error) });
    }
    emit();
    return getState();
  }

  function checkForUpdates(options) {
    options = options || {};
    if (_operation) return _operation;
    if (!_persistent || !_paths) return Promise.reject(new Error('The update service is not initialized.'));
    var now = Date.now();
    if (!options.manual && (!updaterCore.shouldRunDailyCheck(_persistent.lastUpdateCheckAttempt, now) || _sessionAutoCheck)) {
      return Promise.resolve(getState());
    }
    if (!options.manual) _sessionAutoCheck = true;
    _persistent.lastUpdateCheckAttempt = new Date(now).toISOString();
    savePersistent();
    setState('checking', { progress: null, indeterminate: true, message: 'Checking for updates...', error: null });

    _operation = _adapter.getJson(FEED_URL).then(function(raw) {
      var release = updaterCore.validateMetadata(raw);
      var compatibility = updaterCore.checkCompatibility(release, options.aeVersion, UPDATER_VERSION);
      _persistent.lastSuccessfulUpdateCheck = new Date().toISOString();
      _persistent.lastUpdateError = null;
      if (!compatibility.compatible) {
        _persistent.availableVersion = null;
        _persistent.availableRelease = null;
        savePersistent();
        setState('upToDate', { latestVersion: release.version, release: null, indeterminate: false, message: compatibility.reason, error: null });
        return getState();
      }
      if (updaterCore.compareVersions(release.version, _state.currentVersion) > 0) {
        _persistent.availableVersion = release.version;
        _persistent.availableRelease = release;
        savePersistent();
        setState('updateAvailable', {
          latestVersion: release.version,
          release: release,
          progress: null,
          indeterminate: false,
          message: 'Procedia ' + release.version + ' is available.',
          error: null
        });
      } else {
        _persistent.availableVersion = null;
        _persistent.availableRelease = null;
        savePersistent();
        setState('upToDate', {
          latestVersion: release.version,
          release: null,
          progress: 100,
          indeterminate: false,
          message: 'Procedia is up to date.',
          error: null
        });
      }
      return getState();
    }).catch(function(error) {
      var message = userMessage(error, 'Unable to connect to the update server.');
      _persistent.lastUpdateError = error.message || String(error);
      savePersistent();
      if (options.manual) {
        setState('failed', { progress: null, indeterminate: false, message: message, error: _persistent.lastUpdateError });
      } else {
        setState(_persistent.availableVersion ? 'updateAvailable' : 'idle', {
          progress: null,
          indeterminate: false,
          message: _persistent.availableVersion ? 'Procedia ' + _persistent.availableVersion + ' is available.' : 'Check for updates to see whether a new release is available.',
          error: null
        });
      }
      throw error;
    }).then(function(result) {
      _operation = null;
      return result;
    }, function(error) {
      _operation = null;
      throw error;
    });
    return _operation;
  }

  function downloadUpdate() {
    if (_operation) return _operation;
    var release = _persistent && _persistent.availableRelease;
    if (!release) return Promise.reject(new Error('No compatible update is available.'));
    var path = _adapter.nodeRequire('path');
    var workDir = path.join(_paths.updates, release.version + '-' + Date.now());
    var archive = path.join(workDir, 'procedia.zip');
    var staging = path.join(workDir, 'staging');
    var planFile = path.join(workDir, 'install-plan.json');
    var resultFile = path.join(workDir, 'install-result.json');
    _adapter.mkdirp(workDir);
    setState('downloading', { progress: 0, indeterminate: true, message: 'Downloading update...', error: null });

    _operation = _adapter.download(release.downloadUrl, archive, function(received, total) {
      setState('downloading', {
        progress: total ? Math.min(75, Math.floor((received / total) * 75)) : null,
        indeterminate: !total,
        message: total ? 'Downloading update... ' + Math.floor((received / total) * 100) + '%' : 'Downloading update...'
      });
    }).then(function() {
      setState('verifying', { progress: 75, indeterminate: false, message: 'Verifying package...' });
      return _adapter.sha256(archive);
    }).then(function(hash) {
      if (hash.toLowerCase() !== release.sha256) throw new Error('SHA-256 checksum mismatch.');
      setState('extracting', { progress: 82, indeterminate: false, message: 'Preparing files...' });
      return _adapter.runHelper(_paths.helper, [
        '-Mode', 'prepare', '-Archive', archive, '-Staging', staging,
        '-ExpectedId', EXTENSION_ID, '-ExpectedVersion', release.version
      ], false);
    }).then(function() {
      setState('readyToInstall', { progress: 96, indeterminate: false, message: 'Update ready to install.' });
      _adapter.assertWritable(_paths.extensionRoot);
      var backup = _paths.extensionRoot + '.previous';
      var plan = {
        target: _paths.extensionRoot,
        staging: staging,
        backup: backup,
        expectedId: EXTENSION_ID,
        expectedVersion: release.version,
        waitPid: _adapter.nodeRequire('process').pid,
        resultFile: resultFile
      };
      _adapter.writeJsonAtomic(planFile, plan);
      _persistent.pendingUpdate = {
        version: release.version,
        planFile: planFile,
        resultFile: resultFile,
        backup: backup,
        workDir: workDir,
        stagedAt: new Date().toISOString(),
        helperStarted: false
      };
      savePersistent();
      return getState();
    }).catch(function(error) {
      try { _adapter.removeTree(workDir); } catch (cleanupError) { console.warn('[updater] cleanup failed:', cleanupError); }
      _persistent.pendingUpdate = null;
      _persistent.lastUpdateError = error.message || String(error);
      savePersistent();
      setState('failed', { progress: null, indeterminate: false, message: userMessage(error), error: _persistent.lastUpdateError });
      throw error;
    }).then(function(result) {
      _operation = null;
      return result;
    }, function(error) {
      _operation = null;
      throw error;
    });
    return _operation;
  }

  function installUpdate(aeVersion) {
    if (_installOperation) return _installOperation;
    var release;
    try {
      release = updaterCore.validateMetadata(_persistent && _persistent.availableRelease);
      var compatibility = updaterCore.checkCompatibility(release, aeVersion, UPDATER_VERSION);
      if (!compatibility.compatible) throw new Error(compatibility.reason);
    } catch (validationError) {
      setState('failed', { message: userMessage(validationError), error: validationError.message });
      return Promise.reject(validationError);
    }
    function launch() {
      var pending = _persistent.pendingUpdate;
      if (!pending) throw new Error('The update has not been staged.');
      setState('installing', { progress: 96, indeterminate: true, message: 'Scheduling installation...', error: null });
      return _adapter.runHelper(_paths.helper, ['-Mode', 'install', '-Plan', pending.planFile], true).then(function() {
        pending.helperStarted = true;
        pending.startedAt = new Date().toISOString();
        savePersistent();
        setState('restartRequired', {
          progress: 100,
          indeterminate: false,
          message: 'Restart After Effects to finish the update.',
          error: null
        });
        return getState();
      });
    }
    _installOperation = (_state.status === 'readyToInstall' ? launch() : downloadUpdate().then(launch)).then(function(result) {
      _installOperation = null;
      return result;
    }, function(error) {
      _installOperation = null;
      setState('failed', { progress: null, indeterminate: false, message: userMessage(error), error: error.message || String(error) });
      throw error;
    });
    return _installOperation;
  }

  function cleanTemporaryFiles() {
    if (!_paths || (_persistent && _persistent.pendingUpdate)) return;
    try {
      _adapter.removeTree(_paths.updates);
      _adapter.mkdirp(_paths.updates);
    } catch (error) {
      console.warn('[updater] temporary-file cleanup failed:', error);
    }
  }

  function confirmHealthyStart() {
    if (!_persistent || !_persistent.pendingUpdate || !_persistent.pendingUpdate.activated) return false;
    var pending = _persistent.pendingUpdate;
    try { if (pending.backup) _adapter.removeTree(pending.backup); }
    catch (error) { console.warn('[updater] previous-version cleanup failed:', error); }
    try { if (pending.workDir) _adapter.removeTree(pending.workDir); }
    catch (error2) { console.warn('[updater] staged-update cleanup failed:', error2); }
    _persistent.pendingUpdate = null;
    _persistent.availableVersion = null;
    _persistent.availableRelease = null;
    _persistent.lastUpdateError = null;
    savePersistent();
    return true;
  }

  function rollbackUpdate() {
    if (!_persistent || !_persistent.pendingUpdate) return Promise.resolve(false);
    var pending = _persistent.pendingUpdate;
    return _adapter.runHelper(_paths.helper, ['-Mode', 'rollback', '-Plan', pending.planFile], true).then(function() {
      setState('restartRequired', { message: 'Restart After Effects to restore the previous version.' });
      return true;
    });
  }

  function onStateChange(listener) {
    if (typeof listener !== 'function') return function() {};
    _listeners.push(listener);
    listener(getState());
    return function() {
      var index = _listeners.indexOf(listener);
      if (index !== -1) _listeners.splice(index, 1);
    };
  }

  function getState() { return clone(_state); }
  function getCurrentVersion() { return _state.currentVersion; }
  function shouldRunDailyCheck() {
    return !_sessionAutoCheck && _persistent && updaterCore.shouldRunDailyCheck(_persistent.lastUpdateCheckAttempt, Date.now());
  }

  return {
    init: init,
    getCurrentVersion: getCurrentVersion,
    shouldRunDailyCheck: shouldRunDailyCheck,
    checkForUpdates: checkForUpdates,
    downloadUpdate: downloadUpdate,
    verifyPackage: function(filePath, sha) { return _adapter.sha256(filePath).then(function(actual) { return actual.toLowerCase() === sha.toLowerCase(); }); },
    stageUpdate: downloadUpdate,
    installUpdate: installUpdate,
    rollbackUpdate: rollbackUpdate,
    cleanTemporaryFiles: cleanTemporaryFiles,
    confirmHealthyStart: confirmHealthyStart,
    getState: getState,
    onStateChange: onStateChange,
    _setAdapter: function(adapter) { _adapter = adapter; },
    _defaultPersistentState: defaultPersistentState
  };
})();
