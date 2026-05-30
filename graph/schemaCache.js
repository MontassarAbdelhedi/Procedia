// graph/schemaCache.js
// DEPENDS ON: bridge/evalBridge.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/engine.js

var schemaCache = (function() {

  var _memoryCache = {};
  var _aeVersion   = '';
  var _ready       = false;

  function _memoryKeys() {
    var keys = [];
    for (var k in _memoryCache) {
      if (_memoryCache.hasOwnProperty(k)) keys.push(k);
    }
    return keys;
  }

  function init() {
    return evalBridge.dispatch({ action: 'readSchemaCache' })
      .then(function(res) {
        if (!res.ok) {
          console.warn('[schemaCache] Could not read cache file:', res.error);
          _ready = true;
          return;
        }
        var cached = res.data;
        _aeVersion   = cached.aeVersion || '';
        _memoryCache = cached.schemas   || {};
        return evalBridge.dispatch({ action: 'getAEVersion' });
      })
      .then(function(res) {
        if (!res || !res.ok) {
          console.warn('[schemaCache] Could not get AE version');
          _ready = true;
          return;
        }
        var currentVersion = res.data.version;
        if (currentVersion === _aeVersion) {
          _ready = true;
          return;
        }
        console.log('[schemaCache] AE version changed — running schema diff');
        return _runVersionDiff(currentVersion);
      })
      .catch(function(err) {
        console.error('[schemaCache] init error:', err);
        _ready = true;
      });
  }

  function hasSchema(matchName) {
    return !!_memoryCache[matchName];
  }

  function getSchema(matchName) {
    return _memoryCache[matchName] || null;
  }

  function isReady() {
    return _ready;
  }

  function storeSchema(matchName, schemaData) {
    _memoryCache[matchName] = schemaData;
    _writeToDisk();
  }

  function fetchSchema(matchName) {
    if (_memoryCache[matchName]) {
      return Promise.resolve(_memoryCache[matchName]);
    }
    return evalBridge.dispatch({
      action: 'introspectEffect',
      params: { matchName: matchName }
    }).then(function(res) {
      if (!res.ok) {
        throw new Error(res.error || 'introspectEffect failed');
      }
      storeSchema(matchName, res.data);
      return res.data;
    });
  }

  function _runVersionDiff(newVersion) {
    var knownMatchNames = _memoryKeys();
    if (knownMatchNames.length === 0) {
      _aeVersion = newVersion;
      _ready = true;
      _writeToDisk();
      return Promise.resolve();
    }

    var chain = Promise.resolve();
    var changed = 0;
    var i;
    for (i = 0; i < knownMatchNames.length; i++) {
      (function(matchName) {
        chain = chain.then(function() {
          return evalBridge.dispatch({
            action: 'introspectEffect',
            params: { matchName: matchName }
          }).then(function(res) {
            if (!res.ok) {
              console.warn('[schemaCache] Effect removed in new AE version:', matchName);
              delete _memoryCache[matchName];
              changed++;
              return;
            }
            if (_schemasAreDifferent(_memoryCache[matchName], res.data)) {
              console.log('[schemaCache] Schema changed for:', matchName);
              _memoryCache[matchName] = res.data;
              changed++;
            }
          });
        });
      })(knownMatchNames[i]);
    }

    return chain.then(function() {
      _aeVersion = newVersion;
      _ready = true;
      console.log('[schemaCache] Diff complete — ' + changed + ' schema(s) updated');
      _writeToDisk();
    });
  }

  function _schemasAreDifferent(cachedSchema, newSchema) {
    var cached = cachedSchema.properties || [];
    var fresh  = newSchema.properties    || [];
    if (cached.length !== fresh.length) return true;
    var cachedIndex = {};
    var ci;
    for (ci = 0; ci < cached.length; ci++) {
      cachedIndex[cached[ci].matchName] = cached[ci];
    }
    for (var j = 0; j < fresh.length; j++) {
      var prop = fresh[j];
      if (!cachedIndex[prop.matchName]) return true;
      if (cachedIndex[prop.matchName].type !== prop.type) return true;
    }
    return false;
  }

  function _writeToDisk() {
    evalBridge.dispatch({
      action: 'writeSchemaCache',
      params: { cache: { aeVersion: _aeVersion, schemas: _memoryCache } }
    }).then(function(res) {
      if (!res.ok) console.error('[schemaCache] Failed to write cache:', res.error);
    });
  }

  return {
    init:        init,
    hasSchema:   hasSchema,
    getSchema:   getSchema,
    storeSchema: storeSchema,
    fetchSchema: fetchSchema,
    isReady:     isReady
  };

})();
