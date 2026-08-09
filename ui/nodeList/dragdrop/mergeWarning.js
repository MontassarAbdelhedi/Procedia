/**
 * @fileoverview Merge / Multimerge node warning. Shows a one-time per-project
 * notification bar warning when a user drops a Merge or Multimerge node, since
 * those nodes lock the project to require Procedia.
 * Depends on: __nl_dragdrop, evalBridge, notificationBar (globals).
 * Exports (extends): __nl_dragdrop._maybeWarnMerge
 */
// ui/nodeList/dragdrop/mergeWarning.js
// DEPENDS ON: ui/nodeList/dragdrop/dragdrop.js, bridge/evalBridge.js,
//             notifications/notificationBar.js
// MUST LOAD AFTER: ui/nodeList/dragdrop/dragdrop.js
// MUST LOAD BEFORE: ui/nodeList/index.js
// SECOND IN LOAD ORDER among dragdrop/ sub-files

(function() {

  var _mergeProjectId = null;

  __nl_dragdrop._maybeWarnMerge = function() {
    if (typeof notificationBar === 'undefined') return;
    if (_mergeProjectId === null) {
      _mergeProjectId = evalBridge.dispatch({ action: 'getProjectIdentifier' })
        .then(function(res) { return res.ok ? res.data.projectId : 'unknown'; })
        .catch(function() { return 'unknown'; });
    }
    Promise.resolve(_mergeProjectId).then(function(projectId) {
      var key = 'procedia_merge_warned_' + projectId;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      notificationBar.push({
        severity: 'warning',
        message: 'Using the Merge node will make this project always require Procedia to run.',
        duration: 8000
      });
    });
  };

})();
