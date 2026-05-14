// jsx/aeFocus.jsx
// ES3 - var only, named functions, for loops, string concat
// DEPENDS ON: jsx/persistence.jsx (findCompByUUID)

function focusCompInAE(uuid) {
  var result = { ok: false, data: null, error: null };
  try {
    var comp = findCompByUUID(uuid);
    if (!comp) {
      result.error = 'Comp not found for uuid: ' + uuid;
      return JSON.stringify(result);
    }
    comp.openInViewer();
    result.ok   = true;
    result.data = comp.name;
  } catch (e) {
    result.error = e.toString();
  }
  return JSON.stringify(result);
}
