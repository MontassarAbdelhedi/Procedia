/**
 * Activation state — mutable transaction tracking, ID generation, and
 * diagnostics. Holds the single active-transaction guard shared by the
 * coordinator and verify modules.
 * @module vcActivationState
 * @dependencies none
 */
// versioning/activation/activationState.js
// DEPENDS ON: (none)
// MUST LOAD BEFORE: versioning/activation/activationCoordinator.js

var vcActivationState = (function() {

  var _activeTransaction = null;
  var _transactionCounter = 0;

  function _txId() {
    _transactionCounter++;
    return 'TX-' + Date.now() + '-' + _transactionCounter;
  }

  function getActiveTransaction() {
    return _activeTransaction;
  }

  function setActiveTransaction(val) {
    _activeTransaction = val;
  }

  function hasActiveTransaction() {
    return _activeTransaction !== null;
  }

  function getDiagnostics(transactionId) {
    if (_activeTransaction && _activeTransaction.id === transactionId) {
      return { ok: true, data: _activeTransaction };
    }
    return { ok: false, error: 'No active transaction with ID ' + (transactionId || 'unknown') };
  }

  return {
    _txId: _txId,
    getActiveTransaction: getActiveTransaction,
    setActiveTransaction: setActiveTransaction,
    hasActiveTransaction: hasActiveTransaction,
    getDiagnostics: getDiagnostics
  };

})();
