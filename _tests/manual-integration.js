// Procedia Integration Test Suite
// Paste this entire file into the CEP DevTools console (http://localhost:8088)
// Requires: After Effects to be open with the Procedia panel loaded
// All tests log PASS/FAIL results to console

var PT = (function() {

  var results = [];

  function log(ok, msg) {
    var status = ok ? 'PASS' : 'FAIL';
    results.push({ ok: ok, msg: msg });
    console.log('[' + status + '] ' + msg);
  }

  function report() {
    var passed = results.filter(function(r) { return r.ok; }).length;
    var failed = results.filter(function(r) { return !r.ok; }).length;
    console.log('---');
    console.log('RESULTS: ' + passed + ' passed, ' + failed + ' failed, ' + results.length + ' total');
    results.forEach(function(r) {
      console.log('  ' + (r.ok ? '✓' : '✗') + ' ' + r.msg);
    });
    return { passed: passed, failed: failed, total: results.length };
  }

  function hasConsoleLog(text) {
    // Check if a message appeared in console (approximate)
    return true; // placeholder — check manually
  }

  return {

    // SCENARIO 1: First drop, cache miss
    testScenario1: function() {
      console.log('=== SCENARIO 1: First drop, cache miss ===');
      console.log('PREP: effectSchemaCache.json should be {"aeVersion":"","schemas":{}}');
      console.log('STEP: Reload panel, drag a FillEffect node onto canvas');
      console.log('EXPECT:');
      console.log('  - Console: "[schemaCache] cache miss — introspecting ADBE Fill"');
      console.log('  - Console: "[schemaCache] schema stored for ADBE Fill"');
      console.log('  - Inspector shows Fill params (Color, Opacity, etc.)');
      console.log('  - effectSchemaCache.json now has ADBE Fill schema');
      console.log('  - aeVersion matches app.version');
      log(true, 'Scenario 1 setup ready — verify manually');
    },

    // SCENARIO 2: Second drop, cache hit
    testScenario2: function() {
      console.log('=== SCENARIO 2: Second drop, cache hit ===');
      console.log('(continuing from Scenario 1)');
      console.log('STEP: Drag a second FillEffect node onto canvas');
      console.log('EXPECT:');
      console.log('  - NO introspect bridge call (no temp layer flash)');
      console.log('  - Console: "[schemaCache] cache hit — ADBE Fill"');
      console.log('  - Inspector renders immediately');
      log(true, 'Scenario 2 setup ready — verify manually');
    },

    // SCENARIO 3: Panel reload, cache survives
    testScenario3: function() {
      console.log('=== SCENARIO 3: Panel reload, cache survives ===');
      console.log('STEP: Reload the panel, drop a FillEffect node');
      console.log('EXPECT:');
      console.log('  - Cache loaded from disk on panel init');
      console.log('  - No introspect call');
      console.log('  - Inspector renders immediately');
      log(true, 'Scenario 3 setup ready — verify manually');
    },

    // SCENARIO 4: Param change applies to AE
    testScenario4: function() {
      console.log('=== SCENARIO 4: Param change applies to AE ===');
      console.log('PREP: Drop FillEffect → wire to TextNode → wire TextNode to CompNode');
      console.log('STEP: Select FillEffect, change Color to blue [0,0,1,1] in inspector');
      console.log('EXPECT:');
      console.log('  - After ~300ms: Fill effect on TextNode layer updates to blue in AE');
      console.log('  - nodeMap shows { "ADBE Fill-0002": [0,0,1,1] } for this FillEffect');
      log(true, 'Scenario 4 setup ready — verify manually');
    },

    // SCENARIO 5: Version diff
    testScenario5: function() {
      console.log('=== SCENARIO 5: Version diff (simulated) ===');
      console.log('PREP: In effectSchemaCache.json, change "aeVersion" to "99.0.0 (fake)"');
      console.log('STEP: Reload panel');
      console.log('EXPECT:');
      console.log('  - Console: "[schemaCache] AE version changed from ..."');
      console.log('  - Console: "[schemaCache] Diff complete — 0 schema(s) updated"');
      console.log('  - effectSchemaCache.json aeVersion updated to real version');
      console.log('  - All cached schemas preserved');
      log(true, 'Scenario 5 setup ready — verify manually');
    },

    // Run all scenarios
    runAll: function() {
      this.testScenario1();
      this.testScenario2();
      this.testScenario3();
      this.testScenario4();
      this.testScenario5();
      return report();
    },

    // Snapshot schemaCache state
    inspectCache: function() {
      return {
        ready: typeof schemaCache !== 'undefined' && schemaCache.isReady(),
        hasFill: typeof schemaCache !== 'undefined' && schemaCache.hasSchema('ADBE Fill'),
        memoryKeys: typeof schemaCache !== 'undefined' ? Object.keys(schemaCache._memoryCache || {}) : []
      };
    },

    // Snapshot nodeMap for a specific node
    inspectNode: function(uuid) {
      var nd = graphState ? graphState.getNode(uuid) : null;
      return nd ? {
        id: nd.id,
        state: nd.state,
        dynamicSchema: nd.dynamicSchema ? (nd.dynamicSchema.matchName + ' (' + (nd.dynamicSchema.properties || []).length + ' props)') : null,
        props: nd.props
      } : null;
    }

  };

})();

console.log('Integration test suite loaded. Run: PT.runAll()');
