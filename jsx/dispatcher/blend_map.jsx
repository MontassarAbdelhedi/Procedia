/**
 * @fileoverview Blending mode name-to-enum mapping (ES3-safe).
 * Global BLEND_MAP used by _handleSetBlendingMode in actions_blending.jsx.
 * Load BEFORE: actions_blending.jsx
 */
// blend_map.jsx — Blending mode name-to-enum mapping (ES3-safe)
// Load BEFORE: actions_blending.jsx

var BLEND_MAP = {
  'NORMAL':       BlendingMode.NORMAL,
  'ADD':          BlendingMode.ADD,
  'MULTIPLY':     BlendingMode.MULTIPLY,
  'SCREEN':       BlendingMode.SCREEN,
  'OVERLAY':      BlendingMode.OVERLAY,
  'DARKEN':       BlendingMode.DARKEN,
  'LIGHTEN':      BlendingMode.LIGHTEN,
  'COLOR_DODGE':  BlendingMode.COLOR_DODGE,
  'COLOR_BURN':   BlendingMode.COLOR_BURN,
  'HARD_LIGHT':   BlendingMode.HARD_LIGHT,
  'SOFT_LIGHT':   BlendingMode.SOFT_LIGHT,
  'DIFFERENCE':   BlendingMode.DIFFERENCE,
  'EXCLUSION':    BlendingMode.EXCLUSION,
  'HUE':          BlendingMode.HUE,
  'SATURATION':   BlendingMode.SATURATION,
  'COLOR':        BlendingMode.COLOR,
  'LUMINOSITY':   BlendingMode.LUMINOSITY
};
