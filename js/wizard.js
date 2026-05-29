// ============================================================
// wizard.js — Yeni araç ekleme wizard'ı (Faz 6.C v13)
// Step 1: marka/model/seri | Step 2: bilgiler | Step 3: hasar + kaydet
// ============================================================
console.log('🧙 wizard.js v14 yüklendi (Faz 7.A)');

import {
  getAllBrands,
  addBrand,
  addModel,
  addSeries,
  getModelsForBrand,
  getSeriesForModel
} from "./brands-db.js?v=13";
import { createSearchableList } from "./vehicle-search.js?v=13";
import {
  createYearWheel,
  createSegmented,
  createDropdown,
  createNumberInput,
  createRadioGroup,
  createToggle
} from "./form-components.js?v=13";
import { createDamageDiagram } from "./damage-diagram.js?v=13";
import { addVehicle, updateVehicle } from "./vehicles-db.js?v=13";

const wizard = document.getElementById('add-vehicle-wizard');
const closeBtn = document.getElementById('wizard-close');
const nextBtn = document.getElementById('wizard-next');
const prevBtn = document.getElementById('wizard-prev');
const stepNumEl = document.querySelector('.wizard-step-indicator .step-num');

const initialState = () => ({
  isOpen: false,
  step: 1,
  brands: {},

  // Düzenleme modu (Faz 7.A)
  editingVehicleId: null, // null = yeni araç, dolu = düzenle

  selectedBrand: null,
  selectedModel: null,
  selectedSeries: null,

  purchasePrice: null,
  year: 2010,
  km: null,
  transmission: null,
  fuel: null,
  bodyType: null,
  enginePower: null,
  customEnginePower: null,
  drive: null,
  doors: null,
  heavyDamage: false,

  damage: {} // Step 3
});

let state = initialState();

let brandSearch = null;
let modelSearch = null;
let seriesSearch = null;
let step2Components = {};
let damageComponent = null;

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
export async function openWizard(vehicleToEdit = null) {
  if (state.isOpen) return;

  state = initialState();

  // Düzenleme modu — state'i mevcut araç verisiyle doldur
  if (vehicleToEdit) {
    state.editingVehicleId = vehicleToEdit.id;
    state.selectedBrand = vehicleToEdit.brand || null;
    state.selectedModel = vehicleToEdit.model || null;
    state.selectedSeries = vehicleToEdit.series || null;
    state.purchasePrice = vehicleToEdit.purchasePrice ?? null;
    state.year = vehicleToEdit.year || 2010;
    state.km = vehicleToEdit.km ?? null;
    state.transmission = vehicleToEdit.transmission || null;
    state.fuel = vehicleToEdit.fuel || null;
    state.bodyType = vehicleToEdit.bodyType || null;
    state.enginePower = vehicleToEdit.enginePower || null;
    state.customEnginePower = vehicleToEdit.customEnginePower || null;
    state.drive = vehicleToEdit.drive || null;
    state.doors = vehicleToEdit.doors || null;
    state.heavyDamage = vehicleToEdit.heavyDamage || false;
    state.damage = vehicleToEdit.damage || {};
  }

  state.isOpen = true;
  wizard.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Başlık ve buton metnini moda göre güncelle
  const titleEl = document.querySelector('.wizard-title');
  if (titleEl) {
    titleEl.textContent = vehicleToEdit ? 'Aracı Düzenle' : 'Yeni Araç Ekle';
  }

  resetStep2DOM();
  resetStep3DOM();

  // Düzenleme modunda direkt Step 1'i göster + seçili marka/model/seriyi pill olarak yansıt
  if (vehicleToEdit) {
    // Step 1'deki search'leri açma — direkt pill'leri göster
    showStep(1);
  } else {
    showStep(1);
  }

  const loadingEl = document.getElementById('wizard-loading');
  loadingEl.hidden = false;

  try {
    state.brands = await getAllBrands();
    loadingEl.hidden = true;

    if (vehicleToEdit) {
      // Düzenleme: pill'leri göster, search'ler gizli
      initBrandSearch();
      reflectSelectedBrand();
      if (state.selectedBrand) {
        initModelSearch();
        reflectSelectedModel();
        if (state.selectedModel) {
          initSeriesSearch();
          if (state.selectedSeries) {
            reflectSelectedSeries();
          }
        }
      }
      updateNextButton();
    } else {
      initBrandSearch();
    }
  } catch (err) {
    loadingEl.hidden = true;
    alert('Markalar yüklenemedi: ' + err.message);
    closeWizard(true);
  }
}

// Düzenleme modunda mevcut seçimleri pill olarak yansıt
function reflectSelectedBrand() {
  if (!state.selectedBrand) return;
  const pill = document.getElementById('selected-brand');
  pill.hidden = false;
  pill.querySelector('.pill-text').textContent = state.selectedBrand;
  document.getElementById('brand-search-container').hidden = true;
}

function reflectSelectedModel() {
  if (!state.selectedModel) return;
  const pill = document.getElementById('selected-model');
  document.getElementById('model-block').hidden = false;
  pill.hidden = false;
  pill.querySelector('.pill-text').textContent = state.selectedModel;
  document.getElementById('model-search-container').hidden = true;
}

function reflectSelectedSeries() {
  if (!state.selectedSeries) return;
  const pill = document.getElementById('selected-series');
  document.getElementById('series-block').hidden = false;
  pill.hidden = false;
  pill.querySelector('.pill-text').textContent = state.selectedSeries;
  document.getElementById('series-search-container').hidden = true;
}

function hasAnyData() {
  return state.selectedBrand || state.purchasePrice || state.km || state.transmission ||
         state.fuel || state.bodyType || state.enginePower || state.drive || state.doors ||
         Object.keys(state.damage).length > 0;
}

function closeWizard(skipConfirm = false) {
  const isEditing = !!state.editingVehicleId;
  if (!skipConfirm && hasAnyData()) {
    const msg = isEditing
      ? 'Düzenlemeyi iptal etmek istediğine emin misin? Yaptığın değişiklikler kaybolacak.'
      : 'Çıkmak istediğine emin misin? Yaptığın tüm değişiklikler silinecek.';
    if (!confirm(msg)) {
      return;
    }
  }
  wizard.classList.remove('open');
  document.body.style.overflow = '';

  // Wizard başlığını varsayılana çevir
  const titleEl = document.querySelector('.wizard-title');
  if (titleEl) titleEl.textContent = 'Yeni Araç Ekle';

  step2Components = {};
  damageComponent = null;
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

function resetStep3DOM() {
  const container = document.querySelector('[data-component="damage-diagram"]');
  if (container) container.innerHTML = '';
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
    const isEditing = !!state.editingVehicleId;
    nextBtn.querySelector('.btn-text').textContent = isEditing ? '✓ Güncelle' : '✓ Kaydet';
    if (!damageComponent) {
      initStep3();
    }
    updateNextButton();
  }

  document.querySelector('.wizard-body').scrollTop = 0;
}

// ============================================================
// STEP 1
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
// STEP 2
// ============================================================
function initStep2() {
  const summaryEl = document.getElementById('step2-summary');
  const summaryText = [state.selectedBrand, state.selectedModel, state.selectedSeries]
    .filter(Boolean).join(' · ');
  summaryEl.querySelector('.summary-value').textContent = summaryText;

  step2Components.purchasePrice = createNumberInput({
    container: document.querySelector('[data-component="purchase-price"]'),
    placeholder: '0', suffix: '₺', value: state.purchasePrice,
    onChange: (v) => { state.purchasePrice = v; }
  });

  step2Components.year = createYearWheel({
    container: document.querySelector('[data-component="year"]'),
    min: 1980, max: 2026, value: state.year,
    onChange: (v) => { state.year = v; }
  });

  step2Components.km = createNumberInput({
    container: document.querySelector('[data-component="km"]'),
    placeholder: '0', suffix: 'km', value: state.km,
    onChange: (v) => { state.km = v; }
  });

  step2Components.transmission = createSegmented({
    container: document.querySelector('[data-component="transmission"]'),
    options: [
      { value: 'otomatik', label: 'Otomatik' },
      { value: 'manuel', label: 'Manuel' }
    ],
    value: state.transmission,
    onChange: (v) => { state.transmission = v; }
  });

  step2Components.fuel = createDropdown({
    container: document.querySelector('[data-component="fuel"]'),
    options: FUEL_OPTIONS, placeholder: 'Yakıt tipi seç', value: state.fuel,
    onChange: (v) => { state.fuel = v; }
  });

  step2Components.bodyType = createDropdown({
    container: document.querySelector('[data-component="body-type"]'),
    options: BODY_OPTIONS, placeholder: 'Kasa tipi seç', value: state.bodyType,
    onChange: (v) => {
      state.bodyType = v;
      if (BODY_TO_DOORS[v]) {
        state.doors = BODY_TO_DOORS[v];
        if (step2Components.doors) step2Components.doors.setValue(BODY_TO_DOORS[v]);
      }
    }
  });

  const customEngineBlock = document.querySelector('[data-component="custom-engine-power"]');
  step2Components.enginePower = createDropdown({
    container: document.querySelector('[data-component="engine-power"]'),
    options: ENGINE_POWER_OPTIONS, placeholder: 'Motor gücü seç', value: state.enginePower,
    onChange: (v) => {
      state.enginePower = v;
      if (v === 'custom') {
        customEngineBlock.hidden = false;
        if (!step2Components.customEnginePower) {
          step2Components.customEnginePower = createNumberInput({
            container: customEngineBlock,
            placeholder: 'Tam HP değeri (örn. 156)',
            suffix: 'HP', value: state.customEnginePower, maxLength: 4,
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

  step2Components.drive = createDropdown({
    container: document.querySelector('[data-component="drive"]'),
    options: DRIVE_OPTIONS, placeholder: 'Çekiş tipi seç', value: state.drive,
    onChange: (v) => { state.drive = v; }
  });

  step2Components.doors = createRadioGroup({
    container: document.querySelector('[data-component="doors"]'),
    options: [{value:'2',label:'2'},{value:'3',label:'3'},{value:'4',label:'4'},{value:'5',label:'5'}],
    value: state.doors,
    onChange: (v) => { state.doors = v; }
  });

  step2Components.heavyDamage = createToggle({
    container: document.querySelector('[data-component="heavy-damage"]'),
    value: state.heavyDamage,
    labels: { on: 'Evet', off: 'Hayır' },
    onChange: (v) => { state.heavyDamage = v; }
  });
}

// ============================================================
// STEP 3 — HASAR ŞEMASI
// ============================================================
function initStep3() {
  const summaryEl = document.getElementById('step3-summary');
  if (summaryEl) {
    const summaryText = [state.selectedBrand, state.selectedModel, state.selectedSeries]
      .filter(Boolean).join(' · ');
    summaryEl.querySelector('.summary-value').textContent = summaryText;
  }

  damageComponent = createDamageDiagram({
    container: document.querySelector('[data-component="damage-diagram"]'),
    initialData: state.damage,
    onChange: (data) => { state.damage = data; }
  });
}

// ============================================================
// İLERİ / GERİ / KAYDET
// ============================================================
function updateNextButton() {
  if (state.step === 1) {
    nextBtn.disabled = !(state.selectedBrand && state.selectedModel);
  } else {
    nextBtn.disabled = false;
  }
}

async function handleNext() {
  if (state.step === 1) {
    if (!state.selectedBrand || !state.selectedModel) return;
    showStep(2);
  } else if (state.step === 2) {
    showStep(3);
  } else if (state.step === 3) {
    await saveVehicle();
  }
}

async function saveVehicle() {
  const isEditing = !!state.editingVehicleId;
  nextBtn.disabled = true;
  nextBtn.querySelector('.btn-text').textContent = isEditing ? 'Güncelleniyor...' : 'Kaydediliyor...';

  try {
    if (isEditing) {
      await updateVehicle(state.editingVehicleId, state);
    } else {
      await addVehicle(state);
    }
    // Başarılı — wizard'ı kapat
    state.isOpen = true; // hasAnyData kontrolünü atla
    closeWizard(true);
    showToast(isEditing ? '✓ Araç güncellendi' : '✓ Araç başarıyla eklendi');
  } catch (err) {
    console.error('Kaydetme hatası:', err);
    nextBtn.disabled = false;
    nextBtn.querySelector('.btn-text').textContent = isEditing ? '✓ Güncelle' : '✓ Kaydet';
    alert((isEditing ? 'Güncelleme' : 'Kaydetme') + ' başarısız: ' + err.message);
  }
}

function showToast(message) {
  let toast = document.getElementById('app-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = 'app-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

function handlePrev() {
  if (state.step === 2) showStep(1);
  else if (state.step === 3) showStep(2);
}

// EVENT LISTENERS
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
