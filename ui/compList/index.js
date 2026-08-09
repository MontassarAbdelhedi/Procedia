/**
 * @fileoverview Floating comp dropdown at the bottom-left of the canvas.
 * Shows "All project" label with a dropdown listing every comp in the AE project
 * (excluding the reserved comp). Clicking a comp focuses it in the viewer,
 * filters the canvas to show only downstream nodes, and enables auto-wire on drop.
 * Depends on: evalBridge, graphState (globals), __compList_dom, __compList_render, __compList_logic
 * Exports: compList.init
 */
// ui/compList/index.js
// DEPENDS ON: ui/compList/dom.js, ui/compList/render.js, ui/compList/logic.js,
//             bridge/evalBridge.js, graph/graphState.js
// MUST LOAD BEFORE: index.js

var compList = (function() {

  var _dropdown = null;
  var _menu = null;
  var _triggerLabel = null;

  function _toggle() {
    if (_menu.classList.contains('complist-open')) {
      _close();
    } else {
      _open();
    }
  }

  function _open() {
    var trigger = _dropdown.querySelector('.complist-trigger');
    trigger.classList.add('complist-open');
    _menu.classList.add('complist-open');
    _menu.innerHTML = '<div class="complist-item complist-item--empty">Loading...</div>';
    if (typeof evalBridge !== 'undefined' && evalBridge.dispatch) {
      evalBridge.dispatch({ action: 'listComps' }).then(function(res) {
        if (res.ok && res.data) {
          __compList_render.renderComps(_menu, res.data, _close, _triggerLabel);
        } else {
          _menu.innerHTML = '<div class="complist-item complist-item--empty">Error loading comps</div>';
        }
      }).catch(function() {
        _menu.innerHTML = '<div class="complist-item complist-item--empty">Error loading comps</div>';
      });
    } else {
      _menu.innerHTML = '<div class="complist-item complist-item--empty">Bridge not available</div>';
    }
  }

  function _close() {
    var trigger = _dropdown.querySelector('.complist-trigger');
    trigger.classList.remove('complist-open');
    _menu.classList.remove('complist-open');
  }

  /**
   * Creates the dropdown DOM inside canvas-wrap.
   */
  function init() {
    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;

    var els = __compList_dom.createDropdown(canvasWrap);
    _dropdown = els.dropdown;
    _menu = els.menu;
    _triggerLabel = els.triggerLabel;

    els.trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      _toggle();
    });

    __compList_dom.bindOutsideClick(_dropdown, _close);
  }

  return {
    init: init
  };

})();
