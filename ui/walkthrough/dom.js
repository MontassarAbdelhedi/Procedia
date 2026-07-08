/**
 * @fileoverview Walkthrough DOM utilities. Builds overlay/spotlight/card
 * elements and positions them relative to target elements.
 * Depends on: __wt_state (global)
 * Exports: __wt_dom.buildDOM, .positionSpotlight, .positionCard, .escapeHtml
 */
// ui/walkthrough/dom.js
// DEPENDS ON: nothing at load time (references __wt_state lazily)
// MUST LOAD BEFORE: ui/walkthrough/render.js

var __wt_dom = (function() {

  function buildDOM() {
    var overlay = document.createElement('div');
    overlay.className = 'walkthrough-overlay';
    overlay.style.display = 'none';

    var spotlight = document.createElement('div');
    spotlight.className = 'walkthrough-spotlight';
    spotlight.style.display = 'none';

    var card = document.createElement('div');
    card.className = 'walkthrough-card';

    overlay.appendChild(spotlight);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    return { overlay, spotlight, card };
  }

  function positionSpotlight(selector) {
    if (!selector) {
      __wt_state.spotlight.style.display = 'none';
      return;
    }
    var target = document.querySelector(selector);
    if (!target) {
      __wt_state.spotlight.style.display = 'none';
      return;
    }
    var rect = target.getBoundingClientRect();
    __wt_state.spotlight.style.display = '';
    __wt_state.spotlight.style.left = rect.left + 'px';
    __wt_state.spotlight.style.top = rect.top + 'px';
    __wt_state.spotlight.style.width = rect.width + 'px';
    __wt_state.spotlight.style.height = rect.height + 'px';
  }

  function positionCard(pos, selector) {
    var cardW = 340;
    var gap = 16;

    if (pos === 'center' || !selector) {
      __wt_state.card.style.position = 'fixed';
      __wt_state.card.style.top = '50%';
      __wt_state.card.style.left = '50%';
      __wt_state.card.style.transform = 'translate(-50%, -50%)';
      __wt_state.card.style.opacity = '1';
      return;
    }

    var target = document.querySelector(selector);
    if (!target) {
      __wt_state.card.style.position = 'fixed';
      __wt_state.card.style.top = '50%';
      __wt_state.card.style.left = '50%';
      __wt_state.card.style.transform = 'translate(-50%, -50%)';
      __wt_state.card.style.opacity = '1';
      return;
    }

    var rect = target.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;

    if (pos === 'right') {
      var left = Math.min(rect.right + gap, vw - cardW - gap);
      left = Math.max(gap, left);
      var top = Math.max(gap, Math.min(rect.top, vh - 300));
      __wt_state.card.style.position = 'fixed';
      __wt_state.card.style.transform = 'none';
      __wt_state.card.style.left = left + 'px';
      __wt_state.card.style.top = top + 'px';
    } else if (pos === 'left') {
      var left2 = Math.max(gap, rect.left - cardW - gap);
      var top2 = Math.max(gap, Math.min(rect.top, vh - 300));
      __wt_state.card.style.position = 'fixed';
      __wt_state.card.style.transform = 'none';
      __wt_state.card.style.left = left2 + 'px';
      __wt_state.card.style.top = top2 + 'px';
    }

    __wt_state.card.style.opacity = '1';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  return { buildDOM, positionSpotlight, positionCard, escapeHtml };

})();
