/**
 * @fileoverview Canvas comment manager — sticky notes on the graph canvas.
 * Handles state, DOM rendering, and interaction for comments (create, edit,
 * delete, color, collapse, drag). Comments are positioned in canvas space, live
 * inside #canvas-nodes alongside node cards, and have no AE presence.
 * @dependencies data/uuidGenerator.js, graph/canvas/viewport.js,
 *               graph/canvas/input/state.js, graph/canvas/input/utils.js
 * @exports commentManager { init, create, remove, render, getAll, select,
 *                           deselect, getSelected, findByElement }
 */

// graph/comment/commentManager.js
// DEPENDS ON: data/uuidGenerator.js, graph/canvas/viewport.js,
//             graph/canvas/input/state.js, graph/canvas/input/utils.js
// MUST LOAD AFTER: graph/canvas/input/utils.js
// MUST LOAD BEFORE: graph/canvas/input/handlers/mouse/mousedown.js

var commentManager = (function() {
  var _comments = {};
  var _elements = {};
  var _selectedId = null;
  var _editingId = null;
  var _dragState = { active: false };
  var _colorPickerEl = null;
  var _colorPickerCommentId = null;

  var COLORS = [
    { name: 'yellow', hex: '#FFD700' },
    { name: 'lime',   hex: '#4CAF50' },
    { name: 'red',    hex: '#F44336' },
    { name: 'blue',   hex: '#2196F3' },
    { name: 'orange', hex: '#FF9800' },
    { name: 'violet', hex: '#9C27B0' },
    { name: 'teal',   hex: '#06D6A0' },
    { name: 'white',  hex: '#E8E8E8' }
  ];

  function _getViewport() {
    return document.getElementById('canvas-nodes');
  }

  function _findCommentElement(target) {
    var el = target;
    var boundary = _getViewport();
    while (el && el !== boundary && el !== document.body) {
      if (el.classList && el.classList.contains('comment')) return el;
      el = el.parentElement;
    }
    return null;
  }

  function _render() {
    var vp = _getViewport();
    if (!vp) return;

    for (var id in _elements) {
      if (_elements.hasOwnProperty(id) && !_comments[id]) {
        var stale = _elements[id];
        if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
        delete _elements[id];
      }
    }

    for (var cid in _comments) {
      if (!_comments.hasOwnProperty(cid)) continue;
      var cmt = _comments[cid];
      if (_elements[cid]) {
        _updateElement(_elements[cid], cmt);
      } else {
        var el = _buildElement(cid, cmt);
        vp.appendChild(el);
        _elements[cid] = el;
      }
    }
  }

  function _onHeaderMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest('[data-action]')) return;
    if (e.target.tagName === 'TEXTAREA') return;
    var commentEl = _findCommentElement(e.target);
    if (!commentEl) return;
    var id = commentEl.getAttribute('data-comment-id');
    if (!id || !_comments[id]) return;

    _select(id);
    _dragState = {
      active: true,
      commentId: id,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      startCommentX: _comments[id].x,
      startCommentY: _comments[id].y,
      moved: false
    };

    commentEl.classList.add('comment--dragging');
    e.stopPropagation();
    e.preventDefault();
  }

  function _onDragMove(e) {
    if (!_dragState.active) return;

    var dx = e.clientX - _dragState.startScreenX;
    var dy = e.clientY - _dragState.startScreenY;

    if (!_dragState.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      _dragState.moved = true;
    }

    if (_dragState.moved) {
      var cmt = _comments[_dragState.commentId];
      if (!cmt) return;
      var zoom = viewport.getTransform().zoom;
      cmt.x = _dragState.startCommentX + dx / zoom;
      cmt.y = _dragState.startCommentY + dy / zoom;
      _updateElementPosition(_elements[_dragState.commentId], cmt);
    }
  }

  function _onDragEnd(e) {
    if (!_dragState.active) return;
    var el = _elements[_dragState.commentId];
    if (el) el.classList.remove('comment--dragging');
    _dragState = { active: false };
  }

  function _buildElement(id, cmt) {
    var el = document.createElement('div');
    el.className = 'comment' + (cmt.collapsed ? ' comment--collapsed' : '') + (id === _selectedId ? ' comment--selected' : '');
    el.setAttribute('data-comment-id', id);
    el.style.left = (cmt.x || 0) + 'px';
    el.style.top = (cmt.y || 0) + 'px';
    el.setAttribute('data-color', cmt.color || '#FFD700');
    el.style.borderColor = cmt.color || '#FFD700';

    var header = document.createElement('div');
    header.className = 'comment-header';
    header.addEventListener('mousedown', _onHeaderMouseDown);

    var colorBar = document.createElement('div');
    colorBar.className = 'comment-color-bar';
    colorBar.style.background = cmt.color || '#FFD700';
    header.appendChild(colorBar);

    var title = document.createElement('span');
    title.className = 'comment-title';
    title.textContent = 'Comment';
    header.appendChild(title);

    var actions = document.createElement('div');
    actions.className = 'comment-actions';

    var collapseBtn = document.createElement('button');
    collapseBtn.className = 'comment-btn comment-btn--collapse';
    collapseBtn.setAttribute('data-action', 'collapse');
    collapseBtn.title = cmt.collapsed ? 'Expand' : 'Collapse';
    collapseBtn.innerHTML = '<i class="ti ti-chevron-up"></i>';
    actions.appendChild(collapseBtn);

    var colorBtn = document.createElement('button');
    colorBtn.className = 'comment-btn';
    colorBtn.setAttribute('data-action', 'color');
    colorBtn.title = 'Color';
    colorBtn.innerHTML = '<i class="ti ti-palette"></i>';
    actions.appendChild(colorBtn);

    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'comment-btn comment-btn--delete';
    deleteBtn.setAttribute('data-action', 'delete');
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '<i class="ti ti-trash"></i>';
    actions.appendChild(deleteBtn);

    header.appendChild(actions);
    el.appendChild(header);

    var body = document.createElement('div');
    body.className = 'comment-body' + (cmt.collapsed ? ' comment-body--hidden' : '');

    var textarea = document.createElement('textarea');
    textarea.className = 'comment-textarea';
    textarea.placeholder = 'Write a comment\u2026';
    textarea.value = cmt.text || '';
    textarea.addEventListener('input', _onTextInput);
    textarea.addEventListener('focus', _onTextFocus);
    textarea.addEventListener('blur', _onTextBlur);
    body.appendChild(textarea);

    el.appendChild(body);

    el.addEventListener('click', _onCommentClick);
    el.addEventListener('mouseenter', function() { el.classList.add('comment--hover'); });
    el.addEventListener('mouseleave', function() { el.classList.remove('comment--hover'); });

    return el;
  }

  function _updateElementPosition(el, cmt) {
    el.style.left = (cmt.x || 0) + 'px';
    el.style.top = (cmt.y || 0) + 'px';
  }

  function _updateElement(el, cmt) {
    _updateElementPosition(el, cmt);
    el.className = 'comment' + (cmt.collapsed ? ' comment--collapsed' : '') + (el.getAttribute('data-comment-id') === _selectedId ? ' comment--selected' : '');
    el.style.borderColor = cmt.color || '#FFD700';
    el.setAttribute('data-color', cmt.color || '#FFD700');

    var colorBar = el.querySelector('.comment-color-bar');
    if (colorBar) colorBar.style.background = cmt.color || '#FFD700';

    var body = el.querySelector('.comment-body');
    if (body) {
      if (cmt.collapsed) {
        body.classList.add('comment-body--hidden');
      } else {
        body.classList.remove('comment-body--hidden');
      }
    }

    var collapseBtn = el.querySelector('[data-action="collapse"]');
    if (collapseBtn) {
      collapseBtn.title = cmt.collapsed ? 'Expand' : 'Collapse';
    }

    var textarea = el.querySelector('.comment-textarea');
    if (textarea && textarea !== document.activeElement) {
      textarea.value = cmt.text || '';
    }
  }

  function _onTextInput(e) {
    var ta = e.target;
    var commentEl = _findCommentElement(ta);
    if (!commentEl) return;
    var id = commentEl.getAttribute('data-comment-id');
    if (id && _comments[id]) {
      _comments[id].text = ta.value;
      _comments[id].updatedAt = Date.now();
    }
  }

  function _onTextFocus(e) {
    var commentEl = _findCommentElement(e.target);
    if (!commentEl) return;
    _editingId = commentEl.getAttribute('data-comment-id');
  }

  function _onTextBlur(e) {
    _editingId = null;
  }

  function _onCommentClick(e) {
    if (_dragState.moved) return;

    var target = e.target;
    var btn = target.closest('[data-action]');
    if (btn) {
      var action = btn.getAttribute('data-action');
      var commentEl = _findCommentElement(btn);
      if (!commentEl) return;
      var id = commentEl.getAttribute('data-comment-id');
      if (!id) return;
      switch (action) {
        case 'delete':
          e.stopPropagation();
          _remove(id);
          break;
        case 'collapse':
          e.stopPropagation();
          _toggleCollapse(id);
          break;
        case 'color':
          e.stopPropagation();
          _toggleColorPicker(id, btn);
          break;
      }
      return;
    }

    if (target.tagName === 'TEXTAREA') {
      return;
    }

    var commentEl = _findCommentElement(target);
    if (commentEl) {
      e.stopPropagation();
      _select(commentEl.getAttribute('data-comment-id'));
    }
  }

  function _remove(id) {
    if (!_comments[id]) return;
    delete _comments[id];
    if (_selectedId === id) _selectedId = null;
    if (_editingId === id) _editingId = null;
    _render();
  }

  function _toggleCollapse(id) {
    if (!_comments[id]) return;
    _comments[id].collapsed = !_comments[id].collapsed;
    _render();
  }

  function _setColor(id, color) {
    if (!_comments[id]) return;
    _comments[id].color = color;
    _render();
  }

  function _select(id) {
    if (_selectedId !== null && _elements[_selectedId]) {
      _elements[_selectedId].classList.remove('comment--selected');
    }
    _selectedId = id;
    if (id && _elements[id]) {
      _elements[id].classList.add('comment--selected');
    }
  }

  function _deselect() {
    if (_selectedId !== null && _elements[_selectedId]) {
      _elements[_selectedId].classList.remove('comment--selected');
    }
    _selectedId = null;
  }

  function _ensureColorPicker() {
    if (_colorPickerEl) return;
    _colorPickerEl = document.createElement('div');
    _colorPickerEl.className = 'comment-color-picker';
    _colorPickerEl.style.display = 'none';
    for (var i = 0; i < COLORS.length; i++) {
      var swatch = document.createElement('button');
      swatch.className = 'comment-color-swatch';
      swatch.style.background = COLORS[i].hex;
      swatch.setAttribute('data-color', COLORS[i].hex);
      swatch.title = COLORS[i].name;
      swatch.addEventListener('click', _onColorSwatchClick);
      _colorPickerEl.appendChild(swatch);
    }
  }

  function _onColorSwatchClick(e) {
    var swatch = e.currentTarget;
    var color = swatch.getAttribute('data-color');
    if (!_colorPickerCommentId) return;
    _setColor(_colorPickerCommentId, color);
    _hideColorPicker();
  }

  function _toggleColorPicker(id, btn) {
    _ensureColorPicker();
    if (_colorPickerCommentId === id && _colorPickerEl.parentNode) {
      _hideColorPicker();
      return;
    }
    _detachColorPicker();
    var commentEl = _elements[id];
    if (!commentEl) return;
    commentEl.appendChild(_colorPickerEl);
    _colorPickerEl.style.display = 'flex';
    _colorPickerCommentId = id;
  }

  function _hideColorPicker() {
    _detachColorPicker();
    _colorPickerCommentId = null;
  }

  function _detachColorPicker() {
    if (_colorPickerEl && _colorPickerEl.parentNode) {
      _colorPickerEl.parentNode.removeChild(_colorPickerEl);
    }
    if (_colorPickerEl) _colorPickerEl.style.display = 'none';
  }

  function _onDocMouseDown(e) {
    if (!_colorPickerCommentId || !_colorPickerEl || !_colorPickerEl.parentNode) return;
    if (_colorPickerEl.contains(e.target)) return;
    var commentEl = _findCommentElement(_colorPickerEl);
    if (!commentEl) { _hideColorPicker(); return; }
    var colorBtn = commentEl.querySelector('[data-action="color"]');
    if (colorBtn && colorBtn.contains(e.target)) return;
    _hideColorPicker();
  }

  function create(x, y, text) {
    var id = uuidGenerator.comment();
    _comments[id] = {
      id: id,
      x: x,
      y: y,
      text: text || '',
      color: '#FFD700',
      collapsed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    _render();

    var el = _elements[id];
    if (el) {
      var ta = el.querySelector('.comment-textarea');
      if (ta) {
        ta.focus();
      }
    }

    return id;
  }

  function removeAll() {
    for (var id in _elements) {
      if (_elements.hasOwnProperty(id)) {
        var el = _elements[id];
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
    }
    _comments = {};
    _elements = {};
    _selectedId = null;
    _editingId = null;
    _dragState = { active: false };
    _hideColorPicker();
    _colorPickerCommentId = null;
  }

  function getAll() {
    var result = {};
    for (var id in _comments) {
      if (_comments.hasOwnProperty(id)) {
        result[id] = _comments[id];
      }
    }
    return result;
  }

  function getSelected() {
    return _selectedId;
  }

  function getEditing() {
    return _editingId;
  }

  function select(id) {
    if (id && _comments[id]) {
      _select(id);
    }
  }

  function deselect() {
    _deselect();
  }

  function findByElement(target) {
    return _findCommentElement(target);
  }

  function load(comments) {
    if (!comments) return;
    for (var id in comments) {
      if (comments.hasOwnProperty(id)) {
        _comments[id] = comments[id];
      }
    }
    _render();
  }

  function init() {
    _render();
    document.addEventListener('mousemove', _onDragMove);
    document.addEventListener('mouseup', _onDragEnd);
    document.addEventListener('mousedown', _onDocMouseDown);
  }

  return {
    init: init,
    create: create,
    remove: _remove,
    removeAll: removeAll,
    render: _render,
    getAll: getAll,
    getSelected: getSelected,
    getEditing: getEditing,
    select: select,
    deselect: deselect,
    findByElement: findByElement,
    load: load,
    setColor: _setColor,
    toggleCollapse: _toggleCollapse
  };
})();
