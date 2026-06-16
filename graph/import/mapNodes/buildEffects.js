/**
 * graph/import/mapNodes/buildEffects.js
 *
 * Builds node data objects for effects, blending modes, and track mattes
 * from the AE project scanner output.
 *
 * Dependencies: uuidGenerator, graph/import/mapNodes/helpers.js
 * Load before: graph/import/mapWires.js, graph/import/builder.js
 */

// graph/import/mapNodes/buildEffects.js
// DEPENDS ON: data/uuidGenerator.js, graph/import/mapNodes/helpers.js
// MUST LOAD AFTER: graph/import/mapNodes/helpers.js
// MUST LOAD BEFORE: graph/import/mapWires.js, graph/import/builder.js

(function() {

  function buildEffectNode(effectData, posIndex) {
    var pos = __imp_nodes._gridPos(posIndex, 6);
    var matchName = effectData.matchName;
    var type = __imp_nodes.knownEffectType(matchName);
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

  function buildBlendingNode(mode, posIndex) {
    var pos = __imp_nodes._gridPos(posIndex, 6);
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

  function buildMatteNode(matteType, inverted, posIndex) {
    var pos = __imp_nodes._gridPos(posIndex, 6);
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

  __imp_nodes.buildEffectNode = buildEffectNode;
  __imp_nodes.buildBlendingNode = buildBlendingNode;
  __imp_nodes.buildMatteNode = buildMatteNode;

})();
