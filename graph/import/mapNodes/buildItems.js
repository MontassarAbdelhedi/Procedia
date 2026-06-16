/**
 * graph/import/mapNodes/buildItems.js
 *
 * Builds node data objects for footage items, compositions, and layers
 * from the AE project scanner output.
 *
 * Dependencies: uuidGenerator, nodeRegistry, graph/import/mapNodes/helpers.js
 * Load before: graph/import/mapWires.js, graph/import/builder.js
 */

// graph/import/mapNodes/buildItems.js
// DEPENDS ON: data/uuidGenerator.js, graph/nodeRegistry.js,
//             graph/import/mapNodes/helpers.js
// MUST LOAD AFTER: graph/import/mapNodes/helpers.js
// MUST LOAD BEFORE: graph/import/mapWires.js, graph/import/builder.js

(function() {

  function buildFootageNode(footageData, posIndex) {
    var pos = __imp_nodes._gridPos(posIndex, 4);
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

  function buildCompNode(compData, posIndex) {
    var pos = __imp_nodes._gridPos(posIndex, 4);
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

  function buildLayerNode(layerData, hostingCompUUID, posIndex) {
    var type = __imp_nodes.aeTypeToNodeType(layerData.type);
    if (!type) return null;

    var pos = __imp_nodes._gridPos(posIndex, 5);
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
      nodeKind:       __imp_nodes._nodeKindForType(type),
      dedicated:      __imp_nodes._dedicatedForType(type),
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

  __imp_nodes.buildFootageNode = buildFootageNode;
  __imp_nodes.buildCompNode = buildCompNode;
  __imp_nodes.buildLayerNode = buildLayerNode;

})();
