/**
 * graph/engine/nodes/cloneNode.js
 *
 * Clones a node: creates a new node with same params, sets _cloneMasterId
 * so the clone always mirrors the master. A gray wire is drawn from the
 * center of the master to the center of the clone in the wire renderer.
 *
 * Dependencies: graphState, uuidGenerator, engine/helpers.js
 * Load before: nodes/index.js
 *
 * Exports: cloneNode
 */
// graph/engine/nodes/cloneNode.js
// DEPENDS ON: graph/graphState.js, data/uuidGenerator.js,
//             graph/engine/helpers.js
// MUST LOAD BEFORE: nodes/index.js

var __e_nclone = (function() {
  var hlp = __e_hlp;

  /**
   * Clones the given node. Creates a deep copy with a new UUID, sets
   * _cloneMasterId to the original node's ID, offsets by +30px on each axis,
   * and selects the new clone.
   *
   * @param {string} nodeId - ID of the node to clone
   * @returns {string|null} The new clone's ID, or null if failed
   */
  function cloneNode(nodeId) {
    var src = graphState.getNode(nodeId);
    if (!src) return null;

    var copy = {};
    for (var key in src) {
      if (key === 'id' || key === 'dirty' || key === '_transplantLayerUUID') continue;
      if (Array.isArray(src[key])) {
        copy[key] = src[key].slice();
      } else if (typeof src[key] === 'object' && src[key] !== null) {
        // Deep copy via JSON round-trip. Safe because node data (props,
        // dynamicSchema, etc.) is guaranteed JSON-serializable per the
        // architecture spec — no functions, DOM refs, or undefined values.
        copy[key] = JSON.parse(JSON.stringify(src[key]));
      } else {
        copy[key] = src[key];
      }
    }
    copy.id = uuidGenerator.node();
    copy.x = src.x + 30;
    copy.y = src.y + 30;
    copy.dirty = false;
    copy.hostingComps = [];
    copy._cloneMasterId = nodeId;
    if (src.nodeKind !== 'data') {
      copy.state = 'ghost';
    }

    graphState.addNode(copy);
    graphState.replaceSelection([copy.id]);
    hlp.refreshNodeUI();
    return copy.id;
  }

  return {
    cloneNode: cloneNode
  };

})();
