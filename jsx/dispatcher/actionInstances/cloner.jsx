/**
 * @fileoverview Cloner create handler (ES3-safe).
 * Coordinates the three-phase cloner setup: source setup, clone population,
 * and finalization (JSON state + pre-comp placement).
 * REQUIRES: json.jsx, utils.jsx, actions_comp.jsx,
 *           cloner/setupSource.jsx, populateClones.jsx, finalizeCloner.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleCreateCloner
 */
// actionInstances/cloner.jsx — Cloner create handler (ES3-safe)
// REQUIRES: json.jsx, utils.jsx, actions_comp.jsx, cloner/setupSource.jsx, populateClones.jsx, finalizeCloner.jsx

function _handleCreateCloner(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    if (!params.nodeUUID)        { result.error = 'createCloner: nodeUUID required'; return result; }
    if (!params.hostingCompUUID) { result.error = 'createCloner: hostingCompUUID required'; return result; }
    if (!params.layerNodeUUID)   { result.error = 'createCloner: layerNodeUUID required'; return result; }

    var hostComp = findCompByUUID(params.hostingCompUUID);
    if (!hostComp) { result.error = 'createCloner: host comp not found'; return result; }

    var setup = _setupClonerSource(params, hostComp);
    if (!setup) { result.error = 'createCloner: source layer not found: ' + params.layerNodeUUID; return result; }

    var mode = params.mode || 'Linear';
    var props = params.props || {};

    var popResult = _populateClonerClones(setup.internComp, setup.internSrcLayer, mode, props);

    _finalizeCloner(hostComp, setup.internComp, params.nodeUUID,
      params.layerNodeUUID, setup.srcIndex, mode, popResult.transformData, props);

    result.ok = true;
    result.data = { compUUID: params.nodeUUID, cloneCount: popResult.transformData.instances.length };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
