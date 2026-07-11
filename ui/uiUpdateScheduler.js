window.__procedia_internal._uiScheduler = (function() {
  var _dirty = {};
  var _rafId = null;

  function _flush() {
    _rafId = null;
    if (_dirty.minimap && typeof minimap !== 'undefined' && minimap.render) minimap.render();
    if (_dirty.renderer && typeof renderer !== 'undefined' && renderer.render) renderer.render();
    if (_dirty.wireRenderer && typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
    if (_dirty.inspector && typeof inspector !== 'undefined' && inspector.refresh) inspector.refresh();
    if (_dirty.statusBar && typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    _dirty = {};
  }

  return {
    scheduleUIUpdate: function() {
      _dirty.minimap = true;
      _dirty.renderer = true;
      _dirty.wireRenderer = true;
      _dirty.inspector = true;
      _dirty.statusBar = true;
      if (!_rafId) _rafId = requestAnimationFrame(_flush);
    },
    markDirty: function(component) {
      _dirty[component] = true;
      if (!_rafId) _rafId = requestAnimationFrame(_flush);
    }
  };
})();
