/**
 * @fileoverview Top bar initialization. Builds DOM and wires events.
 * Depends on: __topBar_dom, __topBar_events, _topBarSelection, _topBarCollapse (globals).
 * Exports: _topBarInit
 */
// ui/topBar/init.js
// DEPENDS ON: ui/topBar/dom.js, ui/topBar/events.js, ui/topBar/selection.js, ui/topBar/collapse.js
// MUST LOAD BEFORE: ui/topBar/index.js

var _topBarInit = (function() {

  function init() {
    var el = document.getElementById('top-bar');
    __topBar_dom.build(el);

    if (typeof _topBarSelection !== 'undefined') {
      _topBarSelection.refreshSelection([]);
    }

    if (typeof __topBar_events !== 'undefined') {
      __topBar_events.bind();
      __topBar_events.refreshCollapseBtn();
    }
  }

  return {
    init: init
  };

})();
