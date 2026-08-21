/**
 * @fileoverview Settings modal UI module. Builds and controls the settings overlay.
 * Depends on: settings (global), __sm_dom, __sm_events, __sm_sync, __sm_apply.
 * Exports: settingsModal.init, settingsModal.open, settingsModal.close
 */
// ui/settingsModal/index.js
// DEPENDS ON: ui/settings.js, ui/settingsModal/dom.js, ui/settingsModal/events.js,
//             ui/settingsModal/sync.js, ui/settingsModal/apply.js
// MUST LOAD BEFORE: index.js

var settingsModal = (function() {

  var _overlay = null;
  var _open = false;
  var _refs = null;

  /**
   * Opens the settings modal.
   */
  function open(tabName) {
    if (_open && !tabName) return;
    _open = true;
    _overlay.style.display = 'flex';
    __sm_sync.sync(_refs);
    if (tabName) activateTab(tabName);
  }

  function activateTab(tabName) {
    if (!_overlay) return;
    var tab = _overlay.querySelector('.settings-tab[data-tab="' + tabName + '"]');
    var panel = document.getElementById('settings-panel-' + tabName);
    if (!tab || !panel) return;
    var tabs = _overlay.querySelectorAll('.settings-tab');
    var panels = _overlay.querySelectorAll('.settings-tab-panel');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
    for (var j = 0; j < panels.length; j++) panels[j].classList.remove('active');
    tab.classList.add('active');
    panel.classList.add('active');
  }

  /**
   * Closes the settings modal.
   */
  function close() {
    if (!_open) return;
    _open = false;
    _overlay.style.display = 'none';
    __sm_apply.apply();
  }

  /**
   * Initializes the settings modal: builds DOM, binds events, syncs controls, applies settings.
   */
  function init() {
    if (!_overlay) {
      _overlay = __sm_dom.build();
      _refs = __sm_events.bind(_overlay, close, __sm_apply.apply);
      if (typeof __sm_updates !== 'undefined') __sm_updates.bind();
    }
    __sm_sync.sync(_refs);
    __sm_apply.apply();
  }

  return {
    init:  init,
    open:  open,
    close: close,
    openUpdates: function() { open('updates'); }
  };

})();
