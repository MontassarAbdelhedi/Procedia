// jsx/dispatcher/dispatcher.jsx
// THE ONLY EXTENDSCRIPT WRITER. The only file with AE API calls.
// DEPENDS ON: jsx/json.jsx, jsx/utils.jsx
// MUST LOAD BEFORE: nothing (loaded as ScriptPath by CEP manifest)

#include "../json.jsx"
#include "../utils.jsx"

// ---------------------------------------------------------------------------
// Entry points — called by evalBridge
// ---------------------------------------------------------------------------

function dispatch(commandJSON) {
    var result = { ok: false, data: null, error: null };
    try {
        var cmd = JSON.parse(commandJSON);
        result = _route(cmd.action, cmd.params);
    } catch (e) {
        result.error = 'dispatch error: ' + e.toString();
    }
    return JSON.stringify(result);
}

function dispatchBatch(commandArrayJSON) {
    var result = { ok: true, data: [], error: null };
    try {
        var commands = JSON.parse(commandArrayJSON);
        for (var i = 0; i < commands.length; i++) {
            var r = _route(commands[i].action, commands[i].params);
            result.data.push(r);
            if (!r.ok) {
                result.ok = false;
                result.error = 'Batch item ' + i + ' failed: ' + r.error;
            }
        }
    } catch (e) {
        result.ok = false;
        result.error = 'dispatchBatch error: ' + e.toString();
    }
    return JSON.stringify(result);
}

function _route(action, params) {
    if (action === 'createComp')        return actionCreateComp(params);
    if (action === 'createTextLayer')   return actionCreateTextLayer(params);
    if (action === 'createNullLayer')   return actionCreateNullLayer(params);
    if (action === 'addCompAsLayer')    return actionAddCompAsLayer(params);
    if (action === 'parkLayer')         return actionParkLayer(params);
    if (action === 'unparkLayer')       return actionUnparkLayer(params);
    if (action === 'deleteParkedLayer') return actionDeleteParkedLayer(params);
    if (action === 'deleteComp')        return actionDeleteComp(params);
    if (action === 'setLayerProperty')  return actionSetLayerProperty(params);
    if (action === 'setCompProperty')   return actionSetCompProperty(params);
    if (action === 'setLayerParent')    return actionSetLayerParent(params);
    if (action === 'clearLayerParent')  return actionClearLayerParent(params);
    if (action === 'setLayerOrder')     return actionSetLayerOrder(params);
    if (action === 'renameNode')        return actionRenameNode(params);
    if (action === 'focusComp')         return actionFocusComp(params);
    return { ok: false, data: null, error: 'Unknown action: ' + action };
}

// ---------------------------------------------------------------------------
// Action handlers — return plain { ok, data, error }, never JSON.stringify
// ---------------------------------------------------------------------------

function actionCreateComp(params) {
    var result = { ok: false, data: null, error: null };
    try {
        findOrCreateReservedComp(); // ensures the Procedia folder exists

        var proj = app.project;
        var folder = null;
        for (var i = 1; i <= proj.numItems; i++) {
            var item = proj.item(i);
            if (item instanceof FolderItem && item.name.indexOf('DO NOT DELETE') === 0) {
                folder = item;
                break;
            }
        }

        var comp = proj.items.addComp(params.label, params.width, params.height, 1.0, params.duration, params.fps);
        comp.comment  = params.nodeUUID;
        comp.bgColor  = params.bgColor;
        if (folder) comp.parentFolder = folder;

        result.ok   = true;
        result.data = { compName: comp.name };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionCreateTextLayer(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var comp = findCompByUUID(params.hostingCompUUID);
        if (!comp) { result.error = 'Hosting comp not found: ' + params.hostingCompUUID; return result; }

        var textLayer = comp.layers.addText(params.content);
        textLayer.comment = params.nodeUUID;
        textLayer.name    = params.label;

        var textProp = textLayer.property('ADBE Text Properties').property('ADBE Text Document');
        var doc = textProp.value;
        doc.fontSize  = params.fontSize;
        doc.fillColor = [params.color[0], params.color[1], params.color[2]];
        textProp.setValue(doc);

        var xform = textLayer.property('ADBE Transform Group');
        xform.property('ADBE Position').setValue(params.position);
        xform.property('ADBE Rotate Z').setValue(params.rotation);
        xform.property('ADBE Opacity').setValue(params.opacity);

        result.ok   = true;
        result.data = { layerName: textLayer.name };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionCreateNullLayer(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var comp = findCompByUUID(params.hostingCompUUID);
        if (!comp) { result.error = 'Hosting comp not found: ' + params.hostingCompUUID; return result; }

        var nullLayer = comp.layers.addNull(10);
        nullLayer.comment = params.nodeUUID;
        nullLayer.name    = params.label;

        var xform = nullLayer.property('ADBE Transform Group');
        xform.property('ADBE Position').setValue(params.position);
        xform.property('ADBE Rotate Z').setValue(params.rotation);
        xform.property('ADBE Opacity').setValue(params.opacity);
        xform.property('ADBE Scale').setValue(params.scale);

        result.ok   = true;
        result.data = { layerName: nullLayer.name };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionAddCompAsLayer(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var sourceComp = findCompByUUID(params.nodeUUID);
        if (!sourceComp) { result.error = 'Source comp not found: ' + params.nodeUUID; return result; }

        var hostingComp = findCompByUUID(params.hostingCompUUID);
        if (!hostingComp) { result.error = 'Hosting comp not found: ' + params.hostingCompUUID; return result; }

        var preCompLayer = hostingComp.layers.add(sourceComp);
        preCompLayer.comment = params.nodeUUID;
        preCompLayer.name    = sourceComp.name;

        result.ok   = true;
        result.data = { layerName: preCompLayer.name };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionParkLayer(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var comp = findCompByUUID(params.hostingCompUUID);
        if (!comp) { result.error = 'Hosting comp not found: ' + params.hostingCompUUID; return result; }

        var layer = findLayerByUUID(comp, params.nodeUUID);
        if (!layer) { result.error = 'Layer not found: ' + params.nodeUUID; return result; }

        var reserved = findOrCreateReservedComp();
        moveLayerToComp(layer, reserved);

        result.ok   = true;
        result.data = { parked: params.nodeUUID };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionUnparkLayer(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var reserved = findReservedComp();
        if (!reserved) { result.error = 'Reserved Comp not found'; return result; }

        var layer = findLayerByUUID(reserved, params.nodeUUID);
        if (!layer) { result.error = 'Layer not found in Reserved: ' + params.nodeUUID; return result; }

        var comp = findCompByUUID(params.hostingCompUUID);
        if (!comp) { result.error = 'Hosting comp not found: ' + params.hostingCompUUID; return result; }

        moveLayerToComp(layer, comp);

        result.ok   = true;
        result.data = { unparked: params.nodeUUID };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionDeleteParkedLayer(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var reserved = findReservedComp();
        if (!reserved) {
            result.ok   = true;
            result.data = { deleted: params.nodeUUID };
            return result;
        }

        var layer = findLayerByUUID(reserved, params.nodeUUID);
        if (!layer) {
            result.ok   = true;
            result.data = { deleted: params.nodeUUID };
            return result;
        }

        layer.remove();
        result.ok   = true;
        result.data = { deleted: params.nodeUUID };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionDeleteComp(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var comp = findCompByUUID(params.nodeUUID);
        if (!comp) {
            result.ok   = true;
            result.data = { deleted: params.nodeUUID };
            return result;
        }

        comp.remove();
        result.ok   = true;
        result.data = { deleted: params.nodeUUID };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionSetLayerProperty(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var comp = findCompByUUID(params.hostingCompUUID);
        if (!comp) { result.error = 'Hosting comp not found: ' + params.hostingCompUUID; return result; }

        var layer = findLayerByUUID(comp, params.nodeUUID);
        if (!layer) { result.error = 'Layer not found: ' + params.nodeUUID; return result; }

        setPropertyByKey(layer, params.key, params.value);

        result.ok   = true;
        result.data = { key: params.key };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionSetCompProperty(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var comp = findCompByUUID(params.nodeUUID);
        if (!comp) { result.error = 'Comp not found: ' + params.nodeUUID; return result; }

        if (params.key === 'label') {
            comp.name = params.value;
        } else if (params.key === 'width') {
            comp.width = params.value;
        } else if (params.key === 'height') {
            comp.height = params.value;
        } else if (params.key === 'fps') {
            comp.frameRate = params.value;
        } else if (params.key === 'duration') {
            comp.duration = params.value;
        } else if (params.key === 'bgColor') {
            comp.bgColor = params.value;
        }

        result.ok   = true;
        result.data = { key: params.key };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionSetLayerParent(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var comp = findCompByUUID(params.hostingCompUUID);
        if (!comp) { result.error = 'Hosting comp not found: ' + params.hostingCompUUID; return result; }

        var childLayer  = findLayerByUUID(comp, params.childNodeUUID);
        if (!childLayer)  { result.error = 'Child layer not found: '  + params.childNodeUUID;  return result; }

        var parentLayer = findLayerByUUID(comp, params.parentNodeUUID);
        if (!parentLayer) { result.error = 'Parent layer not found: ' + params.parentNodeUUID; return result; }

        childLayer.parent = parentLayer;

        result.ok   = true;
        result.data = { child: params.childNodeUUID, parent: params.parentNodeUUID };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionClearLayerParent(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var proj  = app.project;
        var layer = null;

        for (var i = 1; i <= proj.numItems; i++) {
            var item = proj.item(i);
            if (item instanceof CompItem && item.name.indexOf('DO NOT DELETE') !== 0) {
                layer = findLayerByUUID(item, params.nodeUUID);
                if (layer) break;
            }
        }

        if (!layer) {
            result.ok   = true;
            result.data = { cleared: params.nodeUUID };
            return result;
        }

        layer.parent = null;

        result.ok   = true;
        result.data = { cleared: params.nodeUUID };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionSetLayerOrder(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var comp = findCompByUUID(params.hostingCompUUID);
        if (!comp) { result.error = 'Hosting comp not found: ' + params.hostingCompUUID; return result; }

        var layer = findLayerByUUID(comp, params.nodeUUID);
        if (!layer) { result.error = 'Layer not found: ' + params.nodeUUID; return result; }

        layer.moveToBeginning();
        for (var i = 0; i < params.order; i++) {
            layer.moveAfter(comp.layer(i + 1));
        }

        result.ok   = true;
        result.data = { order: params.order };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionRenameNode(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var proj  = app.project;
        var found = false;

        for (var i = 1; i <= proj.numItems; i++) {
            var item = proj.item(i);
            if (item instanceof CompItem && item.name.indexOf('DO NOT DELETE') !== 0) {
                var layer = findLayerByUUID(item, params.nodeUUID);
                if (layer) {
                    layer.name = params.label;
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            var comp = findCompByUUID(params.nodeUUID);
            if (comp) comp.name = params.label;
        }

        result.ok   = true;
        result.data = { label: params.label };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}

function actionFocusComp(params) {
    var result = { ok: false, data: null, error: null };
    try {
        var comp = findCompByUUID(params.nodeUUID);
        if (!comp) { result.error = 'Comp not found: ' + params.nodeUUID; return result; }

        app.project.activeItem = comp;

        result.ok   = true;
        result.data = { focused: params.nodeUUID };
    } catch (e) {
        result.error = e.toString();
    }
    return result;
}
