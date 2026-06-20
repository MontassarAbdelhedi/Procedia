/**
 * @fileoverview Floating comp dropdown at the bottom-left of the canvas.
 * Shows "All project" label with a dropdown listing every comp in the AE project
 * (excluding the reserved comp). Clicking a comp focuses it in the viewer,
 * filters the canvas to show only downstream nodes, and enables auto-wire on drop.
 * Depends on: evalBridge, graphState (globals).
 * Exports: compList.init
 */
// ui/compList.js
// DEPENDS ON: bridge/evalBridge.js, graph/graphState.js
// MUST LOAD BEFORE: index.js

var compList = (function() {

  var _dropdown = null;
  var _menu = null;
  var _triggerLabel = null;

  function _toggle() {
    if (_menu.classList.contains('complist-open')) {
      _close();
    } else {
      _open();
    }
  }

  function _open() {
    var trigger = _dropdown.querySelector('.complist-trigger');
    trigger.classList.add('complist-open');
    _menu.classList.add('complist-open');
    _menu.innerHTML = '<div class="complist-item complist-item--empty">Loading...</div>';
    if (typeof evalBridge !== 'undefined' && evalBridge.dispatch) {
      evalBridge.dispatch({ action: 'listComps' }).then(function(res) {
        if (res.ok && res.data) {
          _render(res.data);
        } else {
          _menu.innerHTML = '<div class="complist-item complist-item--empty">Error loading comps</div>';
        }
      }).catch(function() {
        _menu.innerHTML = '<div class="complist-item complist-item--empty">Error loading comps</div>';
      });
    } else {
      _menu.innerHTML = '<div class="complist-item complist-item--empty">Bridge not available</div>';
    }
  }

  function _close() {
    var trigger = _dropdown.querySelector('.complist-trigger');
    trigger.classList.remove('complist-open');
    _menu.classList.remove('complist-open');
  }

  /**
   * Walks upstream from a comp node through layer wires to find all connected nodes.
   * @param {string} compId The comp node UUID.
   * @return {Array} Array of node UUIDs (includes the comp itself).
   */
  function _calcUpstreamNodes(compId) {
    var visited = {};
    var queue = [compId];
    if (typeof graphState === 'undefined' || typeof graphState.getAllWires !== 'function') {
      return [];
    }
    var wires = graphState.getAllWires();
    while (queue.length > 0) {
      var nodeId = queue.shift();
      for (var wid in wires) {
        if (!wires.hasOwnProperty(wid)) continue;
        var w = wires[wid];
        if (w.type !== 'layer' && w.type !== 'data') continue;
        if (w.toNode === nodeId && !visited[w.fromNode]) {
          visited[w.fromNode] = true;
          queue.push(w.fromNode);
        }
      }
    }
    return Object.keys(visited);
  }

  /**
   * Applies the view filter and re-renders the canvas.
   * @param {string|null} compId Comp node UUID or null for all nodes.
   */
  function _applyFilter(compId) {
    try {
      if (compId) {
        var nodeIds = _calcUpstreamNodes(compId);

        graphState.setFilteredNodes(nodeIds);
      } else {
        graphState.clearFilter();
      }
      if (typeof renderer !== 'undefined' && renderer.render) renderer.render();
      if (typeof wireRenderer !== 'undefined' && wireRenderer.render) wireRenderer.render(null);
      if (typeof minimap !== 'undefined' && minimap.render) minimap.render();
      if (typeof statusBar !== 'undefined' && statusBar.refresh) statusBar.refresh();
    } catch (e) {
      console.error('[compList] _applyFilter error: ' + e.message);
    }
  }

  /**
   * Renders the comp list into the menu with "All project" as first item.
   * @param {Array} comps Array of { name, comment } objects.
   */
  function _render(comps) {
    var html = '<div class="complist-item" data-name="" data-comment="">All project</div>';
    if (!comps || comps.length === 0) {
      _menu.innerHTML = html;
      _bindItems();
      return;
    }
    for (var i = 0; i < comps.length; i++) {
      var c = comps[i];
      html += '<div class="complist-item" data-name="' + _escapeAttr(c.name) + '" data-comment="' + _escapeAttr(c.comment) + '">' + _escapeHtml(c.name) + '</div>';
    }
    _menu.innerHTML = html;
    _bindItems();
  }

  function _bindItems() {
    var items = _menu.querySelectorAll('.complist-item');
    for (var j = 0; j < items.length; j++) {
      items[j].addEventListener('click', _onItemClick);
    }
  }

  /**
   * Handles click on a menu item.
   */
  function _onItemClick(e) {
    e.stopPropagation();
    var item = e.currentTarget;
    var name = item.dataset.name;
    var comment = item.dataset.comment;
    _close();

    if (!name && !comment) {
      _selectAllProject();
      return;
    }

    _selectComp(name, comment);
  }

  /**
   * Selects "All project" — clears filter and active comp.
   */
  function _selectAllProject() {
    _triggerLabel.textContent = 'All project';
    graphState.setActiveComp(null);
    if (typeof graphState.clearFilter === 'function') {
      _applyFilter(null);
    }
  }

  /**
   * Selects a specific comp — focuses it in AE, filters canvas, sets active comp.
   * @param {string} name The comp name.
   * @param {string} comment The comp comment/UUID.
   */
  function _selectComp(name, comment) {
    _triggerLabel.textContent = name;
    if (typeof evalBridge !== 'undefined' && evalBridge.dispatch) {
      if (comment) {
        evalBridge.dispatch({ action: 'focusComp', params: { nodeUUID: comment } });
      } else {
        evalBridge.dispatch({ action: 'focusCompByName', params: { name: name } });
      }
    }

    var compId = null;
    if (comment) {
      var node = graphState.getNode(comment);
      if (node && node.type === 'core/comp') {
        compId = comment;
      }
    }

    if (!compId) {
      var allNodes = graphState.getAllNodes();
      for (var nid in allNodes) {
        if (!allNodes.hasOwnProperty(nid)) continue;
        var n = allNodes[nid];
        if (n.type === 'core/comp' && n.props && n.props.label === name) {
          compId = nid;
          break;
        }
      }
    }

    if (compId) {
      graphState.setActiveComp(compId);
      _applyFilter(compId);
    } else {

      graphState.setActiveComp(null);
      if (typeof graphState.clearFilter === 'function') {
        _applyFilter(null);
      }
    }
  }

  function _onOutsideClick(e) {
    if (_dropdown && !_dropdown.contains(e.target)) {
      _close();
    }
  }

  function _escapeHtml(str) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(str));
    return d.innerHTML;
  }

  function _escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /**
   * Creates the dropdown DOM inside canvas-wrap.
   */
  function init() {
    var canvasWrap = document.getElementById('canvas-wrap');
    if (!canvasWrap) return;

    _dropdown = document.createElement('div');
    _dropdown.id = 'complist-dropdown';

    _dropdown.innerHTML =
      '<div class="complist-trigger">' +
        '<span class="complist-label">All project</span>' +
        '<span class="complist-arrow">&#9660;</span>' +
      '</div>' +
      '<div class="complist-menu"></div>';

    _menu = _dropdown.querySelector('.complist-menu');
    _triggerLabel = _dropdown.querySelector('.complist-label');

    var trigger = _dropdown.querySelector('.complist-trigger');
    trigger.addEventListener('click', function(e) {
      e.stopPropagation();
      _toggle();
    });

    document.addEventListener('click', _onOutsideClick);

    canvasWrap.appendChild(_dropdown);
  }

  return {
    init: init
  };

})();
