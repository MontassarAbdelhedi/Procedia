import { describe, it, expect } from 'vitest';
import { loadGlobalScript } from './setup.js';

loadGlobalScript('reporting/redact.js');

describe('redact.label', function() {
  it('truncates labels to first 3 chars plus length', function() {
    expect(window.redact.label('MyLayer')).toBe('MyL(7)');
  });

  it('keeps short labels fully visible with length', function() {
    expect(window.redact.label('AB')).toBe('AB(2)');
    expect(window.redact.label('ABC')).toBe('ABC(3)');
  });

  it('handles empty and null', function() {
    expect(window.redact.label('')).toBe('');
    expect(window.redact.label(null)).toBe('');
    expect(window.redact.label(undefined)).toBe('');
  });
});

describe('redact.id', function() {
  it('hashes identifiers and never leaks the raw value', function() {
    var hashed = window.redact.id('PROC-1234567890-ab12');
    expect(hashed).not.toContain('PROC');
    expect(hashed).toMatch(/^h[0-9a-f]+$/);
  });

  it('is deterministic', function() {
    expect(window.redact.id('PROC-123')).toBe(window.redact.id('PROC-123'));
  });

  it('hashes distinct identifiers differently', function() {
    expect(window.redact.id('PROC-1')).not.toBe(window.redact.id('PROC-2'));
  });

  it('returns null for empty input', function() {
    expect(window.redact.id(null)).toBeNull();
    expect(window.redact.id('')).toBeNull();
  });
});

describe('redact.hash', function() {
  it('is deterministic and input-sensitive', function() {
    expect(window.redact.hash('a')).toBe(window.redact.hash('a'));
    expect(window.redact.hash('a')).not.toBe(window.redact.hash('b'));
  });

  it('returns null for empty input', function() {
    expect(window.redact.hash('')).toBeNull();
  });
});
