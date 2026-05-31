/**
 * @fileoverview Node picker text filter. Filters a list of compatible nodes
 * by a user-provided search query and tracks the selected index.
 * Exports: __np_filter.applyFilter, .selectedDef
 */
// ui/nodePicker/filter.js
// DEPENDS ON: (none - pure filtering)
// MUST LOAD BEFORE: ui/nodePicker/index.js

var __np_filter = (function() {

  /**
   * Filters compatible nodes by label containing the query string.
   * @param {Array} compatible Array of node definitions.
   * @param {string} query The search query.
   * @return {Object} { filtered: Array, selIndex: number }
   */
  function applyFilter(compatible, query) {
    var q = query.toLowerCase();
    var filtered = [];
    for (var i = 0; i < compatible.length; i++) {
      var def = compatible[i];
      var label = (def.label || def.type).toLowerCase();
      if (q === '' || label.indexOf(q) !== -1) {
        filtered.push(def);
      }
    }
    return {
      filtered: filtered,
      selIndex: filtered.length > 0 ? 0 : -1
    };
  }

  /**
   * Returns the currently selected definition from the filtered list.
   * @param {Array} filtered The filtered array.
   * @param {number} selIndex The selected index.
   * @return {Object|null} The selected definition, or null.
   */
  function selectedDef(filtered, selIndex) {
    if (selIndex < 0 || selIndex >= filtered.length) return null;
    return filtered[selIndex];
  }

  return {
    applyFilter:  applyFilter,
    selectedDef:  selectedDef
  };

})();
