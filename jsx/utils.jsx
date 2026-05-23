// jsx/utils.jsx
// AE object lookup utilities for the Procedia dispatcher.
// DEPENDS ON: jsx/json.jsx
// MUST LOAD BEFORE: jsx/dispatcher/dispatcher.jsx, jsx/persistence.jsx, jsx/polling.jsx

// Find a CompItem whose .comment equals uuid.
// Never returns the Reserved Comp (skips any comp named 'DO NOT DELETE...').
function findCompByUUID(uuid) {
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (item instanceof CompItem) {
            if (item.name.indexOf('DO NOT DELETE') === 0) continue;
            if (item.comment === uuid) return item;
        }
    }
    return null;
}

// Find a layer inside comp whose .comment equals uuid.
function findLayerByUUID(comp, uuid) {
    for (var i = 1; i <= comp.numLayers; i++) {
        if (comp.layer(i).comment === uuid) return comp.layer(i);
    }
    return null;
}

// Find and return the Reserved Comp. Returns null if not found — never creates it here.
function findReservedComp() {
    var proj = app.project;
    var name = 'DO NOT DELETE — Procedia Reserved';
    for (var i = 1; i <= proj.numItems; i++) {
        var item = proj.item(i);
        if (item instanceof CompItem && item.name === name) return item;
    }
    return null;
}

// Find the Reserved Comp or create it (plus its folder) if missing. Always returns a CompItem.
function findOrCreateReservedComp() {
    var existing = findReservedComp();
    if (existing) return existing;

    var proj = app.project;
    var folder = null;
    var folderName = 'DO NOT DELETE — Procedia Reserved';

    for (var i = 1; i <= proj.numItems; i++) {
        if (proj.item(i) instanceof FolderItem && proj.item(i).name === folderName) {
            folder = proj.item(i);
            break;
        }
    }
    if (!folder) folder = proj.items.addFolder(folderName);

    var comp = proj.items.addComp(folderName, 4, 4, 1.0, 1, 24);
    comp.parentFolder = folder;
    return comp;
}

// Find a layer in the Reserved Comp by uuid. Returns null if comp or layer not found.
function findLayerInReserved(uuid) {
    var reserved = findReservedComp();
    if (!reserved) return null;
    return findLayerByUUID(reserved, uuid);
}

// Move a layer from its current comp to targetComp.
// Returns the new layer in targetComp, or null on failure.
function moveLayerToComp(layer, targetComp) {
    var uuid = layer.comment;
    layer.copyToComp(targetComp);
    var newLayer = targetComp.layer(1); // copyToComp prepends — new layer is always at index 1
    newLayer.comment = uuid;
    layer.remove();
    return newLayer;
}

// Set a named property on a layer. Used by the setLayerProperty action handler.
function setPropertyByKey(layer, key, value) {
    var xform, textProp, doc;

    if (key === 'label') {
        layer.name = value;

    } else if (key === 'opacity') {
        xform = layer.property('ADBE Transform Group');
        xform.property('ADBE Opacity').setValue(value);

    } else if (key === 'position') {
        xform = layer.property('ADBE Transform Group');
        xform.property('ADBE Position').setValue(value);

    } else if (key === 'rotation') {
        xform = layer.property('ADBE Transform Group');
        xform.property('ADBE Rotate Z').setValue(value);

    } else if (key === 'scale') {
        xform = layer.property('ADBE Transform Group');
        xform.property('ADBE Scale').setValue(value);

    } else if (key === 'content') {
        textProp = layer.property('ADBE Text Properties').property('ADBE Text Document');
        doc = textProp.value;
        doc.text = value;
        textProp.setValue(doc);

    } else if (key === 'fontSize') {
        textProp = layer.property('ADBE Text Properties').property('ADBE Text Document');
        doc = textProp.value;
        doc.fontSize = value;
        textProp.setValue(doc);

    } else if (key === 'color') {
        textProp = layer.property('ADBE Text Properties').property('ADBE Text Document');
        doc = textProp.value;
        doc.fillColor = [value[0], value[1], value[2]];
        textProp.setValue(doc);

    } else {
        $.writeln('[utils] setPropertyByKey: unrecognized key: ' + key);
    }
}
