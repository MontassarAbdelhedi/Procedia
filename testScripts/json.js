// testScripts/json.js
// Phase 1 — json.jsx polyfill tests
// ─────────────────────────────────────────────────────────
// HOW TO RUN:
//   1. Open the Procedia panel in AE
//   2. Right-click the panel → Inspect Element → Console tab
//   3. Paste this entire file and press Enter
//   4. Click the AE window once (evalScript callbacks fire on AE focus)
//   5. Switch back to the console to see results
// ─────────────────────────────────────────────────────────

(function jsonTests() {
  var results = [];

  function check(label, condition) {
    results.push({ label: label, pass: condition });
    if (condition) {
      console.log('%c  PASS  ' + label, 'color: green');
    } else {
      console.error('  FAIL  ' + label);
    }
  }

  function summary() {
    var pass = results.filter(function(r) { return r.pass; }).length;
    var fail = results.length - pass;
    console.log('─────────────────────────────────────────');
    if (fail === 0) {
      console.log('%c Phase 1 COMPLETE — ' + pass + '/' + results.length + ' passed', 'color:green;font-weight:bold');
    } else {
      console.error('Phase 1 INCOMPLETE — ' + fail + ' failed, ' + pass + '/' + results.length + ' passed');
    }
  }

  var p1, p2, p3, p4;

  // Test 1: basic object round-trip
  // Exercises: browser JSON.stringify → AE JSON.parse → AE JSON.stringify → browser JSON.parse
  p1 = evalBridge.dispatch({
    action: 'createComp',
    params: {
      nodeUUID: 'PROC-TEST-json-0001',
      label: '_json_test_basic_',
      width: 100, height: 100, fps: 24, duration: 1,
      bgColor: [0, 0, 0]
    }
  }).then(function(res) {
    check('1. basic object round-trip: ok', res.ok === true);
    check('1. basic object round-trip: data.compName is string', typeof res.data.compName === 'string');
  });

  // Test 2: array values survive the round-trip
  // bgColor [r,g,b] is an array — confirms JSON array serialization works
  p2 = evalBridge.dispatch({
    action: 'createComp',
    params: {
      nodeUUID: 'PROC-TEST-json-0002',
      label: '_json_test_array_',
      width: 100, height: 100, fps: 24, duration: 1,
      bgColor: [0.25, 0.5, 0.75]
    }
  }).then(function(res) {
    check('2. array in params (bgColor [0.25, 0.5, 0.75]): ok', res.ok === true);
  });

  // Test 3: special characters in string values
  // Double quotes, backslash, and unicode em-dash must survive escape/unescape
  p3 = evalBridge.dispatch({
    action: 'createComp',
    params: {
      nodeUUID: 'PROC-TEST-json-0003',
      label: 'test — "quoted" \\ backslash',
      width: 100, height: 100, fps: 24, duration: 1,
      bgColor: [0, 0, 0]
    }
  }).then(function(res) {
    check('3. special chars (quotes, backslash, unicode \\u2014): ok', res.ok === true);
  });

  // Test 4: dispatchBatch — verifies JSON array-of-objects serialization
  p4 = evalBridge.dispatchBatch([
    { action: 'focusComp', params: { nodeUUID: '__no_such_comp_a__' } },
    { action: 'focusComp', params: { nodeUUID: '__no_such_comp_b__' } }
  ]).then(function(res) {
    check('4. dispatchBatch: result is object',       typeof res === 'object');
    check('4. dispatchBatch: data is array',          Array.isArray(res.data));
    check('4. dispatchBatch: data has 2 items',       res.data.length === 2);
    check('4. dispatchBatch: each item is an object', typeof res.data[0] === 'object' && typeof res.data[1] === 'object');
    check('4. dispatchBatch: error strings present',  typeof res.data[0].error === 'string' && typeof res.data[1].error === 'string');
  });

  // Cleanup then summary
  Promise.all([p1, p2, p3, p4]).then(function() {
    return evalBridge.dispatchBatch([
      { action: 'deleteComp', params: { nodeUUID: 'PROC-TEST-json-0001' } },
      { action: 'deleteComp', params: { nodeUUID: 'PROC-TEST-json-0002' } },
      { action: 'deleteComp', params: { nodeUUID: 'PROC-TEST-json-0003' } }
    ]);
  }).then(function() {
    summary();
  }).catch(function(err) {
    console.error('[json tests] unexpected bridge error:', err);
    summary();
  });

})();
