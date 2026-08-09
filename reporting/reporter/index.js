// reporting/reporter/index.js
// DEPENDS ON: reporting/reporter/core.js, reporting/reporter/form.js
// MUST LOAD BEFORE: index.js
//
// Thin aggregator — promotes __reporter_core to the public reporter global
// and cleans up the shared namespace.

var reporter = {
  init: __reporter_core.init,
  openBugReportForm: __reporter_core.openBugReportForm,
  captureException: __reporter_core.captureException,
  captureMessage: __reporter_core.captureMessage
};

delete window.__reporter_core;
