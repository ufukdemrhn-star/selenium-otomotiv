// ============================================================
// vehicle-detail.js — Araç detay sayfası (Faz 6.C)
// Real-time vehicle + vitrin foto hero + foto galerisi + 5-açılı showcase
// ============================================================
import { createDamageDiagram } from "./damage-diagram.js?v=13";
import { createDamageShowcase } from "./damage-showcase.js?v=13";
import { listenVehicle } from "./vehicles-db.js?v=13";
import { createPhotoGallery } from "./photo-gallery.js?v=13";

const FUEL_LABELS = {
  benzinli: 'Benzinli', benzin_lpg: 'Benzin & LPG', dizel: 'Dizel',
  hibrit: 'Hibrit', elektrikli: 'Elektrikli'
};

const TRANSMISSION_LABELS = {
  otomatik: 'Otomatik', manuel: 'Manuel'
};

const BODY_LABELS = {
  crossover: 'Crossover', pickup: 'Pickup', suv: 'SUV', cabrio: 'Cabrio',
  coupe: 'Coupe', coupe_4: 'Coupe 4 Kapı',
  hatchback_3: 'Hatchback 3 Kapı', hatchback_5: 'Hatchback 5 Kapı',
  sedan: 'Sedan'
};

const DRIVE_LABELS = {
  fwd: 'Önden Çekiş', rwd: 'Arkadan İtiş',
  '4wd': '4WD (Sürekli)', awd: 'AWD (Elektronik)',
  '4x2_rwd': '4x2 (Arkadan İtişli)', '4x2_fwd': '4x2 (Önden Çekişli)',
  '4x4': '4x4'
};

function getEnginePowerLabel(vehicle) {
  if (!vehicle.enginePower) return null;
  if (vehicle.enginePower === 'custom') {
    return vehicle.customEnginePower ? `${vehicle.customEnginePower} HP` : null;
  }
  if (vehicle.enginePower === 'le50') return "50 HP'ye kadar";
  if (vehicle.enginePower === 'ge601') return '601 HP ve üzeri';
  const m = vehicle.enginePower.match(/^(\d+)_(\d+)$/);
  if (m) return `${m[1]} - ${m[2]} HP`;
  return vehicle.enginePower;
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function formatPrice(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('tr-TR') + ' ₺';
}

function formatKm(v) {
  if (v === null || v === undefined) return '—';
  return Number(v).toLocaleString('tr-TR') + ' km';
}

function formatDate(timestamp) {
  if (!timestamp) return '—';
  let date;
  if (timestamp.seconds) date = new Date(timestamp.seconds * 1000);
  else if (timestamp.toDate) date = timestamp.toDate();
  else date = new Date(timestamp);
  return date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getStatusLabel(status) {
  if (status === 'sold') return 'SATILDI';
  if (status === 'deleted') return 'SİLİNDİ';
  return 'AKTİF';
}

// State
let currentVehicle = null;
let detailDamageComponent = null;
let photoGalleryComponent = null;
let vehicleUnsubscribe = null;

// DOM
const detailScreen = document.getElementById('vehicle-detail');
const detailContent = document.getElementById('detail-content');
const detailCloseBtn = document.getElementById('detail-close');

export function openVehicleDetail(vehicle) {
  if (vehicleUnsubscribe) {
    vehicleUnsubscribe();
    vehicleUnsubscribe = null;
  }

  currentVehicle = vehicle;
  render();
  detailScreen.classList.add('open');
  document.body.style.overflow = 'hidden';
  detailContent.scrollTop = 0;

  vehicleUnsubscribe = listenVehicle(vehicle.id, (updated) => {
    if (!updated) {
      closeDetail();
      return;
    }
    currentVehicle = updated;
    updateHero();
  });
}

function closeDetail() {
  detailScreen.classList.remove('open');
  document.body.style.overflow = '';

  if (vehicleUnsubscribe) {
    vehicleUnsubscribe();
    vehicleUnsubscribe = null;
  }
  if (photoGalleryComponent) {
    photoGalleryComponent.destroy();
    photoGalleryComponent = null;
  }

  currentVehicle = null;
  detailDamageComponent = null;
}

function updateHero() {
  const v = currentVehicle;
  if (!v) return;

  const heroEl = detailContent.querySelector('.detail-hero');
  if (!heroEl) return;

  if (v.coverPhotoData) {
    heroEl.classList.add('has-photo');
    heroEl.style.backgroundImage = `url("${v.coverPhotoData}")`;
  } else {
    heroEl.classList.remove('has-photo');
    heroEl.style.backgroundImage = '';
  }
}

function render() {
  if (!currentVehicle) return;

  const v = currentVehicle;
  const title = [v.brand, v.model, v.series].filter(Boolean).join(' ');

  const infoRows = [];
  if (v.year) infoRows.push({ label: 'Yıl', value: v.year });
  if (v.km !== null && v.km !== undefined) infoRows.push({ label: 'KM', value: formatKm(v.km) });
  if (v.transmission) infoRows.push({ label: 'Vites', value: TRANSMISSION_LABELS[v.transmission] || v.transmission });
  if (v.fuel) infoRows.push({ label: 'Yakıt', value: FUEL_LABELS[v.fuel] || v.fuel });
  if (v.bodyType) infoRows.push({ label: 'Kasa', value: BODY_LABELS[v.bodyType] || v.bodyType });
  const enginePower = getEnginePowerLabel(v);
  if (enginePower) infoRows.push({ label: 'Motor Gücü', value: enginePower });
  if (v.drive) infoRows.push({ label: 'Çekiş', value: DRIVE_LABELS[v.drive] || v.drive });
  if (v.doors) infoRows.push({ label: 'Kapı', value: v.doors });
  if (v.heavyDamage) infoRows.push({ label: 'Ağır Hasar Kayıtlı', value: 'Evet', danger: true });

  let totalExpenses = 0;
  if (v.expenses && Array.isArray(v.expenses)) {
    totalExpenses = v.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  }
  const expenseStr = totalExpenses > 0 ? formatPrice(totalExpenses) : '—';

  const hasDamageData = v.damage && Object.keys(v.damage).length > 0;
  const hasCoverPhoto = !!v.coverPhotoData;

  detailContent.innerHTML = `
    <!-- HERO -->
    <div class="detail-hero ${hasCoverPhoto ? 'has-photo' : ''}" ${hasCoverPhoto ? `style="background-image: url('${v.coverPhotoData}')"` : ''}>
      ${!hasCoverPhoto ? '<div class="hero-bg-watermark">SELENIUM</div>' : ''}
      <div class="hero-overlay"></div>
      <div class="hero-content">
        <div class="hero-status-pill ${v.status}">${getStatusLabel(v.status)}</div>
        <h1 class="hero-title">${escapeHtml(title)}</h1>
        ${v.year || (v.km !== null && v.km !== undefined) ? `
          <div class="hero-subtitle">
            ${[v.year, (v.km !== null && v.km !== undefined) ? formatKm(v.km) : null].filter(Boolean).join(' · ')}
          </div>
        ` : ''}
      </div>
    </div>

    <div class="detail-body">

      <!-- FİYAT -->
      <div class="detail-price-block">
        <div class="price-item">
          <div class="price-item-label">Alış Fiyatı</div>
          <div class="price-item-value">${formatPrice(v.purchasePrice)}</div>
        </div>
        <div class="price-divider"></div>
        <div class="price-item">
          <div class="price-item-label">Toplam Masraf</div>
          <div class="price-item-value">${expenseStr}</div>
        </div>
      </div>

      <!-- FOTOĞRAFLAR -->
      <div class="detail-section">
        <div id="photo-gallery-container"></div>
      </div>

      <!-- TEKNIK BİLGİLER -->
      ${infoRows.length > 0 ? `
        <div class="detail-section">
          <h2 class="detail-section-title">Teknik Bilgiler</h2>
          <div class="detail-info-grid">
            ${infoRows.map(row => `
              <div class="info-row ${row.danger ? 'info-danger' : ''}">
                <span class="info-label">${escapeHtml(row.label)}</span>
                <span class="info-value">${escapeHtml(row.value)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- HASAR EKSPERTİZ GÖRSELİ (YENİ - Faz 6.C) -->
      <div class="detail-section">
        <h2 class="detail-section-title">Ekspertiz Görseli</h2>
        <div id="detail-showcase-container"></div>
      </div>

      <!-- HASAR DETAYI (üstten + parça listesi) -->
      ${hasDamageData ? `
        <div class="detail-section">
          <h2 class="detail-section-title">Hasar Detayı</h2>
          <div id="detail-damage-container"></div>
        </div>
      ` : ''}

      <!-- META -->
      <div class="detail-meta">
        ${v.createdAt ? `
          <div class="meta-row">
            <span class="meta-label">Eklenme</span>
            <span class="meta-value">${formatDate(v.createdAt)}</span>
          </div>
        ` : ''}
        ${v.createdBy ? `
          <div class="meta-row">
            <span class="meta-label">Ekleyen</span>
            <span class="meta-value">${escapeHtml(v.createdBy)}</span>
          </div>
        ` : ''}
      </div>

      <!-- AKSİYONLAR -->
      <div class="detail-actions">
        <button class="detail-action-btn placeholder" disabled>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Düzenle
        </button>
        <button class="detail-action-btn placeholder" disabled>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="12" y1="1" x2="12" y2="23"/>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          Sat
        </button>
        <button class="detail-action-btn placeholder danger" disabled>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
          Sil
        </button>
      </div>

      <div class="detail-actions-hint">
        Düzenle/Sat/Sil butonları Faz 7'de aktif olacak
      </div>

    </div>
  `;

  // 5-açılı ekspertiz görseli (yeni — Faz 6.C)
  const showcaseContainer = document.getElementById('detail-showcase-container');
  if (showcaseContainer) {
    createDamageShowcase({
      container: showcaseContainer,
      damage: v.damage || {}
    });
  }

  // Detaylı hasar şeması (readonly)
  if (hasDamageData) {
    const damageContainer = document.getElementById('detail-damage-container');
    if (damageContainer) {
      detailDamageComponent = createDamageDiagram({
        container: damageContainer,
        initialData: v.damage || {},
        readonly: true
      });
    }
  }

  // Foto galerisi
  const galleryContainer = document.getElementById('photo-gallery-container');
  if (galleryContainer) {
    if (photoGalleryComponent) {
      photoGalleryComponent.destroy();
    }
    photoGalleryComponent = createPhotoGallery({
      container: galleryContainer,
      vehicleId: v.id,
      getCoverPhotoId: () => currentVehicle?.coverPhotoId || null
    });
  }
}

if (detailCloseBtn) {
  detailCloseBtn.addEventListener('click', closeDetail);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && detailScreen.classList.contains('open')) {
    const lightbox = document.getElementById('photo-lightbox');
    if (lightbox && lightbox.classList.contains('open')) {
      return;
    }
    closeDetail();
  }
});

console.log('📋 vehicle-detail.js v13 yüklendi (Faz 6.C)');
