// Procedia Panel Test Runner
// Injects a test panel overlay into the Procedia UI.
// No DevTools needed — run tests directly within AE.

(function() {

  // ── Guard ──
  if (document.getElementById('procedia-test-runner')) return;

  // ── State ──
  var _log = [];
  var _results = [];

  function log(msg) {
    _log.push(msg);
    console.log('[TestRunner] ' + msg);
  }

  function clearLog() { _log = []; }

  function logContains(text) {
    for (var i = 0; i < _log.length; i++) {
      if (_log[i].indexOf(text) !== -1) return true;
    }
    return false;
  }

  function pass(msg) {
    _results.push({ ok: true, msg: msg });
    updateResults();
  }

  function fail(msg) {
    _results.push({ ok: false, msg: msg });
    updateResults();
  }

  function assert(cond, msg) {
    if (cond) pass(msg); else fail(msg);
  }

  function assertEq(a, b, label) {
    if (a === b) pass(label + ' = ' + JSON.stringify(b));
    else fail(label + ': expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
  }

  function evalBridgeDispatch(action, params) {
    return new Promise(function(resolve, reject) {
      if (typeof evalBridge === 'undefined') { reject('evalBridge not loaded'); return; }
      evalBridge.dispatch({ action: action, params: params || {} }).then(resolve, reject);
    });
  }

  function getAllNodes() {
    return typeof graphState !== 'undefined' ? graphState.getAllNodes() : [];
  }

  function findNodesByType(type) {
    var out = [];
    var nodes = getAllNodes();
    for (var i = 0; i < nodes.length; i++) {
      if (nodes[i].type === type) out.push(nodes[i]);
    }
    return out;
  }

  function getNode(id) {
    return typeof graphState !== 'undefined' ? graphState.getNode(id) : null;
  }

  // ── UI ──
  var overlay = document.createElement('div');
  overlay.id = 'procedia-test-runner';
  overlay.innerHTML =
    '<style>' +
    '#procedia-test-runner {' +
    '  position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999;display:none;' +
    '  background:rgba(0,0,0,0.7);font-family:monospace;font-size:12px;color:#e0e0e0;' +
    '  overflow-y:auto;padding:20px;box-sizing:border-box;' +
    '}' +
    '#procedia-test-runner.open { display:block; }' +
    '#' +
    '.ptr-header { display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #555; }' +
    '.ptr-header h2 { margin:0;color:#fff;font-size:14px; }' +
    '.ptr-close { background:none;border:none;color:#aaa;cursor:pointer;font-size:18px; }' +
    '.ptr-close:hover { color:#fff; }' +
    '.ptr-step { margin:8px 0;padding:10px;border-radius:4px; }' +
    '.ptr-step.pending { background:#1e1e1e;border-left:3px solid #888; }' +
    '.ptr-step.running { background:#1e2a1e;border-left:3px solid #4caf50; }' +
    '.ptr-step.passed  { background:#0d1f0d;border-left:3px solid #2e7d32; }' +
    '.ptr-step.failed  { background:#1f0d0d;border-left:3px solid #c62828; }' +
    '.ptr-step-title { font-weight:bold;margin-bottom:4px;color:#fff; }' +
    '.ptr-step-desc  { color:#aaa;margin-bottom:6px;line-height:1.4; }' +
    '.ptr-btn { padding:4px 12px;border:none;border-radius:3px;cursor:pointer;font-size:11px;margin-right:4px; }' +
    '.ptr-btn-run    { background:#2e7d32;color:#fff; }' +
    '.ptr-btn-run:hover  { background:#388e3c; }' +
    '.ptr-btn-verify { background:#1565c0;color:#fff; }' +
    '.ptr-btn-verify:hover { background:#1976d2; }' +
    '.ptr-btn-reset  { background:#555;color:#fff; }' +
    '.ptr-btn-reset:hover { background:#666; }' +
    '.ptr-result { margin-top:6px;padding:4px 8px;border-radius:3px;font-size:11px; }' +
    '.ptr-result.ok  { background:#1b5e20;color:#a5d6a7; }' +
    '.ptr-result.fail { background:#b71c1c;color:#ef9a9a; }' +
    '.ptr-summary { margin-top:12px;padding:10px;border-top:1px solid #555;font-size:11px; }' +
    '.ptr-summary span { margin-right:12px; }' +
    '</style>' +
    '<div class="ptr-header">' +
    '  <h2>Procedia Integration Tests</h2>' +
    '  <button class="ptr-close" id="ptr-close">&times;</button>' +
    '</div>' +
    '<div id="ptr-steps"></div>' +
    '<div class="ptr-summary" id="ptr-summary">' +
    '  <span id="ptr-count-pass">0 passed</span>' +
    '  <span id="ptr-count-fail">0 failed</span>' +
    '  <button class="ptr-btn ptr-btn-reset" id="ptr-reset">Reset All</button>' +
    '</div>';

  document.body.appendChild(overlay);
  document.getElementById('ptr-close').onclick = function() { overlay.classList.remove('open'); };

  var stepsContainer = document.getElementById('ptr-steps');

  // ── Scenario definitions ──
  var scenarios = [
    {
      id: 's1',
      title: 'S1: First drop, cache miss',
      desc: 'Prep: effectSchemaCache.json should be empty bootstrap state.' +
            '<br><b>Step:</b> Reload the panel, then drag a <b>FillEffect</b> node onto the canvas.',
      verifyFn: function() {
        clearLog();
        var fills = findNodesByType('effects/fill');
        if (fills.length === 0) { fail('No FillEffect node on canvas'); return; }

        assert(schemaCache.isReady(), 'schemaCache.isReady()');
        assert(schemaCache.hasSchema('ADBE Fill'), 'schemaCache has ADBE Fill');

        var schema = schemaCache.getSchema('ADBE Fill');
        assert(!!schema, 'getSchema returns data');
        if (schema) {
          assert(schema.properties.length > 0, 'schema has ' + schema.properties.length + ' properties');
        }

        fills.forEach(function(f) {
          assert(!!f.dynamicSchema, 'node ' + f.id + ' has dynamicSchema');
        });

        evalBridgeDispatch('readSchemaCache').then(function(res) {
          if (!res.ok) { fail('readSchemaCache: ' + res.error); return; }
          assert(!!res.data.schemas['ADBE Fill'], 'ADBE Fill on disk');
          assert(res.data.aeVersion !== '', 'aeVersion on disk populated');
          stepDone('s1');
        });
      }
    },
    {
      id: 's2',
      title: 'S2: Second drop, cache hit',
      desc: '(Continuing from S1)' +
            '<br><b>Step:</b> Drag a <b>second FillEffect</b> node onto the canvas.' +
            '<br>Expected: no introspect call, no temp layer flash in Reserved Comp.',
      verifyFn: function() {
        clearLog();
        var fills = findNodesByType('effects/fill');
        assert(fills.length >= 2, 'at least 2 FillEffect nodes (' + fills.length + ')');

        var allResolved = fills.every(function(f) { return !!f.dynamicSchema; });
        assert(allResolved, 'all FillEffect nodes have dynamicSchema');

        evalBridgeDispatch('readSchemaCache').then(function(res) {
          if (!res.ok) { fail('readSchemaCache: ' + res.error); return; }
          assert(!!res.data.schemas['ADBE Fill'], 'ADBE Fill still on disk');
          stepDone('s2');
        });
      }
    },
    {
      id: 's3',
      title: 'S3: Panel reload, cache survives',
      desc: '<b>Step:</b> Reload the panel (CSInterface or browser refresh).' +
            '<br>Then drag a <b>FillEffect</b> node onto the canvas.' +
            '<br>Expected: no introspect call — schema loaded from disk cache.',
      verifyFn: function() {
        clearLog();
        assert(typeof schemaCache !== 'undefined', 'schemaCache loaded');
        assert(schemaCache.isReady(), 'schemaCache.isReady()');

        evalBridgeDispatch('readSchemaCache').then(function(res) {
          if (!res.ok) { fail('readSchemaCache: ' + res.error); return; }
          if (res.data.schemas['ADBE Fill']) {
            pass('ADBE Fill schema loaded from disk');
          } else {
            fail('ADBE Fill NOT on disk after reload');
          }

          var fills = findNodesByType('effects/fill');
          if (fills.length > 0) {
            assert(fills[0].dynamicSchema, 'dropped FillEffect has dynamicSchema from cache');
          }
          stepDone('s3');
        });
      }
    },
    {
      id: 's4',
      title: 'S4: Param change applies to AE',
      desc: '<b>Setup:</b> Create: FillEffect -> wired to TextNode -> wired to CompNode.' +
            '<br>All nodes must be <b>alive</b>.' +
            '<br><b>Step:</b> Select the FillEffect node, change its Color to blue [0,0,1,1] in the inspector.' +
            '<br>Expected: ~300ms later, the Fill effect on the text layer updates in AE.',
      verifyFn: function() {
        clearLog();
        var fills = findNodesByType('effects/fill');
        assert(fills.length > 0, 'FillEffect exists');
        var fill = fills[fills.length - 1];
        assert(fill.state === 'alive', 'FillEffect is alive');
        assert(typeof dirtyFlusher !== 'undefined', 'dirtyFlusher loaded');

        // Check color prop in nodeMap
        var colorKey = null;
        if (fill.dynamicSchema && fill.dynamicSchema.properties) {
          for (var i = 0; i < fill.dynamicSchema.properties.length; i++) {
            var p = fill.dynamicSchema.properties[i];
            if (p.matchName.indexOf('ADBE Fill-0002') !== -1 || (p.label && p.label === 'Color')) {
              colorKey = p.matchName; break;
            }
          }
        }
        if (colorKey && fill.props) {
          var val = fill.props[colorKey];
          if (val && Array.isArray(val) && val.length === 4 &&
              Math.abs(val[0] - 0) < 0.01 && Math.abs(val[2] - 1) < 0.01) {
            pass('Fill color updated to [0,0,1,1] in nodeMap');
          } else {
            fail('Color is ' + JSON.stringify(val) + ', expected [0,0,1,1]');
          }
        } else {
          fail('Could not find color prop in dynamicSchema');
        }
        stepDone('s4');
      }
    },
    {
      id: 's5',
      title: 'S5: Version diff',
      desc: '<b>Prep:</b> In <code>data/effectSchemaCache.json</code>, change <code>aeVersion</code> to "99.0.0 (fake)".' +
            '<br><b>Step:</b> Reload the panel.' +
            '<br>Expected: console logs "AE version changed from ..." and "Diff complete". aeVersion on disk updated to real value.',
      verifyFn: function() {
        clearLog();
        assert(typeof schemaCache !== 'undefined', 'schemaCache loaded');
        assert(schemaCache.isReady(), 'schemaCache.isReady()');

        evalBridgeDispatch('readSchemaCache').then(function(res) {
          if (!res.ok) { fail('readSchemaCache: ' + res.error); return; }
          assert(res.data.aeVersion !== '', 'aeVersion updated on disk');
          assert(res.data.aeVersion !== '99.0.0 (fake)', 'aeVersion no longer fake');
          assert(!!res.data.schemas['ADBE Fill'], 'ADBE Fill schema preserved');
          pass('aeVersion: ' + res.data.aeVersion);
          stepDone('s5');
        });
      }
    }
  ];

  function render() {
    stepsContainer.innerHTML = '';
    scenarios.forEach(function(s) {
      var el = document.createElement('div');
      el.className = 'ptr-step pending';
      el.id = 'ptr-step-' + s.id;
      el.innerHTML =
        '<div class="ptr-step-title">' + s.title + '</div>' +
        '<div class="ptr-step-desc">' + s.desc + '</div>' +
        '<div>' +
          '<button class="ptr-btn ptr-btn-verify" data-scenario="' + s.id + '">Verify</button>' +
        '</div>' +
        '<div id="ptr-results-' + s.id + '"></div>';
      stepsContainer.appendChild(el);
    });

    stepsContainer.addEventListener('click', function(e) {
      var btn = e.target;
      if (btn.classList.contains('ptr-btn-verify')) {
        var id = btn.getAttribute('data-scenario');
        runScenario(id);
      }
    });

    document.getElementById('ptr-reset').onclick = function() {
      _results = [];
      updateResults();
      scenarios.forEach(function(s) {
        var el = document.getElementById('ptr-step-' + s.id);
        if (el) {
          el.className = 'ptr-step pending';
          document.getElementById('ptr-results-' + s.id).innerHTML = '';
        }
      });
    };
  }

  function runScenario(id) {
    var s = null;
    for (var i = 0; i < scenarios.length; i++) {
      if (scenarios[i].id === id) { s = scenarios[i]; break; }
    }
    if (!s) return;

    var el = document.getElementById('ptr-step-' + id);
    var resEl = document.getElementById('ptr-results-' + id);
    if (el) el.className = 'ptr-step running';
    if (resEl) resEl.innerHTML = '<em style="color:#888">Running...</em>';

    // Filter results to only this scenario
    var prevCount = _results.length;

    var result = s.verifyFn();

    // If verify returns a promise, wait for it
    if (result && typeof result.then === 'function') {
      result.then(function() {
        if (el) el.className = 'ptr-step passed';
        // Check if any results were failures
        for (var j = prevCount; j < _results.length; j++) {
          if (!_results[j].ok) {
            if (el) el.className = 'ptr-step failed';
            break;
          }
        }
        renderResults(id);
        updateResults();
      });
    } else {
      // Synchronous — check results
      var hasFail = false;
      for (var j = prevCount; j < _results.length; j++) {
        if (!_results[j].ok) { hasFail = true; break; }
      }
      if (el) el.className = hasFail ? 'ptr-step failed' : 'ptr-step passed';
      renderResults(id);
      updateResults();
    }
  }

  function renderResults(id) {
    var resEl = document.getElementById('ptr-results-' + id);
    if (!resEl) return;
    resEl.innerHTML = '';
    for (var i = 0; i < _results.length; i++) {
      var r = _results[i];
      var d = document.createElement('div');
      d.className = 'ptr-result ' + (r.ok ? 'ok' : 'fail');
      d.textContent = (r.ok ? 'PASS' : 'FAIL') + ': ' + r.msg;
      resEl.appendChild(d);
    }
  }

  function updateResults() {
    var passed = 0, failed = 0;
    _results.forEach(function(r) {
      if (r.ok) passed++; else failed++;
    });
    document.getElementById('ptr-count-pass').textContent = passed + ' passed';
    document.getElementById('ptr-count-fail').textContent = failed + ' failed';
  }

  function stepDone(id) {
    var el = document.getElementById('ptr-step-' + id);
    if (!el) return;
    var hasFail = false;
    for (var i = 0; i < _results.length; i++) {
      if (!_results[i].ok) { hasFail = true; break; }
    }
    el.className = 'ptr-step ' + (hasFail ? 'failed' : 'passed');
    updateResults();
  }

  // ── Add toggle button to the panel ──
  function addToggleButton() {
    // Try top bar left section
    var topBarLeft = document.getElementById('left-controls') ||
                     document.querySelector('.topbar-left, [class*="topbar"] [class*="left"], .toolbar-left');
    if (topBarLeft) {
      var btn = document.createElement('button');
      btn.textContent = 'Tests';
      btn.title = 'Open Integration Test Runner';
      btn.style.cssText = 'background:#333;color:#4caf50;border:1px solid #4caf50;border-radius:3px;padding:2px 8px;cursor:pointer;font-size:11px;margin-right:4px;';
      btn.onmouseenter = function() { this.style.background = '#4caf50'; this.style.color = '#000'; };
      btn.onmouseleave = function() { this.style.background = '#333'; this.style.color = '#4caf50'; };
      btn.onclick = function() { overlay.classList.toggle('open'); };
      topBarLeft.insertBefore(btn, topBarLeft.firstChild);
      return;
    }

    // Fallback: add floating button
    var fab = document.createElement('button');
    fab.textContent = 'Tests';
    fab.style.cssText = 'position:fixed;bottom:40px;right:8px;z-index:99998;background:#2e7d32;color:#fff;border:none;border-radius:4px;padding:6px 14px;cursor:pointer;font-size:11px;opacity:0.8;';
    fab.onmouseenter = function() { this.style.opacity = '1'; };
    fab.onmouseleave = function() { this.style.opacity = '0.8'; };
    fab.onclick = function() { overlay.classList.toggle('open'); };
    document.body.appendChild(fab);
  }

  // ── Init ──
  render();
  if (document.readyState === 'complete') {
    addToggleButton();
  } else {
    window.addEventListener('load', addToggleButton);
  }

  log('Test runner loaded. Look for the "Tests" button in the top bar.');
  console.log('  To open manually: document.getElementById("procedia-test-runner").classList.add("open")');

})();
