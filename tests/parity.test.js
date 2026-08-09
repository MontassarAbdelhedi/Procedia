import { describe, it, expect, beforeEach } from 'vitest';
import { loadGlobalScript } from './setup.js';
import { loadJSXScript, resetHandlers } from './jsxSetup.js';

beforeEach(function() {
  resetHandlers();
  loadJSXScript('jsx/dispatcher/dispatcher.jsx');
  loadGlobalScript('bridge/allowedActions.js');
  loadGlobalScript('bridge/jsxFiles.js');
  loadGlobalScript('bridge/evalBridge.js');
});

describe('dispatch/route whitelist parity', function() {
  it('allowed actions exactly match registered handlers', function() {
    var allowed = evalBridge.getAllowedActions().slice().sort();
    var handlers = Object.keys(window._handlers).sort();
    expect(handlers).toEqual(allowed);
    expect(allowed.length).toBeGreaterThan(0);
  });

  it('every allowed action routes to a real handler', function() {
    evalBridge.getAllowedActions().forEach(function(action) {
      var res = window._route({ action: action });
      expect(res.error).not.toContain('No handler');
    });
  });

  it('every registered handler is whitelisted', function() {
    Object.keys(window._handlers).forEach(function(action) {
      expect(evalBridge.getAllowedActions()).toContain(action);
    });
  });
});
