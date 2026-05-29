// ============================================================
// vehicles-db.js — v13 (Faz 6.C: sadece versiyon, içerik aynı)
// ============================================================
import { db, auth } from "./firebase.js?v=14";
import {
  collection, doc, addDoc, getDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp,
  arrayUnion, arrayRemove
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

export async function addVehicle(vehicle) {
  const user = auth.currentUser;
  const username = user?.email?.split('@')[0] || 'bilinmiyor';
  const data = {
    brand: vehicle.selectedBrand, model: vehicle.selectedModel,
    series: vehicle.selectedSeries || null, purchasePrice: vehicle.purchasePrice,
    year: vehicle.year, km: vehicle.km, transmission: vehicle.transmission,
    fuel: vehicle.fuel, bodyType: vehicle.bodyType, enginePower: vehicle.enginePower,
    customEnginePower: vehicle.customEnginePower, drive: vehicle.drive,
    doors: vehicle.doors, heavyDamage: vehicle.heavyDamage, damage: vehicle.damage || {},
    status: 'active', createdAt: serverTimestamp(), createdBy: username,
    coverPhotoId: null, coverPhotoData: null, photoCount: 0,
    expenses: [], soldAt: null, soldPrice: null, deletedAt: null
  };
  const ref = await addDoc(collection(db, 'vehicles'), data);
  console.log('✅ Araç eklendi:', ref.id);
  return ref.id;
}

/**
 * Mevcut aracı güncelle (Faz 7.A)
 * Sadece wizard alanlarını günceller, foto/masraf/status alanlarına dokunmaz
 */
export async function updateVehicle(vehicleId, vehicle) {
  const user = auth.currentUser;
  const username = user?.email?.split('@')[0] || 'bilinmiyor';
  const updates = {
    brand: vehicle.selectedBrand,
    model: vehicle.selectedModel,
    series: vehicle.selectedSeries || null,
    purchasePrice: vehicle.purchasePrice,
    year: vehicle.year,
    km: vehicle.km,
    transmission: vehicle.transmission,
    fuel: vehicle.fuel,
    bodyType: vehicle.bodyType,
    enginePower: vehicle.enginePower,
    customEnginePower: vehicle.customEnginePower,
    drive: vehicle.drive,
    doors: vehicle.doors,
    heavyDamage: vehicle.heavyDamage,
    damage: vehicle.damage || {},
    updatedAt: serverTimestamp(),
    updatedBy: username
  };
  const ref = doc(db, 'vehicles', vehicleId);
  await updateDoc(ref, updates);
  console.log('✏️ Araç güncellendi:', vehicleId);
  return vehicleId;
}

// ============================================================
// MASRAF İŞLEMLERİ (Faz 7.B)
// ============================================================

/**
 * Masraf ekle
 * expense: { date: "YYYY-MM-DD", description: string, amount: number }
 */
export async function addExpense(vehicleId, expense) {
  const user = auth.currentUser;
  const username = user?.email?.split('@')[0] || 'bilinmiyor';

  const expenseRecord = {
    id: 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
    date: expense.date,
    description: expense.description || '',
    amount: Number(expense.amount) || 0,
    createdAt: new Date().toISOString(),
    createdBy: username
  };

  const ref = doc(db, 'vehicles', vehicleId);
  await updateDoc(ref, {
    expenses: arrayUnion(expenseRecord)
  });
  console.log('💸 Masraf eklendi:', expenseRecord.id);
  return expenseRecord;
}

/**
 * Masraf sil
 * expense: tam masraf objesi (Firestore arrayRemove tam eşleşme arar)
 */
export async function removeExpense(vehicleId, expense) {
  const ref = doc(db, 'vehicles', vehicleId);
  await updateDoc(ref, {
    expenses: arrayRemove(expense)
  });
  console.log('🗑️ Masraf silindi:', expense.id);
}

export function listenVehicles(status, callback) {
  const q = query(collection(db, 'vehicles'), where('status', '==', status));
  return onSnapshot(q,
    (snapshot) => {
      const vehicles = [];
      snapshot.forEach(d => vehicles.push({ id: d.id, ...d.data() }));
      vehicles.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      callback(vehicles);
    },
    (error) => { console.error('Araç dinleme hatası:', error); callback([]); }
  );
}

export function listenVehicle(vehicleId, callback) {
  const ref = doc(db, 'vehicles', vehicleId);
  return onSnapshot(ref,
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (error) => { console.error('Araç dinleme hatası:', error); callback(null); }
  );
}

export function listenVehiclePhotos(vehicleId, callback) {
  const photosRef = collection(db, 'vehicles', vehicleId, 'photos');
  return onSnapshot(photosRef,
    (snapshot) => {
      const photos = [];
      snapshot.forEach(d => photos.push({ id: d.id, ...d.data() }));
      photos.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
      callback(photos);
    },
    (error) => { console.error('Foto dinleme hatası:', error); callback([]); }
  );
}

export async function addPhoto(vehicleId, base64Data) {
  const user = auth.currentUser;
  const username = user?.email?.split('@')[0] || 'bilinmiyor';
  const photosRef = collection(db, 'vehicles', vehicleId, 'photos');
  const photoRef = await addDoc(photosRef, {
    data: base64Data, uploadedAt: serverTimestamp(), uploadedBy: username
  });
  const vehicleRef = doc(db, 'vehicles', vehicleId);
  const vehicleSnap = await getDoc(vehicleRef);
  const vehicleData = vehicleSnap.data();
  const updates = { photoCount: (vehicleData.photoCount || 0) + 1 };
  if (!vehicleData.coverPhotoId) {
    updates.coverPhotoId = photoRef.id;
    updates.coverPhotoData = base64Data;
  }
  await updateDoc(vehicleRef, updates);
  console.log('📷 Foto eklendi:', photoRef.id);
  return photoRef.id;
}

export async function removePhoto(vehicleId, photoId) {
  const photoRef = doc(db, 'vehicles', vehicleId, 'photos', photoId);
  await deleteDoc(photoRef);
  const vehicleRef = doc(db, 'vehicles', vehicleId);
  const vehicleSnap = await getDoc(vehicleRef);
  const vehicleData = vehicleSnap.data();
  const updates = { photoCount: Math.max(0, (vehicleData.photoCount || 1) - 1) };
  if (vehicleData.coverPhotoId === photoId) {
    const photosRef = collection(db, 'vehicles', vehicleId, 'photos');
    const snapshot = await new Promise((resolve) => {
      const unsub = onSnapshot(photosRef, (snap) => { unsub(); resolve(snap); });
    });
    if (snapshot.empty) {
      updates.coverPhotoId = null;
      updates.coverPhotoData = null;
    } else {
      const firstDoc = snapshot.docs[0];
      updates.coverPhotoId = firstDoc.id;
      updates.coverPhotoData = firstDoc.data().data;
    }
  }
  await updateDoc(vehicleRef, updates);
  console.log('🗑️ Foto silindi:', photoId);
}

export async function setCoverPhoto(vehicleId, photoId) {
  const photoRef = doc(db, 'vehicles', vehicleId, 'photos', photoId);
  const photoSnap = await getDoc(photoRef);
  if (!photoSnap.exists()) throw new Error('Foto bulunamadı');
  const vehicleRef = doc(db, 'vehicles', vehicleId);
  await updateDoc(vehicleRef, {
    coverPhotoId: photoId, coverPhotoData: photoSnap.data().data
  });
  console.log('⭐ Vitrin değiştirildi:', photoId);
}

console.log('🚗 vehicles-db.js v14 yüklendi (Faz 7.B: addExpense, removeExpense)');
