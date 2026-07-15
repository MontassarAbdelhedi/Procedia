# Procedia

## Node-Based Compositing for After Effects

**Uppercut Studio** · v0.0.4 · MIT

---

## The Problem

After Effects' timeline is **linear and layer-stack-based**.

As projects grow complex:

- Compositing pipelines become **invisible** — effects are buried in layer stacks.
- Modifying pipelines is **risky** — changing order can break setups.
- Non-destructive iteration is **difficult.**
- Artists face difficult decision to move to node-based compositing software like Nuke and Fusion.

---

## The Solution

**Procedia** is a visual node-based compositing panel that docks inside After Effects.

It replaces the linear timeline with an **intuitive node graph** where you build compositing pipelines by connecting visual nodes on a canvas.

---



## How It Works

```
User Action (drag, connect, edit)
       │
       ▼
  Node Lifecycle Hook
       │
       ▼
  Command Object: { action, params }
       │
       ▼
  evalBridge → ExtendScript Dispatcher
       │
       ▼
  AE API Call → Result → UI Update
```

**A node is a self-contained contract. The graph engine is a dumb executor. Adding a new node means writing one file — nothing else.**

---



## Architecture Philosophy



### Command Pattern

- Panel JS never writes ExtendScript
- Only `dispatcher.jsx` makes AE API calls
- The engine contains **zero node-type conditionals**



### State Management

- `nodeMap` + `wireMap` = source of truth
- Persisted to AE via hidden "Reserved Comp"
- Writes only on save, quit, or panel unload

---



## Node System — 474+ Definitions



### 5 Node Kinds


| Kind         | Role                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| **Affected** | Creates/owns an AE layer (Text, Null, Shape, Adjustment, Comp)           |
| **Effector** | Applies an AE effect to an upstream layer (Blur, Fill, DropShadow, etc.) |
| **Data**     | Outputs pure values (Color, Number, Slider, Angle)                       |
| **Blending** | Applies AE blending modes                                                |
| **Matte**    | Applies luma/alpha matte relationships                                   |


Covering **25+ AE effect categories** — Blur & Sharpen, Color Correction, Distort, Generate, Keying, Matte, Perspective, Simulation, Stylize, Text, Time, Transition, Audio, 3D Channel, and more.

---



## Wire System

Three wire types power the graph:

- **Layer (green)** — Core compositing flow
- **Data (gray)** — Control values
- **Parent (orange)** — AE parenting

Four visual styles: Bezier, Direct, Stepped, Animated Dash

Cycle detection · Port type matching · Wire insertion (drop a node onto a wire to auto-insert)

---



## Key Features

- **Visual Node Graph** — Pan, zoom, minimap, dot-grid canvas
- **Node Palette** — Searchable sidebar, drag-and-drop creation
- **Inspector Panel** — Edit properties: numbers, booleans, colors, enums, vectors, strings
- **Auto Layout** — Sugiyama-style layered graph layout
- **AE Project Import** — One-click import of entire projects
- **Keyframe Sync** — Bidirectional synchronization with AE
- **Undo/Redo** — Full history for graph operations
- **Auto-Save** — Debounced continuous save to AE
- **Graph Search** — Find and highlight nodes instantly
- **Interactive Tutorial** — 8-step onboarding walkthrough

---



## Canvas & Interaction

- Rubber-band selection
- Node color toolbar
- Collapse/expand nodes (individual and bulk)
- Inline node renaming
- Node states: Alive (green), Ghost (gray/dashed), Error (red), Disabled

Layer stack view for comp nodes · Footage import from filesystem · Error node recovery

---



## Node Lifecycle

```
Ghost ──► Alive ──► Error
  │                    │
  └──── Removed ◄─────┘
```

**Ghost cascade** — When a wire is deleted, the algorithm traverses upstream, collects affected nodes, and batches all AE commands into a single bridge call.

---



## Tech Stack


| Layer              | Technology                                  |
| ------------------ | ------------------------------------------- |
| **Platform**       | Adobe CEP v11.0 (Chromium)                  |
| **Panel**          | HTML5 + CSS3 + JavaScript (vanilla)         |
| **AE Bridge**      | ExtendScript via `CSInterface.evalScript()` |
| **Target**         | After Effects 2025+                         |
| **Testing**        | Vitest + jsdom                              |
| **Error Tracking** | Sentry + html2canvas (auto screenshots)     |
| **Icons**          | Tabler Icons                                |
| **License**        | MIT                                         |


121+ files, zero bundler — plain `<script>` tags loaded in order.

---



## Why Procedia?

- **Visualize** complex pipelines at a glance
- **Iterate** non-destructively — rearrange and reconnect freely
- **Procedural** — nodes can be modified without breaking AE state
- **Familiar** — node graph paradigm artists already know
- **Integrated** — runs inside AE, not a separate app
- **Open** — MIT licensed, extensible architecture

---



## Roadmap & Future

- Dynamic effect schema cache for real-time effect discovery
- Enhanced auto-layout with more algorithms
- Advanced wire routing
- Performance optimizations for large graphs
- Community node packages

---



## Get Involved

**Procedia** is open source under MIT.

- GitHub: [Uppercut Studio / Procedia]
- Contribute node definitions, bug fixes, or features
- Build custom node packages
- Report issues and suggest features

---

**Thank You**

*Procedia — Node-Based Compositing for After Effects*

Uppercut Studio · MIT License · v0.0.4