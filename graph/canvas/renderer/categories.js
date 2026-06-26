/**
 * @fileoverview Node category tokens and their associated colours.
 * Provides a mapping of human-readable category names to CSS token strings and hex colours.
 * @dependencies (none)
 * @exports __r_cat { tokens, colors }
 */

// graph/canvas/renderer/categories.js
// DEPENDS ON: nothing
// MUST LOAD BEFORE: renderer/helpers.js, renderer/builder.js, renderer/index.js

var __r_cat = (function() {
  return {
    tokens: {
      'Core':    'core',
      'Layers':  'layers',
      'Shapes':  'shapes',
      'Effects': 'effects',
      'Data':    'data',
      '3D Channel':         'effects',
      'Audio':              'effects',
      'Blur & Sharpen':     'effects',
      'Boris FX Mocha':     'effects',
      'Channel':            'effects',
      'Color Correction':   'effects',
      'Distort':            'effects',
      'Expression Controls':'effects',
      'Generate':           'effects',
      'Immersive Video':    'effects',
      'Keying':             'effects',
      'Matte':              'effects',
      'Noise & Grain':      'effects',
      'obsolete':           'obsolete',
      'Perspective':        'effects',
      'Simulation':         'effects',
      'Stylize':            'effects',
      'Text':               'effects',
      'Time':               'effects',
      'Transition':         'effects',
      'Uncategorized':      'effects',
      'Utility':            'utility'
    },
    colors: {
      'core':    '#534AB7',
      'layers':  '#2E86C1',
      'shapes':  '#1ABC9C',
      'effects': '#27AE60',
      'data':    '#D4AC0D',
      'utility': '#E07B39',
      'obsolete':'#7F8C8D'
    }
  };
})();
