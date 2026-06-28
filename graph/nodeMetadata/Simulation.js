/**
 * @file Effect node metadata for category "Simulation".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "simulation/apc-card-dance-cam": {
    "type": "simulation/apc-card-dance-cam",
    "label": "APC Card Dance Cam",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "APC CardDanceCam",
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
  "simulation/apc-caustics": {
    "type": "simulation/apc-caustics",
    "label": "APC Caustics",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "APC Caustics",
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
  "simulation/apc-foam": {
    "type": "simulation/apc-foam",
    "label": "APC Foam",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "APC Foam",
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
  "simulation/apc-shatter": {
    "type": "simulation/apc-shatter",
    "label": "APC Shatter",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "APC Shatter",
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
  "simulation/apc-wave-world": {
    "type": "simulation/apc-wave-world",
    "label": "APC Wave World",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "APC Wave World",
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
  "simulation/cc-ball-action": {
    "type": "simulation/cc-ball-action",
    "label": "CC Ball Action",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Ball Action",
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
  "simulation/cc-bubbles": {
    "type": "simulation/cc-bubbles",
    "label": "CC Bubbles",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Bubbles",
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
  "simulation/cc-drizzle": {
    "type": "simulation/cc-drizzle",
    "label": "CC Drizzle",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Drizzle",
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
  "simulation/cc-hair": {
    "type": "simulation/cc-hair",
    "label": "CC Hair",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Hair",
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
  "simulation/cc-mr-mercury": {
    "type": "simulation/cc-mr-mercury",
    "label": "CC Mr. Mercury",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Mr. Mercury",
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
  "simulation/cc-particle-systems-ii": {
    "type": "simulation/cc-particle-systems-ii",
    "label": "CC Particle Systems II",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Particle Systems II",
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
  "simulation/cc-particle-world": {
    "type": "simulation/cc-particle-world",
    "label": "CC Particle World",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Particle World",
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
  "simulation/cc-pixel-polly": {
    "type": "simulation/cc-pixel-polly",
    "label": "CC Pixel Polly",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Pixel Polly",
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
  "simulation/cc-scatterize": {
    "type": "simulation/cc-scatterize",
    "label": "CC Scatterize",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Scatterize",
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
  "simulation/cc-star-burst": {
    "type": "simulation/cc-star-burst",
    "label": "CC Star Burst",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Star Burst",
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
  "simulation/cs-rainfall": {
    "type": "simulation/cs-rainfall",
    "label": "CS Rainfall",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CSRainfall",
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
  "simulation/cs-snowfall": {
    "type": "simulation/cs-snowfall",
    "label": "CS Snowfall",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CSSnowfall",
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
  "simulation/playground": {
    "type": "simulation/playground",
    "label": "Playground",
    "category": "Simulation",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Playgnd",
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
