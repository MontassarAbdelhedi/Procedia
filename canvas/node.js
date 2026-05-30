// canvas/node.js
// DEPENDS ON: canvas/canvasView.js
// MUST LOAD BEFORE: index.js

var nodeModel = (function () {

  var _container = null;
  var _nodes = {};

  // ── DOM builder ─────────────────────────────────────────────

  function _buildNode(id, label, secondaryPorts) {
    var el = document.createElement('div');
    el.className = 'node';
    el.dataset.id = id;

    // ── Header ──
    var header = document.createElement('div');
    header.className = 'node__header';

    var childPort = document.createElement('div');
    childPort.className = 'node__port node__port--child';
    childPort.title = 'Child';
    header.appendChild(childPort);

    var mainPort = document.createElement('div');
    mainPort.className = 'node__port node__port--main';
    mainPort.title = 'Main in';
    header.appendChild(mainPort);

    var titleSpan = document.createElement('span');
    titleSpan.className = 'node__title';
    titleSpan.textContent = label;
    header.appendChild(titleSpan);

    var titleInput = document.createElement('input');
    titleInput.className = 'node__title-input';
    titleInput.type = 'text';
    titleInput.value = label;
    header.appendChild(titleInput);

    var collapseBtn = document.createElement('button');
    collapseBtn.className = 'node__collapse-btn';
    collapseBtn.innerHTML = '<i class="ti ti-chevron-down"></i>';
    header.appendChild(collapseBtn);

    var outputPort = document.createElement('div');
    outputPort.className = 'node__port node__port--output';
    outputPort.title = 'Output';
    header.appendChild(outputPort);

    el.appendChild(header);

    // ── Body ──
    var body = document.createElement('div');
    body.className = 'node__body';

    for (var i = 0; i < secondaryPorts.length; i++) {
      var row = document.createElement('div');
      row.className = 'node__port-row';

      var secPort = document.createElement('div');
      secPort.className = 'node__port node__port--secondary';
      secPort.title = secondaryPorts[i];
      row.appendChild(secPort);

      var lbl = document.createElement('span');
      lbl.className = 'node__port-label';
      lbl.textContent = secondaryPorts[i];
      row.appendChild(lbl);

      body.appendChild(row);
    }

    el.appendChild(body);

    // ── Parent port (bottom of node) ──
    var parentPort = document.createElement('div');
    parentPort.className = 'node__port node__port--parent';
    parentPort.title = 'Parent';
    el.appendChild(parentPort);

    return el;
  }

  // ── Drag ────────────────────────────────────────────────────

  function _attachDrag(el, header) {
    var active = false;
    var startScreen = { x: 0, y: 0 };
    var startWorld  = { x: 0, y: 0 };

    header.addEventListener('mousedown', function (e) {
      if (e.button !== 0) return;
      if (e.target.classList.contains('node__port')) return;
      if (e.target.closest && e.target.closest('.node__collapse-btn')) return;
      if (e.target.classList.contains('node__title-input')) return;

      e.stopPropagation();
      active = true;
      startScreen.x = e.clientX;
      startScreen.y = e.clientY;
      startWorld.x = parseFloat(el.style.left) || 0;
      startWorld.y = parseFloat(el.style.top)  || 0;
    });

    window.addEventListener('mousemove', function (e) {
      if (!active) return;
      var t = canvasView.getTransform();
      el.style.left = (startWorld.x + (e.clientX - startScreen.x) / t.scale) + 'px';
      el.style.top  = (startWorld.y + (e.clientY - startScreen.y) / t.scale) + 'px';
    });

    window.addEventListener('mouseup', function (e) {
      if (e.button !== 0 || !active) return;
      active = false;
    });
  }

  // ── Collapse ────────────────────────────────────────────────

  function _attachCollapse(el, btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      el.classList.toggle('node--collapsed');
    });
  }

  // ── Title editing ────────────────────────────────────────────

  function _attachTitleEdit(el, titleSpan, titleInput) {
    // Double-click title span → enter edit mode
    titleSpan.addEventListener('dblclick', function (e) {
      e.stopPropagation();
      titleInput.value = titleSpan.textContent;
      el.classList.add('node--editing');
      titleInput.focus();
      titleInput.select();
    });

    // Enter → confirm; Escape → cancel
    titleInput.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter')  { _commitTitle(el, titleSpan, titleInput); }
      if (e.key === 'Escape') { el.classList.remove('node--editing'); }
    });

    // Prevent input mousedown from starting a drag
    titleInput.addEventListener('mousedown', function (e) {
      e.stopPropagation();
    });

    // Blur (click empty canvas or any outside element) → confirm
    titleInput.addEventListener('blur', function () {
      _commitTitle(el, titleSpan, titleInput);
    });
  }

  function _commitTitle(el, titleSpan, titleInput) {
    var val = titleInput.value.trim();
    if (val) titleSpan.textContent = val;
    el.classList.remove('node--editing');
  }

  // ── Public API ───────────────────────────────────────────────

  function create(id, label, x, y, secondaryPorts) {
    var el = _buildNode(id, label, secondaryPorts || []);
    el.style.left = x + 'px';
    el.style.top  = y + 'px';

    _attachDrag(el, el.querySelector('.node__header'));
    _attachCollapse(el, el.querySelector('.node__collapse-btn'));
    _attachTitleEdit(
      el,
      el.querySelector('.node__title'),
      el.querySelector('.node__title-input')
    );

    _container.appendChild(el);
    _nodes[id] = el;
    return el;
  }

  function remove(id) {
    if (!_nodes[id]) return;
    _nodes[id].parentNode.removeChild(_nodes[id]);
    delete _nodes[id];
  }

  function init() {
    _container = document.getElementById('canvas-nodes');
  }

  return {
    init:   init,
    create: create,
    remove: remove
  };

}());
