/**
 * @fileoverview Scans all footage items (including solids) in the AE project
 * for import. Excludes items inside the reserved Procedia folder.
 * (ES3-safe)
 * REQUIRES: json.jsx, utils.jsx
 * Load BEFORE: dispatcher.jsx
 * Exports: _handleImportScanFootage
 */
// actionImport/scanFootage.jsx — Import footage scanner (ES3-safe)
// REQUIRES: json.jsx, utils.jsx
// Load BEFORE: dispatcher.jsx (functions become globals for _handlers map)

function _handleImportScanFootage(cmd) {
  var result = { ok: false, data: null, error: null };
  try {
    var items = [];
    var proj = app.project;
    for (var i = 1; i <= proj.numItems; i++) {
      try {
        var item = proj.item(i);
        if (!(item instanceof FootageItem)) continue;

        // Skip items inside the Procedia reserved folder
        if (item.parentFolder && item.parentFolder.name &&
            item.parentFolder.name.indexOf('DO NOT DELETE') === 0) continue;

        var entry = {
          name:        item.name,
          comment:     item.comment || '',
          width:       item.width,
          height:      item.height,
          duration:    item.duration,
          frameRate:   item.frameRate,
          filePath:    '',
          footageType: 'unknown',
          solidColor:  null
        };

        var src = item.mainSource;
        if (src instanceof SolidSource) {
          var sc = src.color;
          entry.footageType = 'solid';
          entry.solidColor = [sc[0], sc[1], sc[2]];
        } else if (src instanceof FileSource) {
          if (src.file) {
            entry.filePath = src.file.fsName;
          }
          var hasVideo = item.hasVideo || false;
          var hasAudio = item.hasAudio || false;
          if (hasVideo && hasAudio) {
            entry.footageType = 'video';
          } else if (hasVideo) {
            entry.footageType = 'video';
          } else if (hasAudio) {
            entry.footageType = 'audio';
          } else {
            entry.footageType = 'image';
          }
          if (item.mainSource.isStill) entry.footageType = 'image';
        } else if (src instanceof PlaceholderSource) {
          entry.footageType = 'placeholder';
        }

        items.push(entry);
      } catch (e) {}
    }
    result.ok = true;
    result.data = items;
  } catch (e) {
    result.error = 'importScanFootage: ' + e.toString();
  }
  return result;
}
