/**
 * @fileoverview Walkthrough navigation logic. Handles next-step advance,
 * dismiss, and completion with localStorage persistence.
 * Depends on: __wt_state, __wt_steps (globals), __wt_render
 * Exports: __wt_nav.nextStep, .dismiss, .complete
 */
// ui/walkthrough/nav.js
// DEPENDS ON: ui/walkthrough/render.js, __wt_state, __wt_steps (globals)
// MUST LOAD BEFORE: ui/walkthrough/events.js

var __wt_nav = (function() {

  function nextStep() {
    if (__wt_state.animating) return;
    if (__wt_state.currentStep >= __wt_steps.length - 1) {
      complete();
      return;
    }
    __wt_state.animating = true;
    __wt_state.currentStep++;
    __wt_render.render();
    __wt_state.animating = false;
  }

  function dismiss() {
    complete();
  }

  function complete() {
    try {
      localStorage.setItem('procedia_walkthrough_done', '1');
    } catch (e) {}
    if (__wt_state.overlay) {
      __wt_state.overlay.style.display = 'none';
    }
  }

  return { nextStep, dismiss, complete };

})();
