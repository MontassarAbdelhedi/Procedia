// ui/settings.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: ui/settingsModal.js, index.js

var settings = (function() {

  var STORAGE_KEY = 'procedia_settings';

  var _defaults = {
    minimap:    true,
    wireStyle:  'bezier'
  };

  var _cache = null;

  function _load() {
    if (_cache !== null) return _cache;
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        _cache = {};
        for (var key in _defaults) {
          _cache[key] = parsed.hasOwnProperty(key) ? parsed[key] : _defaults[key];
        }
      } else {
        _cache = {};
        for (var key in _defaults) {
          _cache[key] = _defaults[key];
        }
      }
    } catch (e) {
      _cache = {};
      for (var key in _defaults) {
        _cache[key] = _defaults[key];
      }
    }
    return _cache;
  }

  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache));
    } catch (e) {
      console.warn('[settings] save failed:', e);
    }
  }

  function get(key) {
    var store = _load();
    return store.hasOwnProperty(key) ? store[key] : _defaults[key];
  }

  function set(key, value) {
    var store = _load();
    store[key] = value;
    _save();
  }

  function getAll() {
    var store = _load();
    var copy = {};
    for (var key in store) {
      copy[key] = store[key];
    }
    return copy;
  }

  function reset() {
    _cache = {};
    for (var key in _defaults) {
      _cache[key] = _defaults[key];
    }
    _save();
  }

  return {
    get:   get,
    set:   set,
    getAll: getAll,
    reset: reset
  };

})();
