(function() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'data/scripts.json', false);
  xhr.overrideMimeType('application/json');
  xhr.send();
  if (xhr.status === 0 || xhr.status === 200) {
    var scripts = JSON.parse(xhr.responseText);
    for (var i = 0; i < scripts.length; i++) {
      document.write('<script src="' + scripts[i] + '"><\/script>');
    }
  }
})();
