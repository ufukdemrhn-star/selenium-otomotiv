// ============================================================
// home-stats.js — Ana sayfa istatistikleri (Faz 8)
// Real-time stats + aylık kar grafiği
// ============================================================
import { listenVehicles } from "./vehicles-db.js?v=15";

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function formatPrice(v) {
  if (v === null || v === undefined || isNaN(v)) return '0 ₺';
  return Number(v).toLocaleString('tr-TR') + ' ₺';
}

// Para birimini kısalt: 1.250.000 → 1.25M, 350.000 → 350K
function formatPriceShort(v) {
  const num = Number(v) || 0;
  const abs = Math.abs(num);
  if (abs >= 1_000_000) {
    return (num / 1_000_000).toFixed(num >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, '') + 'M ₺';
  }
  if (abs >= 1000) {
    return Math.round(num / 1000) + 'K ₺';
  }
  return num + ' ₺';
}

// Bir aracın masraf toplamı
function getTotalExpenses(vehicle) {
  if (!vehicle.expenses || !Array.isArray(vehicle.expenses)) return 0;
  return vehicle.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

// Bir aracın kârı (satılmış olmalı)
function getProfit(vehicle) {
  if (vehicle.status !== 'sold') return 0;
  const purchase = Number(vehicle.purchasePrice) || 0;
  const sale = Number(vehicle.soldPrice) || 0;
  const expenses = getTotalExpenses(vehicle);
  return sale - purchase - expenses;
}

// State
let unsubFns = [];
let activeVehicles = [];
let soldVehicles = [];

/**
 * Stats'i render et
 */
function render(container) {
  // Hesaplamalar
  const activeCount = activeVehicles.length;
  const soldCount = soldVehicles.length;

  // Aktif araçların yatırımı (alış + masraf)
  const totalInvestment = activeVehicles.reduce((sum, v) => {
    return sum + (Number(v.purchasePrice) || 0) + getTotalExpenses(v);
  }, 0);

  // Satılmışların toplam karı
  const totalProfit = soldVehicles.reduce((sum, v) => sum + getProfit(v), 0);

  // Aylık kar (son 6 ay)
  const monthlyData = computeMonthlyProfit(soldVehicles, 6);

  container.innerHTML = `
    <!-- 4 Stat Kutusu -->
    <div class="stats-grid">
      <div class="stat-box">
        <div class="stat-icon-wrap accent">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 17h10M5 17l2-7h10l2 7M5 17v3M19 17v3"/>
            <circle cx="8" cy="17" r="1"/>
            <circle cx="16" cy="17" r="1"/>
          </svg>
        </div>
        <div class="stat-label">Aktif Araç</div>
        <div class="stat-value">${activeCount}</div>
      </div>

      <div class="stat-box">
        <div class="stat-icon-wrap accent">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
        <div class="stat-label">Satılan</div>
        <div class="stat-value">${soldCount}</div>
      </div>

      <div class="stat-box stat-profit ${totalProfit >= 0 ? 'positive' : 'negative'}">
        <div class="stat-icon-wrap ${totalProfit >= 0 ? 'success' : 'danger'}">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            ${totalProfit >= 0
              ? '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>'
              : '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>'
            }
          </svg>
        </div>
        <div class="stat-label">${totalProfit >= 0 ? 'Toplam Kâr' : 'Toplam Zarar'}</div>
        <div class="stat-value">${formatPriceShort(Math.abs(totalProfit))}</div>
      </div>

      <div class="stat-box">
        <div class="stat-icon-wrap accent">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <line x1="2" y1="10" x2="22" y2="10"/>
          </svg>
        </div>
        <div class="stat-label">Envanter Değeri</div>
        <div class="stat-value">${formatPriceShort(totalInvestment)}</div>
      </div>
    </div>

    <!-- Aylık Kar Grafiği -->
    ${soldCount > 0 ? renderMonthlyChart(monthlyData) : ''}
  `;
}

/**
 * Son N ay için kar/zarar hesapla
 * Dönüş: [{ label: 'May', value: 12500, monthKey: '2025-05', isCurrent: true }, ...]
 */
function computeMonthlyProfit(soldVehicles, monthCount = 6) {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const months = [];

  // Son N ay
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    months.push({
      monthKey: key,
      label: TR_MONTHS[d.getMonth()],
      year: d.getFullYear(),
      value: 0,
      count: 0,
      isCurrent: key === currentMonthKey
    });
  }

  // Satılmış araçları aylara göre topla
  soldVehicles.forEach(v => {
    if (!v.soldAt) return;
    const monthKey = v.soldAt.substring(0, 7); // "2025-05"
    const monthData = months.find(m => m.monthKey === monthKey);
    if (monthData) {
      monthData.value += getProfit(v);
      monthData.count += 1;
    }
  });

  return months;
}

/**
 * Aylık kar grafiği SVG render
 */
function renderMonthlyChart(months) {
  // En yüksek mutlak değer
  const maxAbs = Math.max(...months.map(m => Math.abs(m.value)), 1);

  // SVG boyutları
  const width = 100; // viewBox üzerinden ölçeklenebilir
  const barCount = months.length;
  const barWidth = (width - 10) / barCount;
  const chartHeight = 80; // % içinde
  const baseline = 50; // ortada baseline (negatif değerler aşağı)
  const maxBarHeight = 35; // baseline'dan max uzaklık (% içinde)

  // Toplam (son N ay)
  const totalRecent = months.reduce((sum, m) => sum + m.value, 0);
  const recentSold = months.reduce((sum, m) => sum + m.count, 0);
  const isPositive = totalRecent >= 0;

  // Aktif (en yüksek bar'lı ayı bul, current ay yoksa)
  const currentMonth = months[months.length - 1];

  let barsSvg = '';
  months.forEach((m, i) => {
    if (m.value === 0) {
      // Sadece minik nokta göster
      const x = 5 + (i * barWidth) + (barWidth / 2);
      barsSvg += `
        <circle cx="${x}" cy="${baseline}" r="1.2" fill="#444" opacity="0.6"/>
      `;
      return;
    }

    const heightPct = (Math.abs(m.value) / maxAbs) * maxBarHeight;
    const isPos = m.value >= 0;
    const x = 5 + (i * barWidth) + 1; // 1 padding
    const w = barWidth - 2;

    const y = isPos ? (baseline - heightPct) : baseline;
    const h = heightPct;

    const colorId = isPos ? 'profitGradient' : 'lossGradient';
    const glowId = isPos ? 'profitGlow' : 'lossGlow';

    const isCurrent = m.isCurrent;

    barsSvg += `
      <rect
        x="${x}" y="${y}" width="${w}" height="${h}"
        rx="0.8"
        fill="url(#${colorId})"
        filter="url(#${glowId})"
        opacity="${isCurrent ? '1' : '0.85'}"
        class="chart-bar ${isCurrent ? 'is-current' : ''}"
      />
    `;
  });

  // X-axis ay etiketleri
  let labelsSvg = '';
  months.forEach((m, i) => {
    const x = 5 + (i * barWidth) + (barWidth / 2);
    const isCurrent = m.isCurrent;
    labelsSvg += `
      <text
        x="${x}" y="${baseline + maxBarHeight + 7}"
        text-anchor="middle"
        font-size="3.5"
        font-weight="${isCurrent ? '700' : '500'}"
        fill="${isCurrent ? '#00d4aa' : '#888'}"
      >${m.label}</text>
    `;
  });

  // Y axis 0 baseline çizgisi
  const baselineSvg = `
    <line
      x1="3" y1="${baseline}" x2="${width - 3}" y2="${baseline}"
      stroke="#333" stroke-width="0.3" stroke-dasharray="0.8 0.8"
    />
  `;

  return `
    <div class="monthly-chart-card">
      <div class="chart-header">
        <div>
          <div class="chart-title">Son ${months.length} Ay Kâr</div>
          <div class="chart-subtitle">${recentSold} araç satıldı</div>
        </div>
        <div class="chart-total ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '+' : ''}${formatPriceShort(totalRecent)}
        </div>
      </div>

      <div class="chart-wrap">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#00ff9a"/>
              <stop offset="100%" stop-color="#00d4aa"/>
            </linearGradient>
            <linearGradient id="lossGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ff4757"/>
              <stop offset="100%" stop-color="#c93544"/>
            </linearGradient>
            <filter id="profitGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="lossGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="0.6" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          ${baselineSvg}
          ${barsSvg}
          ${labelsSvg}
        </svg>
      </div>

      <div class="chart-footer">
        ${months.map((m, i) => {
          if (m.value === 0) return '';
          const isPos = m.value >= 0;
          return `
            <div class="chart-tooltip-item ${isPos ? 'positive' : 'negative'} ${m.isCurrent ? 'is-current' : ''}">
              <span class="tooltip-label">${m.label}${m.isCurrent ? ' (bu ay)' : ''}</span>
              <span class="tooltip-value">${isPos ? '+' : ''}${formatPriceShort(m.value)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Stats başlat — real-time listener kur
 */
export function initHomeStats(container) {
  if (!container) return;

  // Önceki listener'ları temizle
  unsubFns.forEach(fn => fn && fn());
  unsubFns = [];

  // Aktif araçları dinle
  unsubFns.push(listenVehicles('active', (vehicles) => {
    activeVehicles = vehicles;
    render(container);
  }));

  // Satılmış araçları dinle
  unsubFns.push(listenVehicles('sold', (vehicles) => {
    soldVehicles = vehicles;
    render(container);
  }));

  // İlk render (veriler gelmeden boş göster)
  render(container);
}

export function stopHomeStats() {
  unsubFns.forEach(fn => fn && fn());
  unsubFns = [];
}

console.log('📊 home-stats.js v16 yüklendi (Faz 8)');
