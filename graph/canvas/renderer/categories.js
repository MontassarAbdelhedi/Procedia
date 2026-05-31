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
      'Effects': 'effects',
      'Data':    'data',
      'Utility': 'utility'
    },
    colors: {
      'core':    '#534AB7',
      'layers':  '#2E86C1',
      'effects': '#27AE60',
      'data':    '#D4AC0D',
      'utility': '#E07B39'
    }
  };
})();
