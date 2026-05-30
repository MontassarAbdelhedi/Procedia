var nodePicker = (function() {

  var _overlay = null;
  var _active = false;
  var _resolveCb = null;
  var _compatible = [];
  var _filtered = [];
  var _selIndex = -1;

  function _compatibleNodes(wireType) {
    var all = nodeRegistry.getAll();
    var results = [];
    for (var type in all) {
      var def = all[type];
      if (!def.ports) continue;
      for (var i = 0; i < def.ports.length; i++) {
        var p = def.ports[i];
        if ((p.category === 'mainInput' || p.category === 'secondaryInput') && p.type === wireType) {
          results.push(def);
          break;
        }
      }
    }
    return results;
  }

  function _renderList(nodes) {
    if (!nodes || nodes.length === 0) {
      return '<div class="nodepicker-item nodepicker-empty">No compatible nodes</div>';
    }
    var html = '';
    for (var i = 0; i < nodes.length; i++) {
      html +=
        '<div class="nodepicker-item' + (i === _selIndex ? ' selected' : '') + '" data-type="' + nodes[i].type + '">' +
          '<span class="nodepicker-item-label">' + (nodes[i].label || nodes[i].type) + '</span>' +
          '<span class="nodepicker-item-kind">' + (nodes[i].nodeKind || '') + '</span>' +
        '</div>';
    }
    return html;
  }

  function _applyFilter(query) {
    var q = query.toLowerCase();
    _filtered = [];
    for (var i = 0; i < _compatible.length; i++) {
      var def = _compatible[i];
      var label = (def.label || def.type).toLowerCase();
      if (q === '' || label.indexOf(q) !== -1) {
        _filtered.push(def);
      }
    }
    _selIndex = _filtered.length > 0 ? 0 : -1;
    _updateList();
  }

  function _updateList() {
    var list = _overlay && _overlay.querySelector('.nodepicker-list');
    if (!list) return;
    list.innerHTML = _renderList(_filtered);
    _scrollIntoView();
  }

  function _scrollIntoView() {
    var list = _overlay && _overlay.querySelector('.nodepicker-list');
    if (!list) return;
    var sel = list.querySelector('.nodepicker-item.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  function _selectedDef() {
    if (_selIndex < 0 || _selIndex >= _filtered.length) return null;
    return _filtered[_selIndex];
  }

  function _onOverlayClick(e) {
    if (e.target.classList.contains('nodepicker-overlay')) {
      close(null);
      return;
    }
    var item = e.target;
    while (item && !item.classList.contains('nodepicker-item')) {
      item = item.parentElement;
    }
    if (!item || item.classList.contains('nodepicker-empty')) return;
    var type = item.getAttribute('data-type');
    if (type) close(type);
  }

  function _onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(null);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (_filtered.length === 0) return;
      _selIndex = (_selIndex + 1) % _filtered.length;
      _updateList();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (_filtered.length === 0) return;
      _selIndex = (_selIndex - 1 + _filtered.length) % _filtered.length;
      _updateList();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      var def = _selectedDef();
      if (def) close(def.type);
      return;
    }
  }

  function show(screenX, screenY, fromNodeId, fromPortId, wireType) {
    if (_active) close(null);

    _compatible = _compatibleNodes(wireType);
    _filtered = _compatible.slice();
    _selIndex = _filtered.length > 0 ? 0 : -1;

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
          '<input class="nodepicker-search" type="text" placeholder="Filter nodes…" autofocus>' +
          '<button class="nodepicker-close ti ti-x"></button>' +
        '</div>' +
        '<div class="nodepicker-list">' +
          _renderList(_filtered) +
        '</div>' +
      '</div>';

    overlay.addEventListener('click', _onOverlayClick);
    overlay.addEventListener('keydown', _onKeyDown);

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
    _overlay = overlay;
    _active = true;

    return new Promise(function(resolve) {
      _resolveCb = function(type) {
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

  function close(type) {
    if (_overlay) {
      _overlay.remove();
      _overlay = null;
    }
    if (_resolveCb) {
      _resolveCb(type);
      _resolveCb = null;
    }
    _active = false;
    _compatible = [];
    _filtered = [];
    _selIndex = -1;
  }

  return {
    show:  show,
    close: close
  };

})();
