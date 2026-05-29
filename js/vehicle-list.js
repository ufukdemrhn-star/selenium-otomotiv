// ============================================================
// vehicle-list.js — v13 (Faz 6.C: sadece versiyon)
// ============================================================
import { listenVehicles } from "./vehicles-db.js?v=13";
import { openVehicleDetail } from "./vehicle-detail.js?v=13";

const FUEL_LABELS = {
  benzinli: 'Benzinli', benzin_lpg: 'Benzin & LPG', dizel: 'Dizel',
  hibrit: 'Hibrit', elektrikli: 'Elektrikli'
};
const TRANSMISSION_LABELS = { otomatik: 'Otomatik', manuel: 'Manuel' };

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

function getTotalExpenses(vehicle) {
  if (!vehicle.expenses || !Array.isArray(vehicle.expenses) || vehicle.expenses.length === 0) return null;
  const total = vehicle.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  return total > 0 ? total : null;
}

const VIEW_KEY = 'selenium-vehicle-view';
let currentView = localStorage.getItem(VIEW_KEY) || 'list';
let unsubFns = {};
const cachedData = {};
const vehiclesById = {};

function renderCard(vehicle, view) {
  const title = [vehicle.brand, vehicle.model, vehicle.series].filter(Boolean).join(' ');
  const yearKm = [vehicle.year, formatKm(vehicle.km)].filter(Boolean).join(' · ');
  const hasCoverPhoto = !!vehicle.coverPhotoData;
  const photoStyle = hasCoverPhoto ? `style="background-image: url('${escapeHtml(vehicle.coverPhotoData)}')"` : '';
  const photoClass = hasCoverPhoto ? 'has-photo' : '';

  if (view === 'gallery') {
    return `
      <div class="vehicle-card gallery-card ${photoClass}" data-id="${escapeHtml(vehicle.id)}" ${photoStyle}>
        ${!hasCoverPhoto ? '<div class="card-bg-watermark">SELENIUM</div>' : ''}
        <div class="card-overlay"></div>
        <div class="card-content">
          <div class="card-title">${escapeHtml(title)}</div>
          ${yearKm ? `<div class="card-subline">${escapeHtml(yearKm)}</div>` : ''}
        </div>
      </div>
    `;
  }

  const price = formatPrice(vehicle.purchasePrice);
  const totalExpenses = getTotalExpenses(vehicle);
  const expenseStr = totalExpenses !== null ? formatPrice(totalExpenses) : '—';

  let priceLine = '';
  if (price || totalExpenses !== null) {
    priceLine = `
      <div class="card-line card-price-line">
        ${price ? `<span class="price-label">Alış:</span> <span class="price-value">${escapeHtml(price)}</span>` : '<span class="price-muted">Alış: —</span>'}
        <span class="price-sep">·</span>
        <span class="price-muted">Masraf: ${escapeHtml(expenseStr)}</span>
      </div>
    `;
  }

  const transmissionFuel = [
    TRANSMISSION_LABELS[vehicle.transmission],
    FUEL_LABELS[vehicle.fuel]
  ].filter(Boolean).join(' · ');

  return `
    <div class="vehicle-card list-card ${photoClass}" data-id="${escapeHtml(vehicle.id)}" ${photoStyle}>
      ${!hasCoverPhoto ? '<div class="card-bg-watermark">SELENIUM</div>' : ''}
      <div class="card-overlay"></div>
      <div class="card-content">
        <div class="card-title">${escapeHtml(title)}</div>
        ${yearKm ? `<div class="card-line">${escapeHtml(yearKm)}</div>` : ''}
        ${priceLine}
        ${transmissionFuel ? `<div class="card-line card-muted">${escapeHtml(transmissionFuel)}</div>` : ''}
      </div>
    </div>
  `;
}

function renderSubtab(subtabId, vehicles) {
  const container = document.getElementById(subtabId);
  if (!container) return;
  if (vehicles.length === 0) {
    let emptyTitle = 'Henüz araç yok', emptyHint = '';
    if (subtabId === 'subtab-active') emptyHint = '+ butonuna basıp ilk aracını ekle';
    else if (subtabId === 'subtab-sold') emptyTitle = 'Satılan araç yok';
    else if (subtabId === 'subtab-deleted') emptyTitle = 'Silinen araç yok';
    container.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 17h10M5 17l2-7h10l2 7M5 17v3M19 17v3"/>
          <circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/>
        </svg>
        <p class="empty-title">${escapeHtml(emptyTitle)}</p>
        ${emptyHint ? `<p class="empty-hint">${escapeHtml(emptyHint)}</p>` : ''}
      </div>
    `;
    return;
  }
  const html = vehicles.map(v => renderCard(v, currentView)).join('');
  const wrapClass = currentView === 'gallery' ? 'vehicle-gallery-grid' : 'vehicle-list';
  container.innerHTML = `<div class="${wrapClass}">${html}</div>`;
  container.querySelectorAll('.vehicle-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id;
      const vehicle = vehiclesById[id];
      if (vehicle) openVehicleDetail(vehicle);
    });
  });
}

function setView(view) {
  currentView = view;
  localStorage.setItem(VIEW_KEY, view);
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
  Object.entries(cachedData).forEach(([subtabId, vehicles]) => renderSubtab(subtabId, vehicles));
}

export function initVehicleList() {
  const subtabConfig = [
    { status: 'active', container: 'subtab-active' },
    { status: 'sold', container: 'subtab-sold' },
    { status: 'deleted', container: 'subtab-deleted' }
  ];
  subtabConfig.forEach(({ status, container }) => {
    if (unsubFns[status]) unsubFns[status]();
    unsubFns[status] = listenVehicles(status, (vehicles) => {
      cachedData[container] = vehicles;
      vehicles.forEach(v => { vehiclesById[v.id] = v; });
      renderSubtab(container, vehicles);
    });
  });
  document.querySelectorAll('.view-toggle-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === currentView);
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
}

export function stopVehicleList() {
  Object.values(unsubFns).forEach(fn => fn && fn());
  unsubFns = {};
}
