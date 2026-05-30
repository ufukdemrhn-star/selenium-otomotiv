// ============================================================
// ui-dialogs.js — Tema uyumlu confirm/alert/prompt modal'ları
// Promise-based API: tarayıcının native confirm/alert yerine
// ============================================================

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Aktif dialog kuyruğu (üst üste açılma durumlarına karşı)
let activeDialogs = [];

/**
 * Onaylı dialog — kullanıcıya evet/hayır sorar
 *
 * @param {string|Object} msgOrOpts
 *   String ise: mesaj. Object ise: { title, message, confirmText, cancelText, danger }
 * @returns {Promise<boolean>} - true (onayladı) / false (iptal)
 */
export function showConfirm(msgOrOpts) {
  const opts = typeof msgOrOpts === 'string'
    ? { message: msgOrOpts }
    : (msgOrOpts || {});

  return new Promise((resolve) => {
    const dialog = buildDialog({
      title: opts.title || 'Onay',
      message: opts.message || '',
      confirmText: opts.confirmText || 'Evet',
      cancelText: opts.cancelText || 'İptal',
      danger: !!opts.danger,
      kind: 'confirm',
      onResult: resolve
    });
    document.body.appendChild(dialog);
    activeDialogs.push(dialog);
    requestAnimationFrame(() => dialog.classList.add('open'));
  });
}

/**
 * Bildirim dialog — sadece tamam butonu
 */
export function showAlert(msgOrOpts) {
  const opts = typeof msgOrOpts === 'string'
    ? { message: msgOrOpts }
    : (msgOrOpts || {});

  return new Promise((resolve) => {
    const dialog = buildDialog({
      title: opts.title || 'Bildirim',
      message: opts.message || '',
      confirmText: opts.confirmText || 'Tamam',
      cancelText: null,
      danger: !!opts.danger,
      kind: 'alert',
      onResult: () => resolve(true)
    });
    document.body.appendChild(dialog);
    activeDialogs.push(dialog);
    requestAnimationFrame(() => dialog.classList.add('open'));
  });
}

function buildDialog({ title, message, confirmText, cancelText, danger, kind, onResult }) {
  const dialog = document.createElement('div');
  dialog.className = 'ui-dialog';
  dialog.setAttribute('data-kind', kind);

  // Mesajın çok satırlı olabilmesi için \n → <br>
  const messageHtml = escapeHtml(message).replace(/\n/g, '<br>');

  dialog.innerHTML = `
    <div class="ui-dialog-backdrop"></div>
    <div class="ui-dialog-content">
      <div class="ui-dialog-icon ${danger ? 'danger' : (kind === 'alert' ? 'info' : 'accent')}">
        ${danger ? `
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        ` : kind === 'alert' ? `
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        ` : `
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        `}
      </div>

      ${title ? `<h3 class="ui-dialog-title">${escapeHtml(title)}</h3>` : ''}
      <div class="ui-dialog-message">${messageHtml}</div>

      <div class="ui-dialog-actions">
        ${cancelText ? `
          <button type="button" class="ui-dialog-btn secondary" data-action="cancel">
            ${escapeHtml(cancelText)}
          </button>
        ` : ''}
        <button type="button" class="ui-dialog-btn ${danger ? 'danger' : 'primary'}" data-action="confirm">
          ${escapeHtml(confirmText)}
        </button>
      </div>
    </div>
  `;

  // Tüm event handler'ları
  function close(result) {
    dialog.classList.remove('open');
    document.removeEventListener('keydown', handleKey);
    activeDialogs = activeDialogs.filter(d => d !== dialog);
    setTimeout(() => {
      if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
    }, 220);
    onResult(result);
  }

  function handleKey(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      close(false);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      close(true);
    }
  }

  dialog.querySelector('[data-action="confirm"]').addEventListener('click', () => close(true));

  const cancelBtn = dialog.querySelector('[data-action="cancel"]');
  if (cancelBtn) cancelBtn.addEventListener('click', () => close(false));

  // Backdrop click = iptal (sadece confirm dialog'larda)
  dialog.querySelector('.ui-dialog-backdrop').addEventListener('click', () => {
    if (kind === 'confirm') close(false);
    else close(true);
  });

  document.addEventListener('keydown', handleKey);

  return dialog;
}

/**
 * Bildirim toast'ı (üstten gelir, otomatik kapanır)
 */
export function showToast(message, opts = {}) {
  const duration = opts.duration || 3000;
  const danger = !!opts.danger;

  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'app-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.toggle('danger', danger);
  toast.classList.add('show');

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

console.log('💬 ui-dialogs.js v15 yüklendi (tema uyumlu modal)');
