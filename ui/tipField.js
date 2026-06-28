/**
 * @fileoverview Floating tip field at the bottom of the canvas.
 * Shows usage tips between the comp list and minimap.
 * Click to cycle through tips. Add more entries to TIPS to extend.
 * @exports tipField.init
 */
// ui/tipField.js
// DEPENDS ON: nothing
// MUST LOAD BEFORE: index.js

var tipField = (function() {

  var TIPS = [
    'Tip: Drag nodes from the left panel onto the canvas',
    'Tip: Connect nodes by dragging from an output port to an input port',
    'Tip: Right-click a node for quick actions (duplicate, delete, etc.)',
    'Tip: Press Ctrl+D to duplicate the selected node(s)',
    'Tip: Scroll to zoom, drag the background to pan around the canvas',
    'Tip: Double-click a node title to rename it'
  ];

  var _el = null;
  var _index = 0;
  var _timer = null;

  function _position() {
    var wrap = document.getElementById('canvas-wrap');
    var compDropdown = document.getElementById('complist-dropdown');
    var minimapEl = document.querySelector('.minimap-container');
    if (!wrap || !compDropdown || !_el) return;

    var compRight = compDropdown.offsetLeft + compDropdown.offsetWidth;
    var gap = 8;
    var available;

    // If minimap is visible, position between comp list and minimap;
    // otherwise expand to the right edge of the canvas
    if (minimapEl && minimapEl.offsetParent !== null) {
      available = minimapEl.offsetLeft - compRight;
    } else {
      available = wrap.clientWidth - compRight;
    }

    var tipWidth = available - gap * 2;

    if (tipWidth < 30) {
      _el.style.display = 'none';
      return;
    }
    _el.style.display = '';
    _el.style.left = (compRight + gap) + 'px';
    _el.style.width = tipWidth + 'px';
    _el.style.right = 'auto';
  }

  function _showTip() {
    _el.textContent = TIPS[_index];
  }

  function _cycleTip() {
    _index = (_index + 1) % TIPS.length;
    _showTip();
  }

  function _startTimer() {
    if (_timer) clearInterval(_timer);
    _timer = setInterval(_cycleTip, 20000);
  }

  function init() {
    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;

    _el = document.createElement('div');
    _el.id = 'tip-field';
    _el.textContent = TIPS[_index];

    _el.addEventListener('click', function() {
      _cycleTip();
      _startTimer();
    });

    canvasWrap.appendChild(_el);

    _showTip();
    _position();
    _startTimer();
    window.addEventListener('resize', _position);
  }

  return {
    init: init,
    reposition: _position
  };

})();
