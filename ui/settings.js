/**
 * @fileoverview Settings persistence module. Stores user preferences in localStorage.
 * Exports: settings.get, settings.set, settings.getAll, settings.reset
 */
// ui/settings.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: ui/settingsModal/*, index.js

var settings = (function() {

  var STORAGE_KEY = 'procedia_settings';

  var _defaults = {
    minimap:          true,
    wireStyle:        'bezier',
    animatedDash:     false,
    snapToGrid:       false,
    layoutDirection:  'LR',
    layoutHSpacing:   80,
    layoutVSpacing:   40,
    allowReporting:   true,
    showPortLabels:   true
  };

  var _cache = null;

  /**
   * Loads settings from localStorage into the internal cache.
   * @return {Object} The settings object.
   */
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

  /**
   * Persists the internal cache to localStorage.
   */
  function _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(_cache));
    } catch (e) {
      console.warn('[settings] save failed:', e);
    }
  }

  /**
   * Returns a single setting value by key.
   * @param {string} key The setting key.
   * @return {*} The setting value.
   */
  function get(key) {
    var store = _load();
    return store.hasOwnProperty(key) ? store[key] : _defaults[key];
  }

  /**
   * Sets a single setting value and persists.
   * @param {string} key The setting key.
   * @param {*} value The value to store.
   */
  function set(key, value) {
    var store = _load();
    store[key] = value;
    _save();
  }

  /**
   * Returns a shallow copy of all settings.
   * @return {Object} All settings key/value pairs.
   */
  function getAll() {
    var store = _load();
    var copy = {};
    for (var key in store) {
      copy[key] = store[key];
    }
    return copy;
  }

  /**
   * Resets all settings to default values and persists.
   */
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
