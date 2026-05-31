// ============================================================
// board.js — Kara Tahta (Faz 9.B)
// 3 kullanıcı arası real-time not paylaşımı
// ============================================================
import { db, auth } from "./firebase.js?v=15";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { showConfirm, showAlert, showToast } from "./ui-dialogs.js?v=15";
import { emailToUsername } from "./auth.js?v=15";

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Basit "markdown" — **bold**, *italic*
function renderRichText(text) {
  let out = escapeHtml(text);
  // **bold**
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // *italic* (non-greedy, avoid matching ** parts)
  out = out.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  // newline → <br>
  out = out.replace(/\n/g, '<br>');
  return out;
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '—';
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
  if (diffMin < 60) return `${diffMin} dk önce`;
  if (diffHour < 24) return `${diffHour} sa önce`;
  if (diffDay < 7) return `${diffDay} gün önce`;

  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const MAX_LENGTH = 250;

// State
let unsubscribe = null;
let notes = [];
let currentContainer = null;
let currentUsername = null;
let composerState = {
  text: '',
  anonymous: false
};

function getCurrentUsername() {
  const user = auth.currentUser;
  return user?.email ? emailToUsername(user.email) : null;
}

function render() {
  if (!currentContainer) return;
  currentUsername = getCurrentUsername();

  currentContainer.innerHTML = `
    <div class="board-card">
      <div class="board-header">
        <div class="board-title-wrap">
          <h2 class="board-title">
            <span class="board-icon">🪧</span>
            Kara Tahta
          </h2>
          <p class="board-desc">Diğer kullanıcılarla paylaşılan notlar — gerçek zamanlı</p>
        </div>
        ${notes.length > 0 ? `<div class="board-count">${notes.length}</div>` : ''}
      </div>

      <!-- Composer -->
      <div class="board-composer">
        <textarea
          class="board-textarea"
          id="board-text"
          placeholder="Bir şeyler yaz..."
          maxlength="${MAX_LENGTH}"
          rows="2"
        >${escapeHtml(composerState.text)}</textarea>

        <div class="board-composer-row">
          <label class="board-anon-toggle">
            <input type="checkbox" id="board-anon-check" ${composerState.anonymous ? 'checked' : ''}>
            <span class="anon-checkbox"></span>
            <span class="anon-text">Anonim</span>
          </label>

          <div class="board-composer-right">
            <span class="board-char-count" id="board-char-count">${composerState.text.length} / ${MAX_LENGTH}</span>
            <button type="button" class="board-send-btn" id="board-send" ${composerState.text.trim() === '' ? 'disabled' : ''}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              <span>Gönder</span>
            </button>
          </div>
        </div>

        <div class="board-formatting-hint">
          💡 <strong>**kalın**</strong> · <em>*italik*</em> · Emoji ekleyebilirsin 🎉
        </div>
      </div>

      <!-- Notes liste -->
      <div class="board-notes" id="board-notes-list">
        ${notes.length === 0 ? `
          <div class="board-empty">
            <div class="board-empty-icon">📭</div>
            <p>Henüz hiçbir not yok</p>
            <p class="board-empty-sub">İlk notu sen yaz!</p>
          </div>
        ` : notes.map(note => renderNote(note)).join('')}
      </div>
    </div>
  `;

  attachEvents();
}

function renderNote(note) {
  const isMine = !note.anonymous && note.author === currentUsername;
  const authorDisplay = note.anonymous ? 'Anonim' : (note.author || 'Bilinmeyen');
  const pinClass = note.pinned ? 'pinned' : '';
  const myClass = isMine ? 'is-mine' : '';
  const anonClass = note.anonymous ? 'anon' : '';

  return `
    <div class="board-note ${pinClass} ${myClass} ${anonClass}" data-note-id="${escapeHtml(note.id)}">
      ${note.pinned ? `
        <div class="note-pin-badge" title="Sabitlenmiş">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M16 3l-2 2 2 2-2 6h-3v6h-2l-1 4-1-4H7v-6H4l-2-6 2-2-2-2 6-3v6h6V3z" transform="rotate(45 12 12)"/>
          </svg>
        </div>
      ` : ''}

      <div class="note-header">
        <div class="note-author-wrap">
          <div class="note-author-avatar ${anonClass}">
            ${note.anonymous ? '?' : escapeHtml((note.author || '?').charAt(0).toUpperCase())}
          </div>
          <div class="note-meta">
            <div class="note-author">${escapeHtml(authorDisplay)}${isMine ? ' (sen)' : ''}</div>
            <div class="note-time">${escapeHtml(formatRelativeTime(note.createdAt))}</div>
          </div>
        </div>

        ${isMine ? `
          <div class="note-actions">
            <button type="button" class="note-action-btn" data-action="pin" data-note-id="${escapeHtml(note.id)}" title="${note.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="${note.pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 3l-2 2 2 2-2 6h-3v6h-2l-1 4-1-4H7v-6H4l-2-6 2-2-2-2 6-3v6h6V3z" transform="rotate(45 12 12)"/>
              </svg>
            </button>
            <button type="button" class="note-action-btn danger" data-action="delete" data-note-id="${escapeHtml(note.id)}" title="Sil">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        ` : ''}
      </div>

      <div class="note-body">${renderRichText(note.text || '')}</div>
    </div>
  `;
}

function attachEvents() {
  const textarea = document.getElementById('board-text');
  const anonCheck = document.getElementById('board-anon-check');
  const sendBtn = document.getElementById('board-send');
  const charCount = document.getElementById('board-char-count');

  if (textarea) {
    textarea.addEventListener('input', (e) => {
      composerState.text = e.target.value;
      charCount.textContent = `${composerState.text.length} / ${MAX_LENGTH}`;
      sendBtn.disabled = composerState.text.trim() === '';
    });

    textarea.addEventListener('keydown', (e) => {
      // Ctrl+Enter (veya Cmd+Enter mac) ile gönder
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!sendBtn.disabled) handleSend();
      }
    });
  }

  if (anonCheck) {
    anonCheck.addEventListener('change', (e) => {
      composerState.anonymous = e.target.checked;
    });
  }

  if (sendBtn) {
    sendBtn.addEventListener('click', handleSend);
  }

  // Note action butonları
  currentContainer.querySelectorAll('.note-action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const noteId = btn.dataset.noteId;

      if (action === 'delete') {
        const ok = await showConfirm({
          title: 'Notu Sil',
          message: 'Bu notu silmek istediğine emin misin?',
          confirmText: 'Sil',
          cancelText: 'İptal',
          danger: true
        });
        if (!ok) return;

        try {
          await deleteDoc(doc(db, 'board', noteId));
        } catch (err) {
          showAlert({ title: 'Hata', message: 'Not silinemedi: ' + err.message, danger: true });
        }
      } else if (action === 'pin') {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        try {
          await updateDoc(doc(db, 'board', noteId), {
            pinned: !note.pinned
          });
        } catch (err) {
          showAlert({ title: 'Hata', message: 'Sabitlenemedi: ' + err.message, danger: true });
        }
      }
    });
  });
}

async function handleSend() {
  const text = composerState.text.trim();
  if (!text) return;

  const anonymous = composerState.anonymous;
  const username = getCurrentUsername();

  try {
    await addDoc(collection(db, 'board'), {
      text: text.substring(0, MAX_LENGTH),
      author: anonymous ? null : username,
      anonymous: anonymous,
      pinned: false,
      createdAt: serverTimestamp()
    });

    // Composer'ı temizle
    composerState.text = '';
    composerState.anonymous = false;
    showToast('✓ Not paylaşıldı');
    // render() listener tarafından çağrılacak ama composer'ı manuel temizleyelim
    const textarea = document.getElementById('board-text');
    const anonCheck = document.getElementById('board-anon-check');
    const charCount = document.getElementById('board-char-count');
    const sendBtn = document.getElementById('board-send');
    if (textarea) textarea.value = '';
    if (anonCheck) anonCheck.checked = false;
    if (charCount) charCount.textContent = `0 / ${MAX_LENGTH}`;
    if (sendBtn) sendBtn.disabled = true;
  } catch (err) {
    showAlert({ title: 'Hata', message: 'Not gönderilemedi: ' + err.message, danger: true });
    console.error(err);
  }
}

/**
 * Kara tahta'yı başlat
 */
export function initBoard(container) {
  if (!container) return;
  currentContainer = container;

  // Önceki listener'ı temizle
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  // İlk render (notes boş)
  render();

  // Real-time listener
  const q = query(collection(db, 'board'), orderBy('createdAt', 'desc'));
  unsubscribe = onSnapshot(q,
    (snapshot) => {
      const newNotes = [];
      snapshot.forEach(d => {
        newNotes.push({ id: d.id, ...d.data() });
      });
      // Pinned olanları üste al
      newNotes.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      notes = newNotes;

      // Composer state'ini kaybetmemek için sadece note listesini güncelle
      updateNotesList();
    },
    (err) => {
      console.error('Board dinleme hatası:', err);
    }
  );
}

function updateNotesList() {
  const listEl = document.getElementById('board-notes-list');
  const countEl = currentContainer?.querySelector('.board-count');

  if (!listEl) return;

  if (notes.length === 0) {
    listEl.innerHTML = `
      <div class="board-empty">
        <div class="board-empty-icon">📭</div>
        <p>Henüz hiçbir not yok</p>
        <p class="board-empty-sub">İlk notu sen yaz!</p>
      </div>
    `;
  } else {
    listEl.innerHTML = notes.map(note => renderNote(note)).join('');
  }

  // Count badge
  const header = currentContainer.querySelector('.board-header');
  if (header) {
    const existingCount = header.querySelector('.board-count');
    if (notes.length > 0) {
      if (existingCount) {
        existingCount.textContent = notes.length;
      } else {
        const newCount = document.createElement('div');
        newCount.className = 'board-count';
        newCount.textContent = notes.length;
        header.appendChild(newCount);
      }
    } else if (existingCount) {
      existingCount.remove();
    }
  }

  // Note action button'larını tekrar bağla
  currentContainer.querySelectorAll('.note-action-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const noteId = btn.dataset.noteId;

      if (action === 'delete') {
        const ok = await showConfirm({
          title: 'Notu Sil',
          message: 'Bu notu silmek istediğine emin misin?',
          confirmText: 'Sil',
          cancelText: 'İptal',
          danger: true
        });
        if (!ok) return;

        try {
          await deleteDoc(doc(db, 'board', noteId));
        } catch (err) {
          showAlert({ title: 'Hata', message: 'Not silinemedi: ' + err.message, danger: true });
        }
      } else if (action === 'pin') {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        try {
          await updateDoc(doc(db, 'board', noteId), {
            pinned: !note.pinned
          });
        } catch (err) {
          showAlert({ title: 'Hata', message: 'Sabitlenemedi: ' + err.message, danger: true });
        }
      }
    });
  });
}

export function stopBoard() {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  currentContainer = null;
  notes = [];
  composerState = { text: '', anonymous: false };
}

console.log('🪧 board.js v18 yüklendi (Faz 9.B)');
