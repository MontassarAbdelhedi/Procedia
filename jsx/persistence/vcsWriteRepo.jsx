/**
 * @fileoverview Writes the complete version-control repository to the Reserved Comp
 *              using a two-generation (A/B bank) protocol for crash-resilient storage.
 *              The currently active bank is recorded in a small pointer layer.
 *              Write to inactive bank first, verify, then update the pointer.
 *              The previous bank remains untouched as fallback.
 *
 * REQUIRES: json.jsx, utils.jsx, persistence/chunkUtils.jsx
 * ES3-COMPATIBLE: var only, named functions, for loops, string concat only.
 */
// jsx/persistence/vcsWriteRepo.jsx — two-generation repo writer (ES3-safe)

var _VCS_POINTER_PREFIX = '__PROCEDIA_VCS_POINTER__';
var _VCS_BANK_A_PREFIX = '__PROCEDIA_VCS_A_';
var _VCS_BANK_B_PREFIX = '__PROCEDIA_VCS_B_';
var _VCS_MANIFEST_SUFFIX = 'MANIFEST__';

/**
 * Writes the repository JSON to the Reserved Comp using two-generation protocol.
 * @param {string} repoJSON — JSON-serialized repository object
 * @return {Object} { ok, data: { generation, genId, chunkCount, checksum }, error }
 */
function _persistenceWriteRepo(repoJSON) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = _pc_reservedComp();
    if (!comp) { result.error = 'writeRepo: Reserved Comp not found'; return result; }

    // 1. Read current pointer to determine active bank
    var pointer = _vcsReadPointer(comp);
    var activeBank = pointer.generation || 'A';
    var inactiveBank = (activeBank === 'A') ? 'B' : 'A';
    var inactivePrefix = (inactiveBank === 'A') ? _VCS_BANK_A_PREFIX : _VCS_BANK_B_PREFIX;

    // 2. Remove old layers from the INACTIVE bank
    _pc_removeOldLayers(comp, inactivePrefix);

    // 3. Generate new generation ID
    var genId = 'GEN-' + String(Date.now());
    var checksum = _vcsSimpleChecksum(repoJSON);

    // 4. Write manifest for the inactive bank
    var manifest = {
      genId: genId,
      generation: inactiveBank,
      checksum: checksum,
      schemaVersion: 1,
      writtenAt: Date.now(),
      chunkCount: 0
    };

    // 5. Chunk the repo JSON into the inactive bank
    var chunkPairs = _pc_chunkData(repoJSON, inactivePrefix);
    manifest.chunkCount = Math.floor(chunkPairs.length / 2);

    // 6. Write manifest first (so it's always at the top)
    var manifestJSON = JSON.stringify(manifest);
    var manifestLayer = comp.layers.addText('');
    manifestLayer.name = inactivePrefix + _VCS_MANIFEST_SUFFIX;
    var mt = manifestLayer.text.sourceText.value;
    mt.text = manifestJSON;
    manifestLayer.text.sourceText.setValue(mt);
    manifestLayer.enabled = false;

    // 7. Write all chunks
    _pc_writeChunksToLayers(comp, chunkPairs);

    // 8. Read back and verify
    var verified = _vcsReadBank(comp, inactivePrefix);
    if (verified === null) {
      // Clean up failed bank
      _pc_removeOldLayers(comp, inactivePrefix);
      result.error = 'writeRepo: verification read-back failed for bank ' + inactiveBank;
      return result;
    }

    var verifiedChecksum = _vcsSimpleChecksum(verified);
    if (verifiedChecksum !== checksum) {
      _pc_removeOldLayers(comp, inactivePrefix);
      result.error = 'writeRepo: checksum mismatch on read-back (' + checksum + ' vs ' + verifiedChecksum + ')';
      return result;
    }

    // 9. Update pointer — this is the COMMIT point
    _vcsWritePointer(comp, {
      generation: inactiveBank,
      genId: genId,
      checksum: checksum,
      updatedAt: Date.now()
    });

    result.ok = true;
    result.data = {
      generation: inactiveBank,
      genId: genId,
      chunkCount: manifest.chunkCount,
      checksum: checksum
    };
  } catch (e) {
    result.error = 'writeRepo: ' + e.toString();
  }
  return result;
}

/**
 * Reads the current VCS pointer layer.
 * @param {CompItem} comp — the Reserved Comp
 * @return {Object} { generation, genId, checksum, updatedAt }
 */
function _vcsReadPointer(comp) {
  var layer = _pc_findLayerByName(comp, _VCS_POINTER_PREFIX);
  if (!layer) return { generation: 'A', genId: null, checksum: null, updatedAt: 0 };
  try {
    var txt = layer.text.sourceText.value;
    return JSON.parse(txt.text);
  } catch (e) {
    return { generation: 'A', genId: null, checksum: null, updatedAt: 0 };
  }
}

/**
 * Writes the VCS pointer layer (creates or replaces).
 * @param {CompItem} comp
 * @param {Object} data — { generation, genId, checksum, updatedAt }
 */
function _vcsWritePointer(comp, data) {
  // Remove existing pointer
  _pc_removeOldLayers(comp, _VCS_POINTER_PREFIX);
  var layer = comp.layers.addText('');
  layer.name = _VCS_POINTER_PREFIX;
  var td = layer.text.sourceText.value;
  td.text = JSON.stringify(data);
  layer.text.sourceText.setValue(td);
  layer.enabled = false;
}

/**
 * Reads and concatenates all chunks for a bank prefix.
 * @param {CompItem} comp
 * @param {string} prefix — e.g., '__PROCEDIA_VCS_A_'
 * @return {string|null} Concatenated data or null
 */
function _vcsReadBank(comp, prefix) {
  // Read manifest first to verify
  var manifestLayer = _pc_findLayerByName(comp, prefix + _VCS_MANIFEST_SUFFIX);
  if (!manifestLayer) return null;

  var txt = manifestLayer.text.sourceText.value;
  var manifest;
  try {
    manifest = JSON.parse(txt.text);
  } catch (e) {
    return null;
  }

  // Read all chunks
  var data = _pc_readChunks(comp, prefix);
  if (data === null) return null;

  return data;
}

/**
 * Simple non-crypto checksum for data integrity verification.
 * @param {string} str
 * @return {string} hex checksum
 */
function _vcsSimpleChecksum(str) {
  var h = 0;
  var i;
  var len = str.length;
  for (i = 0; i < len; i++) {
    h = ((h << 5) - h) + str.charCodeAt(i);
    h = h | 0;
  }
  var hex = (h >>> 0).toString(16);
  while (hex.length < 8) hex = '0' + hex;
  return hex;
}

/**
 * Dispatcher handler for the 'writeRepo' action.
 * @param {Object} cmd — command with params.repoJSON
 * @return {Object} { ok, data, error }
 */
function _handleWriteRepo(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = (cmd && cmd.params) ? cmd.params : {};
    if (!params.repoJSON) { result.error = 'writeRepo: missing repoJSON param'; return result; }
    result = _persistenceWriteRepo(params.repoJSON);
  } catch (e) {
    result.error = 'writeRepo: ' + e.toString();
  }
  return result;
}
