/**
 * @file Effect node metadata for category "Keying".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "keying/atg-extract": {
    "type": "keying/atg-extract",
    "label": "ATG Extract",
    "category": "Keying",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE ATG Extract",
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
  "keying/cc-simple-wire-removal": {
    "type": "keying/cc-simple-wire-removal",
    "label": "CC Simple Wire Removal",
    "category": "Keying",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Simple Wire Removal",
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
  "keying/color-difference-key": {
    "type": "keying/color-difference-key",
    "label": "Color Difference Key",
    "category": "Keying",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Color Difference Key",
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
  "keying/color-range": {
    "type": "keying/color-range",
    "label": "Color Range",
    "category": "Keying",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Color Range",
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
  "keying/difference-matte-2": {
    "type": "keying/difference-matte-2",
    "label": "Difference Matte 2",
    "category": "Keying",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Difference Matte2",
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
  "keying/extract": {
    "type": "keying/extract",
    "label": "Extract",
    "category": "Keying",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Extract",
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
  "keying/key-cleaner": {
    "type": "keying/key-cleaner",
    "label": "Key Cleaner",
    "category": "Keying",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE KeyCleaner",
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
  "keying/keylight-906": {
    "type": "keying/keylight-906",
    "label": "Keylight 906",
    "category": "Keying",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Keylight 906",
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
  "keying/linear-color-key-2": {
    "type": "keying/linear-color-key-2",
    "label": "Linear Color Key 2",
    "category": "Keying",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Linear Color Key2",
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
  "keying/spill-2": {
    "type": "keying/spill-2",
    "label": "Spill 2",
    "category": "Keying",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Spill2",
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
