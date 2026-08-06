/**
 * @fileoverview Introspect constants — lookup set of effects that open
 * a browse modal (ADBE Basic Text2, ADBE Path Text, ADBE Numbers2) and
 * must be skipped during introspection. (ES3-safe)
 * Load BEFORE: introspect.jsx
 * Exports: _INTROSPECT_SKIP_BROWSE
 */
// introspect/constants.jsx — Introspect skip-browse map (ES3-safe)

var _INTROSPECT_SKIP_BROWSE = {
  'ADBE Basic Text2': true,
  'ADBE Path Text': true,
  'ADBE Numbers2': true
};
