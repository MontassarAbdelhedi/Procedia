/**
 * @fileoverview Reads the version-control repository from the Reserved Comp
 *              with two-generation fallback. Reads the pointer, verifies the
 *              pointed generation, and falls back to the previous generation
 *              if invalid. Returns the parsed repository JSON.
 *
 * REQUIRES: json.jsx, utils.jsx, persistence/chunkUtils.jsx,
 *           persistence/vcsWriteRepo.jsx (for _vcsReadPointer, _vcsReadBank, _vcsSimpleChecksum)
 * ES3-COMPATIBLE: var only, named functions, for loops, string concat only.
 */
// jsx/persistence/vcsReadRepo.jsx — two-generation repo reader (ES3-safe)

/**
 * Reads the repository from the Reserved Comp.
 * Tries the current generation first, falls back to the previous generation,
 * returns both parsed repository and legacy active graph for migration.
 * @return {Object} { ok, data: { repositoryJSON, legacyGraph, found, generation }, error }
 */
function _persistenceReadRepo() {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = _pc_reservedComp();
    if (!comp) {
      result.data = { repositoryJSON: null, legacyGraph: null, found: false, generation: null };
      result.ok = true;
      return result;
    }

    // 1. Read pointer
    var pointer = _vcsReadPointer(comp);
    var currentBank = pointer.generation || 'A';
    var currentPrefix = (currentBank === 'A') ? _VCS_BANK_A_PREFIX : _VCS_BANK_B_PREFIX;

    // 2. Read current bank
    var repoJSON = _vcsReadBank(comp, currentPrefix);
    var repoRead = false;

    // 3. Verify current bank
    if (repoJSON !== null) {
      var checksum = _vcsSimpleChecksum(repoJSON);
      if (pointer.checksum && checksum !== pointer.checksum) {
        // Current bank is corrupt — try fallback
        repoJSON = null;
      } else {
        repoRead = true;
      }
    }

    // 4. Fallback to previous bank if current is invalid
    if (!repoRead || repoJSON === null) {
      var fallbackBank = (currentBank === 'A') ? 'B' : 'A';
      var fallbackPrefix = (fallbackBank === 'A') ? _VCS_BANK_A_PREFIX : _VCS_BANK_B_PREFIX;
      var fallbackJSON = _vcsReadBank(comp, fallbackPrefix);
      if (fallbackJSON !== null) {
        repoJSON = fallbackJSON;
        currentBank = fallbackBank;
        repoRead = true;
      }
    }

    // 5. Also read legacy active graph (for migration path)
    var legacyGraph = null;
    try {
      var nodesJSON = _pc_readChunks(comp, '__PROCEDIA_NODES__');
      var wiresJSON = _pc_readChunks(comp, '__PROCEDIA_WIRES__');
      var kfJSON = _pc_readChunks(comp, '__PROCEDIA_KEYFRAMES__');

      legacyGraph = {
        nodes: nodesJSON ? JSON.parse(nodesJSON) : {},
        wires: wiresJSON ? JSON.parse(wiresJSON) : {},
        keyframes: kfJSON ? JSON.parse(kfJSON) : {}
      };

      // Scan for parked node layers
      var parkedNodeUUIDs = [];
      var uuidRe = /^[A-Z]+-\d+-[a-z0-9]+$/;
      var lj;
      for (lj = 1; lj <= comp.numLayers; lj++) {
        var layer = comp.layer(lj);
        var layerName = layer.name;
        if (layerName.indexOf('__PROCEDIA_') !== 0 && uuidRe.test(layerName)) {
          parkedNodeUUIDs.push(layerName);
        }
      }
      legacyGraph.parkedNodeUUIDs = parkedNodeUUIDs;
    } catch (legacyErr) {
      legacyGraph = null;
    }

    result.ok = true;
    result.data = {
      repositoryJSON: repoJSON,
      legacyGraph: legacyGraph ? JSON.stringify(legacyGraph) : null,
      found: repoRead,
      generation: currentBank
    };
  } catch (e) {
    result.error = 'readRepo: ' + e.toString();
  }
  return result;
}

/**
 * Dispatcher handler for the 'readRepo' action.
 * @param {Object} cmd
 * @return {Object} { ok, data, error }
 */
function _handleReadRepo(cmd) {
  return _persistenceReadRepo();
}
