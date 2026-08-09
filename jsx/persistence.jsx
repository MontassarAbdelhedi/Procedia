/**
 * @fileoverview PERSISTENCE module — public API for graph state persistence.
 * Assembles readGraph and writeGraph from sub-modules loaded earlier.
 * The afterSave hook is installed by persistence/afterSave.jsx.
 *
 * REQUIRES: persistence/chunkUtils.jsx, persistence/readGraph.jsx,
 *           persistence/writeGraph.jsx, persistence/afterSave.jsx
 * Exports: PERSISTENCE.writeGraph, PERSISTENCE.readGraph
 */
// jsx/persistence.jsx — PERSISTENCE public API assembly (ES3-safe)

var PERSISTENCE = {
  writeGraph: _persistenceWriteGraph,
  readGraph:  _persistenceReadGraph
};
