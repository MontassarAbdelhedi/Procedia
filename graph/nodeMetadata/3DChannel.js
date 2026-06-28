/**
 * @file Effect node metadata for category "3D Channel".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "3d-channel/aux-channel-extract": {
    "type": "3d-channel/aux-channel-extract",
    "label": "Aux Channel Extract",
    "category": "3D Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE AUX CHANNEL EXTRACT",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "3d-channel/cryptomatte": {
    "type": "3d-channel/cryptomatte",
    "label": "Cryptomatte",
    "category": "3D Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Cryptomatte",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "3d-channel/depth-field": {
    "type": "3d-channel/depth-field",
    "label": "Depth Field",
    "category": "3D Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE DEPTH FIELD",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "3d-channel/depth-matte": {
    "type": "3d-channel/depth-matte",
    "label": "Depth Matte",
    "category": "3D Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE DEPTH MATTE",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "3d-channel/extractor": {
    "type": "3d-channel/extractor",
    "label": "EXtractoR",
    "category": "3D Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "EXtractoR",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "3d-channel/fog-3d": {
    "type": "3d-channel/fog-3d",
    "label": "Fog 3D",
    "category": "3D Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE FOG_3D",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "3d-channel/identifier": {
    "type": "3d-channel/identifier",
    "label": "IDentifier",
    "category": "3D Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "IDentifier",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  },
  "3d-channel/id-matte": {
    "type": "3d-channel/id-matte",
    "label": "ID Matte",
    "category": "3D Channel",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE ID MATTE",
    "params": "dynamic",
    "ports": [
      {
        "id": "main_input",
        "category": "mainInput",
        "type": "layer",
        "capacity": "single",
        "required": true
      },
      {
        "id": "output",
        "category": "output",
        "type": "layer",
        "capacity": "single"
      }
    ]
  }
};
  for (var key in entries) {
    NODE_METADATA[key] = entries[key];
    if (typeof nodeRegistry !== 'undefined' && nodeRegistry.registerStub) nodeRegistry.registerStub(entries[key]);
  }
})();
