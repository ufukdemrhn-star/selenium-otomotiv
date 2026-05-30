// ============================================================
// sell-modal.js — Satış modal'ı (Faz 7.C)
// Satış fiyatı + tarih girdisi
// ============================================================
import { sellVehicle } from "./vehicles-db.js?v=15";
import { showAlert, showToast } from "./ui-dialogs.js?v=15";

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function formatPrice(v) {
  if (v === null || v === undefined) return '0 ₺';
  return Number(v).toLocaleString('tr-TR') + ' ₺';
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Satış modal'ını aç
 * @param {Object} vehicle - mevcut araç (alış+masraf hesabı için)
 * @returns {Promise<boolean>} - true: satıldı, false: iptal
 */
export function openSellModal(vehicle) {
  return new Promise((resolve) => {
    // Önceki varsa kaldır
    const old = document.getElementById('sell-modal');
    if (old) old.remove();

    const purchasePrice = vehicle.purchasePrice || 0;
    const totalExpenses = (vehicle.expenses || []).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalCost = purchasePrice + totalExpenses;

    const title = [vehicle.brand, vehicle.model, vehicle.series].filter(Boolean).join(' ');

    const modal = document.createElement('div');
    modal.id = 'sell-modal';
    modal.className = 'expense-modal sell-modal';
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content">
        <header class="modal-header">
          <h2 class="modal-title">💰 Araç Sat</h2>
          <button type="button" class="modal-close" id="sell-modal-close" aria-label="Kapat">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </header>

        <div class="modal-body">
          <div class="sell-vehicle-summary">
            <div class="sell-vehicle-title">${escapeHtml(title)}</div>
            <div class="sell-cost-breakdown">
              <div class="sell-cost-row">
                <span>Alış</span>
                <span>${escapeHtml(formatPrice(purchasePrice))}</span>
              </div>
              <div class="sell-cost-row">
                <span>Masraf</span>
                <span>${escapeHtml(formatPrice(totalExpenses))}</span>
              </div>
              <div class="sell-cost-row sell-total">
                <span>Toplam Maliyet</span>
                <span>${escapeHtml(formatPrice(totalCost))}</span>
              </div>
            </div>
          </div>

          <div class="modal-field">
            <label class="modal-label">SATIŞ FİYATI</label>
            <div class="modal-input-wrap">
              <input type="number" class="modal-input" id="sell-price"
                     placeholder="0" inputmode="numeric" min="0" step="1">
              <span class="modal-input-suffix">₺</span>
            </div>
          </div>

          <div class="modal-field">
            <label class="modal-label">SATIŞ TARİHİ</label>
            <input type="date" class="modal-input" id="sell-date" value="${todayISO()}">
          </div>

          <!-- Canlı kar/zarar göstergesi -->
          <div class="sell-profit-preview" id="sell-profit-preview" hidden>
            <div class="profit-label">TAHMİNİ KÂR/ZARAR</div>
            <div class="profit-value" id="profit-value">—</div>
          </div>

          <div class="modal-error" id="sell-error" hidden></div>
        </div>

        <footer class="modal-footer">
          <button type="button" class="modal-btn secondary" id="sell-modal-cancel">İptal</button>
          <button type="button" class="modal-btn primary" id="sell-modal-save">
            <span class="btn-text">Satışı Tamamla</span>
          </button>
        </footer>
      </div>
    `;

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('open'));

    const closeBtn = modal.querySelector('#sell-modal-close');
    const cancelBtn = modal.querySelector('#sell-modal-cancel');
    const saveBtn = modal.querySelector('#sell-modal-save');
    const backdrop = modal.querySelector('.modal-backdrop');
    const priceInput = modal.querySelector('#sell-price');
    const dateInput = modal.querySelector('#sell-date');
    const errorEl = modal.querySelector('#sell-error');
    const profitPreview = modal.querySelector('#sell-profit-preview');
    const profitValue = modal.querySelector('#profit-value');

    function close(result) {
      modal.classList.remove('open');
      setTimeout(() => modal.remove(), 250);
      document.removeEventListener('keydown', handleKey);
      resolve(result);
    }

    function handleKey(e) {
      if (e.key === 'Escape') close(false);
    }

    closeBtn.addEventListener('click', () => close(false));
    cancelBtn.addEventListener('click', () => close(false));
    backdrop.addEventListener('click', () => close(false));
    document.addEventListener('keydown', handleKey);

    // Canlı kar/zarar hesaplama
    priceInput.addEventListener('input', () => {
      const sale = Number(priceInput.value);
      if (!isNaN(sale) && sale > 0) {
        const profit = sale - totalCost;
        profitPreview.hidden = false;
        profitValue.textContent = formatPrice(profit);
        profitValue.className = 'profit-value ' + (profit >= 0 ? 'positive' : 'negative');
      } else {
        profitPreview.hidden = true;
      }
    });

    setTimeout(() => priceInput.focus(), 100);

    saveBtn.addEventListener('click', async () => {
      errorEl.hidden = true;

      const salePrice = priceInput.value.trim();
      const soldAt = dateInput.value;

      if (!salePrice) {
        errorEl.textContent = 'Satış fiyatı boş olamaz';
        errorEl.hidden = false;
        return;
      }
      const sp = Number(salePrice);
      if (isNaN(sp) || sp <= 0) {
        errorEl.textContent = 'Satış fiyatı geçerli bir sayı olmalı (0\'dan büyük)';
        errorEl.hidden = false;
        return;
      }
      if (!soldAt) {
        errorEl.textContent = 'Satış tarihi seçmelisin';
        errorEl.hidden = false;
        return;
      }

      saveBtn.disabled = true;
      saveBtn.querySelector('.btn-text').textContent = 'Satılıyor...';

      try {
        await sellVehicle(vehicle.id, { salePrice: sp, soldAt });
        close(true);
        showToast('💰 Araç satıldı');
      } catch (err) {
        console.error(err);
        errorEl.textContent = 'Satış kaydedilemedi: ' + err.message;
        errorEl.hidden = false;
        saveBtn.disabled = false;
        saveBtn.querySelector('.btn-text').textContent = 'Satışı Tamamla';
      }
    });

    // Enter ile kaydet
    priceInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveBtn.click();
    });
  });
}

console.log('💰 sell-modal.js v15 yüklendi (Faz 7.C)');
