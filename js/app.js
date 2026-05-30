// ============================================================
// FAZ 8 — Ana uygulama
// ============================================================
import { onAuthChange, login, logout, emailToUsername } from "./auth.js?v=15";
import { openWizard } from "./wizard.js?v=15";
import { initVehicleList, stopVehicleList } from "./vehicle-list.js?v=15";
import { showConfirm } from "./ui-dialogs.js?v=15";
import { initHomeStats, stopHomeStats } from "./home-stats.js?v=17";

const screens = {
  splash: document.getElementById('splash-screen'),
  login: document.getElementById('login-screen'),
  home: document.getElementById('home-screen')
};
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

let vehicleListInitialized = false;
let homeStatsInitialized = false;

onAuthChange(user => {
  if (user) {
    document.getElementById('welcome-name').textContent = emailToUsername(user.email);
    showScreen('home');
    console.log('✅ Giriş yapıldı:', emailToUsername(user.email));
    if (!vehicleListInitialized) { initVehicleList(); vehicleListInitialized = true; }
    if (!homeStatsInitialized) {
      const statsContainer = document.getElementById('home-stats-container');
      if (statsContainer) {
        initHomeStats(statsContainer);
        homeStatsInitialized = true;
      }
    }
  } else {
    showScreen('login');
    if (vehicleListInitialized) { stopVehicleList(); vehicleListInitialized = false; }
    if (homeStatsInitialized) { stopHomeStats(); homeStatsInitialized = false; }
  }
});

const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginError = document.getElementById('login-error');
const loginButton = document.getElementById('login-button');
const buttonText = loginButton.querySelector('.button-text');
const buttonLoader = loginButton.querySelector('.button-loader');

function showError(msg) { loginError.textContent = msg; loginError.hidden = false; }
function clearError() { loginError.hidden = true; loginError.textContent = ''; }
function setLoading(loading) {
  loginButton.disabled = loading;
  buttonText.hidden = loading;
  buttonLoader.hidden = !loading;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  if (!username || !password) { showError('Kullanıcı adı ve şifre gerekli'); return; }
  setLoading(true);
  try {
    await login(username, password);
    passwordInput.value = '';
  } catch (error) {
    setLoading(false);
    showError(translateAuthError(error.code));
  }
});

const togglePassword = document.getElementById('toggle-password');
togglePassword.addEventListener('click', () => {
  const isPwd = passwordInput.type === 'password';
  passwordInput.type = isPwd ? 'text' : 'password';
  togglePassword.classList.toggle('visible', isPwd);
});

const logoutButton = document.getElementById('logout-button');
logoutButton.addEventListener('click', async () => {
  const ok = await showConfirm({
    title: 'Çıkış',
    message: 'Çıkış yapmak istediğine emin misin?',
    confirmText: 'Çıkış Yap',
    cancelText: 'İptal'
  });
  if (!ok) return;
  try {
    await logout();
    loginForm.reset();
    clearError();
    setLoading(false);
    switchTab('home');
  } catch (error) { console.error('Çıkış hatası:', error); }
});

function translateAuthError(code) {
  const errors = {
    'auth/invalid-credential': 'Kullanıcı adı veya şifre hatalı',
    'auth/invalid-email': 'Geçersiz kullanıcı adı',
    'auth/user-not-found': 'Böyle bir kullanıcı yok',
    'auth/wrong-password': 'Şifre hatalı',
    'auth/too-many-requests': 'Çok fazla deneme yaptın, biraz bekle',
    'auth/network-request-failed': 'İnternet bağlantısı yok',
    'auth/user-disabled': 'Bu hesap devre dışı',
    'auth/missing-password': 'Şifre boş olamaz'
  };
  return errors[code] || 'Giriş başarısız, tekrar dene';
}

const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');
function switchTab(tabName) {
  navItems.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  tabContents.forEach(c => c.classList.toggle('active', c.id === `tab-${tabName}`));
}
navItems.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

const subTabs = document.querySelectorAll('.sub-tab');
const subTabContents = document.querySelectorAll('.sub-tab-content');
subTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.subtab;
    subTabs.forEach(b => b.classList.toggle('active', b.dataset.subtab === target));
    subTabContents.forEach(c => { c.hidden = (c.id !== `subtab-${target}`); });
  });
});

const addVehicleBtn = document.getElementById('add-vehicle-btn');
if (addVehicleBtn) addVehicleBtn.addEventListener('click', openWizard);

console.log('🚗 Selenium Otomotiv v1.2 — Faz 8 v17 yüklendi');
