/**
 * @fileoverview Cloner source-setup phase (ES3-safe).
 * Parks the source layer in Reserved Comp, creates the internal cloner comp,
 * moves the source into it, and disables it. REQUIRES: actions_comp.jsx
 * Load BEFORE: cloner.jsx
 * Exports: _setupClonerSource
 */
// cloner/setupSource.jsx — Cloner source setup (ES3-safe)
// REQUIRES: actions_comp.jsx

/**
 * Parks source to Reserved, creates internal comp, moves source in, disables it.
 * @param {Object} params - { nodeUUID, hostingCompUUID, layerNodeUUID }
 * @param {CompItem} hostComp
 * @return {Object} { internComp, internSrcLayer, srcIndex } or null on error
 */
function _setupClonerSource(params, hostComp) {
  // Remember original position
  var srcIndex = 0;
  for (var si = 1; si <= hostComp.numLayers; si++) {
    if (hostComp.layer(si).comment === params.layerNodeUUID) { srcIndex = si; break; }
  }

  var srcLayer = findLayerByUUID(hostComp, params.layerNodeUUID);
  if (!srcLayer) return null;

  // Park source to Reserved Comp
  var reserved = findOrCreateReservedComp();
  var savedComment = srcLayer.comment;
  srcLayer.copyToComp(reserved);
  var rk;
  var parkedLayer = null;
  for (rk = 1; rk <= reserved.numLayers; rk++) {
    var RL = reserved.layer(rk);
    if (RL.comment === savedComment) { RL.name = params.nodeUUID; parkedLayer = RL; break; }
  }
  srcLayer.remove();

  // Create internal comp in Procedia folder
  var folder = findOrCreateProcediaFolder();
  var internComp = app.project.items.addComp('__PROCEDIA_CLONER__' + params.nodeUUID, 1920, 1080, 1, 10, 30);
  internComp.comment = params.nodeUUID;
  internComp.parentFolder = folder;

  // Move source from Reserved to internal comp, disable it
  if (parkedLayer) {
    parkedLayer.copyToComp(internComp);
    parkedLayer.remove();
  }
  var internSrcLayer = null;
  for (var ik = 1; ik <= internComp.numLayers; ik++) {
    var IL = internComp.layer(ik);
    if (IL.comment === savedComment) { internSrcLayer = IL; break; }
  }
  if (internSrcLayer) {
    internSrcLayer.enabled = false;
  }

  return { internComp: internComp, internSrcLayer: internSrcLayer, srcIndex: srcIndex };
}
