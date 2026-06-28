/**
 * @file Effect node metadata for category "Utility".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "utility/cc-overbrights": {
    "type": "utility/cc-overbrights",
    "label": "CC Overbrights",
    "category": "Utility",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Overbrights",
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
  "utility/compander": {
    "type": "utility/compander",
    "label": "Compander",
    "category": "Utility",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Compander",
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
  "utility/grow-bounds": {
    "type": "utility/grow-bounds",
    "label": "Grow Bounds",
    "category": "Utility",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE GROW BOUNDS",
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
  "utility/hdr-tone-map": {
    "type": "utility/hdr-tone-map",
    "label": "HDR Tone Map",
    "category": "Utility",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE HDR ToneMap",
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
  "utility/profile-to-profile": {
    "type": "utility/profile-to-profile",
    "label": "Profile To Profile",
    "category": "Utility",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE ProfileToProfile",
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
