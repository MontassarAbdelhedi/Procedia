/**
 * @fileoverview Top bar DOM construction and event wiring.
 * Depends on: _topBarCollapse, _topBarSelection, _topBarIO, graphState, engine, autoLayout,
 *             renderer, wireRenderer, minimap, settingsModal (ui/settingsModal/), reporter, evalBridge (globals).
 * Exports: _topBarInit
 */
// ui/topBar/init.js

var _topBarInit = (function() {

  function init() {
    var el = document.getElementById('top-bar');
    el.innerHTML =
      '<div class="topbar-left">' +
        '<div class="topbar-logo">' +
          '<div class="topbar-logo-mark"><i class="ti ti-topology-star-3"></i></div>' +
          '<span class="topbar-wordmark">Procedia</span>' +
        '</div>' +
      '</div>' +
      '<div class="topbar-center">' +
        '<button class="topbar-btn" id="topbar-save" title="Save"><i class="ti ti-device-floppy"></i></button>' +
        '<button class="topbar-btn" id="topbar-open" title="Open"><i class="ti ti-folder-open"></i></button>' +
        '<button class="topbar-btn" id="topbar-undo" title="Undo" disabled><i class="ti ti-arrow-back-up"></i></button>' +
        '<button class="topbar-btn" id="topbar-redo" title="Redo" disabled><i class="ti ti-arrow-forward-up"></i></button>' +
        '<div class="topbar-divider"></div>' +
        '<button class="topbar-btn" id="topbar-autolayout" title="Auto Layout"><i class="ti ti-sitemap"></i></button>' +
        '<button class="topbar-btn" id="topbar-fitview" title="Fit View"><i class="ti ti-focus-2"></i></button>' +
        '<button class="topbar-btn" id="topbar-collapseall" title="Collapse All"><i class="ti ti-chevrons-up"></i></button>' +
        '<div class="topbar-divider"></div>' +
        '<div class="topbar-dynamic" id="topbar-dynamic">' +
          '<button class="topbar-btn" id="topbar-duplicate" title="Duplicate"><i class="ti ti-copy"></i></button>' +
          '<button class="topbar-btn topbar-btn--delete" id="topbar-delete" title="Delete"><i class="ti ti-trash"></i></button>' +
        '</div>' +
        '<div class="topbar-divider"></div>' +
        '<button class="topbar-btn" id="topbar-reset" title="Reset"><i class="ti ti-rotate"></i></button>' +
        '<button class="topbar-btn" id="topbar-reload" title="Reload"><i class="ti ti-refresh"></i></button>' +
        '<button class="topbar-btn" id="topbar-settings" title="Settings"><i class="ti ti-settings"></i></button>' +
      '</div>' +
      '<div class="topbar-right">' +
        '<button class="topbar-btn" id="topbar-report" title="Report a Bug"><i class="ti ti-bug"></i></button>' +
        '<span class="topbar-status" id="topbar-status"></span>' +
      '</div>';

    if (typeof _topBarSelection !== 'undefined') {
      _topBarSelection.refreshSelection([]);
    }

    var dupeBtn = document.getElementById('topbar-duplicate');
    if (dupeBtn && typeof engine !== 'undefined') {
      dupeBtn.addEventListener('click', function() { engine.duplicateSelectedNodes(); });
    }

    var delBtn = document.getElementById('topbar-delete');
    if (delBtn && typeof engine !== 'undefined') {
      delBtn.addEventListener('click', function() { engine.deleteSelectedNodes(); });
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
      if (typeof _topBarCollapse !== 'undefined' && _topBarCollapse._refresh) {
        _topBarCollapse._refresh(collapseBtn);
      }
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
  }

  return {
    init: init
  };

})();
