// ============================================================
// theme-manager.js — Tema renk paletleri + uygulama (Faz 9.A)
// CSS variable'ları değiştirerek tüm uygulamayı renklendirir
// ============================================================

export const THEMES = {
  mineral: {
    name: 'Mineral',
    description: 'Klasik yeşil (varsayılan)',
    icon: '🌿',
    colors: {
      accent: '#00d4aa',
      accentDark: '#00a888',
      accentGlow: 'rgba(0, 212, 170, 0.4)',
      accentBg: 'rgba(0, 212, 170, 0.08)',
      accentBorder: 'rgba(0, 212, 170, 0.3)',
      heroGradientFrom: '#0a2520',
      heroGradientVia: '#0f1f1c',
      heroGradientTo: '#0a1614',
      buttonText: '#003228'
    }
  },
  ocean: {
    name: 'Okyanus',
    description: 'Derin mavi',
    icon: '🌊',
    colors: {
      accent: '#0099ff',
      accentDark: '#0077cc',
      accentGlow: 'rgba(0, 153, 255, 0.4)',
      accentBg: 'rgba(0, 153, 255, 0.08)',
      accentBorder: 'rgba(0, 153, 255, 0.3)',
      heroGradientFrom: '#0a1f30',
      heroGradientVia: '#0f1d2a',
      heroGradientTo: '#0a1620',
      buttonText: '#001f3d'
    }
  },
  lavender: {
    name: 'Lavanta',
    description: 'Mistik mor',
    icon: '💜',
    colors: {
      accent: '#a855f7',
      accentDark: '#8b3fcf',
      accentGlow: 'rgba(168, 85, 247, 0.4)',
      accentBg: 'rgba(168, 85, 247, 0.08)',
      accentBorder: 'rgba(168, 85, 247, 0.3)',
      heroGradientFrom: '#1f0e2e',
      heroGradientVia: '#1a0f25',
      heroGradientTo: '#150a1e',
      buttonText: '#28004e'
    }
  },
  sunset: {
    name: 'Günbatımı',
    description: 'Sıcak turuncu',
    icon: '🌅',
    colors: {
      accent: '#ff8c42',
      accentDark: '#e06d20',
      accentGlow: 'rgba(255, 140, 66, 0.4)',
      accentBg: 'rgba(255, 140, 66, 0.08)',
      accentBorder: 'rgba(255, 140, 66, 0.3)',
      heroGradientFrom: '#2a1810',
      heroGradientVia: '#251510',
      heroGradientTo: '#1e0f0a',
      buttonText: '#3d1a00'
    }
  },
  bordeaux: {
    name: 'Bordo',
    description: 'Asil kırmızı',
    icon: '🍷',
    colors: {
      accent: '#e63946',
      accentDark: '#b32d3a',
      accentGlow: 'rgba(230, 57, 70, 0.4)',
      accentBg: 'rgba(230, 57, 70, 0.08)',
      accentBorder: 'rgba(230, 57, 70, 0.3)',
      heroGradientFrom: '#2a0e12',
      heroGradientVia: '#1f0a10',
      heroGradientTo: '#180809',
      buttonText: '#3d0008'
    }
  }
};

const STORAGE_KEY = 'selenium-theme';

/**
 * Tema'yı CSS variable'lara uygula
 */
export function applyTheme(themeId) {
  const theme = THEMES[themeId];
  if (!theme) {
    console.warn('Bilinmeyen tema:', themeId);
    return false;
  }

  const root = document.documentElement;
  const c = theme.colors;

  root.style.setProperty('--accent', c.accent);
  root.style.setProperty('--accent-dark', c.accentDark);
  root.style.setProperty('--accent-glow', c.accentGlow);
  root.style.setProperty('--accent-bg', c.accentBg);
  root.style.setProperty('--accent-border', c.accentBorder);
  root.style.setProperty('--hero-grad-from', c.heroGradientFrom);
  root.style.setProperty('--hero-grad-via', c.heroGradientVia);
  root.style.setProperty('--hero-grad-to', c.heroGradientTo);
  root.style.setProperty('--button-text', c.buttonText);

  // body class olarak da işaretle (gerekirse spesifik override için)
  document.body.dataset.theme = themeId;

  return true;
}

/**
 * Kayıtlı tema'yı al ve uygula (uygulama açılışında çağrılır)
 */
export function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEY) || 'mineral';
  applyTheme(saved);
  return saved;
}

/**
 * Tema seç + kaydet + uygula
 */
export function setTheme(themeId) {
  if (!THEMES[themeId]) return false;
  const ok = applyTheme(themeId);
  if (ok) {
    localStorage.setItem(STORAGE_KEY, themeId);
  }
  return ok;
}

/**
 * Mevcut tema id'sini al
 */
export function getCurrentTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'mineral';
}

console.log('🎨 theme-manager.js v17 yüklendi (5 tema)');
