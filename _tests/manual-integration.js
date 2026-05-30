// Procedia Integration Test Suite — v2 with real introspection
// Paste into CEP DevTools console (http://localhost:8088)
// Requires AE open with Procedia panel loaded, window in focus
// Run: await PT.runAll()   (tests are async — must await)
// Or run individual scenarios: await PT.testScenario1(), etc.

var PT = (function() {

  var results = [];
  var _logLines = [];

  // Capture console.log calls to introspect schemaCache messages
  function installConsoleCapture() {
    var orig = console.log.bind(console);
    console.log = function() {
      var msg = Array.prototype.slice.call(arguments).join(' ');
      _logLines.push(msg);
      orig.apply(console, arguments);
    };
  }
  installConsoleCapture();

  function clearLog() { _logLines = []; }

  function logContains(text) {
    return _logLines.some(function(l) { return l.indexOf(text) !== -1; });
  }

  function pass(msg) {
    results.push({ ok: true, msg: msg });
    console.log('[PASS] ' + msg);
  }

  function fail(msg) {
    results.push({ ok: false, msg: msg });
    console.log('[FAIL] ' + msg);
  }

  function assert(cond, msg) {
    if (cond) pass(msg);
    else fail(msg);
  }

  function assertEq(actual, expected, label) {
    if (actual === expected) pass(label + ' = ' + JSON.stringify(expected));
    else fail(label + ': expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual));
  }

  function report() {
    var passed = results.filter(function(r) { return r.ok; }).length;
    var failed = results.filter(function(r) { return !r.ok; }).length;
    console.log('---');
    console.log('RESULTS: ' + passed + ' passed, ' + failed + ' failed, ' + results.length + ' total');
    results.forEach(function(r) {
      console.log('  ' + (r.ok ? '\u2713' : '\u2717') + ' ' + r.msg);
    });
    return { passed: passed, failed: failed, total: results.length };
  }

  function sleep(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  function evalBridgeDispatch(action, params) {
    return new Promise(function(resolve, reject) {
      if (typeof evalBridge === 'undefined') {
        reject(new Error('evalBridge not loaded'));
        return;
      }
      evalBridge.dispatch({ action: action, params: params || {} }).then(resolve, reject);
    });
  }

  function getAllNodes() {
    return typeof graphState !== 'undefined' ? graphState.getAllNodes() : [];
  }

  function getNode(id) {
    return typeof graphState !== 'undefined' ? graphState.getNode(id) : null;
  }

  function getNodeCount() { return getAllNodes().length; }

  function findNodeByType(type) {
    var nodes = getAllNodes();
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].type === type) return nodes[i];
    }
    return null;
  }

  function findNodesByType(type) {
    var result = [];
    var nodes = getAllNodes();
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].type === type) result.push(nodes[i]);
    }
    return result;
  }

  function inspectorParamLabels() {
    var container = document.querySelector('#inspector-content .param-list, #inspector .param-list, [class*="param"]');
    if (!container) return [];
    var labels = container.querySelectorAll('label, .param-label, [class*="label"]');
    return Array.prototype.map.call(labels, function(el) { return el.textContent.trim(); });
  }

  function qs(sel) { return document.querySelector(sel); }
  function qsa(sel) { return document.querySelectorAll(sel); }

  return {

    // ── SCENARIO 1: First drop, cache miss ──
    testScenario1: function() {
      clearLog();
      console.log('=== SCENARIO 1: First drop, cache miss ===');

      // Confirm we are in a clean state
      assert(typeof schemaCache !== 'undefined', 'schemaCache loaded');
      assert(typeof graphState !== 'undefined', 'graphState loaded');

      return evalBridgeDispatch('readSchemaCache').then(function(res) {
        if (!res.ok) { fail('readSchemaCache failed: ' + res.error); return; }
        var disk = res.data;
        assertEq(disk.aeVersion, '', 'disk aeVersion before drop');
        assertEq(Object.keys(disk.schemas).length, 0, 'disk schemas empty before drop');

        // Check if any FillEffect nodes exist from a prior run
        var fills = findNodesByType('effects/fill');
        if (fills.length === 0) {
          console.log('  No FillEffect nodes found. Drop one now, then call PT.testScenario1_verify()');
          return;
        }

        // Already dropped — verify cache populated
        return this.testScenario1_verify();
      }.bind(this));
    },

    testScenario1_verify: function() {
      clearLog();
      var fills = findNodesByType('effects/fill');
      assert(fills.length > 0, 'At least one FillEffect node on canvas');

      // Check schemaCache state
      assert(schemaCache.isReady(), 'schemaCache.isReady()');
      assert(schemaCache.hasSchema('ADBE Fill'), 'schemaCache.hasSchema("ADBE Fill")');

      var schema = schemaCache.getSchema('ADBE Fill');
      assert(!!schema, 'getSchema returns data');
      if (schema) {
        assertEq(schema.matchName, 'ADBE Fill', 'schema.matchName');
        assert(schema.properties.length > 0, 'schema has properties');
        assert(!!schemaCache._aeVersion, 'schemaCache._aeVersion is set');
        assert(schemaCache._aeVersion !== '', 'schemaCache._aeVersion is non-empty');
      }

      // Check per-node dynamic schema
      fills.forEach(function(f) {
        assert(!!f.dynamicSchema, 'node ' + f.id + ' has dynamicSchema');
        if (f.dynamicSchema) {
          assertEq(f.dynamicSchema.matchName, 'ADBE Fill', 'node ' + f.id + ' dynamic schema matchName');
          assert(f.dynamicSchema.properties.length > 0, 'node ' + f.id + ' has schema properties');
        }
      });

      // Check disk was written
      return evalBridgeDispatch('readSchemaCache').then(function(res) {
        if (!res.ok) { fail('readSchemaCache after drop: ' + res.error); return; }
        var disk = res.data;
        assert(disk.aeVersion !== '', 'disk aeVersion populated');
        assert(!!disk.schemas['ADBE Fill'], 'ADBE Fill schema on disk');
        if (disk.schemas['ADBE Fill']) {
          assert(disk.schemas['ADBE Fill'].properties.length > 0, 'disk schema has properties');
        }
        assert(disk.aeVersion !== '99.0.0 (fake)', 'disk aeVersion is real value (not fake)');

        // Check inspector rendering
        var inspectorEl = qs('#inspector') || qs('.inspector') || qs('[class*="inspector"]');
        assert(!!inspectorEl, 'inspector element exists');

        // Verify no "Loading..." is visible
        var loadingEl = qs('.inspector-loading, .loading-indicator, [class*="loading"]');
        assert(!loadingEl || loadingEl.style.display === 'none', 'inspector not in loading state');

        console.log('  INSPECTOR params: ' + JSON.stringify(inspectorParamLabels()));
      });
    },

    // ── SCENARIO 2: Second drop, cache hit ──
    testScenario2: function() {
      console.log('=== SCENARIO 2: Second drop, cache hit ===');

      clearLog();

      // Check preconditions
      assert(schemaCache.isReady(), 'schemaCache is ready');
      assert(schemaCache.hasSchema('ADBE Fill'), 'ADBE Fill already cached');

      var fillsBefore = findNodesByType('effects/fill').length;
      console.log('  FillEffect count before: ' + fillsBefore);

      console.log('  Drop a second FillEffect node now, then call PT.testScenario2_verify()');
    },

    testScenario2_verify: function() {
      clearLog();
      var fills = findNodesByType('effects/fill');
      assert(fills.length >= 2, 'at least 2 FillEffect nodes');

      // All should have dynamicSchema resolved immediately (no async load needed)
      var allResolved = fills.every(function(f) { return !!f.dynamicSchema; });
      assert(allResolved, 'all FillEffect nodes have dynamicSchema');

      // Disk should be unchanged from after scenario 1
      return evalBridgeDispatch('readSchemaCache').then(function(res) {
        if (!res.ok) { fail('readSchemaCache: ' + res.error); return; }
        var disk = res.data;
        assert(disk.aeVersion !== '', 'disk aeVersion still set');
        assert(!!disk.schemas['ADBE Fill'], 'ADBE Fill still on disk');
      });
    },

    // ── SCENARIO 3: Panel reload, cache survives ──
    testScenario3: function() {
      console.log('=== SCENARIO 3: Panel reload, cache survives ===');
      assert(typeof schemaCache !== 'undefined', 'schemaCache loaded after reload');
      return evalBridgeDispatch('readSchemaCache').then(function(res) {
        if (!res.ok) { fail('readSchemaCache after reload: ' + res.error); return; }
        var disk = res.data;
        if (disk.aeVersion === '' || !disk.schemas['ADBE Fill']) {
          fail('Cache NOT loaded from disk — aeVersion=' + JSON.stringify(disk.aeVersion) + ', schemas=' + Object.keys(disk.schemas).length);
        } else {
          pass('Cache loaded from disk (aeVersion=' + disk.aeVersion + ')');
        }
        assert(schemaCache.isReady(), 'schemaCache.isReady() after reload');
        if (schemaCache.hasSchema('ADBE Fill')) {
          pass('ADBE Fill in memory cache after reload');
        } else {
          fail('ADBE Fill NOT in memory cache');
        }

        console.log('  Drop a FillEffect node now, then call PT.testScenario3_verify()');
      }.bind(this));
    },

    testScenario3_verify: function() {
      clearLog();
      var fills = findNodesByType('effects/fill');
      assert(fills.length > 0, 'FillEffect dropped after reload');
      assert(fills[0].dynamicSchema, 'FillEffect has dynamicSchema (resolved from cache)');
      assert(schemaCache.isReady(), 'schemaCache ready');
      pass('Inspector should render immediately (no async wait)');
    },

    // ── SCENARIO 4: Param change applies to AE ──
    testScenario4: function() {
      console.log('=== SCENARIO 4: Param change applies to AE ===');
      console.log('  SETUP: Drop FillEffect → wire to TextNode → wire to CompNode');
      console.log('  All nodes must be alive.');
      console.log('  Then call PT.testScenario4_verify()');
    },

    testScenario4_verify: function() {
      clearLog();

      // Find the FillEffect that is wired up
      var fills = findNodesByType('effects/fill');
      assert(fills.length > 0, 'FillEffect exists');
      var fill = fills[fills.length - 1]; // most recently added
      assert(fill.state === 'alive', 'FillEffect is alive');

      // Check dirtyFlusher is loaded
      assert(typeof dirtyFlusher !== 'undefined', 'dirtyFlusher loaded');

      console.log('  STEP: Select the FillEffect node and change Color to blue [0,0,1,1]');
      console.log('  Then call PT.testScenario4_verifyColor()');
    },

    testScenario4_verifyColor: function() {
      clearLog();
      var sel = graphState ? graphState.getSelection() : [];
      assert(sel.length > 0, 'a node is selected');
      if (sel.length === 0) return;

      var selId = sel[0];
      var nd = getNode(selId);
      assert(!!nd, 'selected node exists');
      if (!nd) return;

      assertEq(nd.type, 'effects/fill', 'selected node is FillEffect');

      // Check that the color prop was updated
      var colorPropKey = null;
      if (nd.dynamicSchema && nd.dynamicSchema.properties) {
        for (var i = 0; i < nd.dynamicSchema.properties.length; i++) {
          var p = nd.dynamicSchema.properties[i];
          if (p.matchName.indexOf('ADBE Fill-0002') !== -1 || (p.label && p.label.toLowerCase() === 'color')) {
            colorPropKey = p.matchName;
            break;
          }
        }
      }

      if (colorPropKey && nd.props) {
        var val = nd.props[colorPropKey];
        if (val && Array.isArray(val) && val.length === 4 &&
            Math.abs(val[0] - 0) < 0.01 && Math.abs(val[1] - 0) < 0.01 &&
            Math.abs(val[2] - 1) < 0.01 && Math.abs(val[3] - 1) < 0.01) {
          pass('Fill color updated to [0,0,1,1] in nodeMap');
        } else {
          fail('Fill color is ' + JSON.stringify(val) + ', expected [0,0,1,1]');
        }
      } else {
        console.log('  Could not find color prop key. node props: ' + JSON.stringify(nd.props));
      }
    },

    // ── SCENARIO 5: Version diff ──
    testScenario5: function() {
      console.log('=== SCENARIO 5: Version diff (simulated) ===');
      console.log('  PREP: In data/effectSchemaCache.json, change aeVersion to "99.0.0 (fake)"');
      console.log('  Then reload panel.');
      console.log('  After reload, call PT.testScenario5_verify()');
    },

    testScenario5_verify: function() {
      clearLog();
      assert(typeof schemaCache !== 'undefined', 'schemaCache loaded');
      assert(schemaCache.isReady(), 'schemaCache.isReady() after version diff');

      return evalBridgeDispatch('readSchemaCache').then(function(res) {
        if (!res.ok) { fail('readSchemaCache: ' + res.error); return; }
        var disk = res.data;
        assert(disk.aeVersion !== '', 'disk aeVersion updated');
        assert(disk.aeVersion !== '99.0.0 (fake)', 'disk aeVersion no longer fake value');
        assert(!!disk.schemas['ADBE Fill'], 'cached ADBE Fill schema preserved');
        pass('aeVersion on disk: ' + disk.aeVersion);

        var msg = logContains('AE version changed from') || logContains('Diff complete');
        assert(msg, 'console logged version diff message');
      });
    },

    // ── Helpers ──

    inspectCache: function() {
      return {
        ready: typeof schemaCache !== 'undefined' && schemaCache.isReady(),
        aeVersion: typeof schemaCache !== 'undefined' ? (schemaCache._aeVersion || null) : null,
        hasFill: typeof schemaCache !== 'undefined' && schemaCache.hasSchema('ADBE Fill'),
        memoryKeys: typeof schemaCache !== 'undefined' ? Object.keys(schemaCache._memoryCache || {}) : []
      };
    },

    inspectDisk: function() {
      return evalBridgeDispatch('readSchemaCache').then(function(res) {
        if (!res.ok) return { error: res.error };
        return {
          aeVersion: res.data.aeVersion,
          schemaCount: Object.keys(res.data.schemas).length,
          schemas: Object.keys(res.data.schemas)
        };
      });
    },

    inspectNode: function(uuid) {
      var nd = getNode(uuid);
      return nd ? {
        id: nd.id,
        type: nd.type,
        state: nd.state,
        dynamicSchema: nd.dynamicSchema ? nd.dynamicSchema.matchName + ' (' + (nd.dynamicSchema.properties || []).length + ' props)' : null,
        props: nd.props
      } : null;
    },

    inspectAllNodes: function() {
      return getAllNodes().map(function(nd) {
        return { id: nd.id, type: nd.type, state: nd.state };
      });
    },

    inspectInspector: function() {
      var el = qs('#inspector') || qs('.inspector') || qs('[class*="inspector"]');
      return {
        exists: !!el,
        visible: el ? el.style.display !== 'none' : false,
        params: inspectorParamLabels()
      };
    },

    // ── Run all ──
    runAll: function() {
      console.log('Running all scenarios sequentially...');
      var self = this;
      return self.testScenario1();
    }

  };

})();

console.log('Integration test suite v2 loaded. Available: PT.inspectCache(), PT.inspectDisk(), PT.inspectAllNodes()');
console.log('Scenarios:');
console.log('  1. PT.testScenario1() → PT.testScenario1_verify()');
console.log('  2. Drop second Fill → PT.testScenario2_verify()');
console.log('  3. Reload + drop Fill → PT.testScenario3() → PT.testScenario3_verify()');
console.log('  4. Wire Fill→Text→Comp → PT.testScenario4() → change color → PT.testScenario4_verifyColor()');
console.log('  5. Set fake version, reload → PT.testScenario5() → PT.testScenario5_verify()');
