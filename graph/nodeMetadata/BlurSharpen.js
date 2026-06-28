/**
 * @file Effect node metadata for category "Blur & Sharpen".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "blur-sharpen/bilateral": {
    "type": "blur-sharpen/bilateral",
    "label": "Bilateral",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Bilateral",
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
  "blur-sharpen/box-blur-2": {
    "type": "blur-sharpen/box-blur-2",
    "label": "Box Blur 2",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Box Blur2",
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
  "blur-sharpen/camera-lens-blur": {
    "type": "blur-sharpen/camera-lens-blur",
    "label": "Camera Lens Blur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Camera Lens Blur",
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
  "blur-sharpen/camera-shake-deblur": {
    "type": "blur-sharpen/camera-shake-deblur",
    "label": "Camera Shake Deblur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE CameraShakeDeblur",
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
  "blur-sharpen/cc-radial-blur": {
    "type": "blur-sharpen/cc-radial-blur",
    "label": "CC Radial Blur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Radial Blur",
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
  "blur-sharpen/cc-radial-fast-blur": {
    "type": "blur-sharpen/cc-radial-fast-blur",
    "label": "CC Radial Fast Blur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Radial Fast Blur",
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
  "blur-sharpen/cc-vector-blur": {
    "type": "blur-sharpen/cc-vector-blur",
    "label": "CC Vector Blur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Vector Blur",
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
  "blur-sharpen/channel-blur": {
    "type": "blur-sharpen/channel-blur",
    "label": "Channel Blur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Channel Blur",
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
  "blur-sharpen/compound-blur": {
    "type": "blur-sharpen/compound-blur",
    "label": "Compound Blur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Compound Blur",
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
  "blur-sharpen/cs-cross-blur": {
    "type": "blur-sharpen/cs-cross-blur",
    "label": "CS CrossBlur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CS CrossBlur",
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
  "blur-sharpen/gaussian-blur": {
    "type": "blur-sharpen/gaussian-blur",
    "label": "Gaussian Blur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Gaussian Blur",
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
  "blur-sharpen/gaussian-blur-2": {
    "type": "blur-sharpen/gaussian-blur-2",
    "label": "Gaussian Blur 2",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Gaussian Blur 2",
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
  "blur-sharpen/motion-blur": {
    "type": "blur-sharpen/motion-blur",
    "label": "Motion Blur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Motion Blur",
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
  "blur-sharpen/radial-blur": {
    "type": "blur-sharpen/radial-blur",
    "label": "Radial Blur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Radial Blur",
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
  "blur-sharpen/sharpen": {
    "type": "blur-sharpen/sharpen",
    "label": "Sharpen",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Sharpen",
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
  "blur-sharpen/smart-blur": {
    "type": "blur-sharpen/smart-blur",
    "label": "Smart Blur",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Smart Blur",
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
  "blur-sharpen/unsharp-mask-2": {
    "type": "blur-sharpen/unsharp-mask-2",
    "label": "Unsharp Mask 2",
    "category": "Blur & Sharpen",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Unsharp Mask2",
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
