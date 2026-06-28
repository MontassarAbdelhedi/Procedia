/**
 * @file Effect node metadata for category "Immersive Video".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "immersive-video/skybox-blur": {
    "type": "immersive-video/skybox-blur",
    "label": "SkyBox Blur",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Blur",
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
  "immersive-video/skybox-chromatic-aberration": {
    "type": "immersive-video/skybox-chromatic-aberration",
    "label": "SkyBox Chromatic Aberration",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Chromatic Aberrat",
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
  "immersive-video/skybox-color-gradients": {
    "type": "immersive-video/skybox-color-gradients",
    "label": "SkyBox Color Gradients",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Color Gradients",
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
  "immersive-video/skybox-converter": {
    "type": "immersive-video/skybox-converter",
    "label": "SkyBox Converter",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Converter",
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
  "immersive-video/skybox-denoise": {
    "type": "immersive-video/skybox-denoise",
    "label": "SkyBox Denoise",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Denoise",
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
  "immersive-video/skybox-digital-glitch": {
    "type": "immersive-video/skybox-digital-glitch",
    "label": "SkyBox Digital Glitch",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Digital Glitch",
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
  "immersive-video/skybox-fractal-noise": {
    "type": "immersive-video/skybox-fractal-noise",
    "label": "SkyBox Fractal Noise",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Fractal Noise",
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
  "immersive-video/skybox-glow": {
    "type": "immersive-video/skybox-glow",
    "label": "SkyBox Glow",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Glow",
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
  "immersive-video/skybox-project-2d": {
    "type": "immersive-video/skybox-project-2d",
    "label": "SkyBox Project 2D",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Project 2D",
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
  "immersive-video/skybox-rotate-sphere": {
    "type": "immersive-video/skybox-rotate-sphere",
    "label": "SkyBox Rotate Sphere",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Rotate Sphere",
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
  "immersive-video/skybox-sharpen": {
    "type": "immersive-video/skybox-sharpen",
    "label": "SkyBox Sharpen",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Sharpen",
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
  "immersive-video/skybox-viewer": {
    "type": "immersive-video/skybox-viewer",
    "label": "SkyBox Viewer",
    "category": "Immersive Video",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "Mettle SkyBox Viewer",
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
