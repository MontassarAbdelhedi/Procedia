/**
 * graph/import/index.js
 *
 * Public API for the Import Project feature. Orchestrates the full import
 * flow: confirmation → save-as-copy → scan → map → stamp UUIDs →
 * build graph → refresh UI.
 *
 * Depends on: bridge/evalBridge.js, graph/import/scanner.js,
 *             graph/import/mapper.js,
 *             graph/import/graphBuilder/helpers.js,
 *             graph/import/graphBuilder/build.js,
 *             data/uuidGenerator.js
 * Exports: importProject.start()
 */
// graph/import/index.js
// DEPENDS ON: bridge/evalBridge.js, graph/import/scanner.js, graph/import/mapper.js,
//             graph/import/graphBuilder/helpers.js,
//             graph/import/graphBuilder/build.js,
//             data/uuidGenerator.js
// MUST LOAD BEFORE: index.js

var importProject = (function() {

  var _running = false;

  /**
   * Shows a progress notification via the notification bar.
   * @param {string} msg
   */
  function _notify(msg, severity) {
    if (typeof notificationBar !== 'undefined' && notificationBar.push) {
      notificationBar.push({
        message: msg,
        severity: severity || 'info',
        duration: severity === 'error' ? 0 : 5000
      });
    }
  }

  /**
   * Dismisses all active notifications.
   */
  function _clearNotifications() {
    if (typeof notificationBar !== 'undefined' && notificationBar.dismissAll) {
      notificationBar.dismissAll();
    }
  }

  /**
   * Starts the import project flow.
   * Call this from the UI (e.g., top bar button click).
   */
  function start() {
    if (_running) {
      _notify('Import already in progress', 'warning');
      return;
    }
    _running = true;

    // --- Step 1: Confirmation ---
    // Use a custom confirm dialog via notification bar with CTA buttons
    // For simplicity, use confirm() first. Can be upgraded to custom modal.
    if (typeof notificationBar !== 'undefined' && notificationBar.push) {
      var confirmed = false;
      _notify(
        'Import Project will stamp Procedia UUIDs on all comps, footage, and layers in this project. ' +
        'This restructures the project panel. It is recommended to save a copy first.',
        'warning'
      );

      // Show the main action notification
      notificationBar.push({
        message: 'Proceed with Import Project?',
        severity: 'warning',
        duration: 0,
        cta: { label: 'Save a Copy First', action: function() { _doImport(true); } },
        secondary: { label: 'Proceed (no copy)', action: function() { _doImport(false); } }
      });

      // Add cancel option
      notificationBar.push({
        message: 'Click to cancel import',
        severity: 'info',
        duration: 6000,
        cta: { label: 'Cancel', action: function() { _running = false; } }
      });

    } else {
      // Fallback: use browser confirm
      var result = confirm(
        'Import Project will stamp Procedia UUIDs on all project items.\n\n' +
        'Click OK to save a copy first, or Cancel to proceed with this file.'
      );
      if (result) {
        _doImport(true);
      } else {
        _doImport(false);
      }
    }
  }

  /**
   * Executes the import after user confirmation.
   * @param {boolean} saveCopy — whether to trigger save-as first
   */
  function _doImport(saveCopy) {
    _clearNotifications();

    var promise = Promise.resolve();

    // --- Step 2: Save as copy if requested ---
    if (saveCopy) {
      _notify('Opening Save As dialog...', 'info');
      promise = evalBridge.dispatch({ action: 'saveAsDialog' }).then(function(res) {
        if (!res.ok) {
          _notify('Save As failed: ' + (res.error || 'unknown'), 'error');
          throw new Error('Save As cancelled or failed');
        }
        _notify('Project saved as copy: ' + (res.data && res.data.projectPath ? res.data.projectPath : 'done'), 'success');
      });
    }

    // --- Step 3: Scan project ---
    promise = promise.then(function() {
      _notify('Scanning project...', 'info');
      return importScanner.scanAll();
    }).then(function(rawData) {
      var compCount = rawData.comps ? rawData.comps.length : 0;
      var footCount = rawData.footage ? rawData.footage.length : 0;
      _notify('Found ' + compCount + ' comps, ' + footCount + ' footage items.', 'info');

      // --- Step 4: Map to import JSON ---
      _notify('Mapping project...', 'info');
      var mapped = importMapper.map(rawData);

      // --- Step 5: Stamp UUIDs in AE ---
      _notify('Stamping UUIDs on AE objects...', 'info');
      return evalBridge.dispatch({
        action: 'stampImportUUIDs',
        params: { stampMap: mapped.stampMap }
      }).then(function(stampRes) {
        if (!stampRes.ok) {
          _notify('UUID stamping failed: ' + (stampRes.error || 'unknown'), 'error');
          throw new Error('UUID stamping failed');
        }

        var stamped = stampRes.data || {};
        _notify(
          'Stamped ' + (stamped.comps || 0) + ' comps, ' +
          (stamped.footage || 0) + ' footage, ' +
          (stamped.layers || 0) + ' layers.',
          'success'
        );

        // --- Step 6: Build graph ---
        _notify('Building graph...', 'info');
        var result = importGraphBuilder.build(mapped.importJSON, mapped.compUUIDs);

        // --- Step 7: Ensure reserved infrastructure ---
        return evalBridge.dispatch({ action: 'ensureReservedComp' }).then(function() {
          // --- Step 8: Refresh UI ---
          if (typeof window.__procedia_internal !== 'undefined' &&
              typeof window.__procedia_internal.refreshUI === 'function') {
            window.__procedia_internal.refreshUI({ full: true });
          }

          // Run auto layout
          if (typeof autoLayout !== 'undefined' && autoLayout.run) {
            setTimeout(function() { autoLayout.run(); }, 200);
          }

          // Refresh renderers
          if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
          if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
          if (typeof minimap !== 'undefined' && minimap.fitAll) {
            setTimeout(function() { minimap.fitAll(); }, 300);
          }

          _notify(
            'Import complete! ' + result.compCount + ' comps, ' +
            result.footageCount + ' footage items imported.',
            'success'
          );
        });
      });
    }).catch(function(err) {
      _notify('Import failed: ' + (err && err.message ? err.message : String(err)), 'error');
    }).then(function() {
      _running = false;
    });
  }

  return {
    start: start
  };

})();
