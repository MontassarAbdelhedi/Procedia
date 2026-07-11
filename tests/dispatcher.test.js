import { describe, it, expect, beforeEach } from 'vitest';
import { loadJSXScript, mockHandler, resetHandlers } from './jsxSetup.js';

beforeEach(function() {
  window.app = { beginUndoGroup: function() {}, endUndoGroup: function() {} };
  resetHandlers();
  loadJSXScript('jsx/dispatcher/dispatcher.jsx');
});

describe('_cmdParams', function() {
  it('extracts params from command', function() {
    expect(window._cmdParams({ action: 'test', params: { foo: 'bar' } })).toEqual({ foo: 'bar' });
  });

  it('returns empty object for missing params', function() {
    expect(window._cmdParams({ action: 'test' })).toEqual({});
  });

  it('returns empty object for null cmd', function() {
    expect(window._cmdParams(null)).toEqual({});
  });

  it('returns empty object for undefined cmd', function() {
    expect(window._cmdParams(undefined)).toEqual({});
  });
});

describe('_handleGeneric', function() {
  it('returns error with action name', function() {
    var res = window._handleGeneric({ action: 'unknownAction' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('unknownAction');
  });

  it('returns error with "unknown" for missing action', function() {
    var res = window._handleGeneric({});
    expect(res.error).toContain('unknown');
  });
});

describe('_route', function() {
  it('errors on missing action field', function() {
    var res = window._route({});
    expect(res.ok).toBe(false);
    expect(res.error).toContain('missing action');
  });

  it('errors on null cmd', function() {
    var res = window._route(null);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('missing action');
  });

  it('routes to registered handler', function() {
    mockHandler('ping', function() { return { ok: true, data: 'pong' }; });
    var res = window._route({ action: 'ping' });
    expect(res.ok).toBe(true);
    expect(res.data).toBe('pong');
  });

  it('falls back to generic handler for unknown action', function() {
    var res = window._route({ action: 'noSuchHandler' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('No handler');
  });

  it('wraps handler exceptions in error result', function() {
    mockHandler('crash', function() { throw new Error('boom'); });
    var res = window._route({ action: 'crash' });
    expect(res.ok).toBe(false);
    expect(res.error).toContain('boom');
  });
});

describe('dispatch', function() {
  it('returns JSON error for invalid JSON input', function() {
    var raw = window.dispatch('not json');
    var res = JSON.parse(raw);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('Dispatcher error');
  });

  it('routes valid command to handler and returns JSON result', function() {
    mockHandler('ping', function() { return { ok: true, data: 'pong' }; });
    var raw = window.dispatch(JSON.stringify({ action: 'ping' }));
    var res = JSON.parse(raw);
    expect(res.ok).toBe(true);
    expect(res.data).toBe('pong');
  });

  it('returns generic error for unregistered action', function() {
    var raw = window.dispatch(JSON.stringify({ action: 'noop' }));
    var res = JSON.parse(raw);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('No handler');
  });
});

describe('dispatchBatch', function() {
  it('executes multiple commands sequentially', function() {
    var log = [];
    mockHandler('a', function() { log.push('a'); return { ok: true }; });
    mockHandler('b', function() { log.push('b'); return { ok: true }; });
    var raw = window.dispatchBatch(JSON.stringify([{ action: 'a' }, { action: 'b' }]));
    expect(log).toEqual(['a', 'b']);
    var res = JSON.parse(raw);
    expect(res.ok).toBe(true);
  });

  it('stops on first failure', function() {
    var log = [];
    mockHandler('a', function() { log.push('a'); return { ok: true }; });
    mockHandler('fail', function() { log.push('fail'); return { ok: false, error: 'broken' }; });
    mockHandler('c', function() { log.push('c'); return { ok: true }; });
    var raw = window.dispatchBatch(JSON.stringify([{ action: 'a' }, { action: 'fail' }, { action: 'c' }]));
    expect(log).toEqual(['a', 'fail']);
    var res = JSON.parse(raw);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('broken');
  });

  it('errors on non-array input', function() {
    var raw = window.dispatchBatch(JSON.stringify({ action: 'a' }));
    var res = JSON.parse(raw);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('expected array');
  });

  it('errors on invalid JSON', function() {
    var raw = window.dispatchBatch('not json');
    var res = JSON.parse(raw);
    expect(res.ok).toBe(false);
    expect(res.error).toContain('error');
  });
});
