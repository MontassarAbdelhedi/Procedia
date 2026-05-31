/**
 * @fileoverview Node picker popup UI module. Displays a searchable popup
 * for finding and placing a compatible node when connecting wires.
 * Depends on: nodeRegistry, graphState, engine, viewport, __np_compat,
 *             __np_filter, __np_render, __np_events, wireRenderer, inspector, statusBar.
 * Exports: nodePicker.show, nodePicker.close
 */
// ui/nodePicker/index.js
// DEPENDS ON: graph/nodeRegistry.js, graph/graphState.js, graph/engine/index.js,
//             graph/canvas/viewport.js, ui/nodePicker/compatibility.js,
//             ui/nodePicker/render.js, ui/nodePicker/filter.js, ui/nodePicker/events.js
// MUST LOAD AFTER: all sub-modules

var nodePicker = (function() {

  var _state = {
    overlay: null,
    active: false,
    resolveCb: null,
    compatible: [],
    filtered: [],
    selIndex: -1
  };

  /**
   * Applies the search query filter and updates the rendered list.
   * @param {string} query The search query.
   */
  function _applyFilter(query) {
    var result = __np_filter.applyFilter(_state.compatible, query);
    _state.filtered = result.filtered;
    _state.selIndex = result.selIndex;
    __np_render.updateList(_state.overlay, _state.filtered, _state.selIndex);
  }

  /**
   * Shows the node picker popup at a screen position.
   * @param {number} screenX Screen X coordinate.
   * @param {number} screenY Screen Y coordinate.
   * @param {string} fromNodeId Source node ID.
   * @param {string} fromPortId Source port ID.
   * @param {string} wireType The wire type to filter compatible nodes.
   * @return {Promise|null} A promise that resolves with the created node or null.
   */
  function show(screenX, screenY, fromNodeId, fromPortId, wireType) {
    if (_state.active) close(null);

    _state.compatible = __np_compat.compatibleNodes(wireType);
    var filtered = __np_filter.applyFilter(_state.compatible, '');
    _state.filtered = filtered.filtered;
    _state.selIndex = filtered.selIndex;

    var wrap = document.getElementById('canvas-wrap');
    if (!wrap) return null;
    var wr = wrap.getBoundingClientRect();
    var left = screenX - wr.left;
    var top  = screenY - wr.top;

    var overlay = document.createElement('div');
    overlay.className = 'nodepicker-overlay';
    overlay.innerHTML =
      '<div class="nodepicker-popup" style="left:' + left + 'px;top:' + top + 'px">' +
        '<div class="nodepicker-header">' +
          '<input class="nodepicker-search" type="text" placeholder="Filter nodes\u2026" autofocus>' +
          '<button class="nodepicker-close ti ti-x"></button>' +
        '</div>' +
        '<div class="nodepicker-list">' +
          __np_render.renderList(_state.filtered, _state.selIndex) +
        '</div>' +
      '</div>';

    overlay.addEventListener('click', function(e) {
      __np_events.onOverlayClick(e, close);
    });
    overlay.addEventListener('keydown', function(e) {
      __np_events.onKeyDown(e, _state, close);
    });

    var closeBtn = overlay.querySelector('.nodepicker-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        close(null);
      });
    }

    var searchInput = overlay.querySelector('.nodepicker-search');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        _applyFilter(this.value);
      });
      setTimeout(function() { searchInput.focus(); }, 0);
    }

    wrap.appendChild(overlay);
    _state.overlay = overlay;
    _state.active = true;

    return new Promise(function(resolve) {
      _state.resolveCb = function(type) {
        if (!type) { resolve(null); return; }
        var def = nodeRegistry.getDefinition(type);
        if (!def) { resolve(null); return; }
        var canvasPos = viewport.screenToCanvas(screenX, screenY);
        var node = engine.dropNode(def, canvasPos.x, canvasPos.y);
        if (!node) { resolve(null); return; }
        engine.connectWire(fromNodeId, fromPortId, node.id, 'main_input');
        graphState.setSelection(node.id);
        renderer.render();
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
        if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
        resolve(node);
      };
    });
  }

  /**
   * Closes the node picker popup and resolves with the selected type or null.
   * @param {string|null} type The selected node type, or null if cancelled.
   */
  function close(type) {
    if (_state.overlay) {
      _state.overlay.remove();
      _state.overlay = null;
    }
    if (_state.resolveCb) {
      _state.resolveCb(type);
      _state.resolveCb = null;
    }
    _state.active = false;
    _state.compatible = [];
    _state.filtered = [];
    _state.selIndex = -1;
  }

  return {
    show:  show,
    close: close
  };

})();
