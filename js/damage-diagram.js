// ============================================================
// damage-diagram.js — Hasar şeması (v11: readonly opsiyonu)
// ============================================================

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

const NEXT_STATUS = { null: 'L', 'L': 'B', 'B': 'D', 'D': null };

const PART_PATHS = {
  on_tampon: 'M 140 30 Q 150 18 200 18 Q 250 18 260 30 L 268 52 L 132 52 Z',
  motor_kaputu: 'M 130 58 L 270 58 Q 280 80 280 130 L 120 130 Q 120 80 130 58 Z',
  tavan: 'M 145 170 L 255 170 L 255 360 L 145 360 Z',
  bagaj_kapagi: 'M 120 400 L 280 400 Q 280 450 270 472 L 130 472 Q 120 450 120 400 Z',
  arka_tampon: 'M 132 478 L 268 478 L 260 500 Q 250 512 200 512 Q 150 512 140 500 Z',
  sag_on_camurluk: 'M 285 75 Q 320 60 350 80 L 360 130 L 285 130 Z',
  sag_on_kapi: 'M 285 135 L 345 135 L 345 255 L 285 255 Z',
  sag_arka_kapi: 'M 285 260 L 345 260 L 345 380 L 285 380 Z',
  sag_arka_camurluk: 'M 285 385 L 360 385 L 350 435 Q 320 455 285 440 Z',
  sol_on_camurluk: 'M 50 80 Q 80 60 115 75 L 115 130 L 40 130 Z',
  sol_on_kapi: 'M 55 135 L 115 135 L 115 255 L 55 255 Z',
  sol_arka_kapi: 'M 55 260 L 115 260 L 115 380 L 55 380 Z',
  sol_arka_camurluk: 'M 40 385 L 115 385 L 115 440 Q 80 455 50 435 Z'
};

const PART_CENTERS = {
  on_tampon:          { x: 200, y: 38 },
  motor_kaputu:       { x: 200, y: 94 },
  tavan:              { x: 200, y: 265 },
  bagaj_kapagi:       { x: 200, y: 436 },
  arka_tampon:        { x: 200, y: 495 },
  sag_on_camurluk:    { x: 320, y: 100 },
  sag_on_kapi:        { x: 315, y: 225 },
  sag_arka_kapi:      { x: 315, y: 350 },
  sag_arka_camurluk:  { x: 320, y: 410 },
  sol_on_camurluk:    { x: 80, y: 100 },
  sol_on_kapi:        { x: 85, y: 225 },
  sol_arka_kapi:      { x: 85, y: 350 },
  sol_arka_camurluk:  { x: 80, y: 410 }
};

/**
 * Hasar şeması komponenti
 * options:
 *   container, initialData, onChange
 *   readonly: true ise sadece görüntüleme (tıklanmaz)
 */
export function createDamageDiagram({ container, initialData = {}, onChange = () => {}, readonly = false }) {
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
    if (readonly) return;
    setStatus(partId, NEXT_STATUS[getStatus(partId)]);
  }

  function resetAll() {
    if (readonly) return;
    if (Object.keys(state).length === 0) return;
    if (!confirm('Tüm parçaları orijinal yapmak istediğine emin misin?')) return;
    state = {};
    render();
    onChange({ ...state });
  }

  const rootClass = readonly ? 'damage-diagram damage-readonly' : 'damage-diagram';

  container.innerHTML = `
    <div class="${rootClass}">
      <div class="damage-legend">
        <div class="legend-item"><span class="legend-swatch orj"></span>Orijinal</div>
        <div class="legend-item"><span class="legend-swatch local"></span>Lokal Boyalı</div>
        <div class="legend-item"><span class="legend-swatch painted"></span>Boyalı</div>
        <div class="legend-item"><span class="legend-swatch changed"></span>Değişen</div>
      </div>

      <div class="damage-svg-wrapper">
        <svg class="damage-svg" viewBox="0 0 400 560" xmlns="http://www.w3.org/2000/svg">
          <g class="wheels" pointer-events="none">
            <circle cx="22" cy="100" r="20" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="1.5"/>
            <circle cx="22" cy="100" r="8" fill="#2d2d2d"/>
            <circle cx="22" cy="410" r="20" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="1.5"/>
            <circle cx="22" cy="410" r="8" fill="#2d2d2d"/>
            <circle cx="378" cy="100" r="20" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="1.5"/>
            <circle cx="378" cy="100" r="8" fill="#2d2d2d"/>
            <circle cx="378" cy="410" r="20" fill="#1a1a1a" stroke="#3a3a3a" stroke-width="1.5"/>
            <circle cx="378" cy="410" r="8" fill="#2d2d2d"/>
          </g>

          ${PARTS.map(p => `
            <path class="damage-part" data-part="${p.id}" d="${PART_PATHS[p.id]}"
                  fill="#3a3a3a" stroke="#666" stroke-width="0.8"
                  ${readonly ? 'style="cursor:default;pointer-events:none"' : ''} />
          `).join('')}

          <g class="decorations" pointer-events="none">
            <path d="M 145 138 L 255 138 L 248 165 L 152 165 Z" fill="#0a0a0a" opacity="0.85"/>
            <rect x="165" y="195" width="70" height="140" rx="8" fill="#0a0a0a" opacity="0.4"/>
            <path d="M 152 365 L 248 365 L 255 392 L 145 392 Z" fill="#0a0a0a" opacity="0.85"/>
            <rect x="295" y="148" width="42" height="48" rx="3" fill="#0a0a0a" opacity="0.7"/>
            <rect x="295" y="273" width="42" height="48" rx="3" fill="#0a0a0a" opacity="0.7"/>
            <rect x="63" y="148" width="42" height="48" rx="3" fill="#0a0a0a" opacity="0.7"/>
            <rect x="63" y="273" width="42" height="48" rx="3" fill="#0a0a0a" opacity="0.7"/>
            <rect x="305" y="208" width="22" height="3" rx="1.5" fill="#999" opacity="0.5"/>
            <rect x="305" y="333" width="22" height="3" rx="1.5" fill="#999" opacity="0.5"/>
            <rect x="73" y="208" width="22" height="3" rx="1.5" fill="#999" opacity="0.5"/>
            <rect x="73" y="333" width="22" height="3" rx="1.5" fill="#999" opacity="0.5"/>
            <ellipse cx="158" cy="35" rx="12" ry="5" fill="#ffd766" opacity="0.55"/>
            <ellipse cx="242" cy="35" rx="12" ry="5" fill="#ffd766" opacity="0.55"/>
            <ellipse cx="158" cy="495" rx="12" ry="4" fill="#ff5566" opacity="0.55"/>
            <ellipse cx="242" cy="495" rx="12" ry="4" fill="#ff5566" opacity="0.55"/>
            <rect x="190" y="42" width="20" height="6" rx="2" fill="#1a1a1a" opacity="0.5"/>
            <circle cx="135" cy="100" r="3" fill="#666" opacity="0.6"/>
            <circle cx="265" cy="100" r="3" fill="#666" opacity="0.6"/>
          </g>

          ${PARTS.map(p => `
            <text class="damage-letter" data-part="${p.id}"
                  x="${PART_CENTERS[p.id].x}" y="${PART_CENTERS[p.id].y + 5}"
                  text-anchor="middle" fill="#fff" font-size="15" font-weight="900"
                  pointer-events="none"></text>
          `).join('')}
        </svg>
      </div>

      ${readonly ? '' : `
        <div class="damage-toolbar">
          <button type="button" class="damage-reset-btn">↺ Tümünü sıfırla</button>
        </div>
      `}

      <div class="damage-parts-list">
        ${PARTS.map(p => `
          ${readonly ? '<div' : '<button type="button"'} class="damage-row" data-part="${p.id}">
            <span class="part-name">${p.label}</span>
            <span class="part-status">
              <span class="status-pill" data-status-pill="${p.id}">Orijinal</span>
            </span>
          ${readonly ? '</div>' : '</button>'}
        `).join('')}
      </div>
    </div>
  `;

  function render() {
    PARTS.forEach(p => {
      const status = getStatus(p.id);
      const pathEl = container.querySelector(`.damage-part[data-part="${p.id}"]`);
      const letterEl = container.querySelector(`.damage-letter[data-part="${p.id}"]`);
      const rowEl = container.querySelector(`.damage-row[data-part="${p.id}"]`);
      const pillEl = container.querySelector(`[data-status-pill="${p.id}"]`);

      let fill = '#3a3a3a', letter = '', pillClass = 'status-pill', pillText = 'Orijinal', rowClass = 'damage-row';

      if (status === 'L') {
        fill = '#ff8c42'; letter = 'L';
        pillClass = 'status-pill local'; pillText = 'Lokal'; rowClass = 'damage-row local';
      } else if (status === 'B') {
        fill = '#3498db'; letter = 'B';
        pillClass = 'status-pill painted'; pillText = 'Boyalı'; rowClass = 'damage-row painted';
      } else if (status === 'D') {
        fill = '#ff4757'; letter = 'D';
        pillClass = 'status-pill changed'; pillText = 'Değişen'; rowClass = 'damage-row changed';
      }

      pathEl.setAttribute('fill', fill);
      letterEl.textContent = letter;
      pillEl.className = pillClass;
      pillEl.textContent = pillText;
      rowEl.className = rowClass;
    });
  }

  if (!readonly) {
    container.querySelectorAll('.damage-part').forEach(el => {
      el.addEventListener('click', () => cycleStatus(el.dataset.part));
    });
    container.querySelectorAll('.damage-row').forEach(el => {
      el.addEventListener('click', () => cycleStatus(el.dataset.part));
    });
    const resetBtn = container.querySelector('.damage-reset-btn');
    if (resetBtn) resetBtn.addEventListener('click', resetAll);
  }

  render();

  return {
    getData: () => ({ ...state }),
    setData: (data) => { state = { ...data }; render(); },
    reset: () => { state = {}; render(); }
  };
}
