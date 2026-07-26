/**
 * graph/import/mapper.js
 *
 * Transforms raw AE scan data into the import JSON format.
 * Assigns Procedia UUIDs to every project item and layer,
 * maps AE layer types to Procedia node types, and builds
 * a stamp map for batch UUID stamping in AE.
 *
 * Depends on: data/uuidGenerator.js, graph/nodeRegistry.js
 * Exports: importMapper.map(rawData)
 */
// graph/import/mapper.js
// DEPENDS ON: data/uuidGenerator.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: graph/import/graphBuilder/helpers.js, graph/import/index.js

var importMapper = (function() {

  /**
   * AE layer type → Procedia node type mapping.
   */
  var _LAYER_TYPE_MAP = {
    'text':       'layers/text',
    'shape':      'layers/shape',
    'null':       'layers/null',
    'solid':      'layers/solid',
    'camera':     'layers/camera',
    'light':      'layers/light',
    'adjustment': 'layers/adjustment',
    'comp':       'core/comp',
    'footage':    'core/footage',
    'audio':      'core/footage'
  };

  /**
   * Builds a matchName → nodeType lookup from the node registry.
   * Only includes nodes that have a matchName (effect nodes).
   * @returns {Object}
   */
  function _buildEffectTypeMap() {
    var map = {};
    var all = nodeRegistry.getAll();
    for (var type in all) {
      if (!all.hasOwnProperty(type)) continue;
      var def = all[type];
      if (def.matchName) {
        map[def.matchName] = type;
      }
    }
    return map;
  }

  /**
   * Takes raw scan data and produces the import JSON with UUIDs,
   * plus a stamp map for batch AE stamping.
   * 
   * @param {Object} rawData — { comps: Array, footage: Array, compLayers: Array }
   * @returns {Object} { importJSON, stampMap }
   */
  function map(rawData) {
    var comps = rawData.comps || [];
    var footage = rawData.footage || [];
    var compLayers = rawData.compLayers || [];

    var effectTypeMap = _buildEffectTypeMap();

    // --- Assign UUIDs to comps ---
    var compUUIDs = {};   // compName → compUUID
    var compData = {};    // compUUID → comp metadata
    for (var ci = 0; ci < comps.length; ci++) {
      var c = comps[ci];
      var compUUID = uuidGenerator.node();
      compUUIDs[c.name] = compUUID;
      compData[compUUID] = {
        label:     c.name,
        width:     c.width,
        height:    c.height,
        frameRate: c.frameRate,
        duration:  c.duration,
        bgColor:   c.bgColor,
        layers:    []
      };
    }

    // --- Assign UUIDs to footage items ---
    var footageUUIDs = {}; // footageName → footageUUID
    var footageData = {};  // footageUUID → footage metadata
    for (var fi = 0; fi < footage.length; fi++) {
      var f = footage[fi];
      var fUUID = uuidGenerator.node();
      footageUUIDs[f.name] = fUUID;
      footageData[fUUID] = {
        label:       f.name,
        path:        f.filePath || '',
        footageType: f.footageType,
        width:       f.width,
        height:      f.height,
        duration:    f.duration,
        frameRate:   f.frameRate,
        solidColor:  f.solidColor
      };
    }

    // --- Build comp-name → layer-list lookup ---
    var compLayerMap = {};
    for (var cli = 0; cli < compLayers.length; cli++) {
      compLayerMap[compLayers[cli].compName] = compLayers[cli].layers || [];
    }

    // --- Process layers per comp ---
    // Terminal wire UUIDs per layer (used for stampMap and wires)
    var wireUUIDs = {}; // layer key → wireUUID

    for (var compName in compUUIDs) {
      if (!compUUIDs.hasOwnProperty(compName)) continue;
      var compUuid = compUUIDs[compName];
      var layers = compLayerMap[compName] || [];

      for (var li = 0; li < layers.length; li++) {
        var layer = layers[li];
        var layerUUID = uuidGenerator.node();
        var wireUUID = uuidGenerator.wire();
        var layerKey = compName + '::' + layer.index;
        wireUUIDs[layerKey] = wireUUID;

        var nodeType = _LAYER_TYPE_MAP[layer.layerType] || null;
        if (!nodeType) {
          console.warn('[importMapper] unknown layer type "' + layer.layerType + '" for layer "' + layer.name + '" in comp "' + compName + '" — skipping');
          continue;
        }

        // Find source UUID for comp/footage/audio layers
        var sourceUUID = null;
        if (layer.layerType === 'comp' && layer.sourceItemName) {
          sourceUUID = compUUIDs[layer.sourceItemName] || null;
        } else if ((layer.layerType === 'footage' || layer.layerType === 'audio') && layer.sourceItemName) {
          sourceUUID = footageUUIDs[layer.sourceItemName] || null;
        }

        // Build properties from layer data
        var props = {};
        props.label = layer.name;

        // Transform properties (common to all layer types)
        if (layer.position) props.position = layer.position;
        if (layer.scale) props.scale = layer.scale;
        if (layer.rotation !== undefined) props.rotation = layer.rotation;
        if (layer.opacity !== undefined) props.opacity = layer.opacity;

        // Type-specific properties
        switch (nodeType) {
          case 'layers/text':
            if (layer.textContent !== undefined) props.content = layer.textContent;
            if (layer.fontSize !== undefined) props.fontSize = layer.fontSize;
            if (layer.textColor) props.color = layer.textColor;
            break;
          case 'layers/shape':
            if (layer.fillColor) props.fillColor = layer.fillColor;
            break;
          case 'layers/solid':
            if (layer.solidColor) props.color = layer.solidColor;
            if (layer.solidWidth) props.width = layer.solidWidth;
            if (layer.solidHeight) props.height = layer.solidHeight;
            break;
          case 'layers/camera':
            if (layer.zoom !== undefined) props.zoom = layer.zoom;
            if (layer.depthOfField !== undefined) props.depthOfField = layer.depthOfField;
            if (layer.focusDistance !== undefined) props.focusDistance = layer.focusDistance;
            if (layer.aperture !== undefined) props.aperture = layer.aperture;
            if (layer.blurLevel !== undefined) props.blurLevel = layer.blurLevel;
            break;
          case 'layers/light':
            if (layer.lightType) props.lightType = layer.lightType;
            if (layer.intensity !== undefined) props.intensity = layer.intensity;
            if (layer.lightColor) props.color = layer.lightColor;
            if (layer.coneAngle !== undefined) props.coneAngle = layer.coneAngle;
            if (layer.coneFeather !== undefined) props.coneFeather = layer.coneFeather;
            if (layer.castsShadows !== undefined) props.castsShadows = layer.castsShadows;
            if (layer.shadowDarkness !== undefined) props.shadowDarkness = layer.shadowDarkness;
            if (layer.shadowDiffusion !== undefined) props.shadowDiffusion = layer.shadowDiffusion;
            break;
        }

        // Build effect chain
        var effectNodes = [];
        if (layer.effects && layer.effects.length > 0) {
          for (var ei = 0; ei < layer.effects.length; ei++) {
            var eff = layer.effects[ei];
            var effType = effectTypeMap[eff.matchName] || null;
            if (!effType) {
              console.warn('[importMapper] unknown effect matchName "' + eff.matchName + '" — skipping');
              continue;
            }
            var effUUID = uuidGenerator.node();
            effectNodes.push({
              uuid:      effUUID,
              type:      effType,
              matchName: eff.matchName,
              enabled:   eff.enabled,
              props:     eff.properties || {}
            });
          }
        }

        compData[compUuid].layers.push({
          uuid:          layerUUID,
          type:          nodeType,
          name:          layer.name,
          index:         layer.index,
          properties:    props,
          parentIndex:   layer.parentIndex || 0,
          blendingMode:  layer.blendingMode || 'NORMAL',
          trackMatteType:layer.trackMatteType || 'NONE',
          sourceUUID:    sourceUUID,
          enabled:       layer.enabled !== false,
          effects:       effectNodes,
          wireUUID:      wireUUID
        });
      }
    }

    // --- Build stamp map for AE UUID stamping ---
    var stampMap = {
      comps:   compUUIDs,
      footage: footageUUIDs,
      layers:  {}
    };

    for (compName in compUUIDs) {
      if (!compUUIDs.hasOwnProperty(compName)) continue;
      var stampLayers = [];
      var layers2 = compLayerMap[compName] || [];
      for (var si = 0; si < layers2.length; si++) {
        var sl = layers2[si];
        var wKey = compName + '::' + sl.index;
        var wUUID = wireUUIDs[wKey];
        if (wUUID) {
          stampLayers.push({ index: sl.index, uuid: wUUID });
        }
      }
      if (stampLayers.length > 0) {
        stampMap.layers[compName] = stampLayers;
      }
    }

    // --- Build final import JSON ---
    var importJSON = {
      comps:   compData,
      footage: footageData
    };

    return {
      importJSON: importJSON,
      stampMap:  stampMap,
      compUUIDs: compUUIDs
    };
  }

  return {
    map: map
  };

})();
