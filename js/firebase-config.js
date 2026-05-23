// Firebase yapılandırma bilgileri
// Bu dosyayı paylaşmakta sakınca yok, güvenlik Firestore kuralları ile sağlanır

export const firebaseConfig = {
  apiKey: "AIzaSyA_aOdJkKjGIBMsDtlY2R2URKNVU_TN2WY",
  authDomain: "selenium-otomotiv.firebaseapp.com",
  projectId: "selenium-otomotiv",
  storageBucket: "selenium-otomotiv.firebasestorage.app",
  messagingSenderId: "974866670013",
  appId: "1:974866670013:web:c57ddf1b3d51e7730572d4"
};

// Kullanıcı adı sistemi için sabit domain
// Giriş ekranında "raven" yazılacak, JS arkada "raven@selenium.local" yapıp Firebase'e gönderecek
export const USER_DOMAIN = "@selenium.local";
