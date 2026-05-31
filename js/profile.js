// ============================================================
// profile.js — Profil sekmesi (Faz 9.A)
// Hesap bilgisi + Tema seçici + Hakkında
// ============================================================
import { emailToUsername } from "./auth.js?v=15";
import { THEMES, setTheme, getCurrentTheme } from "./theme-manager.js?v=17";
import { auth } from "./firebase.js?v=15";

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

const KNOWN_USERS = ['raven', 'bahar', 'ahmet'];
const APP_VERSION = '1.3';
const APP_PHASE = 'Faz 9.A';

let currentContainer = null;

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
          <div class="profile-account-label">Bağlı hesap</div>
          <div class="profile-account-name">${escapeHtml(currentUsername)}</div>
        </div>
      </div>

      <div class="profile-users-list">
        <div class="profile-section-subtitle">Diğer kullanıcılar</div>
        ${KNOWN_USERS.filter(u => u !== currentUsername).map(u => `
          <div class="profile-user-row">
            <div class="profile-user-avatar small">${escapeHtml(u.charAt(0).toUpperCase())}</div>
            <span class="profile-user-name">${escapeHtml(u)}</span>
            <span class="profile-user-status">Aynı veri havuzu</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Tema seçici -->
    <div class="profile-section">
      <h2 class="profile-section-title">Tema</h2>
      <p class="profile-section-desc">Tercih ettiğin renk paletini seç. Sadece senin için kaydedilir.</p>

      <div class="theme-grid">
        ${Object.entries(THEMES).map(([id, t]) => `
          <button type="button"
                  class="theme-card ${id === currentTheme ? 'active' : ''}"
                  data-theme="${escapeHtml(id)}">
            <div class="theme-preview" style="background: linear-gradient(135deg, ${t.colors.accent}, ${t.colors.accentDark});">
              ${id === currentTheme ? `
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="${t.colors.buttonText}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              ` : ''}
            </div>
            <div class="theme-info">
              <div class="theme-name">
                <span class="theme-icon">${t.icon}</span>
                ${escapeHtml(t.name)}
              </div>
              <div class="theme-desc">${escapeHtml(t.description)}</div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Hakkında -->
    <div class="profile-section">
      <h2 class="profile-section-title">Hakkında</h2>

      <div class="profile-about-card">
        <div class="about-row">
          <span class="about-label">Uygulama</span>
          <span class="about-value">Selenium Otomotiv</span>
        </div>
        <div class="about-row">
          <span class="about-label">Sürüm</span>
          <span class="about-value">v${APP_VERSION} (${APP_PHASE})</span>
        </div>
        <div class="about-row">
          <span class="about-label">Veritabanı</span>
          <span class="about-value">Firebase Firestore</span>
        </div>
        <div class="about-row">
          <span class="about-label">Yapım</span>
          <span class="about-value">Anthropic Claude ile</span>
        </div>
      </div>

      <div class="profile-soon-note">
        <strong>Yakında:</strong> Faz 9.B'de Kara Tahta (3 kullanıcı arası anonim notlar), Faz 10'da PWA desteği gelecek.
      </div>
    </div>
  `;

  // Tema kartı tıklama event'leri
  currentContainer.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      const themeId = card.dataset.theme;
      setTheme(themeId);
      render(); // Aktif kartı güncellemek için
    });
  });
}

export function initProfile(container) {
  if (!container) return;
  currentContainer = container;
  render();
}

export function refreshProfile() {
  if (currentContainer) render();
}

console.log('👤 profile.js v17 yüklendi (Faz 9.A)');
