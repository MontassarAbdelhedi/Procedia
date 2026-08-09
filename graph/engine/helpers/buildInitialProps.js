/**
 * graph/engine/helpers/buildInitialProps.js
 *
 * Builds an initial properties object from a node definition's params array.
 * If params is 'dynamic', returns an empty object.
 *
 * Dependencies: none (attaches to window.__procedia_internal.hlp)
 * Load before: graph/engine/helpers/index.js
 *
 * Exports: buildInitialProps
 */
// graph/engine/helpers/buildInitialProps.js
// MUST LOAD BEFORE: graph/engine/helpers/index.js

window.__procedia_internal.hlp = window.__procedia_internal.hlp || {};

window.__procedia_internal.hlp.buildInitialProps = function(params) {
  if (params === 'dynamic') return {};
  var result = {};
  for (var i = 0; i < params.length; i++) {
    result[params[i].key] = params[i]['default'];
  }
  return result;
};
