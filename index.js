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
  var r0 = window.cep.fs.readFile(extPath + '\\jsx\\json.jsx');
  if (r0.err !== 0) {
    console.error('[Procedia] JSX read failed — json.err=' + r0.err);
    return;
  }
  evalBridge.setPreamble(r0.data);
  console.log('[Procedia] JSX preamble ready (' + r0.data.length + ' chars)');
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
