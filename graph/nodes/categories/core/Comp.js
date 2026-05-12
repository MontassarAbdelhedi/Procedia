nodeRegistry.register({

  // ── 1. IDENTITY ──────────────────────────────────────────────────
  type:     'core/comp',
  label:    'Comp',
  category: 'Core',
  version:  '1.0.0',

  // ── 2. PORTS ─────────────────────────────────────────────────────
  inputs: [
    { name: 'layer_in', type: 'layer', required: false }
  ],
  outputs: [],

  // ── 3. PARAMS ────────────────────────────────────────────────────
  params: [
    { key: 'width',     label: 'Width',      type: 'int',   default: 1920, min: 1,   max: 7680 },
    { key: 'height',    label: 'Height',     type: 'int',   default: 1080, min: 1,   max: 4320 },
    { key: 'duration',  label: 'Duration',   type: 'float', default: 10,   min: 0.1, max: 3600 },
    { key: 'frameRate', label: 'Frame Rate', type: 'float', default: 24,   min: 1,   max: 120  }
  ],

  // ── 4. APPLY ─────────────────────────────────────────────────────
  // Comp is an orchestrator node — AE comp creation is handled by the engine, not apply().
  apply: function(nodeData) {
    return '';
  }

});
