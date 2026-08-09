/**
 * Activation commands — converts plan operations to AE bridge commands
 * and dispatches them through evalBridge.
 * @module vcActivationCommands
 * @dependencies evalBridge
 */
// versioning/activation/activationCommands.js
// DEPENDS ON: bridge/evalBridge.js
// MUST LOAD BEFORE: versioning/activation/activationCoordinator.js

var vcActivationCommands = (function() {

  /**
   * Converts a plan operation to an AE command object.
   * Archive/materialize lifecycle hooks dispatch from here.
   */
  function operationToCommand(op, phaseName) {
    if (op.op === 'preserve') return null;
    if (phaseName === 'archive') {
      return { action: 'parkLayer', params: { nodeUUID: op.entityId, hostingCompUUID: '' } };
    }
    if (phaseName === 'materialize') {
      return { action: 'unparkLayer', params: { nodeUUID: op.entityId, hostingCompUUID: '' } };
    }
    return null;
  }

  /**
   * Executes a batch of commands through evalBridge.
   */
  function executeBatch(cmds) {
    if (typeof evalBridge === 'undefined') {
      return Promise.resolve({ ok: false, error: 'evalBridge not available' });
    }
    if (cmds.length === 0) return Promise.resolve({ ok: true, error: null });
    if (cmds.length === 1) return evalBridge.dispatch(cmds[0]);
    return evalBridge.dispatchBatch(cmds);
  }

  return {
    operationToCommand: operationToCommand,
    executeBatch: executeBatch
  };

})();
