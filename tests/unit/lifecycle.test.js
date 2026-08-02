import { describe, it, expect, beforeEach } from 'vitest';
import { loadGlobalScript } from '../setup.js';

// Load once — describe callbacks run before beforeEach
loadGlobalScript('graph/nodeRegistry.js');
loadGlobalScript('graph/engine/effectNodeFactory.js');

// Non-effect node definition files (25)
var NON_EFFECT_FILES = [
  'Core/Comp.js', 'Core/Footage.js', 'Core/Merge.js', 'Core/Multimerge.js',
  'Data/Color.js', 'Data/Number.js', 'Data/Expression.js',
  'Layers/Adjustment.js', 'Layers/Camera.js', 'Layers/Light.js',
  'Layers/Null.js', 'Layers/Shape.js', 'Layers/Solid.js', 'Layers/Text.js',
  'Shapes/Rectangle.js', 'Shapes/Ellipse.js', 'Shapes/Star.js',
  'Shapes/Squircle.js', 'Shapes/Gear.js', 'Shapes/Wave.js',
  'Shapes/Flower.js', 'Shapes/Polygon.js',
  'Effects/utility/Blending.js',
  'TrackMatte/MatteAlpha.js', 'TrackMatte/MatteLuma.js'
];

NON_EFFECT_FILES.forEach(function(f) {
  loadGlobalScript('graph/nodes/categories/' + f);
});

// Effect node metadata stubs
var METADATA_FILES = [
  '3DChannel.js', 'Audio.js', 'BlurSharpen.js', 'BorisFXMocha.js',
  'Channel.js', 'ColorCorrection.js', 'Distort.js', 'ExpressionControls.js',
  'Generate.js', 'ImmersiveVideo.js', 'Keying.js', 'Matte.js',
  'NoiseGrain.js', 'obsolete.js', 'Perspective.js', 'Simulation.js',
  'Stylize.js', 'Text.js', 'Time.js', 'Transition.js',
  'Uncategorized.js', 'Utility.js'
];

METADATA_FILES.forEach(function(f) {
  loadGlobalScript('graph/nodeMetadata/' + f);
});

var NON_EFFECT_TYPES = [
  'core/comp', 'core/footage', 'utility/merge', 'utility/multimerge',
  'data/color', 'data/number', 'data/expression',
  'layers/adjustment', 'layers/camera', 'layers/light',
  'layers/null', 'layers/shape', 'layers/solid', 'layers/text',
  'shapes/rectangle', 'shapes/ellipse', 'shapes/star', 'shapes/squircle',
  'shapes/gear', 'shapes/wave', 'shapes/flower', 'shapes/polygon',
  'utility/blending',
  'utility/matte-alpha', 'utility/matte-luma'
];

var NO_AE_KINDS = { data: true, merge: true, multimerge: true, blending: true };

var HOOKS = ['onDrop', 'onAlive', 'onGhost', 'onDelete', 'onPropertyChange'];

var DEDICATED = {
  'core/comp': true, 'core/footage': true,
  'layers/null': true, 'layers/shape': true, 'layers/solid': true, 'layers/adjustment': true
};

function fakeNode(type, props, hostingComps) {
  var def = window.nodeRegistry.getDefinition(type);
  return {
    id: 'PROC-TEST-0001',
    type: type,
    nodeKind: def ? def.nodeKind : null,
    props: props || {},
    hostingComps: hostingComps || ['HOST-TEST']
  };
}

describe('lifecycle hook contract', function() {
  it('has at least 25 non-effect node types', function() {
    var nonEffect = nodeRegistry.getAll();
    var filtered = {};
    for (var t in nonEffect) {
      if (!nonEffect.hasOwnProperty(t)) continue;
      if (nonEffect[t].params === 'dynamic') continue;
      filtered[t] = nonEffect[t];
    }
    expect(Object.keys(filtered).length).toBeGreaterThanOrEqual(25);
  });

  describe('5 hooks present', function() {
    NON_EFFECT_TYPES.forEach(function(type) {
      it(type + ' has required lifecycle hooks', function() {
        var def = nodeRegistry.getDefinition(type);
        expect(def).toBeTruthy();
        var required = type === 'core/comp'
          ? ['onDrop', 'onAlive', 'onDelete', 'onPropertyChange'] // CompNode is never ghosted
          : HOOKS;
        required.forEach(function(hook) {
          expect(typeof def[hook]).toBe('function');
        });
      });
    });
  });

  describe('node kind contracts', function() {
    describe('data/merge/multimerge/blending — all hooks return null', function() {
      NON_EFFECT_TYPES.forEach(function(type) {
        var def = nodeRegistry.getDefinition(type);
        var kind = def.nodeKind;
        if (!NO_AE_KINDS[kind]) return;

        it(type + ' (' + kind + ') hooks return null', function() {
          var node = fakeNode(type);
          HOOKS.forEach(function(hook) {
            expect(def[hook](node)).toBeNull();
          });
        });
      });
    });

    describe('affected nodes — onDrop returns null (except Comp), others return commands', function() {
      NON_EFFECT_TYPES.forEach(function(type) {
        var def = nodeRegistry.getDefinition(type);
        if (def.nodeKind !== 'affected') return;

        it(type + ' onDrop/is-alive hooks follow affected contract', function() {
          var node = fakeNode(type);

          if (type === 'core/comp') {
            expect(def.onDrop(node)).not.toBeNull();
          } else {
            expect(def.onDrop(node)).toBeNull();
          }

          expect(def.onAlive(node, 'HOST-TEST')).not.toBeNull();
          if (type !== 'core/comp') {
            expect(def.onGhost(node, 'HOST-TEST')).not.toBeNull();
          }
          expect(def.onDelete(node)).not.toBeNull();
          expect(typeof def.onPropertyChange).toBe('function');
        });
      });
    });

    describe('matte nodes — onDrop/onDelete return null, alive/ghost/propChange return commands', function() {
      var mattes = ['utility/matte-alpha', 'utility/matte-luma'];
      mattes.forEach(function(type) {
        it(type + ' matte hooks follow matte contract', function() {
          var def = nodeRegistry.getDefinition(type);
          var node = fakeNode(type);

          expect(def.onDrop(node)).toBeNull();
          expect(def.onDelete(node)).toBeNull();
          expect(def.onAlive(node, 'HOST-TEST', 'TOP-LAYER', 'MATTE-LAYER')).not.toBeNull();
          expect(def.onGhost(node, 'HOST-TEST', 'TOP-LAYER')).not.toBeNull();
          expect(def.onPropertyChange('invert', true, node, 'HOST-TEST', 'TOP-LAYER', 'MATTE-LAYER')).not.toBeNull();
        });
      });
    });
  });

  describe('dedicated flag contract', function() {
    NON_EFFECT_TYPES.forEach(function(type) {
      it(type + ' dedicated === ' + (DEDICATED[type] ? 'true' : 'false'), function() {
        var def = nodeRegistry.getDefinition(type);
        expect(def.dedicated).toBe(DEDICATED[type] || false);
      });
    });
  });

  describe('port contracts', function() {
    it('affected nodes have output + child_of + parent_of ports', function() {
      NON_EFFECT_TYPES.forEach(function(type) {
        var def = nodeRegistry.getDefinition(type);
        if (def.nodeKind !== 'affected') return;
        var portIds = def.ports.map(function(p) { return p.id; });
        expect(portIds).toContain('output');
        expect(portIds).toContain('child_of');
        expect(portIds).toContain('parent_of');
      });
    });

    it('effector nodes have main_input + output ports', function() {
      var all = nodeRegistry.getAll();
      for (var t in all) {
        if (!all.hasOwnProperty(t)) continue;
        var def = nodeRegistry.getDefinition(t);
        if (def.nodeKind !== 'effector') continue;
        var portIds = def.ports.map(function(p) { return p.id; });
        expect(portIds).toContain('main_input');
        expect(portIds).toContain('output');
      }
    });

    it('data nodes have output (data type) port', function() {
      NON_EFFECT_TYPES.forEach(function(type) {
        var def = nodeRegistry.getDefinition(type);
        if (def.nodeKind !== 'data') return;
        var portIds = def.ports.map(function(p) { return p.id; });
        expect(portIds).toContain('output');
      });
    });

    it('matte nodes have top_layer + matte_layer + output ports', function() {
      var mattes = ['utility/matte-alpha', 'utility/matte-luma'];
      mattes.forEach(function(type) {
        var def = nodeRegistry.getDefinition(type);
        var portIds = def.ports.map(function(p) { return p.id; });
        expect(portIds).toContain('top_layer');
        expect(portIds).toContain('matte_layer');
        expect(portIds).toContain('output');
      });
    });
  });

  describe('effect node factory contract', function() {
    it('every effect node has all 5 hooks (via upgradeStub)', function() {
      var all = nodeRegistry.getAll();
      for (var t in all) {
        if (!all.hasOwnProperty(t)) continue;
        var def = nodeRegistry.getDefinition(t); // triggers upgradeStub
        if (def.params !== 'dynamic') continue;
        HOOKS.forEach(function(hook) {
          expect(typeof def[hook]).toBe('function');
        });
      }
    });

    it('every effect node is nodeKind effector, dedicated false', function() {
      var all = nodeRegistry.getAll();
      for (var t in all) {
        if (!all.hasOwnProperty(t)) continue;
        var def = nodeRegistry.getDefinition(t);
        if (def.params !== 'dynamic') continue;
        expect(def.nodeKind).toBe('effector');
        expect(def.dedicated).toBe(false);
      }
    });

    it('every effect node has matchName', function() {
      var all = nodeRegistry.getAll();
      for (var t in all) {
        if (!all.hasOwnProperty(t)) continue;
        var def = nodeRegistry.getDefinition(t);
        if (def.params !== 'dynamic') continue;
        expect(typeof def.matchName).toBe('string');
        expect(def.matchName.length).toBeGreaterThan(0);
      }
    });
  });
});
