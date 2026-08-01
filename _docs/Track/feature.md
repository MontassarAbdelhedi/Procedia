# Procedia — Feature Reference

> Visual node-based compositing for After Effects | v0.0.4 | Uppercut Studio

---

## 1. Graph Engine

**State & Graph Management**: Centralized in-memory store with instant access to all nodes, wires, and connections — multi-select, visibility toggle, change tracking, and version preview.

**Node Lifecycle**: Drag from palette to create, delete with automatic cleanup, duplicate with perfect placement, clone with master relationships, recreate for error recovery, lock/unlock, reorder effects, enable/disable — all synced with AE.

**Smart Wiring**: Connect any two ports with automatic type validation (layer, data, parent, matte). Color-coded wires (green=layer, gray=data, orange=parent) with animated dashes for active flow. Midpoint click inserts nodes inline. Complete validation: node existence, self-connection prevention, port availability, direction compatibility, type matching, capacity, duplicates, cycle detection, parent matching, special rules for blending and matte connections.

**State Propagation**: Nodes activate/deactivate through connection chains. Active nodes auto-create AE layers with correct properties. Disabled chains show visual bypass routes.

**Cascade & Ghosting**: Removing a connection ghosts downstream nodes that lose all comp paths. Effectors stripped first (outermost to innermost), then affected nodes parked. Only layer wires trigger cascade; parent and data wires are never traversed. Batched into single bridge call.

**Cycle Prevention**: Automatic circular connection detection blocks infinite loops before they occur.

**Undo/Redo**: Snapshot history (50 entries deep) with debounced commits. Full AE reconciliation on undo/redo — diffs old and new state, dispatches create/delete, property changes, wire connect/disconnect wrapped in clean AE undo groups.

**Performance**: Property updates batched with 300ms debouncing. RAF-batched UI rendering with per-component dirt-tracking.

---

## 2. Canvas & Interface

**Canvas Navigation**: Pan with mouse drag or Space+Drag, zoom 10%–400% with scroll wheel. 3-level detail grid for spatial awareness. 24-pixel snap grid for precise placement.

**Node Visuals**: Color-coded category cards with dynamic parameter rows, clear port labels, and visual states (active, ghosted, errored, locked, collapsed). Expand/collapse to focus.

**Selection Toolbar**: Floating toolbar on selected nodes — clone, duplicate, change color (8-color palette), collapse, enable/disable, switch, delete.

**Context Menu**: Right-click for recreate, duplicate, clone, lock, delete.

**Wire Styles**: Smooth curves, straight lines, or right-angle turns. Connection previews show split-wire impact before committing. Live dragging with automatic port detection.

**Auto Layout**: Sugiyama-style algorithms arrange nodes in logical left-to-right or top-to-bottom flow with adjustable spacing. Data nodes positioned in clean grids.

**Top Bar**: Branding, save/open, undo/redo with intelligent states, layout tools, import/export, selection actions, settings, tutorials, bug reporting.

**Node Library Sidebar**: Browse 6 categories (Core, Data, Layers, Shapes, Track Matte, Effects with subcategories). Real-time search, drag preview, category color dots, collapsible sections.

**Inspector**: Edit properties with text inputs, checkboxes, color pickers, math evaluation, layer ordering, comp stack view, keyframe indicators, file browsing for footage, error recovery — adapts to each node type.

**Node Picker**: Search by wire compatibility with category grouping, keyboard navigation, inline connection mode, forward/reverse support.

**Settings Modal**: Three tabs — General (minimap, port labels, dashes, snapping, reporting), Wires (style/animation), Auto Layout (direction/spacing).

**Composition Navigator**: Current comp display with instant switching. Drop nodes onto comps for automatic wiring.

**Status Bar**: Total/alive/ghost node counts, wire count, zoom %, selection count.

**Notifications**: Floating alert cards at 4 severity levels (info, warning, error, success) with action buttons, auto-dismiss, dismiss-all, duplicate prevention.

**Tutorial & Tips**: 8-step guided tour (Welcome, Node Palette, Canvas, Comp List, Connecting Nodes, Inspector, Report a Bug, Ready). Cycling tips every 20 seconds.

**Minimap**: Scaled-down graph overview with blue viewport rectangle. Click-drag to navigate.

**Sidebars**: Edge-zone hover handles for collapsing left/right panels with smooth animation. State persists across sessions.

**Loading States**: Semi-transparent overlay with CSS spinner, reference counting prevents overlaps, custom progress messages.

**Design System**: 20 CSS files with custom properties for palette, spacing, typography — premium dark theme. Full Tabler icon font.

**Keyboard Shortcuts**: Ctrl+D duplicate, Delete/Backspace remove, Escape close/deselect, arrow keys + Enter picker nav, Space+Drag pan, scroll zoom.

---

## 3. After Effects Bridge

**Unified Bridge**: Single gateway (`evalBridge.js`) handles all AE communication with automatic retries, large-command chunking, and 10s timeout. `evalBridge` is the only caller of `csInterface.evalScript()`; `dispatcher.jsx` is the only file with AE API calls. Nodes return command objects — they never touch AE.

**Dispatcher**: ~89 actions across 20+ handler files — layer creation (14 types), comp lifecycle, property read/write, effects, keyframes, track mattes, footage, project import/export, graph persistence. All actions whitelisted in `evalBridge.js` and routed through `dispatcher.jsx`.

**Composition Control**: Create, delete, list, focus comps. Set dimensions, frame rate, duration, background color. Read project info.

**Layer Tools**: 18 layer types — text, null, adjustment, shape, solid, camera, light, plus parametric shapes (rectangle, ellipse, star, squircle, gear, wave, flower, polygon). Parenting, order, rename, enable/disable, shy mode, delete, restamp.

**Effects System**: Apply 460+ effects via match name, rename, reorder, enable/disable, set complex properties — all synchronized with AE. Value normalization (0–100 mapped to 0–1) handled in dispatcher, never in node definitions.

**Keyframes**: Add/remove single or all keyframes, read times, read values + interpolation. Get/set playhead position. Batch operations across properties.

**Media Management**: Import footage, create placeholders, get paths, reload, replace, delete footage items.

**Track Mattes**: Set/clear alpha and luma mattes with invert support. Dispatcher handles layer reordering so matte sits directly above target.

**Schema Intelligence**: Introspects AE effect properties on first use — creates temp solid, walks property tree, removes temp. Caches to `effectSchemaCache.json`, diffs on AE version change, updates automatically.

**Project Import**: Scan all comps, layers, effects, footage — convert to Procedia nodes with auto-layout and progress reporting. UUIDs stamped via path-driven layer model (layer.comment = wire UUID).

**Undo Groups**: All AE operations wrapped in `beginUndoGroup`/`endUndoGroup`. Batch operations collapse into single undo steps — prevents double-undo problem.

**Timeline Sync**: Adaptive polling (500ms active / 2000ms idle) detects external changes. Property synchronization polls AE for current values, detects changes via intelligent comparison, updates graph to reflect reality.

---

## 4. Node Library & Building Blocks

**Layer Nodes**: Comp, layers, null, text, adjustment, shapes (rectangle, ellipse, star, squircle, gear, wave, flower), solid, camera, light, footage.

**Data Nodes**: Number, slider, checkbox, color, 2D point, angle, layer reference, image, text, gradient — for parameter control via data wires. Always alive, no AE footprint.

**Utility Nodes**: Merge/Multimerge for compositing, Blending for non-destructive blend modes (18 modes), Matte Alpha/Luma for track mattes with foreground/matte/combined outputs.

**Effect Library**: 460+ effects across 22 categories (3D Channel, Audio, Blur & Sharpen, Boris FX Mocha, Channel, Color Correction, Distort, Expression Controls, Generate, Immersive Video, Keying, Matte, Noise & Grain, Obsolete, Perspective, Simulation, Stylize, Text, Time, Transition, Uncategorized, Utility). Auto-created from AE schema on demand via `effectNodeFactory.js`. Obsolete types visually dimmed.

**5 Node Kinds**: Affected (creates AE layers), Effector (modifies existing layers via dynamic schema), Data (pure values — always alive), Blending (blend mode control — always alive), Matte (track mattes — always alive). Each has distinct lifecycle and port contracts.

**Port System**: Output, main input, secondary input, parent ports. Secondary inputs auto-generated for effect parameters with compatibility filtering and capacity controls.

**Three Wire Types**: Layer wires (AE layer state), data wires (parameter values), parent wires (layer parenting hierarchy).

---

## 5. Persistence & Tooling

**Native AE Save**: Graph persisted directly inside the AE project file via text layers in the Reserved Comp. Written on save, quit, and panel unload.

**File-Based Backup**: Save/load `.procedia.json` files via native dialogs. Debounced writing prevents performance issues.

**Auto-Save**: Graph auto-saved to AE on every change with writing-lock protection and conflict prevention.

**Personal Settings**: Minimap visibility, wire style, animated dashes, grid snapping, layout direction/spacing, reporting, port labels — persisted across sessions.

**Schema Caching**: Effect schemas cached in `data/effectSchemaCache.json`. Version-diffed on AE version change — only re-introspects what changed.

**Project Templates**: Pre-built templates with reserved comps, footage nodes, shapes, and track mattes for quick starts.

**External Change Detection**: Polls AE for layer/effect/composition deletions — marks nodes as errored with smart notifications and action buttons (recreate or remove).

**Error Tracking**: Sentry integration with source map support for automatic crash detection and reporting.

**Bug Reporting**: One-click capture of screenshots, environment info (AE version, panel version, graph stats) — structured JSON payload for developer analysis.

**Testing**: Vitest with jsdom. Tests cover JSX dispatcher, UUID generation, cycle detection, keyframe state management with CSInterface mocking.

---

Procedia transforms complex After Effects workflows into intuitive visual interactions. From simple layer creation to complex effect chains, every feature is designed to maximize your creativity while minimizing technical barriers.
