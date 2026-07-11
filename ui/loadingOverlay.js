/**
 * @fileoverview Loading overlay for blocking AE operations.
 * Shows a semi-transparent overlay with spinner + message when
 * the panel is waiting for After Effects to respond.
 * Self-contained — injects its own CSS and DOM.
 * @exports loadingOverlay.show, loadingOverlay.hide
 */
// ui/loadingOverlay.js
// DEPENDS ON: nothing
// MUST LOAD BEFORE: graph/engine/index.js (or any module that calls it)

var loadingOverlay = (function() {

  var _el = null;
  var _count = 0;

  var _CSS = '\
#procedia-loading-overlay {\
  position: fixed;\
  z-index: 99999;\
  top: 0; left: 0; right: 0; bottom: 0;\
  background: rgba(0,0,0,0.45);\
  display: flex;\
  align-items: center;\
  justify-content: center;\
  opacity: 0;\
  transition: opacity 0.15s ease;\
  pointer-events: none;\
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;\
}\
#procedia-loading-overlay.active {\
  opacity: 1;\
  pointer-events: all;\
}\
#procedia-loading-box {\
  background: #1e1e1e;\
  border: 1px solid #444;\
  border-radius: 8px;\
  padding: 28px 36px;\
  text-align: center;\
  color: #e0e0e0;\
  min-width: 220px;\
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);\
}\
#procedia-loading-spinner {\
  width: 28px;\
  height: 28px;\
  border: 3px solid #444;\
  border-top-color: #4fc3f7;\
  border-radius: 50%;\
  margin: 0 auto 14px auto;\
  animation: procedia-spin 0.7s linear infinite;\
}\
@keyframes procedia-spin {\
  to { transform: rotate(360deg); }\
}\
#procedia-loading-message {\
  font-size: 14px;\
  line-height: 1.4;\
  margin: 0;\
}\
';

  function _injectCSS() {
    var style = document.createElement('style');
    style.id = 'procedia-loading-style';
    style.textContent = _CSS;
    if (!document.getElementById('procedia-loading-style')) {
      document.head.appendChild(style);
    }
  }

  function _createOverlay() {
    _injectCSS();
    var overlay = document.createElement('div');
    overlay.id = 'procedia-loading-overlay';
    overlay.innerHTML = '<div id="procedia-loading-box"><div id="procedia-loading-spinner"></div><p id="procedia-loading-message"></p></div>';
    document.body.appendChild(overlay);
    _el = overlay;
  }

  function show(message) {
    _count++;
    if (!_el) _createOverlay();
    var msgEl = document.getElementById('procedia-loading-message');
    if (msgEl) msgEl.textContent = message || 'Working with After Effects...';
    _el.classList.add('active');
  }

  function hide() {
    if (_count > 0) _count--;
    if (_count <= 0 && _el) {
      _el.classList.remove('active');
    }
  }

  function forceHide() {
    _count = 0;
    if (_el) _el.classList.remove('active');
  }

  return {
    show:      show,
    hide:      hide,
    forceHide: forceHide
  };

})();
