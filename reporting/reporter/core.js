// reporting/reporter/core.js
// DEPENDS ON: reporting/envSnapshot.js, ui/settings.js, bridge/evalBridge.js,
//             graph/graphState/index.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: reporting/reporter/form.js, reporting/reporter/index.js
//
// Sentry initialization, evalBridge error-capture wrapping, and the public
// captureException / captureMessage API. Defines the shared __reporter_core
// namespace that form.js extends and index.js exports as the reporter global.

var SENTRY_DSN = '__SENTRY_DSN__';
var REPORTING_API_URL = '__REPORTING_API_URL__';

var __reporter_core = {};

(function() {

  var _initialized = false;
  var _sentryEnabled = false;

  /**
   * Initializes the reporter module. Called from index.js after all
   * dependencies are loaded. Must be called explicitly.
   */
  function init() {
    if (_initialized) return;
    _initialized = true;

    var prefs = (typeof settings !== 'undefined' && settings.getAll)
      ? settings.getAll() : {};
    _sentryEnabled = prefs.allowReporting === true;

    if (_sentryEnabled && typeof Sentry !== 'undefined' && SENTRY_DSN && SENTRY_DSN.indexOf('__') !== 0) {
      var pv = (typeof envSnapshot !== 'undefined' && envSnapshot.getPluginVersion)
        ? envSnapshot.getPluginVersion() : '0.0.4';
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: 'beta',
        release: 'procedia@' + pv,
        tracesSampleRate: 0.3
      });
    }

    _wrapEvalBridge();

    if (typeof envSnapshot !== 'undefined' && envSnapshot.addAction) {
      envSnapshot.addAction('reporter:init', { sentryEnabled: _sentryEnabled });
    }
  }

  /**
   * Wraps evalBridge.dispatch and evalBridge.dispatchBatch to capture errors
   * via Sentry when they occur.
   */
  function _wrapEvalBridge() {
    if (typeof evalBridge === 'undefined') return;

    var origDispatch = evalBridge.dispatch;
    if (origDispatch && !origDispatch.__wrapped) {
      evalBridge.dispatch = function(commandObj, _attempt) {
        return origDispatch.call(evalBridge, commandObj, _attempt)
          .then(function(res) {
            if (!res.ok && res.error) {
              _captureBridgeError(commandObj, res.error);
            }
            return res;
          })
          .catch(function(err) {
            _captureBridgeError(commandObj, err.message || String(err));
            throw err;
          });
      };
      evalBridge.dispatch.__wrapped = true;
    }

    var origBatch = evalBridge.dispatchBatch;
    if (origBatch && !origBatch.__wrapped) {
      evalBridge.dispatchBatch = function(commandArray) {
        return origBatch.call(evalBridge, commandArray)
          .then(function(res) {
            if (!res.ok && res.error) {
              _captureBridgeError({ action: 'batch', count: commandArray.length }, res.error);
            }
            return res;
          })
          .catch(function(err) {
            _captureBridgeError({ action: 'batch', count: commandArray.length }, err.message || String(err));
            throw err;
          });
      };
      evalBridge.dispatchBatch.__wrapped = true;
    }
  }

  function _captureBridgeError(command, errorMsg) {
    if (!_sentryEnabled || typeof Sentry === 'undefined') return;
    if (errorMsg && errorMsg.indexOf('not reachable') !== -1) return;
    var redactedCommand = { action: command.action || 'unknown' };
    if (typeof redact !== 'undefined' && redact.hash) {
      redactedCommand.hash = redact.hash(JSON.stringify(command));
    }
    Sentry.captureException(new Error(errorMsg), {
      tags: { action: command.action || 'unknown' },
      extra: { command: redactedCommand }
    });
  }

  /**
   * Captures an exception to Sentry.
   * @param {Error} error The error object
   * @param {Object} [context] Optional context tags/extra
   */
  function captureException(error, context) {
    if (!_sentryEnabled || typeof Sentry === 'undefined') return;
    Sentry.captureException(error, {
      tags: (context && context.tags) || {},
      extra: (context && context.extra) || {}
    });
  }

  /**
   * Captures a message to Sentry.
   * @param {string} message The message
   * @param {string} [level] Log level ('info', 'warning', 'error')
   * @param {Object} [context] Optional context
   */
  function captureMessage(message, level, context) {
    if (!_sentryEnabled || typeof Sentry === 'undefined') return;
    Sentry.captureMessage(message, {
      level: level || 'info',
      tags: (context && context.tags) || {},
      extra: (context && context.extra) || {}
    });
  }

  __reporter_core.init = init;
  __reporter_core.captureException = captureException;
  __reporter_core.captureMessage = captureMessage;
  __reporter_core._sentryEnabled = function() { return _sentryEnabled; };

})();
