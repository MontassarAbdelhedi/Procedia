/**
 * @fileoverview Floating notification/toast system. Pushes notification cards
 * over the canvas, below the top bar. Each card has a severity accent, message,
 * optional CTA buttons, and a dismiss button.
 * Depends on: css/notificationBar.css
 * Exports: notificationBar.init, notificationBar.push, notificationBar.dismiss, notificationBar.dismissAll
 */
// notifications/notificationBar.js
// DEPENDS ON: css/notificationBar.css
// MUST LOAD BEFORE: index.js

var notificationBar = (function() {

  var _container = null;
  var _active = {};

  /**
   * Creates the notification container inside canvas-wrap.
   */
  function init() {
    _container = document.createElement('div');
    _container.id = 'notification-container';
    var canvasWrap = document.getElementById('canvas-wrap');
    if (canvasWrap) {
      canvasWrap.appendChild(_container);
    }
  }

  function _generateId() {
    return 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  }

  /**
   * Pushes a new notification card.
   * @param {Object} opts
   * @param {string} opts.message — notification text
   * @param {string} [opts.severity='info'] — 'info' | 'warning' | 'error' | 'success'
   * @param {Object} [opts.cta] — primary action { label, action }
   * @param {Object} [opts.secondary] — secondary action { label, action }
   * @param {number} [opts.duration] — auto-dismiss ms (0 = manual only)
   * @returns {string} notification id (for use with dismiss)
   */
  function push(opts) {
    if (!_container) return;
    var id = _generateId();
    var severity = opts.severity || 'info';
    var card = document.createElement('div');
    card.className = 'notification-card';
    card.dataset.id = id;

    card.innerHTML =
      '<div class="notification-accent notif-' + severity + '"></div>' +
      '<div class="notification-body">' +
        '<div class="notification-message">' + _escapeHtml(opts.message) + '</div>' +
        _buildActions(opts) +
      '</div>' +
      '<button class="notification-dismiss notif-dismiss" title="Dismiss"><i class="ti ti-x"></i></button>';

    _bindCardEvents(card, id, opts);

    _container.appendChild(card);
    _active[id] = { card: card, opts: opts };

    if (opts.duration && opts.duration > 0) {
      setTimeout(function() { dismiss(id); }, opts.duration);
    }

    return id;
  }

  function _buildActions(opts) {
    var html = '';
    var hasCta = opts.cta && opts.cta.label;
    var hasSec = opts.secondary && opts.secondary.label;
    if (!hasCta && !hasSec) return '';
    html += '<div class="notification-actions">';
    if (hasCta) {
      html += '<button class="notification-btn notification-btn--primary notif-cta">' + _escapeHtml(opts.cta.label) + '</button>';
    }
    if (hasSec) {
      html += '<button class="notification-btn notif-secondary">' + _escapeHtml(opts.secondary.label) + '</button>';
    }
    html += '</div>';
    return html;
  }

  function _bindCardEvents(card, id, opts) {
    var dismissBtn = card.querySelector('.notif-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dismiss(id);
      });
    }

    var ctaBtn = card.querySelector('.notif-cta');
    if (ctaBtn && opts.cta && opts.cta.action) {
      ctaBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        opts.cta.action();
        dismiss(id);
      });
    }

    var secBtn = card.querySelector('.notif-secondary');
    if (secBtn && opts.secondary && opts.secondary.action) {
      secBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        opts.secondary.action();
        dismiss(id);
      });
    }
  }

  /**
   * Dismisses a notification by id with exit animation.
   */
  function dismiss(id) {
    var entry = _active[id];
    if (!entry) return;
    var card = entry.card;
    card.classList.add('notif-exit');
    setTimeout(function() {
      if (card.parentNode) card.parentNode.removeChild(card);
      delete _active[id];
    }, 200);
  }

  /**
   * Dismisses all active notifications.
   */
  function dismissAll() {
    var ids = Object.keys(_active);
    for (var i = 0; i < ids.length; i++) {
      dismiss(ids[i]);
    }
  }

  function _escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  return {
    init: init,
    push: push,
    dismiss: dismiss,
    dismissAll: dismissAll
  };

})();
