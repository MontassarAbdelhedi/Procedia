/**
 * @fileoverview Shared category-to-color map for Procedia node categories.
 * Single source of truth — consumed by node list sidebar and canvas renderer.
 * @dependencies (none)
 * @exports __catColors.colors { categoryName → hexColor }
 */
// data/categoryColors.js
// DEPENDS ON: nothing
// MUST LOAD BEFORE: graph/canvas/renderer/builder.js, ui/nodeList/categories.js

var __catColors = (function() {
  return {
    colors: {
      'Core':            '#534AB7',
      'Data':            '#D4AC0D',
      'Layers':          '#185FA5',
      'Shapes':          '#1ABC9C',
      'Effects':         '#27AE60',
      '3D Channel':      '#27AE60',
      'Audio':           '#27AE60',
      'Blur & Sharpen':  '#27AE60',
      'Boris FX Mocha':  '#27AE60',
      'Channel':         '#27AE60',
      'Color Correction':'#27AE60',
      'Distort':         '#27AE60',
      'Expression Controls': '#27AE60',
      'Generate':        '#27AE60',
      'Immersive Video': '#27AE60',
      'Keying':          '#27AE60',
      'Matte':           '#27AE60',
      'Noise & Grain':   '#27AE60',
      'Perspective':     '#27AE60',
      'Simulation':      '#27AE60',
      'Stylize':         '#27AE60',
      'Text':            '#27AE60',
      'Time':            '#27AE60',
      'Transition':      '#27AE60',
      'Uncategorized':   '#27AE60',
      'Utility':         '#5F5E5A',
      'Track Matte':     '#E74C3C',
      'Presets':         '#9B59B6',
      'obsolete':        '#7F8C8D'
    }
  };
})();
