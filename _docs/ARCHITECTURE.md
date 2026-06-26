```mermaid
flowchart TB
  subgraph "Host & Entry"
    HTML[index.html] --> CSS[CSS/* stylesheets]
    HTML --> JS_LIBS[lib/CSInterface.js]
    HTML --> INDEX[index.js - Entry Point]
  end

  subgraph "Infrastructure Layer"
    INDEX --> EVAL_BRIDGE[bridge/evalBridge.js]
    EVAL_BRIDGE --> CSI[CSInterface.evalScript]
    EVAL_BRIDGE --> UUID[data/uuidGenerator.js]

    DIRTY[flush/dirtyFlusher.js] --> EVAL_BRIDGE
    POLLER --> EVAL_BRIDGE
    ENGINE --> EVAL_BRIDGE
  end

  subgraph "ExtendScript / JSX (After Effects)"
    EVAL_BRIDGE --> JSX_INIT[jsx/json.jsx + jsx/utils.jsx]
    JSX_INIT --> JSX_DISPATCHER[jsx/dispatcher/dispatcher.jsx]
    JSX_DISPATCHER --> JSX_COMP[actions_comp.jsx]
    JSX_DISPATCHER --> JSX_COMPLIST[actions_compList.jsx]
    JSX_DISPATCHER --> JSX_LAYER[actions_layer.jsx]
    JSX_DISPATCHER --> JSX_PROP[actions_property.jsx]
    JSX_DISPATCHER --> JSX_EFFECT[actionEffect/]
    JSX_DISPATCHER --> JSX_MATTE[actions_matte.jsx]
    JSX_DISPATCHER --> JSX_PARK[actions_park.jsx]
    JSX_DISPATCHER --> JSX_SCHEMA[actions_schema.jsx]
    JSX_DISPATCHER --> JSX_PERSIST[persistence.jsx]
    JSX_PERSIST --> AE[Adobe After Effects]
  end

  subgraph "Graph State (in-memory)"
    GRAPH_STATE[graph/graphState/index.js]
    GRAPH_STATE --> STATE[state.js - internal state]
    GRAPH_STATE --> NODES[nodes.js - CRUD]
    GRAPH_STATE --> WIRES[wires.js - CRUD]
    GRAPH_STATE --> PROPS[props.js - dirty flags]
    GRAPH_STATE --> SEL[selection.js - multi-select]
    GRAPH_STATE --> TEMP[tempGraph.js - stripped snapshot]
    GRAPH_STATE --> OPS[graphOps.js - load/clear]
  end

  subgraph "Node Definitions"
    NODES_REG[nodeRegistry.js]
    NODES_REG --> CORE[Core/Comp.js]
    NODES_REG --> MERGE[Core/Merge.js]
    NODES_REG --> MULTI[Core/Multimerge.js]
    NODES_REG --> LAYERS[Layers/ Text | Null | Shape | Adjustment]
    NODES_REG --> SHAPES[Shapes/Rectangle.js]
    NODES_REG --> EFFECTS[Effects/Blur & Sharpen/ FillEffect | GaussianBlur | DropShadow]
    NODES_REG --> DATA[Data/ Color | Number]
    NODES_REG --> UTILITY[Effects/utility/ Blending | MatteLuma | MatteAlpha]
  end

  subgraph "Schema Cache"
    SCHEMA[graph/schemaCache/index.js]
    SCHEMA --> SC_STATE[state.js - in-memory cache]
    SCHEMA --> SC_PERSIST[persistence.js - disk I/O]
    SCHEMA --> SC_DIFF[diff.js - AE version diff]
    SC_PERSIST --> DATA_EFFECT[data/effectSchemaCache.json]
  end

  subgraph "Graph Engine"
    ENGINE[graph/engine/index.js]
    ENGINE --> ENG_NODES[nodes/ dropNode | deleteNode | duplicateNode | lockNode | recreateNode]
    ENGINE --> ENG_WIRES[wires.js - connect/disconnect]
    ENGINE --> ENG_PROP[propagate.js - prop propagation]
    ENGINE --> ENG_HELP[helpers.js - utilities]
    ENGINE --> ENG_STATE[state.js - reset / setProp]
    ENGINE --> CASCADE[graph/cascade/index.js - upstream/downstream tracking]
    CASCADE --> CASCADE_GHOST[cascadeGhost/ - ghost on delete (5 files)]
    CASCADE --> CASCADE_UTILS[utils.js]

    ENG_WIRES --> WIRE_VALIDATOR
  end

  subgraph "Wire System"
    WIRE_VALIDATOR[graph/wireValidator/index.js]
    WIRE_VALIDATOR --> CAN_CONNECT[canConnect.js]
    WIRE_VALIDATOR --> PORT_UTILS[portUtils.js]
    WIRE_VALIDATOR --> MATTE_VAL[matteValidator.js]
    WIRE_VALIDATOR --> FILTER_PICK[filterPickerList.js]
    WIRE_VALIDATOR --> CYCLE[cycleChecker.js]

    WIRE_RENDER[graph/wire/wireRenderer/ - bezier/direct/stepped]
    WIRE_TOOL[graph/wire/wire.js - drag preview]
  end

  subgraph "Canvas"
    CANVAS_VIEW[graph/canvas/viewport.js - pan/zoom]
    RENDERER[graph/canvas/renderer/index.js - DOM sync]
    RENDERER --> R_CATEGORIES[categories.js - color mapping]
    RENDERER --> R_HELPERS[helpers.js]
    RENDERER --> R_BUILDER[builder.js - build cards]
    RENDERER --> R_TOOLBAR[nodeToolbar.js - per-node actions]

    INPUT[graph/canvas/input/index.js - event binding]
    INPUT --> I_STATE[state.js]
    INPUT --> I_UTILS[utils.js]
    INPUT --> I_RUBBER[rubberband.js - multi-select]
    INPUT --> I_HANDLERS[handlers/ mouse | keyboard | wheel | titleEdit]

    MINIMAP[graph/canvas/minimap/index.js]
    MINIMAP --> MM_CONST[constants.js]
    MINIMAP --> MM_STATE[state.js]
    MINIMAP --> MM_UTILS[utils.js]
    MINIMAP --> MM_RENDER[renderer.js]
    MINIMAP --> MM_INTERACT[interaction.js]

    DRAG[graph/canvas/drag/ - node drag (4 files)]
  end

  subgraph "Auto Layout (Sugiyama)"
    LAYOUT[graph/autoLayout/index.js]
    LAYOUT --> AL_CONST[constants.js]
    LAYOUT --> AL_HEIGHT[estimateHeight.js]
    LAYOUT --> AL_GRAPH[graphBuilder.js]
    LAYOUT --> AL_LAYER[layerAssignment.js]
    LAYOUT --> AL_CROSS[crossingReduction.js]
    LAYOUT --> AL_POS[positioning.js]
  end

  subgraph "UI Panels"
    UI_TOP[ui/topBar.js - selection info]

    UI_STATUS[ui/statusBar.js - connection status]
    UI_TOGGLE[ui/sidebarToggle.js]
    UI_SETTINGS[ui/settings.js + settingsModal.js]
    UI_SETTINGS_M[ui/settingsModal.js]

    NODE_LIST[ui/nodeList - available node palette]
    NODE_LIST --> NL_CAT[categories.js]
    NODE_LIST --> NL_RENDER[render.js]
    NODE_LIST --> NL_SEARCH[search.js]
    NODE_LIST --> NL_DRAG[dragdrop.js]

    NODE_PICKER[ui/nodePicker - inline node menu]
    NODE_PICKER --> NP_COMPAT[compatibility.js]
    NODE_PICKER --> NP_RENDER[render.js]
    NODE_PICKER --> NP_FILTER[filter.js]
    NODE_PICKER --> NP_EVENTS[events.js]

    INSPECTOR[ui/inspector - property editor]
    INSPECTOR --> I_VIEWMODEL[viewModel.js]
    INSPECTOR --> I_RENDER[render.js]
    INSPECTOR --> I_EVENTS[events.js]
  end

  subgraph "Polling System"
    POLLER[polling/poller.js - adaptive timer]
    POLLER --> POLL_MISS[missingNodes.js - aliveness check]
    POLLER --> POLL_NOTIF[notifications.js - host notifications]
    POLLER --> POLL_DEL[externalDeletions.js - detect AE deletions]
  end

  subgraph "Notifications"
    NOTIF_BAR[notifications/notificationBar.js - toast UI]
  end

  subgraph "Data Flow"
    INDEX --> GRAPH_STATE
    INDEX --> ENGINE
    INDEX --> CANVAS_VIEW
    INDEX --> RENDERER
    INDEX --> INPUT
    INDEX --> WIRE_RENDER
    INDEX --> WIRE_TOOL
    INDEX --> MINIMAP
    INDEX --> UI_TOP
    INDEX --> UI_BOTTOM
    INDEX --> UI_STATUS
    INDEX --> UI_TOGGLE
    INDEX --> NODE_LIST
    INDEX --> INSPECTOR
    INDEX --> NOTIF_BAR
    INDEX --> POLLER
    INDEX --> DIRTY
    INDEX --> LAYOUT
    INDEX --> NODES_REG
    INDEX --> SCHEMA
    INDEX --> UI_SETTINGS
    INDEX --> UI_SETTINGS_M

    ENGINE --> GRAPH_STATE
    ENGINE --> NODES_REG
    ENGINE --> SCHEMA
    ENGINE --> EVAL_BRIDGE
    ENGINE --> DIRTY
    ENGINE --> WIRE_RENDER
    ENGINE --> RENDERER

    RENDERER --> GRAPH_STATE
    RENDERER --> NODES_REG

    CANVAS_VIEW --> WIRE_RENDER
    CANVAS_VIEW --> RENDERER

    MINIMAP --> CANVAS_VIEW

    WIRE_TOOL --> WIRE_RENDER

    INPUT --> CANVAS_VIEW
    INPUT --> GRAPH_STATE
    INPUT --> ENGINE
    INPUT --> RENDERER
    INPUT --> WIRE_RENDER
    INPUT --> WIRE_TOOL

    DIRTY --> GRAPH_STATE
    DIRTY --> EVAL_BRIDGE

    POLLER --> GRAPH_STATE
    POLLER --> EVAL_BRIDGE
    POLLER --> WIRE_RENDER
    POLLER --> NOTIF_BAR

    UI_TOP --> GRAPH_STATE
    UI_TOP --> WIRE_RENDER

    NODE_LIST --> ENGINE
    NODE_LIST --> WIRE_RENDER

    INSPECTOR --> ENGINE
    INSPECTOR --> WIRE_RENDER

    NODE_PICKER --> WIRE_RENDER
    UI_SETTINGS_M --> WIRE_RENDER

    POLL_MISS --> WIRE_RENDER
  end
```
