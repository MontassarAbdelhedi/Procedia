// jsx/nodeLifeCycle/nodeEffectorOps.jsx
// DEPENDS ON: jsx/json.jsx, jsx/nodeLifeCycle/nodeLayerOps.jsx (findCompByUUID, findLayerByUUID)
// Commands: applyEffector, removeEffector
// ES3 — var only, named functions, for loops, string concat

// ─── findEffectByEffectorUUID ─────────────────────────────────────────────────
// Searches a layer's Effect Parade for an effect whose .comment === effectorUUID.

function findEffectByEffectorUUID(layer, effectorUUID) {
  var parade = layer.property('ADBE Effect Parade');
  if (!parade) return null;
  for (var i = 1; i <= parade.numProperties; i++) {
    var fx = parade.property(i);
    if (fx && fx.comment === effectorUUID) return fx;
  }
  return null;
}

// ─── applyEffector ────────────────────────────────────────────────────────────
// Applies an EffectNode to its host layer.
// propsJson must contain at minimum: { aeMatchName: "ADBE Gaussian Blur 2", ... }
// Additional keys are treated as effect property match names → values to set.

function applyEffector(effectorUUID, hostLayerUUID, hostingCompUUID, propsJson) {
  var result = { ok: false, data: null, error: null };
  try {
    var props = {};
    try { props = JSON.parse(propsJson); } catch (pe) { /* empty props */ }

    var matchName = props.aeMatchName;
    if (!matchName) {
      result.error = 'applyEffector: props.aeMatchName is required';
      return JSON.stringify(result);
    }

    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'applyEffector: hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    var hostLayer = findLayerByUUID(hostComp, hostLayerUUID);
    if (!hostLayer) {
      result.error = 'applyEffector: host layer not found: ' + hostLayerUUID;
      return JSON.stringify(result);
    }

    var parade = hostLayer.property('ADBE Effect Parade');

    // Find existing effect owned by this effector, or add a new one.
    var fx = findEffectByEffectorUUID(hostLayer, effectorUUID);
    if (!fx) {
      fx = parade.addProperty(matchName);
      if (!fx) {
        result.error = 'applyEffector: addProperty failed for matchName: ' + matchName;
        return JSON.stringify(result);
      }
      fx.comment = effectorUUID;
    }

    // Apply property values — every key except aeMatchName is a prop match name.
    for (var key in props) {
      if (!props.hasOwnProperty(key)) continue;
      if (key === 'aeMatchName') continue;
      try {
        var prop = fx.property(key);
        if (prop) prop.setValue(props[key]);
      } catch (pe) {
        // Skip properties that cannot be set (expressions, read-only).
      }
    }

    result.ok   = true;
    result.data = { effectorUUID: effectorUUID, matchName: matchName };
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}

// ─── removeEffector ───────────────────────────────────────────────────────────
// Removes the effect owned by effectorUUID from the host layer.
// Other effects on the same layer are untouched.

function removeEffector(effectorUUID, hostLayerUUID, hostingCompUUID) {
  var result = { ok: false, data: null, error: null };
  try {
    var hostComp = findCompByUUID(hostingCompUUID);
    if (!hostComp) {
      result.error = 'removeEffector: hosting comp not found: ' + hostingCompUUID;
      return JSON.stringify(result);
    }

    var hostLayer = findLayerByUUID(hostComp, hostLayerUUID);
    if (!hostLayer) {
      result.error = 'removeEffector: host layer not found: ' + hostLayerUUID;
      return JSON.stringify(result);
    }

    var fx = findEffectByEffectorUUID(hostLayer, effectorUUID);
    if (!fx) {
      // Already gone — idempotent success.
      result.ok   = true;
      result.data = { effectorUUID: effectorUUID, wasPresent: false };
      return JSON.stringify(result);
    }

    fx.remove();

    result.ok   = true;
    result.data = { effectorUUID: effectorUUID, wasPresent: true };
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
