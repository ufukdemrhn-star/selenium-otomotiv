// ============================================================
// wizard.js — Yeni araç ekleme wizard'ı (FAZ 4 v8)
// Step 1: marka/model/seri | Step 2: araç bilgileri (opsiyonel)
// ============================================================
console.log('🧙 wizard.js v8 yüklendi (opsiyonel alanlar + diğer HP + otomatik kapı)');

import {
  getAllBrands,
  addBrand,
  addModel,
  addSeries,
  getModelsForBrand,
  getSeriesForModel
} from "./brands-db.js?v=8";
import { createSearchableList } from "./vehicle-search.js?v=8";
import {
  createYearWheel,
  createSegmented,
  createDropdown,
  createNumberInput,
  createRadioGroup,
  createToggle
} from "./form-components.js?v=8";

const wizard = document.getElementById('add-vehicle-wizard');
const closeBtn = document.getElementById('wizard-close');
const nextBtn = document.getElementById('wizard-next');
const prevBtn = document.getElementById('wizard-prev');
const stepNumEl = document.querySelector('.wizard-step-indicator .step-num');

// ============================================================
// STATE
// ============================================================
const initialState = () => ({
  isOpen: false,
  step: 1,
  brands: {},

  // Step 1
  selectedBrand: null,
  selectedModel: null,
  selectedSeries: null,

  // Step 2 (hepsi opsiyonel)
  purchasePrice: null,
  year: 2010,
  km: null,
  transmission: null,
  fuel: null,
  bodyType: null,
  enginePower: null,         // kategori veya 'custom'
  customEnginePower: null,   // 'custom' seçildiğinde tam sayı
  drive: null,
  doors: null,
  heavyDamage: false
});

let state = initialState();

let brandSearch = null;
let modelSearch = null;
let seriesSearch = null;
let step2Components = {};

// ============================================================
// FORM SEÇENEKLERİ
// ============================================================
const FUEL_OPTIONS = [
  { value: 'benzinli', label: 'Benzinli' },
  { value: 'benzin_lpg', label: 'Benzin & LPG' },
  { value: 'dizel', label: 'Dizel' },
  { value: 'hibrit', label: 'Hibrit' },
  { value: 'elektrikli', label: 'Elektrikli' }
];

const BODY_OPTIONS = [
  { value: 'crossover', label: 'Crossover' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'suv', label: 'SUV' },
  { value: 'cabrio', label: 'Cabrio' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'coupe_4', label: 'Coupe 4 Kapı' },
  { value: 'hatchback_3', label: 'Hatchback 3 Kapı' },
  { value: 'hatchback_5', label: 'Hatchback 5 Kapı' },
  { value: 'sedan', label: 'Sedan' }
];

// Kasa tipi → otomatik kapı sayısı eşlemesi
const BODY_TO_DOORS = {
  'hatchback_3': '3',
  'hatchback_5': '5',
  'sedan': '4'
};

const ENGINE_POWER_OPTIONS = (() => {
  const opts = [
    { value: 'custom', label: '✏️ Diğer (tam değer gir)' },
    { value: 'le50', label: "50 HP'ye kadar" }
  ];
  const ranges = [
    [51, 75], [76, 100], [101, 125], [126, 150], [151, 175], [176, 200],
    [201, 225], [226, 250], [251, 275], [276, 300], [301, 325], [326, 350],
    [351, 375], [376, 400], [401, 425], [426, 450], [451, 475], [476, 500],
    [501, 525], [526, 550], [551, 575], [576, 600]
  ];
  ranges.forEach(([a, b]) => opts.push({ value: `${a}_${b}`, label: `${a} - ${b} HP` }));
  opts.push({ value: 'ge601', label: '601 HP ve üzeri' });
  return opts;
})();

const DRIVE_OPTIONS = [
  { value: 'fwd', label: 'Önden Çekiş' },
  { value: 'rwd', label: 'Arkadan İtiş' },
  { value: '4wd', label: '4WD (Sürekli)' },
  { value: 'awd', label: 'AWD (Elektronik)' },
  { value: '4x2_rwd', label: '4x2 (Arkadan İtişli)' },
  { value: '4x2_fwd', label: '4x2 (Önden Çekişli)' },
  { value: '4x4', label: '4x4' }
];

// ============================================================
// AÇMA / KAPAMA
// ============================================================
export async function openWizard() {
  if (state.isOpen) return;

  state = initialState();
  state.isOpen = true;
  wizard.classList.add('open');
  document.body.style.overflow = 'hidden';

  resetStep2DOM();
  showStep(1);

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

function hasAnyData() {
  return state.selectedBrand || state.purchasePrice || state.km || state.transmission ||
         state.fuel || state.bodyType || state.enginePower || state.drive || state.doors;
}

function closeWizard(skipConfirm = false) {
  if (!skipConfirm && hasAnyData()) {
    if (!confirm('Çıkmak istediğine emin misin? Yaptığın tüm değişiklikler silinecek.')) {
      return;
    }
  }
  wizard.classList.remove('open');
  document.body.style.overflow = '';

  step2Components = {};
  resetStep1DOM();
  state = initialState();
}

function resetStep1DOM() {
  document.getElementById('selected-brand').hidden = true;
  document.getElementById('selected-model').hidden = true;
  document.getElementById('selected-series').hidden = true;
  document.getElementById('brand-search-container').hidden = false;
  document.getElementById('model-block').hidden = true;
  document.getElementById('series-block').hidden = true;
  document.getElementById('brand-search-container').innerHTML = '';
  document.getElementById('model-search-container').innerHTML = '';
  document.getElementById('series-search-container').innerHTML = '';
}

function resetStep2DOM() {
  document.querySelectorAll('#step-2 [data-component]').forEach(el => {
    el.innerHTML = '';
  });
  const customBlock = document.querySelector('[data-component="custom-engine-power"]');
  if (customBlock) customBlock.hidden = true;
}

// ============================================================
// ADIM YÖNETİMİ
// ============================================================
function showStep(n) {
  state.step = n;
  document.querySelectorAll('.wizard-step-content').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.step) === n);
  });
  stepNumEl.textContent = n;
  prevBtn.hidden = (n === 1);

  if (n === 1) {
    nextBtn.querySelector('.btn-text').textContent = 'İleri';
    updateNextButton();
  } else if (n === 2) {
    nextBtn.querySelector('.btn-text').textContent = 'İleri';
    if (Object.keys(step2Components).length === 0) {
      initStep2();
    }
    updateNextButton();
  } else if (n === 3) {
    nextBtn.querySelector('.btn-text').textContent = 'Kaydet';
    updateNextButton();
  }

  document.querySelector('.wizard-body').scrollTop = 0;
}

// ============================================================
// STEP 1 — MARKA / MODEL / SERİ
// ============================================================
function initBrandSearch() {
  const container = document.getElementById('brand-search-container');
  brandSearch = createSearchableList({
    container,
    items: Object.keys(state.brands),
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

  const pill = document.getElementById('selected-brand');
  pill.hidden = false;
  pill.querySelector('.pill-text').textContent = brandName;
  document.getElementById('brand-search-container').hidden = true;

  initModelSearch();

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

function initModelSearch() {
  const container = document.getElementById('model-search-container');
  document.getElementById('model-block').hidden = false;
  container.hidden = false;
  modelSearch = createSearchableList({
    container,
    items: getModelsForBrand(state.selectedBrand),
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

function initSeriesSearch() {
  const container = document.getElementById('series-search-container');
  document.getElementById('series-block').hidden = false;
  container.hidden = false;
  seriesSearch = createSearchableList({
    container,
    items: getSeriesForModel(state.selectedBrand, state.selectedModel),
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
// STEP 2 — ARAÇ BİLGİLERİ (HEPSİ OPSİYONEL)
// ============================================================
function initStep2() {
  // Özet kartı
  const summaryEl = document.getElementById('step2-summary');
  const summaryText = [state.selectedBrand, state.selectedModel, state.selectedSeries]
    .filter(Boolean).join(' · ');
  summaryEl.querySelector('.summary-value').textContent = summaryText;

  // Alış fiyatı
  step2Components.purchasePrice = createNumberInput({
    container: document.querySelector('[data-component="purchase-price"]'),
    placeholder: '0',
    suffix: '₺',
    value: state.purchasePrice,
    onChange: (v) => { state.purchasePrice = v; }
  });

  // Yıl wheel
  step2Components.year = createYearWheel({
    container: document.querySelector('[data-component="year"]'),
    min: 1980,
    max: 2026,
    value: state.year,
    onChange: (v) => { state.year = v; }
  });

  // KM
  step2Components.km = createNumberInput({
    container: document.querySelector('[data-component="km"]'),
    placeholder: '0',
    suffix: 'km',
    value: state.km,
    onChange: (v) => { state.km = v; }
  });

  // Vites
  step2Components.transmission = createSegmented({
    container: document.querySelector('[data-component="transmission"]'),
    options: [
      { value: 'otomatik', label: 'Otomatik' },
      { value: 'manuel', label: 'Manuel' }
    ],
    value: state.transmission,
    onChange: (v) => { state.transmission = v; }
  });

  // Yakıt
  step2Components.fuel = createDropdown({
    container: document.querySelector('[data-component="fuel"]'),
    options: FUEL_OPTIONS,
    placeholder: 'Yakıt tipi seç',
    value: state.fuel,
    onChange: (v) => { state.fuel = v; }
  });

  // Kasa tipi — seçilince kapı sayısını da otomatik ayarla
  step2Components.bodyType = createDropdown({
    container: document.querySelector('[data-component="body-type"]'),
    options: BODY_OPTIONS,
    placeholder: 'Kasa tipi seç',
    value: state.bodyType,
    onChange: (v) => {
      state.bodyType = v;
      // Otomatik kapı seçimi
      if (BODY_TO_DOORS[v]) {
        state.doors = BODY_TO_DOORS[v];
        if (step2Components.doors) {
          step2Components.doors.setValue(BODY_TO_DOORS[v]);
        }
      }
    }
  });

  // Motor gücü — "Diğer" seçilirse custom input açılır
  const customEngineBlock = document.querySelector('[data-component="custom-engine-power"]');
  step2Components.enginePower = createDropdown({
    container: document.querySelector('[data-component="engine-power"]'),
    options: ENGINE_POWER_OPTIONS,
    placeholder: 'Motor gücü seç',
    value: state.enginePower,
    onChange: (v) => {
      state.enginePower = v;
      if (v === 'custom') {
        // Custom HP input'unu göster ve oluştur (yoksa)
        customEngineBlock.hidden = false;
        if (!step2Components.customEnginePower) {
          step2Components.customEnginePower = createNumberInput({
            container: customEngineBlock,
            placeholder: 'Tam HP değeri (örn. 156)',
            suffix: 'HP',
            value: state.customEnginePower,
            maxLength: 4,
            onChange: (val) => { state.customEnginePower = val; }
          });
          setTimeout(() => {
            const input = customEngineBlock.querySelector('.number-input');
            if (input) input.focus();
          }, 50);
        }
      } else {
        customEngineBlock.hidden = true;
        state.customEnginePower = null;
      }
    }
  });

  // Çekiş
  step2Components.drive = createDropdown({
    container: document.querySelector('[data-component="drive"]'),
    options: DRIVE_OPTIONS,
    placeholder: 'Çekiş tipi seç',
    value: state.drive,
    onChange: (v) => { state.drive = v; }
  });

  // Kapı sayısı (manuel değiştirilebilir, kasa tipinden otomatik ayarlanır)
  step2Components.doors = createRadioGroup({
    container: document.querySelector('[data-component="doors"]'),
    options: [
      { value: '2', label: '2' },
      { value: '3', label: '3' },
      { value: '4', label: '4' },
      { value: '5', label: '5' }
    ],
    value: state.doors,
    onChange: (v) => { state.doors = v; }
  });

  // Ağır hasar
  step2Components.heavyDamage = createToggle({
    container: document.querySelector('[data-component="heavy-damage"]'),
    value: state.heavyDamage,
    labels: { on: 'Evet', off: 'Hayır' },
    onChange: (v) => { state.heavyDamage = v; }
  });
}

// ============================================================
// İLERİ / GERİ
// ============================================================
function updateNextButton() {
  if (state.step === 1) {
    // Step 1: marka + model zorunlu, seri opsiyonel
    nextBtn.disabled = !(state.selectedBrand && state.selectedModel);
  } else if (state.step === 2) {
    // Step 2: tüm alanlar opsiyonel, her zaman ilerleyebilir
    nextBtn.disabled = false;
  }
}

function handleNext() {
  if (state.step === 1) {
    if (!state.selectedBrand || !state.selectedModel) return;
    showStep(2);
  } else if (state.step === 2) {
    // Faz 5'te buradan hasar şemasına geçeceğiz
    const fmt = (v) => (v === null || v === undefined || v === '') ? '(boş)' : v;
    const enginePowerDisplay = state.enginePower === 'custom'
      ? (state.customEnginePower ? `${state.customEnginePower} HP (tam değer)` : '(boş - tam değer girilmedi)')
      : fmt(state.enginePower);

    const summary = `
Marka: ${fmt(state.selectedBrand)}
Model: ${fmt(state.selectedModel)}
Seri: ${fmt(state.selectedSeries)}
Alış fiyatı: ${state.purchasePrice ? state.purchasePrice.toLocaleString('tr-TR') + ' ₺' : '(boş)'}
Yıl: ${state.year}
KM: ${state.km !== null ? state.km.toLocaleString('tr-TR') + ' km' : '(boş)'}
Vites: ${fmt(state.transmission)}
Yakıt: ${fmt(state.fuel)}
Kasa: ${fmt(state.bodyType)}
Motor: ${enginePowerDisplay}
Çekiş: ${fmt(state.drive)}
Kapı: ${fmt(state.doors)}
Hasar kayıt: ${state.heavyDamage ? 'Evet' : 'Hayır'}
    `.trim();
    alert('✓ Bilgiler alındı:\n\n' + summary + '\n\nFaz 5\'te hasar şeması + kaydet butonu gelecek.');
  }
}

function handlePrev() {
  if (state.step === 2) {
    showStep(1);
  }
}

// ============================================================
// EVENT LISTENERS
// ============================================================
closeBtn.addEventListener('click', () => closeWizard());
nextBtn.addEventListener('click', handleNext);
prevBtn.addEventListener('click', handlePrev);

document.querySelector('#selected-brand .pill-clear').addEventListener('click', clearBrand);
document.querySelector('#selected-model .pill-clear').addEventListener('click', clearModel);
document.querySelector('#selected-series .pill-clear').addEventListener('click', clearSeries);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.isOpen) {
    closeWizard();
  }
});
