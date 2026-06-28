/**
 * @file Effect node metadata for category "Distort".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "distort/bez-mesh": {
    "type": "distort/bez-mesh",
    "label": "Bez Mesh",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE BEZMESH",
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
  "distort/bulge": {
    "type": "distort/bulge",
    "label": "Bulge",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Bulge",
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
  "distort/cc-bender": {
    "type": "distort/cc-bender",
    "label": "CC Bender",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Bender",
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
  "distort/cc-bend-it": {
    "type": "distort/cc-bend-it",
    "label": "CC Bend It",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Bend It",
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
  "distort/cc-blobbylize": {
    "type": "distort/cc-blobbylize",
    "label": "CC Blobbylize",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Blobbylize",
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
  "distort/cc-flo-motion": {
    "type": "distort/cc-flo-motion",
    "label": "CC Flo Motion",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Flo Motion",
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
  "distort/cc-griddler": {
    "type": "distort/cc-griddler",
    "label": "CC Griddler",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Griddler",
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
  "distort/cc-lens": {
    "type": "distort/cc-lens",
    "label": "CC Lens",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Lens",
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
  "distort/cc-page-turn": {
    "type": "distort/cc-page-turn",
    "label": "CC Page Turn",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Page Turn",
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
  "distort/cc-power-pin": {
    "type": "distort/cc-power-pin",
    "label": "CC Power Pin",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Power Pin",
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
  "distort/cc-ripple-pulse": {
    "type": "distort/cc-ripple-pulse",
    "label": "CC Ripple Pulse",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Ripple Pulse",
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
  "distort/cc-slant": {
    "type": "distort/cc-slant",
    "label": "CC Slant",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Slant",
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
  "distort/cc-smear": {
    "type": "distort/cc-smear",
    "label": "CC Smear",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Smear",
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
  "distort/cc-split": {
    "type": "distort/cc-split",
    "label": "CC Split",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Split",
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
  "distort/cc-split-2": {
    "type": "distort/cc-split-2",
    "label": "CC Split 2",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Split 2",
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
  "distort/cc-tiler": {
    "type": "distort/cc-tiler",
    "label": "CC Tiler",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Tiler",
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
  "distort/corner-pin": {
    "type": "distort/corner-pin",
    "label": "Corner Pin",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Corner Pin",
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
  "distort/displacement-map": {
    "type": "distort/displacement-map",
    "label": "Displacement Map",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Displacement Map",
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
  "distort/geometry-2": {
    "type": "distort/geometry-2",
    "label": "Geometry 2",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Geometry2",
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
  "distort/liquify": {
    "type": "distort/liquify",
    "label": "Liquify",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE LIQUIFY",
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
  "distort/magnify": {
    "type": "distort/magnify",
    "label": "Magnify",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Magnify",
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
  "distort/mesh-warp": {
    "type": "distort/mesh-warp",
    "label": "Mesh Warp",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE MESH WARP",
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
  "distort/mirror": {
    "type": "distort/mirror",
    "label": "Mirror",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Mirror",
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
  "distort/offset": {
    "type": "distort/offset",
    "label": "Offset",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Offset",
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
  "distort/optics-compensation": {
    "type": "distort/optics-compensation",
    "label": "Optics Compensation",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Optics Compensation",
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
  "distort/polar-coordinates": {
    "type": "distort/polar-coordinates",
    "label": "Polar Coordinates",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Polar Coordinates",
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
  "distort/reshape": {
    "type": "distort/reshape",
    "label": "Reshape",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE RESHAPE",
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
  "distort/ripple": {
    "type": "distort/ripple",
    "label": "Ripple",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Ripple",
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
  "distort/rolling-shutter": {
    "type": "distort/rolling-shutter",
    "label": "Rolling Shutter",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Rolling Shutter",
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
  "distort/schmear": {
    "type": "distort/schmear",
    "label": "Schmear",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE SCHMEAR",
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
  "distort/spherize": {
    "type": "distort/spherize",
    "label": "Spherize",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Spherize",
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
  "distort/subspace-stabilizer": {
    "type": "distort/subspace-stabilizer",
    "label": "Subspace Stabilizer",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE SubspaceStabilizer",
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
  "distort/turbulent-displace": {
    "type": "distort/turbulent-displace",
    "label": "Turbulent Displace",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Turbulent Displace",
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
  "distort/twirl": {
    "type": "distort/twirl",
    "label": "Twirl",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Twirl",
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
  "distort/upscale": {
    "type": "distort/upscale",
    "label": "Upscale",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Upscale",
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
  "distort/wave-warp": {
    "type": "distort/wave-warp",
    "label": "Wave Warp",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Wave Warp",
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
  "distort/wrp-mesh": {
    "type": "distort/wrp-mesh",
    "label": "Wrp Mesh",
    "category": "Distort",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE WRPMESH",
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
