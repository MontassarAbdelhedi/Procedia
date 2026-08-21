/**
 * @fileoverview Settings modal DOM construction. Builds the settings overlay
 * element and appends it to the body.
 * Depends on: nothing.
 * Exports: __sm_dom.build
 */
// ui/settingsModal/dom.js
// MUST LOAD BEFORE: ui/settingsModal/index.js

var __sm_dom = (function() {

  function build() {
    var overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.style.display = 'none';

    overlay.innerHTML =
      '<div class="settings-modal">' +
        '<div class="settings-modal-header">' +
          '<span class="settings-modal-title">Settings</span>' +
          '<button class="settings-modal-close" id="settings-close" title="Close"><i class="ti ti-x"></i></button>' +
        '</div>' +
        '<div class="settings-tabs" id="settings-tabs">' +
          '<button class="settings-tab active" data-tab="general">General</button>' +
          '<button class="settings-tab" data-tab="wires">Wires</button>' +
          '<button class="settings-tab" data-tab="layout">Auto Layout</button>' +
          '<button class="settings-tab" data-tab="updates">Updates</button>' +
        '</div>' +
        '<div class="settings-modal-body">' +

          '<div class="settings-tab-panel active" id="settings-panel-general">' +

            '<div class="settings-group">' +
              '<div class="settings-row">' +
                '<span class="settings-label">Minimap</span>' +
                '<label class="settings-toggle">' +
                  '<input type="checkbox" id="settings-minimap">' +
                  '<span class="settings-toggle-slider"></span>' +
                '</label>' +
              '</div>' +
              '<div class="settings-hint">Show minimap in the bottom-right corner of the canvas</div>' +
            '</div>' +

            '<div class="settings-group">' +
              '<div class="settings-row">' +
                '<span class="settings-label">Port Labels</span>' +
                '<label class="settings-toggle">' +
                  '<input type="checkbox" id="settings-port-labels">' +
                  '<span class="settings-toggle-slider"></span>' +
                '</label>' +
              '</div>' +
              '<div class="settings-hint">Show port labels on node hover</div>' +
            '</div>' +

            '<div class="settings-group">' +
              '<div class="settings-row">' +
                '<span class="settings-label">Anonymous Reporting</span>' +
                '<label class="settings-toggle">' +
                  '<input type="checkbox" id="settings-allow-reporting">' +
                  '<span class="settings-toggle-slider"></span>' +
                '</label>' +
              '</div>' +
              '<div class="settings-hint">Send anonymous error and performance reports to help improve Procedia</div>' +
            '</div>' +

            '<div class="settings-group">' +
              '<div class="settings-row">' +
                '<span class="settings-label">Auto Shy</span>' +
                '<label class="settings-toggle">' +
                  '<input type="checkbox" id="settings-auto-shy">' +
                  '<span class="settings-toggle-slider"></span>' +
                '</label>' +
              '</div>' +
              '<div class="settings-hint">Automatically shy unselected layers in the timeline when selecting a node</div>' +
            '</div>' +

            '<div class="settings-group">' +
              '<button id="settings-replay-tutorial" class="settings-replay-btn">Replay Tutorial</button>' +
            '</div>' +

          '</div>' +

          '<div class="settings-tab-panel" id="settings-panel-wires">' +

            '<div class="settings-group">' +
              '<div class="settings-row">' +
                '<span class="settings-label">Wire Style</span>' +
                '<select id="settings-wire-style" class="settings-select">' +
                  '<option value="bezier">Bezier</option>' +
                  '<option value="direct">Direct</option>' +
                  '<option value="stepped">Stepped</option>' +
                '</select>' +
              '</div>' +
              '<div class="settings-hint">Appearance of connection wires between nodes</div>' +
            '</div>' +

            '<div class="settings-group">' +
              '<div class="settings-row">' +
                '<span class="settings-label">Animated Dash</span>' +
                '<label class="settings-toggle">' +
                  '<input type="checkbox" id="settings-animated-dash">' +
                  '<span class="settings-toggle-slider"></span>' +
                '</label>' +
              '</div>' +
              '<div class="settings-hint">Dash animation flows along wires (applies to any wire style)</div>' +
            '</div>' +

          '</div>' +

          '<div class="settings-tab-panel" id="settings-panel-layout">' +

            '<div class="settings-group">' +
              '<div class="settings-row">' +
                '<span class="settings-label">Snap to Grid</span>' +
                '<label class="settings-toggle">' +
                  '<input type="checkbox" id="settings-snap-to-grid">' +
                  '<span class="settings-toggle-slider"></span>' +
                '</label>' +
              '</div>' +
              '<div class="settings-hint">Snap node positions to 24px grid units when dragging</div>' +
            '</div>' +

            '<div class="settings-group">' +
              '<div class="settings-row">' +
                '<span class="settings-label">Layout Direction</span>' +
                '<select id="settings-layout-direction" class="settings-select">' +
                  '<option value="LR">Left to Right</option>' +
                  '<option value="TB">Top to Bottom</option>' +
                '</select>' +
              '</div>' +
              '<div class="settings-hint">Flow direction for auto layout</div>' +
            '</div>' +

            '<div class="settings-group">' +
              '<div class="settings-row">' +
                '<span class="settings-label">Layout Spacing</span>' +
              '</div>' +
              '<div class="settings-row">' +
                '<span class="settings-label-sub">Horizontal</span>' +
                '<input type="range" id="settings-layout-hspacing" class="settings-range" min="40" max="300" value="80">' +
                '<span class="settings-range-value" id="settings-layout-hspacing-val">80</span>' +
              '</div>' +
              '<div class="settings-row">' +
                '<span class="settings-label-sub">Vertical</span>' +
                '<input type="range" id="settings-layout-vspacing" class="settings-range" min="20" max="200" value="40">' +
                '<span class="settings-range-value" id="settings-layout-vspacing-val">40</span>' +
              '</div>' +
              '<div class="settings-hint">Spacing between layers and nodes in auto layout</div>' +
            '</div>' +

          '</div>' +

          '<div class="settings-tab-panel" id="settings-panel-updates">' +
            '<div class="settings-update-hero">' +
              '<div class="settings-update-icon"><i class="ti ti-download"></i></div>' +
              '<div>' +
                '<div class="settings-update-name">Procedia <span id="settings-update-current">0.0.0</span></div>' +
                '<div class="settings-hint">Installed version</div>' +
              '</div>' +
            '</div>' +
            '<div class="settings-update-details">' +
              '<div class="settings-row"><span class="settings-label-sub">Latest</span><span id="settings-update-latest">Not checked</span></div>' +
              '<div id="settings-update-status" class="settings-update-status" role="status" aria-live="polite">Check for updates to see whether a new release is available.</div>' +
            '</div>' +
            '<div id="settings-update-progress-wrap" class="settings-update-progress-wrap" style="display:none">' +
              '<progress id="settings-update-progress" max="100" value="0" aria-label="Update progress"></progress>' +
            '</div>' +
            '<div class="settings-update-actions">' +
              '<button id="settings-update-notes" class="settings-action-btn settings-action-btn--quiet" style="display:none">View release notes</button>' +
              '<button id="settings-retry-update" class="settings-action-btn settings-action-btn--quiet" style="display:none">Retry</button>' +
              '<button id="settings-check-updates" class="settings-action-btn settings-action-btn--quiet">Check for updates</button>' +
              '<button id="settings-install-update" class="settings-action-btn" style="display:none">Update Procedia</button>' +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    return overlay;
  }

  return { build: build };

})();
