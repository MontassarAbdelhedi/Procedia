/**
 * @fileoverview Inspector event handlers — thin orchestrator.
 * All handler implementations are split into ui/inspector/events/*.js.
 * This file ensures the __ins_events namespace exists.
 * Exports: __ins_events (populated by sub-files)
 */
// ui/inspector/events.js
// DEPENDS ON: ui/inspector/events/mathEval.js, ui/inspector/events/utils.js,
//             ui/inspector/events/paramChange.js, ui/inspector/events/keyframe.js,
//             ui/inspector/events/layerActions.js, ui/inspector/events/colorPicker.js,
//             ui/inspector/events/footage.js, ui/inspector/events/layerStack.js

var __ins_events = __ins_events || {};
