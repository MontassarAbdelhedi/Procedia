/**
 * @fileoverview Cloner transform computation helpers (ES3-safe).
 * Computes clone position/scale/rotation/opacity arrays for Linear,
 * Radial, and Grid modes. REQUIRES: (none, pure geometry).
 * Load BEFORE: cloner.jsx
 * Exports: _computeClonerTransforms, _computeLinear, _computeRadial, _computeGrid
 */
// actionInstances/clonerTransforms.jsx — Cloner transform computation (ES3-safe)

/**
 * Computes clone transform arrays based on mode and properties.
 * @param {string} mode - 'Linear', 'Radial', or 'Grid'
 * @param {Object} props - All node property values
 * @return {{instances: Array<{p:Array,s:Array,r:number,o:number}>}}
 */
function _computeClonerTransforms(mode, props) {
  if (mode === 'Linear') return _computeLinear(props);
  if (mode === 'Radial') return _computeRadial(props);
  if (mode === 'Grid')   return _computeGrid(props);
  return { instances: [] };
}

function _computeLinear(props) {
  var count  = (typeof props.linear_count === 'number') ? props.linear_count : 3;
  var offX   = (props.linear_offset && props.linear_offset[0]) || 0;
  var offY   = (props.linear_offset && props.linear_offset[1]) || 0;
  var incPosX = (props.linear_inc_pos && props.linear_inc_pos[0]) || 0;
  var incPosY = (props.linear_inc_pos && props.linear_inc_pos[1]) || 0;
  var incSclX = (props.linear_inc_scl && props.linear_inc_scl[0]) || 0;
  var incSclY = (props.linear_inc_scl && props.linear_inc_scl[1]) || 0;
  var incRot  = props.linear_inc_rot || 0;
  var incOp   = (typeof props.linear_inc_op === 'number') ? props.linear_inc_op : 0;

  var instances = [];
  var i;
  for (i = 0; i < count; i++) {
    instances.push({
      p: [offX * i, offY * i],
      s: [100 + incSclX * i, 100 + incSclY * i],
      r: incRot * i,
      o: Math.max(0, Math.min(100, 100 + incOp * i))
    });
  }
  return { instances: instances };
}

function _computeRadial(props) {
  var count      = (typeof props.radial_count === 'number') ? props.radial_count : 6;
  var radius     = props.radial_radius || 200;
  var startAngle = (typeof props.radial_start === 'number') ? props.radial_start : 0;
  var endAngle   = (typeof props.radial_end === 'number') ? props.radial_end : 360;
  var offX       = (props.radial_offset && props.radial_offset[0]) || 0;
  var offY       = (props.radial_offset && props.radial_offset[1]) || 0;

  var instances = [];
  var i;
  var totalAngle = endAngle - startAngle;
  if (count === 1) {
    totalAngle = 0;
    count = 1;
  } else {
    totalAngle = totalAngle / (count - 1);
  }

  for (i = 0; i < count; i++) {
    var angleDeg = startAngle + totalAngle * i;
    var angleRad = angleDeg * Math.PI / 180;
    instances.push({
      p: [Math.cos(angleRad) * radius + offX, Math.sin(angleRad) * radius + offY],
      s: [100, 100],
      r: 0,
      o: 100
    });
  }
  return { instances: instances };
}

function _computeGrid(props) {
  var countX = (typeof props.grid_count_x === 'number') ? props.grid_count_x : 3;
  var countY = (typeof props.grid_count_y === 'number') ? props.grid_count_y : 3;
  var countZ = (typeof props.grid_count_z === 'number') ? props.grid_count_z : 1;
  var distX  = (props.grid_distance && props.grid_distance[0]) || 150;
  var distY  = (props.grid_distance && props.grid_distance[1]) || 150;

  var instances = [];
  var cx, cy, cz;
  for (cz = 0; cz < countZ; cz++) {
    for (cy = 0; cy < countY; cy++) {
      for (cx = 0; cx < countX; cx++) {
        var centerX = (countX - 1) * distX / 2;
        var centerY = (countY - 1) * distY / 2;
        instances.push({
          p: [cx * distX - centerX, cy * distY - centerY],
          s: [100, 100],
          r: 0,
          o: 100
        });
      }
    }
  }
  return { instances: instances };
}
