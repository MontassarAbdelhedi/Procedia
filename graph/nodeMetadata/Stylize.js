/**
 * @file Effect node metadata for category "Stylize".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "stylize/brush-strokes": {
    "type": "stylize/brush-strokes",
    "label": "Brush Strokes",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Brush Strokes",
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
  "stylize/cartoonify": {
    "type": "stylize/cartoonify",
    "label": "Cartoonify",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Cartoonify",
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
  "stylize/cc-burn-film": {
    "type": "stylize/cc-burn-film",
    "label": "CC Burn Film",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Burn Film",
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
  "stylize/cc-glass": {
    "type": "stylize/cc-glass",
    "label": "CC Glass",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Glass",
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
  "stylize/cc-kaleida": {
    "type": "stylize/cc-kaleida",
    "label": "CC Kaleida",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Kaleida",
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
  "stylize/cc-mr-smoothie": {
    "type": "stylize/cc-mr-smoothie",
    "label": "CC Mr. Smoothie",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Mr. Smoothie",
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
  "stylize/cc-plastic": {
    "type": "stylize/cc-plastic",
    "label": "CC Plastic",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Plastic",
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
  "stylize/cc-repe-tile": {
    "type": "stylize/cc-repe-tile",
    "label": "CC RepeTile",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC RepeTile",
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
  "stylize/cc-threshold": {
    "type": "stylize/cc-threshold",
    "label": "CC Threshold",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Threshold",
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
  "stylize/cc-threshold-rgb": {
    "type": "stylize/cc-threshold-rgb",
    "label": "CC Threshold RGB",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Threshold RGB",
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
  "stylize/color-emboss": {
    "type": "stylize/color-emboss",
    "label": "Color Emboss",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Color Emboss",
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
  "stylize/cs-block-load": {
    "type": "stylize/cs-block-load",
    "label": "CS BlockLoad",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CS BlockLoad",
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
  "stylize/cs-hex-tile": {
    "type": "stylize/cs-hex-tile",
    "label": "CS HexTile",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CS HexTile",
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
  "stylize/cs-vignette": {
    "type": "stylize/cs-vignette",
    "label": "CS Vignette",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CS Vignette",
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
  "stylize/emboss": {
    "type": "stylize/emboss",
    "label": "Emboss",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Emboss",
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
  "stylize/find-edges": {
    "type": "stylize/find-edges",
    "label": "Find Edges",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Find Edges",
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
  "stylize/glow-2": {
    "type": "stylize/glow-2",
    "label": "Glow 2",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Glo2",
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
  "stylize/mosaic": {
    "type": "stylize/mosaic",
    "label": "Mosaic",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Mosaic",
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
  "stylize/posterize": {
    "type": "stylize/posterize",
    "label": "Posterize",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Posterize",
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
  "stylize/roughen-edges": {
    "type": "stylize/roughen-edges",
    "label": "Roughen Edges",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Roughen Edges",
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
  "stylize/scatter": {
    "type": "stylize/scatter",
    "label": "Scatter",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Scatter",
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
  "stylize/strobe": {
    "type": "stylize/strobe",
    "label": "Strobe",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Strobe",
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
  "stylize/texturize": {
    "type": "stylize/texturize",
    "label": "Texturize",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Texturize",
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
  "stylize/threshold-2": {
    "type": "stylize/threshold-2",
    "label": "Threshold 2",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Threshold2",
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
  "stylize/tile": {
    "type": "stylize/tile",
    "label": "Tile",
    "category": "Stylize",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Tile",
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
