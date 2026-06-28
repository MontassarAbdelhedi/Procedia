/**
 * @fileoverview Top bar UI module. Renders the toolbar with logo, save/undo/redo,
 * duplicate/delete, reset/reload/settings buttons. Updates selection-dependent controls.
 * Depends on: engine, settingsModal (globals).
 * Exports: topBar.init, topBar.refreshSelection, topBar.showSelection, topBar.clearSelection
 */
// ui/topBar.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: index.js

var topBar = (function() {

  function _refreshCollapseBtn(btn) {
    if (!btn || typeof graphState === 'undefined') return;
    var all = graphState.getAllNodes();
    var anyCollapsed = false;
    for (var id in all) {
      if (all.hasOwnProperty(id) && all[id].collapsed) {
        anyCollapsed = true;
        break;
      }
    }
    if (anyCollapsed) {
      btn.title = 'Expand All';
      btn.innerHTML = '<i class="ti ti-chevrons-down"></i>';
    } else {
      btn.title = 'Collapse All';
      btn.innerHTML = '<i class="ti ti-chevrons-up"></i>';
    }
  }

  /**
   * Builds the top-bar DOM and wires all button event listeners.
   */
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
        '<button class="topbar-btn" title="Undo"><i class="ti ti-arrow-back-up"></i></button>' +
        '<button class="topbar-btn" title="Redo"><i class="ti ti-arrow-forward-up"></i></button>' +
        '<div class="topbar-divider"></div>' +
        '<button class="topbar-btn" id="topbar-autolayout" title="Auto Layout"><i class="ti ti-sitemap"></i></button>' +
        '<button class="topbar-btn" id="topbar-fitview" title="Fit View"><i class="ti ti-focus-2"></i></button>' +
        '<button class="topbar-btn" id="topbar-collapseall" title="Collapse All"><i class="ti ti-chevrons-up"></i></button>' +
        '<div class="topbar-divider"></div>' +
        '<button class="topbar-btn" id="topbar-import" title="Import AE Project"><i class="ti ti-file-import"></i></button>' +
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
      '<div class="topbar-right"><span class="topbar-status" id="topbar-status"></span></div>';

    refreshSelection([]);

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
        _refreshCollapseBtn(collapseBtn);
        if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
        if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
        if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
      });
      _refreshCollapseBtn(collapseBtn);
    }

    document.getElementById('topbar-reset').addEventListener('click', function() {
      if (typeof engine !== 'undefined' && engine.resetAll) {
        if (confirm('Reset graph? This will delete all Procedia objects in AE.')) {
          engine.resetAll();
        }
      }
    });

    document.getElementById('topbar-reload').addEventListener('click', function() {
      window.location.reload();
    });

    var settingsBtn = document.getElementById('topbar-settings');
    if (settingsBtn && typeof settingsModal !== 'undefined') {
      settingsBtn.addEventListener('click', function() { settingsModal.open(); });
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
                _fallbackSave(graphData);
              } else if (res.data && res.data.cancelled) {
              }
            })
            .catch(function() { _fallbackSave(graphData); });
        } else {
          _fallbackSave(graphData);
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
                _loadGraphData(res.data);
              } else if (!res.ok) {
                console.warn('[topBar] open failed:', res.error);
                _fallbackOpen();
              }
            })
            .catch(function() { _fallbackOpen(); });
        } else {
          _fallbackOpen();
        }
      });
    }
  }

  function _loadGraphData(data) {
    graphState.loadGraph(data);
    if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
    if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
    if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    if (typeof topBar !== 'undefined' && topBar.refreshCollapseBtn) topBar.refreshCollapseBtn();
  }

  function _fallbackOpen() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.procedia.json,.json';
    input.addEventListener('change', function(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        try {
          var parsed = JSON.parse(ev.target.result);
          _loadGraphData({ nodes: parsed.nodes || {}, wires: parsed.wires || {} });
        } catch (err) {
          console.warn('[topBar] fallback open parse error:', err);
        }
      };
      reader.readAsText(file);
    });
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  function _fallbackSave(graphData) {
    var jsonStr = JSON.stringify({ version: '1.0', nodes: graphData.nodes, wires: graphData.wires }, null, 2);
    var blob = new Blob([jsonStr], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'procedia_graph_' + Date.now() + '.procedia.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 5000);
  }

  /**
   * Sets the opacity of the dynamic (selection-dependent) buttons based on selection.
   * @param {Array} sel Array of selected node IDs.
   */
  function refreshSelection(sel) {
    var el = document.getElementById('topbar-dynamic');
    if (!el) return;
    if (sel.length === 0) {
      el.style.opacity = '0.4';
      el.style.pointerEvents = 'none';
    } else {
      el.style.opacity = '1';
      el.style.pointerEvents = 'auto';
    }
  }

  /**
   * Makes the dynamic section visible (selection present).
   */
  function showSelection() {
    var el = document.getElementById('topbar-dynamic');
    if (!el) return;
    el.style.opacity = '1';
    el.style.pointerEvents = 'auto';
  }

  /**
   * Hides the dynamic section (no selection).
   */
  function clearSelection() {
    refreshSelection([]);
  }

  function refreshCollapseBtn() {
    var btn = document.getElementById('topbar-collapseall');
    if (btn) _refreshCollapseBtn(btn);
  }

  return {
    init: init,
    refreshSelection: refreshSelection,
    showSelection: showSelection,
    clearSelection: clearSelection,
    refreshCollapseBtn: refreshCollapseBtn
  };

})();
