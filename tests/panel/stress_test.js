/**
 * Panel stress test — runs inside the Procedia CEP panel in After Effects.
 *
 * USAGE:
 *   1. Open After Effects with the Procedia panel loaded
 *   2. Open CEP DevTools (http://localhost:8088) or right-click panel > Inspect
 *   3. Paste & run this entire file in the console
 *   4. Call:  runStressTest({ mode: 'js' })
 *             runStressTest({ mode: 'engine' })
 *             runStressTest({ mode: 'full' })
 *
 * MODES:
 *   js      — graphState APIs only (no AE interaction). Tests 10–200 nodes.
 *   engine  — engine APIs (creates AE layers/effects). Tests 5–15 nodes.
 *   full    — engine APIs + waits for AE alive state. Tests 3–10 nodes.
 */
(function() {
  if (window.__stressTestLoaded) return;
  window.__stressTestLoaded = true;

  var LAYER_TYPES = ['layers/text', 'layers/null', 'layers/shape', 'layers/adjustment'];
  var EFFECT_TYPES = ['blur-sharpen/gaussian-blur', 'blur-sharpen/directional-blur', 'color-correction/curves', 'color-correction/hue-saturation', 'distort/bulge', 'distort/cc-bender', 'stylize/glow', 'generate/4-color-gradient'];
  var DATA_TYPES = ['data/number', 'data/color'];
  var MISC_TYPES = ['utility/blending'];

  var allResults = [];

  function pad(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }

  function log(msg) { console.log('[Procedia StressTest] ' + msg); }

  function warn(msg) { console.warn('[Procedia StressTest] ' + msg); }

  function rand(n) { return Math.floor(Math.random() * n); }

  function pick(arr) { return arr[rand(arr.length)]; }

  function waitForState(nodeId, targetState, timeoutMs) {
    return new Promise(function(resolve, reject) {
      var start = Date.now();
      function check() {
        var node = graphState.getNode(nodeId);
        if (node && node.state === targetState) return resolve(node);
        if (Date.now() - start > timeoutMs) return reject(new Error('Timeout: ' + nodeId + ' not ' + targetState + ' after ' + timeoutMs + 'ms'));
        setTimeout(check, 100);
      }
      check();
    });
  }

  function waitAllAlive(nodeIds, timeoutMs) {
    if (nodeIds.length === 0) return Promise.resolve();
    return Promise.all(nodeIds.map(function(id) {
      return waitForState(id, 'alive', timeoutMs).catch(function(err) {
        warn(err.message);
        return null;
      });
    }));
  }

  function runUIRefresh() {
    if (window.__procedia_internal && window.__procedia_internal._uiScheduler) {
      window.__procedia_internal._uiScheduler.scheduleUIUpdate();
    }
  }

  function buildPropsFromDef(def) {
    if (!def) return {};
    if (def.params === 'dynamic') return {};
    var props = {};
    if (Array.isArray(def.params)) {
      for (var i = 0; i < def.params.length; i++) {
        props[def.params[i].key] = def.params[i]['default'];
      }
    }
    return props;
  }

  function generateNetworkJS(targetCount) {
    var compId = null;
    var compDef = nodeRegistry.getDefinition('core/comp');
    var t0 = performance.now();
    if (compDef) {
      var compData = {
        id: uuidGenerator.node(), type: 'core/comp', nodeKind: 'affected', dedicated: true,
        state: 'alive', dirty: false, x: 400, y: 300,
        props: buildPropsFromDef(compDef), hostingComps: [], hasParkedLayer: false,
        dynamicSchema: null, secondaryPorts: null, locked: false, disabled: false
      };
      graphState.addNode(compData);
      compId = compData.id;
    }

    var remaining = targetCount - 1;
    var numLayers = Math.max(1, Math.round(remaining * 0.30));
    var numEffects = Math.round(remaining * 0.45);
    var numData = Math.round(remaining * 0.10);
    var numMisc = remaining - numLayers - numEffects - numData;
    if (numMisc < 0) { numEffects += numMisc; numMisc = 0; }

    var layerIds = [], effectIds = [], dataIds = [], miscIds = [];

    for (var li = 0; li < numLayers; li++) {
      var t = pick(LAYER_TYPES);
      var def = nodeRegistry.getDefinition(t);
      if (!def) continue;
      var id = uuidGenerator.node();
      graphState.addNode({
        id: id, type: t, nodeKind: 'affected', dedicated: false,
        state: 'ghost', dirty: false, x: 50 + rand(200), y: 50 + rand(500),
        props: buildPropsFromDef(def), hostingComps: [], hasParkedLayer: false,
        dynamicSchema: null, secondaryPorts: null, locked: false, disabled: false
      });
      layerIds.push(id);
    }

    for (var ei = 0; ei < numEffects; ei++) {
      var t = pick(EFFECT_TYPES);
      var def = nodeRegistry.getDefinition(t);
      if (!def) continue;
      var id = uuidGenerator.node();
      graphState.addNode({
        id: id, type: t, nodeKind: 'effector', dedicated: false,
        state: 'ghost', dirty: false, x: 250 + rand(200), y: 50 + rand(500),
        props: {}, hostingComps: [], hasParkedLayer: false,
        dynamicSchema: null, secondaryPorts: null, locked: false, disabled: false
      });
      effectIds.push(id);
    }

    for (var di = 0; di < numData; di++) {
      var t = pick(DATA_TYPES);
      var def = nodeRegistry.getDefinition(t);
      if (!def) continue;
      var id = uuidGenerator.node();
      graphState.addNode({
        id: id, type: t, nodeKind: 'data', dedicated: false,
        state: 'alive', dirty: false, x: 0, y: 50 + rand(500),
        props: buildPropsFromDef(def), hostingComps: [], hasParkedLayer: false,
        dynamicSchema: null, secondaryPorts: null, locked: false, disabled: false
      });
      dataIds.push(id);
    }

    for (var mi = 0; mi < numMisc; mi++) {
      var t = pick(MISC_TYPES);
      var def = nodeRegistry.getDefinition(t);
      if (!def) continue;
      var id = uuidGenerator.node();
      graphState.addNode({
        id: id, type: t, nodeKind: def.nodeKind, dedicated: false,
        state: 'alive', dirty: false, x: 500 + rand(100), y: 50 + rand(500),
        props: buildPropsFromDef(def), hostingComps: [], hasParkedLayer: false,
        dynamicSchema: null, secondaryPorts: null, locked: false, disabled: false
      });
      miscIds.push(id);
    }

    var wireCount = 0;
    var usedEffects = {};
    for (var ci = 0; ci < layerIds.length; ci++) {
      var chainLen = Math.min(1 + rand(2), effectIds.filter(function(id) { return !usedEffects[id]; }).length);
      var chain = [];
      for (var cj = 0; cj < chainLen; cj++) {
        var avail = effectIds.filter(function(id) { return !usedEffects[id]; });
        if (avail.length === 0) break;
        var picked = avail[rand(avail.length)];
        usedEffects[picked] = true;
        chain.push(picked);
      }
      var prev = layerIds[ci];
      for (var ck = 0; ck < chain.length; ck++) {
        graphState.addWire({
          id: uuidGenerator.wire(), type: 'layer',
          fromNode: prev, fromPort: 'output',
          toNode: chain[ck], toPort: 'main_input',
          boundParam: null, _pathLayerUUID: null
        });
        wireCount++;
        prev = chain[ck];
      }
      if (compId) {
        graphState.addWire({
          id: uuidGenerator.wire(), type: 'layer',
          fromNode: prev, fromPort: 'output',
          toNode: compId, toPort: 'main_input',
          boundParam: null, _pathLayerUUID: null
        });
        wireCount++;
      }
    }

    var nodeCreateMs = performance.now() - t0;

    var nodeIds = Object.keys(graphState.getAllNodes());
    var wireIds = Object.keys(graphState.getAllWires());

    return {
      compId: compId, nodeIds: nodeIds, wireIds: wireIds, wireCount: wireIds.length,
      layerCount: layerIds.length, effectCount: effectIds.length,
      dataCount: dataIds.length, miscCount: miscIds.length,
      nodeCreateMs: nodeCreateMs, totalNodes: nodeIds.length
    };
  }

  async function generateNetworkEngine(targetCount, waitAlive) {
    var compNode = engine.dropNode(nodeRegistry.getDefinition('core/comp'), 400, 300);
    if (!compNode) { throw new Error('Failed to drop comp'); }
    if (waitAlive) {
      await waitForState(compNode.id, 'alive', 15000);
    }

    var remaining = targetCount - 1;
    var numLayers = Math.max(1, Math.round(remaining * 0.30));
    var numEffects = Math.round(remaining * 0.45);
    var numMisc = remaining - numLayers - numEffects;
    if (numMisc < 0) { numEffects += numMisc; numMisc = 0; }

    var layerIds = [];
    for (var li = 0; li < numLayers; li++) {
      var def = nodeRegistry.getDefinition(pick(LAYER_TYPES));
      if (!def) continue;
      var node = engine.dropNode(def, 50 + rand(200), 50 + rand(500));
      if (node) layerIds.push(node.id);
    }

    var effectIds = [];
    for (var ei = 0; ei < numEffects; ei++) {
      var def = nodeRegistry.getDefinition(pick(EFFECT_TYPES));
      if (!def) continue;
      var node = engine.dropNode(def, 250 + rand(200), 50 + rand(500));
      if (node) effectIds.push(node.id);
    }

    var miscIds = [];
    for (var mi = 0; mi < numMisc; mi++) {
      var def = nodeRegistry.getDefinition(pick(MISC_TYPES));
      if (!def) continue;
      var node = engine.dropNode(def, 500 + rand(100), 50 + rand(500));
      if (node) miscIds.push(node.id);
    }

    var allIds = [].concat(layerIds, effectIds, miscIds);

    var wireCount = 0;
    var usedEffects = {};
    for (var ci = 0; ci < layerIds.length; ci++) {
      var chainLen = Math.min(1 + rand(2), effectIds.filter(function(id) { return !usedEffects[id]; }).length);
      var chain = [];
      for (var cj = 0; cj < chainLen; cj++) {
        var avail = effectIds.filter(function(id) { return !usedEffects[id]; });
        if (avail.length === 0) break;
        var picked = avail[rand(avail.length)];
        usedEffects[picked] = true;
        chain.push(picked);
      }
      var prev = layerIds[ci];
      for (var ck = 0; ck < chain.length; ck++) {
        engine.connectWire(prev, 'output', chain[ck], 'main_input');
        wireCount++;
        prev = chain[ck];
      }
      engine.connectWire(prev, 'output', compNode.id, 'main_input');
      wireCount++;
    }

    if (waitAlive) {
      await waitAllAlive(layerIds, 30000);
    }

    var nodeIds = Object.keys(graphState.getAllNodes());
    var wireIds = Object.keys(graphState.getAllWires());

    return {
      compId: compNode.id, nodeIds: nodeIds, wireIds: wireIds, wireCount: wireIds.length,
      layerCount: layerIds.length, effectCount: effectIds.length,
      dataCount: 0, miscCount: miscIds.length, totalNodes: nodeIds.length
    };
  }

  function measureTempGraph(iterations) {
    iterations = iterations || 10;
    var t0 = performance.now();
    for (var ti = 0; ti < iterations; ti++) {
      graphState.getTempGraph();
    }
    return (performance.now() - t0) / iterations;
  }

  function measureCycleCheck(nodeIds, iterations) {
    iterations = iterations || 3;
    var t0 = performance.now();
    for (var ci = 0; ci < iterations; ci++) {
      for (var a = 0; a < nodeIds.length; a++) {
        for (var b = 0; b < nodeIds.length; b++) {
          if (a !== b) cycleChecker.hasCycle(nodeIds[a], nodeIds[b]);
        }
      }
    }
    return (performance.now() - t0) / iterations;
  }

  function printTable(results, label) {
    log('');
    log('=== ' + label + ' ===');
    log('');
    log(pad('Size', 6) + ' ' + pad('Nodes', 6) + ' ' + pad('Wires', 6) + ' ' + pad('L', 3) + ' ' + pad('E', 3) + ' ' + pad('D', 3) + ' ' + pad('M', 3) + ' ' + pad('Node(ms)', 9) + ' ' + pad('TGraph(ms)', 11) + ' ' + pad('Check(ms)', 9) + ' ' + pad('Layout(ms)', 11));
    log(pad('', 6, '-') + ' ' + pad('', 6, '-') + ' ' + pad('', 6, '-') + ' ' + pad('', 3, '-') + ' ' + pad('', 3, '-') + ' ' + pad('', 3, '-') + ' ' + pad('', 3, '-') + ' ' + pad('', 9, '-') + ' ' + pad('', 11, '-') + ' ' + pad('', 9, '-') + ' ' + pad('', 11, '-'));
    for (var ri = 0; ri < results.length; ri++) {
      var r = results[ri];
      log(pad(r.size, 6) + ' ' + pad(r.nodes, 6) + ' ' + pad(r.wires, 6) + ' ' + pad(r.layers, 3) + ' ' + pad(r.effects, 3) + ' ' + pad(r.data, 3) + ' ' + pad(r.misc, 3) + ' ' + pad(r.nodeMs.toFixed(2), 9) + ' ' + pad(r.tgMs.toFixed(3), 11) + ' ' + pad(r.checkMs.toFixed(2), 9) + ' ' + pad(r.layoutMs.toFixed(2), 11));
    }
    log('');
  }

  function printSummary(results, label) {
    log('=== ' + label + ' — Per-Operation ===');
    log(pad('Size', 6) + ' ' + pad('ms/node', 8) + ' ' + pad('ms/wire', 8) + ' ' + pad('ms/tgBuild', 10) + ' ' + pad('ms/allPairCheck', 15) + ' ' + pad('ms/layout', 9) + ' ' + pad('us/hasCycle', 11));
    log(pad('', 6, '-') + ' ' + pad('', 8, '-') + ' ' + pad('', 8, '-') + ' ' + pad('', 10, '-') + ' ' + pad('', 15, '-') + ' ' + pad('', 9, '-') + ' ' + pad('', 11, '-'));
    for (var ri = 0; ri < results.length; ri++) {
      var r = results[ri];
      var perNode = (r.nodeMs / r.nodes).toFixed(4);
      var perWire = (r.wireMs / r.wires).toFixed(4);
      var perTg = r.tgMs.toFixed(4);
      var perCheck = r.checkMs.toFixed(2);
      var perLayout = r.layoutMs.toFixed(2);
      var perHasCycle = (r.checkMs / (r.nodes * r.nodes) * 1000).toFixed(2);
      log(pad(r.size, 6) + ' ' + pad(perNode, 8) + ' ' + pad(perWire, 8) + ' ' + pad(perTg, 10) + ' ' + pad(perCheck, 15) + ' ' + pad(perLayout, 9) + ' ' + pad(perHasCycle, 11));
    }
    log('');
  }

  function clearGraph() {
    try {
      var allNodes = graphState.getAllNodes();
      var compIds = [];
      for (var id in allNodes) {
        if (allNodes[id].type === 'core/comp') compIds.push(id);
      }
      if (compIds.length > 0 && typeof engine !== 'undefined' && engine.deleteNode) {
        for (var ci = 0; ci < compIds.length; ci++) {
          engine.deleteNode(compIds[ci]);
        }
      } else {
        graphState.clearGraph();
      }
    } catch (e) {
      warn('Cleanup error: ' + e.message);
      graphState.clearGraph();
    }
    runUIRefresh();
  }

  async function runTest(size, mode) {
    log('Running ' + mode + ' test: size=' + size);

    if (mode !== 'js') {
      clearGraph();
      await new Promise(function(r) { setTimeout(r, 500); });
    } else {
      graphState.clearGraph();
    }

    var t0, network, nodeCreateMs, wireMs;

    if (mode === 'js') {
      network = generateNetworkJS(size);
      nodeCreateMs = network.nodeCreateMs;
      wireMs = 0;
    } else {
      t0 = performance.now();
      network = await generateNetworkEngine(size, mode === 'full');
      nodeCreateMs = performance.now() - t0;
      wireMs = 0;
    }

    if (!network || network.totalNodes === 0) {
      warn('Network generation failed for size ' + size);
      return null;
    }

    runUIRefresh();

    var tgMs = measureTempGraph(5);
    var checkMs = measureCycleCheck(network.nodeIds, 1);

    var layoutMs = 0;
    try {
      if (typeof autoLayout !== 'undefined' && autoLayout.run) {
        var lt0 = performance.now();
        autoLayout.run();
        layoutMs = performance.now() - lt0;
      }
    } catch (e) {
      layoutMs = -1;
    }

    runUIRefresh();

    return {
      size: size,
      nodes: network.totalNodes,
      wires: network.wireCount,
      layers: network.layerCount,
      effects: network.effectCount,
      data: network.dataCount,
      misc: network.miscCount,
      nodeMs: nodeCreateMs,
      wireMs: wireMs,
      tgMs: tgMs,
      checkMs: checkMs,
      layoutMs: layoutMs
    };
  }

  async function runStressTest(options) {
    if (window.__stressTestRunning) {
      warn('Stress test already running');
      return;
    }
    window.__stressTestRunning = true;

    options = options || {};
    var mode = options.mode || 'js';
    var sizes = options.sizes || [];

    if (sizes.length === 0) {
      if (mode === 'js') {
        sizes = [10, 20, 50, 100, 200];
      } else if (mode === 'engine') {
        sizes = [5, 10, 15];
      } else {
        sizes = [3, 5, 10];
      }
    }

    log('Starting stress test: mode=' + mode + ' sizes=' + JSON.stringify(sizes));
    log('Initial node count: ' + Object.keys(graphState.getAllNodes()).length);
    log('Initial wire count: ' + Object.keys(graphState.getAllWires()).length);

    var results = [];
    for (var si = 0; si < sizes.length; si++) {
      if (si > 0) {
        await new Promise(function(r) { setTimeout(r, 1000); });
      }
      try {
        var result = await runTest(sizes[si], mode);
        if (result) results.push(result);
      } catch (e) {
        warn('Test failed for size ' + sizes[si] + ': ' + e.message);
        clearGraph();
        await new Promise(function(r) { setTimeout(r, 500); });
      }
    }

    clearGraph();

    var label = 'STRESS TEST RESULTS — mode=' + mode.toUpperCase();
    printTable(results, label);
    printSummary(results, label);

    log('Final node count: ' + Object.keys(graphState.getAllNodes()).length);
    log('Final wire count: ' + Object.keys(graphState.getAllWires()).length);
    log('Stress test complete.');
    window.__stressTestRunning = false;
    
    return results;
  }

  window.runStressTest = runStressTest;
  log('Ready. Run:  runStressTest({ mode: "js" })     — graphState only (10–200 nodes)');
  log('               runStressTest({ mode: "engine" }) — engine API   (5–15 nodes)');
  log('               runStressTest({ mode: "full" })   — engine + wait (3–10 nodes)');
  log('               runStressTest({ mode: "js", sizes: [5,10,20] }) — custom sizes');
})();
