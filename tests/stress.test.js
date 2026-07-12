import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { loadGlobalScript } from './setup.js';

loadGlobalScript('data/uuidGenerator.js');
loadGlobalScript('graph/nodeRegistry.js');
loadGlobalScript('graph/graphState/state.js');
loadGlobalScript('graph/graphState/tempGraph.js');
loadGlobalScript('graph/graphState/nodes.js');
loadGlobalScript('graph/graphState/wires.js');
loadGlobalScript('graph/graphState/props.js');
loadGlobalScript('graph/graphState/selection.js');
loadGlobalScript('graph/graphState/graphOps.js');
loadGlobalScript('graph/graphState/index.js');

loadGlobalScript('graph/cycleChecker.js');

loadGlobalScript('graph/autoLayout/constants.js');
loadGlobalScript('graph/autoLayout/estimateHeight.js');
loadGlobalScript('graph/autoLayout/graphBuilder.js');
loadGlobalScript('graph/autoLayout/layerAssignment.js');
loadGlobalScript('graph/autoLayout/crossingReduction.js');
loadGlobalScript('graph/autoLayout/positioning.js');
loadGlobalScript('graph/autoLayout/index.js');

loadGlobalScript('graph/nodes/categories/Core/Comp.js');
loadGlobalScript('graph/nodes/categories/Core/Footage.js');
loadGlobalScript('graph/nodes/categories/Core/Merge.js');
loadGlobalScript('graph/nodes/categories/Core/Multimerge.js');
loadGlobalScript('graph/nodes/categories/Data/Color.js');
loadGlobalScript('graph/nodes/categories/Data/Number.js');
loadGlobalScript('graph/nodes/categories/Layers/Adjustment.js');
loadGlobalScript('graph/nodes/categories/Layers/Null.js');
loadGlobalScript('graph/nodes/categories/Layers/Shape.js');
loadGlobalScript('graph/nodes/categories/Layers/Text.js');
loadGlobalScript('graph/nodes/categories/Effects/utility/Blending.js');
loadGlobalScript('graph/nodes/categories/TrackMatte/MatteAlpha.js');
loadGlobalScript('graph/nodes/categories/TrackMatte/MatteLuma.js');

var EFFECT_STUBS = [
  { type: 'blur-sharpen/gaussian-blur', label: 'Gaussian Blur', category: 'Blur & Sharpen', nodeKind: 'effector', dedicated: false, matchName: 'ADBE Gaussian Blur', params: 'dynamic', ports: [{ id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true }, { id: 'output', category: 'output', type: 'layer', capacity: 'single' }] },
  { type: 'blur-sharpen/directional-blur', label: 'Directional Blur', category: 'Blur & Sharpen', nodeKind: 'effector', dedicated: false, matchName: 'ADBE Directional Blur', params: 'dynamic', ports: [{ id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true }, { id: 'output', category: 'output', type: 'layer', capacity: 'single' }] },
  { type: 'color-correction/curves', label: 'Curves', category: 'Color Correction', nodeKind: 'effector', dedicated: false, matchName: 'ADBE Curves', params: 'dynamic', ports: [{ id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true }, { id: 'output', category: 'output', type: 'layer', capacity: 'single' }] },
  { type: 'color-correction/hue-saturation', label: 'Hue/Saturation', category: 'Color Correction', nodeKind: 'effector', dedicated: false, matchName: 'ADBE Hue Saturation', params: 'dynamic', ports: [{ id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true }, { id: 'output', category: 'output', type: 'layer', capacity: 'single' }] },
  { type: 'distort/bulge', label: 'Bulge', category: 'Distort', nodeKind: 'effector', dedicated: false, matchName: 'ADBE Bulge', params: 'dynamic', ports: [{ id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true }, { id: 'output', category: 'output', type: 'layer', capacity: 'single' }] },
  { type: 'distort/cc-bender', label: 'CC Bender', category: 'Distort', nodeKind: 'effector', dedicated: false, matchName: 'CC Bender', params: 'dynamic', ports: [{ id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true }, { id: 'output', category: 'output', type: 'layer', capacity: 'single' }] },
  { type: 'generate/4-color-gradient', label: '4-Color Gradient', category: 'Generate', nodeKind: 'effector', dedicated: false, matchName: 'ADBE 4ColorGradient', params: 'dynamic', ports: [{ id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true }, { id: 'output', category: 'output', type: 'layer', capacity: 'single' }] },
  { type: 'stylize/glow', label: 'Glow', category: 'Stylize', nodeKind: 'effector', dedicated: false, matchName: 'ADBE Glo2', params: 'dynamic', ports: [{ id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true }, { id: 'output', category: 'output', type: 'layer', capacity: 'single' }] },
  { type: 'time/echo', label: 'Echo', category: 'Time', nodeKind: 'effector', dedicated: false, matchName: 'ADBE Echo', params: 'dynamic', ports: [{ id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true }, { id: 'output', category: 'output', type: 'layer', capacity: 'single' }] },
  { type: 'simulation/cc-particle-world', label: 'CC Particle World', category: 'Simulation', nodeKind: 'effector', dedicated: false, matchName: 'CC Particle World', params: 'dynamic', ports: [{ id: 'main_input', category: 'mainInput', type: 'layer', capacity: 'single', required: true }, { id: 'output', category: 'output', type: 'layer', capacity: 'single' }] }
];

describe('plugin stress test', function() {
  var results = [];
  var LAYER_TYPES = ['layers/text', 'layers/null', 'layers/shape', 'layers/adjustment'];
  var EFFECT_TYPES = EFFECT_STUBS.map(function(s) { return s.type; });
  var DATA_TYPES = ['data/number', 'data/color'];
  var MISC_TYPES = ['utility/blending', 'utility/matte-alpha', 'utility/matte-luma', 'utility/merge', 'utility/multimerge'];
  var NETWORK_SIZES = [10, 20, 50, 100, 200];
  var deepResults = [];

  beforeAll(function() {
    EFFECT_STUBS.forEach(function(stub) {
      if (typeof nodeRegistry !== 'undefined' && nodeRegistry.registerStub) {
        nodeRegistry.registerStub(stub);
      }
    });
    window.settings = { get: function(k) {
      if (k === 'layoutDirection') return 'LR';
      if (k === 'layoutHSpacing') return 80;
      if (k === 'layoutVSpacing') return 40;
      return null;
    }};
    window.undoManager = { reset: function() {}, capture: function() {}, commit: function() {} };
    window.keyframeState = { reset: function() {}, clearKeyframes: function() {}, hasKeyframes: function() { return false; } };
    window.dirtyFlusher = { schedule: function() {}, flush: function() {} };
    window.envSnapshot = { addAction: function() {} };
  });

  afterAll(function() {
    console.log('\n=== STRESS TEST: NETWORK GENERATION ===\n');
    console.log('| Size | Nodes | Wires | L | E | D | M | Node(ms) | Wire(ms) | TGraph(ms) | Check(ms) | Layout(ms) | Clear(ms) |');
    console.log('|------|-------|-------|---|---|---|---|----------|----------|------------|-----------|------------|-----------|');
    results.forEach(function(r) {
      console.log('| ' + r.size + ' | ' + r.nodes + ' | ' + r.wires + ' | ' + r.layers + ' | ' + r.effects + ' | ' + r.data + ' | ' + r.misc + ' | ' + r.nodeCreateMs.toFixed(3) + ' | ' + r.wireCreateMs.toFixed(3) + ' | ' + r.tempGraphMs.toFixed(3) + ' | ' + r.cycleCheckMs.toFixed(3) + ' | ' + r.autoLayoutMs.toFixed(3) + ' | ' + r.clearMs.toFixed(3) + ' |');
    });
    console.log('\nPer-operation metrics:');
    console.log('| Size | ms/node | ms/wire | ms/tempGraphBuild | ms/allPairsCheck | ms/layout | hasCycle/wire(ms) |');
    console.log('|------|---------|---------|-------------------|------------------|-----------|-------------------|');
    results.forEach(function(r) {
      console.log('| ' + r.size + ' | ' + (r.nodeCreateMs / r.nodes).toFixed(4) + ' | ' + (r.wireCreateMs / r.wires).toFixed(4) + ' | ' + (r.tempGraphMs).toFixed(4) + ' | ' + (r.cycleCheckMs).toFixed(4) + ' | ' + (r.autoLayoutMs).toFixed(4) + ' | ' + (r.cycleSingleCheckMs).toFixed(6) + ' |');
    });

    console.log('\n=== STRESS TEST: TOPOLOGY EXTREMES (~100 nodes) ===\n');
    console.log('| Topology | Nodes | Wires | Layers | Check(us) | Layout(ms) |');
    console.log('|----------|-------|-------|--------|-----------|------------|');
    deepResults.forEach(function(r) {
      console.log('| ' + r.label + ' | ' + r.nodes + ' | ' + r.wires + ' | ' + r.numLayers + ' | ' + r.checkUs.toFixed(2) + ' | ' + r.layoutMs.toFixed(2) + ' |');
    });

    console.log('\n=== STRESS TEST: loadGraph PERFORMANCE ===\n');
    if (results.length > 0) {
      var big = results[results.length - 1];
      console.log('loadGraph(' + big.nodes + ' nodes, ' + big.wires + ' wires): ' + (big.loadGraphMs || 'N/A') + ' ms');
    }

    console.log('\n=== STRESS TEST: KEY FINDINGS ===');
    var last = results[results.length - 1];
    if (last) {
      console.log('- Cycle checker all-pairs O(n^2): ' + last.cycleCheckMs.toFixed(1) + 'ms for ' + last.nodes + ' nodes');
      console.log('- Per-wire hasCycle cost: ' + (last.cycleSingleCheckMs * 1000).toFixed(3) + ' us');
      console.log('- AutoLayout: ' + last.autoLayoutMs.toFixed(2) + 'ms for ' + last.nodes + ' nodes');
      console.log('- TempGraph rebuild: ' + last.tempGraphMs.toFixed(4) + 'ms per build');
      console.log('- Node creation: ' + (last.nodeCreateMs / last.nodes).toFixed(4) + 'ms per node');
      console.log('- Wire creation: ' + (last.wireCreateMs / last.wires).toFixed(4) + 'ms per wire');
    }
    console.log('\n=== END STRESS TEST RESULTS ===\n');
    expect(results.length).toBeGreaterThan(0);
  });

  function buildProps(def) {
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

  function makeNode(type, x, y) {
    var def = nodeRegistry.getDefinition(type);
    if (!def) return null;
    var id = uuidGenerator.node();
    var nodeData = {
      id: id, type: type,
      nodeKind: def.nodeKind,
      dedicated: !!def.dedicated,
      state: (def.nodeKind === 'data' || def.nodeKind === 'blending' || def.nodeKind === 'matte' || def.nodeKind === 'merge' || def.nodeKind === 'multimerge') ? 'alive' : 'ghost',
      dirty: false, x: x, y: y,
      props: buildProps(def),
      hostingComps: [], hasParkedLayer: false,
      dynamicSchema: null, secondaryPorts: null,
      locked: false, disabled: false
    };
    graphState.addNode(nodeData);
    return id;
  }

  function makeWire(fromNode, fromPort, toNode, toPort, type) {
    var id = uuidGenerator.wire();
    graphState.addWire({
      id: id, type: type || 'layer',
      fromNode: fromNode, fromPort: fromPort,
      toNode: toNode, toPort: toPort,
      boundParam: null, _pathLayerUUID: null
    });
    return id;
  }

  function measureTempGraphRebuild(iterations) {
    iterations = iterations || 1;
    var start = performance.now();
    for (var ti = 0; ti < iterations; ti++) {
      graphState.getTempGraph();
    }
    return (performance.now() - start);
  }

  function measureCycleCheckAll(nodeIds) {
    var start = performance.now();
    for (var a = 0; a < nodeIds.length; a++) {
      for (var b = 0; b < nodeIds.length; b++) {
        if (a !== b) cycleChecker.hasCycle(nodeIds[a], nodeIds[b]);
      }
    }
    return (performance.now() - start);
  }

  function measureCycleCheckSingle(nodeIds, iterations) {
    iterations = iterations || 100;
    var a = 0, b = nodeIds.length - 1;
    if (a === b) b = 1;
    var start = performance.now();
    for (var ci = 0; ci < iterations; ci++) {
      cycleChecker.hasCycle(nodeIds[a], nodeIds[b]);
    }
    return (performance.now() - start) / iterations;
  }

  function generateNetwork(targetCount) {
    var compId = makeNode('core/comp', 400, 300);
    if (!compId) return null;
    graphState.updateNode(compId, { state: 'alive' });

    var remaining = targetCount - 1;
    if (remaining <= 0) return { compId: compId, layerIds: [], effectIds: [], dataIds: [], miscIds: [], wireCount: 0 };

    var numLayers = Math.max(1, Math.round(remaining * 0.30));
    var numEffects = Math.round(remaining * 0.45);
    var numData = Math.round(remaining * 0.10);
    var numMisc = remaining - numLayers - numEffects - numData;
    if (numMisc < 0) { numEffects += numMisc; numMisc = 0; }
    if (numEffects < 0) { numLayers += numEffects; numEffects = 0; }

    var layerIds = [];
    for (var li = 0; li < numLayers; li++) {
      var lt = LAYER_TYPES[Math.floor(Math.random() * LAYER_TYPES.length)];
      var lid = makeNode(lt, 50 + Math.random() * 200, 50 + Math.random() * 500);
      if (lid) layerIds.push(lid);
    }

    var effectIds = [];
    for (var ei = 0; ei < numEffects; ei++) {
      var t = EFFECT_TYPES[Math.floor(Math.random() * EFFECT_TYPES.length)];
      var id = makeNode(t, 250 + Math.random() * 200, 50 + Math.random() * 500);
      if (id) effectIds.push(id);
    }

    var dataIds = [];
    for (var di = 0; di < numData; di++) {
      var dt = DATA_TYPES[Math.floor(Math.random() * DATA_TYPES.length)];
      var did = makeNode(dt, 0, 50 + Math.random() * 500);
      if (did) dataIds.push(did);
    }

    var miscIds = [];
    for (var mi = 0; mi < numMisc; mi++) {
      var mt = MISC_TYPES[Math.floor(Math.random() * MISC_TYPES.length)];
      var id = makeNode(mt, 500 + Math.random() * 100, 50 + Math.random() * 500);
      if (id) miscIds.push(id);
    }

    var allEffectors = [].concat(effectIds);
    var wireCount = 0;

    var usedEffects = {};
    for (var li2 = 0; li2 < layerIds.length; li2++) {
      var chainLen = Math.min(
        Math.floor(Math.random() * 3) + 1,
        effectIds.filter(function(id) { return !usedEffects[id]; }).length
      );
      var chain = [];
      for (var ci = 0; ci < chainLen; ci++) {
        var avail = effectIds.filter(function(id) { return !usedEffects[id]; });
        if (avail.length === 0) break;
        var picked = avail[Math.floor(Math.random() * avail.length)];
        usedEffects[picked] = true;
        chain.push(picked);
      }

      var prev = layerIds[li2];
      if (chain.length === 0) {
        makeWire(prev, 'output', compId, 'main_input', 'layer');
        wireCount++;
      } else {
        for (var cj = 0; cj < chain.length; cj++) {
          makeWire(prev, 'output', chain[cj], 'main_input', 'layer');
          wireCount++;
          prev = chain[cj];
        }
        makeWire(prev, 'output', compId, 'main_input', 'layer');
        wireCount++;
      }
    }

    var unusedEffects = effectIds.filter(function(id) { return !usedEffects[id]; });
    for (var ui = 0; ui < unusedEffects.length; ui++) {
      if (layerIds.length > 0) {
        var srcLayer = layerIds[ui % layerIds.length];
        makeWire(srcLayer, 'output', unusedEffects[ui], 'main_input', 'layer');
        wireCount++;
        makeWire(unusedEffects[ui], 'output', compId, 'main_input', 'layer');
        wireCount++;
      }
    }

    for (var di2 = 0; di2 < dataIds.length; di2++) {
      if (allEffectors.length === 0) break;
      var target = allEffectors[di2 % allEffectors.length];
      makeWire(dataIds[di2], 'output', target, 'data_input', 'data');
      wireCount++;
    }

    for (var mi2 = 0; mi2 < miscIds.length; mi2++) {
      var mNode = graphState.getNode(miscIds[mi2]);
      if (!mNode) continue;
      if (mNode.nodeKind === 'blending') {
        if (layerIds.length > 0) {
          var bl = layerIds[mi2 % layerIds.length];
          makeWire(bl, 'output', miscIds[mi2], 'main_input', 'layer');
          wireCount++;
          makeWire(miscIds[mi2], 'output', compId, 'main_input', 'layer');
          wireCount++;
        }
      } else if (mNode.nodeKind === 'merge') {
        if (layerIds.length >= 2) {
          var ma = layerIds[mi2 % layerIds.length];
          var mb = layerIds[(mi2 + 1) % layerIds.length];
          makeWire(ma, 'output', miscIds[mi2], 'input_a', 'layer');
          wireCount++;
          makeWire(mb, 'output', miscIds[mi2], 'input_b', 'layer');
          wireCount++;
          makeWire(miscIds[mi2], 'output', compId, 'main_input', 'layer');
          wireCount++;
        }
      } else if (mNode.nodeKind === 'multimerge') {
        for (var mmi = 0; mmi < Math.min(3, layerIds.length); mmi++) {
          makeWire(layerIds[(mi2 + mmi) % layerIds.length], 'output', miscIds[mi2], 'main_input', 'layer');
          wireCount++;
        }
        makeWire(miscIds[mi2], 'output', compId, 'main_input', 'layer');
        wireCount++;
      } else if (mNode.nodeKind === 'matte') {
        if (layerIds.length >= 2) {
          var tl = layerIds[mi2 % layerIds.length];
          var ml = layerIds[(mi2 + 1) % layerIds.length];
          makeWire(tl, 'output', miscIds[mi2], 'top_layer', 'layer');
          wireCount++;
          makeWire(ml, 'output', miscIds[mi2], 'matte_layer', 'layer');
          wireCount++;
          makeWire(miscIds[mi2], 'output', compId, 'main_input', 'layer');
          wireCount++;
        }
      }
    }

    var totalNodes = 1 + layerIds.length + effectIds.length + dataIds.length + miscIds.length;
    return {
      compId: compId,
      layerIds: layerIds,
      effectIds: effectIds,
      dataIds: dataIds,
      miscIds: miscIds,
      wireCount: wireCount,
      totalNodes: totalNodes
    };
  }

  NETWORK_SIZES.forEach(function(size) {
    it('generates ' + size + '-node mixed network', function() {
      graphState.clearGraph();

      var t0 = performance.now();
      var network = generateNetwork(size);
      if (!network) return;
      var nodeCreateMs = performance.now() - t0;

      var nodeIds = Object.keys(graphState.getAllNodes());
      var wireMap = graphState.getAllWires();
      var wireIds = Object.keys(wireMap);

      var t2 = performance.now();
      var tempGraphMs = measureTempGraphRebuild(10) / 10;
      var t3 = performance.now();

      var cycleAllMs = measureCycleCheckAll(nodeIds);
      var singleCheckMs = measureCycleCheckSingle(nodeIds, 50);
      var t4 = performance.now();

      graphState.updateNode(network.compId, { state: 'alive' });
      var autoLayoutMs = 0;
      try {
        var lt0 = performance.now();
        if (typeof autoLayout !== 'undefined' && autoLayout.run) {
          autoLayout.run();
        }
        autoLayoutMs = performance.now() - lt0;
      } catch (e) {
        autoLayoutMs = -1;
      }
      var t5 = performance.now();

      var loadGraphMs = 0;
      try {
        var snapshot = JSON.parse(JSON.stringify(graphState.getTempGraph()));
        var lg0 = performance.now();
        graphState.loadGraph(snapshot);
        loadGraphMs = performance.now() - lg0;
      } catch (e) {
        loadGraphMs = -1;
      }

      var tc0 = performance.now();
      graphState.clearGraph();
      var clearMs = performance.now() - tc0;

      var totalNodes = nodeIds.length;

      results.push({
        size: size,
        nodes: totalNodes,
        wires: wireIds.length,
        layers: network.layerIds.length,
        effects: network.effectIds.length,
        data: network.dataIds.length,
        misc: network.miscIds.length,
        nodeCreateMs: nodeCreateMs,
        wireCreateMs: t2 - t0 - nodeCreateMs,
        tempGraphMs: tempGraphMs,
        cycleCheckMs: cycleAllMs,
        cycleSingleCheckMs: singleCheckMs,
        autoLayoutMs: autoLayoutMs,
        loadGraphMs: loadGraphMs,
        clearMs: clearMs
      });

      expect(totalNodes).toBeGreaterThan(0);
      expect(wireIds.length).toBeGreaterThan(0);
    });
  });

  it('compares deep vs wide topology at ~200 nodes', { timeout: 30000 }, function() {
    function buildLinearChains(chains, depth) {
      graphState.clearGraph();
      var compId = makeNode('core/comp', 800, 300);
      graphState.updateNode(compId, { state: 'alive' });
      var totalNodes = 1, totalWires = 0;

      for (var c = 0; c < chains; c++) {
        var prev = makeNode(LAYER_TYPES[c % LAYER_TYPES.length], 50, 100 + c * 30);
        totalNodes++;
        for (var d = 0; d < depth; d++) {
          var eff = makeNode(EFFECT_TYPES[d % EFFECT_TYPES.length], 200 + d * 120, 100 + c * 30);
          totalNodes++;
          makeWire(prev, 'output', eff, 'main_input', 'layer');
          totalWires++;
          prev = eff;
        }
        makeWire(prev, 'output', compId, 'main_input', 'layer');
        totalWires++;
        if (totalNodes >= 200) break;
      }
      return { compId: compId, nodes: totalNodes, wires: totalWires };
    }

    var configs = [
      { label: 'Deep (1 chain x 100 depth)', chains: 1, depth: 100 },
      { label: 'Mid (10 chains x 10 depth)', chains: 10, depth: 10 },
      { label: 'Wide (40 chains x 3 depth)', chains: 40, depth: 3 },
      { label: 'Flat (60 chains x 2 depth)', chains: 60, depth: 2 },
    ];

    configs.forEach(function(cfg) {
      var net = buildLinearChains(cfg.chains, cfg.depth);
      var nodeIds = Object.keys(graphState.getAllNodes());

      var singleCheckUs = 0;
      if (nodeIds.length > 1) {
        var s0 = performance.now();
        for (var si = 0; si < 20; si++) {
          cycleChecker.hasCycle(nodeIds[0], nodeIds[nodeIds.length - 1]);
        }
        singleCheckUs = ((performance.now() - s0) / 20) * 1000;
      }

      var layoutMs = 0;
      try {
        var lt0 = performance.now();
        autoLayout.run();
        layoutMs = performance.now() - lt0;
      } catch (e) { layoutMs = -1; }
      deepResults.push({
        label: cfg.label,
        nodes: net.nodes,
        wires: net.wires,
        numLayers: cfg.chains,
        checkUs: singleCheckUs,
        layoutMs: layoutMs
      });
      graphState.clearGraph();
    });
  });

  it('measures hasCycle on existing large graph', function() {
    graphState.clearGraph();
    var net = generateNetwork(200);
    if (!net) return;
    var nodeIds = Object.keys(graphState.getAllNodes());
    var wireIds = Object.keys(graphState.getAllWires());

    var pairCount = Math.min(500, nodeIds.length * (nodeIds.length - 1));
    var start = performance.now();
    for (var pi = 0; pi < pairCount; pi++) {
      var a = pi % nodeIds.length;
      var b = (pi * 7 + 13) % nodeIds.length;
      if (a !== b) cycleChecker.hasCycle(nodeIds[a], nodeIds[b]);
    }
    var elapsedMs = performance.now() - start;
    var perCheckUs = (elapsedMs / pairCount) * 1000;

    console.log('\n=== hasCycle CALL COST ===');
    console.log('Graph: ' + net.totalNodes + ' nodes, ' + wireIds.length + ' wires');
    console.log('Sampled ' + pairCount + ' pairs');
    console.log('Total: ' + elapsedMs.toFixed(2) + 'ms');
    console.log('Per call: ' + perCheckUs.toFixed(2) + ' us');
    console.log('=== END hasCycle ===\n');

    graphState.clearGraph();
    expect(net.totalNodes).toBe(200);
  });
});
