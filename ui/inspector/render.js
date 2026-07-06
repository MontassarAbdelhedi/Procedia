/**
 * @fileoverview Inspector HTML rendering module. Produces markup for
 * the inspector panel content, including param rows, and layer actions.
 * Exports: __ins_render.renderLayerActions, .renderParam,
 *          .renderGroup, .renderNodeContent
 */
// ui/inspector/render.js
// DEPENDS ON: __ins_layerStack (for layer stack rendering)
// MUST LOAD BEFORE: ui/inspector/index.js

var __ins_render = (function() {

  /**
   * Escapes HTML special characters for safe attribute insertion.
   * @param {*} str The value to escape.
   * @return {string} The escaped string.
   */
  function _escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  /**
   * Renders the layer order action buttons (Move Up / Move Down).
   * @param {Object} view The node view model.
   * @return {string} HTML string.
   */
  function renderLayerActions(view) {
    return (
      '<div class="inspector-group">' +
        '<div class="inspector-group-label">Layer Order</div>' +
        '<button class="inspector-layer-btn" data-node-id="' + view.nodeId + '" data-host-uuid="' + view.hostingCompUUID + '" data-direction="up">' +
          '<i class="ti ti-chevron-up"></i> Move Up' +
        '</button>' +
        '<button class="inspector-layer-btn" data-node-id="' + view.nodeId + '" data-host-uuid="' + view.hostingCompUUID + '" data-direction="down">' +
          '<i class="ti ti-chevron-down"></i> Move Down' +
        '</button>' +
      '</div>'
    );
  }

  /**
   * Renders a single parameter row with label and input (checkbox or text).
   * @param {string} nodeId The node ID.
   * @param {Object} param The parameter descriptor.
   * @return {string} HTML string.
   */
  function renderParam(nodeId, param) {
    if (param.wired) {
      return (
        '<div class="inspector-param-row">' +
          '<span class="inspector-param-label">' + param.label + '</span>' +
          '<span class="inspector-param-value wired">\u2b61 wired</span>' +
        '</div>'
      );
    }

    var disabledAttr = param.disabled ? ' disabled' : '';

    var inputHtml = '';
    if (param.type === 'boolean') {
      var checked = param.value === true || param.display === 'true' ? ' checked' : '';
      inputHtml =
        '<input type="checkbox" class="inspector-param-input" data-node-id="' + nodeId + '" ' +
        'data-param-key="' + param.key + '" data-param-type="boolean"' + checked + disabledAttr + '>';
    } else if (param.type === 'color') {
      var hex = __ins_vm.rgbaToHex(param.value);
      inputHtml =
        '<button class="cp-trigger" data-node-id="' + nodeId + '" data-param-key="' + param.key + '"' + disabledAttr + '>' +
          '<span class="cp-trigger-swatch" style="background:' + param.display + '"></span>' +
          '<span class="cp-trigger-hex">' + hex + '</span>' +
        '</button>';
    } else if (param.type === 'enum' && param.options && param.options.length > 0) {
      var selectHtml = '<select class="inspector-param-input inspector-param-select" data-node-id="' + nodeId + '" ' +
        'data-param-key="' + param.key + '" data-param-type="enum"' + disabledAttr + '>';
      for (var oi = 0; oi < param.options.length; oi++) {
        var optVal = param.options[oi];
        var selected = String(optVal) === String(param.value) ? ' selected' : '';
        selectHtml += '<option value="' + _escapeAttr(optVal) + '"' + selected + '>' + _escapeAttr(optVal) + '</option>';
      }
      selectHtml += '</select>';
      inputHtml = selectHtml;
    } else if (param.type === 'enum') {
      inputHtml =
        '<input type="text" class="inspector-param-input" data-node-id="' + nodeId + '" ' +
        'data-param-key="' + param.key + '" data-param-type="enum" value="' + _escapeAttr(param.display) + '"' + disabledAttr + '>';
    } else {
      inputHtml =
        '<input type="text" class="inspector-param-input" data-node-id="' + nodeId + '" ' +
        'data-param-key="' + param.key + '" data-param-type="' + (param.type || 'string') + '" ' +
        'value="' + _escapeAttr(param.display) + '"' + disabledAttr + '>';
    }

    var kfIconHtml = '';
    if (param.animatable) {
      var kfClass = 'kf-icon' + (param.keyframed ? ' kf-active' : ' kf-inactive');
      kfIconHtml = '<span class="' + kfClass + '" data-node-id="' + nodeId + '" data-param-key="' + param.key + '">' +
        '<span class="kf-arrow kf-arrow-left">\u25C0</span>' +
        '<span class="kf-diamond"></span>' +
        '<span class="kf-arrow kf-arrow-right">\u25B6</span>' +
        '</span>';
    }

    return (
      '<div class="inspector-param-row' + (param.disabled ? ' inspector-param-disabled' : '') + '">' +
        kfIconHtml +
        '<span class="inspector-param-label">' + param.label + '</span>' +
        inputHtml +
      '</div>'
    );
  }

  /**
   * Renders a group of parameters with a group label.
   * @param {string} nodeId The node ID.
   * @param {Object} group The group descriptor with .label and .params.
   * @return {string} HTML string.
   */
  function renderGroup(nodeId, group) {
    var paramsHtml = '';
    for (var i = 0; i < group.params.length; i++) {
      paramsHtml += renderParam(nodeId, group.params[i]);
    }
    return (
      '<div class="inspector-group">' +
        '<div class="inspector-group-label">' + group.label + '</div>' +
        paramsHtml +
      '</div>'
    );
  }

  /**
   * Renders the footage browse/import action button and status.
   * @param {Object} view The node view model.
   * @return {string} HTML string.
   */
  function renderFootageActions(view) {
    var nodeData = graphState.getNode(view.nodeId);
    var hasFootage = nodeData && nodeData.props && nodeData.props.filePath;
    var isError = view.state.indexOf('error') !== -1;
    var statusHtml = hasFootage
      ? '<span class="inspector-filename">' + _escapeAttr(nodeData.props.filePath.split('\\').pop().split('/').pop()) + '</span>'
      : '<span class="inspector-filename muted">' + (isError ? 'no file imported \u2014 browse to fix' : 'no file selected') + '</span>';
    return (
      '<div class="inspector-group">' +
        '<div class="inspector-group-label">Footage Import</div>' +
        '<div class="inspector-param-row">' +
          statusHtml +
        '</div>' +
        '<button class="inspector-footage-btn" data-node-id="' + view.nodeId + '">' +
          '<i class="ti ti-folder-open"></i> Browse &amp; Import' +
        '</button>' +
      '</div>'
    );
  }

  /**
   * Renders the complete inspector content for a node.
   * @param {Object} view The view model from __ins_vm.buildViewModel().
   * @return {string} HTML string.
   */
  function renderNodeContent(view) {
    if (view.loading) {
      return (
        '<div class="inspector-header">' +
          '<div class="inspector-node-name">' + view.name + '</div>' +
          '<div class="inspector-state-badge">' +
            '<div class="inspector-state-dot"></div>' +
            '<span class="inspector-state-text">' + view.state + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="inspector-group">' +
          '<div class="inspector-param-row">' +
            '<span class="inspector-param-label">Schema</span>' +
            '<span class="inspector-param-value">Loading\u2026</span>' +
          '</div>' +
        '</div>'
      );
    }

    var layerActionsHtml = '';
    if (view.nodeType === 'core/comp' && view.state.indexOf('alive') !== -1 && view.hostingCompUUID) {
      layerActionsHtml = renderLayerActions(view);
    }

    var layerStackHtml = '';
    if (view.nodeType === 'core/comp' && view.state.indexOf('alive') !== -1) {
      var ls = __ins_layerStack.buildViewModel(view.nodeId);
      layerStackHtml = __ins_layerStack.render(view.nodeId, ls);
    }

    var footageActionsHtml = '';
    if (view.nodeType === 'core/footage') {
      footageActionsHtml = renderFootageActions(view);
    }

    var groupsHtml = '';
    for (var i = 0; i < view.groups.length; i++) {
      groupsHtml += renderGroup(view.nodeId, view.groups[i]);
    }

    return (
      '<div class="inspector-header">' +
        '<div class="inspector-node-name">' + view.name + '</div>' +
        '<div class="inspector-state-badge">' +
          '<div class="inspector-state-dot' + (view.state.indexOf('error') !== -1 ? ' error' : '') + '"></div>' +
          '<span class="inspector-state-text">' + view.state + '</span>' +
        '</div>' +
      '</div>' +
      layerActionsHtml +
      layerStackHtml +
      footageActionsHtml +
      groupsHtml
    );
  }

  return {
    renderLayerActions: renderLayerActions,
    renderFootageActions: renderFootageActions,
    renderParam:        renderParam,
    renderGroup:        renderGroup,
    renderNodeContent:  renderNodeContent
  };

})();
