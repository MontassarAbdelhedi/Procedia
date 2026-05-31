/**
 * @fileoverview Bottom bar UI module. Displays a notification bar with status text.
 * Exports: bottomBar.init, bottomBar.notify
 */
// ui/bottomBar.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: index.js

var bottomBar = (function() {

  /**
   * Builds the bottom-bar DOM.
   */
  function init() {
    var el = document.getElementById('bottom-bar');
    el.innerHTML =
      '<div class="bottombar-notif">' +
        '<div class="bottombar-pip"></div>' +
        '<span class="bottombar-notif-text" id="bottombar-notif-text">ready</span>' +
      '</div>';
  }

  /**
   * Sets the notification text in the bottom bar.
   * @param {string} message The message to display.
   */
  function notify(message) {
    var el = document.getElementById('bottombar-notif-text');
    if (el) el.textContent = message;
  }

  return {
    init: init,
    notify: notify
  };

})();
