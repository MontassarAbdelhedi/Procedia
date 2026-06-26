/**
 * @fileoverview First-run walkthrough / tutorial overlay. Displays a step-by-step
 * guide on first panel launch with element highlighting and navigation controls.
 * Depends on: css/walkthrough.css
 * Exports: walkthrough.init
 */
// ui/walkthrough.js
// DEPENDS ON: css/walkthrough.css
// MUST LOAD BEFORE: index.js

var walkthrough = (function() {

  var _overlay = null;
  var _spotlight = null;
  var _card = null;
  var _currentStep = 0;
  var _animating = false;
  var _eventsBound = false;

  var _steps = [
    {
      title: 'Welcome to Procedia',
      description: 'Procedia is a node-based procedural motion design plugin for After Effects. This quick tour will show you the essentials to get started.',
      target: null,
      cardPos: 'center'
    },
    {
      title: 'Node Palette',
      description: 'The left sidebar contains the node palette. Browse categories or search for nodes, then drag them onto the canvas to start building your graph.',
      target: '#left-bar',
      cardPos: 'right'
    },
    {
      title: 'The Canvas',
      description: 'The canvas is your workspace. Drag nodes to reposition them, scroll to zoom in and out, and hold Space + drag to pan around. The minimap in the bottom-right corner helps you navigate large graphs.',
      target: '#canvas-wrap',
      cardPos: 'center'
    },
    {
      title: 'Connecting Nodes',
      description: 'Connect nodes by dragging from an output port (right side of a node) to an input port (left side). Wires carry data through the chain from left to right. Changes propagate automatically.',
      target: '#canvas-wrap',
      cardPos: 'center'
    },
    {
      title: 'Inspector Panel',
      description: 'Select a node on the canvas to view and edit its properties in the right sidebar. Each node\'s parameters appear here — adjust values and see results update in real time.',
      target: '#right-bar',
      cardPos: 'left'
    },
    {
      title: 'You\'re Ready!',
      description: 'That covers the basics! Drag a node from the palette onto the canvas to begin. You can replay this tour anytime from the Settings menu.',
      target: null,
      cardPos: 'center'
    }
  ];

  /**
   * Builds the walkthrough DOM and appends it to the body.
   */
  function _buildDOM() {
    _overlay = document.createElement('div');
    _overlay.className = 'walkthrough-overlay';
    _overlay.style.display = 'none';

    _spotlight = document.createElement('div');
    _spotlight.className = 'walkthrough-spotlight';
    _spotlight.style.display = 'none';

    _card = document.createElement('div');
    _card.className = 'walkthrough-card';

    _overlay.appendChild(_spotlight);
    _overlay.appendChild(_card);
    document.body.appendChild(_overlay);
  }

  /**
   * Positions the spotlight over the given element.
   * @param {string|null} selector - CSS selector for the target element, or null
   */
  function _positionSpotlight(selector) {
    if (!selector) {
      _spotlight.style.display = 'none';
      return;
    }
    var target = document.querySelector(selector);
    if (!target) {
      _spotlight.style.display = 'none';
      return;
    }
    var rect = target.getBoundingClientRect();
    _spotlight.style.display = '';
    _spotlight.style.left = rect.left + 'px';
    _spotlight.style.top = rect.top + 'px';
    _spotlight.style.width = rect.width + 'px';
    _spotlight.style.height = rect.height + 'px';
  }

  /**
   * Positions the instruction card relative to the target.
   * @param {string} pos - 'center' | 'right' | 'left'
   * @param {string|null} selector - CSS selector for positioning reference
   */
  function _positionCard(pos, selector) {
    var cardW = 340;
    var gap = 16;

    if (pos === 'center' || !selector) {
      _card.style.position = 'fixed';
      _card.style.top = '50%';
      _card.style.left = '50%';
      _card.style.transform = 'translate(-50%, -50%)';
      _card.style.opacity = '1';
      return;
    }

    var target = document.querySelector(selector);
    if (!target) {
      _card.style.position = 'fixed';
      _card.style.top = '50%';
      _card.style.left = '50%';
      _card.style.transform = 'translate(-50%, -50%)';
      _card.style.opacity = '1';
      return;
    }

    var rect = target.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    if (pos === 'right') {
      var left = Math.min(rect.right + gap, vw - cardW - gap);
      left = Math.max(gap, left);
      var top = Math.max(gap, Math.min(rect.top, vh - 300));
      _card.style.position = 'fixed';
      _card.style.transform = 'none';
      _card.style.left = left + 'px';
      _card.style.top = top + 'px';
    } else if (pos === 'left') {
      var left2 = Math.max(gap, rect.left - cardW - gap);
      var top2 = Math.max(gap, Math.min(rect.top, vh - 300));
      _card.style.position = 'fixed';
      _card.style.transform = 'none';
      _card.style.left = left2 + 'px';
      _card.style.top = top2 + 'px';
    }

    _card.style.opacity = '1';
  }

  /**
   * Renders the current step into the card and positions spotlight/card.
   */
  function _renderStep() {
    var step = _steps[_currentStep];
    var total = _steps.length;

    // Build dots HTML
    var dotsHtml = '';
    for (var i = 0; i < total; i++) {
      var cls = 'walkthrough-dot';
      if (i === _currentStep) cls += ' active';
      else if (i < _currentStep) cls += ' done';
      dotsHtml += '<span class="' + cls + '"></span>';
    }

    // Build button
    var isLast = _currentStep === total - 1;
    var btnHtml = isLast
      ? '<button class="walkthrough-btn-next" id="walkthrough-btn-next">Finish</button>'
      : '<button class="walkthrough-btn-next" id="walkthrough-btn-next">Next <i class="ti ti-chevron-right" style="font-size:12px"></i></button>';

    _card.innerHTML =
      '<div class="walkthrough-body">' +
        '<div class="walkthrough-title">' + _escapeHtml(step.title) + '</div>' +
        '<div class="walkthrough-desc">' + _escapeHtml(step.description) + '</div>' +
      '</div>' +
      '<div class="walkthrough-footer">' +
        '<button class="walkthrough-btn-dismiss" id="walkthrough-btn-dismiss">Dismiss</button>' +
        '<div class="walkthrough-footer-center">' +
          '<span class="walkthrough-step-indicator">' + (_currentStep + 1) + ' of ' + total + '</span>' +
          '<div class="walkthrough-dots">' + dotsHtml + '</div>' +
        '</div>' +
        btnHtml +
      '</div>';

    _positionSpotlight(step.target);
    _positionCard(step.cardPos, step.target);
  }

  /**
   * Advances to the next step or completes the walkthrough.
   */
  function _nextStep() {
    if (_animating) return;
    if (_currentStep >= _steps.length - 1) {
      _complete();
      return;
    }
    _animating = true;
    _currentStep++;
    _renderStep();
    _animating = false;
  }

  /**
   * Dismisses the walkthrough and persists the flag so it never shows again.
   */
  function _dismiss() {
    _complete();
  }

  /**
   * Completes the walkthrough: persists flag and removes the overlay.
   */
  function _complete() {
    try {
      localStorage.setItem('procedia_walkthrough_done', '1');
    } catch (e) {}
    if (_overlay) {
      _overlay.style.display = 'none';
    }
  }

  /**
   * Wires button events via delegation on the card.
   */
  function _bindEvents() {
    if (_eventsBound) return;
    _eventsBound = true;
    _card.addEventListener('click', function(e) {
      var target = e.target;
      if (target.id === 'walkthrough-btn-next') {
        _nextStep();
      } else if (target.id === 'walkthrough-btn-dismiss') {
        _dismiss();
      }
    });
  }

  function _escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  /**
   * Initializes and shows the walkthrough if it hasn't been dismissed before.
   * Call this after all UI subsystems are initialized and the graph is loaded.
   */
  function init() {
    try {
      if (localStorage.getItem('procedia_walkthrough_done')) return;
    } catch (e) {
      return;
    }
    if (_overlay) return;
    _buildDOM();
    _currentStep = 0;
    _renderStep();
    _bindEvents();
    _overlay.style.display = '';
  }

  /**
   * Re-shows the walkthrough (used from Settings).
   */
  function show() {
    try {
      localStorage.removeItem('procedia_walkthrough_done');
    } catch (e) {}
    if (!_overlay) {
      _buildDOM();
    }
    _currentStep = 0;
    _renderStep();
    _bindEvents();
    _overlay.style.display = '';
  }

  return {
    init: init,
    show: show
  };

})();
