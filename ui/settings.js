// ui/settings.js
// DEPENDS ON: nothing
// MUST LOAD BEFORE: ui/settingsModal.js, index.js

var settings = (function () {

  var STORAGE_KEY = 'procedia_settings';

  var DEFAULTS = {
    minimap:        true,
    wireStyle:      'bezier',
    animatedWires:  true
  };

  var _state = {};

  function _load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        // Merge with defaults — new keys added in future are never undefined
        for (var key in DEFAULTS) {
          if (DEFAULTS.hasOwnProperty(key)) {
            _state[key] = parsed.hasOwnProperty(key) ? parsed[key] : DEFAULTS[key];
          }
        }
      } else {
        // First launch — copy defaults
        for (var k in DEFAULTS) {
          if (DEFAULTS.hasOwnProperty(k)) _state[k] = DEFAULTS[k];
        }
      }
    } catch (e) {
      console.warn('[settings] Failed to load from localStorage, using defaults.', e);
      for (var dk in DEFAULTS) {
        if (DEFAULTS.hasOwnProperty(dk)) _state[dk] = DEFAULTS[dk];
      }
    }
  }

  function _persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_state));
    } catch (e) {
      console.warn('[settings] Failed to persist to localStorage.', e);
    }
  }

  function get(key) {
    return _state.hasOwnProperty(key) ? _state[key] : undefined;
  }

  function set(key, value) {
    if (!DEFAULTS.hasOwnProperty(key)) {
      console.warn('[settings] Unknown key:', key);
      return;
    }
    _state[key] = value;
    _persist();
  }

  function getAll() {
    var copy = {};
    for (var key in _state) {
      if (_state.hasOwnProperty(key)) copy[key] = _state[key];
    }
    return copy;
  }

  // Init on parse
  _load();

  return { get: get, set: set, getAll: getAll };

}());
