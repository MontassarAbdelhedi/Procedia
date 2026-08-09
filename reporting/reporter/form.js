// reporting/reporter/form.js
// DEPENDS ON: reporting/reporter/core.js, reporting/envSnapshot.js,
//             notifications/notificationBar.js, lib/html2canvas.min.js
// MUST LOAD BEFORE: reporting/reporter/index.js
//
// Bug report form UI — builds and manages the modal form, captures
// screenshots, and submits reports to the backend.

// __reporter_core is declared by reporting/reporter/core.js (earlier in load order)

(function() {

  /**
   * Opens the bug report form modal. The form collects category, severity,
   * title, description, and an optional screenshot.
   */
  function openBugReportForm() {
    if (document.getElementById('bugreport-overlay')) return;
    if (typeof envSnapshot !== 'undefined' && envSnapshot.addAction) {
      envSnapshot.addAction('reporter:openForm');
    }

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

    function _captureScreenshot(onDone) {
      var wrap = document.getElementById('canvas-wrap');
      if (!wrap) {
        document.getElementById('bugreport-screenshot-status').textContent = 'Screenshot unavailable';
        if (onDone) onDone(null);
        return;
      }
      if (typeof html2canvas === 'undefined') {
        document.getElementById('bugreport-screenshot-status').textContent = 'html2canvas not loaded';
        if (onDone) onDone(null);
        return;
      }
      html2canvas(wrap, { useCORS: true, scale: 0.5 }).then(function(canvas) {
        capturedScreenshot = canvas.toDataURL('image/png');
        var kb = Math.round(capturedScreenshot.length / 1024);
        document.getElementById('bugreport-screenshot-status').textContent = 'Screenshot captured (' + kb + 'KB)';
        document.getElementById('bugreport-screenshot-status').style.color = '#40c080';
        if (onDone) onDone(capturedScreenshot);
      }).catch(function() {
        document.getElementById('bugreport-screenshot-status').textContent = 'Screenshot failed';
        if (onDone) onDone(null);
      });
    }

    document.getElementById('bugreport-capture').addEventListener('click', function() { _captureScreenshot(); });

    document.getElementById('bugreport-submit').addEventListener('click', function() {
      if (capturedScreenshot) {
        _submitReport(snap, capturedScreenshot);
        return;
      }
      var submitBtn = document.getElementById('bugreport-submit');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Capturing...';
      _captureScreenshot(function(shot) {
        _submitReport(snap, shot);
      });
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

  __reporter_core.openBugReportForm = openBugReportForm;

})();
