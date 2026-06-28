/**
 * @file Effect node metadata for category "Time".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "time/cc-force-motion-blur": {
    "type": "time/cc-force-motion-blur",
    "label": "CC Force Motion Blur",
    "category": "Time",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Force Motion Blur",
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
  "time/cc-wide-time": {
    "type": "time/cc-wide-time",
    "label": "CC Wide Time",
    "category": "Time",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Wide Time",
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
  "time/difference": {
    "type": "time/difference",
    "label": "Difference",
    "category": "Time",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Difference",
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
  "time/echo": {
    "type": "time/echo",
    "label": "Echo",
    "category": "Time",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Echo",
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
  "time/of-motion-blur": {
    "type": "time/of-motion-blur",
    "label": "OF Motion Blur",
    "category": "Time",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE OFMotionBlur",
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
  "time/posterize-time": {
    "type": "time/posterize-time",
    "label": "Posterize Time",
    "category": "Time",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Posterize Time",
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
  "time/time-displacement": {
    "type": "time/time-displacement",
    "label": "Time Displacement",
    "category": "Time",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Time Displacement",
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
  "time/timewarp": {
    "type": "time/timewarp",
    "label": "Timewarp",
    "category": "Time",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Timewarp",
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
