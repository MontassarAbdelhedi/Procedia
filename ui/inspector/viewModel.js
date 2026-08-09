/**
 * @fileoverview Backward-compatible assembly of inspector view model utilities.
 * Delegates to sub-modules: viewModel/wiring.js, viewModel/format.js, viewModel/builder.js.
 * Depends on: __ins_vm_wire, __ins_vm_fmt, __ins_vm_builder (globals).
 * Exports: __ins_vm.isParamWired, .stateLabel, .paramList, .formatValueForInput,
 *          .parseInputValue, .buildViewModel, .rgbaToHex, .hexToRgba
 */
// ui/inspector/viewModel.js
// DEPENDS ON: ui/inspector/viewModel/wiring.js, ui/inspector/viewModel/format.js,
//             ui/inspector/viewModel/builder.js
// MUST LOAD BEFORE: ui/inspector/index.js

var __ins_vm = {
  isParamWired:       __ins_vm_wire.isParamWired,
  stateLabel:         __ins_vm_builder.stateLabel,
  paramList:          __ins_vm_builder.paramList,
  formatValueForInput: __ins_vm_fmt.formatValueForInput,
  parseInputValue:    __ins_vm_fmt.parseInputValue,
  buildViewModel:     __ins_vm_builder.buildViewModel,
  rgbaToHex:          __ins_vm_fmt.rgbaToHex,
  hexToRgba:          __ins_vm_fmt.hexToRgba
};
