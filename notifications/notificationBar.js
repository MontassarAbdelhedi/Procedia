// notifications/notificationBar.js
// DEPENDS ON: graph/graphState.js, graph/nodeRegistry.js, graph/engine.js,
//             bridge/evalBridge.js, graph/canvas/renderer.js, graph/wire/wireRenderer.js,
//             ui/inspector.js
// MUST LOAD BEFORE: index.js

var notificationBar = (function() {

  var _activeNotifications = {};

  function _getBar() {
    return document.getElementById('notification-bar');
  }

  function showError(nodeId, label) {
    if (_activeNotifications[nodeId]) return;

    var bar = _getBar();
    if (!bar) {
      console.error('[notificationBar] #notification-bar element not found');
      return;
    }

    var el = document.createElement('div');
    el.className = 'notification';
    el.setAttribute('data-node-id', nodeId);

    var icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = '⚠';

    var text = document.createElement('span');
    text.className = 'notification-text';
    text.textContent = '"' + label + '" was deleted outside Procedia.';

    var recreateBtn = document.createElement('button');
    recreateBtn.className = 'notification-btn recreate-btn';
    recreateBtn.textContent = 'Re-create in AE';

    var removeBtn = document.createElement('button');
    removeBtn.className = 'notification-btn remove-btn';
    removeBtn.textContent = 'Remove from Graph';

    el.appendChild(icon);
    el.appendChild(text);
    el.appendChild(recreateBtn);
    el.appendChild(removeBtn);

    recreateBtn.onclick = function() {
      var nodeData = graphState.getNode(nodeId);
      if (!nodeData || nodeData.state !== 'error') {
        dismiss(nodeId);
        return;
      }
      // engine.recreateNode fires _firePathCreation for every terminal wire whose
      // source is this node — recreates layers with the correct wire UUIDs as comments
      engine.recreateNode(nodeId);
      renderer.updateNode(nodeId);
      dismiss(nodeId);
    };

    removeBtn.onclick = function() {
      engine.deleteNode(nodeId);
      renderer.render();
      wireRenderer.render();
      inspector.updateInspector();
      dismiss(nodeId);
    };

    bar.appendChild(el);
    _activeNotifications[nodeId] = el;
  }

  function showMessage(message) {
    var bar = _getBar();
    if (!bar) return;

    var el = document.createElement('div');
    el.className = 'notification info';

    var icon = document.createElement('span');
    icon.className = 'notification-icon';
    icon.textContent = 'ℹ';

    var text = document.createElement('span');
    text.className = 'notification-text';
    text.textContent = message;

    var dismissBtn = document.createElement('button');
    dismissBtn.className = 'notification-btn dismiss-btn';
    dismissBtn.textContent = 'Dismiss';

    el.appendChild(icon);
    el.appendChild(text);
    el.appendChild(dismissBtn);

    dismissBtn.onclick = function() {
      if (el.parentNode) el.parentNode.removeChild(el);
    };

    bar.appendChild(el);

    setTimeout(function() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 8000);
  }

  function dismiss(nodeId) {
    var el = _activeNotifications[nodeId];
    if (!el) return;
    if (el.parentNode) el.parentNode.removeChild(el);
    delete _activeNotifications[nodeId];
  }

  function dismissAll() {
    for (var id in _activeNotifications) {
      dismiss(id);
    }
  }

  return {
    showError:   showError,
    showMessage: showMessage,
    dismiss:     dismiss,
    dismissAll:  dismissAll
  };

})();
