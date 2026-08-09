/**
 * @fileoverview Eyedropper (native color input) and hex copy handler.
 * Depends on: __ins_cpUtils (color math).
 * Exposes: __ins_cpEyedropper
 */
// ui/inspector/colorPicker/eyedropper.js
// DEPENDS ON: ui/inspector/colorPicker/utils.js, __ins_cpUtils

var __ins_cpEyedropper = (function() {

  var _getState;

  function _onEyedropper() {
    var st = _getState();
    var inp = document.createElement('input');
    inp.type = 'color';
    inp.value = __ins_cpUtils.toHex(st.color[0], st.color[1], st.color[2]);
    inp.addEventListener('input', function(e) {
      var v = e.target.value;
      st.setColor(parseInt(v.slice(1, 3), 16) / 255, parseInt(v.slice(3, 5), 16) / 255, parseInt(v.slice(5, 7), 16) / 255, st.color[3]);
    });
    inp.click();
  }

  function _copyHex() {
    var st = _getState();
    var hex = __ins_cpUtils.toHex(st.color[0], st.color[1], st.color[2]);
    try {
      var ta = document.createElement('textarea');
      ta.value = hex;
      ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    } catch(e) {}
  }

  function init(popEl, getStateFn) {
    _getState = getStateFn;

    var preview = popEl.querySelector('.cp-preview');
    if (preview) preview.addEventListener('click', _copyHex);

    var eyedropper = popEl.querySelector('.cp-eyedropper');
    if (eyedropper) eyedropper.addEventListener('click', _onEyedropper);
  }

  function destroy() { _getState = null; }

  return { init: init, destroy: destroy };
})();
