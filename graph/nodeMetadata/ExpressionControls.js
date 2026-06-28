/**
 * @file Effect node metadata for category "Expression Controls".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "expression-controls/angle-control": {
    "type": "expression-controls/angle-control",
    "label": "Angle Control",
    "category": "Expression Controls",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Angle Control",
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
  "expression-controls/checkbox-control": {
    "type": "expression-controls/checkbox-control",
    "label": "Checkbox Control",
    "category": "Expression Controls",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Checkbox Control",
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
  "expression-controls/color-control": {
    "type": "expression-controls/color-control",
    "label": "Color Control",
    "category": "Expression Controls",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Color Control",
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
  "expression-controls/dropdown-control": {
    "type": "expression-controls/dropdown-control",
    "label": "Dropdown Control",
    "category": "Expression Controls",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Dropdown Control",
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
  "expression-controls/layer-control": {
    "type": "expression-controls/layer-control",
    "label": "Layer Control",
    "category": "Expression Controls",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Layer Control",
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
  "expression-controls/point-3d-control": {
    "type": "expression-controls/point-3d-control",
    "label": "Point 3D Control",
    "category": "Expression Controls",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Point3D Control",
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
  "expression-controls/point-control": {
    "type": "expression-controls/point-control",
    "label": "Point Control",
    "category": "Expression Controls",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Point Control",
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
  "expression-controls/slider-control": {
    "type": "expression-controls/slider-control",
    "label": "Slider Control",
    "category": "Expression Controls",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Slider Control",
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
