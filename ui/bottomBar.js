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
      '</div>';
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
