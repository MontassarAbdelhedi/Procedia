/**
 * CEP Node adapter for updater networking, hashing, persistence, and helper launch.
 * DEPENDS ON: updater/core.js
 * MUST LOAD BEFORE: updater/updateService.js
 */
var updaterNodeAdapter = (function() {
  var TRUSTED_HOSTS = {
    'raw.githubusercontent.com': true,
    'github.com': true,
    'api.github.com': true,
    'objects.githubusercontent.com': true,
    'release-assets.githubusercontent.com': true
  };

  function nodeRequire(name) {
    if (typeof cep_node !== 'undefined' && cep_node.require) return cep_node.require(name);
    if (typeof window !== 'undefined' && window.cep_node && window.cep_node.require) return window.cep_node.require(name);
    if (typeof require === 'function') return require(name);
    throw new Error('CEP Node.js is unavailable. Reinstall Procedia to enable in-app updates.');
  }

  function ensureTrustedUrl(value) {
    var parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !TRUSTED_HOSTS[parsed.hostname.toLowerCase()]) {
      throw new Error('The update server is not trusted.');
    }
    return parsed;
  }

  function request(url, options, redirectCount) {
    options = options || {};
    redirectCount = redirectCount || 0;
    var parsed = ensureTrustedUrl(url);
    var https = nodeRequire('https');
    return new Promise(function(resolve, reject) {
      var settled = false;
      var req = https.get({
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port || 443,
        path: parsed.pathname + parsed.search,
        headers: { 'User-Agent': 'Procedia-Updater/1.0', 'Accept': 'application/json, application/zip' }
      }, function(response) {
        var status = response.statusCode || 0;
        if (status >= 300 && status < 400 && response.headers.location) {
          response.resume();
          if (redirectCount >= 5) return reject(new Error('Too many update-server redirects.'));
          var target = new URL(response.headers.location, parsed.href).href;
          try { ensureTrustedUrl(target); }
          catch (error) { return reject(error); }
          request(target, options, redirectCount + 1).then(resolve, reject);
          return;
        }
        if (status === 403 && response.headers['x-ratelimit-remaining'] === '0') {
          response.resume();
          return reject(new Error('The update server rate limit was reached. Try again later.'));
        }
        if (status < 200 || status >= 300) {
          response.resume();
          return reject(new Error('The update server returned HTTP ' + status + '.'));
        }
        settled = true;
        resolve(response);
      });
      req.setTimeout(options.timeout || 15000, function() { req.destroy(new Error('The update server timed out.')); });
      req.on('error', function(error) { if (!settled) reject(error); });
    });
  }

  function getJson(url) {
    return request(url).then(function(response) {
      return new Promise(function(resolve, reject) {
        var chunks = [];
        var length = 0;
        response.on('data', function(chunk) {
          length += chunk.length;
          if (length > 1024 * 1024) {
            response.destroy(new Error('Update metadata is too large.'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', function() {
          try {
            var BufferClass = nodeRequire('buffer').Buffer;
            resolve(JSON.parse(BufferClass.concat(chunks).toString('utf8')));
          }
          catch (error) { reject(new Error('Update metadata is not valid JSON.')); }
        });
        response.on('error', reject);
      });
    });
  }

  function mkdirp(directory) {
    var fs = nodeRequire('fs');
    if (fs.existsSync(directory)) return;
    var path = nodeRequire('path');
    var parent = path.dirname(directory);
    if (parent !== directory) mkdirp(parent);
    try { fs.mkdirSync(directory); }
    catch (error) { if (!fs.existsSync(directory)) throw error; }
  }

  function writeJsonAtomic(filePath, value) {
    var fs = nodeRequire('fs');
    var path = nodeRequire('path');
    mkdirp(path.dirname(filePath));
    var temp = filePath + '.tmp';
    fs.writeFileSync(temp, JSON.stringify(value, null, 2), 'utf8');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    fs.renameSync(temp, filePath);
  }

  function readJson(filePath, fallback) {
    var fs = nodeRequire('fs');
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')); }
    catch (error) { return fallback; }
  }

  function download(url, destination, onProgress) {
    var fs = nodeRequire('fs');
    var path = nodeRequire('path');
    mkdirp(path.dirname(destination));
    return request(url, { timeout: 30000 }).then(function(response) {
      return new Promise(function(resolve, reject) {
        var maxBytes = 512 * 1024 * 1024;
        var total = Number(response.headers['content-length']) || null;
        if (total && total > maxBytes) {
          response.resume();
          reject(new Error('The update package exceeds the maximum allowed size.'));
          return;
        }
        var received = 0;
        var output = fs.createWriteStream(destination, { flags: 'wx' });
        response.on('data', function(chunk) {
          received += chunk.length;
          if (received > maxBytes) {
            response.destroy(new Error('The update package exceeds the maximum allowed size.'));
            return;
          }
          if (onProgress) onProgress(received, total);
        });
        response.on('error', reject);
        output.on('error', reject);
        output.on('finish', function() { resolve({ bytes: received, total: total }); });
        response.pipe(output);
      });
    }).catch(function(error) {
      try { if (fs.existsSync(destination)) fs.unlinkSync(destination); } catch (ignore) {}
      throw error;
    });
  }

  function sha256(filePath) {
    var fs = nodeRequire('fs');
    var crypto = nodeRequire('crypto');
    return new Promise(function(resolve, reject) {
      var hash = crypto.createHash('sha256');
      var input = fs.createReadStream(filePath);
      input.on('error', reject);
      input.on('data', function(chunk) { hash.update(chunk); });
      input.on('end', function() { resolve(hash.digest('hex')); });
    });
  }

  function runHelper(helperPath, args, detached) {
    var childProcess = nodeRequire('child_process');
    var commandArgs = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', helperPath].concat(args);
    if (detached) {
      return new Promise(function(resolve, reject) {
        var child = childProcess.spawn('powershell.exe', commandArgs, { detached: true, stdio: 'ignore', windowsHide: true });
        child.once('error', reject);
        child.once('spawn', function() {
          child.unref();
          resolve({ code: 0, output: '' });
        });
      });
    }
    return new Promise(function(resolve, reject) {
      var child = childProcess.spawn('powershell.exe', commandArgs, { windowsHide: true });
      var output = '';
      var errorOutput = '';
      child.stdout.on('data', function(chunk) { output += chunk.toString(); });
      child.stderr.on('data', function(chunk) { errorOutput += chunk.toString(); });
      child.on('error', reject);
      child.on('close', function(code) {
        if (code !== 0) return reject(new Error(errorOutput.trim() || output.trim() || 'The update helper failed.'));
        resolve({ code: code, output: output });
      });
    });
  }

  function copyFile(source, destination) {
    var fs = nodeRequire('fs');
    var path = nodeRequire('path');
    mkdirp(path.dirname(destination));
    fs.writeFileSync(destination, fs.readFileSync(source));
  }

  function removeTree(target) {
    var fs = nodeRequire('fs');
    if (!fs.existsSync(target)) return;
    var path = nodeRequire('path');
    var stat = fs.lstatSync(target);
    if (!stat.isDirectory() || stat.isSymbolicLink()) return fs.unlinkSync(target);
    var entries = fs.readdirSync(target);
    for (var i = 0; i < entries.length; i++) removeTree(path.join(target, entries[i]));
    fs.rmdirSync(target);
  }

  function assertWritable(target) {
    var fs = nodeRequire('fs');
    var path = nodeRequire('path');
    var probe = path.join(target, '.procedia-update-write-test-' + Date.now());
    fs.writeFileSync(probe, 'ok', 'utf8');
    fs.unlinkSync(probe);
    var parentProbe = path.join(path.dirname(target), '.procedia-update-write-test-' + Date.now());
    fs.writeFileSync(parentProbe, 'ok', 'utf8');
    fs.unlinkSync(parentProbe);
  }

  function appendLog(filePath, message) {
    var fs = nodeRequire('fs');
    var path = nodeRequire('path');
    mkdirp(path.dirname(filePath));
    try {
      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 1024 * 1024) fs.renameSync(filePath, filePath + '.previous');
    } catch (ignore) {}
    fs.appendFileSync(filePath, new Date().toISOString() + ' ' + message + '\n', 'utf8');
  }

  return {
    nodeRequire: nodeRequire,
    ensureTrustedUrl: ensureTrustedUrl,
    getJson: getJson,
    readJson: readJson,
    writeJsonAtomic: writeJsonAtomic,
    download: download,
    sha256: sha256,
    runHelper: runHelper,
    copyFile: copyFile,
    removeTree: removeTree,
    mkdirp: mkdirp,
    assertWritable: assertWritable,
    appendLog: appendLog
  };
})();
