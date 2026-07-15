/**
 * @fileoverview Preset save modal public API.
 * @exports presetModal
 */
// ui/presetModal/index.js
// DEPENDS ON: ui/presetModal/dom.js, ui/presetModal/events.js
// MUST LOAD BEFORE: index.js

var presetModal = (function() {

  var _overlay = null;

  function init() {
    _overlay = __pm_dom.build();
    __pm_events.wireStatic(_overlay);
  }

  function open(selectedNodeIds) {
    if (!_overlay) return;
    if (!selectedNodeIds || selectedNodeIds.length === 0) {
      if (typeof notificationBar !== 'undefined' && notificationBar.push) {
        notificationBar.push({
          severity: 'warning',
          message: 'Select at least one node to save as preset',
          duration: 3000
        });
      }
      return;
    }
    __pm_events.wire(selectedNodeIds);
    _overlay.style.display = 'flex';
  }

  return {
    init: init,
    open: open
  };

})();
