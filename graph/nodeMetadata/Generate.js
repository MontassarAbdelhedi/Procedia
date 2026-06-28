/**
 * @file Effect node metadata for category "Generate".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "generate/4-color-gradient": {
    "type": "generate/4-color-gradient",
    "label": "4-Color Gradient",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE 4ColorGradient",
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
  "generate/apc-radio-waves": {
    "type": "generate/apc-radio-waves",
    "label": "APC Radio Waves",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "APC Radio Waves",
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
  "generate/apc-vegas": {
    "type": "generate/apc-vegas",
    "label": "APC Vegas",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "APC Vegas",
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
  "generate/audio-spectrum": {
    "type": "generate/audio-spectrum",
    "label": "Audio Spectrum",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE AudSpect",
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
  "generate/audio-waveform": {
    "type": "generate/audio-waveform",
    "label": "Audio Waveform",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE AudWave",
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
  "generate/cc-glue-gun": {
    "type": "generate/cc-glue-gun",
    "label": "CC Glue Gun",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Glue Gun",
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
  "generate/cc-light-burst-2-5": {
    "type": "generate/cc-light-burst-2-5",
    "label": "CC Light Burst 2.5",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Light Burst 2.5",
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
  "generate/cc-light-rays": {
    "type": "generate/cc-light-rays",
    "label": "CC Light Rays",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Light Rays",
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
  "generate/cc-light-sweep": {
    "type": "generate/cc-light-sweep",
    "label": "CC Light Sweep",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Light Sweep",
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
  "generate/cell-pattern": {
    "type": "generate/cell-pattern",
    "label": "Cell Pattern",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Cell Pattern",
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
  "generate/checkerboard": {
    "type": "generate/checkerboard",
    "label": "Checkerboard",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Checkerboard",
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
  "generate/circle": {
    "type": "generate/circle",
    "label": "Circle",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Circle",
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
  "generate/cs-threads": {
    "type": "generate/cs-threads",
    "label": "CS Threads",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CS Threads",
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
  "generate/ellipse": {
    "type": "generate/ellipse",
    "label": "Ellipse",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE ELLIPSE",
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
  "generate/eyedropper-fill": {
    "type": "generate/eyedropper-fill",
    "label": "Eyedropper Fill",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Eyedropper Fill",
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
  "generate/fill": {
    "type": "generate/fill",
    "label": "Fill",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Fill",
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
  "generate/fractal": {
    "type": "generate/fractal",
    "label": "Fractal",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Fractal",
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
  "generate/grid": {
    "type": "generate/grid",
    "label": "Grid",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Grid",
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
  "generate/laser": {
    "type": "generate/laser",
    "label": "Laser",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Laser",
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
  "generate/lens-flare": {
    "type": "generate/lens-flare",
    "label": "Lens Flare",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Lens Flare",
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
  "generate/lightning-2": {
    "type": "generate/lightning-2",
    "label": "Lightning 2",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Lightning 2",
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
  "generate/paint-bucket": {
    "type": "generate/paint-bucket",
    "label": "Paint Bucket",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Paint Bucket",
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
  "generate/ramp": {
    "type": "generate/ramp",
    "label": "Ramp",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Ramp",
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
  "generate/scribble-fill": {
    "type": "generate/scribble-fill",
    "label": "Scribble Fill",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Scribble Fill",
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
  "generate/stroke": {
    "type": "generate/stroke",
    "label": "Stroke",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Stroke",
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
  "generate/write-on": {
    "type": "generate/write-on",
    "label": "Write-on",
    "category": "Generate",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Write-on",
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
