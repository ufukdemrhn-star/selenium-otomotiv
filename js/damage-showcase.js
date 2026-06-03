// ============================================================
// damage-showcase.js v22 — Raster bazlı ekspertiz görseli
// Background: 1.jpg (lacivert + 5 açı araç)
// Overlay: 13 PNG (her parça için, şeffaf zemin)
// L/B/D durumlarına göre CSS mask + background-color
// ============================================================

const PART_IDS = [
  'kaput', 'tavan', 'on-tampon', 'arka-tampon', 'bagaj',
  'sol-on-camurluk', 'sag-on-camurluk', 'sol-arka-camurluk', 'sag-arka-camurluk',
  'sol-on-kapi', 'sag-on-kapi', 'sol-arka-kapi', 'sag-arka-kapi'
];

const PART_LABELS = {
  'kaput': 'Motor Kaputu',
  'tavan': 'Tavan',
  'on-tampon': 'Ön Tampon',
  'arka-tampon': 'Arka Tampon',
  'bagaj': 'Bagaj Kapağı',
  'sol-on-camurluk': 'Sol Ön Çamurluk',
  'sag-on-camurluk': 'Sağ Ön Çamurluk',
  'sol-arka-camurluk': 'Sol Arka Çamurluk',
  'sag-arka-camurluk': 'Sağ Arka Çamurluk',
  'sol-on-kapi': 'Sol Ön Kapı',
  'sag-on-kapi': 'Sağ Ön Kapı',
  'sol-arka-kapi': 'Sol Arka Kapı',
  'sag-arka-kapi': 'Sağ Arka Kapı'
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
 * Vehicle damage object'inden ekspertiz görseli HTML'i üretir.
 * @param {Object} damage  Örn: { kaput: 'L', 'on-tampon': 'B', ... }
 * @returns {string} HTML
 */
export function createDamageShowcase(damage = {}) {
  // Tüm parçaların durumunu normalleştir
  const states = {};
  PART_IDS.forEach(id => {
    const v = damage[id];
    states[id] = (v === 'L' || v === 'B' || v === 'D') ? v : null;
  });

  // Hasarlı parça listesi
  const damagedParts = PART_IDS.filter(id => states[id]);
  const damagedCount = damagedParts.length;

  // Counter (kaç L, kaç B, kaç D)
  const countL = damagedParts.filter(id => states[id] === 'L').length;
  const countB = damagedParts.filter(id => states[id] === 'B').length;
  const countD = damagedParts.filter(id => states[id] === 'D').length;

  return `
    <div class="dmg-raster-wrap">
      <div class="dmg-raster-stage">
        <img class="dmg-raster-bg" src="images/showcase/background.jpg?v=22" alt="Araç Ekspertiz">
        ${damagedParts.map(partId => `
          <div
            class="dmg-overlay dmg-overlay-${states[partId]}"
            data-part="${escapeHtml(partId)}"
            data-state="${escapeHtml(states[partId])}"
            style="--mask-img: url('images/showcase/${escapeHtml(partId)}.png?v=22')"
            title="${escapeHtml(PART_LABELS[partId])} — ${escapeHtml(STATE_LABELS[states[partId]])}"
          ></div>
        `).join('')}
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

// Geriye dönük uyumluluk için alias
export const renderDamageShowcase = createDamageShowcase;

console.log('🎨 damage-showcase.js v22 yüklendi (raster bazlı)');
