/**
 * @file buildEffectsCatalog.jsx
 *
 * Standalone ExtendScript tool for After Effects.
 * Enumerates every registered built-in effect (via app.effects),
 * introspects their properties (recurse one level into PropertyGroups),
 * groups by AE category, and writes a complete catalog JSON to:
 *   {extRoot}/data/effectsCatalog.json
 *
 * The output serves as a coding reference for generating Procedia
 * effector node definitions.
 *
 * Run via: File > Scripts > Run Script File...
 * Requires: AE CC 2014+ (app.effects support), a project to be open.
 */

(function() {

  // ──────────────────────────────────────────────────────────────
  // 1. JSON polyfill (ExtendScript ES3-safe)
  // ──────────────────────────────────────────────────────────────

  if (typeof JSON === 'undefined') {
    JSON = {};
  }
  if (typeof JSON.stringify !== 'function') {
    JSON.stringify = function stringify(val) {
      var type = typeof val;
      if (val === null)         return 'null';
      if (type === 'undefined') return undefined;
      if (type === 'boolean')   return val ? 'true' : 'false';
      if (type === 'number') {
        if (isNaN(val) || !isFinite(val)) return 'null';
        return String(val);
      }
      if (type === 'string') {
        return '"' + val
          .replace(/\\/g,   '\\\\')
          .replace(/"/g,    '\\"')
          .replace(/\x08/g, '\\b')
          .replace(/\t/g,   '\\t')
          .replace(/\n/g,   '\\n')
          .replace(/\f/g,   '\\f')
          .replace(/\r/g,   '\\r')
          + '"';
      }
      if (type === 'object') {
        if (val instanceof Array) {
          var aParts = [];
          for (var i = 0; i < val.length; i++) {
            var aItem = JSON.stringify(val[i]);
            aParts.push(typeof aItem === 'undefined' ? 'null' : aItem);
          }
          return '[' + aParts.join(',') + ']';
        }
        var oParts = [];
        for (var k in val) {
          if (val.hasOwnProperty(k)) {
            var oVal = JSON.stringify(val[k]);
            if (typeof oVal !== 'undefined') {
              oParts.push(JSON.stringify(k) + ':' + oVal);
            }
          }
        }
        return '{' + oParts.join(',') + '}';
      }
      return undefined;
    };
  }

  // ──────────────────────────────────────────────────────────────
  // 2. Discover extension root from $.fileName
  //    Script is at: {extRoot}/jsx/tools/buildEffectsCatalog.jsx
  // ──────────────────────────────────────────────────────────────

  var extRoot = '';
  var scriptPath = '';
  try {
    var thisFile = new File($.fileName);
    scriptPath = thisFile.fsName;
    var toolsFolder = thisFile.parent;
    var jsxFolder = toolsFolder.parent;
    var rootFolder = jsxFolder.parent;
    extRoot = rootFolder.fsName;
    // Normalise backslashes to forward slashes and drop trailing slash
    if (extRoot.length > 0) {
      var normalised = '';
      for (var ci = 0; ci < extRoot.length; ci++) {
        var ch = extRoot.charAt(ci);
        normalised += (ch === '\\') ? '/' : ch;
      }
      extRoot = normalised;
      var lastChar = extRoot.charAt(extRoot.length - 1);
      if (lastChar === '/') {
        extRoot = extRoot.substring(0, extRoot.length - 1);
      }
    }
  } catch (e) {
    alert('ERROR: Cannot determine extension root from $.fileName.\n' + e.toString());
    return;
  }

  writeLn('[buildEffectsCatalog] Script path: ' + scriptPath);
  writeLn('[buildEffectsCatalog] Extension root: ' + extRoot);

  // ──────────────────────────────────────────────────────────────
  // 3. Helper functions
  // ──────────────────────────────────────────────────────────────

  /**
   * Maps an AE PropertyValueType to a Procedia type string.
   * Covers all known PropertyValueType constants available in AE 2025.
   * @param {number} pvt PropertyValueType constant
   * @return {string} Procedia type name or 'unknown'
   */
  function mapType(pvt) {
    if (pvt === PropertyValueType.COLOR) return 'color';
    if (pvt === PropertyValueType.TwoD || pvt === PropertyValueType.TwoD_SPATIAL) return 'vector2';
    if (pvt === PropertyValueType.ThreeD || pvt === PropertyValueType.ThreeD_SPATIAL) return 'vector3';
    if (pvt === PropertyValueType.SCALAR || pvt === PropertyValueType.ANGLE) return 'number';
    if (pvt === PropertyValueType.NO_VALUE) return 'boolean';
    if (typeof PropertyValueType.BOOLEAN !== 'undefined' && pvt === PropertyValueType.BOOLEAN) return 'boolean';
    if (typeof PropertyValueType.CUSTOM_VALUE !== 'undefined' && pvt === PropertyValueType.CUSTOM_VALUE) return 'custom';
    return 'unknown';
  }

  /**
   * Returns the numeric value of a PropertyValueType constant for debugging.
   * @param {number} pvt
   * @return {number}
   */
  function pvtValue(pvt) { return pvt; }

  /**
   * Safely checks if a property is a PropertyGroup.
   * Avoids relying on instanceof (which can throw for stale objects).
   * @param {Property} prop
   * @return {boolean}
   */
  function isPropertyGroup(prop) {
    try {
      return typeof prop.property === 'function' && prop.numProperties > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * Collects properties from a PropertyGroup, recursing one level into
   * subgroups. Does NOT recurse beyond depth 1.
   * Captures ALL properties regardless of type — unknown types are
   * mapped to 'unknown' rather than skipped.
   * @param {PropertyGroup} group The group to walk
   * @param {number} depth Current recursion depth (0 at effect root)
   * @param {string} path Debug path prefix for logging
   * @return {Array} Array of {matchName, label, type, defaultValue, pvtType}
   */
  function collectProperties(group, depth, path) {
    if (path === undefined) path = '';
    var props = [];
    var count = group.numProperties;
    writeLn('[buildEffectsCatalog]     ' + path + 'numProperties=' + count);
    for (var i = 1; i <= count; i++) {
      var p = null;
      try {
        p = group.property(i);
      } catch (e) {
        writeLn('[buildEffectsCatalog]     ' + path + 'prop[' + i + '] ERROR: ' + String(e));
        continue;
      }
      if (!p) {
        writeLn('[buildEffectsCatalog]     ' + path + 'prop[' + i + '] is null');
        continue;
      }

      try {
        var pvt = p.propertyValueType;
        var mn = p.matchName;
        var nm = p.name;
        var hasSV = typeof p.setValue === 'function';
        var isPG = isPropertyGroup(p);

        writeLn('[buildEffectsCatalog]     ' + path + '[' + i + '] mn=' + mn +
                ' name="' + nm + '" pvt=' + String(pvt) + ' isPG=' + isPG + ' hasSV=' + hasSV);

        if (depth < 1 && isPG) {
          // Recurse ONE level into subgroups (e.g. "Light" group in Drop Shadow)
          var subProps = collectProperties(p, depth + 1, path + '  ');
          for (var j = 0; j < subProps.length; j++) {
            props.push(subProps[j]);
          }
        } else if (!isPG) {
          var dv = null;
          try { dv = p.value; } catch (ve) { dv = null; }
          props.push({
            matchName:    mn,
            label:        nm,
            type:         mapType(pvt),
            defaultValue: dv,
            pvtType:      pvt
          });
        }
      } catch (e) {
        writeLn('[buildEffectsCatalog]     ' + path + 'prop[' + i + '] EXCEPTION: ' + String(e));
        continue;
      }
    }
    return props;
  }

  /**
   * Serialises a value to indented JSON for human-readable output.
   * ExtendScript-compatible, no dependency on native JSON formatter.
   * @param {*} val The value to serialise
   * @param {string} indent Current indentation string
   * @return {string}
   */
  function prettyJSON(val, indent) {
    if (indent === undefined) indent = '';
    var nextIndent = indent + '  ';
    var type = typeof val;

    if (val === null) return 'null';
    if (type === 'boolean') return val ? 'true' : 'false';
    if (type === 'number') {
      if (isNaN(val) || !isFinite(val)) return 'null';
      return String(val);
    }
    if (type === 'string') {
      return '"' + val
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\x08/g, '\\b')
        .replace(/\t/g, '\\t')
        .replace(/\n/g, '\\n')
        .replace(/\f/g, '\\f')
        .replace(/\r/g, '\\r') + '"';
    }
    if (type === 'object') {
      if (val instanceof Array) {
        if (val.length === 0) return '[]';
        var aParts = [];
        for (var ai = 0; ai < val.length; ai++) {
          aParts.push(nextIndent + prettyJSON(val[ai], nextIndent));
        }
        return '[\n' + aParts.join(',\n') + '\n' + indent + ']';
      }
      var keys = [];
      for (var k in val) {
        if (val.hasOwnProperty(k)) keys.push(k);
      }
      if (keys.length === 0) return '{}';
      var oParts = [];
      for (var ki = 0; ki < keys.length; ki++) {
        oParts.push(nextIndent + prettyJSON(keys[ki], nextIndent) + ': ' + prettyJSON(val[keys[ki]], nextIndent));
      }
      return '{\n' + oParts.join(',\n') + '\n' + indent + '}';
    }
    return 'null';
  }

  // ──────────────────────────────────────────────────────────────
  // 4. Main execution
  // ──────────────────────────────────────────────────────────────

  function main() {
    var proj = app.project;
    if (!proj) {
      alert('ERROR: No project open.\nPlease open or create a project first.');
      return;
    }

    // Guard: app.effects must exist (AE CC 2014+)
    if (!app.effects || typeof app.effects !== 'object' || !app.effects.length) {
      alert('ERROR: app.effects is not available.\nThis script requires After Effects CC 2014 or later.');
      return;
    }

    var totalRegistered = app.effects.length;
    writeLn('[buildEffectsCatalog] Registered effects in AE: ' + totalRegistered);

    // ── 4a. Find-or-create Procedia folder ──────────────────────

    var procFolder = null;
    var folderName = 'DO NOT DELETE \u2014 Procedia Reserved';
    for (var fi = 1; fi <= proj.numItems; fi++) {
      var item = proj.item(fi);
      if (item instanceof FolderItem && item.name === folderName) {
        procFolder = item;
        break;
      }
    }
    if (!procFolder) {
      procFolder = proj.items.addFolder(folderName);
    }

    // ── 4b. Find-or-create Reserved Comp ────────────────────────

    var reservedComp = null;
    for (var ci = 1; ci <= procFolder.numItems; ci++) {
      var citem = procFolder.item(ci);
      if (citem instanceof CompItem && citem.name.indexOf('DO NOT DELETE') === 0) {
        reservedComp = citem;
        break;
      }
    }
    if (!reservedComp) {
      reservedComp = proj.items.addComp('DO NOT DELETE \u2014 Procedia Reserved Comp', 100, 100, 1, 1, 1);
      reservedComp.parentFolder = procFolder;
    }

    // ── 4c. Create ONE temp solid (reused for all effects) ──────

    var tempLayer = null;
    try {
      tempLayer = reservedComp.layers.addSolid([0, 0, 0], '__PROCEDIA_CATALOG_TEMP__', 100, 100, 1);
      tempLayer.enabled = false;
    } catch (e) {
      alert('ERROR: Could not create temp layer in reserved comp.\n' + e.toString());
      return;
    }

    // ── 4d. Main effect loop ────────────────────────────────────
    //
    // User will manually cancel any file dialogs (LUT, Cineon, etc.)
    // that cannot be suppressed. Effects that error are skipped.

    // Effects whose addProperty triggers an OS file dialog
    // (matchName or category keywords).
    var FILE_DIALOG_EFFECTS = {
      'ADBE Apply RGB LUT': 1,
      'ADBE Cineon Converter': 1,
      'ADBE Lumetri': 1
    };

    function triggersFileDialog(matchName, name, category) {
      if (FILE_DIALOG_EFFECTS[matchName]) return true;
      var upperName = name.toUpperCase();
      var upperMatch = matchName.toUpperCase();
      if (upperName.indexOf('LUT') !== -1) return true;
      if (upperMatch.indexOf('LUT') !== -1) return true;
      if (upperName.indexOf('CINEON') !== -1) return true;
      if (upperMatch.indexOf('CINEON') !== -1) return true;
      if (upperName.indexOf('LUMETRI') !== -1) return true;
      return false;
    }

    var catalog = {};
    var catOrder = [];
    var totalEffects = 0;
    var skippedEffects = 0;
    var skipReasons = {};
    var dialogSkippedEffects = 0;

    for (var ei = 1; ei <= totalRegistered; ei++) {
      var effectEntry = null;
      try {
        effectEntry = app.effects[ei];
      } catch (e) {
        continue;
      }
      if (!effectEntry) continue;

      var matchName = effectEntry.matchName || '';
      var name = effectEntry.name || matchName;
      var category = effectEntry.category || 'Uncategorized';

      if (matchName === '') {
        skippedEffects++;
        continue;
      }

      writeLn('[buildEffectsCatalog] [' + ei + '/' + totalRegistered + '] ' + matchName);

      // Skip effects that trigger OS file dialogs (can't be suppressed)
      if (triggersFileDialog(matchName, name, category)) {
        dialogSkippedEffects++;
        writeLn('[buildEffectsCatalog]   SKIP: triggers file dialog');
        continue;
      }

      // Apply effect to the temp layer
      var aeEffect = null;
      try {
        aeEffect = tempLayer.Effects.addProperty(matchName);
      } catch (applyErr) {
        skippedEffects++;
        var reason = String(applyErr);
        if (reason.length > 80) reason = reason.substring(0, 80);
        skipReasons[matchName] = reason;
        writeLn('[buildEffectsCatalog]   SKIP: ' + reason);
        continue;
      }

      // Collect properties (recurse one level into subgroups)
      var properties = [];
      try {
        properties = collectProperties(aeEffect, 0);
      } catch (walkErr) {
        // Effect is still recorded with empty properties
        writeLn('[buildEffectsCatalog]   WARN: property walk failed: ' + String(walkErr));
      }

      // Remove effect from temp layer
      try {
        aeEffect.remove();
      } catch (removeErr) {
        // Non-fatal
      }

      // Build the category entry (strip debug-only pvtType field)
      var cleanProps = [];
      for (var pi = 0; pi < properties.length; pi++) {
        cleanProps.push({
          matchName:    properties[pi].matchName,
          label:        properties[pi].label,
          type:         properties[pi].type,
          defaultValue: properties[pi].defaultValue
        });
      }
      var entry = {
        matchName: matchName,
        name: name,
        properties: cleanProps
      };

      if (!catalog[category]) {
        catalog[category] = [];
        catOrder.push(category);
      }
      catalog[category].push(entry);
      totalEffects++;
    }

    // ── 4e. Cleanup ─────────────────────────────────────────────

    try {
      if (tempLayer) tempLayer.remove();
    } catch (e) {
      writeLn('[buildEffectsCatalog] WARNING: temp layer cleanup failed: ' + e.toString());
    }

    // ── 4f. Build output structure ──────────────────────────────

    var now = new Date();
    var dateStr = String(now.getFullYear()) + '-' +
                  String(now.getMonth() + 1) + '-' +
                  String(now.getDate());

    var output = {
      aeVersion: app.version,
      generated: dateStr,
      effectCount: totalEffects,
      skippedCount: skippedEffects,
      dialogSkippedCount: dialogSkippedEffects,
      categoryOrder: catOrder,
      categories: catalog
    };

    // ── 4g. Ensure data/ directory exists ────────────────────────

    var dataDir = new Folder(extRoot + '/data');
    if (!dataDir.exists) {
      try {
        dataDir.create();
        writeLn('[buildEffectsCatalog] Created data/ directory');
      } catch (e) {
        alert('ERROR: Cannot create data/ directory:\n' + e.toString());
        return;
      }
    }

    // ── 4h. Write catalog file ───────────────────────────────────

    var outputPath = extRoot + '/data/effectsCatalog.json';
    var outputFile = new File(outputPath);

    writeLn('[buildEffectsCatalog] Attempting to write to: ' + outputPath);
    writeLn('[buildEffectsCatalog] Output file exists before write: ' + outputFile.exists);

    try {
      writeLn('[buildEffectsCatalog] Writing ' + totalEffects + ' effects to file...');
      outputFile.open('w');
      outputFile.write(prettyJSON(output));
      outputFile.close();
      writeLn('[buildEffectsCatalog] Write completed. File exists: ' + outputFile.exists);
      writeLn('[buildEffectsCatalog] File size: ' + outputFile.length + ' bytes');
      writeLn('[buildEffectsCatalog] Catalog written to: ' + outputPath);
    } catch (e) {
      alert('ERROR: Failed to write catalog file:\n' + e.toString() +
            '\n\nPath: ' + outputPath);
      return;
    }

    // ── 4i. Done — report ────────────────────────────────────────

    var msg = '';
    msg += 'Effects Catalog Complete\n';
    msg += '========================\n\n';
    msg += '  Cataloged:      ' + totalEffects + ' effects\n';
    msg += '  Categories:     ' + catOrder.length + '\n';
    msg += '  Skipped (err):  ' + skippedEffects + '\n';
    msg += '  Skipped (dialog): ' + dialogSkippedEffects + '\n\n';
    msg += 'Output:\n';
    msg += '  ' + outputPath + '\n\n';
    msg += 'The file can now be used as a coding reference\n';
    msg += 'for Procedia effector node definitions.';

    writeLn('[buildEffectsCatalog] DONE — ' + totalEffects + ' effects across ' +
            catOrder.length + ' categories');
    alert(msg);
  }

  // ──────────────────────────────────────────────────────────────
  // 5. Run
  // ──────────────────────────────────────────────────────────────

  try {
    main();
  } catch (e) {
    var errMsg = 'FATAL ERROR:\n' + e.toString();
    if (typeof e.line !== 'undefined') errMsg += '\nLine: ' + e.line;
    alert(errMsg);
  }

})();
