# Procedia — Feature Reference

> Visual node-based compositing for After Effects | v0.0.4 | Uppercut Studio

---

## Core Graph Engine

**Graph Engine**: Graph State Management: Centralized in-memory store for all nodes and wires with full CRUD operations, selection tracking (multi-select, toggle, replace), dirty-flag system, graph change listeners, temp snapshot generation, clone group tracking, and active comp focus.

**Graph Engine**: Node Lifecycle: Drop nodes onto the canvas from the registry, delete nodes with cascading ghost cleanup, duplicate selected nodes with offset, clone nodes with clone-master relationship, recreate errored nodes, lock/unlock nodes, switch effector order, reset entire graph, set individual node properties, and toggle node disabled state — all synced to After Effects.

**Graph Engine**: Wire Operations: Connect wires between ports with type-specific validation (layer, data, parent, matte), path layer UUID assignment, and disconnect with cascading ghost cleanup.

**Graph Engine**: Alive Propagation: Propagates alive state along layer wire chains, detects terminal wires, re-stamps AE path layers, activates/deactivates track mattes, fires create-layer commands, prevents race conditions with pending UUID tracking, and draws visual bypass routes for disabled effectors.

**Graph Engine**: Dynamic Effect Node Factory: Generates full node definitions on-the-fly from stub metadata combined with live AE effect schema introspection, with automatic port assignment and version tracking per effect type.

**Graph Engine**: Node Registry: Register full or stub node types with duplicate protection, lookup by type or category, automatic stub replacement on full registration.

**Graph Engine**: Cycle Detection: DFS-based cycle detection for layer wire connections, preventing infinite loops in the graph.

---

## Graph Canvas & Wires

**Canvas**: Pan & Zoom: Drag-to-pan with mouse and scroll-to-zoom (0.1x–4.0x) with screen-to-canvas coordinate transforms.

**Canvas**: Infinite Zoom Grid: Multi-level dot grid background (3 detail levels) with opacity scaled by zoom level for spatial orientation.

**Canvas**: Grid Snap: Snap-to-grid alignment at 24px resolution for precise node positioning.

**Canvas**: Node Card Rendering: Full DOM-based node card system with category color coding (8 categories), dynamic parameter row builder, port label display, state CSS classes (alive/ghost/error/locked/collapsed), collapse/expand, and wire-param caching.

**Canvas**: Node Toolbar: Floating action bar on selected nodes with Clone, Duplicate, Color, Collapse, Disable/Enable, Switch, and Delete buttons.

**Canvas**: Node Color Picker: 8-color palette (white, yellow, green, red, blue, orange, violet, lime) directly on the toolbar for quick node customization.

**Canvas**: Node Context Menu: Right-click context menu with Recreate, Duplicate, Clone, Lock, and Delete actions.

**Wires**: Three Wire Styles: Bezier (curved), Direct (straight line), and Stepped (right-angle) wire rendering.

**Wires**: Wire Type Color Coding: Layer wires (green), data wires (gray), and parent wires (orange) for at-a-glance understanding.

**Wires**: Animated Wire Dashes: Toggleable animated dash flow on wires for visual feedback.

**Wires**: Interactive Wire Insert: Contextual insert button at wire midpoints for adding nodes inline into existing connections.

**Wires**: Split-Wire Preview: Visual preview when inserting a node into an existing wire connection.

**Wires**: Drag Preview Line: Temporary wire rendered while dragging from port to port during connection.

**Wires**: Disabled Node Dimming: Wires connected to disabled nodes render with reduced opacity.

**Wires**: Wire Selection & Bypass: Wire selection highlighting and visual bypass routes for disabled effector chains.

**Wires**: Clone Wire Rendering: Special visual treatment for clone-master wire relationships.

**Interactive Wire Tool**: Port-to-port wire dragging in both forward and reverse directions with automatic port definition resolution.

**Wire Validator**: Comprehensive connection validation including node existence, self-wire prevention, port existence, direction check, type matching, single-capacity enforcement, duplicate wire prevention, cycle detection, parent comp sharing, blending-node rules, matte conditions, and compatibility-filtered pick lists.

**Auto Layout**: Sugiyama-style layered graph layout in Left-to-Right or Top-to-Bottom directions with configurable spacing and data-node grid fallback.

---

## Cascade & Ghosting System

**Cascade**: Cascade Ghosting: When a wire is removed, automatically ghosts downstream nodes that lost all comp connections, with partial ghosting support for nodes that lose only some comps.

**Cascade**: Upstream/Downstream Traversal: Walks layer wires to find all downstream comp nodes and collects all upstream nodes along the path for correct ghost propagation.

**Cascade**: Parent Wire Cleanup: Automatically removes parent wires connected to ghosted or disaggregated nodes.

**Cascade**: Composition Detection: Dedicated helper for identifying composition nodes in the graph.

---

## AE Communication Bridge

**Bridge**: Eval Bridge: Single gateway rule for all AE ExtendScript communication with dispatch (promise with 10s timeout), batch dispatch, fire-and-forget, action validation whitelist (100+ allowed actions), JSX preamble system, on-ready callbacks, and command chunking for reliable AE communication.

**Bridge**: ExtendScript Dispatcher: 30+ specialized action handlers across comp, layer, effect, mask, keyframe, footage, matte, schema cache, graph export, and undo group operations.

**Bridge**: Comp Actions: Create, delete, list, focus, and set properties of After Effects compositions.

**Bridge**: Layer Actions: Create text, null, adjustment, shape, rectangle, ellipse, star, squircle, gear, wave, and flower layers; set layer properties, parenting, and stacking order; rename, enable/disable, delete, and restamp layers.

**Bridge**: Effect Actions: Apply, remove, rename, reorder, enable/disable effects, and set effect properties dynamically.

**Bridge**: Mask Actions: Create masks, set feather, expansion, opacity, inverted state, mode, and delete masks.

**Bridge**: Keyframe Actions: Batch get/set/remove keyframes on any property with full AE integration.

**Bridge**: Footage Management: Import files, import placeholders, get footage paths, reload footage, and replace footage.

**Bridge**: Track Matte Actions: Set, clear, and get track matte state on layers.

**Bridge**: Schema Cache Actions: Read/write schema cache and fetch effect schemas from AE with version detection.

**Bridge**: Graph Export/Import: Full AE project scan and structured export into Procedia graph format.

**Bridge**: Undo Grouping: Begin/end undo group actions for clean AE undo history batching.

---

## Persistence & State

**Persistence**: Native AE Save: Save the full graph directly into the After Effects project file via the eval bridge.

**Persistence**: File Save/Open: Fallback .procedia.json file save (download via Blob/URL) and open (file input picker).

**Persistence**: Auto-Save: Automatic graph save to AE project on changes for data safety.

**Persistence**: Settings: User preferences stored in localStorage with key set (minimap, wire style, animated dash, snap to grid, layout direction, layout spacing, reporting, port labels) and default fallback for forward compatibility.

**Persistence**: Graph Export: Full graph state export to transferable format with debounced auto-write.

**Persistence**: Graph Import: Import full AE project structure — comps, layers, effects, footage — as Procedia node types with BFS hosting comp propagation, grid-positioned layout, and error-tolerant per-item processing with summary reporting.

**Persistence**: Schema Cache: AE effect schema introspection with disk cache, version tracking across AE sessions, lazy fetch-on-miss, and property-level schema diffing.

**Persistence**: Graph Export Schema: Sample project template (.procedia.json) with reserved comp, footage, rectangle, and alpha matte nodes.

---

## Polling & Synchronization

**Polling**: Adaptive Polling: Switches between active (500ms) and idle (2000ms) polling intervals based on user interaction, with write-lock system to prevent race conditions during graph writes.

**Polling**: Missing Node Detection: Compares AE layer comments against wire UUIDs to detect layers deleted outside Procedia, with intelligent filtering (pending UUIDs, intentional cascades).

**Polling**: External Deletion Detection: Detects effects and comps deleted directly in After Effects and marks them as errored in the graph.

**Polling**: Deletion Notifications: Duplicate-suppressed alert cards with Recreate and Remove action buttons for externally deleted nodes.

**Polling**: Property Sync: Polls AE for current property values of alive affected nodes and syncs changes back to the graph, with floating-point tolerant array comparison for change detection.

---

## Flush System

**Flush**: Dirty Property Flusher: 300ms debounced batch dispatch of property updates to AE, with path layer UUID resolution, dirty node aggregation, batch dispatch, and automatic cleanup of dirty flags.

---

## UI Components

**UI**: Top Bar: Logo and wordmark branding, Save/Open buttons, Undo/Redo with disabled states and command descriptions, Auto Layout, Fit View, Collapse All/Expand All, Import AE Project, dynamic selection section (Recreate/Duplicate/Delete), Settings, Walkthrough, and Report Bug buttons.

**UI**: Node List (Sidebar): Categorized node palette (Core, Data, Layers, Shapes, Track Matte, Effects with subcategories), real-time search/filter with clear button, drag-and-drop to canvas with ghost preview, merge node warning badges, category color dots, collapsible categories, and sidebar toggle on hover.

**UI**: Inspector (Sidebar): Full node property editing with state indicators, text inputs, checkboxes, color pickers, math expression evaluation in param fields, layer order controls (Move Up/Down), layer stack view with state indicators, custom HSV color picker with eyedropper, keyframe indicators (inactive/active/highlight), footage file browse, recreate button for errored nodes, and dynamic parameter groups.

**UI**: Node Picker Popup: Searchable popup filtered by wire compatibility, category grouping, keyboard navigation, wire-insert mode, and forward/reverse connection modes.

**UI**: Settings Modal: Three-tab layout (General, Wires, Auto Layout) with toggle controls (minimap, port labels, animated dash, snap to grid, reporting), select controls (wire style, layout direction), slider controls (horizontal/vertical spacing), tutorial replay button, and live apply with modal overlay.

**UI**: Comp List Dropdown: Floating dropdown showing current comp name with dynamic AE comp listing, comp focus on click, auto-wire on drop, and loading/error states.

**UI**: Status Bar: Live node counts (total/alive/ghost), wire count, zoom level percentage, and selection count.

**UI**: Notifications: Floating notification cards over canvas with four severity levels (info, warning, error, success), action buttons, auto-dismiss, manual dismiss, dismiss all, and duplicate prevention.

**UI**: Onboarding Walkthrough: 8-step guided tour (Welcome → Node Palette → Canvas → Comp List → Connecting Nodes → Inspector → Report a Bug → Ready) with element highlighting, step indicators, smart positioning, and first-launch auto-detect.

**UI**: Tip Field: Cycling contextual usage tips at the bottom of the interface with click-to-cycle and auto-reposition.

**UI**: Loading Overlay: Semi-transparent overlay with CSS spinner animation, reference-counting for stacked operations, and custom messages.

**UI**: Minimap: Scaled-down graph overview in bottom-right with viewport rectangle and click-to-navigate.

**UI**: UI Update Scheduler: rAF-batched updates with per-component dirty flags (minimap, renderer, wire renderer, inspector, status bar).

**UI**: Sidebar Toggle: Edge-zone hover handles for collapsing left and right sidebars with smooth animation and persistent state.

---

## Data & Node Definitions

**Nodes**: Core Layer Nodes: Comp, layer, null, text, adjustment, shape (rectangle, ellipse, star, squircle, gear, wave, flower), and footage node types.

**Nodes**: Data Nodes: Number, Slider, Checkbox, Color, Point, Angle, Layer, Image, Text, and Gradient data types for parameter control.

**Nodes**: Merge Nodes: Merge and Multimerge nodes for compositing multiple layers.

**Nodes**: Track Matte Nodes: Alpha and Luma track matte with foreground/matte/combined output ports.

**Nodes**: Utility Nodes: Blending mode node for layer blending control.

**Nodes**: Effect Nodes: 800+ AE effect types registered as stubs across 21 categories including 3D Channel, Audio, Blur & Sharpen, Boris FX Mocha, Channel, Color Correction, Distort, Expression Controls, Generate, Immersive Video, Keying, Matte, Noise & Grain, Perspective, Simulation, Stylize, Text, Time, Transition, Utility, and Uncategorized.

**Nodes**: Node Kind System: Five node kinds — affected, effector, blending, matte, data — determining lifecycle behavior and wire compatibility.

**Nodes**: Obsolete Marking: Registry tracks and visually dims obsolete node types.

**Wires**: Three Wire Types: Layer wires (AE layer state), data wires (parameter values), and parent wires (layer parenting).

**Ports**: Port System: Port categories (output, mainInput, secondaryInput, parent), wire types on ports (layer, data, parent), capacities (single/multi), and runtime-generated secondary ports for effect parameters.

---

## Undo/Redo System

**Undo**: Snapshot-Based Undo/Redo: Full graph state snapshots before mutation with configurable 50-entry history depth, commit labeling, debounced commit for rapid edits, and automatic redo stack clearing on new commits.

**Undo**: AE Reconciliation: Full diff between old and new graph states on undo/redo, dispatching AE commands for node lifecycle, property changes, wire connect/disconnect, and parent wire changes, all wrapped in AE undo groups.

**Undo**: UI Integration: Top-bar undo/redo buttons with disabled states and descriptive tooltips.

---

## Reporting & Error Handling

**Reporting**: Sentry Error Tracking: Bundled Sentry JS SDK for automated crash reporting with source map support.

**Reporting**: Bug Report: Manual report trigger from top bar with screenshot capture (html2canvas), environment snapshot (AE version, panel version, graph stats), and structured JSON payload.

---

## Keyframe Management

**Keyframes**: Keyframe State: Per-parameter keyframe tracking with playhead time awareness, keyframe existence checks, playhead-on-keyframe detection, next/prev keyframe navigation, and UI state triage (inactive/active/highlight).

**Keyframes**: AE Keyframe Sync: Batch keyframe operations (get times, set, remove) via the AE bridge with automatic sync on graph load.

---

## CSS & Theming

**Theming**: Design Tokens: Systematically defined CSS custom properties for color palette, spacing, and typography with a dark theme optimized for motion design workflows.

**Theming**: 19 Component Stylesheets: Dedicated CSS for every UI component including top bar, left bar, right bar, canvas, nodes, settings modal, node picker, notifications, comp list, tip field, bottom bar, color picker, layer stack, keyframes, and walkthrough.

**Theming**: Tabler Icons: Full icon font for all toolbar and UI element icons.

---

## Keyboard Shortcuts

**Shortcuts**: Ctrl+D to duplicate nodes, Delete/Backspace to delete, Escape to close popups/deselect, Arrow keys + Enter for picker navigation, Space+Drag to pan canvas, and Scroll to zoom.

---

## Testing

**Testing**: Unit Tests: Vitest-based test suite covering the JSX action dispatcher, UUID generation, cycle detection, and keyframe state management with jsdom environment and CSInterface mocking.
