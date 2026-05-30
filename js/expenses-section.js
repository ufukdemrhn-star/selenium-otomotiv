// ============================================================
// expenses-section.js — Masraf yönetim komponenti (Faz 7.B)
// Liste + Ekleme modal + Silme
// ============================================================
import { addExpense, removeExpense } from "./vehicles-db.js?v=15";
import { showConfirm, showAlert } from "./ui-dialogs.js?v=15";

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function formatPrice(v) {
  if (v === null || v === undefined) return '0 ₺';
  return Number(v).toLocaleString('tr-TR') + ' ₺';
}

function formatDateDisplay(isoDate) {
  if (!isoDate) return '—';
  // YYYY-MM-DD formatından DD.MM.YYYY'ye
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
}

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Masraflar bölümünü render et ve event'leri bağla
 * options:
 *   container - render edilecek DOM element
 *   vehicleId - araç id'si
 *   expenses - mevcut masraflar array'i (vehicle doc'tan)
 *   readonly - true ise sadece görüntüleme (Faz 7.C'de satılmış araç için)
 */
export function renderExpensesSection({ container, vehicleId, expenses = [], readonly = false }) {
  // Tarihe göre sırala (yeniden eskiye)
  const sorted = [...expenses].sort((a, b) => {
    return (b.date || '').localeCompare(a.date || '');
  });

  const total = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const totalStr = formatPrice(total);

  container.innerHTML = `
    <div class="expenses-section">
      <div class="expenses-header">
        <h2 class="detail-section-title" style="margin: 0;">
          Masraflar
          ${expenses.length > 0 ? `<span class="expenses-count-badge">${expenses.length}</span>` : ''}
        </h2>
        ${!readonly ? `
          <button type="button" class="expenses-add-btn" id="expenses-add-btn">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Masraf Ekle</span>
          </button>
        ` : ''}
      </div>

      ${expenses.length === 0 ? `
        <div class="expenses-empty">
          <p>Henüz masraf eklenmemiş</p>
          ${!readonly ? '<p class="empty-sub">Lastik, bakım, hasar onarımı vb. masrafları buraya ekleyebilirsin</p>' : ''}
        </div>
      ` : `
        <div class="expenses-list">
          ${sorted.map(exp => `
            <div class="expense-row" data-expense-id="${escapeHtml(exp.id)}">
              <div class="expense-main">
                <div class="expense-date">${escapeHtml(formatDateDisplay(exp.date))}</div>
                ${exp.description ? `<div class="expense-desc">${escapeHtml(exp.description)}</div>` : ''}
              </div>
              <div class="expense-amount-block">
                <div class="expense-amount">${escapeHtml(formatPrice(exp.amount))}</div>
                ${!readonly ? `
                  <button type="button" class="expense-delete-btn" data-expense-id="${escapeHtml(exp.id)}" aria-label="Sil">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
          <div class="expense-total-row">
            <span class="total-label">Toplam</span>
            <span class="total-value">${escapeHtml(totalStr)}</span>
          </div>
        </div>
      `}
    </div>
  `;

  // "Masraf Ekle" butonu
  if (!readonly) {
    const addBtn = document.getElementById('expenses-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openExpenseModal(vehicleId));
    }

    // Sil butonları
    container.querySelectorAll('.expense-delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const expId = btn.dataset.expenseId;
        const expense = expenses.find(x => x.id === expId);
        if (!expense) return;

        const ok = await showConfirm({
          title: 'Masrafı Sil',
          message: `Bu masrafı silmek istediğine emin misin?\n\n${formatDateDisplay(expense.date)} — ${formatPrice(expense.amount)}${expense.description ? '\n' + expense.description : ''}`,
          confirmText: 'Sil',
          cancelText: 'İptal',
          danger: true
        });
        if (!ok) return;

        try {
          await removeExpense(vehicleId, expense);
          // Detay sayfası real-time listener ile kendini yenileyecek
        } catch (err) {
          showAlert({ title: 'Hata', message: 'Masraf silinemedi: ' + err.message, danger: true });
          console.error(err);
        }
      });
    });
  }
}

// ============================================================
// MASRAF EKLEME MODAL
// ============================================================
function openExpenseModal(vehicleId) {
  // Önceki modal varsa kaldır
  const old = document.getElementById('expense-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'expense-modal';
  modal.className = 'expense-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <header class="modal-header">
        <h2 class="modal-title">Masraf Ekle</h2>
        <button type="button" class="modal-close" id="expense-modal-close" aria-label="Kapat">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </header>

      <div class="modal-body">
        <div class="modal-field">
          <label class="modal-label">TARİH</label>
          <input type="date" class="modal-input" id="expense-date" value="${todayISO()}">
        </div>

        <div class="modal-field">
          <label class="modal-label">AÇIKLAMA <span class="optional-tag">opsiyonel</span></label>
          <input type="text" class="modal-input" id="expense-description"
                 placeholder="Örn. Lastik değişimi, ekspertiz, yağ bakımı..."
                 maxlength="120">
        </div>

        <div class="modal-field">
          <label class="modal-label">TUTAR</label>
          <div class="modal-input-wrap">
            <input type="number" class="modal-input" id="expense-amount"
                   placeholder="0" inputmode="numeric" min="0" step="1">
            <span class="modal-input-suffix">₺</span>
          </div>
        </div>

        <div class="modal-error" id="expense-error" hidden></div>
      </div>

      <footer class="modal-footer">
        <button type="button" class="modal-btn secondary" id="expense-modal-cancel">İptal</button>
        <button type="button" class="modal-btn primary" id="expense-modal-save">
          <span class="btn-text">Ekle</span>
        </button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);

  // Animasyon için
  requestAnimationFrame(() => modal.classList.add('open'));

  const closeBtn = modal.querySelector('#expense-modal-close');
  const cancelBtn = modal.querySelector('#expense-modal-cancel');
  const saveBtn = modal.querySelector('#expense-modal-save');
  const backdrop = modal.querySelector('.modal-backdrop');
  const amountInput = modal.querySelector('#expense-amount');
  const dateInput = modal.querySelector('#expense-date');
  const descInput = modal.querySelector('#expense-description');
  const errorEl = modal.querySelector('#expense-error');

  function close() {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 250);
    document.removeEventListener('keydown', handleKey);
  }

  function handleKey(e) {
    if (e.key === 'Escape') close();
  }

  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', handleKey);

  // Tutar input'una focus
  setTimeout(() => amountInput.focus(), 100);

  saveBtn.addEventListener('click', async () => {
    errorEl.hidden = true;

    const date = dateInput.value;
    const description = descInput.value.trim();
    const amountRaw = amountInput.value.trim();

    if (!date) {
      errorEl.textContent = 'Tarih seçmelisin';
      errorEl.hidden = false;
      return;
    }
    if (!amountRaw) {
      errorEl.textContent = 'Tutar boş olamaz';
      errorEl.hidden = false;
      return;
    }
    const amount = Number(amountRaw);
    if (isNaN(amount) || amount <= 0) {
      errorEl.textContent = 'Tutar geçerli bir sayı olmalı (0\'dan büyük)';
      errorEl.hidden = false;
      return;
    }

    saveBtn.disabled = true;
    saveBtn.querySelector('.btn-text').textContent = 'Ekleniyor...';

    try {
      await addExpense(vehicleId, { date, description, amount });
      close();
      // Detay sayfası real-time listener ile kendini yenileyecek
    } catch (err) {
      console.error(err);
      errorEl.textContent = 'Masraf eklenemedi: ' + err.message;
      errorEl.hidden = false;
      saveBtn.disabled = false;
      saveBtn.querySelector('.btn-text').textContent = 'Ekle';
    }
  });

  // Enter ile kaydet
  amountInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveBtn.click();
  });
}

console.log('💸 expenses-section.js v15 yüklendi (Faz 7.B)');
