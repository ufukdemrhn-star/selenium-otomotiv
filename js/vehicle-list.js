// ============================================================
// vehicle-list.js — Araç listesi (liste/galeri görünüm, real-time)
// ============================================================
import { listenVehicles } from "./vehicles-db.js?v=9";

// Etiket eşlemeleri
const FUEL_LABELS = {
  benzinli: 'Benzinli', benzin_lpg: 'Benzin & LPG', dizel: 'Dizel',
  hibrit: 'Hibrit', elektrikli: 'Elektrikli'
};

const TRANSMISSION_LABELS = {
  otomatik: 'Otomatik',
  manuel: 'Manuel'
};

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function formatPrice(v) {
  if (v === null || v === undefined) return null;
  return Number(v).toLocaleString('tr-TR') + ' ₺';
}

function formatKm(v) {
  if (v === null || v === undefined) return null;
  return Number(v).toLocaleString('tr-TR') + ' km';
}

// Global görünüm tercihi (localStorage)
const VIEW_KEY = 'selenium-vehicle-view';
let currentView = localStorage.getItem(VIEW_KEY) || 'list'; // 'list' | 'gallery'

// Aktif unsubscribe fonksiyonları
let unsubFns = {};

/**
 * Bir araç kartı HTML'i oluştur
 * view: 'list' veya 'gallery'
 */
function renderCard(vehicle, view) {
  const title = [vehicle.brand, vehicle.model, vehicle.series].filter(Boolean).join(' ');
  const yearKm = [vehicle.year, formatKm(vehicle.km)].filter(Boolean).join(' · ');
  const price = formatPrice(vehicle.purchasePrice);
  const transmissionFuel = [
    TRANSMISSION_LABELS[vehicle.transmission],
    FUEL_LABELS[vehicle.fuel]
  ].filter(Boolean).join(' · ');

  // Has herhangi bir damage işareti var mı?
  const hasDamage = vehicle.damage && Object.values(vehicle.damage).some(s => s === 'D');

  // Default arkaplan stili
  const cardClass = view === 'gallery' ? 'vehicle-card gallery-card' : 'vehicle-card list-card';

  if (view === 'gallery') {
    return `
      <div class="${cardClass}" data-id="${escapeHtml(vehicle.id)}">
        <div class="card-bg-watermark">SELENIUM</div>
        <div class="card-content">
          <div class="card-title">${escapeHtml(title)}</div>
          ${yearKm ? `<div class="card-subline">${escapeHtml(yearKm)}</div>` : ''}
        </div>
        ${hasDamage ? '<div class="damage-tag">Değişen var</div>' : ''}
      </div>
    `;
  }

  // List card
  return `
    <div class="${cardClass}" data-id="${escapeHtml(vehicle.id)}">
      <div class="card-bg-watermark">SELENIUM</div>
      <div class="card-content">
        <div class="card-title">${escapeHtml(title)}</div>
        ${yearKm ? `<div class="card-line">${escapeHtml(yearKm)}</div>` : ''}
        ${price ? `<div class="card-line card-price">${escapeHtml(price)}</div>` : ''}
        ${transmissionFuel ? `<div class="card-line card-muted">${escapeHtml(transmissionFuel)}</div>` : ''}
      </div>
      ${hasDamage ? '<div class="damage-tag">Değişen var</div>' : ''}
    </div>
  `;
}

/**
 * Bir alt-tab'ı çiz
 */
function renderSubtab(subtabId, vehicles) {
  const container = document.getElementById(subtabId);
  if (!container) return;

  // Boş state
  if (vehicles.length === 0) {
    let emptyTitle = 'Henüz araç yok';
    let emptyHint = '';
    if (subtabId === 'subtab-active') {
      emptyHint = '+ butonuna basıp ilk aracını ekle';
    } else if (subtabId === 'subtab-sold') {
      emptyTitle = 'Satılan araç yok';
    } else if (subtabId === 'subtab-deleted') {
      emptyTitle = 'Silinen araç yok';
    }
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 17h10M5 17l2-7h10l2 7M5 17v3M19 17v3"/>
          <circle cx="8" cy="17" r="1"/>
          <circle cx="16" cy="17" r="1"/>
        </svg>
        <p class="empty-title">${escapeHtml(emptyTitle)}</p>
        ${emptyHint ? `<p class="empty-hint">${escapeHtml(emptyHint)}</p>` : ''}
      </div>
    `;
    return;
  }

  // Liste / Galeri çiz
  const html = vehicles.map(v => renderCard(v, currentView)).join('');
  const wrapClass = currentView === 'gallery' ? 'vehicle-gallery-grid' : 'vehicle-list';
  container.innerHTML = `<div class="${wrapClass}">${html}</div>`;

  // Kart tıklama (Faz 6'da detay sayfası açacak)
  container.querySelectorAll('.vehicle-card').forEach(card => {
    card.addEventListener('click', () => {
      alert('Araç detay sayfası Faz 6\'da gelecek 📋\n\nID: ' + card.dataset.id);
    });
  });
}

/**
 * Liste/Galeri görünümünü değiştir
 */
function setView(view) {
  currentView = view;
  localStorage.setItem(VIEW_KEY, view);

  // Toggle butonlarını güncelle
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });

  // Mevcut görünür alt-tab'ı yeniden çiz (cache'te tutulan verilerle)
  Object.entries(cachedData).forEach(([subtabId, vehicles]) => {
    renderSubtab(subtabId, vehicles);
  });
}

// Görünür araç verilerini cache'te tut (view değiştiğinde yeniden render için)
const cachedData = {};

/**
 * Tüm listener'ları başlat
 */
export function initVehicleList() {
  // 3 alt-tab için dinleyiciler
  const subtabConfig = [
    { status: 'active', container: 'subtab-active' },
    { status: 'sold', container: 'subtab-sold' },
    { status: 'deleted', container: 'subtab-deleted' }
  ];

  subtabConfig.forEach(({ status, container }) => {
    if (unsubFns[status]) unsubFns[status](); // önce eski'yi kapat
    unsubFns[status] = listenVehicles(status, (vehicles) => {
      cachedData[container] = vehicles;
      renderSubtab(container, vehicles);
    });
  });

  // Görünüm toggle butonlarını ayarla
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
}

/**
 * Listener'ları kapat (çıkışta)
 */
export function stopVehicleList() {
  Object.values(unsubFns).forEach(fn => fn && fn());
  unsubFns = {};
}
