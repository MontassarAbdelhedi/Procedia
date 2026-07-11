/**
 * graph/wire/wireRenderer/render.js
 *
 * Main render orchestration: full re-render, split-wire preview, animation
 * loop management, and initialization. Public API: init, render,
 * renderSplitPreview.
 *
 * Dependencies: wireRenderer container (wireRenderer/helpers.js, draw.js)
 * Load after: wire/wireRenderer/draw.js
 * Load before: wire/wire.js
 */
// graph/wire/wireRenderer/render.js
// MUST LOAD AFTER: graph/wire/wireRenderer/draw.js
// MUST LOAD BEFORE: graph/wire/wire.js

(function(c) {

  c._stopAnim = function() {
    if (c._animFrameId) {
      cancelAnimationFrame(c._animFrameId);
      c._animFrameId = null;
      c._animOffset = 0;
    }
  };

  c.render = function(preview) {
    if (!c._ctx) return;
    c._resize();

    var style = c._getStyle();

    if (preview) {
      if (c._animFrameId) {
        cancelAnimationFrame(c._animFrameId);
        c._animFrameId = null;
        c._animOffset = 0;
      }
      c._drawAll(preview);
      return;
    }

    if (c._getAnimDash()) {
      if (!c._animFrameId) {
        c._drawAll(null);
        function _tick() {
          if (!c._getAnimDash()) {
            c._stopAnim();
            return;
          }
          c._animOffset += 0.3;
          if (c._animOffset > 200) c._animOffset = 0;
          c._drawAll(null);
          c._updateInsertBtn();
          c._animFrameId = requestAnimationFrame(_tick);
        }
        c._animFrameId = requestAnimationFrame(_tick);
      }
      c._updateInsertBtn();
      return;
    }

    c._stopAnim();

    c._drawAll(preview);
    c._updateInsertBtn();
  };

  c.renderSplitPreview = function(previewState) {
    if (!c._ctx) return;
    c._resize();

    if (c._animFrameId) {
      cancelAnimationFrame(c._animFrameId);
      c._animFrameId = null;
      c._animOffset = 0;
    }

    c._drawAll(null);

    if (!previewState) return;

    var style = c._getStyle();

    c._ctx.save();
    c._ctx.globalAlpha = 0.55;
    c._ctx.strokeStyle = '#06D6A0';
    c._ctx.lineWidth = 2.5;
    c._ctx.setLineDash([6, 4]);

    var fp = previewState.fromPos;
    var tp = previewState.toPos;
    var ip = previewState.insertPos;

    c._ctx.beginPath();
    c._drawSegment(c._ctx, fp.x, fp.y, ip.x, ip.y, style);
    c._ctx.stroke();

    c._ctx.beginPath();
    c._drawSegment(c._ctx, ip.x, ip.y, tp.x, tp.y, style);
    c._ctx.stroke();

    c._ctx.setLineDash([]);

    c._ctx.globalAlpha = 0.25;
    c._ctx.strokeStyle = '#06D6A0';
    c._ctx.lineWidth = 8;
    c._ctx.beginPath();
    c._drawSegment(c._ctx, fp.x, fp.y, ip.x, ip.y, style);
    c._ctx.stroke();
    c._ctx.beginPath();
    c._drawSegment(c._ctx, ip.x, ip.y, tp.x, tp.y, style);
    c._ctx.stroke();

    c._ctx.restore();
  };

  c._insertBtn = null;

  c._showInsertBtn = function(x, y) {
    if (!c._insertBtn) {
      c._insertBtn = document.createElement('button');
      c._insertBtn.className = 'wire-insert-btn';
      c._insertBtn.textContent = '+';
      c._insertBtn.title = 'Add node at midpoint';
      c._insertBtn.addEventListener('mousedown', function(e) {
        e.stopPropagation();
      });
      c._insertBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        var wireId = c._insertBtn.dataset.wireId;
        if (!wireId) return;
        var wire = graphState.getWire(wireId);
        if (!wire) return;
        var btnRect = c._insertBtn.getBoundingClientRect();
        var screenX = btnRect.left + btnRect.width / 2;
        var screenY = btnRect.top + btnRect.height / 2;
        if (typeof nodePicker !== 'undefined' && nodePicker.show) {
          nodePicker.show(screenX, screenY, null, null, null, wireId);
        }
      });
      var wrap = document.getElementById('canvas-wrap');
      if (wrap) wrap.appendChild(c._insertBtn);
    }
    c._insertBtn.dataset.wireId = typeof _hoveredWireId !== 'undefined' && _hoveredWireId ? _hoveredWireId : '';
    c._insertBtn.style.left = (x - 12) + 'px';
    c._insertBtn.style.top = (y - 12) + 'px';
    c._insertBtn.style.display = 'flex';
    c._insertBtn.style.opacity = '1';
  };

  c._hideInsertBtn = function() {
    if (c._insertBtn) {
      c._insertBtn.style.display = 'none';
    }
  };

  c._updateInsertBtn = function() {
    if (typeof _hoveredWireId === 'undefined' || !_hoveredWireId) {
      c._hideInsertBtn();
      return;
    }
    var wire = graphState.getWire(_hoveredWireId);
    if (!wire) {
      c._hideInsertBtn();
      return;
    }
    var mid = c._wireMidpoint(wire);
    if (!mid) {
      c._hideInsertBtn();
      return;
    }
    c._showInsertBtn(mid.x, mid.y);
  };

  c.init = function() {
    c._canvas = document.getElementById('node-graph');
    if (!c._canvas) {
      console.warn('[wireRenderer] #node-graph not found');
      return;
    }
    c._ctx = c._canvas.getContext('2d');
    c._resize();
    c.render(null);
  };

})(window.wireRenderer);
