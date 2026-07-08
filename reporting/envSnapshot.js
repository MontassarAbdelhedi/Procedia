// reporting/envSnapshot.js
// DEPENDS ON: graph/graphState/index.js, ui/settings.js
// MUST LOAD BEFORE: reporting/reporter.js, index.js
//
// Captures environment snapshot for bug reports: plugin version, AE version,
// OS, graph stats, and a ring buffer of recent user actions.

var envSnapshot = (function() {

  var MAX_ACTIONS = 50;
  var _actions = [];

  var _pluginVersion = '0.0.4';
  var _aeVersion = null;

  /**
   * Reads the plugin version from the CEP manifest if available, otherwise
   * falls back to the compiled-in version constant.
   */
  function _readPluginVersion() {
    try {
      if (typeof csInterface !== 'undefined' && csInterface.getSystemPath) {
        var extPath = csInterface.getSystemPath(SystemPath.EXTENSION);
        var req = new XMLHttpRequest();
        req.open('GET', extPath + '/CSXS/manifest.xml', false);
        req.overrideMimeType('text/xml');
        req.send();
        if (req.status === 200 || req.status === 0) {
          var match = req.responseText.match(/<ExtensionBundleVersion>([^<]+)<\/ExtensionBundleVersion>/);
          if (match) _pluginVersion = match[1];
        }
      }
    } catch (e) {}
  }

  /**
   * Queries AE version via the bridge. Caches the result.
   * @param {function} cb Callback receiving the version string
   */
  function fetchAEVersion(cb) {
    if (_aeVersion !== null) {
      cb(_aeVersion);
      return;
    }
    if (typeof evalBridge === 'undefined' || !evalBridge.dispatch) {
      cb(null);
      return;
    }
    evalBridge.dispatch({ action: 'getAEVersion' }).then(function(res) {
      if (res.ok) {
        _aeVersion = res.data;
        cb(_aeVersion);
      } else {
        cb(null);
      }
    }).catch(function() {
      cb(null);
    });
  }

  /**
   * Records a user action into the ring buffer.
   * @param {string} action Description of the action
   * @param {Object} [meta] Optional metadata
   */
  function addAction(action, meta) {
    _actions.push({
      t: Date.now(),
      a: action,
      m: meta || null
    });
    if (_actions.length > MAX_ACTIONS) {
      _actions.shift();
    }
  }

  /**
   * Returns a snapshot of the current environment.
   * @param {function} cb Callback receiving the snapshot object
   */
  function getSnapshot(cb) {
    fetchAEVersion(function(aeVer) {
      var allNodes = (typeof graphState !== 'undefined' && graphState.getAllNodes)
        ? graphState.getAllNodes() : {};
      var allWires = (typeof graphState !== 'undefined' && graphState.getAllWires)
        ? graphState.getAllWires() : {};

      var nodeCount = 0;
      var wireCount = 0;
      for (var n in allNodes) { if (allNodes.hasOwnProperty(n)) nodeCount++; }
      for (var w in allWires) { if (allWires.hasOwnProperty(w)) wireCount++; }

      var graphExport = { nodes: [], wires: [] };
      for (var gn in allNodes) {
        if (!allNodes.hasOwnProperty(gn)) continue;
        var nd = allNodes[gn];
        graphExport.nodes.push({
          uuid: nd.id, title: nd.props && nd.props.label, kind: nd.nodeKind,
          type: nd.type, state: nd.state, compCount: (nd.hostingComps || []).length
        });
      }
      for (var gw in allWires) {
        if (!allWires.hasOwnProperty(gw)) continue;
        var wd = allWires[gw];
        graphExport.wires.push({ uuid: wd.id, from: wd.fromNode, to: wd.toNode, type: wd.type });
      }

      cb({
        pluginVersion: _pluginVersion,
        aeVersion: aeVer || null,
        os: navigator.platform || null,
        screenRes: (screen && screen.width && screen.height)
          ? screen.width + 'x' + screen.height : null,
        nodeCount: nodeCount,
        wireCount: wireCount,
        graphExport: graphExport,
        recentActions: _actions.slice()
      });
    });
  }

  _readPluginVersion();

  return {
    addAction: addAction,
    getSnapshot: getSnapshot,
    getPluginVersion: function() { return _pluginVersion; }
  };

})();
