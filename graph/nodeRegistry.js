var nodeRegistry = (function() {

  var definitions = [

    // ─── Containers ──────────────────────────────────────────────
    {
      type: 'CompNode',
      label: 'Comp',
      category: 'containers',
      strokeColor: '#5b8dd9',
      dedicated: true,
      aeLayerType: null,
      aeProjectObject: 'CompItem',
      inputs: [
        { port: 'layer_in', type: 'layer', accepts: 'any', multiplicity: 'unlimited' }
      ],
      defaultProperties: {
        width: 1920,
        height: 1080,
        duration: 10,
        frameRate: 24
      }
    },
    {
      type: 'SolidNode',
      label: 'Solid',
      category: 'containers',
      strokeColor: '#5b8dd9',
      dedicated: true,
      aeLayerType: 'AVLayer',
      aeProjectObject: 'FootageItem',
      inputs: [
        { port: 'data_color',  type: 'data', accepts: 'color' },
        { port: 'data_width',  type: 'data', accepts: 'number' },
        { port: 'data_height', type: 'data', accepts: 'number' }
      ],
      defaultProperties: {
        color: [0, 0, 0, 1],
        width: 1920,
        height: 1080
      }
    },
    {
      type: 'NullNode',
      label: 'Null',
      category: 'containers',
      strokeColor: '#5b8dd9',
      dedicated: true,
      aeLayerType: 'NullLayer',
      aeProjectObject: null,
      inputs: [
        { port: 'data_position', type: 'data', accepts: 'vector2' },
        { port: 'data_scale',    type: 'data', accepts: 'vector2' },
        { port: 'data_rotation', type: 'data', accepts: 'number' }
      ],
      defaultProperties: {
        position: [960, 540],
        scale: [100, 100],
        rotation: 0
      }
    },
    {
      type: 'AdjustmentNode',
      label: 'Adjustment',
      category: 'containers',
      strokeColor: '#5b8dd9',
      dedicated: true,
      aeLayerType: 'AVLayer',
      aeProjectObject: null,
      inputs: [
        { port: 'data_opacity', type: 'data', accepts: 'number' }
      ],
      defaultProperties: {
        opacity: 100
      }
    },
    {
      type: 'FootageNode',
      label: 'Footage',
      category: 'containers',
      strokeColor: '#5b8dd9',
      dedicated: true,
      aeLayerType: 'AVLayer',
      aeProjectObject: 'FootageItem',
      inputs: [
        { port: 'data_opacity', type: 'data', accepts: 'number' }
      ],
      defaultProperties: {
        opacity: 100
      }
    },

    // ─── Layers ───────────────────────────────────────────────────
    {
      type: 'TextNode',
      label: 'Text',
      category: 'layers',
      strokeColor: '#7ec98f',
      dedicated: false,
      aeLayerType: 'TextLayer',
      aeProjectObject: null,
      inputs: [
        { port: 'data_content',  type: 'data', accepts: 'string' },
        { port: 'data_fontSize', type: 'data', accepts: 'number' },
        { port: 'data_color',    type: 'data', accepts: 'color' }
      ],
      defaultProperties: {
        content: 'Text',
        fontSize: 72,
        color: [1, 1, 1, 1]
      }
    },
    {
      type: 'ShapeNode',
      label: 'Shape',
      category: 'layers',
      strokeColor: '#7ec98f',
      dedicated: false,
      aeLayerType: 'ShapeLayer',
      aeProjectObject: null,
      inputs: [
        { port: 'data_fillColor',   type: 'data', accepts: 'color' },
        { port: 'data_strokeColor', type: 'data', accepts: 'color' },
        { port: 'data_strokeWidth', type: 'data', accepts: 'number' }
      ],
      defaultProperties: {
        fillColor: [1, 1, 1, 1],
        strokeColor: [0, 0, 0, 1],
        strokeWidth: 0
      }
    },
    {
      type: 'MaskNode',
      label: 'Mask',
      category: 'layers',
      strokeColor: '#7ec98f',
      dedicated: false,
      aeLayerType: 'Mask',
      aeProjectObject: null,
      inputs: [
        { port: 'layer_in',      type: 'layer', accepts: 'any' },
        { port: 'data_feather',  type: 'data',  accepts: 'number' },
        { port: 'data_opacity',  type: 'data',  accepts: 'number' },
        { port: 'data_expansion', type: 'data', accepts: 'number' }
      ],
      defaultProperties: {
        feather: 0,
        opacity: 100,
        expansion: 0
      }
    },

    // ─── Effects ──────────────────────────────────────────────────
    {
      type: 'EffectNode',
      label: 'Effect',
      category: 'effects',
      strokeColor: '#d4a04a',
      dedicated: false,
      aeLayerType: 'Effect',
      aeProjectObject: null,
      inputs: [
        { port: 'layer_in',        type: 'layer', accepts: 'any' },
        { port: 'data_blurAmount', type: 'data',  accepts: 'number' }
      ],
      defaultProperties: {
        aeMatchName: 'ADBE Gaussian Blur 2',
        blurAmount: 0
      }
    },

    // ─── Graph ────────────────────────────────────────────────────
    {
      type: 'GraphPositionNode',
      label: 'GraphPosition',
      category: 'graph',
      strokeColor: '#b07ed4',
      dedicated: false,
      aeLayerType: null,
      aeProjectObject: null,
      inputs: [
        { port: 'data_position', type: 'data', accepts: 'vector2' }
      ],
      defaultProperties: {
        position: [0, 0]
      }
    },
    {
      type: 'GraphRotationNode',
      label: 'GraphRotation',
      category: 'graph',
      strokeColor: '#b07ed4',
      dedicated: false,
      aeLayerType: null,
      aeProjectObject: null,
      inputs: [
        { port: 'data_rotation', type: 'data', accepts: 'number' }
      ],
      defaultProperties: {
        rotation: 0
      }
    },
    {
      type: 'GraphScaleNode',
      label: 'GraphScale',
      category: 'graph',
      strokeColor: '#b07ed4',
      dedicated: false,
      aeLayerType: null,
      aeProjectObject: null,
      inputs: [
        { port: 'data_scale', type: 'data', accepts: 'vector2' }
      ],
      defaultProperties: {
        scale: [100, 100]
      }
    },

    // ─── Special ──────────────────────────────────────────────────
    {
      type: 'IsParentNode',
      label: 'IsParent',
      category: 'special',
      strokeColor: '#d46e6e',
      dedicated: false,
      aeLayerType: null,
      aeProjectObject: null,
      inputs: [
        { port: 'layer_child',  type: 'layer', accepts: 'any' },
        { port: 'layer_parent', type: 'layer', accepts: 'any' }
      ],
      defaultProperties: {}
    }

  ];

  // ─── Index by type for O(1) lookup ───────────────────────────

  var byType = {};
  for (var i = 0; i < definitions.length; i++) {
    byType[definitions[i].type] = definitions[i];
  }

  // ─── Public API ───────────────────────────────────────────────

  function getByType(type) {
    return byType[type] || null;
  }

  function getByCategory(category) {
    var result = [];
    for (var i = 0; i < definitions.length; i++) {
      if (definitions[i].category === category) {
        result.push(definitions[i]);
      }
    }
    return result;
  }

  function getAll() {
    return definitions;
  }

  return {
    getByType:     getByType,
    getByCategory: getByCategory,
    getAll:        getAll
  };

}());
