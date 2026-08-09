/**
 * @fileoverview Dynamic node categories built from nodeRegistry.
 * Orchestrates category building via __nl_catBuilder and exposes the
 * categorised result as the __nl_cat global.
 * Depends on: __nl_catBuilder (global), __nlEffectsSubcategories (global).
 * Exports: __nl_cat.LABEL_TO_TYPE, .CATEGORIES, .getCategoryColor, .resolveDefByLabel, .refresh
 */
// ui/nodeList/categories.js
// DEPENDS ON: ui/nodeList/effectsSubcategories.js, ui/nodeList/categoryBuilder.js
// MUST LOAD BEFORE: ui/nodeList/index.js

var __nl_cat = (function() {

  var LABEL_TO_TYPE = {};
  var CATEGORIES = [];

  function refresh() {
    LABEL_TO_TYPE = {};
    CATEGORIES = [];
    var result = __nl_catBuilder.build();
    LABEL_TO_TYPE = result.labelToType;
    CATEGORIES = result.categories;
    __nl_cat.LABEL_TO_TYPE = LABEL_TO_TYPE;
    __nl_cat.CATEGORIES = CATEGORIES;
  }

  var result = __nl_catBuilder.build();
  LABEL_TO_TYPE = result.labelToType;
  CATEGORIES = result.categories;

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
    resolveDefByLabel: resolveDefByLabel,
    refresh: refresh
  };

})();
