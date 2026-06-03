// ============================================================
// damage-showcase.js v22 — Raster bazlı ekspertiz görseli
// Background: background.jpg (lacivert + 5 açı araç)
// Overlay: 13 PNG (her parça için, şeffaf zemin)
// L/B/D durumlarına göre CSS mask + background-color
// ============================================================

// DB'deki parça ID'leri (underscore_separated)
const PART_IDS = [
  'motor_kaputu', 'tavan', 'on_tampon', 'arka_tampon', 'bagaj_kapagi',
  'sol_on_camurluk', 'sag_on_camurluk', 'sol_arka_camurluk', 'sag_arka_camurluk',
  'sol_on_kapi', 'sag_on_kapi', 'sol_arka_kapi', 'sag_arka_kapi'
];

// DB ID → PNG dosya adı
const PART_FILES = {
  'motor_kaputu': 'kaput.png',
  'tavan': 'tavan.png',
  'on_tampon': 'on-tampon.png',
  'arka_tampon': 'arka-tampon.png',
  'bagaj_kapagi': 'bagaj.png',
  'sol_on_camurluk': 'sol-on-camurluk.png',
  'sag_on_camurluk': 'sag-on-camurluk.png',
  'sol_arka_camurluk': 'sol-arka-camurluk.png',
  'sag_arka_camurluk': 'sag-arka-camurluk.png',
  'sol_on_kapi': 'sol-on-kapi.png',
  'sag_on_kapi': 'sag-on-kapi.png',
  'sol_arka_kapi': 'sol-arka-kapi.png',
  'sag_arka_kapi': 'sag-arka-kapi.png'
};

const PART_LABELS = {
  'motor_kaputu': 'Motor Kaputu',
  'tavan': 'Tavan',
  'on_tampon': 'Ön Tampon',
  'arka_tampon': 'Arka Tampon',
  'bagaj_kapagi': 'Bagaj Kapağı',
  'sol_on_camurluk': 'Sol Ön Çamurluk',
  'sag_on_camurluk': 'Sağ Ön Çamurluk',
  'sol_arka_camurluk': 'Sol Arka Çamurluk',
  'sag_arka_camurluk': 'Sağ Arka Çamurluk',
  'sol_on_kapi': 'Sol Ön Kapı',
  'sag_on_kapi': 'Sağ Ön Kapı',
  'sol_arka_kapi': 'Sol Arka Kapı',
  'sag_arka_kapi': 'Sağ Arka Kapı'
};

const STATE_LABELS = {
  'L': 'Lokal Boya',
  'B': 'Boyalı',
  'D': 'Değişen'
};

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

/**
 * Absolute URL üretir — CSS context'inden bağımsız çalışır.
 */
function imgUrl(filename) {
  return new URL('images/showcase/' + filename + '?v=22', document.baseURI).href;
}

function buildHTML(damage = {}) {
  const states = {};
  PART_IDS.forEach(id => {
    const v = damage[id];
    states[id] = (v === 'L' || v === 'B' || v === 'D') ? v : null;
  });

  const damagedParts = PART_IDS.filter(id => states[id]);
  const damagedCount = damagedParts.length;

  const countL = damagedParts.filter(id => states[id] === 'L').length;
  const countB = damagedParts.filter(id => states[id] === 'B').length;
  const countD = damagedParts.filter(id => states[id] === 'D').length;

  const bgUrl = imgUrl('background.jpg');

  return `
    <div class="dmg-raster-wrap">
      <div class="dmg-raster-stage">
        <img class="dmg-raster-bg" src="${bgUrl}" alt="Araç Ekspertiz">
        ${damagedParts.map(partId => {
          const fileUrl = imgUrl(PART_FILES[partId]);
          return `
            <div
              class="dmg-overlay dmg-overlay-${states[partId]}"
              data-part="${escapeHtml(partId)}"
              data-state="${escapeHtml(states[partId])}"
              style="--mask-img: url('${fileUrl}')"
              title="${escapeHtml(PART_LABELS[partId])} — ${escapeHtml(STATE_LABELS[states[partId]])}"
            ></div>
          `;
        }).join('')}
      </div>

      ${damagedCount > 0 ? `
        <div class="dmg-summary">
          <div class="dmg-summary-counts">
            ${countL > 0 ? `<span class="dmg-pill dmg-pill-L"><span class="dot"></span> ${countL} Lokal</span>` : ''}
            ${countB > 0 ? `<span class="dmg-pill dmg-pill-B"><span class="dot"></span> ${countB} Boyalı</span>` : ''}
            ${countD > 0 ? `<span class="dmg-pill dmg-pill-D"><span class="dot"></span> ${countD} Değişen</span>` : ''}
          </div>
          <div class="dmg-summary-list">
            ${damagedParts.map(partId => `
              <div class="dmg-list-row">
                <span class="dmg-list-dot dmg-list-dot-${states[partId]}"></span>
                <span class="dmg-list-name">${escapeHtml(PART_LABELS[partId])}</span>
                <span class="dmg-list-state dmg-list-state-${states[partId]}">${escapeHtml(STATE_LABELS[states[partId]])}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : `
        <div class="dmg-no-damage">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span>Tüm parçalar orijinal</span>
        </div>
      `}
    </div>
  `;
}

/**
 * Ekspertiz görselini container'a basar.
 * @param {Object} options
 * @param {HTMLElement} options.container - Hedef DOM element
 * @param {Object} options.damage - { motor_kaputu: 'L', on_tampon: 'B', ... }
 * @returns {Object} { update(newDamage), destroy() } API
 */
export function createDamageShowcase({ container, damage = {} } = {}) {
  if (!container) {
    console.warn('createDamageShowcase: container yok');
    return null;
  }

  container.innerHTML = buildHTML(damage);

  return {
    update(newDamage) {
      container.innerHTML = buildHTML(newDamage || {});
    },
    destroy() {
      container.innerHTML = '';
    }
  };
}

console.log('🎨 damage-showcase.js v22 yüklendi (raster bazlı, DB id mapping)');
