// ============================================================
// damage-diagram.js — Hasar şeması komponenti
// SVG araç şeması + parça listesi (senkronize)
// Her parça için durum: null (orjinal) | 'L' | 'B' | 'D'
// ============================================================

// 13 parça (ID, görünen ad, SVG path)
// SVG koordinat sistemi: 320x460 viewBox
// Düzen: üstten görünüm + sağ/sol yanda tekerlekler ile yan profil
export const PARTS = [
  { id: 'on_tampon',         label: 'Ön Tampon' },
  { id: 'motor_kaputu',      label: 'Motor Kaputu' },
  { id: 'tavan',             label: 'Tavan' },
  { id: 'sag_on_camurluk',   label: 'Sağ Ön Çamurluk' },
  { id: 'sag_on_kapi',       label: 'Sağ Ön Kapı' },
  { id: 'sag_arka_kapi',     label: 'Sağ Arka Kapı' },
  { id: 'sag_arka_camurluk', label: 'Sağ Arka Çamurluk' },
  { id: 'sol_on_camurluk',   label: 'Sol Ön Çamurluk' },
  { id: 'sol_on_kapi',       label: 'Sol Ön Kapı' },
  { id: 'sol_arka_kapi',     label: 'Sol Arka Kapı' },
  { id: 'sol_arka_camurluk', label: 'Sol Arka Çamurluk' },
  { id: 'bagaj_kapagi',      label: 'Bagaj Kapağı' },
  { id: 'arka_tampon',       label: 'Arka Tampon' }
];

// Sıralı döngü
const NEXT_STATUS = {
  null: 'L',
  'L':  'B',
  'B':  'D',
  'D':  null
};

const STATUS_LABELS = {
  'L': 'Lokal Boyalı',
  'B': 'Boyalı',
  'D': 'Değişen'
};

const STATUS_LETTERS = {
  'L': 'L',
  'B': 'B',
  'D': 'D'
};

// SVG part path'leri — üstten görünüm car schematic
// 320px geniş, 460px yüksek
const PART_PATHS = {
  // Ön tampon (üst)
  on_tampon: 'M 105 12 L 215 12 L 222 28 L 98 28 Z',
  // Motor kaputu
  motor_kaputu: 'M 100 36 L 220 36 L 222 95 L 98 95 Z',
  // Tavan (orta)
  tavan: 'M 110 145 L 210 145 L 210 245 L 110 245 Z',
  // Bagaj kapağı
  bagaj_kapagi: 'M 100 380 L 220 380 L 222 420 L 98 420 Z',
  // Arka tampon
  arka_tampon: 'M 105 432 L 215 432 L 222 448 L 98 448 Z',
  // Sağ ön çamurluk (üst sağ)
  sag_on_camurluk: 'M 224 36 L 268 50 L 268 95 L 224 95 Z',
  // Sağ ön kapı
  sag_on_kapi: 'M 224 102 L 268 102 L 268 200 L 224 200 Z',
  // Sağ arka kapı
  sag_arka_kapi: 'M 224 208 L 268 208 L 268 310 L 224 310 Z',
  // Sağ arka çamurluk
  sag_arka_camurluk: 'M 224 318 L 268 318 L 268 380 L 224 380 Z',
  // Sol ön çamurluk
  sol_on_camurluk: 'M 52 50 L 96 36 L 96 95 L 52 95 Z',
  // Sol ön kapı
  sol_on_kapi: 'M 52 102 L 96 102 L 96 200 L 52 200 Z',
  // Sol arka kapı
  sol_arka_kapi: 'M 52 208 L 96 208 L 96 310 L 52 310 Z',
  // Sol arka çamurluk
  sol_arka_camurluk: 'M 52 318 L 96 318 L 96 380 L 52 380 Z'
};

// Parçanın merkezi (etiket için)
const PART_CENTERS = {
  on_tampon:          { x: 160, y: 20 },
  motor_kaputu:       { x: 160, y: 65 },
  tavan:              { x: 160, y: 195 },
  bagaj_kapagi:       { x: 160, y: 400 },
  arka_tampon:        { x: 160, y: 440 },
  sag_on_camurluk:    { x: 246, y: 70 },
  sag_on_kapi:        { x: 246, y: 151 },
  sag_arka_kapi:      { x: 246, y: 259 },
  sag_arka_camurluk:  { x: 246, y: 349 },
  sol_on_camurluk:    { x: 74, y: 70 },
  sol_on_kapi:        { x: 74, y: 151 },
  sol_arka_kapi:      { x: 74, y: 259 },
  sol_arka_camurluk:  { x: 74, y: 349 }
};

/**
 * Hasar şeması komponenti oluştur
 * options:
 *   container - render edilecek element
 *   initialData - { [partId]: status, ... } başlangıç durumu
 *   onChange - (data) => void, her değişimde çağrılır
 */
export function createDamageDiagram({ container, initialData = {}, onChange = () => {} }) {
  let state = { ...initialData };

  function getStatus(partId) {
    return state[partId] || null;
  }

  function setStatus(partId, status) {
    if (status === null) delete state[partId];
    else state[partId] = status;
    render();
    onChange({ ...state });
  }

  function cycleStatus(partId) {
    const current = getStatus(partId);
    setStatus(partId, NEXT_STATUS[current]);
  }

  function resetAll() {
    if (Object.keys(state).length === 0) return;
    if (!confirm('Tüm parçaları orijinal yapmak istediğine emin misin?')) return;
    state = {};
    render();
    onChange({ ...state });
  }

  container.innerHTML = `
    <div class="damage-diagram">
      <div class="damage-legend">
        <div class="legend-item"><span class="legend-swatch orj"></span>Orijinal</div>
        <div class="legend-item"><span class="legend-swatch local"></span>Lokal Boyalı</div>
        <div class="legend-item"><span class="legend-swatch painted"></span>Boyalı</div>
        <div class="legend-item"><span class="legend-swatch changed"></span>Değişen</div>
      </div>

      <div class="damage-svg-wrapper">
        <svg class="damage-svg" viewBox="0 0 320 460" xmlns="http://www.w3.org/2000/svg">
          <!-- Araç ana gövdesi konturu -->
          <rect x="98" y="12" width="124" height="436" rx="40" fill="none" stroke="#444" stroke-width="0.5" opacity="0.3"/>

          <!-- Tekerlekler (dekoratif) -->
          <circle cx="74" cy="70" r="22" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
          <circle cx="246" cy="70" r="22" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
          <circle cx="74" cy="349" r="22" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
          <circle cx="246" cy="349" r="22" fill="#1a1a1a" stroke="#333" stroke-width="1"/>

          <!-- Cam alanları (dekoratif) -->
          <path d="M 110 100 L 210 100 L 215 140 L 105 140 Z" fill="#0d0d0d" opacity="0.6"/>
          <path d="M 110 380 L 210 380 L 215 340 L 105 340 Z" fill="#0d0d0d" opacity="0.6"/>
          <path d="M 110 250 L 210 250 L 210 335 L 110 335 Z" fill="#0d0d0d" opacity="0.3"/>

          <!-- Parçalar - dinamik -->
          ${PARTS.map(p => `
            <path
              class="damage-part"
              data-part="${p.id}"
              d="${PART_PATHS[p.id]}"
              fill="#2a2a2a"
              stroke="#555"
              stroke-width="0.5"
            />
          `).join('')}

          <!-- Parça etiketleri (durum harfleri) -->
          ${PARTS.map(p => `
            <text
              class="damage-letter"
              data-part="${p.id}"
              x="${PART_CENTERS[p.id].x}"
              y="${PART_CENTERS[p.id].y + 5}"
              text-anchor="middle"
              fill="#fff"
              font-size="14"
              font-weight="800"
              pointer-events="none"
            ></text>
          `).join('')}
        </svg>
      </div>

      <div class="damage-toolbar">
        <button type="button" class="damage-reset-btn">↺ Tümünü sıfırla</button>
      </div>

      <div class="damage-parts-list">
        ${PARTS.map(p => `
          <button type="button" class="damage-row" data-part="${p.id}">
            <span class="part-name">${p.label}</span>
            <span class="part-status">
              <span class="status-pill" data-status-pill="${p.id}">Orijinal</span>
            </span>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  // Parça yolu ve metni güncelle
  function render() {
    PARTS.forEach(p => {
      const status = getStatus(p.id);
      const pathEl = container.querySelector(`.damage-part[data-part="${p.id}"]`);
      const letterEl = container.querySelector(`.damage-letter[data-part="${p.id}"]`);
      const rowEl = container.querySelector(`.damage-row[data-part="${p.id}"]`);
      const pillEl = container.querySelector(`[data-status-pill="${p.id}"]`);

      // SVG renkleri
      let fill = '#2a2a2a'; // orijinal
      let textColor = '#fff';
      let letter = '';
      let pillClass = 'status-pill';
      let pillText = 'Orijinal';
      let rowClass = 'damage-row';

      if (status === 'L') {
        fill = '#ff8c42'; // turuncu
        letter = 'L';
        pillClass = 'status-pill local';
        pillText = 'Lokal';
        rowClass = 'damage-row local';
      } else if (status === 'B') {
        fill = '#3498db'; // mavi
        letter = 'B';
        pillClass = 'status-pill painted';
        pillText = 'Boyalı';
        rowClass = 'damage-row painted';
      } else if (status === 'D') {
        fill = '#ff4757'; // kırmızı
        letter = 'D';
        pillClass = 'status-pill changed';
        pillText = 'Değişen';
        rowClass = 'damage-row changed';
      }

      pathEl.setAttribute('fill', fill);
      letterEl.textContent = letter;
      pillEl.className = pillClass;
      pillEl.textContent = pillText;
      rowEl.className = rowClass;
    });
  }

  // Event listener: SVG parça tıklaması
  container.querySelectorAll('.damage-part').forEach(el => {
    el.addEventListener('click', () => {
      cycleStatus(el.dataset.part);
    });
  });

  // Event listener: Liste satırı tıklaması
  container.querySelectorAll('.damage-row').forEach(el => {
    el.addEventListener('click', () => {
      cycleStatus(el.dataset.part);
    });
  });

  // Sıfırla butonu
  container.querySelector('.damage-reset-btn').addEventListener('click', resetAll);

  // İlk render
  render();

  return {
    getData: () => ({ ...state }),
    setData: (data) => { state = { ...data }; render(); },
    reset: () => { state = {}; render(); }
  };
}
