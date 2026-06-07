function _handleBrowseAndImportFootage(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var nodeUUID = params.nodeUUID;
    if (!nodeUUID) {
      result.error = 'browseAndImportFootage: nodeUUID required';
      return result;
    }

    var file = File.openDialog('Select a footage file', 'All Files:*.*', false);
    if (!file) {
      result.ok = true;
      result.data = { cancelled: true };
      return result;
    }

    var importOptions = new ImportOptions(file);
    var footageItem = app.project.importFile(importOptions);
    footageItem.comment = nodeUUID;

    var folder = findOrCreateProcediaFolder();
    footageItem.parentFolder = folder;

    result.ok = true;
    result.data = {
      filePath:    file.fsName,
      cancelled:   false,
      itemName:    footageItem.name
    };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleCreateFootageLayer(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var comp = findCompByUUID(params.hostingCompUUID);
    if (!comp) {
      result.error = 'createFootageLayer: host comp not found';
      return result;
    }

    var footageItem = null;
    for (var i = 1; i <= app.project.numItems; i++) {
      var item = app.project.item(i);
      if (item instanceof FootageItem && item.comment === params.nodeUUID) {
        footageItem = item;
        break;
      }
    }
    if (!footageItem) {
      result.error = 'createFootageLayer: footage not found for nodeUUID: ' + params.nodeUUID;
      return result;
    }

    var layer = comp.layers.add(footageItem);
    if (params.layerUUID) layer.comment = params.layerUUID;
    if (params.label) layer.name = params.label;

    result.ok = true;
    result.data = { layerName: layer.name };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}

function _handleDeleteFootageItem(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var params = _cmdParams(cmd);
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof FootageItem && item.comment === params.nodeUUID) {
        item.remove();
        result.ok = true;
        result.data = { deleted: true };
        return result;
      }
    }
    result.ok = true;
    result.data = { deleted: false };
  } catch (e) {
    result.error = e.toString();
  }
  return result;
}
