/**
 * @file Effect node metadata for category "Noise & Grain".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "noise-grain/aif-perlin-noise-3d": {
    "type": "noise-grain/aif-perlin-noise-3d",
    "label": "AIF Perlin Noise 3D",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE AIF Perlin Noise 3D",
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
  "noise-grain/dust-scratches": {
    "type": "noise-grain/dust-scratches",
    "label": "Dust & Scratches",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Dust & Scratches",
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
  "noise-grain/fractal-noise": {
    "type": "noise-grain/fractal-noise",
    "label": "Fractal Noise",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Fractal Noise",
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
  "noise-grain/median": {
    "type": "noise-grain/median",
    "label": "Median",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Median",
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
  "noise-grain/noise-2": {
    "type": "noise-grain/noise-2",
    "label": "Noise 2",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Noise2",
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
  "noise-grain/noise-alpha-2": {
    "type": "noise-grain/noise-alpha-2",
    "label": "Noise Alpha 2",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Noise Alpha2",
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
  "noise-grain/noise-hls-2": {
    "type": "noise-grain/noise-hls-2",
    "label": "Noise HLS 2",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Noise HLS2",
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
  "noise-grain/noise-hls-auto-2": {
    "type": "noise-grain/noise-hls-auto-2",
    "label": "Noise HLS Auto 2",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Noise HLS Auto2",
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
  "noise-grain/ps-median": {
    "type": "noise-grain/ps-median",
    "label": "PS Median",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE PS Median",
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
  "noise-grain/visinf-grain-duplication": {
    "type": "noise-grain/visinf-grain-duplication",
    "label": "VISINF Grain Duplication",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "VISINF Grain Duplication",
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
  "noise-grain/visinf-grain-implant": {
    "type": "noise-grain/visinf-grain-implant",
    "label": "VISINF Grain Implant",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "VISINF Grain Implant",
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
  "noise-grain/visinf-grain-removal": {
    "type": "noise-grain/visinf-grain-removal",
    "label": "VISINF Grain Removal",
    "category": "Noise & Grain",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "VISINF Grain Removal",
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
