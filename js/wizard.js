// ============================================================
// wizard.js — Yeni araç ekleme wizard'ı
// Faz 3.B: Adım 1 — Marka/Model/Seri seçimi
// Sonraki fazlarda araç bilgileri formu + hasar şeması eklenecek
// ============================================================
import {
  getAllBrands,
  addBrand,
  addModel,
  addSeries,
  getModelsForBrand,
  getSeriesForModel
} from "./brands-db.js";
import { createSearchableList } from "./vehicle-search.js";

const wizard = document.getElementById('add-vehicle-wizard');
const closeBtn = document.getElementById('wizard-close');
const nextBtn = document.getElementById('wizard-next');
const prevBtn = document.getElementById('wizard-prev');

// State
let state = {
  isOpen: false,
  step: 1,
  selectedBrand: null,
  selectedModel: null,
  selectedSeries: null,
  brands: {}
};

let brandSearch = null;
let modelSearch = null;
let seriesSearch = null;

// ============================================================
// AÇMA / KAPAMA
// ============================================================
export async function openWizard() {
  if (state.isOpen) return;

  // Önce reset
  resetState();
  wizard.classList.add('open');
  document.body.style.overflow = 'hidden';
  state.isOpen = true;

  // Loading göster
  const loadingEl = document.getElementById('wizard-loading');
  loadingEl.hidden = false;

  try {
    state.brands = await getAllBrands();
    loadingEl.hidden = true;
    initBrandSearch();
  } catch (err) {
    loadingEl.hidden = true;
    alert('Markalar yüklenemedi: ' + err.message);
    closeWizard(true);
  }
}

function closeWizard(skipConfirm = false) {
  if (!skipConfirm && (state.selectedBrand || state.selectedModel || state.selectedSeries)) {
    if (!confirm('Çıkmak istediğine emin misin? Yaptığın değişiklikler silinecek.')) {
      return;
    }
  }
  wizard.classList.remove('open');
  document.body.style.overflow = '';
  resetState();
}

function resetState() {
  state.step = 1;
  state.selectedBrand = null;
  state.selectedModel = null;
  state.selectedSeries = null;
  state.isOpen = false;

  // Tüm pill'leri ve blokları gizle
  document.getElementById('selected-brand').hidden = true;
  document.getElementById('selected-model').hidden = true;
  document.getElementById('selected-series').hidden = true;
  document.getElementById('brand-search-container').hidden = false;
  document.getElementById('model-block').hidden = true;
  document.getElementById('series-block').hidden = true;

  // Search container'ları temizle
  document.getElementById('brand-search-container').innerHTML = '';
  document.getElementById('model-search-container').innerHTML = '';
  document.getElementById('series-search-container').innerHTML = '';

  updateNextButton();
}

// ============================================================
// MARKA ARAMA
// ============================================================
function initBrandSearch() {
  const container = document.getElementById('brand-search-container');
  const brandNames = Object.keys(state.brands);

  brandSearch = createSearchableList({
    container,
    items: brandNames,
    placeholder: 'Marka ara (örn. honda, BMW, ferrari)...',
    onSelect: selectBrand,
    onAddNew: addNewBrand,
    autoFocus: true
  });
}

function selectBrand(brandName) {
  state.selectedBrand = brandName;
  state.selectedModel = null;
  state.selectedSeries = null;

  // Pill göster
  const pill = document.getElementById('selected-brand');
  pill.hidden = false;
  pill.querySelector('.pill-text').textContent = brandName;

  // Search container'ı gizle
  document.getElementById('brand-search-container').hidden = true;

  // Model bloğunu aç
  initModelSearch();

  // Diğer pill'leri ve series bloğunu gizle
  document.getElementById('selected-model').hidden = true;
  document.getElementById('selected-series').hidden = true;
  document.getElementById('series-block').hidden = true;

  updateNextButton();
}

function clearBrand() {
  state.selectedBrand = null;
  state.selectedModel = null;
  state.selectedSeries = null;

  document.getElementById('selected-brand').hidden = true;
  document.getElementById('brand-search-container').hidden = false;
  document.getElementById('model-block').hidden = true;
  document.getElementById('series-block').hidden = true;
  document.getElementById('selected-model').hidden = true;
  document.getElementById('selected-series').hidden = true;

  if (brandSearch) brandSearch.clear();
  setTimeout(() => brandSearch && brandSearch.focus(), 50);

  updateNextButton();
}

async function addNewBrand(brandName) {
  if (!confirm(`"${brandName}" markası kalıcı olarak listeye eklenecek. Onaylıyor musun?`)) return;

  try {
    await addBrand(brandName);
    state.brands[brandName] = {};
    selectBrand(brandName);
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

// ============================================================
// MODEL ARAMA
// ============================================================
function initModelSearch() {
  const container = document.getElementById('model-search-container');
  const modelBlock = document.getElementById('model-block');
  modelBlock.hidden = false;
  container.hidden = false;

  const models = getModelsForBrand(state.selectedBrand);

  modelSearch = createSearchableList({
    container,
    items: models,
    placeholder: 'Model ara...',
    onSelect: selectModel,
    onAddNew: addNewModel
  });
}

function selectModel(modelName) {
  state.selectedModel = modelName;
  state.selectedSeries = null;

  const pill = document.getElementById('selected-model');
  pill.hidden = false;
  pill.querySelector('.pill-text').textContent = modelName;

  document.getElementById('model-search-container').hidden = true;

  initSeriesSearch();

  document.getElementById('selected-series').hidden = true;

  updateNextButton();
}

function clearModel() {
  state.selectedModel = null;
  state.selectedSeries = null;

  document.getElementById('selected-model').hidden = true;
  document.getElementById('model-search-container').hidden = false;
  document.getElementById('series-block').hidden = true;
  document.getElementById('selected-series').hidden = true;

  if (modelSearch) modelSearch.clear();
  setTimeout(() => modelSearch && modelSearch.focus(), 50);

  updateNextButton();
}

async function addNewModel(modelName) {
  if (!state.selectedBrand) return;
  if (!confirm(`"${modelName}" modeli "${state.selectedBrand}" markasının altına eklenecek. Onaylıyor musun?`)) return;

  try {
    await addModel(state.selectedBrand, modelName);
    selectModel(modelName);
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

// ============================================================
// SERİ ARAMA
// ============================================================
function initSeriesSearch() {
  const container = document.getElementById('series-search-container');
  const seriesBlock = document.getElementById('series-block');
  seriesBlock.hidden = false;
  container.hidden = false;

  const seriesList = getSeriesForModel(state.selectedBrand, state.selectedModel);

  seriesSearch = createSearchableList({
    container,
    items: seriesList,
    placeholder: 'Seri ara veya yenisini yaz (opsiyonel)...',
    onSelect: selectSeries,
    onAddNew: addNewSeries
  });
}

function selectSeries(seriesName) {
  state.selectedSeries = seriesName;

  const pill = document.getElementById('selected-series');
  pill.hidden = false;
  pill.querySelector('.pill-text').textContent = seriesName;

  document.getElementById('series-search-container').hidden = true;

  updateNextButton();
}

function clearSeries() {
  state.selectedSeries = null;
  document.getElementById('selected-series').hidden = true;
  document.getElementById('series-search-container').hidden = false;
  if (seriesSearch) seriesSearch.clear();
  updateNextButton();
}

async function addNewSeries(seriesName) {
  if (!state.selectedBrand || !state.selectedModel) return;
  if (!confirm(`"${seriesName}" serisi "${state.selectedBrand} ${state.selectedModel}" altına eklenecek. Onaylıyor musun?`)) return;

  try {
    await addSeries(state.selectedBrand, state.selectedModel, seriesName);
    selectSeries(seriesName);
  } catch (err) {
    alert('Hata: ' + err.message);
  }
}

// ============================================================
// İLERİ / GERİ
// ============================================================
function updateNextButton() {
  // Marka + Model zorunlu, Seri opsiyonel
  const canProceed = state.selectedBrand && state.selectedModel;
  nextBtn.disabled = !canProceed;
}

function handleNext() {
  if (!state.selectedBrand || !state.selectedModel) return;

  // Faz 4'te buraya araç bilgileri formu gelecek
  const selection = [
    `Marka: ${state.selectedBrand}`,
    `Model: ${state.selectedModel}`,
    `Seri: ${state.selectedSeries || '(boş bırakıldı)'}`
  ].join('\n');

  alert(`✓ Araç seçildi:\n\n${selection}\n\nFaz 4'te bu noktadan sonra araç bilgileri formu (yıl, KM, vites, yakıt vs.) gelecek.`);
}

// ============================================================
// EVENT LISTENERS
// ============================================================
closeBtn.addEventListener('click', () => closeWizard());
nextBtn.addEventListener('click', handleNext);

// Pill clear butonları
document.querySelector('#selected-brand .pill-clear').addEventListener('click', clearBrand);
document.querySelector('#selected-model .pill-clear').addEventListener('click', clearModel);
document.querySelector('#selected-series .pill-clear').addEventListener('click', clearSeries);

// ESC tuşu ile çıkış
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.isOpen) {
    closeWizard();
  }
});
