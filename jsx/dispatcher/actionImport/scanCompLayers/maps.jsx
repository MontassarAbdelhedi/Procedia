/**
 * @fileoverview Blending mode and track matte reverse maps for import scanning.
 * (ES3-safe) REQUIRES: (none)
 * Load BEFORE: scanCompLayers.jsx
 * Exports: _buildBlendMap, _buildMatteMap
 */
// scanCompLayers/maps.jsx — Import blend/matte reverse maps (ES3-safe)

function _buildBlendMap() {
  var m = {};
  m[BlendingMode.NORMAL]       = 'NORMAL';
  m[BlendingMode.ADD]          = 'ADD';
  m[BlendingMode.MULTIPLY]     = 'MULTIPLY';
  m[BlendingMode.SCREEN]       = 'SCREEN';
  m[BlendingMode.OVERLAY]      = 'OVERLAY';
  m[BlendingMode.DARKEN]       = 'DARKEN';
  m[BlendingMode.LIGHTEN]      = 'LIGHTEN';
  m[BlendingMode.COLOR_DODGE]  = 'COLOR_DODGE';
  m[BlendingMode.COLOR_BURN]   = 'COLOR_BURN';
  m[BlendingMode.HARD_LIGHT]   = 'HARD_LIGHT';
  m[BlendingMode.SOFT_LIGHT]   = 'SOFT_LIGHT';
  m[BlendingMode.DIFFERENCE]   = 'DIFFERENCE';
  m[BlendingMode.EXCLUSION]    = 'EXCLUSION';
  m[BlendingMode.HUE]          = 'HUE';
  m[BlendingMode.SATURATION]   = 'SATURATION';
  m[BlendingMode.COLOR]        = 'COLOR';
  m[BlendingMode.LUMINOSITY]   = 'LUMINOSITY';
  return m;
}

function _buildMatteMap() {
  var m = {};
  m[TrackMatteType.NO_TRACK_MATTE] = 'NONE';
  m[TrackMatteType.ALPHA]          = 'ALPHA';
  m[TrackMatteType.ALPHA_INVERTED] = 'ALPHA_INVERTED';
  m[TrackMatteType.LUMA]           = 'LUMA';
  m[TrackMatteType.LUMA_INVERTED]  = 'LUMA_INVERTED';
  return m;
}
