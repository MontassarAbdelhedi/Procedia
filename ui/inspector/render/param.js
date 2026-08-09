/**
 * @fileoverview Parameter row renderer. Produces HTML markup for a single
 * inspector parameter row with label, input control (checkbox, text, color,
 * or enum dropdown), and keyframe icon.
 * Exports: __ins_render_param.escapeAttr, .renderParam
 */
// ui/inspector/render/param.js
// DEPENDS ON: __ins_vm_fmt (for rgbaToHex)
// MUST LOAD BEFORE: ui/inspector/render/group.js, ui/inspector/render/nodeContent.js

var __ins_render_param = (function() {

  /**
   * Escapes HTML special characters for safe attribute insertion.
   * @param {*} str The value to escape.
   * @return {string} The escaped string.
   */
  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
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
      var hex = __ins_vm_fmt.rgbaToHex(param.value);
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
        selectHtml += '<option value="' + escapeAttr(optVal) + '"' + selected + '>' + escapeAttr(optVal) + '</option>';
      }
      selectHtml += '</select>';
      inputHtml = selectHtml;
    } else if (param.type === 'enum') {
      inputHtml =
        '<input type="text" class="inspector-param-input" data-node-id="' + nodeId + '" ' +
        'data-param-key="' + param.key + '" data-param-type="enum" value="' + escapeAttr(param.display) + '"' + disabledAttr + '>';
    } else {
      inputHtml =
        '<input type="text" class="inspector-param-input" data-node-id="' + nodeId + '" ' +
        'data-param-key="' + param.key + '" data-param-type="' + (param.type || 'string') + '" ' +
        'value="' + escapeAttr(param.display) + '"' + disabledAttr + '>';
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

  return {
    escapeAttr:  escapeAttr,
    renderParam: renderParam
  };

})();
