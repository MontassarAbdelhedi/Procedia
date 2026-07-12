/**
 * @fileoverview Search widget at the top-left of the canvas.
 * Lets the user search nodes by label, highlights matches, and focus on a result.
 * @dependencies graphState, renderer, viewport
 * @exports graphSearch { init }
 */
// ui/graphSearch.js
// DEPENDS ON: graph/graphState.js, graph/canvas/renderer/index.js, graph/canvas/viewport.js
// MUST LOAD AFTER: ui/compList.js

var graphSearch = (function() {

  var _widget = null;
  var _btn = null;
  var _field = null;
  var _input = null;
  var _resultsLabel = null;
  var _focusBtn = null;

  window.__graphSearchMatches = {};

  function init() {
    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;

    _widget = document.createElement('div');
    _widget.id = 'graph-search';

    _widget.innerHTML =
      '<button class="graph-search-btn" title="Search nodes">' +
        '<i class="ti ti-search"></i>' +
      '</button>' +
      '<div class="graph-search-field" style="display:none">' +
        '<input type="text" class="graph-search-input" placeholder="Search nodes\u2026" />' +
        '<span class="graph-search-results"></span>' +
        '<button class="graph-search-focus" title="Focus on first result" style="display:none">' +
          '<i class="ti ti-focus-2"></i>' +
        '</button>' +
      '</div>';

    canvasWrap.appendChild(_widget);

    _btn = _widget.querySelector('.graph-search-btn');
    _field = _widget.querySelector('.graph-search-field');
    _input = _widget.querySelector('.graph-search-input');
    _resultsLabel = _widget.querySelector('.graph-search-results');
    _focusBtn = _widget.querySelector('.graph-search-focus');

    _btn.addEventListener('click', function(e) {
      e.stopPropagation();
      _open();
    });

    _input.addEventListener('input', function() {
      _performSearch(_input.value);
    });

    _focusBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      _focusFirst();
    });

    _input.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        _close();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        _focusFirst();
      }
    });

    _input.addEventListener('blur', function() {
      if (_input.value === '') {
        _close();
      }
    });

    document.addEventListener('click', function(e) {
      if (_widget && !_widget.contains(e.target) && _field.style.display !== 'none') {
        _close();
      }
    });
  }

  function _open() {
    _btn.style.display = 'none';
    _field.style.display = 'flex';
    _input.focus();
  }

  function _close() {
    _clearSearch();
    _input.value = '';
    _btn.style.display = '';
    _field.style.display = 'none';
  }

  function _performSearch(query) {
    var q = query.toLowerCase().trim();
    var matches = {};
    var matchedIds = [];

    if (q !== '') {
      var nodes = graphState.getAllNodes();
      for (var id in nodes) {
        if (!nodes.hasOwnProperty(id)) continue;
        var node = nodes[id];
        var label = (node.props && node.props.label) || '';
        if (label.toLowerCase().indexOf(q) !== -1) {
          matches[id] = true;
          matchedIds.push(id);
        }
      }
    }

    window.__graphSearchMatches = matches;

    if (q === '') {
      _resultsLabel.textContent = '';
      _focusBtn.style.display = 'none';
    } else if (matchedIds.length > 0) {
      _resultsLabel.textContent = matchedIds.length + ' found';
      _focusBtn.style.display = '';
    } else {
      _resultsLabel.textContent = '0 found';
      _focusBtn.style.display = 'none';
    }

    if (typeof renderer !== 'undefined' && renderer.render) {
      renderer.render();
    }
  }

  function _clearSearch() {
    window.__graphSearchMatches = {};
    _resultsLabel.textContent = '';
    _focusBtn.style.display = 'none';
    if (typeof renderer !== 'undefined' && renderer.render) {
      renderer.render();
    }
  }

  function _focusFirst() {
    var matches = window.__graphSearchMatches;
    var firstId = null;
    for (var id in matches) {
      if (matches.hasOwnProperty(id)) {
        firstId = id;
        break;
      }
    }
    if (!firstId) return;

    var node = graphState.getNode(firstId);
    if (!node) return;

    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;

    var wrapRect = canvasWrap.getBoundingClientRect();
    var vp = viewport.getTransform();
    var centerX = wrapRect.width / 2;
    var centerY = wrapRect.height / 2;

    var newPanX = centerX - node.x * vp.zoom;
    var newPanY = centerY - node.y * vp.zoom;

    viewport.setPan(newPanX, newPanY);
    graphState.setSelection(firstId);
  }

  return {
    init: init
  };

})();
