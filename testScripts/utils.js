// testScripts/utils.js
// Phase 2 — utils.jsx function tests (exercised via dispatcher)
// ─────────────────────────────────────────────────────────
// HOW TO RUN:
//   1. Open the Procedia panel in AE (with any project open)
//   2. Right-click the panel → Inspect Element → Console tab
//   3. Paste this entire file and press Enter
//   4. Click the AE window once (evalScript callbacks fire on AE focus)
//   5. Switch back to console to see results
// ─────────────────────────────────────────────────────────
// Functions under test:
//   findOrCreateReservedComp  → exercised by createComp (step 1)
//   findCompByUUID            → exercised by createTextLayer (step 2)
//   findLayerByUUID           → exercised by setLayerProperty (step 3)
//   setPropertyByKey          → exercised by setLayerProperty (step 3)
//   moveLayerToComp + findOrCreateReservedComp → exercised by parkLayer (step 4)
//   findReservedComp + moveLayerToComp         → exercised by unparkLayer (step 5)
//   deleteParkedLayer                          → exercised by step 6
// ─────────────────────────────────────────────────────────

(function utilsTests() {
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
      console.log('%c Phase 2 COMPLETE — ' + pass + '/' + results.length + ' passed', 'color:green;font-weight:bold');
    } else {
      console.error('Phase 2 INCOMPLETE — ' + fail + ' failed, ' + pass + '/' + results.length + ' passed');
    }
  }

  var compUUID = 'PROC-TEST-utils-comp-01';
  var textUUID = 'PROC-TEST-utils-text-01';

  // Step 1: createComp
  // Exercises: findOrCreateReservedComp (creates Reserved comp + Procedia folder on first run)
  evalBridge.dispatch({
    action: 'createComp',
    params: {
      nodeUUID: compUUID,
      label: '_utils_test_comp_',
      width: 1920, height: 1080, fps: 24, duration: 5,
      bgColor: [0, 0, 0]
    }
  }).then(function(res) {
    check('1. findOrCreateReservedComp: comp created ok',              res.ok === true);
    check('1. findOrCreateReservedComp: data.compName returned',       typeof res.data.compName === 'string');

    // Step 2: createTextLayer
    // Exercises: findCompByUUID (looks up hostingCompUUID)
    return evalBridge.dispatch({
      action: 'createTextLayer',
      params: {
        nodeUUID: textUUID,
        hostingCompUUID: compUUID,
        content: 'utils test',
        fontSize: 72,
        color: [1, 1, 1, 1],
        position: [960, 540],
        rotation: 0,
        opacity: 100,
        label: 'Utils Text'
      }
    });
  }).then(function(res) {
    check('2. findCompByUUID: text layer created in correct comp',  res.ok === true);
    check('2. findCompByUUID: data.layerName returned',             typeof res.data.layerName === 'string');

    // Step 3a: setLayerProperty (content) — string
    // Exercises: findLayerByUUID, setPropertyByKey 'content'
    return evalBridge.dispatch({
      action: 'setLayerProperty',
      params: { nodeUUID: textUUID, hostingCompUUID: compUUID, key: 'content', value: 'updated content' }
    });
  }).then(function(res) {
    check('3a. findLayerByUUID + setPropertyByKey content: ok',    res.ok === true);
    check('3a. data.key === "content"',                            res.data && res.data.key === 'content');

    // Step 3b: setLayerProperty (opacity) — number
    // Exercises: setPropertyByKey 'opacity'
    return evalBridge.dispatch({
      action: 'setLayerProperty',
      params: { nodeUUID: textUUID, hostingCompUUID: compUUID, key: 'opacity', value: 50 }
    });
  }).then(function(res) {
    check('3b. setPropertyByKey opacity: ok',                      res.ok === true);

    // Step 4: parkLayer
    // Exercises: findLayerByUUID (in host comp), findOrCreateReservedComp, moveLayerToComp
    return evalBridge.dispatch({
      action: 'parkLayer',
      params: { nodeUUID: textUUID, hostingCompUUID: compUUID }
    });
  }).then(function(res) {
    check('4. moveLayerToComp (park to reserved): ok',             res.ok === true);
    check('4. parked UUID in response matches',                    res.data && res.data.parked === textUUID);

    // Confirm layer is gone from host comp (setLayerProperty should fail)
    return evalBridge.dispatch({
      action: 'setLayerProperty',
      params: { nodeUUID: textUUID, hostingCompUUID: compUUID, key: 'opacity', value: 100 }
    });
  }).then(function(res) {
    check('4b. layer confirmed absent from host comp after park',   res.ok === false);

    // Step 5: unparkLayer
    // Exercises: findReservedComp, findLayerByUUID (in reserved), findCompByUUID, moveLayerToComp
    return evalBridge.dispatch({
      action: 'unparkLayer',
      params: { nodeUUID: textUUID, hostingCompUUID: compUUID }
    });
  }).then(function(res) {
    check('5. findReservedComp + moveLayerToComp (unpark): ok',    res.ok === true);
    check('5. unparked UUID in response matches',                  res.data && res.data.unparked === textUUID);

    // Confirm layer is back in host comp (setLayerProperty should succeed)
    return evalBridge.dispatch({
      action: 'setLayerProperty',
      params: { nodeUUID: textUUID, hostingCompUUID: compUUID, key: 'opacity', value: 100 }
    });
  }).then(function(res) {
    check('5b. layer confirmed back in host comp after unpark',    res.ok === true);

    // Step 6: park again → deleteParkedLayer
    // Exercises: findLayerByUUID on reserved comp, layer.remove()
    return evalBridge.dispatch({
      action: 'parkLayer',
      params: { nodeUUID: textUUID, hostingCompUUID: compUUID }
    });
  }).then(function() {
    return evalBridge.dispatch({
      action: 'deleteParkedLayer',
      params: { nodeUUID: textUUID }
    });
  }).then(function(res) {
    check('6. deleteParkedLayer: layer deleted from reserved',     res.ok === true);
    check('6. deleted UUID in response matches',                   res.data && res.data.deleted === textUUID);

    // Confirm layer gone — unpark should fail (not found in reserved)
    return evalBridge.dispatch({
      action: 'unparkLayer',
      params: { nodeUUID: textUUID, hostingCompUUID: compUUID }
    });
  }).then(function(res) {
    check('6b. layer confirmed gone from reserved after delete',   res.ok === false);

    // Step 7: deleteComp — also tests idempotent delete (call twice)
    return evalBridge.dispatch({
      action: 'deleteComp',
      params: { nodeUUID: compUUID }
    });
  }).then(function(res) {
    check('7. deleteComp: test comp removed',                      res.ok === true);

    // Call deleteComp again on the same UUID — must still return ok (idempotent)
    return evalBridge.dispatch({
      action: 'deleteComp',
      params: { nodeUUID: compUUID }
    });
  }).then(function(res) {
    check('7b. deleteComp idempotent: ok on already-deleted comp', res.ok === true);

    summary();
  }).catch(function(err) {
    console.error('[utils tests] unexpected bridge error:', err);
    summary();
  });

})();
