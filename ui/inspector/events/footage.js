/**
 * @fileoverview Footage browse/import click handler for the inspector.
 * Opens a file dialog via ExtendScript and imports the selected footage.
 * Depends on: graphState, evalBridge, inspector, renderer, pollerNotifier (globals).
 * Attaches to __ins_events.onFootageBrowseClick.
 */
// ui/inspector/events/footage.js
// DEPENDS ON: graph/graphState.js, bridge/evalBridge.js

var __ins_events = __ins_events || {};

(function() {

  /**
   * Handles clicks on the footage browse/import button.
   * Opens a file dialog via ExtendScript and imports the selected footage.
   * @param {Event} e The click event.
   */
  function _onFootageBrowseClick(e) {
    var btn = e.target;
    if (!btn || !btn.classList || !btn.classList.contains('inspector-footage-btn')) return;
    if (btn.classList.contains('loading')) return;

    var nodeId = btn.getAttribute('data-node-id');
    if (!nodeId) return;

    btn.classList.add('loading');
    btn.innerHTML = '<i class="ti ti-loader"></i> Importing\u2026';

    evalBridge.dispatch({
      action: 'browseAndImportFootage',
      params: { nodeUUID: nodeId }
    }).then(function(res) {
      btn.classList.remove('loading');
      if (res.ok && res.data && !res.data.cancelled) {
        var nodeData = graphState.getNode(nodeId);
        if (nodeData) {
          nodeData.props.filePath = res.data.filePath;
          nodeData.props.label = res.data.itemName;

          var wires = graphState.getAllWires();
          var hostingCompUUID = null;
          var layerUUID = null;
          for (var wId in wires) {
            if (!wires.hasOwnProperty(wId)) continue;
            var w = wires[wId];
            if (w.fromNode === nodeId && w.type === 'layer' && w._pathLayerUUID) {
              layerUUID = w._pathLayerUUID;
              hostingCompUUID = w.toNode;
              break;
            }
          }

          if (hostingCompUUID && layerUUID) {
            evalBridge.dispatch({
              action: 'createFootageLayer',
              params: {
                nodeUUID: nodeId,
                hostingCompUUID: hostingCompUUID,
                layerUUID: layerUUID,
                label: nodeData.props.label
              }
            }).then(function(createRes) {
              if (createRes.ok) {
                graphState.updateNode(nodeId, { props: nodeData.props, state: 'alive', hasParkedLayer: false });
                if (typeof pollerNotifier !== 'undefined' && pollerNotifier.clearNotified) {
                  pollerNotifier.clearNotified(nodeId);
                }
              } else {
                console.error('[inspector] createFootageLayer failed:', createRes.error);
                graphState.updateNode(nodeId, { props: nodeData.props, state: 'error' });
              }
              window.__procedia_internal.refreshUI({ minimap: false });
            });
          } else {
            graphState.updateNode(nodeId, { props: nodeData.props, state: 'alive' });
            window.__procedia_internal.refreshUI({ wireRenderer: false, minimap: false });
          }
        }
        return;
      }
      if (res.ok && res.data && res.data.cancelled) {
        btn.innerHTML = '<i class="ti ti-folder-open"></i> Browse &amp; Import';
      }
      renderer.render();
      if (typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    });
  }

  __ins_events.onFootageBrowseClick = _onFootageBrowseClick;

})();
