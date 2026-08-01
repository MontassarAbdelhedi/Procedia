/**
 * @fileoverview Walkthrough main module. Initializes and shows a step-by-step
 * tutorial overlay on first panel launch with element highlighting and
 * navigation controls. Coordinates __wt_state, DOM, render, nav, and events.
 * Depends on: css/walkthrough.css, __wt_steps, __wt_dom, __wt_render,
 *             __wt_nav, __wt_events
 * Exports: walkthrough.init, walkthrough.show
 */
// ui/walkthrough/index.js
// DEPENDS ON: css/walkthrough.css,
//             ui/walkthrough/steps.js, ui/walkthrough/dom.js,
//             ui/walkthrough/render.js, ui/walkthrough/nav.js,
//             ui/walkthrough/events.js
// MUST LOAD BEFORE: index.js

var __wt_state = {};

var walkthrough = (function() {

  function init() {
    try {
      if (localStorage.getItem('procedia_walkthrough_done')) return;
    } catch (e) { return; }
    if (__wt_state.overlay) return;

    var els = __wt_dom.buildDOM();
    __wt_state.overlay = els.overlay;
    __wt_state.spotlight = els.spotlight;
    __wt_state.card = els.card;

    __wt_state.currentStep = 0;
    __wt_state.eventsBound = false;

    __wt_render.render();
    __wt_events.bind();
    __wt_state.overlay.style.display = '';
  }

  function show() {
    try {
      localStorage.removeItem('procedia_walkthrough_done');
    } catch (e) {}

    if (__wt_state.overlay && __wt_state.overlay.parentNode) {
      __wt_state.overlay.parentNode.removeChild(__wt_state.overlay);
    }
    __wt_state.overlay = null;
    __wt_state.spotlight = null;
    __wt_state.card = null;

    var els = __wt_dom.buildDOM();
    __wt_state.overlay = els.overlay;
    __wt_state.spotlight = els.spotlight;
    __wt_state.card = els.card;
    __wt_state.currentStep = 0;
    __wt_state.eventsBound = false;

    __wt_render.render();
    __wt_events.bind();
    __wt_state.overlay.style.display = '';
  }

  return { init, show };

})();
