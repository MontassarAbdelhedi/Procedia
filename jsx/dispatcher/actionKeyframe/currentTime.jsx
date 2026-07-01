// actionKeyframe/currentTime.jsx — _handleGetCurrentTime, _handleSetCurrentTime (ES3-safe)
// REQUIRES: json.jsx, utils.jsx

function _handleGetCurrentTime(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = null;
    if (params.hostingCompUUID) {
      comp = findCompByUUID(params.hostingCompUUID);
      if (!comp) { result.error = 'getCurrentTime: comp not found'; return result; }
    } else {
      comp = app.project.activeItem;
      if (!(comp instanceof CompItem)) { result.error = 'getCurrentTime: no active comp'; return result; }
    }
    result.ok = true;
    result.data = { time: comp.time };
  } catch (e) { result.error = e.toString(); }
  return result;
}

function _handleSetCurrentTime(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = null;
    if (params.hostingCompUUID) {
      comp = findCompByUUID(params.hostingCompUUID);
      if (!comp) { result.error = 'setCurrentTime: comp not found'; return result; }
    } else {
      comp = app.project.activeItem;
      if (!(comp instanceof CompItem)) { result.error = 'setCurrentTime: no active comp'; return result; }
    }
    var t = Number(params.time);
    if (isNaN(t)) { result.error = 'setCurrentTime: invalid time'; return result; }
    comp.time = t;
    result.ok = true;
  } catch (e) { result.error = e.toString(); }
  return result;
}
