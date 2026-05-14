// graph/nodes/categories/layers/Text.js
// DEPENDS ON: graph/nodeRegistry.js
// MUST LOAD BEFORE: index.js

nodeRegistry.register({

  // ── 1. IDENTITY ──────────────────────────────────────────────────
  type:     'TextNode',
  label:    'Text',
  category: 'Layers',
  version:  '1.0.0',

  // ── 2. PORTS ─────────────────────────────────────────────────────
  inputs: [
    { name: 'layer_in',      type: 'layer', required: false },
    { name: 'data_content',  type: 'data',  required: false },
    { name: 'data_fontSize', type: 'data',  required: false },
    { name: 'data_color',    type: 'data',  required: false }
  ],
  outputs: [{ name: 'output', type: 'layer' }],

  // ── 3. PARAMS ────────────────────────────────────────────────────
  params: [
    { key: 'content',  label: 'Content',   type: 'string', default: 'Text',       matchName: 'ADBE Text Properties/ADBE Text Document/content' },
    { key: 'fontSize', label: 'Font Size', type: 'int',    default: 72, min: 1, max: 999, matchName: 'ADBE Text Properties/ADBE Text Document/fontSize' },
    { key: 'color',    label: 'Color',     type: 'color',  default: [1, 1, 1],    matchName: 'ADBE Text Properties/ADBE Text Document/color' }
  ],

  // ── 4. APPLY ─────────────────────────────────────────────────────
  apply: function(nodeData) {
    return '';
  }

});
