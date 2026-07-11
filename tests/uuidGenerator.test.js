import { describe, it, expect } from 'vitest';
import { loadGlobalScript } from './setup.js';

loadGlobalScript('data/uuidGenerator.js');

describe('uuidGenerator', () => {
  const gen = () => window.uuidGenerator;

  it('has node() and wire() methods', () => {
    expect(typeof gen().node).toBe('function');
    expect(typeof gen().wire).toBe('function');
  });

  describe('node()', () => {
    it('generates a string starting with PROC-', () => {
      const id = gen().node();
      expect(typeof id).toBe('string');
      expect(id.startsWith('PROC-')).toBe(true);
    });

    it('generates unique IDs on successive calls', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(gen().node());
      }
      expect(ids.size).toBe(100);
    });

    it('contains a timestamp segment', () => {
      const match = gen().node().match(/^PROC-(\d+)-/);
      expect(match).not.toBeNull();
      const ts = parseInt(match[1], 10);
      expect(ts).toBeGreaterThan(0);
    });
  });

  describe('wire()', () => {
    it('generates a string starting with WIRE-', () => {
      const id = gen().wire();
      expect(typeof id).toBe('string');
      expect(id.startsWith('WIRE-')).toBe(true);
    });

    it('generates unique IDs on successive calls', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(gen().wire());
      }
      expect(ids.size).toBe(100);
    });
  });
});
