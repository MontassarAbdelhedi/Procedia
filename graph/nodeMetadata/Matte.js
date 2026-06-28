/**
 * @file Effect node metadata for category "Matte".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "matte/matte-choker": {
    "type": "matte/matte-choker",
    "label": "Matte Choker",
    "category": "Matte",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Matte Choker",
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
  "matte/refine-matte-2": {
    "type": "matte/refine-matte-2",
    "label": "Refine Matte 2",
    "category": "Matte",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE RefineMatte2",
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
  "matte/refine-rb-matte": {
    "type": "matte/refine-rb-matte",
    "label": "Refine RB Matte",
    "category": "Matte",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE RefineRBMatte",
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
  "matte/simple-choker": {
    "type": "matte/simple-choker",
    "label": "Simple Choker",
    "category": "Matte",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Simple Choker",
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
