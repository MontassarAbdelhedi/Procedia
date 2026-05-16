// notifications/notificationBar.js
// MUST LOAD BEFORE: index.js
// API: show(message, type), hide()
// type: 'error' | 'info'  — controls colour; defaults to 'info'

var notificationBar = (function() {

  var bar        = null;
  var messageEl  = null;
  var dismissBtn = null;
  var autoTimer  = null;
  var queue      = [];   // [{ message, type }]
  var current    = null;

  var TYPE_STYLES = {
    error: { background: '#5c1f1f', border: '#d46e6e', icon: '⚠ ' },
    info:  { background: '#1a2a3a', border: '#5b8dd9', icon: 'ℹ ' }
  };
  var AUTO_DISMISS_MS = 5000;

  function applyStyle(type) {
    var s = TYPE_STYLES[type] || TYPE_STYLES.info;
    bar.style.background   = s.background;
    bar.style.borderColor  = s.border;
  }

  function displayNext() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }

    if (queue.length === 0) {
      current = null;
      bar.style.display = 'none';
      return;
    }

    current = queue.shift();
    var s   = TYPE_STYLES[current.type] || TYPE_STYLES.info;
    messageEl.textContent = s.icon + current.message;
    applyStyle(current.type);
    bar.style.display = 'flex';

    autoTimer = setTimeout(displayNext, AUTO_DISMISS_MS);
  }

  function init() {
    bar        = document.getElementById('notification-bar');
    messageEl  = document.getElementById('notification-message');
    dismissBtn = document.getElementById('notification-dismiss');
    dismissBtn.addEventListener('click', displayNext);
  }

  // show(message, type) — queues a notification; type is 'error' | 'info'.
  function show(message, type) {
    queue.push({ message: message, type: type || 'info' });
    if (!current) displayNext();
  }

  function hide() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
    queue   = [];
    current = null;
    if (bar) bar.style.display = 'none';
  }

  return { init: init, show: show, hide: hide };

}());
