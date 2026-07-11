/**
 * @fileoverview Large command chunking handlers (ES3-safe).
 * When evalBridge detects a command payload exceeds AE's eval string limit,
 * it splits it into chunks and writes them to a temp file via these handlers.
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleWriteCmdChunk, _handleExecuteCmdFile, _handleCleanupCmdFile
 */

function _cmdChunkFilePath(id) {
  return _pluginRootFolder().fsName + '/data/cmd_' + id + '.tmp';
}

function _handleWriteCmdChunk(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var p = _cmdParams(cmd);
    if (typeof p.id !== 'string' || typeof p.data !== 'string') {
      result.error = 'writeCmdChunk: id and data required';
      return result;
    }
    var file = new File(_cmdChunkFilePath(p.id));
    if (p.index === 0) {
      file.open('w');
    } else {
      file.open('a');
    }
    file.write(p.data);
    file.close();
    result.ok = true;
    result.data = { index: p.index };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleExecuteCmdFile(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var p = _cmdParams(cmd);
    if (typeof p.id !== 'string') {
      result.error = 'executeCmdFile: id required';
      return result;
    }
    var file = new File(_cmdChunkFilePath(p.id));
    if (!file.exists) {
      result.error = 'executeCmdFile: temp file not found: ' + p.id;
      return result;
    }
    file.open('r');
    var content = file.read();
    file.close();
    file.remove();
    var commandObj = JSON.parse(content);
    return _route(commandObj);
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleCleanupCmdFile(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var p = _cmdParams(cmd);
    if (typeof p.id !== 'string') {
      result.error = 'cleanupCmdFile: id required';
      return result;
    }
    var file = new File(_cmdChunkFilePath(p.id));
    if (file.exists) {
      file.remove();
    }
    result.ok = true;
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
