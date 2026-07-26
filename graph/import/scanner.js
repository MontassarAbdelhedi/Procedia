/**
 * graph/import/scanner.js
 *
 * Orchestrates AE project scanning for import. Calls the dispatcher scan
 * actions sequentially and returns raw scan data.
 *
 * Depends on: bridge/evalBridge.js
 * Exports: importScanner.scanAll()
 */
// graph/import/scanner.js
// DEPENDS ON: bridge/evalBridge.js
// MUST LOAD BEFORE: graph/import/graphBuilder/helpers.js, graph/import/index.js

var importScanner = (function() {

  /**
   * Scans all comps in the project (excluding reserved comp).
   * @returns {Promise<Array>}
   */
  function _scanComps() {
    return evalBridge.dispatch({ action: 'importScanComps' }).then(function(res) {
      if (!res.ok) throw new Error('Scan comps failed: ' + (res.error || 'unknown'));
      return res.data || [];
    });
  }

  /**
   * Scans all footage items in the project (excluding reserved folder).
   * @returns {Promise<Array>}
   */
  function _scanFootage() {
    return evalBridge.dispatch({ action: 'importScanFootage' }).then(function(res) {
      if (!res.ok) throw new Error('Scan footage failed: ' + (res.error || 'unknown'));
      return res.data || [];
    });
  }

  /**
   * Scans all layers in a single composition.
   * @param {string} compName
   * @returns {Promise<Object>} { compName, layers, numLayers }
   */
  function _scanCompLayers(compName) {
    return evalBridge.dispatch({
      action: 'importScanCompLayers',
      params: { compName: compName }
    }).then(function(res) {
      if (!res.ok) throw new Error('Scan layers for "' + compName + '" failed: ' + (res.error || 'unknown'));
      return res.data;
    });
  }

  /**
   * Scans the entire project: comps, footage, and all comp layers.
   * Returns raw scan data.
   * @returns {Promise<Object>} { comps: Array, footage: Array, compLayers: Array }
   */
  function scanAll() {
    return _scanComps().then(function(comps) {
      return _scanFootage().then(function(footage) {
        // Scan layers for each comp sequentially
        var allCompLayers = [];

        function scanNext(index) {
          if (index >= comps.length) {
            return Promise.resolve({
              comps: comps,
              footage: footage,
              compLayers: allCompLayers
            });
          }
          return _scanCompLayers(comps[index].name).then(function(layerData) {
            allCompLayers.push(layerData);
            return scanNext(index + 1);
          });
        }

        return scanNext(0);
      });
    });
  }

  return {
    scanAll: scanAll
  };

})();
