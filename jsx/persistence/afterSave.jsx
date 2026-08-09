/**
 * @fileoverview afterSave hook — triggers findReservedComp() on AE project save
 *              to keep the Reserved Comp text layers current.
 *              Best-effort; the hook is not available in all AE editions.
 * REQUIRES: utils.jsx
 */
// jsx/persistence/afterSave.jsx — afterSave hook (ES3-safe)

(function _setupAfterSave() {
  try {
    if (typeof app !== 'undefined' && typeof app.project !== 'undefined' &&
        typeof app.project.afterSave !== 'undefined') {
      app.project.afterSave = function() {
        try {
          findReservedComp();
        } catch (e) {}
      };
    }
  } catch (e) {}
})();
