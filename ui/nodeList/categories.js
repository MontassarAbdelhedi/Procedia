/**
 * @fileoverview Dynamic node categories built from nodeRegistry.
 * Groups all registered node definitions by their `category` field.
 * Depends on: nodeRegistry (global).
 * Exports: __nl_cat.LABEL_TO_TYPE, .CATEGORIES, .getCategoryColor, .resolveDefByLabel
 */
// ui/nodeList/categories.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: ui/nodeList/index.js

var __nl_cat = (function() {

  var CATEGORY_COLORS = {
    'Core':            '#534AB7',
    'Data':            '#2E7D32',
    'Layers':          '#185FA5',
    'Utility':         '#5F5E5A',
    '3D Channel':      '#854F0B',
    'Audio':           '#854F0B',
    'Blur & Sharpen':  '#854F0B',
    'Boris FX Mocha':  '#854F0B',
    'Channel':         '#854F0B',
    'Color Correction':'#854F0B',
    'Distort':         '#854F0B',
    'Expression Controls': '#854F0B',
    'Generate':        '#854F0B',
    'Immersive Video': '#854F0B',
    'Keying':          '#854F0B',
    'Matte':           '#854F0B',
    'Noise & Grain':   '#854F0B',
    'Perspective':     '#854F0B',
    'Simulation':      '#854F0B',
    'Stylize':         '#854F0B',
    'Text':            '#854F0B',
    'Time':            '#854F0B',
    'Transition':      '#854F0B'
  };

  var CATEGORY_NAMES = {
    'Core': 'Comps'
  };

  var CATEGORY_ORDER = [
    'Core', 'Data', 'Layers', 'Utility',
    '3D Channel', 'Audio', 'Blur & Sharpen', 'Boris FX Mocha',
    'Channel', 'Color Correction', 'Distort', 'Expression Controls',
    'Generate', 'Immersive Video', 'Keying', 'Matte',
    'Noise & Grain', 'Perspective', 'Simulation', 'Stylize',
    'Text', 'Time', 'Transition'
  ];

  var LABEL_TO_TYPE = {};
  var CATEGORIES = [];

  function init() {
    var all = nodeRegistry.getAll();
    var groups = {};

    for (var type in all) {
      var def = all[type];
      var cat = def.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(def);
      LABEL_TO_TYPE[def.label] = def.type;
    }

    var used = {};

    var OPEN_CATEGORIES = { 'Core': true, 'Data': true, 'Layers': true, 'Utility': true };

    for (var o = 0; o < CATEGORY_ORDER.length; o++) {
      var key = CATEGORY_ORDER[o];
      if (groups[key]) {
        var open = OPEN_CATEGORIES[key] === true;
        CATEGORIES.push(buildCategory(key, groups[key], open));
        used[key] = true;
      }
    }

    for (var cat in groups) {
      if (!used[cat]) {
        var isOpen = (cat === 'obsolete' || cat === 'Uncategorized') ? false : true;
        CATEGORIES.push(buildCategory(cat, groups[cat], isOpen));
      }
    }
  }

  function buildCategory(catName, defs, openByDefault) {
    var id = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
    var displayName = CATEGORY_NAMES[catName] || catName;
    var color = CATEGORY_COLORS[catName] || '#888780';
    var labels = [];
    var sortable = [];
    for (var i = 0; i < defs.length; i++) {
      sortable.push({ label: defs[i].label, sortKey: defs[i].label.toLowerCase() });
    }
    sortable.sort(function(a, b) {
      if (a.sortKey < b.sortKey) return -1;
      if (a.sortKey > b.sortKey) return 1;
      return 0;
    });
    for (var j = 0; j < sortable.length; j++) {
      labels.push(sortable[j].label);
    }
    return {
      id: id,
      name: displayName,
      color: color,
      open: openByDefault,
      nodes: labels
    };
  }

  init();

  function getCategoryColor(label) {
    for (var i = 0; i < CATEGORIES.length; i++) {
      for (var j = 0; j < CATEGORIES[i].nodes.length; j++) {
        if (CATEGORIES[i].nodes[j] === label) return CATEGORIES[i].color;
      }
    }
    return '#888780';
  }

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
