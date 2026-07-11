import { describe, it, expect, beforeEach } from 'vitest';
import { loadGlobalScript } from './setup.js';

describe('keyframeState', () => {
  beforeEach(() => {
    window.__procedia_internal.gs = window.__procedia_internal.gs || {};
    loadGlobalScript('graph/keyframeState.js');
    window.keyframeState.reset();
  });

  const ks = () => window.keyframeState;

  it('exposes expected methods', () => {
    expect(typeof ks().hasKeyframes).toBe('function');
    expect(typeof ks().setKeyframes).toBe('function');
    expect(typeof ks().clearKeyframes).toBe('function');
  });

  describe('hasKeyframes', () => {
    it('returns false for non-existent node/param', () => {
      expect(ks().hasKeyframes('node1', 'opacity')).toBe(false);
    });

    it('returns true after setKeyframes is called', () => {
      ks().setKeyframes('node1', 'opacity', [0, 1, 2]);
      expect(ks().hasKeyframes('node1', 'opacity')).toBe(true);
    });
  });

  describe('setKeyframes', () => {
    it('stores times', () => {
      ks().setKeyframes('node1', 'position', [2, 0, 1]);
      expect(ks().hasKeyframes('node1', 'position')).toBe(true);
    });

    it('ignores non-array times input', () => {
      ks().setKeyframes('node1', 'scale', null);
      expect(ks().hasKeyframes('node1', 'scale')).toBe(false);
    });
  });

  describe('clearKeyframes', () => {
    it('removes the keyframe entry for a node/param', () => {
      ks().setKeyframes('node1', 'opacity', [0]);
      ks().clearKeyframes('node1', 'opacity');
      expect(ks().hasKeyframes('node1', 'opacity')).toBe(false);
    });

    it('cleans up empty node entries', () => {
      ks().setKeyframes('node1', 'opacity', [0]);
      ks().clearKeyframes('node1', 'opacity');
      expect(ks().getKeyframeTimes('node1', 'opacity')).toEqual([]);
      expect(ks().hasKeyframes('node1', 'opacity')).toBe(false);
    });
  });

  describe('isPlayheadOnKeyframe', () => {
    beforeEach(() => {
      ks().setKeyframes('node1', 'opacity', [0, 1, 2]);
    });

    it('returns true when playhead is at a keyframe time', () => {
      ks().setCurrentTime(1);
      expect(ks().isPlayheadOnKeyframe('node1', 'opacity')).toBe(true);
    });

    it('returns false when playhead is between keyframes', () => {
      ks().setCurrentTime(1.5);
      expect(ks().isPlayheadOnKeyframe('node1', 'opacity')).toBe(false);
    });

    it('returns false for non-keyframed param', () => {
      expect(ks().isPlayheadOnKeyframe('node1', 'scale')).toBe(false);
    });
  });

  describe('getNextKeyframeTime', () => {
    beforeEach(() => {
      ks().setKeyframes('node1', 'opacity', [0, 1, 2]);
    });

    it('returns the next keyframe time after playhead', () => {
      ks().setCurrentTime(0.5);
      expect(ks().getNextKeyframeTime('node1', 'opacity')).toBe(1);
    });

    it('returns null when no keyframes after playhead', () => {
      ks().setCurrentTime(3);
      expect(ks().getNextKeyframeTime('node1', 'opacity')).toBeNull();
    });

    it('returns null for non-keyframed param', () => {
      expect(ks().getNextKeyframeTime('node1', 'scale')).toBeNull();
    });
  });

  describe('getPrevKeyframeTime', () => {
    beforeEach(() => {
      ks().setKeyframes('node1', 'opacity', [0, 1, 2]);
    });

    it('returns the previous keyframe time before playhead', () => {
      ks().setCurrentTime(1.5);
      expect(ks().getPrevKeyframeTime('node1', 'opacity')).toBe(1);
    });

    it('returns null when no keyframes before playhead', () => {
      ks().setCurrentTime(0);
      expect(ks().getPrevKeyframeTime('node1', 'opacity')).toBeNull();
    });
  });

  describe('getKeyframeTimes', () => {
    it('returns stored times for a keyframed param', () => {
      ks().setKeyframes('node1', 'opacity', [0, 1, 2]);
      const times = ks().getKeyframeTimes('node1', 'opacity');
      expect(times).toEqual([0, 1, 2]);
    });

    it('returns empty array for non-keyframed param', () => {
      expect(ks().getKeyframeTimes('node1', 'scale')).toEqual([]);
    });
  });
});
