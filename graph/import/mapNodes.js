/**
 * graph/import/mapNodes.js
 *
 * Creates Procedia node data objects from the AE project structure returned
 * by the ExtendScript scanner (actions_import.jsx). Each AE layer, comp,
 * footage item, and effect is mapped to the corresponding node type.
 *
 * Dependencies: uuidGenerator, nodeRegistry
 * Load before: graph/import/mapWires.js, graph/import/builder.js
 *
 * Exports: buildFootageNode, buildCompNode, buildLayerNode, buildEffectNode,
 *          buildBlendingNode, buildMatteNode
 */

var __imp_nodes = (function() {

  /**
   * Returns a random integer between min and max (inclusive).
   * Used for positioning imported nodes in a grid.
   */
  function _rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Maps a procedural coordinate index to an x,y grid position.
   */
  function _gridPos(index, cols) {
    var col = index % cols;
    var row = Math.floor(index / cols);
    return { x: 50 + col * 220, y: 50 + row * 180 };
  }

  /**
   * Builds a node data object for a footage item.
   * @param {Object} footageData - Footage item from the scanner output
   * @param {number} posIndex - Sequential index for grid positioning
   * @returns {Object} Node data ready for graphState.addNode
   */
  function buildFootageNode(footageData, posIndex) {
    var pos = _gridPos(posIndex, 4);
    var props = { label: footageData.name };
    if (footageData.type === 'solid' && footageData.solidColor) {
      props.solidColor = footageData.solidColor;
    }
    if (footageData.file) {
      props.filePath = footageData.file;
    }
    return {
      id:             footageData.uuid,
      type:           'core/footage',
      nodeKind:       'affected',
      dedicated:      true,
      state:          'ghost',
      dirty:          false,
      x:              pos.x,
      y:              pos.y,
      props:          props,
      hostingComps:   [],
      hasParkedLayer: false,
      dynamicSchema:  null,
      secondaryPorts: null
    };
  }

  /**
   * Builds a node data object for a composition.
   * @param {Object} compData - Comp item from the scanner output
   * @param {number} posIndex - Sequential index for grid positioning
   * @returns {Object} Node data ready for graphState.addNode
   */
  function buildCompNode(compData, posIndex) {
    var pos = _gridPos(posIndex, 4);
    return {
      id:             compData.uuid,
      type:           'core/comp',
      nodeKind:       'affected',
      dedicated:      true,
      state:          'ghost',
      dirty:          false,
      x:              pos.x,
      y:              pos.y,
      props: {
        label:     compData.name,
        width:     compData.width,
        height:    compData.height,
        frameRate: compData.frameRate,
        duration:  compData.duration
      },
      hostingComps:   [compData.uuid],
      hasParkedLayer: false,
      dynamicSchema:  null,
      secondaryPorts: null
    };
  }

  /**
   * Returns the Procedia node type string for an AE layer type.
   * @param {string} aeLayerType - Layer type from scanner ('text', 'null', 'shape', etc.)
   * @returns {string|null} Procedia node type, or null if unsupported
   */
  function aeTypeToNodeType(aeLayerType) {
    var map = {
      'text':       'layers/text',
      'null':       'layers/null',
      'shape':      'layers/shape',
      'adjustment': 'layers/adjustment',
      'solid':      'core/footage',
      'footage':    'core/footage',
      'precomp':    null
    };
    return map.hasOwnProperty(aeLayerType) ? map[aeLayerType] : null;
  }

  /**
   * Returns the nodeKind for a given Procedia node type.
   */
  function _nodeKindForType(type) {
    var def = nodeRegistry.getDefinition(type);
    return def ? def.nodeKind : 'affected';
  }

  /**
   * Returns the dedicated flag for a given Procedia node type.
   */
  function _dedicatedForType(type) {
    var def = nodeRegistry.getDefinition(type);
    return def ? def.dedicated : true;
  }

  /**
   * Builds a node data object for a layer.
   * @param {Object} layerData - Layer from scanner output
   * @param {string} hostingCompUUID - UUID of the parent comp
   * @param {number} posIndex - Sequential index for grid positioning
   * @returns {Object} Node data
   */
  function buildLayerNode(layerData, hostingCompUUID, posIndex) {
    var type = aeTypeToNodeType(layerData.type);
    if (!type) return null;

    var pos = _gridPos(posIndex, 5);
    var t = layerData.transform;

    var props = { label: layerData.name };

    if (type === 'layers/text') {
      props.content  = layerData.name;
      props.fontSize = 72;
      props.color    = [1, 1, 1, 1];
      props.position = t.position;
      props.rotation = t.rotation;
      props.opacity  = t.opacity;
    } else if (type === 'layers/null') {
      props.position = t.position;
      props.rotation = t.rotation;
      props.opacity  = t.opacity;
      props.scale    = t.scale;
    } else if (type === 'layers/shape') {
      props.position  = t.position;
      props.rotation  = t.rotation;
      props.opacity   = t.opacity;
      props.scale     = t.scale;
      props.fillColor = [1, 0, 1, 1];
    } else if (type === 'layers/adjustment') {
      props.position = t.position;
      props.rotation = t.rotation;
      props.opacity  = t.opacity;
      props.scale    = t.scale;
    } else if (type === 'core/footage') {
      if (layerData.source) {
        if (layerData.source.type === 'solid' && layerData.source.color) {
          props.label = layerData.name;
          props.solidColor = layerData.source.color;
        }
        if (layerData.source.file) {
          props.filePath = layerData.source.file;
        }
      }
    }

    return {
      id:             layerData.uuid,
      type:           type,
      nodeKind:       _nodeKindForType(type),
      dedicated:      _dedicatedForType(type),
      state:          'ghost',
      dirty:          false,
      x:              pos.x,
      y:              pos.y,
      props:          props,
      hostingComps:   [],
      hasParkedLayer: false,
      dynamicSchema:  null,
      secondaryPorts: null
    };
  }

  /**
   * Known registered Procedia effect types by matchName.
   * As new effect nodes are registered in Procedia, add their matchName here.
   */
  var KNOWN_EFFECT_MATCHNAMES = {
    'ADBE Fill':             'effects/fill',
    'ADBE Gaussian Blur':    'effects/gaussian-blur',
    'ADBE Drop Shadow':      'effects/drop-shadow'
  };

  /**
   * Checks whether an effect matchName has a registered Procedia node type.
   * @param {string} matchName - AE effect match name
   * @returns {boolean}
   */
  function isKnownEffect(matchName) {
    return KNOWN_EFFECT_MATCHNAMES.hasOwnProperty(matchName);
  }

  /**
   * Returns the Procedia node type for a known effect matchName.
   * @param {string} matchName - AE effect match name
   * @returns {string} Procedia node type
   */
  function knownEffectType(matchName) {
    return KNOWN_EFFECT_MATCHNAMES[matchName] || 'effects/unknown';
  }

  /**
   * Builds an effector node data object for an effect on a layer.
   * Known effects use their registered type; unknown effects use 'effects/unknown'.
   * @param {Object} effectData - Effect from scanner output
   * @param {number} posIndex - Sequential index for grid positioning
   * @returns {Object} Node data
   */
  function buildEffectNode(effectData, posIndex) {
    var pos = _gridPos(posIndex, 6);
    var matchName = effectData.matchName;
    var type = knownEffectType(matchName);
    var isUnknown = type === 'effects/unknown';

    var props = {};
    if (isUnknown) {
      props.label           = effectData.name || 'Unknown Effect';
      props.effectName      = effectData.name || '';
      props.effectMatchName = matchName;
    } else {
      props.label = effectData.name || matchName;
      for (var i = 0; i < effectData.properties.length; i++) {
        props[effectData.properties[i].matchName] = effectData.properties[i].value;
      }
    }

    return {
      id:             uuidGenerator.node(),
      type:           type,
      nodeKind:       'effector',
      dedicated:      false,
      state:          'ghost',
      dirty:          false,
      x:              pos.x,
      y:              pos.y,
      props:          props,
      hostingComps:   [],
      hasParkedLayer: false,
      dynamicSchema:  null,
      secondaryPorts: null
    };
  }

  /**
   * Builds a Blending utility node data object.
   * @param {string} mode - Blending mode string (e.g. 'ADD', 'MULTIPLY')
   * @param {number} posIndex - Sequential index for grid positioning
   * @returns {Object} Node data
   */
  function buildBlendingNode(mode, posIndex) {
    var pos = _gridPos(posIndex, 6);
    return {
      id:             uuidGenerator.node(),
      type:           'utility/blending',
      nodeKind:       'blending',
      dedicated:      false,
      state:          'alive',
      dirty:          false,
      x:              pos.x,
      y:              pos.y,
      props:          { label: 'Blending', mode: mode },
      hostingComps:   [],
      hasParkedLayer: false,
      dynamicSchema:  null,
      secondaryPorts: null
    };
  }

  /**
   * Builds a Matte utility node data object.
   * @param {string} matteType - Track matte type string (e.g. 'ALPHA', 'LUMA')
   * @param {boolean} inverted - Whether the matte is inverted
   * @param {number} posIndex - Sequential index for grid positioning
   * @returns {Object} Node data
   */
  function buildMatteNode(matteType, inverted, posIndex) {
    var pos = _gridPos(posIndex, 6);
    var type = 'utility/matte-alpha';
    if (matteType.indexOf('LUMA') !== -1) {
      type = 'utility/matte-luma';
    }
    return {
      id:             uuidGenerator.node(),
      type:           type,
      nodeKind:       'effector',
      dedicated:      false,
      state:          'alive',
      dirty:          false,
      x:              pos.x,
      y:              pos.y,
      props:          { label: 'Matte', invert: inverted },
      hostingComps:   [],
      hasParkedLayer: false,
      dynamicSchema:  null,
      secondaryPorts: null
    };
  }

  /**
   * Returns the list of matchNames that have registered Procedia effect nodes.
   * Used by the builder to decide when to create known vs unknown effect nodes.
   * @returns {string[]}
   */
  function getKnownEffectMatchNames() {
    var keys = [];
    for (var k in KNOWN_EFFECT_MATCHNAMES) {
      if (KNOWN_EFFECT_MATCHNAMES.hasOwnProperty(k)) keys.push(k);
    }
    return keys;
  }

  return {
    buildFootageNode:         buildFootageNode,
    buildCompNode:            buildCompNode,
    buildLayerNode:           buildLayerNode,
    buildEffectNode:          buildEffectNode,
    buildBlendingNode:        buildBlendingNode,
    buildMatteNode:           buildMatteNode,
    aeTypeToNodeType:         aeTypeToNodeType,
    isKnownEffect:            isKnownEffect,
    knownEffectType:          knownEffectType,
    getKnownEffectMatchNames: getKnownEffectMatchNames
  };

})();
