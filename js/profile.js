// ============================================================
// profile.js — Profil sekmesi (Faz 9.A)
// Hesap bilgisi + Tema seçici + Hakkında
// ============================================================
import { emailToUsername } from "./auth.js?v=15";
import { THEMES, setTheme, getCurrentTheme } from "./theme-manager.js?v=17";
import { auth } from "./firebase.js?v=15";
import { initBoard, stopBoard } from "./board.js?v=18";

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

let currentContainer = null;
let boardInitialized = false;

function render() {
  if (!currentContainer) return;

  const user = auth.currentUser;
  const currentUsername = user?.email ? emailToUsername(user.email) : '—';
  const currentTheme = getCurrentTheme();

  currentContainer.innerHTML = `
    <!-- Hesap kartı -->
    <div class="profile-section">
      <div class="profile-account-card">
        <div class="profile-avatar">
          ${escapeHtml(currentUsername.charAt(0).toUpperCase())}
        </div>
        <div class="profile-account-info">
          <div class="profile-account-label">Hoş geldin,</div>
          <div class="profile-account-name">${escapeHtml(currentUsername)}</div>
        </div>
      </div>
    </div>

    <!-- Tema seçici -->
    <div class="profile-section">
      <h2 class="profile-section-title">Tema</h2>
      <p class="profile-section-desc">Tercih ettiğin renk paletini seç. Sadece senin için kaydedilir.</p>

      <div class="theme-row">
        ${Object.entries(THEMES).map(([id, t]) => `
          <button type="button"
                  class="theme-swatch ${id === currentTheme ? 'active' : ''}"
                  data-theme="${escapeHtml(id)}"
                  title="${escapeHtml(t.name)}"
                  aria-label="${escapeHtml(t.name)}">
            <div class="swatch-preview" style="background: linear-gradient(135deg, ${t.colors.accent}, ${t.colors.accentDark});">
              ${id === currentTheme ? `
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${t.colors.buttonText}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ` : ''}
            </div>
            <div class="swatch-name">${escapeHtml(t.name)}</div>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Kara Tahta (Faz 9.B) -->
    <div class="profile-section">
      <div id="board-container"></div>
    </div>
  `;

  // Tema seçimi
  currentContainer.querySelectorAll('.theme-swatch').forEach(card => {
    card.addEventListener('click', () => {
      const themeId = card.dataset.theme;
      setTheme(themeId);
      render(); // Aktif kartı güncellemek için
      // Kara tahta'yı tekrar başlat (yeniden initialize)
      const boardContainer = document.getElementById('board-container');
      if (boardContainer) initBoard(boardContainer);
    });
  });

  // Kara tahta'yı başlat
  const boardContainer = document.getElementById('board-container');
  if (boardContainer) initBoard(boardContainer);
}

export function initProfile(container) {
  if (!container) return;
  currentContainer = container;
  render();
}

export function refreshProfile() {
  if (currentContainer) render();
}

export function stopProfile() {
  stopBoard();
  currentContainer = null;
}

console.log('👤 profile.js v18 yüklendi (Faz 9.A+B)');
