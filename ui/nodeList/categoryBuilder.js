/**
 * @fileoverview Category building utilities for the node list sidebar.
 * Provides buildCategory (single-category rendering) and build (full
 * categorisation pass over nodeRegistry) as standalone functions.
 * Depends on: nodeRegistry (global), __catColors (global),
 *             __nlEffectsSubcategories (global).
 * Exports: __nl_catBuilder.buildCategory, .build
 */
// ui/nodeList/categoryBuilder.js
// DEPENDS ON: graph/nodeRegistry.js, data/categoryColors.js,
//             ui/nodeList/effectsSubcategories.js
// MUST LOAD BEFORE: ui/nodeList/categories.js

var __nl_catBuilder = (function() {

  var CATEGORY_ORDER = [
    'Core', 'Data', 'Layers', 'Shapes', 'Instances', 'Track Matte', 'Presets', 'Effects'
  ];

  /**
   * Runs a full categorisation pass: reads all definitions from nodeRegistry,
   * groups by category, sorts into ordered categories + Effects subcategories,
   * and returns { categories, labelToType }.
   */
  function build() {
    var all = nodeRegistry.getAll();
    var groups = {};
    var labelToType = {};

    for (var type in all) {
      var def = all[type];
      var cat = def.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(def);
      labelToType[def.label] = def.type;
    }

    var categories = [];
    var used = {};

    for (var o = 0; o < CATEGORY_ORDER.length; o++) {
      var key = CATEGORY_ORDER[o];
      if (key === 'Effects') {
        var subs = [];
        for (var sub in __nlEffectsSubcategories) {
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
          color: __catColors.colors['Effects'] || '#27AE60',
          open: false,
          nodes: [],
          subcategories: subs
        };
        categories.push(effectsCat);
      } else if (groups[key]) {
        categories.push(buildCategory(key, groups[key], false));
        used[key] = true;
      }
    }

    for (var cat in groups) {
      if (!used[cat]) {
        categories.push(buildCategory(cat, groups[cat], true));
      }
    }

    return { categories: categories, labelToType: labelToType };
  }

  /**
   * Builds a single category object from a name, its definitions, and an
   * open-by-default flag.
   */
  function buildCategory(catName, defs, openByDefault) {
    var id = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cat';
    var color = __catColors.colors[catName] || '#888780';
    var sortable = [];
    for (var i = 0; i < defs.length; i++) {
      sortable.push({ label: defs[i].label, sortKey: defs[i].label.toLowerCase() });
    }
    sortable.sort(function(a, b) {
      if (a.sortKey < b.sortKey) return -1;
      if (a.sortKey > b.sortKey) return 1;
      return 0;
    });
    var labels = [];
    for (var j = 0; j < sortable.length; j++) {
      labels.push(sortable[j].label);
    }
    return {
      id: id,
      name: catName,
      color: color,
      open: openByDefault,
      nodes: labels
    };
  }

  return {
    build: build,
    buildCategory: buildCategory
  };

})();
