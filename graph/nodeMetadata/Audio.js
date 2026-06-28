/**
 * @file Effect node metadata for category "Audio".
 * @constant {Object<string,Object>} - Entry map keyed by node type.
 */
(function() {
  var NODE_METADATA = window.NODE_METADATA;
  if (!NODE_METADATA) { NODE_METADATA = window.NODE_METADATA = {}; }
  var entries = {
  "audio/aud-bt": {
    "type": "audio/aud-bt",
    "label": "Aud BT",
    "category": "Audio",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Aud BT",
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
  "audio/aud-delay": {
    "type": "audio/aud-delay",
    "label": "Aud Delay",
    "category": "Audio",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Aud Delay",
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
  "audio/aud-flange": {
    "type": "audio/aud-flange",
    "label": "Aud Flange",
    "category": "Audio",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Aud_Flange",
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
  "audio/aud-hi-lo": {
    "type": "audio/aud-hi-lo",
    "label": "Aud HiLo",
    "category": "Audio",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Aud HiLo",
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
  "audio/aud-modulator": {
    "type": "audio/aud-modulator",
    "label": "Aud Modulator",
    "category": "Audio",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Aud Modulator",
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
  "audio/aud-reverb": {
    "type": "audio/aud-reverb",
    "label": "Aud Reverb",
    "category": "Audio",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Aud Reverb",
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
  "audio/aud-reverse": {
    "type": "audio/aud-reverse",
    "label": "Aud Reverse",
    "category": "Audio",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Aud Reverse",
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
  "audio/aud-stereo-mixer": {
    "type": "audio/aud-stereo-mixer",
    "label": "Aud Stereo Mixer",
    "category": "Audio",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Aud Stereo Mixer",
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
  "audio/aud-tone": {
    "type": "audio/aud-tone",
    "label": "Aud Tone",
    "category": "Audio",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Aud Tone",
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
  "audio/param-eq": {
    "type": "audio/param-eq",
    "label": "Param EQ",
    "category": "Audio",
    "nodeKind": "effector",
    "dedicated": false,
    "matchName": "ADBE Param EQ",
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
