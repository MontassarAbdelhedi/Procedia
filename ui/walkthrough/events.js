/**
 * @fileoverview Walkthrough event binding. Delegates button clicks on the
 * instruction card to navigation handlers.
 * Depends on: __wt_state (global), __wt_nav
 * Exports: __wt_events.bind
 */
// ui/walkthrough/events.js
// DEPENDS ON: ui/walkthrough/nav.js, __wt_state (global)
// MUST LOAD BEFORE: ui/walkthrough/index.js

var __wt_events = (function() {

  function bind() {
    if (__wt_state.eventsBound) return;
    __wt_state.eventsBound = true;
    __wt_state.card.addEventListener('click', function(e) {
      var target = e.target;
      if (target.id === 'walkthrough-btn-next') {
        __wt_nav.nextStep();
      } else if (target.id === 'walkthrough-btn-dismiss') {
        __wt_nav.dismiss();
      }
    });
  }

  return { bind };

})();
