/**
 * @fileoverview Settings modal DOM construction. Builds the settings overlay
 * element and appends it to the body.
 * Depends on: nothing.
 * Exports: __sm_dom.build
 */
// ui/settingsModal/dom.js
// MUST LOAD BEFORE: ui/settingsModal/index.js

var __sm_dom = (function() {

  /**
   * Creates the settings modal DOM, appends it to the body, and returns
   * the overlay element.
   * @return {HTMLElement}
   */
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
        '<div class="settings-modal-body">' +

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

          '<div class="settings-group" style="padding-top: 4px; border-top: 1px solid #2a2a28;">' +
            '<div class="settings-row">' +
              '<span class="settings-label">Anonymous Reporting</span>' +
              '<label class="settings-toggle">' +
                '<input type="checkbox" id="settings-allow-reporting">' +
                '<span class="settings-toggle-slider"></span>' +
              '</label>' +
            '</div>' +
            '<div class="settings-hint">Send anonymous error and performance reports to help improve Procedia</div>' +
          '</div>' +

          '<div class="settings-group" style="padding-top: 4px; border-top: 1px solid #2a2a28;">' +
            '<button id="settings-replay-tutorial" style="background:none;border:1px solid #2a2a28;color:#B4B2A9;font-size:12px;padding:6px 12px;border-radius:4px;cursor:pointer;width:100%;transition:color 0.15s,background 0.15s;" onmouseover="this.style.background=\'#2a2a28\';this.style.color=\'#d4d2cc\'" onmouseout="this.style.background=\'transparent\';this.style.color=\'#B4B2A9\'">Replay Tutorial</button>' +
          '</div>' +

        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    return overlay;
  }

  return { build: build };

})();
