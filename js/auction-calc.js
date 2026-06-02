// ============================================================
// auction-calc.js — İhale Hesaplayıcı (Faz 11)
// Minimal hesap makinesi: Piyasa, Komisyon, Kâr → Maks Teklif
// ============================================================

let state = {
  market: '',
  commission: '',
  profit: ''
};

let currentContainer = null;

function formatPrice(v) {
  if (v === null || v === undefined || isNaN(v)) return '0 ₺';
  return Math.round(v).toLocaleString('tr-TR') + ' ₺';
}

function formatThousands(v) {
  if (!v) return '';
  const num = parseInt(String(v).replace(/\D/g, ''));
  if (isNaN(num)) return '';
  return num.toLocaleString('tr-TR');
}

function parseNumber(str) {
  if (!str) return 0;
  return parseFloat(String(str).replace(/[^\d,.-]/g, '').replace(',', '.'));
}

function compute() {
  const market = parseNumber(state.market);
  const commission = parseFloat(state.commission) / 100 || 0;
  const profit = parseFloat(state.profit) / 100 || 0;

  if (market <= 0) return null;

  // Yaklaşım B (Ahmet'in mantığı):
  // 1. Piyasaya göre hedef satış var (= piyasa)
  // 2. Kâr çıkar: aracın net maliyet hedefi
  // 3. İhale komisyonunu çıkar: ihalede maks ne verebilirim
  const afterProfit = market * (1 - profit);
  const maxBid = afterProfit * (1 - commission);

  const profitAmount = market * profit;
  const commissionAmount = afterProfit * commission;

  return { market, maxBid, profitAmount, commissionAmount };
}

function render() {
  if (!currentContainer) return;

  const calc = compute();

  currentContainer.innerHTML = `
    <div class="ihale-card">
      <div class="ihale-header">
        <h2 class="ihale-title">İhale Hesaplayıcı</h2>
        <p class="ihale-subtitle">İhalede maksimum vereceğin teklifi hesapla</p>
      </div>

      <!-- PİYASA DEĞERİ -->
      <div class="ihale-section">
        <label class="ihale-label">PİYASA DEĞERİ</label>
        <div class="ihale-input-wrap big">
          <input
            type="text"
            inputmode="numeric"
            class="ihale-input ihale-input-big"
            id="ihale-market"
            placeholder="Örn. 600.000"
            value="${formatThousands(state.market)}"
            autocomplete="off"
          >
          <span class="ihale-suffix">₺</span>
        </div>
      </div>

      <!-- KOMİSYON -->
      <div class="ihale-section">
        <label class="ihale-label">İHALE KOMİSYONU</label>
        <div class="ihale-quick-buttons">
          ${[1, 2, 5, 10].map(v => `
            <button type="button" class="ihale-quick-btn ${String(state.commission) === String(v) ? 'active' : ''}" data-target="commission" data-value="${v}">%${v}</button>
          `).join('')}
        </div>
        <div class="ihale-input-wrap">
          <input
            type="number"
            inputmode="decimal"
            class="ihale-input"
            id="ihale-commission"
            placeholder="Manuel"
            min="0" max="100" step="0.5"
            value="${state.commission}"
          >
          <span class="ihale-suffix">%</span>
        </div>
      </div>

      <!-- KÂR MARJI -->
      <div class="ihale-section">
        <label class="ihale-label">KÂR MARJI</label>
        <div class="ihale-quick-buttons">
          ${[5, 10, 15, 20].map(v => `
            <button type="button" class="ihale-quick-btn ${String(state.profit) === String(v) ? 'active' : ''}" data-target="profit" data-value="${v}">%${v}</button>
          `).join('')}
        </div>
        <div class="ihale-input-wrap">
          <input
            type="number"
            inputmode="decimal"
            class="ihale-input"
            id="ihale-profit"
            placeholder="Manuel"
            min="0" max="100" step="0.5"
            value="${state.profit}"
          >
          <span class="ihale-suffix">%</span>
        </div>
      </div>

      <!-- SONUÇ -->
      <div class="ihale-result-wrap" id="ihale-result-wrap">
        ${renderResult(calc)}
      </div>

      <!-- TEMIZLE -->
      <button type="button" class="ihale-clear-btn" id="ihale-clear">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
        Temizle
      </button>
    </div>
  `;

  attachEvents();
}

function renderResult(calc) {
  if (!calc) {
    return `
      <div class="ihale-result ihale-result-empty">
        <p>Üstteki 3 alanı doldur, maksimum teklif burada belirsin</p>
      </div>
    `;
  }
  return `
    <div class="ihale-result">
      <div class="result-label">MAKSİMUM TEKLİFİN</div>
      <div class="result-value">${formatPrice(calc.maxBid)}</div>
      <div class="result-divider"></div>
      <div class="result-breakdown">
        <div class="breakdown-row">
          <span class="bd-label">Hedef satış (piyasa)</span>
          <span class="bd-value">${formatPrice(calc.market)}</span>
        </div>
        <div class="breakdown-row">
          <span class="bd-label">− Senin kârın</span>
          <span class="bd-value bd-negative">−${formatPrice(calc.profitAmount)}</span>
        </div>
        <div class="breakdown-row">
          <span class="bd-label">− İhale komisyonu</span>
          <span class="bd-value bd-negative">−${formatPrice(calc.commissionAmount)}</span>
        </div>
      </div>
    </div>
  `;
}

function updateResult() {
  const calc = compute();
  const wrap = document.getElementById('ihale-result-wrap');
  if (wrap) wrap.innerHTML = renderResult(calc);
}

function attachEvents() {
  // Piyasa - binlik ayırıcı ile formatla
  const marketInput = document.getElementById('ihale-market');
  if (marketInput) {
    marketInput.addEventListener('input', (e) => {
      const raw = e.target.value.replace(/\D/g, '');
      state.market = raw;
      const oldLen = e.target.value.length;
      const pos = e.target.selectionStart;
      e.target.value = formatThousands(raw);
      const newPos = pos + (e.target.value.length - oldLen);
      try { e.target.setSelectionRange(newPos, newPos); } catch (_) {}
      updateResult();
    });
  }

  const commissionInput = document.getElementById('ihale-commission');
  if (commissionInput) {
    commissionInput.addEventListener('input', (e) => {
      state.commission = e.target.value;
      updateActiveQuickButtons();
      updateResult();
    });
  }

  const profitInput = document.getElementById('ihale-profit');
  if (profitInput) {
    profitInput.addEventListener('input', (e) => {
      state.profit = e.target.value;
      updateActiveQuickButtons();
      updateResult();
    });
  }

  // Hızlı butonlar
  currentContainer.querySelectorAll('.ihale-quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.target;
      const value = btn.dataset.value;
      state[target] = value;
      const input = document.getElementById(`ihale-${target}`);
      if (input) input.value = value;
      currentContainer.querySelectorAll(`.ihale-quick-btn[data-target="${target}"]`).forEach(b => {
        b.classList.toggle('active', b.dataset.value === value);
      });
      updateResult();
    });
  });

  // Temizle
  const clearBtn = document.getElementById('ihale-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state = { market: '', commission: '', profit: '' };
      render();
    });
  }
}

function updateActiveQuickButtons() {
  ['commission', 'profit'].forEach(target => {
    currentContainer.querySelectorAll(`.ihale-quick-btn[data-target="${target}"]`).forEach(b => {
      b.classList.toggle('active', b.dataset.value === String(state[target]));
    });
  });
}

export function initAuctionCalc(container) {
  if (!container) return;
  currentContainer = container;
  render();
}

export function stopAuctionCalc() {
  currentContainer = null;
}

console.log('💰 auction-calc.js v21 yüklendi (Faz 11)');
