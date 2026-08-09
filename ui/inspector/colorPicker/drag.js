/**
 * @fileoverview Drag handlers for the Inspector color picker HSV square and hue slider.
 * Depends on: __ins_cpUtils (optional, uses own _clamp for speed).
 * Exposes: __ins_cpDrag
 */
// ui/inspector/colorPicker/drag.js

var __ins_cpDrag = (function() {

  var _stateRef, _setHsvFn, _popEl;

  function _clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }

  function _onDragStart(type, e) {
    e.preventDefault();
    _stateRef.dragType = type;
    _onDrag(e);
  }

  function _onDrag(e) {
    if (!_stateRef || !_stateRef.dragType || !_popEl) return;
    var sv = _popEl.querySelector('.cp-sv-square');
    var hs = _popEl.querySelector('.cp-hue-slider');

    if (_stateRef.dragType === 'sv' && sv) {
      var r = sv.getBoundingClientRect();
      _setHsvFn(_stateRef.hsv[0], _clamp((e.clientX - r.left) / r.width, 0, 1), 1 - _clamp((e.clientY - r.top) / r.height, 0, 1));
    } else if (_stateRef.dragType === 'hue' && hs) {
      var r2 = hs.getBoundingClientRect();
      _setHsvFn(_clamp((e.clientX - r2.left) / r2.width, 0, 1), _stateRef.hsv[1], _stateRef.hsv[2]);
    }
  }

  function _onDragEnd() { if (_stateRef) _stateRef.dragType = null; }

  function _onDocMove(e) { _onDrag(e); }
  function _onDocUp() { _onDragEnd(); }

  function init(popEl, stateRef, setHsvFn) {
    _popEl = popEl;
    _stateRef = stateRef;
    _setHsvFn = setHsvFn;

    var sv = popEl.querySelector('.cp-sv-square');
    if (sv) sv.addEventListener('mousedown', function(e) { _onDragStart('sv', e); });

    var hs = popEl.querySelector('.cp-hue-slider');
    if (hs) hs.addEventListener('mousedown', function(e) { _onDragStart('hue', e); });

    document.addEventListener('mousemove', _onDocMove);
    document.addEventListener('mouseup', _onDocUp);
  }

  function destroy() {
    document.removeEventListener('mousemove', _onDocMove);
    document.removeEventListener('mouseup', _onDocUp);
    _popEl = null;
    _stateRef = null;
    _setHsvFn = null;
  }

  return { init: init, destroy: destroy };
})();
