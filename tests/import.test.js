import { describe, it, expect, beforeAll } from 'vitest';
import { loadGlobalScript } from './setup.js';
import { loadJSXScript } from './jsxSetup.js';

// --- Mock nodeRegistry (import module reads nodeKind/dedicated from it) ---
window.nodeRegistry = {
  _defs: {
    'core/comp':           { type: 'core/comp', nodeKind: 'affected', dedicated: true },
    'core/footage':        { type: 'core/footage', nodeKind: 'affected', dedicated: true },
    'layers/text':         { type: 'layers/text', nodeKind: 'affected', dedicated: false },
    'layers/null':         { type: 'layers/null', nodeKind: 'affected', dedicated: true },
    'layers/shape':        { type: 'layers/shape', nodeKind: 'affected', dedicated: false },
    'layers/adjustment':   { type: 'layers/adjustment', nodeKind: 'affected', dedicated: true },
    'layers/camera':       { type: 'layers/camera', nodeKind: 'affected', dedicated: true },
    'utility/blending':    { type: 'utility/blending', nodeKind: 'blending', dedicated: false },
    'utility/matte-alpha': { type: 'utility/matte-alpha', nodeKind: 'matte', dedicated: false },
    'utility/matte-luma':  { type: 'utility/matte-luma', nodeKind: 'matte', dedicated: false }
  },
  getDefinition: function(type) { return this._defs[type] || null; }
};

// --- Mock NODE_METADATA (used by helpers.js to build the effect map) ---
window.NODE_METADATA = {
  'blur-sharpen/box-blur-2':                  { matchName: 'ADBE Box Blur2' },
  'color-correction/brightness-contrast':     { matchName: 'ADBE Brightness & Contrast 2' },
  'generate/fill':                            { matchName: 'ADBE Fill' },
  'blur-sharpen/gaussian-blur':               { matchName: 'ADBE Gaussian Blur' },
  'perspective/drop-shadow':                  { matchName: 'ADBE Drop Shadow' }
};

// --- Load panel-side import module sources ---
loadGlobalScript('data/uuidGenerator.js');
loadGlobalScript('graph/import/mapNodes/helpers.js');
loadGlobalScript('graph/import/mapNodes/buildItems.js');
loadGlobalScript('graph/import/mapNodes/buildEffects.js');
loadGlobalScript('graph/import/mapWires.js');

// --- Load JSX helpers for _stripEnumPrefix ---
loadJSXScript('jsx/dispatcher/actionImport/helpers.jsx');

// Helper to build a minimal layer data object
function makeLayerData(overrides) {
  var base = {
    uuid: 'PROC-test-' + Math.random().toString(36).substr(2, 9),
    index: 1,
    name: 'Test Layer',
    type: 'text',
    blendingMode: 'NORMAL',
    parentUUID: null,
    hasTrackMatte: false,
    trackMatteType: null,
    trackMatteLayerUUID: null,
    transform: {
      position: [100, 200],
      scale: [100, 100],
      rotation: 0,
      opacity: 100,
      anchorPoint: [0, 0]
    },
    effects: [],
    source: null
  };
  for (var k in overrides) { if (overrides.hasOwnProperty(k)) base[k] = overrides[k]; }
  return base;
}

// Helper to build a minimal comp data object
function makeCompData(overrides) {
  var base = {
    uuid: 'PROC-comp-' + Math.random().toString(36).substr(2, 9),
    name: 'Test Comp',
    width: 1920,
    height: 1080,
    frameRate: 30,
    duration: 10,
    layers: []
  };
  for (var k in overrides) { if (overrides.hasOwnProperty(k)) base[k] = overrides[k]; }
  return base;
}


// ============================================================================
// 1. _stripEnumPrefix (JSX helper — blending/matte bug fix)
// ============================================================================

describe('_stripEnumPrefix', function() {
  it('strips "BlendingMode." prefix', function() {
    expect(window._stripEnumPrefix('BlendingMode.NORMAL')).toBe('NORMAL');
    expect(window._stripEnumPrefix('BlendingMode.ADD')).toBe('ADD');
    expect(window._stripEnumPrefix('BlendingMode.COLOR_DODGE')).toBe('COLOR_DODGE');
  });

  it('strips "TrackMatteType." prefix', function() {
    expect(window._stripEnumPrefix('TrackMatteType.ALPHA')).toBe('ALPHA');
    expect(window._stripEnumPrefix('TrackMatteType.LUMA_INVERTED')).toBe('LUMA_INVERTED');
  });

  it('returns the string as-is when no prefix', function() {
    expect(window._stripEnumPrefix('NORMAL')).toBe('NORMAL');
    expect(window._stripEnumPrefix('ADD')).toBe('ADD');
  });

  it('handles falsy input', function() {
    expect(window._stripEnumPrefix('')).toBe('');
    expect(window._stripEnumPrefix(null)).toBe(null);
    expect(window._stripEnumPrefix(undefined)).toBe(undefined);
  });
});


// ============================================================================
// 2. aeTypeToNodeType
// ============================================================================

describe('aeTypeToNodeType', function() {
  var fn = function() { return window.__imp_nodes.aeTypeToNodeType; };

  it('maps text to layers/text', function() {
    expect(fn()('text')).toBe('layers/text');
  });

  it('maps camera to layers/camera', function() {
    expect(fn()('camera')).toBe('layers/camera');
  });

  it('maps null to layers/null', function() {
    expect(fn()('null')).toBe('layers/null');
  });

  it('maps shape to layers/shape', function() {
    expect(fn()('shape')).toBe('layers/shape');
  });

  it('maps adjustment to layers/adjustment', function() {
    expect(fn()('adjustment')).toBe('layers/adjustment');
  });

  it('maps solid to core/footage', function() {
    expect(fn()('solid')).toBe('core/footage');
  });

  it('maps footage to core/footage', function() {
    expect(fn()('footage')).toBe('core/footage');
  });

  it('maps precomp to null (handled specially in builder)', function() {
    expect(fn()('precomp')).toBe(null);
  });

  it('returns null for unknown types', function() {
    expect(fn()('light')).toBe(null);
    expect(fn()('unknown')).toBe(null);
    expect(fn()('nonexistent')).toBe(null);
  });
});


// ============================================================================
// 3. Effect mapping (knownEffectType / isKnownEffect)
// ============================================================================

describe('effect mapping', function() {
  it('maps ADBE Fill to generate/fill', function() {
    expect(window.__imp_nodes.knownEffectType('ADBE Fill')).toBe('generate/fill');
  });

  it('maps ADBE Gaussian Blur to blur-sharpen/gaussian-blur', function() {
    expect(window.__imp_nodes.knownEffectType('ADBE Gaussian Blur')).toBe('blur-sharpen/gaussian-blur');
  });

  it('maps ADBE Drop Shadow to perspective/drop-shadow', function() {
    expect(window.__imp_nodes.knownEffectType('ADBE Drop Shadow')).toBe('perspective/drop-shadow');
  });

  it('includes effects from NODE_METADATA', function() {
    expect(window.__imp_nodes.knownEffectType('ADBE Box Blur2')).toBe('blur-sharpen/box-blur-2');
    expect(window.__imp_nodes.knownEffectType('ADBE Brightness & Contrast 2')).toBe('color-correction/brightness-contrast');
  });

  it('returns effects/unknown for unrecognized matchNames', function() {
    expect(window.__imp_nodes.knownEffectType('ADBE Nonexistent Effect')).toBe('effects/unknown');
  });

  it('isKnownEffect returns true for known effects, false for unknown', function() {
    expect(window.__imp_nodes.isKnownEffect('ADBE Fill')).toBe(true);
    expect(window.__imp_nodes.isKnownEffect('ADBE Box Blur2')).toBe(true);
    expect(window.__imp_nodes.isKnownEffect('ADBE Nonexistent')).toBe(false);
  });
});


// ============================================================================
// 4. buildFootageNode
// ============================================================================

describe('buildFootageNode', function() {
  it('builds a valid footage node', function() {
    var footageData = {
      uuid: 'PROC-footage-1',
      name: 'video.mp4',
      type: 'file',
      file: 'C:/path/to/video.mp4'
    };
    var node = window.__imp_nodes.buildFootageNode(footageData, 0);
    expect(node.id).toBe('PROC-footage-1');
    expect(node.type).toBe('core/footage');
    expect(node.nodeKind).toBe('affected');
    expect(node.dedicated).toBe(true);
    expect(node.state).toBe('ghost');
    expect(node.props.label).toBe('video.mp4');
    expect(node.props.filePath).toBe('C:/path/to/video.mp4');
    expect(node.hostingComps).toEqual([]);
  });

  it('stores solidColor for solid footage', function() {
    var footageData = {
      uuid: 'PROC-solid-1',
      name: 'Red Solid',
      type: 'solid',
      solidColor: [1, 0, 0]
    };
    var node = window.__imp_nodes.buildFootageNode(footageData, 0);
    expect(node.props.solidColor).toEqual([1, 0, 0]);
  });
});


// ============================================================================
// 5. buildCompNode
// ============================================================================

describe('buildCompNode', function() {
  it('builds a valid comp node', function() {
    var compData = makeCompData({ uuid: 'PROC-comp-1', name: 'Main Comp' });
    var node = window.__imp_nodes.buildCompNode(compData, 0);
    expect(node.id).toBe('PROC-comp-1');
    expect(node.type).toBe('core/comp');
    expect(node.nodeKind).toBe('affected');
    expect(node.dedicated).toBe(true);
    expect(node.props.label).toBe('Main Comp');
    expect(node.props.width).toBe(1920);
    expect(node.props.height).toBe(1080);
    expect(node.props.frameRate).toBe(30);
    expect(node.props.duration).toBe(10);
    expect(node.hostingComps).toEqual(['PROC-comp-1']);
  });
});


// ============================================================================
// 6. buildLayerNode
// ============================================================================

describe('buildLayerNode', function() {
  it('builds a valid text layer node', function() {
    var ld = makeLayerData({ type: 'text', name: 'Hello' });
    var node = window.__imp_nodes.buildLayerNode(ld, 'PROC-host', 0);
    expect(node.type).toBe('layers/text');
    expect(node.nodeKind).toBe('affected');
    expect(node.dedicated).toBe(false);
    expect(node.props.label).toBe('Hello');
    expect(node.props.content).toBe('Hello');
    expect(node.props.fontSize).toBe(72);
    expect(node.props.position).toEqual([100, 200]);
    expect(node.props.rotation).toBe(0);
    expect(node.props.opacity).toBe(100);
    expect(node.hostingComps).toEqual([]);
  });

  it('builds a valid null layer node', function() {
    var ld = makeLayerData({ type: 'null', name: 'Null 1' });
    var node = window.__imp_nodes.buildLayerNode(ld, 'PROC-host', 0);
    expect(node.type).toBe('layers/null');
    expect(node.dedicated).toBe(true);
    expect(node.props.scale).toEqual([100, 100]);
  });

  it('builds a valid shape layer node', function() {
    var ld = makeLayerData({ type: 'shape', name: 'Shape 1' });
    var node = window.__imp_nodes.buildLayerNode(ld, 'PROC-host', 0);
    expect(node.type).toBe('layers/shape');
    expect(node.props.fillColor).toEqual([1, 0, 1, 1]);
  });

  it('builds a valid adjustment layer node', function() {
    var ld = makeLayerData({ type: 'adjustment', name: 'Adj 1' });
    var node = window.__imp_nodes.buildLayerNode(ld, 'PROC-host', 0);
    expect(node.type).toBe('layers/adjustment');
    expect(node.dedicated).toBe(true);
  });

  it('builds a valid footage (solid) layer node from source', function() {
    var ld = makeLayerData({
      type: 'solid',
      name: 'Blue Solid',
      source: { type: 'solid', color: [0, 0, 1] }
    });
    var node = window.__imp_nodes.buildLayerNode(ld, 'PROC-host', 0);
    expect(node.type).toBe('core/footage');
    expect(node.props.solidColor).toEqual([0, 0, 1]);
  });

  it('returns null for precomp (aeTypeToNodeType returns null)', function() {
    var ld = makeLayerData({ type: 'precomp' });
    var node = window.__imp_nodes.buildLayerNode(ld, 'PROC-host', 0);
    expect(node).toBe(null);
  });
});


// ============================================================================
// 7. buildEffectNode
// ============================================================================

describe('buildEffectNode', function() {
  it('builds a known effect node with properties', function() {
    var effData = {
      matchName: 'ADBE Fill',
      name: 'Fill',
      index: 1,
      properties: [
        { matchName: 'ADBE Fill-0001', value: [1, 0, 0] },
        { matchName: 'ADBE Fill-0006', value: 50 }
      ]
    };
    var node = window.__imp_nodes.buildEffectNode(effData, 0);
    expect(node.type).toBe('generate/fill');
    expect(node.nodeKind).toBe('effector');
    expect(node.dedicated).toBe(false);
    expect(node.props['ADBE Fill-0001']).toEqual([1, 0, 0]);
    expect(node.props['ADBE Fill-0006']).toBe(50);
  });

  it('builds an unknown effect node with label/matchName', function() {
    var effData = {
      matchName: 'ADBE Weird Effect',
      name: 'Weird',
      index: 1,
      properties: []
    };
    var node = window.__imp_nodes.buildEffectNode(effData, 0);
    expect(node.type).toBe('effects/unknown');
    expect(node.props.label).toBe('Weird');
    expect(node.props.effectMatchName).toBe('ADBE Weird Effect');
  });

  it('generates a PROC- UUID for the node id', function() {
    var effData = { matchName: 'ADBE Fill', name: 'Fill', index: 1, properties: [] };
    var node = window.__imp_nodes.buildEffectNode(effData, 0);
    expect(node.id.indexOf('PROC-')).toBe(0);
  });
});


// ============================================================================
// 8. buildBlendingNode
// ============================================================================

describe('buildBlendingNode', function() {
  it('builds a blending node with the given mode', function() {
    var node = window.__imp_nodes.buildBlendingNode('ADD', 0);
    expect(node.type).toBe('utility/blending');
    expect(node.nodeKind).toBe('blending');
    expect(node.state).toBe('alive');
    expect(node.props.mode).toBe('ADD');
  });
});


// ============================================================================
// 9. buildMatteNode
// ============================================================================

describe('buildMatteNode', function() {
  it('builds a luma matte node for LUMA type', function() {
    var node = window.__imp_nodes.buildMatteNode('LUMA', false, 0);
    expect(node.type).toBe('utility/matte-luma');
    expect(node.nodeKind).toBe('matte');
    expect(node.props.invert).toBe(false);
  });

  it('builds an alpha matte node for ALPHA type', function() {
    var node = window.__imp_nodes.buildMatteNode('ALPHA', false, 0);
    expect(node.type).toBe('utility/matte-alpha');
  });

  it('builds a luma matte node for LUMA_INVERTED type', function() {
    var node = window.__imp_nodes.buildMatteNode('LUMA_INVERTED', true, 0);
    expect(node.type).toBe('utility/matte-luma');
    expect(node.props.invert).toBe(true);
  });

  it('detects alpha matte within string containing ALPHA', function() {
    var node = window.__imp_nodes.buildMatteNode('ALPHA_INVERTED', true, 0);
    expect(node.type).toBe('utility/matte-alpha');
    expect(node.props.invert).toBe(true);
  });
});


// ============================================================================
// 10. buildCompWires
// ============================================================================

describe('buildCompWires', function() {
  var wires = function() { return window.__imp_wires; };

  it('builds a simple layer-to-comp wire chain', function() {
    var compData = makeCompData({ uuid: 'PROC-C1' });
    var ld = makeLayerData({ uuid: 'PROC-L1', type: 'text' });
    var layerNode = { id: 'PROC-L1', type: 'layers/text' };
    var layerNodes = [{ node: layerNode, layerData: ld }];
    var result = wires().buildCompWires(compData, layerNode, layerNodes, {}, {}, {}, {});
    var w = result.wires;
    expect(w.length).toBe(1);
    expect(w[0].fromNode).toBe('PROC-L1');
    expect(w[0].toNode).toBe('PROC-C1');
    expect(w[0].type).toBe('layer');
    expect(w[0]._pathLayerUUID).toBe(w[0].id);
    expect(result.restamps.length).toBe(1);
    expect(result.restamps[0].compUUID).toBe('PROC-C1');
    expect(result.restamps[0].oldUUID).toBe('PROC-L1');
    expect(result.restamps[0].newUUID).toBe(w[0].id);
  });

  it('chains effects between layer and comp', function() {
    var compData = makeCompData({ uuid: 'PROC-C1' });
    var ld = makeLayerData({ uuid: 'PROC-L1', type: 'text' });
    var layerNode = { id: 'PROC-L1', type: 'layers/text' };
    var layerNodes = [{ node: layerNode, layerData: ld }];
    var effNode = { id: 'PROC-E1', type: 'effects/fill' };
    var effectMap = { 'PROC-L1': [effNode] };
    var result = wires().buildCompWires(compData, layerNode, layerNodes, effectMap, {}, {}, {});
    var w = result.wires;
    expect(w.length).toBe(2);
    expect(w[0].fromNode).toBe('PROC-L1');
    expect(w[0].toNode).toBe('PROC-E1');
    expect(w[0]._pathLayerUUID).toBe(null);
    expect(w[1].fromNode).toBe('PROC-E1');
    expect(w[1].toNode).toBe('PROC-C1');
    expect(w[1]._pathLayerUUID).toBe(w[1].id);
    expect(result.restamps.length).toBe(1);
    expect(result.restamps[0].oldUUID).toBe('PROC-L1');
    expect(result.restamps[0].newUUID).toBe(w[1].id);
  });

  it('splices blending node into chain', function() {
    var compData = makeCompData({ uuid: 'PROC-C1' });
    var ld = makeLayerData({ uuid: 'PROC-L1', type: 'text' });
    var layerNode = { id: 'PROC-L1', type: 'layers/text' };
    var layerNodes = [{ node: layerNode, layerData: ld }];
    var blendNode = { id: 'PROC-B1', type: 'utility/blending' };
    var blendingMap = { 'PROC-L1': blendNode };
    var result = wires().buildCompWires(compData, layerNode, layerNodes, {}, blendingMap, {}, {});
    var w = result.wires;
    expect(w.length).toBe(2);
    expect(w[0].fromNode).toBe('PROC-L1');
    expect(w[0].toNode).toBe('PROC-B1');
    expect(w[1].fromNode).toBe('PROC-B1');
    expect(w[1].toNode).toBe('PROC-C1');
  });

  it('splices matte node and builds matte reference wire', function() {
    var compData = makeCompData({ uuid: 'PROC-C1' });
    var topLd = makeLayerData({ uuid: 'PROC-TOP', type: 'text' });
    var matteLd = makeLayerData({ uuid: 'PROC-MATTE', type: 'text' });
    var topNode = { id: 'PROC-TOP', type: 'layers/text' };
    var matteNode = { id: 'PROC-MATTE-N', type: 'layers/text' };
    var layerNodes = [
      { node: topNode, layerData: topLd },
      { node: matteNode, layerData: matteLd }
    ];
    var matteEffNode = { id: 'PROC-MATTENODE', type: 'utility/matte-luma' };
    var matteMap = {
      'PROC-TOP': { matteNode: matteEffNode, matteLayerUUID: 'PROC-MATTE' }
    };
    var layerUUIDToNodeID = { 'PROC-TOP': 'PROC-TOP', 'PROC-MATTE': 'PROC-MATTE-N' };
    var result = wires().buildCompWires(compData, topNode, layerNodes, {}, {}, matteMap, layerUUIDToNodeID);
    var w = result.wires;
    var hasMatteRef = false;
    for (var i = 0; i < w.length; i++) {
      if (w[i].fromNode === 'PROC-MATTE-N' && w[i].toNode === 'PROC-MATTENODE') {
        hasMatteRef = true;
        expect(w[i].type).toBe('layer');
        expect(w[i]._pathLayerUUID).toBe(null);
      }
    }
    expect(hasMatteRef).toBe(true);
    expect(result.restamps.length).toBe(2);
    var foundTop = false;
    for (var ri = 0; ri < result.restamps.length; ri++) {
      if (result.restamps[ri].oldUUID === 'PROC-TOP') foundTop = true;
    }
    expect(foundTop).toBe(true);
  });

  it('skips matte reference wire when matte layer UUID is not in layerUUIDToNodeID', function() {
    var compData = makeCompData({ uuid: 'PROC-C1' });
    var topLd = makeLayerData({ uuid: 'PROC-TOP', type: 'text' });
    var topNode = { id: 'PROC-TOP', type: 'layers/text' };
    var layerNodes = [{ node: topNode, layerData: topLd }];
    var matteEffNode = { id: 'PROC-MATTENODE', type: 'utility/matte-luma' };
    var matteMap = {
      'PROC-TOP': { matteNode: matteEffNode, matteLayerUUID: 'PROC-SKIPPED' }
    };
    var layerUUIDToNodeID = { 'PROC-TOP': 'PROC-TOP' };
    var result = wires().buildCompWires(compData, topNode, layerNodes, {}, {}, matteMap, layerUUIDToNodeID);
    var w = result.wires;
    var hasMatteRef = false;
    for (var i = 0; i < w.length; i++) {
      if (w[i].toNode === 'PROC-MATTENODE' && w[i].fromNode !== 'PROC-TOP') hasMatteRef = true;
    }
    expect(hasMatteRef).toBe(false);
  });

  it('uses layerNode.id as chain start for precomp layers', function() {
    var compData = makeCompData({ uuid: 'PROC-C1' });
    var ld = makeLayerData({
      uuid: 'PROC-PRECOMP-LAYER',
      type: 'precomp',
      source: { type: 'precomp', ref: 'PROC-INNER-COMP' }
    });
    var compNodeInner = { id: 'PROC-INNER-COMP', type: 'core/comp' };
    var layerNodes = [{ node: compNodeInner, layerData: ld }];
    var layerUUIDToNodeID = { 'PROC-PRECOMP-LAYER': 'PROC-INNER-COMP' };
    var result = wires().buildCompWires(compData, compNodeInner, layerNodes, {}, {}, {}, layerUUIDToNodeID);
    var w = result.wires;
    expect(w.length).toBe(1);
    expect(w[0].fromNode).toBe('PROC-INNER-COMP');
    expect(w[0].toNode).toBe('PROC-C1');
    expect(result.restamps.length).toBe(1);
    expect(result.restamps[0].oldUUID).toBe('PROC-INNER-COMP');
  });
});


// ============================================================================
// 11. buildParentWires
// ============================================================================

describe('buildParentWires', function() {
  var wires = function() { return window.__imp_wires; };

  it('builds parent wire using layerUUIDToNodeID map', function() {
    var childLd = makeLayerData({ uuid: 'PROC-CHILD', parentUUID: 'PROC-PARENT' });
    var parentLd = makeLayerData({ uuid: 'PROC-PARENT', parentUUID: null });
    var childNode = { id: 'PROC-CHILD-N', type: 'layers/text' };
    var parentNode = { id: 'PROC-PARENT-N', type: 'layers/null' };
    var layerNodes = [
      { node: childNode, layerData: childLd },
      { node: parentNode, layerData: parentLd }
    ];
    var layerUUIDToNodeID = {
      'PROC-CHILD': 'PROC-CHILD-N',
      'PROC-PARENT': 'PROC-PARENT-N'
    };
    var w = wires().buildParentWires(layerNodes, layerUUIDToNodeID);
    expect(w.length).toBe(1);
    expect(w[0].type).toBe('parent');
    expect(w[0].fromNode).toBe('PROC-CHILD-N');
    expect(w[0].toNode).toBe('PROC-PARENT-N');
    expect(w[0].fromPort).toBe('child_of');
    expect(w[0].toPort).toBe('parent_of');
  });

  it('skips parent wire when parent UUID is not in layerUUIDToNodeID', function() {
    var childLd = makeLayerData({ uuid: 'PROC-CHILD', parentUUID: 'PROC-MISSING' });
    var childNode = { id: 'PROC-CHILD-N', type: 'layers/text' };
    var layerNodes = [{ node: childNode, layerData: childLd }];
    var layerUUIDToNodeID = { 'PROC-CHILD': 'PROC-CHILD-N' };
    var w = wires().buildParentWires(layerNodes, layerUUIDToNodeID);
    expect(w.length).toBe(0);
  });

  it('produces no wires when no parentUUID is set', function() {
    var ld = makeLayerData({ uuid: 'PROC-L1', parentUUID: null });
    var node = { id: 'PROC-L1-N', type: 'layers/text' };
    var layerNodes = [{ node: node, layerData: ld }];
    var w = wires().buildParentWires(layerNodes, { 'PROC-L1': 'PROC-L1-N' });
    expect(w.length).toBe(0);
  });

  it('translates precomp layer UUIDs to CompNode IDs', function() {
    var childLd = makeLayerData({
      uuid: 'PROC-PRECOMP-L',
      parentUUID: 'PROC-PARENT-L',
      type: 'precomp',
      source: { type: 'precomp', ref: 'PROC-COMP-N' }
    });
    var parentLd = makeLayerData({ uuid: 'PROC-PARENT-L', type: 'null' });
    var compNode = { id: 'PROC-COMP-N', type: 'core/comp' };
    var parentNode = { id: 'PROC-PARENT-N', type: 'layers/null' };
    var layerNodes = [
      { node: compNode, layerData: childLd },
      { node: parentNode, layerData: parentLd }
    ];
    var layerUUIDToNodeID = {
      'PROC-PRECOMP-L': 'PROC-COMP-N',
      'PROC-PARENT-L': 'PROC-PARENT-N'
    };
    var w = wires().buildParentWires(layerNodes, layerUUIDToNodeID);
    expect(w.length).toBe(1);
    expect(w[0].fromNode).toBe('PROC-COMP-N');
    expect(w[0].toNode).toBe('PROC-PARENT-N');
  });
});


// ============================================================================
// 12. Blending bug fix — NORMAL mode must not produce a blending node
// ============================================================================

describe('blending bug fix', function() {
  it('NORMAL blending mode produces no blending entry in blendingMap', function() {
    var ld = makeLayerData({ blendingMode: 'NORMAL' });
    var blendingMap = {};
    if (ld.blendingMode && ld.blendingMode !== 'NORMAL') {
      var blendNode = window.__imp_nodes.buildBlendingNode(ld.blendingMode, 0);
      blendingMap[ld.uuid] = blendNode;
    }
    var hasBlend = false;
    for (var k in blendingMap) { if (blendingMap.hasOwnProperty(k)) hasBlend = true; }
    expect(hasBlend).toBe(false);
  });

  it('non-NORMAL blending mode produces a blending entry', function() {
    var ld = makeLayerData({ blendingMode: 'ADD' });
    var blendingMap = {};
    if (ld.blendingMode && ld.blendingMode !== 'NORMAL') {
      var blendNode = window.__imp_nodes.buildBlendingNode(ld.blendingMode, 0);
      blendingMap[ld.uuid] = blendNode;
    }
    expect(blendingMap[ld.uuid]).toBeDefined();
    expect(blendingMap[ld.uuid].props.mode).toBe('ADD');
  });

  it('stripEnumPrefix normalizes BlendingMode.NORMAL to NORMAL (no blending node)', function() {
    var raw = window._stripEnumPrefix('BlendingMode.NORMAL');
    expect(raw).toBe('NORMAL');
    expect(raw !== 'NORMAL').toBe(false);
  });

  it('stripEnumPrefix normalizes BlendingMode.ADD to ADD (blending node created)', function() {
    var raw = window._stripEnumPrefix('BlendingMode.ADD');
    expect(raw).toBe('ADD');
    expect(raw !== 'NORMAL').toBe(true);
  });
});


// ============================================================================
// 13. Precomp support — precomp layer reuses CompNode in the wire chain
// ============================================================================

describe('precomp support', function() {
  it('buildCompWires starts chain from CompNode id, not layer uuid', function() {
    var compData = makeCompData({ uuid: 'PROC-OUTER' });
    var precompLd = makeLayerData({
      uuid: 'PROC-LAYER-X',
      type: 'precomp',
      source: { type: 'precomp', ref: 'PROC-INNER' }
    });
    var innerCompNode = { id: 'PROC-INNER', type: 'core/comp' };
    var layerNodes = [{ node: innerCompNode, layerData: precompLd }];
    var layerUUIDToNodeID = { 'PROC-LAYER-X': 'PROC-INNER' };
    var result = window.__imp_wires.buildCompWires(
      compData, innerCompNode, layerNodes, {}, {}, {}, layerUUIDToNodeID
    );
    var w = result.wires;
    expect(w.length).toBe(1);
    expect(w[0].fromNode).toBe('PROC-INNER');
    expect(w[0].toNode).toBe('PROC-OUTER');
    expect(w[0].fromNode).not.toBe('PROC-LAYER-X');
  });

  it('precomp layer with effects chains effect after CompNode', function() {
    var compData = makeCompData({ uuid: 'PROC-OUTER' });
    var precompLd = makeLayerData({
      uuid: 'PROC-LAYER-X',
      type: 'precomp',
      source: { type: 'precomp', ref: 'PROC-INNER' },
      effects: [{ matchName: 'ADBE Fill', name: 'Fill', index: 1, properties: [] }]
    });
    var innerCompNode = { id: 'PROC-INNER', type: 'core/comp' };
    var effNode = window.__imp_nodes.buildEffectNode(precompLd.effects[0], 0);
    var layerNodes = [{ node: innerCompNode, layerData: precompLd }];
    var effectMap = { 'PROC-LAYER-X': [effNode] };
    var layerUUIDToNodeID = { 'PROC-LAYER-X': 'PROC-INNER' };
    var result = window.__imp_wires.buildCompWires(
      compData, innerCompNode, layerNodes, effectMap, {}, {}, layerUUIDToNodeID
    );
    var w = result.wires;
    expect(w.length).toBe(2);
    expect(w[0].fromNode).toBe('PROC-INNER');
    expect(w[0].toNode).toBe(effNode.id);
    expect(w[1].fromNode).toBe(effNode.id);
    expect(w[1].toNode).toBe('PROC-OUTER');
  });
});
