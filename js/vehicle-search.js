// ============================================================
// vehicle-search.js — Aranabilir liste komponenti (autocomplete)
// ============================================================

/**
 * HTML escape (XSS koruması için)
 */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/**
 * Eşleşen kısmı <mark> ile vurgula
 */
function highlightMatch(text, query) {
  if (!query || !query.trim()) return escapeHtml(text);
  const q = query.trim();
  const lowerText = text.toLocaleLowerCase('tr');
  const lowerQ = q.toLocaleLowerCase('tr');
  const idx = lowerText.indexOf(lowerQ);
  if (idx === -1) return escapeHtml(text);
  return escapeHtml(text.slice(0, idx)) +
         '<mark class="hl">' + escapeHtml(text.slice(idx, idx + q.length)) + '</mark>' +
         escapeHtml(text.slice(idx + q.length));
}

/**
 * Sıralama skoru:
 *  - Tam eşleşme: 100
 *  - Baş harf eşleşmesi: 50
 *  - İçinde geçiyor: 10
 *  - Yok: 0
 */
function rankItems(items, query) {
  const q = (query || '').toLocaleLowerCase('tr').trim();
  if (!q) {
    // Boş query — alfabetik tüm liste
    return [...items].sort((a, b) =>
      a.toLocaleLowerCase('tr').localeCompare(b.toLocaleLowerCase('tr'), 'tr')
    );
  }

  return items
    .map(item => {
      const name = item.toLocaleLowerCase('tr');
      let score = 0;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 50;
      else if (name.includes(q)) score = 10;
      return { item, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      // Eşit skorda alfabetik
      return a.item.toLocaleLowerCase('tr').localeCompare(b.item.toLocaleLowerCase('tr'), 'tr');
    })
    .map(x => x.item);
}

/**
 * Aranabilir liste oluştur
 *
 * options:
 *   container    - Render edilecek element
 *   items        - Aranacak öğeler (string[])
 *   placeholder  - Input placeholder
 *   onSelect     - (item) => void, seçildiğinde çağrılır
 *   onAddNew     - (newName) => void, yeni öğe eklenmesi istendiğinde
 *   addNewLabel  - "+ Yeni marka ekle" gibi etiket
 *   autoFocus    - true ise input'a otomatik fokus
 */
export function createSearchableList(options) {
  const {
    container,
    items: initialItems,
    placeholder = 'Ara...',
    onSelect,
    onAddNew,
    addNewLabel = '+ Yeni ekle',
    autoFocus = false
  } = options;

  let items = [...initialItems];

  container.innerHTML = `
    <div class="search-wrapper">
      <svg class="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="text" class="search-input" placeholder="${escapeHtml(placeholder)}" autocomplete="off" autocapitalize="none" spellcheck="false">
      <button type="button" class="search-clear" hidden aria-label="Temizle">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
    <div class="search-results"></div>
    ${onAddNew ? `<button type="button" class="add-new-btn" hidden></button>` : ''}
  `;

  const input = container.querySelector('.search-input');
  const clearBtn = container.querySelector('.search-clear');
  const results = container.querySelector('.search-results');
  const addNewBtn = container.querySelector('.add-new-btn');

  function render() {
    const query = input.value;
    const matched = rankItems(items, query);
    clearBtn.hidden = !query;

    if (matched.length === 0) {
      if (query.trim()) {
        results.innerHTML = `<div class="search-empty">"${escapeHtml(query.trim())}" için sonuç yok</div>`;
        if (addNewBtn) {
          addNewBtn.hidden = false;
          addNewBtn.textContent = `+ "${query.trim()}" ekle`;
        }
      } else {
        results.innerHTML = `<div class="search-empty">Liste boş</div>`;
        if (addNewBtn) addNewBtn.hidden = true;
      }
      return;
    }

    if (addNewBtn) addNewBtn.hidden = true;

    // En fazla 50 sonuç göster
    const limited = matched.slice(0, 50);
    results.innerHTML = limited
      .map(item => `<button type="button" class="search-result" data-value="${escapeHtml(item)}">${highlightMatch(item, query)}</button>`)
      .join('');

    if (matched.length > 50) {
      results.insertAdjacentHTML('beforeend',
        `<div class="search-empty">+${matched.length - 50} sonuç daha — daha spesifik ara</div>`);
    }

    results.querySelectorAll('.search-result').forEach(btn => {
      btn.addEventListener('click', () => {
        onSelect && onSelect(btn.dataset.value);
      });
    });
  }

  // Olay dinleyicileri
  input.addEventListener('input', render);

  clearBtn.addEventListener('click', () => {
    input.value = '';
    render();
    input.focus();
  });

  if (addNewBtn && onAddNew) {
    addNewBtn.addEventListener('click', () => {
      const newName = input.value.trim();
      if (newName) onAddNew(newName);
    });
  }

  // İlk render
  render();

  if (autoFocus) {
    setTimeout(() => input.focus(), 50);
  }

  // Public API
  return {
    focus: () => input.focus(),
    setItems: (newItems) => {
      items = [...newItems];
      render();
    },
    clear: () => {
      input.value = '';
      render();
    },
    destroy: () => {
      container.innerHTML = '';
    }
  };
}
