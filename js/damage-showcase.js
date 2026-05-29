// ============================================================
// damage-showcase.js — 5-açılı ekspertiz görseli (Faz 6.C)
// Üstten (orta) + 4 köşede çapraz açılar
// Sadece görüntüleme amaçlı — düzenleme yok
// ============================================================

import { PARTS } from "./damage-diagram.js?v=13";

// Hangi parça, hangi açılarda görünür?
// Açılar: top, frontLeft, frontRight, rearLeft, rearRight
const PART_VISIBILITY = {
  on_tampon:          ['top', 'frontLeft', 'frontRight'],
  motor_kaputu:       ['top', 'frontLeft', 'frontRight'],
  tavan:              ['top'],
  bagaj_kapagi:       ['top', 'rearLeft', 'rearRight'],
  arka_tampon:        ['top', 'rearLeft', 'rearRight'],
  sag_on_camurluk:    ['top', 'frontRight'],
  sag_on_kapi:        ['top', 'frontRight', 'rearRight'],
  sag_arka_kapi:      ['top', 'rearRight'],
  sag_arka_camurluk:  ['top', 'rearRight'],
  sol_on_camurluk:    ['top', 'frontLeft'],
  sol_on_kapi:        ['top', 'frontLeft', 'rearLeft'],
  sol_arka_kapi:      ['top', 'rearLeft'],
  sol_arka_camurluk:  ['top', 'rearLeft']
};

// Renk eşleştirmesi
function getColor(status) {
  if (status === 'L') return '#ff8c42';
  if (status === 'B') return '#3498db';
  if (status === 'D') return '#ff4757';
  return '#3a3a3a'; // orijinal — varsayılan gri
}

// ============================================================
// ÜSTTEN GÖRÜNÜM (showcase için kompakt versiyon)
// 200x280 viewBox
// ============================================================
const TOP_PATHS = {
  on_tampon:        'M 70 12 Q 78 5 100 5 Q 122 5 130 12 L 134 22 L 66 22 Z',
  motor_kaputu:     'M 64 25 L 136 25 Q 142 38 142 65 L 58 65 Q 58 38 64 25 Z',
  tavan:            'M 72 85 L 128 85 L 128 180 L 72 180 Z',
  bagaj_kapagi:     'M 58 200 L 142 200 Q 142 226 136 238 L 64 238 Q 58 226 58 200 Z',
  arka_tampon:      'M 66 241 L 134 241 L 130 252 Q 122 258 100 258 Q 78 258 70 252 Z',
  sag_on_camurluk:  'M 144 33 Q 162 25 178 35 L 184 65 L 144 65 Z',
  sag_on_kapi:      'M 144 67 L 172 67 L 172 127 L 144 127 Z',
  sag_arka_kapi:    'M 144 130 L 172 130 L 172 190 L 144 190 Z',
  sag_arka_camurluk:'M 144 192 L 184 192 L 178 222 Q 162 232 144 224 Z',
  sol_on_camurluk:  'M 22 35 Q 38 25 56 33 L 56 65 L 16 65 Z',
  sol_on_kapi:      'M 28 67 L 56 67 L 56 127 L 28 127 Z',
  sol_arka_kapi:    'M 28 130 L 56 130 L 56 190 L 28 190 Z',
  sol_arka_camurluk:'M 16 192 L 56 192 L 56 224 Q 38 232 22 222 Z'
};

function renderTopView(damage) {
  return `
    <svg class="showcase-view top-view" viewBox="0 0 200 280" xmlns="http://www.w3.org/2000/svg">
      <!-- Tekerlekler -->
      <circle cx="10" cy="55" r="12" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="1"/>
      <circle cx="190" cy="55" r="12" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="1"/>
      <circle cx="10" cy="205" r="12" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="1"/>
      <circle cx="190" cy="205" r="12" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="1"/>

      <!-- Parçalar -->
      ${PARTS.map(p => `
        <path d="${TOP_PATHS[p.id]}"
              fill="${getColor(damage[p.id])}"
              stroke="#666" stroke-width="0.5"/>
      `).join('')}

      <!-- Camlar (dekoratif, üstte) -->
      <path d="M 72 72 L 128 72 L 124 84 L 76 84 Z" fill="#0a0a0a" opacity="0.85"/>
      <rect x="82" y="98" width="36" height="70" rx="4" fill="#0a0a0a" opacity="0.4"/>
      <path d="M 76 184 L 124 184 L 128 196 L 72 196 Z" fill="#0a0a0a" opacity="0.85"/>
      <rect x="148" y="75" width="22" height="24" rx="2" fill="#0a0a0a" opacity="0.65"/>
      <rect x="148" y="138" width="22" height="24" rx="2" fill="#0a0a0a" opacity="0.65"/>
      <rect x="30" y="75" width="22" height="24" rx="2" fill="#0a0a0a" opacity="0.65"/>
      <rect x="30" y="138" width="22" height="24" rx="2" fill="#0a0a0a" opacity="0.65"/>

      <!-- Farlar -->
      <ellipse cx="79" cy="13" rx="7" ry="3" fill="#ffd766" opacity="0.6"/>
      <ellipse cx="121" cy="13" rx="7" ry="3" fill="#ffd766" opacity="0.6"/>
      <!-- Stop -->
      <ellipse cx="79" cy="249" rx="7" ry="2.5" fill="#ff5566" opacity="0.6"/>
      <ellipse cx="121" cy="249" rx="7" ry="2.5" fill="#ff5566" opacity="0.6"/>
    </svg>
  `;
}

// ============================================================
// ÇAPRAZ AÇILAR — 3/4 perspektif görünüm
// Her açı için: hangi parçalar görünür, hangi yönde
// 180x140 viewBox
// ============================================================

// SAĞ ÖN ÇAPRAZ (önden ve sağdan)
const FRONT_RIGHT_PATHS = {
  // Ön yüz: tampon, kaput
  on_tampon:        'M 35 100 L 95 105 L 100 118 L 30 115 Z',
  motor_kaputu:     'M 35 75 L 100 80 L 100 102 L 35 99 Z',
  // Yan: sağ ön çamurluk, sağ ön kapı
  sag_on_camurluk:  'M 100 78 Q 130 75 150 82 L 155 102 L 100 102 Z',
  sag_on_kapi:      'M 100 104 L 155 104 L 155 118 L 100 118 Z'
};

// SOL ÖN ÇAPRAZ (aynalı)
const FRONT_LEFT_PATHS = {
  on_tampon:        'M 85 105 L 145 100 L 150 115 L 80 118 Z',
  motor_kaputu:     'M 80 80 L 145 75 L 145 99 L 80 102 Z',
  sol_on_camurluk:  'M 30 82 Q 50 75 80 78 L 80 102 L 25 102 Z',
  sol_on_kapi:      'M 25 104 L 80 104 L 80 118 L 25 118 Z'
};

// SAĞ ARKA ÇAPRAZ (arkadan ve sağdan)
const REAR_RIGHT_PATHS = {
  arka_tampon:      'M 35 100 L 95 105 L 100 118 L 30 115 Z',
  bagaj_kapagi:     'M 35 75 L 100 80 L 100 102 L 35 99 Z',
  sag_arka_camurluk:'M 100 78 Q 130 75 150 82 L 155 102 L 100 102 Z',
  sag_arka_kapi:    'M 100 104 L 155 104 L 155 118 L 100 118 Z'
};

// SOL ARKA ÇAPRAZ (aynalı)
const REAR_LEFT_PATHS = {
  arka_tampon:      'M 85 105 L 145 100 L 150 115 L 80 118 Z',
  bagaj_kapagi:     'M 80 80 L 145 75 L 145 99 L 80 102 Z',
  sol_arka_camurluk:'M 30 82 Q 50 75 80 78 L 80 102 L 25 102 Z',
  sol_arka_kapi:    'M 25 104 L 80 104 L 80 118 L 25 118 Z'
};

function renderCornerView(viewKey, paths, damage) {
  // Tekerlek pozisyonları açıya göre
  let wheelsHtml = '';
  if (viewKey === 'frontRight') {
    wheelsHtml = `
      <ellipse cx="120" cy="125" rx="14" ry="6" fill="#1a1a1a" stroke="#333" stroke-width="0.8"/>
      <ellipse cx="120" cy="125" rx="6" ry="3" fill="#2d2d2d"/>
    `;
  } else if (viewKey === 'frontLeft') {
    wheelsHtml = `
      <ellipse cx="60" cy="125" rx="14" ry="6" fill="#1a1a1a" stroke="#333" stroke-width="0.8"/>
      <ellipse cx="60" cy="125" rx="6" ry="3" fill="#2d2d2d"/>
    `;
  } else if (viewKey === 'rearRight') {
    wheelsHtml = `
      <ellipse cx="120" cy="125" rx="14" ry="6" fill="#1a1a1a" stroke="#333" stroke-width="0.8"/>
      <ellipse cx="120" cy="125" rx="6" ry="3" fill="#2d2d2d"/>
    `;
  } else if (viewKey === 'rearLeft') {
    wheelsHtml = `
      <ellipse cx="60" cy="125" rx="14" ry="6" fill="#1a1a1a" stroke="#333" stroke-width="0.8"/>
      <ellipse cx="60" cy="125" rx="6" ry="3" fill="#2d2d2d"/>
    `;
  }

  // Camlar — açıya göre
  let glassHtml = '';
  if (viewKey === 'frontRight') {
    glassHtml = `
      <path d="M 38 78 L 100 82 L 100 95 L 40 91 Z" fill="#0a0a0a" opacity="0.75"/>
      <path d="M 102 85 Q 125 82 145 86 L 145 96 L 102 95 Z" fill="#0a0a0a" opacity="0.65"/>
    `;
  } else if (viewKey === 'frontLeft') {
    glassHtml = `
      <path d="M 82 82 L 144 78 L 142 91 L 82 95 Z" fill="#0a0a0a" opacity="0.75"/>
      <path d="M 38 86 Q 58 82 80 85 L 80 95 L 38 96 Z" fill="#0a0a0a" opacity="0.65"/>
    `;
  } else if (viewKey === 'rearRight') {
    glassHtml = `
      <path d="M 38 78 L 100 82 L 100 95 L 40 91 Z" fill="#0a0a0a" opacity="0.75"/>
      <path d="M 102 85 Q 125 82 145 86 L 145 96 L 102 95 Z" fill="#0a0a0a" opacity="0.65"/>
    `;
  } else if (viewKey === 'rearLeft') {
    glassHtml = `
      <path d="M 82 82 L 144 78 L 142 91 L 82 95 Z" fill="#0a0a0a" opacity="0.75"/>
      <path d="M 38 86 Q 58 82 80 85 L 80 95 L 38 96 Z" fill="#0a0a0a" opacity="0.65"/>
    `;
  }

  // Far/stop
  let lightsHtml = '';
  if (viewKey === 'frontLeft' || viewKey === 'frontRight') {
    if (viewKey === 'frontRight') {
      lightsHtml = `<ellipse cx="55" cy="93" rx="10" ry="3" fill="#ffd766" opacity="0.6"/>`;
    } else {
      lightsHtml = `<ellipse cx="125" cy="93" rx="10" ry="3" fill="#ffd766" opacity="0.6"/>`;
    }
  } else {
    if (viewKey === 'rearRight') {
      lightsHtml = `<ellipse cx="55" cy="93" rx="10" ry="3" fill="#ff5566" opacity="0.6"/>`;
    } else {
      lightsHtml = `<ellipse cx="125" cy="93" rx="10" ry="3" fill="#ff5566" opacity="0.6"/>`;
    }
  }

  return `
    <svg class="showcase-view corner-view" viewBox="0 0 180 140" xmlns="http://www.w3.org/2000/svg">
      ${wheelsHtml}
      ${Object.entries(paths).map(([partId, path]) => `
        <path d="${path}"
              fill="${getColor(damage[partId])}"
              stroke="#555" stroke-width="0.5"/>
      `).join('')}
      ${glassHtml}
      ${lightsHtml}
    </svg>
  `;
}

// ============================================================
// ANA RENDER
// ============================================================
export function createDamageShowcase({ container, damage = {} }) {
  // Hasar var mı?
  const hasDamage = Object.keys(damage).length > 0;

  // İstatistik say
  let stats = { L: 0, B: 0, D: 0 };
  Object.values(damage).forEach(s => {
    if (stats[s] !== undefined) stats[s]++;
  });

  container.innerHTML = `
    <div class="damage-showcase">
      <div class="showcase-grid">
        <!-- Sol ön köşe -->
        <div class="showcase-cell front-left">
          <div class="cell-label">Sol Ön</div>
          ${renderCornerView('frontLeft', FRONT_LEFT_PATHS, damage)}
        </div>

        <!-- Üstten görünüm (ortada, geniş) -->
        <div class="showcase-cell top">
          <div class="cell-label">Üstten</div>
          ${renderTopView(damage)}
        </div>

        <!-- Sağ ön köşe -->
        <div class="showcase-cell front-right">
          <div class="cell-label">Sağ Ön</div>
          ${renderCornerView('frontRight', FRONT_RIGHT_PATHS, damage)}
        </div>

        <!-- Sol arka köşe -->
        <div class="showcase-cell rear-left">
          <div class="cell-label">Sol Arka</div>
          ${renderCornerView('rearLeft', REAR_LEFT_PATHS, damage)}
        </div>

        <!-- (Üstten görünüm grid'de orta-sağ alt boş kalmasın diye) -->

        <!-- Sağ arka köşe -->
        <div class="showcase-cell rear-right">
          <div class="cell-label">Sağ Arka</div>
          ${renderCornerView('rearRight', REAR_RIGHT_PATHS, damage)}
        </div>
      </div>

      <!-- İstatistik -->
      ${hasDamage ? `
        <div class="showcase-stats">
          ${stats.L > 0 ? `<div class="stat-chip local"><span class="dot"></span>${stats.L} Lokal</div>` : ''}
          ${stats.B > 0 ? `<div class="stat-chip painted"><span class="dot"></span>${stats.B} Boyalı</div>` : ''}
          ${stats.D > 0 ? `<div class="stat-chip changed"><span class="dot"></span>${stats.D} Değişen</div>` : ''}
        </div>
      ` : `
        <div class="showcase-clean">
          <span class="clean-check">✓</span> Tüm parçalar orijinal
        </div>
      `}
    </div>
  `;

  return {
    update: (newDamage) => {
      // Re-render
      createDamageShowcase({ container, damage: newDamage });
    }
  };
}
