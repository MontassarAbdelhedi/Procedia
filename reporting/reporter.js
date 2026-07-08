// reporting/reporter.js
// DEPENDS ON: reporting/envSnapshot.js, ui/settings.js, bridge/evalBridge.js,
//             graph/graphState/index.js, graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js
//
// Central reporting module. Initializes Sentry, wraps evalBridge for error
// capture, and provides the bug report form UI.

// CONFIGURATION — set these before beta release
var SENTRY_DSN = 'https://1c0e5e6323ba52794f9fb0eb559c54f9@o4511667499040768.ingest.de.sentry.io/4511667578011728';
var REPORTING_API_URL = 'https://procedia-reporter.vercel.app/api/reports';

var reporter = (function() {

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
    _sentryEnabled = prefs.allowReporting !== false;

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
    Sentry.captureException(new Error(errorMsg), {
      tags: { action: command.action || 'unknown' },
      extra: { command: command }
    });
  }

  /**
   * Opens the bug report form modal. The form collects category, severity,
   * title, description, and an optional screenshot.
   */
  function openBugReportForm() {
    if (document.getElementById('bugreport-overlay')) return;
    envSnapshot.addAction('reporter:openForm');

    envSnapshot.getSnapshot(function(snap) {
      _buildForm(snap);
    });
  }

  function _buildForm(snap) {
    var overlay = document.createElement('div');
    overlay.id = 'bugreport-overlay';
    overlay.className = 'bugreport-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:1000;';

    var modal = document.createElement('div');
    modal.className = 'bugreport-modal';
    modal.style.cssText = 'background:#1e1e1c;border:1px solid #3a3a38;border-radius:8px;width:520px;max-height:80vh;overflow-y:auto;';

    modal.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 18px;border-bottom:1px solid #3a3a38;">' +
        '<span style="font-size:14px;font-weight:600;">Report a Bug</span>' +
        '<button id="bugreport-close" style="background:none;border:none;color:#888680;cursor:pointer;font-size:18px;">&times;</button>' +
      '</div>' +
      '<div style="padding:18px;">' +
        '<div style="margin-bottom:10px;">' +
          '<label style="display:block;font-size:11px;color:#888680;margin-bottom:3px;">Category</label>' +
          '<select id="bugreport-category" style="width:100%;background:#2a2a28;border:1px solid #3a3a38;color:#d4d2cc;padding:6px 10px;border-radius:4px;font-size:13px;">' +
            '<option value="bug">Bug</option>' +
            '<option value="performance">Performance Issue</option>' +
            '<option value="suggestion">Suggestion / Feedback</option>' +
          '</select>' +
        '</div>' +
        '<div style="margin-bottom:10px;">' +
          '<label style="display:block;font-size:11px;color:#888680;margin-bottom:3px;">Severity</label>' +
          '<select id="bugreport-severity" style="width:100%;background:#2a2a28;border:1px solid #3a3a38;color:#d4d2cc;padding:6px 10px;border-radius:4px;font-size:13px;">' +
            '<option value="low">Low</option>' +
            '<option value="medium" selected>Medium</option>' +
            '<option value="high">High</option>' +
            '<option value="critical">Critical</option>' +
          '</select>' +
        '</div>' +
        '<div style="margin-bottom:10px;">' +
          '<label style="display:block;font-size:11px;color:#888680;margin-bottom:3px;">Title</label>' +
          '<input id="bugreport-title" type="text" placeholder="Brief summary" style="width:100%;background:#2a2a28;border:1px solid #3a3a38;color:#d4d2cc;padding:6px 10px;border-radius:4px;font-size:13px;">' +
        '</div>' +
        '<div style="margin-bottom:10px;">' +
          '<label style="display:block;font-size:11px;color:#888680;margin-bottom:3px;">Description</label>' +
          '<textarea id="bugreport-description" rows="4" placeholder="What happened? What did you expect?" style="width:100%;background:#2a2a28;border:1px solid #3a3a38;color:#d4d2cc;padding:6px 10px;border-radius:4px;font-size:13px;resize:vertical;font-family:inherit;"></textarea>' +
        '</div>' +
        '<div style="margin-bottom:10px;">' +
          '<label style="display:block;font-size:11px;color:#888680;margin-bottom:3px;">Screenshot</label>' +
          '<div style="display:flex;gap:8px;align-items:center;">' +
            '<button id="bugreport-capture" style="background:#2a2a28;border:1px solid #3a3a38;color:#d4d2cc;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Capture Canvas</button>' +
            '<span id="bugreport-screenshot-status" style="font-size:11px;color:#888680;">No screenshot</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">' +
          '<button id="bugreport-cancel" style="background:#2a2a28;border:1px solid #3a3a38;color:#d4d2cc;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:12px;">Cancel</button>' +
          '<button id="bugreport-submit" style="background:#e0641e;border:none;color:#fff;padding:6px 14px;border-radius:4px;cursor:pointer;font-size:12px;">Submit Report</button>' +
        '</div>' +
      '</div>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    var capturedScreenshot = null;

    document.getElementById('bugreport-close').addEventListener('click', function() { _closeForm(); });
    document.getElementById('bugreport-cancel').addEventListener('click', function() { _closeForm(); });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) _closeForm();
    });

    function _captureScreenshot() {
      var wrap = document.getElementById('canvas-wrap');
      if (!wrap) { document.getElementById('bugreport-screenshot-status').textContent = 'Screenshot unavailable'; return; }
      if (typeof html2canvas === 'undefined') {
        document.getElementById('bugreport-screenshot-status').textContent = 'html2canvas not loaded';
        return;
      }
      html2canvas(wrap, { useCORS: true, scale: 0.5 }).then(function(canvas) {
        capturedScreenshot = canvas.toDataURL('image/png');
        var kb = Math.round(capturedScreenshot.length / 1024);
        document.getElementById('bugreport-screenshot-status').textContent = 'Screenshot captured (' + kb + 'KB)';
        document.getElementById('bugreport-screenshot-status').style.color = '#40c080';
      }).catch(function() {
        document.getElementById('bugreport-screenshot-status').textContent = 'Screenshot failed';
      });
    }

    // Auto-capture screenshot on form open
    setTimeout(_captureScreenshot, 300);

    document.getElementById('bugreport-capture').addEventListener('click', _captureScreenshot);

    document.getElementById('bugreport-submit').addEventListener('click', function() {
      _submitReport(snap, capturedScreenshot);
    });
  }

  function _closeForm() {
    var overlay = document.getElementById('bugreport-overlay');
    if (overlay) {
      document.body.removeChild(overlay);
    }
  }

  function _submitReport(snap, screenshot) {
    var category = document.getElementById('bugreport-category').value;
    var severity = document.getElementById('bugreport-severity').value;
    var title    = document.getElementById('bugreport-title').value.trim();
    var desc     = document.getElementById('bugreport-description').value.trim();

    if (!title) { alert('Please enter a title.'); return; }
    if (!desc)  { alert('Please enter a description.'); return; }

    if (typeof envSnapshot !== 'undefined' && envSnapshot.addAction) {
      envSnapshot.addAction('reporter:submit', { category: category, title: title });
    }

    var submitBtn = document.getElementById('bugreport-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    var payload = {
      category: category,
      title: title,
      description: desc,
      severity: severity,
      screenshot: screenshot || null,
      env: snap
    };

    if (REPORTING_API_URL && REPORTING_API_URL.indexOf('__') !== 0) {
      fetch(REPORTING_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      .then(function(res) { return res.json(); })
      .then(function(data) {
        if (data.ok) {
          if (typeof notificationBar !== 'undefined' && notificationBar.push) {
            notificationBar.push({ message: 'Report submitted — thank you!', severity: 'success', duration: 4000 });
          }
          _closeForm();
        } else {
          alert('Failed to submit: ' + (data.error || 'unknown error'));
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Report';
        }
      })
      .catch(function(err) {
        alert('Network error: ' + err.message);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Report';
      });
    } else {
      // Fallback: log to console and show success (for dev without backend)
      console.log('[reporter] Bug report (no backend configured):', payload);
      if (typeof notificationBar !== 'undefined' && notificationBar.push) {
        notificationBar.push({ message: 'Report logged to console (no backend configured)', severity: 'info', duration: 4000 });
      }
      _closeForm();
    }
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

  return {
    init: init,
    openBugReportForm: openBugReportForm,
    captureException: captureException,
    captureMessage: captureMessage
  };

})();
