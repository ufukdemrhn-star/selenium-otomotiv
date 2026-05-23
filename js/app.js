import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// ============================================================
// FAZ 0 — Firebase bağlantı testi
// ============================================================

// Firebase'i başlat
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI elemanlarını yakala
const statusDot = document.querySelector('.status-dot');
const statusLabel = document.querySelector('.status-label');
const statusText = document.getElementById('status-text');

async function testConnection() {
  try {
    statusText.textContent = "Firebase'e bağlanılıyor...";

    // Firestore'a basit bir sorgu at — boş koleksiyon olsa bile cevap dönmeli
    // Test modu açık olduğu için izin sorunu olmamalı
    await getDocs(collection(db, '_baglanti_testi'));

    // ✅ Başarılı
    statusDot.classList.remove('pending');
    statusDot.classList.add('connected');
    statusLabel.classList.add('connected');
    statusLabel.textContent = 'Firebase bağlandı';
    statusText.textContent = "Faz 0 başarılı — sistem hazır ✓";

    console.log('%c✅ Firebase başarıyla bağlandı', 'color: #00d4aa; font-weight: bold; font-size: 14px');
    console.log('Proje:', firebaseConfig.projectId);
    console.log('Auth:', auth);
    console.log('Firestore:', db);
  } catch (error) {
    // ❌ Hata
    statusDot.classList.remove('pending');
    statusDot.classList.add('error');
    statusLabel.classList.add('error');
    statusLabel.textContent = 'Bağlantı hatası';
    statusText.textContent = "Hata: " + error.message;

    console.error('%c❌ Firebase bağlantı hatası', 'color: #ff4757; font-weight: bold; font-size: 14px');
    console.error(error);
  }
}

testConnection();