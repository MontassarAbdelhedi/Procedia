/**
 * Pure update metadata, version, throttle, and path-validation helpers.
 * DEPENDS ON: (none)
 * MUST LOAD BEFORE: updater/nodeAdapter.js, updater/updateService.js
 */
var updaterCore = (function() {
  var DAY_MS = 24 * 60 * 60 * 1000;
  var SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/;

  function parseVersion(value) {
    if (typeof value !== 'string') return null;
    var normalized = value.trim().replace(/^v/, '');
    var match = SEMVER.exec(normalized);
    if (!match) return null;
    return {
      raw: normalized,
      major: Number(match[1]),
      minor: Number(match[2]),
      patch: Number(match[3]),
      prerelease: match[4] || null
    };
  }

  function compareVersions(left, right) {
    var a = parseVersion(left);
    var b = parseVersion(right);
    if (!a || !b) throw new Error('Invalid semantic version');
    var fields = ['major', 'minor', 'patch'];
    for (var i = 0; i < fields.length; i++) {
      if (a[fields[i]] > b[fields[i]]) return 1;
      if (a[fields[i]] < b[fields[i]]) return -1;
    }
    if (a.prerelease === b.prerelease) return 0;
    if (a.prerelease === null) return 1;
    if (b.prerelease === null) return -1;
    var aa = a.prerelease.split('.');
    var bb = b.prerelease.split('.');
    var length = Math.max(aa.length, bb.length);
    for (var j = 0; j < length; j++) {
      if (aa[j] === undefined) return -1;
      if (bb[j] === undefined) return 1;
      if (aa[j] === bb[j]) continue;
      var an = /^\d+$/.test(aa[j]);
      var bn = /^\d+$/.test(bb[j]);
      if (an && bn) return Number(aa[j]) > Number(bb[j]) ? 1 : -1;
      if (an !== bn) return an ? -1 : 1;
      return aa[j] > bb[j] ? 1 : -1;
    }
    return 0;
  }

  function shouldRunDailyCheck(lastAttempt, now) {
    if (!lastAttempt) return true;
    var parsed = Date.parse(lastAttempt);
    if (!isFinite(parsed)) return true;
    return now - parsed >= DAY_MS;
  }

  function isHttpsUrl(value) {
    try { return new URL(value).protocol === 'https:'; }
    catch (e) { return false; }
  }

  function validateMetadata(value) {
    if (!value || typeof value !== 'object') throw new Error('Update metadata is invalid.');
    var required = ['version', 'downloadUrl', 'sha256', 'publishedAt', 'minimumAfterEffectsVersion', 'minimumUpdaterVersion'];
    for (var i = 0; i < required.length; i++) {
      if (typeof value[required[i]] !== 'string' || !value[required[i]].trim()) {
        throw new Error('Update metadata is missing ' + required[i] + '.');
      }
    }
    var version = parseVersion(value.version);
    if (!version || version.prerelease) throw new Error('Only stable semantic-version releases are supported.');
    if (!parseVersion(value.minimumUpdaterVersion)) throw new Error('The minimum updater version is invalid.');
    if (!/^\d+(?:\.\d+){0,2}$/.test(value.minimumAfterEffectsVersion)) {
      throw new Error('The minimum After Effects version is invalid.');
    }
    if (!isHttpsUrl(value.downloadUrl)) throw new Error('The update URL must use HTTPS.');
    if (!/^[a-fA-F0-9]{64}$/.test(value.sha256)) throw new Error('The SHA-256 checksum is invalid.');
    if (!isFinite(Date.parse(value.publishedAt))) throw new Error('The publication date is invalid.');
    if (value.releaseNotesUrl && !isHttpsUrl(value.releaseNotesUrl)) {
      throw new Error('The release-notes URL must use HTTPS.');
    }
    var expectedAsset = 'https://github.com/MontassarAbdelhedi/Procedia/releases/download/v' + version.raw + '/procedia-v' + version.raw + '.zip';
    if (value.downloadUrl !== expectedAsset) throw new Error('The update asset is not an official Procedia release.');
    var expectedNotes = 'https://github.com/MontassarAbdelhedi/Procedia/releases/tag/v' + version.raw;
    if (value.releaseNotesUrl && value.releaseNotesUrl !== expectedNotes) {
      throw new Error('The release-notes URL is not an official Procedia release.');
    }
    return {
      version: version.raw,
      downloadUrl: value.downloadUrl,
      sha256: value.sha256.toLowerCase(),
      publishedAt: new Date(value.publishedAt).toISOString(),
      minimumAfterEffectsVersion: value.minimumAfterEffectsVersion,
      minimumUpdaterVersion: parseVersion(value.minimumUpdaterVersion).raw,
      releaseNotesUrl: value.releaseNotesUrl || null
    };
  }

  function majorMinor(value) {
    var match = /^(\d+)(?:\.(\d+))?/.exec(String(value || ''));
    if (!match) return null;
    return Number(match[1]) + (Number(match[2] || 0) / 1000);
  }

  function checkCompatibility(metadata, aeVersion, updaterVersion) {
    if (compareVersions(updaterVersion, metadata.minimumUpdaterVersion) < 0) {
      return { compatible: false, reason: 'This release requires a newer updater.' };
    }
    var currentAE = majorMinor(aeVersion);
    var minimumAE = majorMinor(metadata.minimumAfterEffectsVersion);
    if (currentAE === null || minimumAE === null) {
      return { compatible: false, reason: 'The After Effects version could not be verified.' };
    }
    if (currentAE < minimumAE) {
      return { compatible: false, reason: 'This release requires After Effects ' + metadata.minimumAfterEffectsVersion + ' or newer.' };
    }
    return { compatible: true, reason: null };
  }

  function isUnsafeArchivePath(value) {
    if (typeof value !== 'string' || !value) return true;
    var normalized = value.replace(/\\/g, '/');
    if (normalized.charAt(0) === '/' || /^[A-Za-z]:/.test(normalized)) return true;
    var parts = normalized.split('/');
    for (var i = 0; i < parts.length; i++) {
      if (parts[i] === '..') return true;
    }
    return false;
  }

  return {
    DAY_MS: DAY_MS,
    parseVersion: parseVersion,
    compareVersions: compareVersions,
    shouldRunDailyCheck: shouldRunDailyCheck,
    validateMetadata: validateMetadata,
    checkCompatibility: checkCompatibility,
    isUnsafeArchivePath: isUnsafeArchivePath
  };
})();
