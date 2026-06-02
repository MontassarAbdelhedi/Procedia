/**
 * Pushes missing-node notifications to the notification bar.
 * Manages its own notified-missing cache to avoid duplicates.
 * Depends on: graph/graphState.js, notifications/notificationBar.js (runtime)
 * Exports: pollerNotifier object with pushMissingNotification
 */
// polling/notifications.js
// DEPENDS ON: graph/graphState.js
// MUST LOAD BEFORE: polling/poller.js

var pollerNotifier = (function() {

  var _notifiedMissing = {};

  function pushMissingNotification(uuid) {
    if (_notifiedMissing[uuid]) return;
    _notifiedMissing[uuid] = true;

    var nd = graphState.getNode(uuid);
    if (!nd) return;

    var label = (nd.props && nd.props.label) || (nd.id ? nd.id.slice(0, 8) : 'unknown');
    notificationBar.push({
      message: label + ' is deleted outside Procedia',
      severity: 'error',
      cta: {
        label: 'Recreate',
        action: function(nId) {
          return function() {
            delete _notifiedMissing[nId];
            if (typeof engine !== 'undefined' && engine.recreateNode) engine.recreateNode(nId);
          };
        }(uuid)
      },
      secondary: {
        label: 'Remove node',
        action: function(nId) {
          return function() {
            delete _notifiedMissing[nId];
            if (typeof engine !== 'undefined' && engine.deleteNode) engine.deleteNode(nId);
            if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
            if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
          };
        }(uuid)
      }
    });
  }

  return {
    pushMissingNotification: pushMissingNotification
  };

})();
