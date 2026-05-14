var csInterface = null;
try {
  csInterface = new CSInterface();
} catch (e) {
  console.warn('[Procedia] CSInterface not available — running outside AE');
}

// ─── JSX preamble loader ─────────────────────────────────────────────────────
// cep.fs.readFile is synchronous — read all JSX files at startup and store the
// combined source as the evalBridge preamble. evalBridge prepends this to every
// evalScript call so JSX functions are always defined in the same scope as the
// invocation. Required in AE 2025: evalScript calls do not share a persistent
// ExtendScript global scope.

(function() {
  if (!csInterface) return;
  var extPath = csInterface.getSystemPath(SystemPath.EXTENSION).replace(/[\/\\]+$/, '');
  var r0 = window.cep.fs.readFile(extPath + '\\jsx\\json.jsx');
  var r1 = window.cep.fs.readFile(extPath + '\\jsx\\init.jsx');
  var r2 = window.cep.fs.readFile(extPath + '\\jsx\\persistence.jsx');
  var r3 = window.cep.fs.readFile(extPath + '\\jsx\\nodeLifeCycle\\nodeKeyframes.jsx');
  var r4 = window.cep.fs.readFile(extPath + '\\jsx\\nodeLifeCycle\\nodeDataLayer.jsx');
  var r5 = window.cep.fs.readFile(extPath + '\\jsx\\nodeLifeCycle\\nodeWireOps.jsx');
  var r6 = window.cep.fs.readFile(extPath + '\\jsx\\nodeLifeCycle\\nodeLifecycle.jsx');
  var r7 = window.cep.fs.readFile(extPath + '\\jsx\\properties.jsx');
  var r8 = window.cep.fs.readFile(extPath + '\\jsx\\aeFocus.jsx');
  var r9 = window.cep.fs.readFile(extPath + '\\jsx\\polling.jsx');
  if (r0.err !== 0 || r1.err !== 0 || r2.err !== 0 || r3.err !== 0 || r4.err !== 0 || r5.err !== 0 || r6.err !== 0 || r7.err !== 0 || r8.err !== 0 || r9.err !== 0) {
    console.error('[Procedia] JSX read failed — json.err=' + r0.err + ' init.err=' + r1.err + ' persistence.err=' + r2.err + ' nodeKeyframes.err=' + r3.err + ' nodeDataLayer.err=' + r4.err + ' nodeWireOps.err=' + r5.err + ' nodeLifecycle.err=' + r6.err + ' properties.err=' + r7.err + ' aeFocus.err=' + r8.err + ' polling.err=' + r9.err);
    return;
  }
  evalBridge.setPreamble(r0.data + '\n' + r1.data + '\n' + r2.data + '\n' + r3.data + '\n' + r4.data + '\n' + r5.data + '\n' + r6.data + '\n' + r7.data + '\n' + r8.data + '\n' + r9.data);
  console.log('[Procedia] JSX preamble ready (' + (r0.data.length + r1.data.length + r2.data.length + r3.data.length + r4.data.length + r5.data.length + r6.data.length + r7.data.length + r8.data.length + r9.data.length) + ' chars)');
}());

// ─── Init ────────────────────────────────────────────────────────────────────

try { buildNodeList(); }        catch(e) { console.error('[Procedia] buildNodeList failed:', e); }
try { initSearch(); }           catch(e) { console.error('[Procedia] initSearch failed:', e); }
try { canvas.init(); }          catch(e) { console.error('[Procedia] canvas.init failed:', e); }
try { minimap.init(); }         catch(e) { console.error('[Procedia] minimap.init failed:', e); }
try { notificationBar.init(); } catch(e) { console.error('[Procedia] notificationBar.init failed:', e); }
try { inspector.init(); }       catch(e) { console.error('[Procedia] inspector.init failed:', e); }
try { initDrag(); }             catch(e) { console.error('[Procedia] initDrag failed:', e); }
try { initKeyboard(); }         catch(e) { console.error('[Procedia] initKeyboard failed:', e); }
try { poller.start(); }         catch(e) { console.error('[Procedia] poller.start failed:', e); }
