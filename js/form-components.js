// ============================================================
// form-components.js — Form alan komponentleri
// YearWheel, Segmented, Dropdown, NumberInput, RadioGroup, Toggle
// ============================================================

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// ============================================================
// YEAR WHEEL — iOS tarzı kaydırılır yıl seçici
// ============================================================
const WHEEL_ITEM_HEIGHT = 44;
const WHEEL_VISIBLE_COUNT = 5; // ortada 1 seçili, üst-alt 2'şer

export function createYearWheel({ container, min = 1980, max = 2026, value = 2010, onChange = () => {} }) {
  const years = [];
  for (let y = max; y >= min; y--) years.push(y);

  const spacers = Math.floor(WHEEL_VISIBLE_COUNT / 2);

  container.innerHTML = `
    <div class="wheel-picker">
      <div class="wheel-mask">
        <div class="wheel-list">
          ${Array(spacers).fill('<div class="wheel-spacer"></div>').join('')}
          ${years.map(y => `<div class="wheel-item" data-value="${y}">${y}</div>`).join('')}
          ${Array(spacers).fill('<div class="wheel-spacer"></div>').join('')}
        </div>
      </div>
      <div class="wheel-highlight"></div>
    </div>
  `;

  const mask = container.querySelector('.wheel-mask');
  const items = container.querySelectorAll('.wheel-item');
  let currentValue = value;
  let scrollTimeout = null;

  function findActiveItem() {
    const scrollTop = mask.scrollTop;
    const centerOffset = scrollTop + (WHEEL_ITEM_HEIGHT * spacers);
    const index = Math.round(centerOffset / WHEEL_ITEM_HEIGHT) - spacers;
    return items[index] || null;
  }

  function updateActive() {
    const active = findActiveItem();
    items.forEach(i => i.classList.remove('active'));
    if (active) {
      active.classList.add('active');
      const v = parseInt(active.dataset.value);
      if (v !== currentValue) {
        currentValue = v;
        onChange(v);
      }
    }
  }

  function snapToValue(v, smooth = true) {
    const target = container.querySelector(`.wheel-item[data-value="${v}"]`);
    if (!target) return;
    const idx = Array.from(items).indexOf(target);
    const targetScrollTop = idx * WHEEL_ITEM_HEIGHT;
    if (smooth) {
      mask.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    } else {
      mask.scrollTop = targetScrollTop;
    }
    setTimeout(updateActive, smooth ? 300 : 0);
  }

  mask.addEventListener('scroll', () => {
    updateActive();
    // Scroll bitince snap
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      const active = findActiveItem();
      if (active) snapToValue(parseInt(active.dataset.value), true);
    }, 100);
  });

  // Item'a tıklayınca seç
  items.forEach(item => {
    item.addEventListener('click', () => {
      snapToValue(parseInt(item.dataset.value), true);
    });
  });

  // İlk konumlama
  requestAnimationFrame(() => snapToValue(value, false));

  return {
    getValue: () => currentValue,
    setValue: (v) => snapToValue(v, true)
  };
}

// ============================================================
// SEGMENTED CONTROL (Otomatik / Manuel gibi)
// ============================================================
export function createSegmented({ container, options, value = null, onChange = () => {} }) {
  container.innerHTML = `
    <div class="segmented">
      ${options.map(opt => `
        <button type="button" class="seg-btn ${opt.value === value ? 'active' : ''}" data-value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</button>
      `).join('')}
    </div>
  `;

  let currentValue = value;
  const btns = container.querySelectorAll('.seg-btn');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentValue = btn.dataset.value;
      btns.forEach(b => b.classList.toggle('active', b === btn));
      onChange(currentValue);
    });
  });

  return {
    getValue: () => currentValue,
    setValue: (v) => {
      currentValue = v;
      btns.forEach(b => b.classList.toggle('active', b.dataset.value === v));
    }
  };
}

// ============================================================
// DROPDOWN (custom, açılır liste)
// ============================================================
export function createDropdown({ container, options, value = null, placeholder = 'Seçiniz...', onChange = () => {} }) {
  let currentValue = value;
  const id = 'dd-' + Math.random().toString(36).slice(2, 8);

  function selectedLabel() {
    if (!currentValue) return placeholder;
    const opt = options.find(o => o.value === currentValue);
    return opt ? opt.label : placeholder;
  }

  container.innerHTML = `
    <div class="dropdown" id="${id}">
      <button type="button" class="dropdown-button ${currentValue ? 'has-value' : ''}">
        <span class="dropdown-value">${escapeHtml(selectedLabel())}</span>
        <svg class="dropdown-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      <div class="dropdown-menu" hidden>
        ${options.map(opt => `
          <button type="button" class="dropdown-option ${opt.value === currentValue ? 'selected' : ''}" data-value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</button>
        `).join('')}
      </div>
    </div>
  `;

  const root = container.querySelector('.dropdown');
  const button = root.querySelector('.dropdown-button');
  const valueEl = root.querySelector('.dropdown-value');
  const menu = root.querySelector('.dropdown-menu');
  const optionButtons = root.querySelectorAll('.dropdown-option');

  function open() {
    menu.hidden = false;
    root.classList.add('open');
    // Diğer açık dropdown'ları kapat
    document.querySelectorAll('.dropdown.open').forEach(d => {
      if (d !== root) {
        d.classList.remove('open');
        d.querySelector('.dropdown-menu').hidden = true;
      }
    });
  }

  function close() {
    menu.hidden = true;
    root.classList.remove('open');
  }

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    if (root.classList.contains('open')) close();
    else open();
  });

  optionButtons.forEach(opt => {
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      currentValue = opt.dataset.value;
      valueEl.textContent = opt.textContent;
      button.classList.add('has-value');
      optionButtons.forEach(o => o.classList.toggle('selected', o === opt));
      close();
      onChange(currentValue);
    });
  });

  // Dış tıklama ile kapat
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) close();
  });

  return {
    getValue: () => currentValue,
    setValue: (v) => {
      currentValue = v;
      const opt = options.find(o => o.value === v);
      valueEl.textContent = opt ? opt.label : placeholder;
      button.classList.toggle('has-value', !!currentValue);
      optionButtons.forEach(o => o.classList.toggle('selected', o.dataset.value === v));
    }
  };
}

// ============================================================
// NUMBER INPUT (formatlanmış, suffix destekli)
// ============================================================
export function createNumberInput({ container, placeholder = '0', suffix = '', value = null, onChange = () => {}, maxLength = 12 }) {
  container.innerHTML = `
    <div class="number-input-wrapper">
      <input type="text" inputmode="numeric" class="number-input" placeholder="${escapeHtml(placeholder)}" autocomplete="off">
      ${suffix ? `<span class="number-suffix">${escapeHtml(suffix)}</span>` : ''}
    </div>
  `;

  const input = container.querySelector('.number-input');
  let rawValue = value; // sadece sayı

  function format(num) {
    if (num === null || num === '' || isNaN(num)) return '';
    return Number(num).toLocaleString('tr-TR');
  }

  function parse(str) {
    const cleaned = String(str).replace(/[^\d]/g, '');
    if (!cleaned) return null;
    return parseInt(cleaned, 10);
  }

  if (rawValue !== null) input.value = format(rawValue);

  input.addEventListener('input', () => {
    const parsed = parse(input.value);
    if (parsed !== null && String(parsed).length > maxLength) {
      // Çok büyük rakam, eskiye dön
      input.value = format(rawValue);
      return;
    }
    rawValue = parsed;
    // Formatla, ama cursor pozisyonunu mümkün olduğunca koru
    const oldLen = input.value.length;
    const cursor = input.selectionStart;
    const newVal = format(parsed);
    input.value = newVal;
    const diff = newVal.length - oldLen;
    try {
      input.setSelectionRange(cursor + diff, cursor + diff);
    } catch(e) { /* ignore */ }
    onChange(rawValue);
  });

  return {
    getValue: () => rawValue,
    setValue: (v) => {
      rawValue = v;
      input.value = format(v);
    }
  };
}

// ============================================================
// RADIO GROUP (2, 3, 4, 5 kapı gibi)
// ============================================================
export function createRadioGroup({ container, options, value = null, onChange = () => {} }) {
  container.innerHTML = `
    <div class="radio-group">
      ${options.map(opt => `
        <button type="button" class="radio-btn ${opt.value === value ? 'active' : ''}" data-value="${escapeHtml(String(opt.value))}">${escapeHtml(opt.label)}</button>
      `).join('')}
    </div>
  `;

  let currentValue = value;
  const btns = container.querySelectorAll('.radio-btn');

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      currentValue = btn.dataset.value;
      btns.forEach(b => b.classList.toggle('active', b === btn));
      onChange(currentValue);
    });
  });

  return {
    getValue: () => currentValue,
    setValue: (v) => {
      currentValue = String(v);
      btns.forEach(b => b.classList.toggle('active', b.dataset.value === currentValue));
    }
  };
}

// ============================================================
// TOGGLE (Evet / Hayır)
// ============================================================
export function createToggle({ container, value = false, onChange = () => {}, labels = { on: 'Evet', off: 'Hayır' } }) {
  container.innerHTML = `
    <div class="toggle-switch ${value ? 'on' : 'off'}">
      <button type="button" class="toggle-track">
        <span class="toggle-label off-label">${escapeHtml(labels.off)}</span>
        <span class="toggle-label on-label">${escapeHtml(labels.on)}</span>
        <span class="toggle-knob"></span>
      </button>
    </div>
  `;

  let currentValue = value;
  const root = container.querySelector('.toggle-switch');
  const btn = root.querySelector('.toggle-track');

  btn.addEventListener('click', () => {
    currentValue = !currentValue;
    root.classList.toggle('on', currentValue);
    root.classList.toggle('off', !currentValue);
    onChange(currentValue);
  });

  return {
    getValue: () => currentValue,
    setValue: (v) => {
      currentValue = !!v;
      root.classList.toggle('on', currentValue);
      root.classList.toggle('off', !currentValue);
    }
  };
}
