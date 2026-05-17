var csInterface = null;
try {
  csInterface = new CSInterface();
} catch (e) {
  console.warn('[Procedia] CSInterface not available — running outside AE');
}

// ─── JSX preamble loader ─────────────────────────────────────────────────────
// Reads JSX files at startup and stores combined source as the evalBridge
// preamble. evalBridge prepends this to every evalScript call so JSX functions
// are always defined in scope. Required: AE 2025 evalScript calls do not share
// a persistent ExtendScript global scope.
// ADD each new JSX file here as it is implemented (Phase 6+).

(function() {
  if (!csInterface) return;
  var extPath = csInterface.getSystemPath(SystemPath.EXTENSION).replace(/[\/\\]+$/, '');

  // Load order: json.jsx must be first (all others depend on JSON polyfill).
  // ADD each new JSX file here as it is implemented (Phase 6+).
  var jsxFiles = [
    '\\jsx\\json.jsx',
    '\\jsx\\init.jsx',
    '\\jsx\\nodeLifeCycle\\nodeLayerOps\\nodeLayerLookup.jsx',
    '\\jsx\\nodeLifeCycle\\nodeLayerOps\\nodeLayerCreate.jsx',
    '\\jsx\\nodeLifeCycle\\nodeLayerOps\\nodeLayerPark.jsx',
    '\\jsx\\nodeLifeCycle\\nodeLayerOps\\nodeLayerRemove.jsx',
    '\\jsx\\nodeLifeCycle\\nodeEffectorOps.jsx',
    '\\jsx\\nodeLifeCycle\\nodeCompOps.jsx',
    '\\jsx\\properties.jsx',
    '\\jsx\\polling.jsx',
    '\\jsx\\aeFocus.jsx',
    '\\jsx\\persistence.jsx'
  ];

  var parts = [];
  for (var i = 0; i < jsxFiles.length; i++) {
    var r = window.cep.fs.readFile(extPath + jsxFiles[i]);
    if (r.err !== 0) {
      console.error('[Procedia] JSX read failed — ' + jsxFiles[i] + ' err=' + r.err);
      return;
    }
    parts.push(r.data);
  }

  var preamble = parts.join('\n');
  evalBridge.setPreamble(preamble);
  console.log('[Procedia] JSX preamble ready (' + preamble.length + ' chars, ' + jsxFiles.length + ' files)');
}());

// ─── Unload hooks — persist graph to AE before panel closes ──────────────────

window.addEventListener('beforeunload', function() {
  try { graphState.flushToPersistence(); } catch(e) { /* silent — panel is closing */ }
});

if (csInterface) {
  csInterface.addEventListener('com.adobe.csxs.events.ApplicationBeforeUnload', function() {
    try { graphState.flushToPersistence(); } catch(e) {}
  });
  csInterface.addEventListener('com.adobe.csxs.events.ApplicationQuit', function() {
    try { graphState.flushToPersistence(); } catch(e) {}
  });
}

// ─── Panel-open restore ───────────────────────────────────────────────────────
// Reads node + wire registries from AE and restores graphState.
// Runs after preamble is set so evalBridge is ready. Skipped if no AE.

function restoreGraphFromAE() {
  if (!csInterface) return;
  Promise.all([callReadNodeRegistry(), callReadWireRegistry()])
    .then(function(results) {
      var nodesJson = results[0];
      var wiresJson = results[1];

      if (nodesJson) {
        try {
          var nodeData = JSON.parse(nodesJson);
          var nodes = nodeData.nodes || {};
          for (var uid in nodes) {
            if (!nodes.hasOwnProperty(uid)) continue;
            var n = nodes[uid];
            graphState.addNode({
              id:          uid,
              type:        n.type,
              nodeKind:    n.nodeKind || 'affected',
              state:       n.state    || 'ghost',
              dirty:       false,
              x:           n.x || 0,
              y:           n.y || 0,
              props:       n.props || {},
              hostingComps: n.hostingComps || [],
              label:       n.label || '',
              position:    { x: n.x || 0, y: n.y || 0 }
            });
          }
        } catch(e) {
          console.error('[Procedia] restore: failed to parse nodes:', e);
        }
      }

      if (wiresJson) {
        try {
          var wireData = JSON.parse(wiresJson);
          var wires = wireData.wires || [];
          for (var i = 0; i < wires.length; i++) {
            var w = wires[i];
            graphState.addWire({ id: w.id, fromNode: w.fromNode, fromPort: w.fromPort, toNode: w.toNode, toPort: w.toPort });
          }
        } catch(e) {
          console.error('[Procedia] restore: failed to parse wires:', e);
        }
      }

      graphState.rebuildTempGraph();
      console.log('[Procedia] graph restored from AE');
    })
    .catch(function(err) {
      console.error('[Procedia] restoreGraphFromAE failed:', err && err.message);
    });
}

// ─── Init ────────────────────────────────────────────────────────────────────

try { buildNodeList(); }        catch(e) { console.error('[Procedia] buildNodeList failed:', e); }
try { initSearch(); }           catch(e) { console.error('[Procedia] initSearch failed:', e); }
try { canvas.init(); }          catch(e) { console.error('[Procedia] canvas.init failed:', e); }
try { minimap.init(); }         catch(e) { console.error('[Procedia] minimap.init failed:', e); }
try { notificationBar.init(); } catch(e) { console.error('[Procedia] notificationBar.init failed:', e); }
try { inspector.init(); }       catch(e) { console.error('[Procedia] inspector.init failed:', e); }
try { initDrag(); }             catch(e) { console.error('[Procedia] initDrag failed:', e); }
try { nodePicker.init(); }      catch(e) { console.error('[Procedia] nodePicker.init failed:', e); }
try { initKeyboard(); }         catch(e) { console.error('[Procedia] initKeyboard failed:', e); }
try { poller.start(); }         catch(e) { console.error('[Procedia] poller.start failed:', e); }
try { restoreGraphFromAE(); }   catch(e) { console.error('[Procedia] restoreGraphFromAE failed:', e); }
