// ui/nodePicker.js
// DEPENDS ON: graph/graphState/lifecycle.js, graph/nodes/nodeRegistry.js, graph/canvas/index.js,
//             graph/Wire/wire.js, graph/nodes/nodeGeometry.js, data/uuidGenerator.js
// MUST LOAD BEFORE: index.js

var nodePicker = (function() {

  // ─── Internal state ───────────────────────────────────────────

  var _isOpen      = false;
  var _config      = null;   // { sourceNodeId, portType, dropX, dropY }
  var _activeIndex = 0;
  var _flatList    = [];     // flat array of visible def objects, in render order

  // ─── DOM refs (set in init) ───────────────────────────────────

  var _el     = null;   // #node-picker
  var _search = null;   // #node-picker-search
  var _list   = null;   // #node-picker-list

  // ─── List rendering ──────────────────────────────────────────
  // Mirrors nodeList.js exactly: iterate by category, deduplicate by def.type,
  // then apply case-insensitive substring search on the label.

  function renderList(query) {
    var q    = query ? query.toLowerCase() : '';
    var cats = nodeRegistry.getCategories();

    _activeIndex = 0;
    _flatList    = [];
    _list.innerHTML = '';

    for (var ci = 0; ci < cats.length; ci++) {
      var cat  = cats[ci];
      var defs = nodeRegistry.getByCategory(cat);

      // Deduplicate aliases (same logic as nodeList.js)
      var seen   = {};
      var unique = [];
      for (var d = 0; d < defs.length; d++) {
        if (!seen[defs[d].type]) {
          seen[defs[d].type] = true;
          unique.push(defs[d]);
        }
      }

      // Apply text search filter
      var matched = [];
      for (var mi = 0; mi < unique.length; mi++) {
        var label = (unique[mi].label || unique[mi].type || '').toLowerCase();
        if (!q || label.indexOf(q) !== -1) {
          matched.push(unique[mi]);
        }
      }

      if (matched.length === 0) continue;

      var catLabel = document.createElement('div');
      catLabel.className   = 'picker-category-label';
      catLabel.textContent = cat;
      _list.appendChild(catLabel);

      for (var di = 0; di < matched.length; di++) {
        var def     = matched[di];
        var flatIdx = _flatList.length;
        _flatList.push(def);

        var item = document.createElement('div');
        item.className   = 'picker-node-item' + (flatIdx === 0 ? ' active' : '');
        item.textContent = def.label || def.type;

        // Closure to capture def for click handler
        (function(capturedDef) {
          item.addEventListener('mousedown', function(e) {
            e.preventDefault();
            e.stopPropagation();
            confirm(capturedDef);
          });
        }(def));

        _list.appendChild(item);
      }
    }

    if (_flatList.length === 0) {
      var noRes = document.createElement('div');
      noRes.className   = 'picker-no-results';
      noRes.textContent = 'No results';
      _list.appendChild(noRes);
    }
  }

  function setActiveIndex(idx) {
    var items = _list.querySelectorAll('.picker-node-item');
    if (!items.length) return;
    _activeIndex = Math.max(0, Math.min(idx, items.length - 1));
    for (var i = 0; i < items.length; i++) {
      if (i === _activeIndex) {
        items[i].classList.add('active');
        items[i].scrollIntoView({ block: 'nearest' });
      } else {
        items[i].classList.remove('active');
      }
    }
  }

  // ─── Confirm / cancel ─────────────────────────────────────────

  function confirm(def) {
    if (!_config || !def) { cancel(); return; }

    // Validate the def has at least one input
    if (!def.inputs || def.inputs.length === 0) { cancel(); return; }

    var canvasCol = document.getElementById('canvas-column');
    if (!canvasCol) { cancel(); return; }

    var rect    = canvasCol.getBoundingClientRect();
    var screenX = _config.dropX - rect.left;
    var screenY = _config.dropY - rect.top;
    var world   = canvas.screenToWorld(screenX, screenY);

    // Centre the new node on the drop point
    var wx = world.x - nodeGeometry.NODE_WIDTH  / 2;
    var wy = world.y - nodeGeometry.NODE_HEIGHT / 2;

    var newNodeId = graphState.onDrop(def.type, wx, wy);
    if (!newNodeId) { cancel(); return; }

    // Commit wire from source output → new node's first input port
    var committed = wire.tryCommit(newNodeId, def.inputs[0].port);
    if (!committed) {
      // Wire rejected (cycle, type mismatch) — node was created, drag was cancelled
      // Leave the orphan node on canvas; tryCommit already called cancelDrag internally.
    }

    close();
    canvas.render();
  }

  function confirmActive() {
    if (_flatList.length === 0) return;
    var idx = Math.max(0, Math.min(_activeIndex, _flatList.length - 1));
    confirm(_flatList[idx]);
  }

  function cancel() {
    wire.cancelDrag();
    close();
    canvas.render();
  }

  // ─── Outside-click handler ─────────────────────────────────────

  function onOutsideMouseDown(e) {
    if (!_isOpen) return;
    if (_el && _el.contains(e.target)) return;
    cancel();
  }

  // ─── Keyboard handler ─────────────────────────────────────────

  function onKeyDown(e) {
    if (!_isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      cancel();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(_activeIndex + 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(_activeIndex - 1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmActive();
      return;
    }
  }

  // ─── Public: open / close / isOpen ────────────────────────────

  function open(config) {
    _config      = config;
    _isOpen      = true;
    _activeIndex = 0;

    // dropX/dropY are screen (clientX/clientY) — convert to canvas-column-relative
    var _canvasCol = document.getElementById('canvas-column');
    var _colRect   = _canvasCol ? _canvasCol.getBoundingClientRect() : { left: 0, top: 0 };
    _el.style.left = (config.dropX - _colRect.left) + 'px';
    _el.style.top  = (config.dropY - _colRect.top)  + 'px';

    // Reset search and render full list
    _search.value = '';
    renderList('');

    _el.classList.remove('hidden');
    _search.focus();
  }

  function close() {
    _isOpen      = false;
    _config      = null;
    _flatList    = [];
    _activeIndex = 0;
    _search.value       = '';
    _list.innerHTML     = '';
    _el.classList.add('hidden');
  }

  function isOpen() {
    return _isOpen;
  }

  // ─── Init ─────────────────────────────────────────────────────

  function init() {
    _el     = document.getElementById('node-picker');
    _search = document.getElementById('node-picker-search');
    _list   = document.getElementById('node-picker-list');

    if (!_el || !_search || !_list) {
      console.warn('[nodePicker] DOM elements not found — init skipped');
      return;
    }

    // Search input filtering
    _search.addEventListener('input', function() {
      renderList(_search.value);
    });

    // Keyboard navigation (capture phase so Escape beats other handlers)
    document.addEventListener('keydown', onKeyDown, true);

    // Outside-click cancels
    document.addEventListener('mousedown', onOutsideMouseDown, true);

    // Wire-release event from wire.js
    document.addEventListener('wireReleasedOnCanvas', function(e) {
      open(e.detail);
    });
  }

  // ─── Public API ───────────────────────────────────────────────

  return {
    init:   init,
    open:   open,
    close:  close,
    isOpen: isOpen
  };

}());
