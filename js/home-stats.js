// ============================================================
// home-stats.js — Ana sayfa istatistikleri (Faz 8 v17)
// Real-time stats + aylık kar grafiği + zaman filtresi
// ============================================================
import { listenVehicles } from "./vehicles-db.js?v=15";

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

function formatPrice(v) {
  if (v === null || v === undefined || isNaN(v)) return '0 ₺';
  return Number(v).toLocaleString('tr-TR') + ' ₺';
}

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

function getTotalExpenses(vehicle) {
  if (!vehicle.expenses || !Array.isArray(vehicle.expenses)) return 0;
  return vehicle.expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

function getProfit(vehicle) {
  if (vehicle.status !== 'sold') return 0;
  const purchase = Number(vehicle.purchasePrice) || 0;
  const sale = Number(vehicle.soldPrice) || 0;
  const expenses = getTotalExpenses(vehicle);
  return sale - purchase - expenses;
}

let unsubFns = [];
let activeVehicles = [];
let soldVehicles = [];
let currentContainer = null;
let timeRange = localStorage.getItem('selenium-stats-range') || 'year';

function render() {
  if (!currentContainer) return;

  try {
    const activeCount = activeVehicles.length;
    const soldCount = soldVehicles.length;

    const totalInvestment = activeVehicles.reduce((sum, v) => {
      return sum + (Number(v.purchasePrice) || 0) + getTotalExpenses(v);
    }, 0);

    const totalProfit = soldVehicles.reduce((sum, v) => sum + getProfit(v), 0);

    currentContainer.innerHTML = `
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

      ${soldCount > 0 ? renderMonthlyChart() : ''}
    `;

    if (soldCount > 0) {
      currentContainer.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          timeRange = btn.dataset.range;
          localStorage.setItem('selenium-stats-range', timeRange);
          render();
        });
      });
    }
  } catch (err) {
    console.error('Home stats render hatası:', err);
    currentContainer.innerHTML = `
      <div class="stats-error">
        <p>İstatistikler yüklenirken bir sorun oluştu.</p>
        <p style="font-size: 0.8rem; color: #888; margin-top: 0.5rem;">${err.message}</p>
      </div>
    `;
  }
}

function computeLast12Months(currentMonthKey, now) {
  const months = [];
  for (let i = 11; i >= 0; i--) {
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
  return months;
}

function computeMonthlyData() {
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let months = [];

  if (timeRange === 'thisYear') {
    const year = now.getFullYear();
    for (let m = 0; m <= now.getMonth(); m++) {
      const key = `${year}-${String(m + 1).padStart(2, '0')}`;
      months.push({
        monthKey: key,
        label: TR_MONTHS[m],
        year: year,
        value: 0,
        count: 0,
        isCurrent: key === currentMonthKey
      });
    }
  } else if (timeRange === 'all') {
    if (soldVehicles.length === 0) {
      months = computeLast12Months(currentMonthKey, now);
    } else {
      const sortedDates = soldVehicles
        .filter(v => v.soldAt)
        .map(v => v.soldAt.substring(0, 7))
        .sort();
      const earliestMonth = sortedDates[0];

      if (!earliestMonth) {
        months = computeLast12Months(currentMonthKey, now);
      } else {
        const [eYear, eMonth] = earliestMonth.split('-').map(Number);
        let cursor = new Date(eYear, eMonth - 1, 1);
        while (cursor <= now) {
          const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
          months.push({
            monthKey: key,
            label: TR_MONTHS[cursor.getMonth()],
            year: cursor.getFullYear(),
            value: 0,
            count: 0,
            isCurrent: key === currentMonthKey
          });
          cursor.setMonth(cursor.getMonth() + 1);
        }
      }
    }
  } else {
    months = computeLast12Months(currentMonthKey, now);
  }

  soldVehicles.forEach(v => {
    if (!v.soldAt) return;
    const monthKey = v.soldAt.substring(0, 7);
    const monthData = months.find(m => m.monthKey === monthKey);
    if (monthData) {
      monthData.value += getProfit(v);
      monthData.count += 1;
    }
  });

  return months;
}

function renderMonthlyChart() {
  const months = computeMonthlyData();
  const barCount = months.length;
  if (barCount === 0) return '';

  // SVG boyutu: bar başına 36 birim (responsive scroll için)
  const barUnit = 36;
  const padLeft = 8;
  const padRight = 8;
  const svgWidth = Math.max(360, padLeft + barCount * barUnit + padRight);
  const svgHeight = 180;

  const topPad = 14;
  const bottomPadLabels = 28;
  const chartHeight = svgHeight - topPad - bottomPadLabels;
  const baseline = topPad + chartHeight / 2;

  const maxAbs = Math.max(...months.map(m => Math.abs(m.value)), 1);
  const maxBarHeight = chartHeight / 2 - 8;

  const totalRange = months.reduce((sum, m) => sum + m.value, 0);
  const recentSold = months.reduce((sum, m) => sum + m.count, 0);
  const isPositive = totalRange >= 0;

  const barW = 22;
  const barGap = (barUnit - barW) / 2;

  let barsSvg = '';
  let labelsSvg = '';
  let valueLabelsSvg = '';

  months.forEach((m, i) => {
    const x = padLeft + i * barUnit + barGap;
    const cx = x + barW / 2;
    const isCurrent = m.isCurrent;

    labelsSvg += `
      <text
        x="${cx}" y="${baseline + chartHeight / 2 + 18}"
        text-anchor="middle"
        font-size="11"
        font-weight="${isCurrent ? '700' : '500'}"
        fill="${isCurrent ? '#00d4aa' : '#999'}"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      >${m.label}</text>
    `;

    if (m.value === 0) {
      barsSvg += `<circle cx="${cx}" cy="${baseline}" r="2" fill="#444" opacity="0.6"/>`;
      return;
    }

    const heightPx = (Math.abs(m.value) / maxAbs) * maxBarHeight;
    const isPos = m.value >= 0;
    const y = isPos ? (baseline - heightPx) : baseline;
    const h = heightPx;

    const colorId = isPos ? 'profitGradient' : 'lossGradient';
    const glowId = isPos ? 'profitGlow' : 'lossGlow';

    barsSvg += `
      <rect
        x="${x}" y="${y}" width="${barW}" height="${h}"
        rx="3"
        fill="url(#${colorId})"
        filter="url(#${glowId})"
        opacity="${isCurrent ? '1' : '0.88'}"
      />
    `;

    if (heightPx > 20) {
      const valueLabel = formatPriceShort(m.value).replace(' ₺', '');
      const labelY = isPos ? y - 5 : y + h + 12;
      valueLabelsSvg += `
        <text
          x="${cx}" y="${labelY}"
          text-anchor="middle"
          font-size="10"
          font-weight="700"
          fill="${isPos ? '#00d4aa' : '#ff4757'}"
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        >${valueLabel}</text>
      `;
    }
  });

  const baselineSvg = `
    <line
      x1="${padLeft}" y1="${baseline}" x2="${svgWidth - padRight}" y2="${baseline}"
      stroke="#444" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.6"
    />
  `;

  return `
    <div class="monthly-chart-card">
      <div class="chart-header">
        <div class="chart-header-left">
          <div class="chart-title">Aylık Kâr</div>
          <div class="chart-subtitle">${recentSold} araç satıldı</div>
        </div>
        <div class="chart-total ${isPositive ? 'positive' : 'negative'}">
          ${isPositive ? '+' : ''}${formatPriceShort(totalRange)}
        </div>
      </div>

      <div class="chart-range-tabs">
        <button class="range-btn ${timeRange === 'thisYear' ? 'active' : ''}" data-range="thisYear">Bu Yıl</button>
        <button class="range-btn ${timeRange === 'year' ? 'active' : ''}" data-range="year">Son Yıl</button>
        <button class="range-btn ${timeRange === 'all' ? 'active' : ''}" data-range="all">Tümü</button>
      </div>

      <div class="chart-wrap">
        <svg viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
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
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="lossGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          ${baselineSvg}
          ${barsSvg}
          ${valueLabelsSvg}
          ${labelsSvg}
        </svg>
      </div>
    </div>
  `;
}

export function initHomeStats(container) {
  if (!container) return;

  currentContainer = container;

  unsubFns.forEach(fn => fn && fn());
  unsubFns = [];

  // İlk render
  render();

  // Aktif ve satılmış araçları dinle
  unsubFns.push(listenVehicles('active', (vehicles) => {
    activeVehicles = vehicles;
    render();
  }));

  unsubFns.push(listenVehicles('sold', (vehicles) => {
    soldVehicles = vehicles;
    render();
  }));
}

export function stopHomeStats() {
  unsubFns.forEach(fn => fn && fn());
  unsubFns = [];
  currentContainer = null;
}

console.log('📊 home-stats.js v17 yüklendi (Faz 8 + zaman filtresi)');
