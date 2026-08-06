/**
 * Entry point for the Procedia panel.
 * Initializes CSInterface, loads the graph from persistence, and starts all subsystems.
 * Depends on: lib/CSInterface.js, data/uuidGenerator.js, bridge/evalBridge.js,
 *             graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
 *             graph/canvas/viewport.js, ui/inspector/*, ui/nodeList/*, ui/statusBar.js,
 *             ui/topBar/index.js, ui/sidebarToggle.js,
 *             graph/schemaCache/state.js, graph/schemaCache/persistence.js,
 *             graph/schemaCache/diff.js, graph/schemaCache/index.js,
 *             flush/dirtyFlusher.js
 * Exports: (none — side-effect module)
 */
// index.js
// DEPENDS ON: lib/CSInterface.js, data/uuidGenerator.js, bridge/evalBridge.js,
//             graph/graphState.js, graph/nodeRegistry.js, graph/engine/index.js,
//             graph/canvas/viewport.js,
//             ui/inspector/viewModel.js, ui/inspector/render.js, ui/inspector/events.js, ui/inspector/index.js,
//             ui/nodeList/categories.js, ui/nodeList/render.js, ui/nodeList/search.js,
//             ui/nodeList/dragdrop.js, ui/nodeList/index.js, ui/statusBar.js,
//             ui/topBar/index.js, ui/sidebarToggle.js,
//             graph/schemaCache/state.js, graph/schemaCache/persistence.js,
//             graph/schemaCache/diff.js, graph/schemaCache/index.js,
//             flush/dirtyFlusher.js
// MUST LOAD BEFORE: nothing (this is the entry point)

var csInterface = new CSInterface();

/**
 * After graph load, syncs keyframeState from AE's actual layer keyframes.
 * Iterates alive affected nodes, collects animatable param entries, and
 * dispatches batchGetKeyframeTimes. On response, updates keyframeState
 * and refreshes the UI.
 */
function _syncKeyframeState(allNodes) {
  if (typeof keyframeState === 'undefined' || typeof nodeRegistry === 'undefined' ||
      typeof graphState === 'undefined' || typeof evalBridge === 'undefined') return;
  var entries = [];
  var entryToNodeId = {};
  var entrySeen = {};
  for (var nodeId in allNodes) {
    if (!allNodes.hasOwnProperty(nodeId)) continue;
    var nodeData = allNodes[nodeId];
    if (nodeData.state !== 'alive') continue;
    var def = nodeRegistry.getDefinition(nodeData.type);
    if (!def || !def.params || !Array.isArray(def.params)) continue;
    var hostUUID = nodeData.hostingComps && nodeData.hostingComps.length > 0 ? nodeData.hostingComps[0] : null;
    if (!hostUUID) continue;
    var layerUUID = typeof window.__procedia_internal.hlp !== 'undefined' ? window.__procedia_internal.hlp.findPathLayerUUID(nodeId) : null;
    if (!layerUUID) continue;
    for (var paramIndex = 0; paramIndex < def.params.length; paramIndex++) {
      var param = def.params[paramIndex];
      if (param.animatable !== true) continue;
      var keyId = nodeId + '::' + param.key;
      if (entrySeen[keyId]) continue;
      entrySeen[keyId] = true;
      entryToNodeId[entries.length] = { nodeId: nodeId, key: param.key };
      entries.push({ hostingCompUUID: hostUUID, layerUUID: layerUUID, key: param.key });
    }
  }
  if (entries.length === 0) return;

  evalBridge.dispatch({
    action: 'batchGetKeyframeTimes',
    params: { entries: entries }
  }).then(function(res) {
    if (!res.ok || !res.data || !res.data.results) return;
    var changed = false;
    for (var resultIndex = 0; resultIndex < res.data.results.length; resultIndex++) {
      var resultEntry = res.data.results[resultIndex];
      if (resultEntry.times && resultEntry.times.length > 0) {
        var entryInfo = entryToNodeId[resultIndex];
        if (entryInfo) {
          keyframeState.setKeyframes(entryInfo.nodeId, entryInfo.key, resultEntry.times);
          changed = true;
        }
      }
    }
    if (changed) {
      if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
      if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
    }
  }).catch(function(err) {
    console.warn('[Procedia] keyframe sync error:', err);
  });
}

/**
 * Initializes all panel subsystems after DOM content is loaded.
 * Sets up evalBridge, canvas, wire tools, minimap, UI components, and
 * restores the persisted graph from the host application.
 */
function init() {
  evalBridge.init(csInterface);
  var extensionPath = (typeof window.__adobe_cep__ !== 'undefined')
    ? csInterface.getSystemPath(SystemPath.EXTENSION)
    : '[browser preview — no CEP context]';

  var missingModuleNames = [];
  var isStartupCritical = false;

  function _checkModule(name, critical) {
    if (typeof window[name] === 'undefined') {
      missingModuleNames.push(name);
      if (critical) isStartupCritical = true;
    }
  }

  _checkModule('evalBridge', true);
  _checkModule('wireValidator', false);
  _checkModule('dirtyFlusher', false);
  _checkModule('canvasView', true);
  _checkModule('canvasInput', true);
  _checkModule('renderer', false);
  _checkModule('nodeRegistry', false);
  _checkModule('graphState', true);

  if (missingModuleNames.length > 0) {
    var currentTimeISO = new Date().toISOString();
    var logMessageLines = [
      'Procedia startup diagnostic — ' + currentTimeISO,
      'Extension path: ' + extensionPath,
      'Missing modules (' + missingModuleNames.length + '): ' + missingModuleNames.join(', '),
      'Critical failure: ' + (isStartupCritical ? 'YES' : 'NO')
    ];

    for (var lineIndex = 0; lineIndex < logMessageLines.length; lineIndex++) {
      console.error('[Procedia] ' + logMessageLines[lineIndex]);
    }

    var errorDivElement = document.createElement('div');
    errorDivElement.id = 'procedia-startup-error';
    errorDivElement.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999999;background:#c62828;color:#fff;padding:20px 28px;border-radius:8px;font-family:sans-serif;font-size:14px;max-width:500px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.5);';
    errorDivElement.innerHTML = '<b>Procedia failed to start</b><br><br>' +
      'Missing modules: ' + missingModuleNames.join(', ') + '<br><br>' +
      'Check startup.log in the extension folder' +
      '<br><br><small>Extension ID: com.uppercut.procedia</small>';
    document.body.appendChild(errorDivElement);

    try {
      if (typeof csInterface !== 'undefined' && typeof window.cep !== 'undefined' && window.cep.fs) {
        var logFilePath = extensionPath.replace(/\\/g, '/') + '/startup.log';
        window.cep.fs.writeFile(logFilePath, logMessageLines.join('\n'));
      }
    } catch (cepError) {
      console.warn('[Procedia] Could not write startup.log:', cepError);
    }

    if (isStartupCritical) return;
  }

  if (typeof reporter !== 'undefined' && reporter.init) reporter.init();
  canvasView.init();
  canvasInput.init();
  if (typeof commentManager !== 'undefined' && commentManager.init) commentManager.init();
  graphState.onSelectionChange(function(sel) {
    window.__procedia_internal.refreshUI();
    if (typeof topBar !== 'undefined' && topBar.refreshSelection) topBar.refreshSelection(sel);
    if (typeof topBar !== 'undefined' && topBar.refreshCollapseBtn) topBar.refreshCollapseBtn();
    if (typeof nodeToolbar !== 'undefined' && nodeToolbar.refresh) nodeToolbar.refresh();
    if (typeof autoShy !== 'undefined' && autoShy.handleSelectionChange) {
      autoShy.handleSelectionChange(sel);
    }
  });
  if (typeof wireRenderer !== 'undefined' && wireRenderer.init) wireRenderer.init();
  if (typeof wireTool !== 'undefined' && wireTool.init) wireTool.init();
  if (typeof minimap !== 'undefined' && minimap.init) minimap.init();
  if (typeof topBar !== 'undefined' && topBar.init) topBar.init();
  if (typeof topBar !== 'undefined' && topBar.refreshCollapseBtn) topBar.refreshCollapseBtn();
  if (typeof nodeList !== 'undefined' && nodeList.init) nodeList.init();
  if (typeof inspector !== 'undefined' && inspector.init) inspector.init();
  if (typeof notificationBar !== 'undefined' && notificationBar.init) notificationBar.init();
  if (typeof nodeToolbar !== 'undefined' && nodeToolbar.init) nodeToolbar.init();
  if (typeof statusBar !== 'undefined' && statusBar.init) statusBar.init();
  if (typeof sidebarToggle !== 'undefined' && sidebarToggle.init) sidebarToggle.init();
  if (typeof settingsModal !== 'undefined' && settingsModal.init) settingsModal.init();
  if (typeof presetModal !== 'undefined' && presetModal.init) presetModal.init();
  if (typeof compList !== 'undefined' && compList.init) compList.init();
  if (typeof graphSearch !== 'undefined' && graphSearch.init) graphSearch.init();
  if (typeof tipField !== 'undefined' && tipField.init) tipField.init();
  evalBridge.onReady(function(ready) {
    if (!ready) {
      console.warn('[Procedia] test seed skipped — evalBridge preamble not loaded');
      return;
    }
    var chain = Promise.resolve();
    if (typeof schemaCache !== 'undefined' && schemaCache.init) {
      chain = schemaCache.init();
    }
    chain.then(function() {
      return evalBridge.dispatch({ action: 'ensureReservedComp' });
    }).then(function() {
      return evalBridge.dispatch({ action: 'readGraph' });
    }).then(function(res) {
      if (res && res.ok && res.data && res.data.nodes) {
        var hasNodes = false;
        for (var k in res.data.nodes) { hasNodes = true; break; }
        if (hasNodes) {
          graphState.loadGraph(res.data);
          var loadedNodes = graphState.getAllNodes();
          for (var nodeId in loadedNodes) {
            if (!loadedNodes.hasOwnProperty(nodeId)) continue;
            var nodeData = loadedNodes[nodeId];
            if (!nodeData.dynamicSchema || !nodeData.dynamicSchema.properties) {
              var def = nodeRegistry.getDefinition(nodeData.type);
              if (def && def.params === 'dynamic' && def.matchName && typeof window.__procedia_internal.hlp !== 'undefined') {
                window.__procedia_internal.hlp.resolveDynamicSchema(nodeId, def.matchName);
              }
            }
          }
          renderer.render();
          if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);

          // Sync keyframe state from AE for all animatable params
          _syncKeyframeState(allNodes);
        }
      }
    }).then(function() {
      if (typeof graphExporter !== 'undefined' && graphExporter.init) graphExporter.init();
      if (typeof poller !== 'undefined' && poller.start) poller.start();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    }).then(function() {
      if (typeof walkthrough !== 'undefined' && walkthrough.init) walkthrough.init();
    }).catch(function(err) {
      console.warn('[Procedia] startup chain error:', err);
    });
  });

  var autoSaveTimer = null;
  function _scheduleAutoSave() {
    if (autoSaveTimer) return;
    autoSaveTimer = setTimeout(function() {
      autoSaveTimer = null;
      if (typeof graphState === 'undefined' || !graphState.isDirty()) return;
      var graphData = { nodes: graphState.getAllNodes(), wires: graphState.getAllWires() };
      if (typeof keyframeState !== 'undefined') {
        var keyframeData = {};
        var allNodes = graphState.getAllNodes();
        for (var nodeId in allNodes) {
          if (!allNodes.hasOwnProperty(nodeId)) continue;
          var keyframeParams = keyframeState.getAllKeyframedParams(nodeId);
          if (keyframeParams.length > 0) {
            keyframeData[nodeId] = {};
            for (var paramIndex = 0; paramIndex < keyframeParams.length; paramIndex++) {
              keyframeData[nodeId][keyframeParams[paramIndex]] = {
                keyframed: true,
                times: keyframeState.getKeyframeTimes(nodeId, keyframeParams[paramIndex])
              };
            }
          }
        }
        graphData.keyframes = keyframeData;
      }
      if (typeof evalBridge !== 'undefined' && evalBridge.fireAndForget) {
        evalBridge.fireAndForget({ action: 'writeGraph', params: graphData });
      }
      _scheduleAutoSave();
    }, 5000);
  }
  _scheduleAutoSave();

  window.addEventListener('beforeunload', function() {
    if (typeof graphState === 'undefined') return;
    if (!graphState.isDirty()) return;
    var graphData = { nodes: graphState.getAllNodes(), wires: graphState.getAllWires() };
    if (typeof keyframeState !== 'undefined') {
      var keyframeData = {};
      var allNodes = graphState.getAllNodes();
      for (var nodeId in allNodes) {
        if (!allNodes.hasOwnProperty(nodeId)) continue;
        var keyframeParams = keyframeState.getAllKeyframedParams(nodeId);
        if (keyframeParams.length > 0) {
          keyframeData[nodeId] = {};
          for (var paramIndex = 0; paramIndex < keyframeParams.length; paramIndex++) {
            keyframeData[nodeId][keyframeParams[paramIndex]] = {
              keyframed: true,
              times: keyframeState.getKeyframeTimes(nodeId, keyframeParams[paramIndex])
            };
          }
        }
      }
      graphData.keyframes = keyframeData;
    }
    if (typeof evalBridge !== 'undefined' && evalBridge.fireAndForget) {
      evalBridge.fireAndForget({ action: 'writeGraph', params: graphData });
    }
    if (typeof poller !== 'undefined' && poller.stop) poller.stop();
  });
}

document.addEventListener('DOMContentLoaded', init);
