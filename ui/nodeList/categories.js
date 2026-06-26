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
    'Data':            '#D4AC0D',
    'Layers':          '#185FA5',
    'Shapes':          '#1ABC9C',
    'Effects':         '#27AE60',
    '3D Channel':      '#27AE60',
    'Audio':           '#27AE60',
    'Blur & Sharpen':  '#27AE60',
    'Boris FX Mocha':  '#27AE60',
    'Channel':         '#27AE60',
    'Color Correction':'#27AE60',
    'Distort':         '#27AE60',
    'Expression Controls': '#27AE60',
    'Generate':        '#27AE60',
    'Immersive Video': '#27AE60',
    'Keying':          '#27AE60',
    'Matte':           '#27AE60',
    'Noise & Grain':   '#27AE60',
    'Perspective':     '#27AE60',
    'Simulation':      '#27AE60',
    'Stylize':         '#27AE60',
    'Text':            '#27AE60',
    'Time':            '#27AE60',
    'Transition':      '#27AE60',
    'obsolete':        '#27AE60',
    'Utility':         '#5F5E5A'
  };

  var CATEGORY_NAMES = {
    'Core': 'Core'
  };

  var CATEGORY_ORDER = [
    'Core', 'Data', 'Layers', 'Shapes', 'Effects'
  ];

  var EFFECTS_SUBCATEGORIES = {
    '3D Channel': true,
    'Audio': true,
    'Blur & Sharpen': true,
    'Boris FX Mocha': true,
    'Channel': true,
    'Color Correction': true,
    'Distort': true,
    'Expression Controls': true,
    'Generate': true,
    'Immersive Video': true,
    'Keying': true,
    'Matte': true,
    'Noise & Grain': true,
    'obsolete': true,
    'Perspective': true,
    'Simulation': true,
    'Stylize': true,
    'Text': true,
    'Time': true,
    'Transition': true,
    'Uncategorized': true,
    'Utility': true
  };

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

    for (var o = 0; o < CATEGORY_ORDER.length; o++) {
      var key = CATEGORY_ORDER[o];
      if (key === 'Effects') {
        var subs = [];
        for (var sub in EFFECTS_SUBCATEGORIES) {
          if (groups[sub]) {
            subs.push(buildCategory(sub, groups[sub], false));
            used[sub] = true;
          }
        }
        subs.sort(function(a, b) {
          if (a.name.toLowerCase() < b.name.toLowerCase()) return -1;
          if (a.name.toLowerCase() > b.name.toLowerCase()) return 1;
          return 0;
        });
        var effectsCat = {
          id: 'effects',
          name: 'Effects',
          color: CATEGORY_COLORS['Effects'] || '#27AE60',
          open: false,
          nodes: [],
          subcategories: subs
        };
        CATEGORIES.push(effectsCat);
      } else if (groups[key]) {
        CATEGORIES.push(buildCategory(key, groups[key], false));
        used[key] = true;
      }
    }

    for (var cat in groups) {
      if (!used[cat]) {
        var isOpen = true;
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
      var cat = CATEGORIES[i];
      for (var j = 0; j < cat.nodes.length; j++) {
        if (cat.nodes[j] === label) return cat.color;
      }
      if (cat.subcategories) {
        for (var k = 0; k < cat.subcategories.length; k++) {
          var sub = cat.subcategories[k];
          for (var m = 0; m < sub.nodes.length; m++) {
            if (sub.nodes[m] === label) return sub.color;
          }
        }
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
