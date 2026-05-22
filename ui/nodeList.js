// ui/nodeList.js
// DEPENDS ON: (none — reads DOM only)
// MUST LOAD BEFORE: index.js

var nodeList = (function() {

  function _onSearch(query) {
    var normalized = query.trim().toLowerCase();
    var items = document.querySelectorAll('.palette-item');
    var i;

    for (i = 0; i < items.length; i++) {
      var item  = items[i];
      var label = item.textContent.trim().toLowerCase();
      if (normalized === '' || label.indexOf(normalized) !== -1) {
        item.classList.remove('hidden');
      } else {
        item.classList.add('hidden');
      }
    }

    var categories = document.querySelectorAll('.palette-category');
    for (i = 0; i < categories.length; i++) {
      var cat      = categories[i];
      var catItems = cat.querySelectorAll('.palette-item');
      var visible  = 0;
      for (var j = 0; j < catItems.length; j++) {
        if (!catItems[j].classList.contains('hidden')) visible++;
      }
      if (visible === 0) {
        cat.classList.add('hidden');
      } else {
        cat.classList.remove('hidden');
      }
    }
  }

  function _clear(searchInput, clearBtn) {
    searchInput.value = '';
    clearBtn.classList.remove('visible');
    _onSearch('');
    searchInput.blur();
  }

  function init() {
    var searchInput = document.querySelector('#palette-search input');
    var clearBtn    = document.querySelector('.palette-search-clear');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
      var hasValue = e.target.value.length > 0;
      if (clearBtn) {
        if (hasValue) {
          clearBtn.classList.add('visible');
        } else {
          clearBtn.classList.remove('visible');
        }
      }
      _onSearch(e.target.value);
    });

    searchInput.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        _clear(searchInput, clearBtn);
        e.stopPropagation(); // prevent keyboard.js from also handling Escape
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener('click', function() {
        _clear(searchInput, clearBtn);
      });
    }
  }

  return { init: init };

})();
