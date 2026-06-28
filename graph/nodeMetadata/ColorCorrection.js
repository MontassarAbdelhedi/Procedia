/**
 * @file Effect node metadata for category "Color Correction".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "color-correction/apc-colorama": {
    "type": "color-correction/apc-colorama",
    "label": "APC Colorama",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "APC Colorama",
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
  "color-correction/auto-color": {
    "type": "color-correction/auto-color",
    "label": "Auto Color",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE AutoColor",
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
  "color-correction/auto-contrast": {
    "type": "color-correction/auto-contrast",
    "label": "Auto Contrast",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE AutoContrast",
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
  "color-correction/auto-levels": {
    "type": "color-correction/auto-levels",
    "label": "Auto Levels",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE AutoLevels",
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
  "color-correction/black-white": {
    "type": "color-correction/black-white",
    "label": "Black & White",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Black&White",
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
  "color-correction/brightness-contrast-2": {
    "type": "color-correction/brightness-contrast-2",
    "label": "Brightness & Contrast 2",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Brightness & Contrast 2",
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
  "color-correction/broadcast-colors": {
    "type": "color-correction/broadcast-colors",
    "label": "Broadcast Colors",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Broadcast Colors",
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
  "color-correction/cc-color-offset": {
    "type": "color-correction/cc-color-offset",
    "label": "CC Color Offset",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Color Offset",
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
  "color-correction/cc-toner": {
    "type": "color-correction/cc-toner",
    "label": "CC Toner",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CC Toner",
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
  "color-correction/change-color": {
    "type": "color-correction/change-color",
    "label": "Change Color",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Change Color",
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
  "color-correction/change-to-color": {
    "type": "color-correction/change-to-color",
    "label": "Change To Color",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Change To Color",
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
  "color-correction/channel-mixer": {
    "type": "color-correction/channel-mixer",
    "label": "Channel Mixer",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE CHANNEL MIXER",
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
  "color-correction/color-balance-2": {
    "type": "color-correction/color-balance-2",
    "label": "Color Balance 2",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Color Balance 2",
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
  "color-correction/color-balance-hls": {
    "type": "color-correction/color-balance-hls",
    "label": "Color Balance (HLS)",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Color Balance (HLS)",
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
  "color-correction/color-link": {
    "type": "color-correction/color-link",
    "label": "Color Link",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Color Link",
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
  "color-correction/cs-color-neutralizer": {
    "type": "color-correction/cs-color-neutralizer",
    "label": "CS Color Neutralizer",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CS Color Neutralizer",
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
  "color-correction/cs-kernel": {
    "type": "color-correction/cs-kernel",
    "label": "CS Kernel",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "CS Kernel",
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
  "color-correction/curves-custom": {
    "type": "color-correction/curves-custom",
    "label": "Curves",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE CurvesCustom",
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
  "color-correction/deflicker": {
    "type": "color-correction/deflicker",
    "label": "Deflicker",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Deflicker",
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
  "color-correction/digital-video-limiter": {
    "type": "color-correction/digital-video-limiter",
    "label": "Digital Video Limiter",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE DigitalVideoLimiter",
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
  "color-correction/easy-levels-2": {
    "type": "color-correction/easy-levels-2",
    "label": "Easy Levels 2",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Easy Levels2",
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
  "color-correction/equalize": {
    "type": "color-correction/equalize",
    "label": "Equalize",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Equalize",
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
  "color-correction/exposure-2": {
    "type": "color-correction/exposure-2",
    "label": "Exposure 2",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Exposure2",
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
  "color-correction/gamma-pedestal-gain-2": {
    "type": "color-correction/gamma-pedestal-gain-2",
    "label": "Gamma/Pedestal/Gain 2",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Gamma/Pedestal/Gain2",
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
  "color-correction/hue-saturation": {
    "type": "color-correction/hue-saturation",
    "label": "Hue/Saturation",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE HUE SATURATION",
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
  "color-correction/leave-color": {
    "type": "color-correction/leave-color",
    "label": "Leave Color",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Leave Color",
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
  "color-correction/ocio-cdl-transform": {
    "type": "color-correction/ocio-cdl-transform",
    "label": "OCIO CDL Transform",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE OCIO CDL Transform",
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
  "color-correction/ocio-color-space-transform": {
    "type": "color-correction/ocio-color-space-transform",
    "label": "OCIO Color Space Transform",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE OCIO Color Space Transform",
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
  "color-correction/ocio-display-transform": {
    "type": "color-correction/ocio-display-transform",
    "label": "OCIO Display Transform",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE OCIO Display Transform",
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
  "color-correction/ocio-file-transform": {
    "type": "color-correction/ocio-file-transform",
    "label": "OCIO File Transform",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE OCIO FILE Transform",
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
  "color-correction/ocio-look-transform": {
    "type": "color-correction/ocio-look-transform",
    "label": "OCIO Look Transform",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE OCIO Look Transform",
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
  "color-correction/photo-filter": {
    "type": "color-correction/photo-filter",
    "label": "Photo Filter",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE PhotoFilterPS",
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
  "color-correction/pro-levels-2": {
    "type": "color-correction/pro-levels-2",
    "label": "Pro Levels 2",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Pro Levels2",
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
  "color-correction/ps-arbitrary-map": {
    "type": "color-correction/ps-arbitrary-map",
    "label": "PS Arbitrary Map",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE PS Arbitrary Map",
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
  "color-correction/selective-color": {
    "type": "color-correction/selective-color",
    "label": "Selective Color",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE SelectiveColor",
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
  "color-correction/shadow-highlight": {
    "type": "color-correction/shadow-highlight",
    "label": "Shadow/Highlight",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE ShadowHighlight",
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
  "color-correction/tint": {
    "type": "color-correction/tint",
    "label": "Tint",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Tint",
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
  "color-correction/tritone": {
    "type": "color-correction/tritone",
    "label": "Tritone",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Tritone",
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
  "color-correction/vibrance": {
    "type": "color-correction/vibrance",
    "label": "Vibrance",
    "category": "Color Correction",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Vibrance",
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
