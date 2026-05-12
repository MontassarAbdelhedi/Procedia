var notificationBar = (function() {

  var bar = null;
  var messageEl = null;

  function init() {
    bar = document.getElementById('notification-bar');
    messageEl = document.getElementById('notification-message');
    document.getElementById('notification-dismiss').addEventListener('click', hide);
  }

  function show(message) {
    messageEl.innerHTML = '<span class="notif-icon">&#9888;</span>' + message;
    bar.style.display = 'flex';
  }

  function hide() {
    bar.style.display = 'none';
  }

  return {
    init: init,
    show: show,
    hide: hide
  };

}());
