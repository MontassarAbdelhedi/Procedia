/**
 * @fileoverview Top bar event wiring. Binds click handlers for all toolbar buttons.
 * Depends on: engine, autoLayout, renderer, wireRenderer, minimap, graphState,
 *             undoManager, presetModal, settingsModal, reporter, evalBridge,
 *             _topBarIO, _topBarCollapse, importProject (globals).
 * Exports: __topBar_events
 */
// ui/topBar/events.js
// MUST LOAD BEFORE: ui/topBar/init.js

var __topBar_events = (function() {

  function bind() {
    var dupeBtn = document.getElementById('topbar-duplicate');
    if (dupeBtn && typeof engine !== 'undefined') {
      dupeBtn.addEventListener('click', function() { engine.duplicateSelectedNodes(); });
    }

    var delBtn = document.getElementById('topbar-delete');
    if (delBtn && typeof engine !== 'undefined') {
      delBtn.addEventListener('click', function() { engine.deleteSelectedNodes(); });
    }

    var presetBtn = document.getElementById('topbar-save-preset');
    if (presetBtn && typeof presetModal !== 'undefined' && presetModal.open) {
      presetBtn.addEventListener('click', function() {
        var sel = (typeof graphState !== 'undefined' && graphState.getSelection) ? graphState.getSelection() : [];
        if (sel.length > 0) presetModal.open(sel);
      });
    }

    var autoBtn = document.getElementById('topbar-autolayout');
    if (autoBtn && typeof autoLayout !== 'undefined') {
      autoBtn.addEventListener('click', function() {
        autoLayout.run();
        if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        if (typeof minimap !== 'undefined' && minimap.fitAll) minimap.fitAll();
      });
    }

    var fitBtn = document.getElementById('topbar-fitview');
    if (fitBtn && typeof minimap !== 'undefined' && minimap.fitAll) {
      fitBtn.addEventListener('click', function() {
        minimap.fitAll();
        if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
      });
    }

    var collapseBtn = document.getElementById('topbar-collapseall');
    if (collapseBtn && typeof graphState !== 'undefined') {
      collapseBtn.addEventListener('click', function() {
        var all = graphState.getAllNodes();
        var anyCollapsed = false;
        for (var id in all) {
          if (all.hasOwnProperty(id) && all[id].collapsed) {
            anyCollapsed = true;
            break;
          }
        }
        var target = !anyCollapsed;
        for (var id2 in all) {
          if (all.hasOwnProperty(id2)) {
            graphState.updateNode(id2, { collapsed: target });
          }
        }
        if (typeof _topBarCollapse !== 'undefined' && _topBarCollapse._refresh) {
          _topBarCollapse._refresh(collapseBtn);
        }
        if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
      });
    }

    var undoBtn = document.getElementById('topbar-undo');
    if (undoBtn && typeof undoManager !== 'undefined') {
      undoBtn.addEventListener('click', function() { undoManager.undo(); });
    }

    var redoBtn = document.getElementById('topbar-redo');
    if (redoBtn && typeof undoManager !== 'undefined') {
      redoBtn.addEventListener('click', function() { undoManager.redo(); });
    }

    var resetBtn = document.getElementById('topbar-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        if (typeof engine !== 'undefined' && engine.resetAll) {
          if (confirm('Reset graph? This will delete all Procedia objects in AE.')) {
            engine.resetAll();
          }
        }
      });
    }

    var reloadBtn = document.getElementById('topbar-reload');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', function() {
        window.location.reload();
      });
    }

    var settingsBtn = document.getElementById('topbar-settings');
    if (settingsBtn && typeof settingsModal !== 'undefined') {
      settingsBtn.addEventListener('click', function() { settingsModal.open(); });
    }

    var updateBadge = document.getElementById('topbar-update-badge');
    if (updateBadge && typeof settingsModal !== 'undefined') {
      updateBadge.addEventListener('click', function() { settingsModal.openUpdates(); });
    }

    var reportBtn = document.getElementById('topbar-report');
    if (reportBtn && typeof reporter !== 'undefined' && reporter.openBugReportForm) {
      reportBtn.addEventListener('click', function() { reporter.openBugReportForm(); });
    }

    var saveBtn = document.getElementById('topbar-save');
    if (saveBtn) {
      saveBtn.addEventListener('click', function() {
        if (typeof graphState === 'undefined') return;
        var graphData = { nodes: graphState.getAllNodes(), wires: graphState.getAllWires() };
        if (typeof evalBridge !== 'undefined' && evalBridge.dispatch) {
          evalBridge.dispatch({ action: 'saveGraphToFile', params: { graph: graphData } })
            .then(function(res) {
              if (!res.ok) {
                if (res.error) console.warn('[topBar] save failed:', res.error);
                if (typeof _topBarIO !== 'undefined' && _topBarIO.fallbackSave) {
                  _topBarIO.fallbackSave(graphData);
                }
              }
            })
            .catch(function() {
              if (typeof _topBarIO !== 'undefined' && _topBarIO.fallbackSave) {
                _topBarIO.fallbackSave(graphData);
              }
            });
        } else {
          if (typeof _topBarIO !== 'undefined' && _topBarIO.fallbackSave) {
            _topBarIO.fallbackSave(graphData);
          }
        }
      });
    }

    var openBtn = document.getElementById('topbar-open');
    if (openBtn) {
      openBtn.addEventListener('click', function() {
        if (typeof graphState === 'undefined') return;
        if (typeof evalBridge !== 'undefined' && evalBridge.dispatch) {
          evalBridge.dispatch({ action: 'openGraphFile' })
            .then(function(res) {
              if (res.ok && res.data && !res.data.cancelled) {
                if (typeof _topBarIO !== 'undefined' && _topBarIO.loadGraphData) {
                  _topBarIO.loadGraphData(res.data);
                }
              } else if (!res.ok) {
                console.warn('[topBar] open failed:', res.error);
                if (typeof _topBarIO !== 'undefined' && _topBarIO.fallbackOpen) {
                  _topBarIO.fallbackOpen();
                }
              }
            })
            .catch(function() {
              if (typeof _topBarIO !== 'undefined' && _topBarIO.fallbackOpen) {
                _topBarIO.fallbackOpen();
              }
            });
        } else {
          if (typeof _topBarIO !== 'undefined' && _topBarIO.fallbackOpen) {
            _topBarIO.fallbackOpen();
          }
        }
      });
    }

    var importBtn = document.getElementById('topbar-import');
    if (importBtn && typeof importProject !== 'undefined' && importProject.start) {
      importBtn.addEventListener('click', function() { importProject.start(); });
    }

    // --- Version control buttons ---
    var saveVerBtn = document.getElementById('topbar-save-version');
    if (saveVerBtn && typeof saveVersionModal !== 'undefined') {
      saveVerBtn.addEventListener('click', function() {
        saveVersionModal.open();
      });
    }

    var newBranchBtn = document.getElementById('topbar-new-branch');
    if (newBranchBtn && typeof newBranchModal !== 'undefined') {
      newBranchBtn.addEventListener('click', function() {
        newBranchModal.open();
      });
    }

    var historyBtn = document.getElementById('topbar-history');
    if (historyBtn && typeof versionHistoryPanel !== 'undefined') {
      historyBtn.addEventListener('click', function() {
        versionHistoryPanel.open();
      });
    }
  }

  function refreshCollapseBtn() {
    var collapseBtn = document.getElementById('topbar-collapseall');
    if (collapseBtn && typeof _topBarCollapse !== 'undefined' && _topBarCollapse._refresh) {
      _topBarCollapse._refresh(collapseBtn);
    }
  }

  return {
    bind: bind,
    refreshCollapseBtn: refreshCollapseBtn
  };

})();
