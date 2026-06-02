/**
 * Wire connection validation public API.
 * Assembles the wireValidator global from sub-modules.
 * @module wireValidator
 * @dependencies wireValidator/portUtils, wireValidator/matteValidator,
 *                wireValidator/canConnect, wireValidator/filterPickerList
 * @exports canConnect, filterPickerList
 */
// graph/wireValidator/index.js
// DEPENDS ON: graph/wireValidator/portUtils.js, graph/wireValidator/matteValidator.js,
//             graph/wireValidator/canConnect.js, graph/wireValidator/filterPickerList.js
// MUST LOAD AFTER: all graph/wireValidator/*.js except this one
// MUST LOAD BEFORE: graph/engine/index.js, graph/wire/wire.js

(function() {
  var wv = window.__wv;
  var wireValidator = {
    canConnect:       wv.canConnect,
    filterPickerList: wv.filterPickerList
  };

  window.wireValidator = wireValidator;
  delete window.__wv;
})();
