// ============================================================
// brands-db.js — Firestore marka/model/seri okuma & yazma
// ============================================================
import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Cache — markaları sık sık çekmemek için
let _cache = null;
let _cacheTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 dakika

/**
 * Tüm markaları getir
 * Sonuç: { "Honda": { "Accord": { series: [] }, ... }, "BMW": {...}, ... }
 */
export async function getAllBrands(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && _cache && (now - _cacheTime) < CACHE_DURATION) {
    return _cache;
  }

  const snapshot = await getDocs(collection(db, 'brands'));
  const brands = {};
  snapshot.forEach(d => {
    const data = d.data();
    brands[data.name] = data.models || {};
  });

  _cache = brands;
  _cacheTime = now;
  console.log(`📥 ${Object.keys(brands).length} marka yüklendi`);
  return brands;
}

/**
 * Yeni marka ekle (boş models ile)
 */
export async function addBrand(brandName) {
  const trimmed = brandName.trim();
  if (!trimmed) throw new Error('Marka adı boş olamaz');

  if (_cache && _cache[trimmed]) {
    throw new Error('Bu marka zaten var');
  }

  await setDoc(doc(db, 'brands', trimmed), {
    name: trimmed,
    models: {},
    createdAt: new Date().toISOString()
  });

  // Cache güncelle
  if (_cache) _cache[trimmed] = {};
  console.log(`➕ Marka eklendi: ${trimmed}`);
}

/**
 * Bir markaya yeni model ekle
 */
export async function addModel(brandName, modelName) {
  const trimmed = modelName.trim();
  if (!trimmed) throw new Error('Model adı boş olamaz');
  if (!_cache?.[brandName]) {
    throw new Error('Önce markayı seç');
  }
  if (_cache[brandName][trimmed]) {
    throw new Error('Bu model zaten var');
  }

  const brandRef = doc(db, 'brands', brandName);
  await updateDoc(brandRef, {
    [`models.${trimmed}`]: { series: [] }
  });

  if (_cache && _cache[brandName]) {
    _cache[brandName][trimmed] = { series: [] };
  }
  console.log(`➕ Model eklendi: ${brandName} → ${trimmed}`);
}

/**
 * Bir modele yeni seri ekle
 */
export async function addSeries(brandName, modelName, seriesName) {
  const trimmed = seriesName.trim();
  if (!trimmed) throw new Error('Seri adı boş olamaz');

  const existing = _cache?.[brandName]?.[modelName]?.series || [];
  if (existing.includes(trimmed)) {
    throw new Error('Bu seri zaten var');
  }

  const brandRef = doc(db, 'brands', brandName);
  await updateDoc(brandRef, {
    [`models.${modelName}.series`]: arrayUnion(trimmed)
  });

  if (_cache?.[brandName]?.[modelName]) {
    if (!_cache[brandName][modelName].series) {
      _cache[brandName][modelName].series = [];
    }
    _cache[brandName][modelName].series.push(trimmed);
  }
  console.log(`➕ Seri eklendi: ${brandName} → ${modelName} → ${trimmed}`);
}

/**
 * Bir marka için model listesi (sıralı)
 */
export function getModelsForBrand(brandName) {
  if (!_cache || !_cache[brandName]) return [];
  return Object.keys(_cache[brandName])
    .sort((a, b) => a.toLocaleLowerCase('tr').localeCompare(b.toLocaleLowerCase('tr'), 'tr'));
}

/**
 * Bir model için seri listesi
 */
export function getSeriesForModel(brandName, modelName) {
  if (!_cache?.[brandName]?.[modelName]) return [];
  return [...(_cache[brandName][modelName].series || [])].sort();
}

/**
 * Cache'i temizle
 */
export function clearBrandsCache() {
  _cache = null;
  _cacheTime = 0;
}
