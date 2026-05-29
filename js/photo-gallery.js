// ============================================================
// photo-gallery.js — v13 (Faz 6.C: sadece versiyon)
// ============================================================
import { compressImage, base64Size, formatBytes } from "./photo-utils.js?v=13";
import { listenVehiclePhotos, addPhoto, removePhoto, setCoverPhoto } from "./vehicles-db.js?v=13";

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

export function createPhotoGallery({ container, vehicleId, getCoverPhotoId }) {
  let photos = [];
  let unsubscribe = null;
  let currentLightboxIndex = -1;

  function render() {
    const coverPhotoId = getCoverPhotoId();
    const photoCount = photos.length;

    container.innerHTML = `
      <div class="photo-gallery">
        <div class="photo-gallery-header">
          <h3 class="photo-gallery-title">
            Fotoğraflar
            ${photoCount > 0 ? `<span class="photo-count-badge">${photoCount}</span>` : ''}
          </h3>
          <button type="button" class="photo-add-btn" id="photo-add-btn-${vehicleId}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>Foto Ekle</span>
          </button>
          <input type="file" accept="image/*" multiple class="photo-file-input" id="photo-file-input-${vehicleId}" hidden>
        </div>

        <div class="photo-upload-progress" hidden>
          <div class="progress-bar-wrapper">
            <div class="progress-bar-fill"></div>
          </div>
          <div class="progress-text">Yükleniyor...</div>
        </div>

        ${photos.length === 0 ? `
          <div class="photo-empty">
            <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p>Henüz fotoğraf yok</p>
            <p class="empty-sub">İlk yüklediğin foto vitrin olarak ayarlanır</p>
          </div>
        ` : `
          <div class="photo-grid">
            ${photos.map((p, idx) => `
              <div class="photo-thumb ${p.id === coverPhotoId ? 'is-cover' : ''}" data-photo-id="${escapeHtml(p.id)}" data-index="${idx}">
                <img src="${escapeHtml(p.data)}" alt="Foto ${idx + 1}" loading="lazy">
                ${p.id === coverPhotoId ? `
                  <div class="cover-badge">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Vitrin
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;

    const addBtn = document.getElementById(`photo-add-btn-${vehicleId}`);
    const fileInput = document.getElementById(`photo-file-input-${vehicleId}`);
    if (addBtn && fileInput) {
      addBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', handleFileSelect);
    }
    container.querySelectorAll('.photo-thumb').forEach(thumb => {
      thumb.addEventListener('click', () => {
        openLightbox(parseInt(thumb.dataset.index));
      });
    });
  }

  async function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (files.length === 0) return;
    const progressEl = container.querySelector('.photo-upload-progress');
    const progressBar = progressEl.querySelector('.progress-bar-fill');
    const progressText = progressEl.querySelector('.progress-text');
    progressEl.hidden = false;
    let totalUploaded = 0, totalSize = 0, errors = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      progressText.textContent = `Sıkıştırılıyor... ${i + 1} / ${files.length}`;
      progressBar.style.width = `${((i) / files.length) * 100}%`;
      try {
        const base64 = await compressImage(file, { maxSize: 1200, quality: 0.75 });
        const size = base64Size(base64);
        let finalBase64 = base64;
        if (size > 500 * 1024) {
          finalBase64 = await compressImage(file, { maxSize: 900, quality: 0.65 });
        }
        progressText.textContent = `Yükleniyor... ${i + 1} / ${files.length} (${formatBytes(base64Size(finalBase64))})`;
        await addPhoto(vehicleId, finalBase64);
        totalUploaded++;
        totalSize += base64Size(finalBase64);
      } catch (err) {
        console.error('Foto yükleme hatası:', err);
        errors++;
      }
    }
    progressBar.style.width = '100%';
    progressText.textContent = `✓ ${totalUploaded} foto yüklendi (${formatBytes(totalSize)})`;
    setTimeout(() => {
      progressEl.hidden = true;
      progressBar.style.width = '0%';
    }, 2000);
    if (errors > 0) alert(`${errors} foto yüklenemedi.`);
  }

  function openLightbox(index) {
    currentLightboxIndex = index;
    renderLightbox();
  }

  function closeLightbox() {
    currentLightboxIndex = -1;
    const lightbox = document.getElementById('photo-lightbox');
    if (lightbox) lightbox.classList.remove('open');
  }

  function navigateLightbox(direction) {
    const newIndex = currentLightboxIndex + direction;
    if (newIndex < 0 || newIndex >= photos.length) return;
    currentLightboxIndex = newIndex;
    renderLightbox();
  }

  function renderLightbox() {
    if (currentLightboxIndex < 0 || currentLightboxIndex >= photos.length) {
      closeLightbox();
      return;
    }
    const photo = photos[currentLightboxIndex];
    const coverPhotoId = getCoverPhotoId();
    const isCover = photo.id === coverPhotoId;

    let lightbox = document.getElementById('photo-lightbox');
    if (!lightbox) {
      lightbox = document.createElement('div');
      lightbox.id = 'photo-lightbox';
      lightbox.className = 'photo-lightbox';
      document.body.appendChild(lightbox);
    }

    lightbox.innerHTML = `
      <button type="button" class="lightbox-close" aria-label="Kapat">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
      <div class="lightbox-counter">${currentLightboxIndex + 1} / ${photos.length}</div>
      ${currentLightboxIndex > 0 ? `
        <button type="button" class="lightbox-nav prev" aria-label="Önceki">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      ` : ''}
      ${currentLightboxIndex < photos.length - 1 ? `
        <button type="button" class="lightbox-nav next" aria-label="Sonraki">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      ` : ''}
      <div class="lightbox-image-wrapper">
        <img src="${escapeHtml(photo.data)}" alt="Foto ${currentLightboxIndex + 1}">
      </div>
      <div class="lightbox-actions">
        <button type="button" class="lightbox-action ${isCover ? 'is-cover' : ''}" id="lightbox-cover-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="${isCover ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
          <span>${isCover ? 'Vitrin Foto' : 'Vitrin Yap'}</span>
        </button>
        <button type="button" class="lightbox-action danger" id="lightbox-delete-btn">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          <span>Sil</span>
        </button>
      </div>
    `;
    lightbox.classList.add('open');

    lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
    const prevBtn = lightbox.querySelector('.lightbox-nav.prev');
    const nextBtn = lightbox.querySelector('.lightbox-nav.next');
    if (prevBtn) prevBtn.addEventListener('click', () => navigateLightbox(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => navigateLightbox(1));

    document.getElementById('lightbox-cover-btn').addEventListener('click', async () => {
      if (isCover) return;
      try { await setCoverPhoto(vehicleId, photo.id); }
      catch (err) { alert('Vitrin yapılamadı: ' + err.message); }
    });

    document.getElementById('lightbox-delete-btn').addEventListener('click', async () => {
      if (!confirm('Bu fotoğrafı silmek istediğine emin misin?')) return;
      try {
        await removePhoto(vehicleId, photo.id);
        if (photos.length > 1) {
          if (currentLightboxIndex >= photos.length - 1) {
            currentLightboxIndex = photos.length - 2;
          }
        } else {
          closeLightbox();
        }
      } catch (err) { alert('Silme başarısız: ' + err.message); }
    });

    const handleKey = (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') navigateLightbox(-1);
      else if (e.key === 'ArrowRight') navigateLightbox(1);
    };
    document.removeEventListener('keydown', handleKey);
    document.addEventListener('keydown', handleKey, { once: false });
  }

  function start() {
    unsubscribe = listenVehiclePhotos(vehicleId, (newPhotos) => {
      photos = newPhotos;
      const lightbox = document.getElementById('photo-lightbox');
      const lightboxOpen = lightbox && lightbox.classList.contains('open');
      render();
      if (lightboxOpen && currentLightboxIndex >= 0) {
        if (currentLightboxIndex >= photos.length) {
          if (photos.length === 0) closeLightbox();
          else {
            currentLightboxIndex = photos.length - 1;
            renderLightbox();
          }
        } else renderLightbox();
      }
    });
  }

  function destroy() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    closeLightbox();
  }

  start();
  return { destroy };
}
