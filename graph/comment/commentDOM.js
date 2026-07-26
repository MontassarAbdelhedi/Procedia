/**
 * @fileoverview DOM rendering and CRUD operations for canvas comments.
 * Builds, updates, and positions comment elements inside #canvas-nodes.
 * Also defines the state-mutating methods that trigger re-render.
 * @module comment/DOM
 * @dependencies comment/state
 * @internal
 */
// graph/comment/commentDOM.js
// DEPENDS ON: graph/comment/commentState.js
// MUST LOAD AFTER: graph/comment/commentState.js
// MUST LOAD BEFORE: graph/comment/commentColorPicker.js, graph/comment/commentEvents.js,
//                   graph/comment/commentManager.js

(function(cm) {

  cm._updateElementPosition = function _updateElementPosition(el, cmt) {
    el.style.left = (cmt.x || 0) + 'px';
    el.style.top = (cmt.y || 0) + 'px';
  };

  cm._buildElement = function _buildElement(id, cmt) {
    var el = document.createElement('div');
    el.className = 'comment' + (cmt.collapsed ? ' comment--collapsed' : '') + (id === cm._selectedId ? ' comment--selected' : '');
    el.setAttribute('data-comment-id', id);
    el.style.left = (cmt.x || 0) + 'px';
    el.style.top = (cmt.y || 0) + 'px';
    el.setAttribute('data-color', cmt.color || '#FFD700');
    el.style.borderColor = cmt.color || '#FFD700';

    var header = document.createElement('div');
    header.className = 'comment-header';
    header.addEventListener('mousedown', cm._onHeaderMouseDown);

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
    textarea.addEventListener('input', cm._onTextInput);
    textarea.addEventListener('focus', cm._onTextFocus);
    textarea.addEventListener('blur', cm._onTextBlur);
    body.appendChild(textarea);

    el.appendChild(body);

    el.addEventListener('click', cm._onCommentClick);
    el.addEventListener('mouseenter', function() { el.classList.add('comment--hover'); });
    el.addEventListener('mouseleave', function() { el.classList.remove('comment--hover'); });

    return el;
  };

  cm._updateElement = function _updateElement(el, cmt) {
    cm._updateElementPosition(el, cmt);
    el.className = 'comment' + (cmt.collapsed ? ' comment--collapsed' : '') + (el.getAttribute('data-comment-id') === cm._selectedId ? ' comment--selected' : '');
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
  };

  cm._render = function _render() {
    var vp = cm._getViewport();
    if (!vp) return;

    for (var id in cm._elements) {
      if (cm._elements.hasOwnProperty(id) && !cm._comments[id]) {
        var stale = cm._elements[id];
        if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
        delete cm._elements[id];
      }
    }

    for (var cid in cm._comments) {
      if (!cm._comments.hasOwnProperty(cid)) continue;
      var cmt = cm._comments[cid];
      if (cm._elements[cid]) {
        cm._updateElement(cm._elements[cid], cmt);
      } else {
        var el = cm._buildElement(cid, cmt);
        vp.appendChild(el);
        cm._elements[cid] = el;
      }
    }
  };

  cm._remove = function _remove(id) {
    if (!cm._comments[id]) return;
    delete cm._comments[id];
    if (cm._selectedId === id) cm._selectedId = null;
    if (cm._editingId === id) cm._editingId = null;
    cm._render();
  };

  cm._toggleCollapse = function _toggleCollapse(id) {
    if (!cm._comments[id]) return;
    cm._comments[id].collapsed = !cm._comments[id].collapsed;
    cm._render();
  };

  cm._setColor = function _setColor(id, color) {
    if (!cm._comments[id]) return;
    cm._comments[id].color = color;
    cm._render();
  };

  cm.create = function create(x, y, text) {
    var id = uuidGenerator.comment();
    cm._comments[id] = {
      id: id,
      x: x,
      y: y,
      text: text || '',
      color: '#FFD700',
      collapsed: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    cm._render();

    var el = cm._elements[id];
    if (el) {
      var ta = el.querySelector('.comment-textarea');
      if (ta) {
        ta.focus();
      }
    }

    return id;
  };

  cm.removeAll = function removeAll() {
    for (var id in cm._elements) {
      if (cm._elements.hasOwnProperty(id)) {
        var el = cm._elements[id];
        if (el && el.parentNode) el.parentNode.removeChild(el);
      }
    }
    cm._comments = {};
    cm._elements = {};
    cm._selectedId = null;
    cm._editingId = null;
    cm._dragState = { active: false };
    cm._hideColorPicker();
    cm._colorPickerCommentId = null;
  };

  cm.load = function load(comments) {
    if (!comments) return;
    for (var id in comments) {
      if (comments.hasOwnProperty(id)) {
        cm._comments[id] = comments[id];
      }
    }
    cm._render();
  };

})(window.__procedia_internal.cm);
