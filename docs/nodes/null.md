Node: NullNode
Description: Creates a null layer in the hosting comp, used as a 
general-purpose transform controller and parent anchor. Other layers 
wire into it to declare AE parenting relationships.
Category: Core
Kind: affected

Properties:
  - label:    string  — display name; maps to AE layer name via renameNode() 
                        on every change — default: "Null"
  - position: [float, float] — x, y position in comp space — default: [0, 0]
  - scale:    [float, float] — x, y scale percentage — default: [100, 100]
  - rotation: float  — rotation in degrees — default: 0
  - opacity:  float  — opacity percentage, range 0–100 — default: 100

Inputs:
  - layer_in_{n}: layer — one port, unlimited multiplicity. Same pattern 
                          as CompNode. Each connected layer becomes a child 
                          of this null via AE layer parenting (layer.parent).

Outputs:
  - output: layer — the null layer reference passed downstream to a comp 
                    or another null

Exceptions/Rules:
  1. ARCHITECTURE CORRECTION — NullNode classification:
     The architecture doc lists NullNode as "Not-Dedicated". This is 
     wrong. NullNode IS a Dedicated node. Update Section 1a of 
     PROCEDIA-V2-ARCHITECTURE.md to reflect:
       NullNode | — (no FootageItem) | NullLayer | Created via 
       comp.layers.addNull(). AE auto-creates an internal object.

  2. CREATION — use comp.layers.addNull() only. Do not import footage. 
     Do not call app.project.importFile(). AE handles the internal 
     project object automatically.

  3. MULTI-COMP — one null layer per hosting comp. Standard AE behavior. 
     No sharing, no precomp workaround. Each comp gets its own 
     independent null layer tracked by the same UUID.

  4. LABEL → AE LAYER NAME — the label param drives the AE layer name 
     directly. On every label change in the inspector, call renameNode() 
     immediately. Do not wait for blur or Enter. The default AE layer 
     name on creation should match the default label: "Null".

  5. PARENTING — when a layer wire connects into layer_in_{n}, call 
     setLayerParent(childUUID, nullUUID, hostingCompUUID) immediately. 
     When that wire is deleted, call clearLayerParent(childUUID, 
     hostingCompUUID) immediately. The null must already be alive in 
     the comp before any child can be parented. Never attempt 
     setLayerParent before the null layer exists in AE.

  6. PORT MULTIPLICITY — layer_in_{n} follows the exact same pattern as 
     CompNode. The port is declared once in the node definition. The 
     graph system dynamically names each wire layer_in_0, layer_in_1, 
     layer_in_2, etc. as connections are added. One wire per slot. 
     No upper limit.

  7. 3D LAYER — not in v1.0.0. Do not add a 3D toggle param. Do not call 
     layer.threeDLayer. Leave a comment in the node file: 
     // TODO v1.1.0 — add 3D toggle param and z-position/rotation props

  8. PROPERTY MATCH NAMES — use these exact AE match names, no exceptions:
     - Position:  "ADBE Position"         (under "ADBE Transform Group")
     - Scale:     "ADBE Scale"            (under "ADBE Transform Group")
     - Rotation:  "ADBE Rotate Z"         (under "ADBE Transform Group")
     - Opacity:   "ADBE Opacity"          (under "ADBE Transform Group")

  9. ES3 STRICT — position and scale are arrays. Do NOT use array 
     destructuring or spread. Access values by index: 
     value[0], value[1]. Pass as AE array: [x, y].

  10. SOURCE OF PARENTING TRUTH — dataWire is the only record of which 
      layers are parented to this null. Do not infer parenting from AE. 
      On crash recovery, re-apply all parenting relationships by reading 
      dataWire and calling setLayerParent for each layer_in wire found.