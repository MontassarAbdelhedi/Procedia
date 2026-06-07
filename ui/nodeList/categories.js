/**
 * @fileoverview Node categories configuration. Maps display labels to node type IDs
 * and defines the category structure for the node list sidebar.
 * Depends on: nodeRegistry (global).
 * Exports: __nl_cat.LABEL_TO_TYPE, .CATEGORIES, .getCategoryColor, .resolveDefByLabel
 */
// ui/nodeList/categories.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: ui/nodeList/index.js

var __nl_cat = (function() {

  var LABEL_TO_TYPE = {
    'Text':     'layers/text',
    'Null':     'layers/null',
    'Comp':     'core/comp',
    'Footage':  'core/footage',
    'Fill':     'effects/fill',
    'Color':    'data/color',
    'Number':   'data/number',
    'Blending': 'utility/blending'
  };

  var CATEGORIES = [
    {
      id: 'comps',
      name: 'Comps',
      color: '#534AB7',
      open: true,
      nodes: ['Comp', 'Footage']
    },
    {
      id: 'data',
      name: 'Data',
      color: '#2E7D32',
      open: true,
      nodes: ['Color', 'Number']
    },
    {
      id: 'effects',
      name: 'Effects',
      color: '#854F0B',
      open: true,
      nodes: ['Fill']
    },
    {
      id: 'layers',
      name: 'Layers',
      color: '#185FA5',
      open: true,
      nodes: ['Text', 'Null']
    },
    {
      id: 'utility',
      name: 'Utility',
      color: '#5F5E5A',
      open: true,
      nodes: ['Blending']
    }
  ];

  /**
   * Returns the category color for a given node label.
   * @param {string} label The node display label.
   * @return {string} CSS color string.
   */
  function getCategoryColor(label) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      for (var j = 0; j < CATEGORIES[i].nodes.length; j++) {
        if (CATEGORIES[i].nodes[j] === label) return CATEGORIES[i].color;
      }
    }
    return '#888780';
  }

  /**
   * Resolves a node definition from a display label.
   * @param {string} label The display label.
   * @return {Object|null} The node definition, or null if not found.
   */
  function resolveDefByLabel(label) {
    var type = LABEL_TO_TYPE[label];
    if (!type) return null;
    return nodeRegistry.getDefinition(type);
  }

  return {
    LABEL_TO_TYPE: LABEL_TO_TYPE,
    CATEGORIES: CATEGORIES,
    getCategoryColor: getCategoryColor,
    resolveDefByLabel: resolveDefByLabel
  };

})();
