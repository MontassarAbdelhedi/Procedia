/**
 * @fileoverview Walkthrough step renderer. Builds card HTML, step indicators,
 * and wires positioning.
 * Depends on: __wt_steps, __wt_state (globals), __wt_dom
 * Exports: __wt_render.render
 */
// ui/walkthrough/render.js
// DEPENDS ON: ui/walkthrough/steps.js, ui/walkthrough/dom.js, __wt_state (global)
// MUST LOAD BEFORE: ui/walkthrough/nav.js

var __wt_render = (function() {

  function render() {
    var step = __wt_steps[__wt_state.currentStep];
    var total = __wt_steps.length;

    var dotsHtml = '';
    for (var i = 0; i < total; i++) {
      var cls = 'walkthrough-dot';
      if (i === __wt_state.currentStep) cls += ' active';
      else if (i < __wt_state.currentStep) cls += ' done';
      dotsHtml += '<span class="' + cls + '"></span>';
    }

    var isLast = __wt_state.currentStep === total - 1;
    var btnHtml = isLast
      ? '<button class="walkthrough-btn-next" id="walkthrough-btn-next">Finish</button>'
      : '<button class="walkthrough-btn-next" id="walkthrough-btn-next">Next <i class="ti ti-chevron-right" style="font-size:12px"></i></button>';

    __wt_state.card.innerHTML =
      '<div class="walkthrough-body">' +
        '<div class="walkthrough-title">' + __wt_dom.escapeHtml(step.title) + '</div>' +
        '<div class="walkthrough-desc">' + __wt_dom.escapeHtml(step.description) + '</div>' +
      '</div>' +
      '<div class="walkthrough-footer">' +
        '<button class="walkthrough-btn-dismiss" id="walkthrough-btn-dismiss">Dismiss</button>' +
        '<div class="walkthrough-footer-center">' +
          '<span class="walkthrough-step-indicator">' + (__wt_state.currentStep + 1) + ' of ' + total + '</span>' +
          '<div class="walkthrough-dots">' + dotsHtml + '</div>' +
        '</div>' +
        btnHtml +
      '</div>';

    __wt_dom.positionSpotlight(step.target);
    __wt_dom.positionCard(step.cardPos, step.target);
  }

  return { render };

})();
