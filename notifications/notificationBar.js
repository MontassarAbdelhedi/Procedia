var notificationBar = (function() {

  var bar       = null;
  var messageEl = null;
  var queue     = [];   // [{ uuid, message }, ...]
  var current   = null; // { uuid, message } currently displayed

  function displayNext() {
    if (queue.length === 0) {
      current = null;
      bar.style.display = 'none';
      return;
    }
    current = queue.shift();
    messageEl.innerHTML = '<span class="notif-icon">&#9888;</span>' + current.message;
    bar.style.display = 'flex';
  }

  function init() {
    bar       = document.getElementById('notification-bar');
    messageEl = document.getElementById('notification-message');
    document.getElementById('notification-dismiss').addEventListener('click', displayNext);
  }

  // show(uuid, message) — queues a message keyed to a node UUID.
  // Replaces any existing entry for the same UUID before pushing.
  function show(uuid, message) {
    for (var i = queue.length - 1; i >= 0; i--) {
      if (queue[i].uuid === uuid) { queue.splice(i, 1); break; }
    }
    queue.push({ uuid: uuid, message: message });
    if (!current) displayNext();
  }

  // dismiss(uuid) — removes a node's message from the queue/display.
  // Called when the node is deleted so its error doesn't linger.
  function dismiss(uuid) {
    for (var i = queue.length - 1; i >= 0; i--) {
      if (queue[i].uuid === uuid) { queue.splice(i, 1); break; }
    }
    if (current && current.uuid === uuid) displayNext();
  }

  function hide() {
    queue   = [];
    current = null;
    bar.style.display = 'none';
  }

  return { init: init, show: show, hide: hide, dismiss: dismiss };

}());
