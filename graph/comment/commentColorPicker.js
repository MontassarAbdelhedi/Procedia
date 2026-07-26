/**
 * @fileoverview Color picker UI for canvas comments.
 * Creates and manages the inline color swatch picker attached to comment elements.
 * @module comment/colorPicker
 * @dependencies comment/state
 * @internal
 */
// graph/comment/commentColorPicker.js
// DEPENDS ON: graph/comment/commentState.js
// MUST LOAD AFTER: graph/comment/commentState.js, graph/comment/commentDOM.js
// MUST LOAD BEFORE: graph/comment/commentEvents.js, graph/comment/commentManager.js

(function(cm) {

  cm._ensureColorPicker = function _ensureColorPicker() {
    if (cm._colorPickerEl) return;
    cm._colorPickerEl = document.createElement('div');
    cm._colorPickerEl.className = 'comment-color-picker';
    cm._colorPickerEl.style.display = 'none';
    for (var i = 0; i < cm.COLORS.length; i++) {
      var swatch = document.createElement('button');
      swatch.className = 'comment-color-swatch';
      swatch.style.background = cm.COLORS[i].hex;
      swatch.setAttribute('data-color', cm.COLORS[i].hex);
      swatch.title = cm.COLORS[i].name;
      swatch.addEventListener('click', cm._onColorSwatchClick);
      cm._colorPickerEl.appendChild(swatch);
    }
  };

  cm._onColorSwatchClick = function _onColorSwatchClick(e) {
    var swatch = e.currentTarget;
    var color = swatch.getAttribute('data-color');
    if (!cm._colorPickerCommentId) return;
    cm._setColor(cm._colorPickerCommentId, color);
    cm._hideColorPicker();
  };

  cm._toggleColorPicker = function _toggleColorPicker(id, btn) {
    cm._ensureColorPicker();
    if (cm._colorPickerCommentId === id && cm._colorPickerEl.parentNode) {
      cm._hideColorPicker();
      return;
    }
    cm._detachColorPicker();
    var commentEl = cm._elements[id];
    if (!commentEl) return;
    commentEl.appendChild(cm._colorPickerEl);
    cm._colorPickerEl.style.display = 'flex';
    cm._colorPickerCommentId = id;
  };

  cm._hideColorPicker = function _hideColorPicker() {
    cm._detachColorPicker();
    cm._colorPickerCommentId = null;
  };

  cm._detachColorPicker = function _detachColorPicker() {
    if (cm._colorPickerEl && cm._colorPickerEl.parentNode) {
      cm._colorPickerEl.parentNode.removeChild(cm._colorPickerEl);
    }
    if (cm._colorPickerEl) cm._colorPickerEl.style.display = 'none';
  };

  cm._onDocMouseDown = function _onDocMouseDown(e) {
    if (!cm._colorPickerCommentId || !cm._colorPickerEl || !cm._colorPickerEl.parentNode) return;
    if (cm._colorPickerEl.contains(e.target)) return;
    var commentEl = cm._findCommentElement(cm._colorPickerEl);
    if (!commentEl) { cm._hideColorPicker(); return; }
    var colorBtn = commentEl.querySelector('[data-action="color"]');
    if (colorBtn && colorBtn.contains(e.target)) return;
    cm._hideColorPicker();
  };

})(window.__procedia_internal.cm);
