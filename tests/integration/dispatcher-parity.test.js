import { describe, it, expect, beforeEach } from 'vitest';
import { loadGlobalScript } from '../setup.js';
import { loadJSXScript, resetHandlers } from '../jsxSetup.js';

beforeEach(function() {
  resetHandlers();
  loadJSXScript('jsx/dispatcher/dispatcher.jsx');
  loadGlobalScript('bridge/evalBridge.js');
});

describe('dispatcher-whitelist parity', function() {
  var EXPECTED = 89;

  it('whitelist has ' + EXPECTED + ' entries', function() {
    expect(evalBridge.getAllowedActions().length).toBe(EXPECTED);
  });

  it('dispatcher has ' + EXPECTED + ' registered handlers', function() {
    expect(Object.keys(window._handlers).length).toBe(EXPECTED);
  });

  it('every whitelist entry routes to a real handler', function() {
    evalBridge.getAllowedActions().forEach(function(action) {
      var res = window._route({ action: action });
      expect(res.error).not.toContain('No handler');
    });
  });

  it('every handler is whitelisted', function() {
    Object.keys(window._handlers).forEach(function(action) {
      expect(evalBridge.getAllowedActions()).toContain(action);
    });
  });

  it('whitelist and handler keys are identical sets', function() {
    var allowed = evalBridge.getAllowedActions().slice().sort();
    var handlers = Object.keys(window._handlers).sort();
    expect(handlers).toEqual(allowed);
  });
});
