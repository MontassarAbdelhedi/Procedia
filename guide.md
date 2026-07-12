# Procedia User Guide

Procedia is a **visual node-based compositing panel** for Adobe After Effects. It lets you build compositing workflows as a node graph — each node represents an AE layer, effect, or data input, and wires define how data flows between them.

## Interface Overview

Procedia's panel is divided into five zones:

```
placeholder image

```

- **Node Palette** (left) — searchable list of all node types you can drag onto the canvas.
- **Canvas** (center) — the main workspace where you build and edit your node graph.
- **Inspector Panel** (right) — edit properties of the selected node.
- **Top Bar** — action buttons (save, undo, duplicate, delete, layout, settings, etc.).
- **Bottom Zone** — comp list dropdown, floating tips, notifications, minimap.

---



## Canvas Navigation


| Action          | How                                                                                  |
| --------------- | ------------------------------------------------------------------------------------ |
| **Pan**         | Click and drag on empty canvas space                                                 |
| **Zoom**        | Scroll with mouse wheel                                                              |
| **Zoom to fit** | Click **Fit View** in the top bar, or the fit button on the minimap                  |
| **Minimap**     | Shows a bird's-eye view in the bottom-right corner. Click on it to jump to that area |


The canvas has a dot-grid background. Sidebars can be collapsed via thin handles that appear at the left and right edges of the canvas on hover.

---



## Nodes

Nodes are the building blocks of your graph. Each node represents an element in After Effects: a layer, an effect, a composition, a footage item, or a data input.

### Node Anatomy

```
placeholder image
```

- **State dot** — green (exists in AE), gray (not yet created), red (error / deleted in AE).
- **Collapse button** (chevron) — hides the node body to save space.
- **Input ports** (left side) — where wires enter the node.
- **Output ports** (right side) — where wires exit the node.
- **Header** — shows the node title (double-click to rename).



### Creating Nodes

- **Drag from the Node Palette**: find a node in the left sidebar and drag it onto the canvas.
- **Wire-to-empty-space**: drag a wire connection onto empty canvas — the Node Picker opens, letting you search and place a compatible node.
- **Import AE Project**: use the Import button in the top bar to generate nodes from an existing AE project.
- **Duplicate**: select a node and press **Ctrl+D** or click the Duplicate button in the top bar.



### Selecting Nodes


| Action                     | How                                                          |
| -------------------------- | ------------------------------------------------------------ |
| **Single selection**       | Click a node                                                 |
| **Add / toggle selection** | **Ctrl+Click** or **Shift+Click**                            |
| **Rubber-band select**     | Click and drag on empty canvas to draw a selection rectangle |
| **Select all**             | **Ctrl+A**                                                   |


Selected nodes show a purple border highlight.

### Moving Nodes

- Drag a node by its **header** to reposition it.
- If multiple nodes are selected, dragging moves them all together.
- With **Snap to Grid** enabled in Settings, positions snap to a 24px grid.



### Renaming Nodes

**Double-click** the title in the node header. An inline input field appears. Press **Enter** to confirm, **Escape** to cancel.

### Deleting Nodes

Select node(s) and press **Delete** or **Backspace**, or click the Delete button in the top bar. Wires connected to the deleted nodes are removed automatically.

### Collapsing / Expanding

- Click the **chevron** in a node's header to collapse or expand it individually.
- Use **Collapse All** / **Expand All** in the top bar to toggle all nodes at once.



### Node States


| State        | Appearance                              | Meaning                                        |
| ------------ | --------------------------------------- | ---------------------------------------------- |
| **Alive**    | Solid border, green dot                 | Layer/effect exists in AE                      |
| **Ghost**    | Dashed border, gray dot, lower opacity  | Defined in the graph but not yet created in AE |
| **Error**    | Red border, red dot                     | Layer/effect was deleted outside Procedia      |
| **Disabled** | Dashed border, 50% opacity, desaturated | Toggled off (via right-click or inspector)     |




### Node Color Toolbar

Hover over a node to reveal a floating toolbar above it with color swatches. Click a color to change the node's accent color for visual organization.

---



## Wires & Connections

Wires carry data between nodes. There are three types:

- **Layer wires** — pass layer data (main compositing flow).
- **Data wires** — pass control values (e.g., a Slider node feeding a parameter).
- **Parent/child wires** — establish parent-child layer relationships.



### Creating a Wire

1. Click and drag from a node's **output port** (right side, green dot).
2. A preview bezier curve follows your cursor.
3. Drop on another node's **input port** (left side, green or gray dot) to complete the connection.

**Reverse wiring**: Drag from an **input port** instead — the Node Picker opens and shows only nodes whose output is compatible.

### Wire Insertion

Drag a node from the palette and drop it **onto an existing wire** — the node is inserted between the source and target, automatically splitting the wire.

### Selecting & Deleting Wires

- Click a wire to select it (highlighted).
- Press **Delete**, **Backspace**, or double-click to remove it.



### Wire Styles

Choose your preferred wire visual style in **Settings → Wires**:


| Style             | Description                                 |
| ----------------- | ------------------------------------------- |
| **Bezier**        | Smooth curved lines (default)               |
| **Direct**        | Straight lines                              |
| **Stepped**       | Right-angle stepped lines                   |
| **Animated Dash** | Dashed line with a flowing animation effect |




### Validation

Procedia prevents invalid connections:

- **Cycle detection** — no layer wire loops are allowed.
- **Port type matching** — only compatible ports can connect.
- **Matte rules** — Track Matte nodes require Foreground and Matte inputs from layers in the same composition.
- **Parenting rules** — Parenting require Parent and Child to be hosted in the same composition.

---



## Node Palette (Left Sidebar)

The left sidebar lists all available node types organized by category:

- **Core** — Comp, Footage
- **Data** — Number, Angle, Slider, Checkbox, Point Control, Color Control, Layer Index, Text, Timecode
- **Layers** — Text, Camera, Light, Null, Adjustment Layer, Solid, Shape (Rectangle, Ellipse, Star, Gear, Flower, Squircle, Wave) and Path
- **Effects** — all After Effects effects (Blur & Sharpen, Color Correction, Distort, Generate, etc.)
- **Utilities** — Merge, Multimerge

Use the **search bar** at the top of the palette to filter nodes by name.

**To add a node**: drag any item from the palette onto the canvas.

---



## Inspector Panel (Right Sidebar)

When a single node is selected, the Inspector (right sidebar) shows its editable properties.

### Properties Section

Lists all parameters for the node. Parameter types include:


| Type                  | Interaction                                                               |
| --------------------- | ------------------------------------------------------------------------- |
| **Number**            | Text input — supports math expressions (e.g., `600/2` evaluates to `300`) |
| **Boolean**           | Checkbox toggle                                                           |
| **Color**             | Opens a color picker popover with swatches and a hex field                |
| **Enum**              | Dropdown select                                                           |
| **Vector2 / Vector3** | Comma-separated text input                                                |
| **String**            | Text input                                                                |


Parameters that are connected to an upstream data wire appear in **amber** color. Parameters disabled by conditional logic are grayed out.

### Keyframe Controls

Animatable parameters show a keyframe control with:

- **◀** — jump to previous keyframe
- **◆** — add / remove a keyframe at the current playhead position
- **▶** — jump to next keyframe

Changing a keyframed parameter's value when the playhead is not on a keyframe automatically adds one.

### Layer Stack (Comp Nodes)

When a comp node is selected, the inspector shows an ordered list of its layers. Each row displays the index, layer name, type abbreviation, and state dot.

- **Move Up / Move Down** buttons reorder layers in AE.
- Rows are **draggable** — drag a layer to reorder it within the stack.



### Layer Order (Affected Nodes)

Nodes that represent layers in a comp show **Move Up / Move Down** buttons to reorder them.

### Footage Import (Footage Nodes)

- Shows the imported file name.
- Click **Browse & Import** to select or replace footage from your filesystem.



### Recovering Error Nodes

A node in **error** state (deleted outside Procedia) shows a **Recreate** action in the inspector (or via notification).

---



## Composition List

The comp list dropdown is at the bottom-left edge of the canvas.

- **"All project"** (default) — shows every node in the graph.
- Selecting a **specific composition** filters the canvas to show only upstream nodes (those relevant to that comp). New nodes added while a comp is active are auto-connected to it.

---



## Graph Search

The search icon is at the top-left corner of the canvas.

1. Click the magnifying glass to open the search field.
2. Start typing — nodes whose labels match are highlighted with a golden border.
3. A counter shows how many matches were found (e.g., "3 found").
4. Click the **Focus** button (or press Enter) to pan and zoom to the first matching node and select it.
5. Press **Escape** or close the search to clear highlights.

---



## Top Bar

The top bar runs along the top of the panel and provides quick access to actions:


| Action                        | Description                                                   |
| ----------------------------- | ------------------------------------------------------------- |
| **Save**                      | Save the graph to AE / export file                            |
| **Open**                      | Load a saved graph file                                       |
| **Undo** / **Redo**           | Step backward / forward through graph changes                 |
| **Auto Layout**               | Arrange all nodes using an automatic layout algorithm         |
| **Fit View**                  | Zoom and pan to show all nodes                                |
| **Collapse All / Expand All** | Toggle collapse state of all nodes                            |
| **Import AE Project**         | Import an entire AE project as a node graph                   |
| **Duplicate**                 | Duplicate the selected node(s) — dimmed when nothing selected |
| **Delete**                    | Delete the selected node(s) — dimmed when nothing selected    |
| **Reset**                     | Reset the graph                                               |
| **Reload**                    | Reload the panel                                              |
| **Settings**                  | Open the settings modal                                       |
| **Bug Report**                | Open the bug reporting form                                   |


---



## Auto Layout

Click **Auto Layout** in the top bar to automatically arrange all nodes. The layout uses a layered (Sugiyama-style) algorithm.

Configure in **Settings → Auto Layout**:

- **Direction** — Left-to-Right or Top-to-Bottom
- **Horizontal Spacing** — 40 to 300 px
- **Vertical Spacing** — 20 to 200 px
- **Snap to Grid** — snap node positions to a 24px grid

Locked nodes are skipped during auto layout.

---



## Settings

Click the gear icon in the top bar to open Settings. The modal has three tabs:

### General


| Setting                 | Description                                                                    |
| ----------------------- | ------------------------------------------------------------------------------ |
| **Minimap**             | Show / hide the minimap                                                        |
| **Port Labels**         | Show port labels on node hover                                                 |
| **Anonymous Reporting** | Enable / disable error reporting                                               |
| **Auto Shy**            | Automatically shy unselected layers in the AE timeline when a node is selected |
| **Replay Tutorial**     | Restart the walkthrough tutorial                                               |




### Wires


| Setting           | Description                          |
| ----------------- | ------------------------------------ |
| **Wire Style**    | Bezier (default), Direct, or Stepped |
| **Animated Dash** | Enable flowing dashed wire animation |




### Auto Layout


| Setting                | Description                                     |
| ---------------------- | ----------------------------------------------- |
| **Snap to Grid**       | Snap node positions to 24px grid while dragging |
| **Direction**          | Left-to-Right or Top-to-Bottom                  |
| **Horizontal Spacing** | 40–300 px between nodes                         |
| **Vertical Spacing**   | 20–200 px between nodes                         |


---



## Keyframes

Procedia synchronizes keyframe data between the node graph and After Effects.

- **Viewing**: The keyframe icon next to an animatable parameter shows whether it has keyframes (filled = keyframes exist, empty = none).
- **Adding**: Click the diamond icon at the current playhead position, or change a keyframed parameter's value at a non-keyframe time to auto-add one.
- **Navigating**: Use ◀ and ▶ to jump between keyframes.
- **Removing**: Click the diamond icon when the playhead is on an existing keyframe.

On startup, Procedia reads all keyframe data from AE and populates the keyframe state automatically.

---



## Saving & Loading



### Save

Click the **Save** button in the top bar. The graph data is written to the AE project. If AE is unavailable, the file downloads as `.procedia.json`.

Procedia also **auto-saves** continuously — any graph change triggers a debounced write to AE (every 300ms). On panel close, unsaved changes are written automatically.

### Open

Click the **Open** button in the top bar to load a previously saved graph file from disk.

### Import AE Project

The **Import AE Project** button reads the entire After Effects project — all compositions, layers, effects, and footage items — and builds a complete node graph from it. This is one-way: it does not modify your AE project.

---



## Walkthrough Tutorial

On first launch, Procedia shows an interactive step-by-step walkthrough that covers:

1. Welcome
2. Node Palette (left sidebar)
3. The Canvas (zoom, pan, minimap)
4. Comp List
5. Connecting Nodes (wires)
6. Inspector Panel (right sidebar)
7. Reporting a Bug
8. You're Ready!

Each step highlights the relevant UI element and shows an explanation card. Use **Next** to advance or **Dismiss** to close.

To replay the tutorial, go to **Settings → General → Replay Tutorial**.

---



## Status Bar

The status bar is in the top-right corner. It displays:

- **Selection count** — e.g., "3 selected" (if any)
- **Total nodes** — node count in the graph
- **Alive count** — nodes that exist in AE
- **Ghost count** — nodes not yet created in AE
- **Wire count** — total connections
- **Zoom level** — current canvas zoom percentage

---



## Tips Bar

A floating tip bar at the bottom of the canvas cycles through helpful hints every 20 seconds. Tips include:

- Drag nodes from the left panel onto the canvas
- Connect nodes by dragging from an output port to an input port
- Right-click a node for quick actions (duplicate, delete, etc.)
- Press Ctrl+D to duplicate the selected node(s)
- Scroll to zoom, drag the background to pan around the canvas
- Double-click a node title to rename it
- Track Matte rules: Foreground and Matte inputs must be wired to layers in the same composition

Click the tip text to advance to the next tip immediately.

---



## Bug Reporting

Click the **bug icon** in the top bar to open the bug report form. Fill in:

- **Category** — Bug, Performance, or Suggestion
- **Severity** — Low, Medium, High, or Critical
- **Title** — brief summary
- **Description** — detailed explanation

A screenshot of the canvas is captured automatically. Submitting sends the report to the development team.

---



## Keyboard Shortcuts


| Shortcut                        | Action                                     |
| ------------------------------- | ------------------------------------------ |
| **Ctrl+Z**                      | Undo                                       |
| **Ctrl+Shift+Z**                | Redo                                       |
| **Ctrl+D**                      | Duplicate selected node(s)                 |
| **Delete / Backspace**          | Delete selected node(s) or wire            |
| **Ctrl+A**                      | Select all nodes                           |
| **Enter**                       | Confirm rename / Focus first search result |
| **Escape**                      | Cancel rename / Close graph search         |
| **Scroll**                      | Zoom in / out on canvas                    |
| **Click + drag (empty canvas)** | Pan / rubber-band select                   |


---

*Procedia v0.0.4 — [Uppercut Studio](https://uppercut.studio)*