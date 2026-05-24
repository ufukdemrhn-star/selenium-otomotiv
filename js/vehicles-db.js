// ============================================================
// vehicles-db.js — Firestore araç işlemleri
// ============================================================
import { db, auth } from "./firebase.js?v=9";
import {
  collection,
  doc,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

/**
 * Yeni araç ekle
 * vehicle: tüm wizard verisi
 * Dönüş: yeni doc ID
 */
export async function addVehicle(vehicle) {
  const user = auth.currentUser;
  const username = user?.email?.split('@')[0] || 'bilinmiyor';

  const data = {
    // Wizard verisi
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
    damage: vehicle.damage || {}, // hasar şeması verisi

    // Sistem
    status: 'active', // active | sold | deleted
    createdAt: serverTimestamp(),
    createdBy: username,

    // İleride doldurulacak (Faz 6+)
    photos: [],
    expenses: [],
    soldAt: null,
    soldPrice: null,
    deletedAt: null
  };

  const ref = await addDoc(collection(db, 'vehicles'), data);
  console.log('✅ Araç eklendi:', ref.id);
  return ref.id;
}

/**
 * Aktif/Satılan/Silinen araçları real-time dinle
 * Dönüş: unsubscribe fonksiyonu
 */
export function listenVehicles(status, callback) {
  // Index gereksinimini önlemek için orderBy yok, client-side sıralayacağız
  const q = query(
    collection(db, 'vehicles'),
    where('status', '==', status)
  );

  return onSnapshot(q,
    (snapshot) => {
      const vehicles = [];
      snapshot.forEach(d => {
        vehicles.push({ id: d.id, ...d.data() });
      });

      // Client-side sıralama: yeniden eskiye (createdAt'e göre)
      vehicles.sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      });

      callback(vehicles);
    },
    (error) => {
      console.error('Araç dinleme hatası:', error);
      callback([]);
    }
  );
}
