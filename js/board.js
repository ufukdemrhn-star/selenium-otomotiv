// ============================================================
// board.js — Bizim Alanımız (Faz 9.B + 9.C)
// Tek not + gün sayacı, romantik tasarım
// ============================================================
import { db, auth } from "./firebase.js?v=15";
import {
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { showAlert, showToast } from "./ui-dialogs.js?v=15";
import { emailToUsername } from "./auth.js?v=15";

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function getCurrentUsername() {
  const user = auth.currentUser;
  return user?.email ? emailToUsername(user.email) : null;
}

// State
let unsubNote = null;
let unsubCouple = null;
let currentContainer = null;
let currentNote = null; // { text, author, updatedAt }
let coupleInfo = null;  // { startDate: "YYYY-MM-DD" }
let counterInterval = null;
let isEditing = false;

const MAX_LENGTH = 500;

function render() {
  if (!currentContainer) return;

  currentContainer.innerHTML = `
    <div class="bizim-alan">
      <!-- Not kartı -->
      <div id="ba-note-wrap" class="ba-note-wrap">
        ${renderNoteCard()}
      </div>

      <!-- Sayaç -->
      <div id="ba-counter-wrap" class="ba-counter-wrap">
        ${renderCounter()}
      </div>
    </div>
  `;

  attachEvents();
  startCounterTick();
}

function renderNoteCard() {
  if (isEditing) {
    const text = currentNote?.text || '';
    return `
      <div class="ba-note ba-note-edit">
        <div class="ba-note-edit-header">
          <span class="ba-note-edit-label">Notu Düzenle</span>
          <span class="ba-char-count"><span id="ba-edit-count">${text.length}</span> / ${MAX_LENGTH}</span>
        </div>
        <textarea
          class="ba-note-textarea"
          id="ba-note-text"
          maxlength="${MAX_LENGTH}"
          rows="6"
          placeholder="Kalbinden geçenleri yaz..."
        >${escapeHtml(text)}</textarea>
        <div class="ba-note-edit-actions">
          <button type="button" class="ba-btn ba-btn-secondary" id="ba-cancel">İptal</button>
          <button type="button" class="ba-btn ba-btn-primary" id="ba-save">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Kaydet
          </button>
        </div>
      </div>
    `;
  }

  // Görüntüleme modu
  if (!currentNote || !currentNote.text) {
    // Boş - kimse yazmamış
    return `
      <div class="ba-note ba-note-empty" id="ba-note-empty">
        <div class="ba-note-empty-icon">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </div>
        <p>Henüz bir not yok</p>
        <p class="ba-empty-sub">İlk notu sen yaz</p>
      </div>
    `;
  }

  const author = currentNote.author || 'Anonim';
  const myUsername = getCurrentUsername();
  const isMine = author === myUsername;
  const dateStr = currentNote.updatedAt ? formatDate(currentNote.updatedAt) : '';

  // Capitalize first letter
  const displayAuthor = author.charAt(0).toUpperCase() + author.slice(1);

  return `
    <div class="ba-note ba-note-view" id="ba-note-view">
      <div class="ba-note-header">
        <h3 class="ba-note-from">${escapeHtml(displayAuthor)}'dan Not</h3>
        <span class="ba-note-mini-heart">♥</span>
      </div>
      <div class="ba-note-text">${escapeHtml(currentNote.text).replace(/\n/g, '<br>')}</div>
      ${dateStr ? `<div class="ba-note-date">${escapeHtml(dateStr)}</div>` : ''}
      <button type="button" class="ba-note-edit-btn" id="ba-edit-trigger" title="${isMine ? 'Notunu düzenle' : 'Yeni not yaz (mevcut not silinir)'}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  `;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  let date;
  if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
  else if (timestamp.toDate) date = timestamp.toDate();
  else date = new Date(timestamp);

  const now = new Date();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'az önce';
  if (diffMin < 60) return `${diffMin} dakika önce`;
  if (diffHour < 24) return `${diffHour} saat önce`;
  if (diffDay < 7) return `${diffDay} gün önce`;
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function renderCounter() {
  if (!coupleInfo || !coupleInfo.startDate) {
    return `
      <div class="ba-counter-empty">
        <p>Birlikte geçen süremizi göstermek için bir başlangıç tarihi seç</p>
        <button type="button" class="ba-btn ba-btn-primary" id="ba-set-date">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          Tarih Seç
        </button>
      </div>
    `;
  }

  const diff = computeTimeDiff(coupleInfo.startDate);

  return `
    <div class="ba-counter-card">
      <div class="ba-counter-title">Birlikte Geçen Süremiz</div>
      <div class="ba-counter-grid">
        <div class="ba-counter-item">
          <div class="ba-counter-num">${diff.totalDays}</div>
          <div class="ba-counter-label">Gün</div>
        </div>
        <div class="ba-counter-item">
          <div class="ba-counter-num">${diff.years}</div>
          <div class="ba-counter-label">Yıl</div>
        </div>
        <div class="ba-counter-item">
          <div class="ba-counter-num">${diff.months}</div>
          <div class="ba-counter-label">Ay</div>
        </div>
        <div class="ba-counter-item">
          <div class="ba-counter-num">${diff.hours}</div>
          <div class="ba-counter-label">Saat</div>
        </div>
        <div class="ba-counter-item">
          <div class="ba-counter-num">${diff.minutes}</div>
          <div class="ba-counter-label">Dakika</div>
        </div>
      </div>
      <button type="button" class="ba-counter-edit-btn" id="ba-edit-date" title="Tarihi değiştir">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
      </button>
    </div>
  `;
}

function computeTimeDiff(startDateStr) {
  // startDateStr: "YYYY-MM-DD"
  const start = new Date(startDateStr + 'T00:00:00');
  const now = new Date();
  const diffMs = now - start;

  if (diffMs < 0) {
    return { totalDays: 0, years: 0, months: 0, hours: 0, minutes: 0 };
  }

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Years and months (göreceli)
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  if (now.getDate() < start.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Şu anki günün saatleri ve dakikaları
  const hours = now.getHours();
  const minutes = now.getMinutes();

  return { totalDays, years, months, hours, minutes };
}

function attachEvents() {
  // Düzenleme moduna geç
  const editTrigger = document.getElementById('ba-edit-trigger');
  if (editTrigger) {
    editTrigger.addEventListener('click', () => {
      isEditing = true;
      updateNoteCard();
    });
  }

  const emptyNote = document.getElementById('ba-note-empty');
  if (emptyNote) {
    emptyNote.addEventListener('click', () => {
      isEditing = true;
      updateNoteCard();
    });
  }

  // Düzenleme: iptal/kaydet
  const cancelBtn = document.getElementById('ba-cancel');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      isEditing = false;
      updateNoteCard();
    });
  }

  const saveBtn = document.getElementById('ba-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', handleSave);
  }

  const textarea = document.getElementById('ba-note-text');
  const countEl = document.getElementById('ba-edit-count');
  if (textarea && countEl) {
    textarea.addEventListener('input', () => {
      countEl.textContent = textarea.value.length;
    });
    // Focus + cursor sona
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }, 50);
  }

  // Tarih seç / düzenle
  const setDateBtn = document.getElementById('ba-set-date');
  if (setDateBtn) setDateBtn.addEventListener('click', openDateModal);

  const editDateBtn = document.getElementById('ba-edit-date');
  if (editDateBtn) editDateBtn.addEventListener('click', openDateModal);
}

function updateNoteCard() {
  const wrap = document.getElementById('ba-note-wrap');
  if (wrap) {
    wrap.innerHTML = renderNoteCard();
    attachEvents();
  }
}

function updateCounter() {
  const wrap = document.getElementById('ba-counter-wrap');
  if (wrap) {
    wrap.innerHTML = renderCounter();
    attachEvents();
  }
}

async function handleSave() {
  const textarea = document.getElementById('ba-note-text');
  if (!textarea) return;
  const text = textarea.value.trim();

  if (!text) {
    showAlert({ title: 'Boş Not', message: 'Lütfen birşeyler yaz.', danger: false });
    return;
  }

  const saveBtn = document.getElementById('ba-save');
  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>Kaydediliyor...</span>';
  }

  const username = getCurrentUsername();

  try {
    await setDoc(doc(db, 'board', 'single'), {
      text: text.substring(0, MAX_LENGTH),
      author: username,
      updatedAt: serverTimestamp()
    });

    isEditing = false;
    showToast('💌 Not kaydedildi');
    // Render listener tarafından yapılacak
  } catch (err) {
    console.error(err);
    showAlert({ title: 'Hata', message: 'Not kaydedilemedi: ' + err.message, danger: true });
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
        Kaydet
      `;
    }
  }
}

function openDateModal() {
  const currentVal = coupleInfo?.startDate || new Date().toISOString().split('T')[0];

  const modal = document.createElement('div');
  modal.className = 'expense-modal sell-modal';
  modal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <header class="modal-header">
        <h2 class="modal-title">💕 Başlangıç Tarihi</h2>
        <button type="button" class="modal-close" id="date-modal-close" aria-label="Kapat">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </header>

      <div class="modal-body">
        <div class="modal-field">
          <label class="modal-label">BİRLİKTELİK BAŞLANGICI</label>
          <input type="date" class="modal-input" id="date-modal-input" value="${currentVal}" max="${new Date().toISOString().split('T')[0]}">
        </div>
        <p style="font-size:0.82rem;color:var(--text-muted);line-height:1.5;margin-top:0.5rem;">
          Bu tarih iki kişi arasında paylaşılır. Değiştirirsen sayaç bu yeni tarihten itibaren sayar.
        </p>
      </div>

      <footer class="modal-footer">
        <button type="button" class="modal-btn secondary" id="date-modal-cancel">İptal</button>
        <button type="button" class="modal-btn primary" id="date-modal-save"><span class="btn-text">Kaydet</span></button>
      </footer>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('open'));

  const close = () => {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 250);
  };

  modal.querySelector('#date-modal-close').addEventListener('click', close);
  modal.querySelector('#date-modal-cancel').addEventListener('click', close);
  modal.querySelector('.modal-backdrop').addEventListener('click', close);

  modal.querySelector('#date-modal-save').addEventListener('click', async () => {
    const input = modal.querySelector('#date-modal-input');
    const val = input.value;
    if (!val) {
      showAlert({ title: 'Geçersiz', message: 'Bir tarih seç.', danger: true });
      return;
    }
    try {
      await setDoc(doc(db, 'couple', 'info'), {
        startDate: val,
        updatedAt: serverTimestamp()
      });
      close();
      showToast('💕 Tarih kaydedildi');
    } catch (err) {
      console.error(err);
      showAlert({ title: 'Hata', message: 'Tarih kaydedilemedi: ' + err.message, danger: true });
    }
  });
}

function startCounterTick() {
  // Önceki interval varsa temizle
  if (counterInterval) {
    clearInterval(counterInterval);
    counterInterval = null;
  }

  // Sadece tarih varsa tick'le
  if (!coupleInfo?.startDate) return;

  // Her dakika güncelle (saniye seviyesinde göstermiyoruz)
  counterInterval = setInterval(() => {
    if (!isEditing) updateCounter();
  }, 60000);
}

export function initBoard(container) {
  if (!container) return;
  currentContainer = container;

  // Önceki listener'ları temizle
  if (unsubNote) { unsubNote(); unsubNote = null; }
  if (unsubCouple) { unsubCouple(); unsubCouple = null; }

  // İlk render (boş veri ile)
  render();

  // Not'u dinle (tek doc: board/single)
  unsubNote = onSnapshot(doc(db, 'board', 'single'),
    (snap) => {
      if (snap.exists()) {
        currentNote = snap.data();
      } else {
        currentNote = null;
      }
      if (!isEditing) {
        updateNoteCard();
      }
    },
    (err) => console.error('Note dinleme hatası:', err)
  );

  // Couple bilgilerini dinle (tek doc: couple/info)
  unsubCouple = onSnapshot(doc(db, 'couple', 'info'),
    (snap) => {
      if (snap.exists()) {
        coupleInfo = snap.data();
      } else {
        coupleInfo = null;
      }
      updateCounter();
      startCounterTick();
    },
    (err) => console.error('Couple dinleme hatası:', err)
  );
}

export function stopBoard() {
  if (unsubNote) { unsubNote(); unsubNote = null; }
  if (unsubCouple) { unsubCouple(); unsubCouple = null; }
  if (counterInterval) {
    clearInterval(counterInterval);
    counterInterval = null;
  }
  currentContainer = null;
  currentNote = null;
  coupleInfo = null;
  isEditing = false;
}

console.log('💌 board.js v19 yüklendi (Faz 9.B+C: Bizim Alanımız)');
