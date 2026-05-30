// ui/bottomBar.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: index.js

var bottomBar = (function() {

  function init() {
    var el = document.getElementById('bottom-bar');
    el.innerHTML =
      '<div class="bottombar-notif">' +
        '<div class="bottombar-pip"></div>' +
        '<span class="bottombar-notif-text" id="bottombar-notif-text">ready</span>' +
      '</div>' +
      '<div class="bottombar-actions">' +
        '<button class="bottombar-btn" id="btn-reset" title="Reset"><i class="ti ti-rotate"></i></button>' +
        '<button class="bottombar-btn" id="btn-reload" title="Reload"><i class="ti ti-refresh"></i></button>' +
        '<div class="bottombar-divider"></div>' +
        '<button class="bottombar-btn" id="btn-settings" title="Settings"><i class="ti ti-settings"></i></button>' +
      '</div>';

    document.getElementById('btn-reset').addEventListener('click', function() {
      console.log('[Procedia] reset');
    });

    document.getElementById('btn-reload').addEventListener('click', function() {
      window.location.reload();
    });

    document.getElementById('btn-settings').addEventListener('click', function() {
      console.log('[Procedia] settings');
    });
  }

  function notify(message) {
    var el = document.getElementById('bottombar-notif-text');
    if (el) el.textContent = message;
  }

  return {
    init: init,
    notify: notify
  };

})();
