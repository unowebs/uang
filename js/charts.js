/* ==========================================================================
   FinTrack - Visual Chart Manager with Custom Chart Types & Image Texture Fill
   ========================================================================== */

import { formatRupiah, store } from './store.js';

let chartInstance = null;
let trendChartInstance = null;

// Helper to build Image Pattern Fill on Canvas
function createPatternFromDataUrl(ctx, dataUrl, callback) {
  if (!dataUrl) {
    callback(null);
    return;
  }
  const img = new Image();
  img.src = dataUrl;
  img.onload = () => {
    try {
      const pattern = ctx.getContext('2d').createPattern(img, 'repeat');
      callback(pattern);
    } catch (e) {
      console.error('Failed to create canvas pattern:', e);
      callback(null);
    }
  };
  img.onerror = () => callback(null);
}

// Render dynamic chart with selectable types (doughnut, pie, bar, line, scatter, radar) and optional custom photo textures
export function renderCustomCategoryChart(breakdownData) {
  const ctx = document.getElementById('categoryChartCanvas');
  if (!ctx) return;

  if (chartInstance) {
    chartInstance.destroy();
  }

  if (!breakdownData || breakdownData.length === 0) {
    ctx.style.display = 'none';
    const noDataDiv = document.getElementById('noCategoryDataMsg');
    if (noDataDiv) noDataDiv.style.display = 'flex';
    return;
  } else {
    ctx.style.display = 'block';
    const noDataDiv = document.getElementById('noCategoryDataMsg');
    if (noDataDiv) noDataDiv.style.display = 'none';
  }

  const chartType = store.chartType || 'doughnut'; // doughnut, pie, bar, line, scatter, radar
  const labels = breakdownData.map(b => b.name);
  const dataValues = breakdownData.map(b => b.total);
  const defaultColors = breakdownData.map(b => b.color);

  // Check if custom user photo pattern exists
  createPatternFromDataUrl(ctx, store.chartImagePattern, (imagePattern) => {
    const fillBackgrounds = imagePattern ? labels.map(() => imagePattern) : defaultColors;

    let datasetConfig = {
      label: 'Pengeluaran (Rp)',
      data: dataValues,
      backgroundColor: fillBackgrounds,
      borderColor: imagePattern ? '#ffffff' : '#0f172a',
      borderWidth: 2,
      hoverOffset: 8
    };

    let optionsConfig = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: chartType === 'bar' || chartType === 'line' ? 'top' : 'right',
          labels: {
            color: '#94a3b8',
            font: { family: 'Plus Jakarta Sans', size: 12 },
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.parsed.y || context.parsed || 0;
              return ` ${label}: ${formatRupiah(value)}`;
            }
          }
        }
      }
    };

    // Specific tweaks by chart type
    let actualType = chartType;
    if (chartType === 'pie') {
      actualType = 'pie';
    } else if (chartType === 'doughnut') {
      actualType = 'doughnut';
      optionsConfig.cutout = '70%';
    } else if (chartType === 'line') {
      datasetConfig.borderColor = defaultColors[0] || '#6366f1';
      datasetConfig.tension = 0.4;
      datasetConfig.fill = true;
      datasetConfig.backgroundColor = 'rgba(99, 102, 241, 0.2)';
    } else if (chartType === 'scatter') {
      actualType = 'bar';
    } else if (chartType === 'radar') {
      actualType = 'radar';
      datasetConfig.backgroundColor = 'rgba(244, 63, 94, 0.25)';
      datasetConfig.borderColor = '#f43f5e';
    }

    chartInstance = new Chart(ctx, {
      type: actualType,
      data: {
        labels: labels,
        datasets: [datasetConfig]
      },
      options: optionsConfig
    });
  });
}

// Trend Combo Chart Renderer
export function updateTrendChart(transactions) {
  const ctx = document.getElementById('trendChartCanvas');
  if (!ctx) return;

  if (trendChartInstance) {
    trendChartInstance.destroy();
  }

  if (!transactions || transactions.length === 0) {
    return;
  }

  const sorted = [...transactions].sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
  
  const dateGroups = {};
  sorted.forEach(tx => {
    const d = new Date(tx.datetime);
    const dateLabel = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    
    if (!dateGroups[dateLabel]) {
      dateGroups[dateLabel] = { income: 0, expense: 0 };
    }
    if (tx.type === 'income') {
      dateGroups[dateLabel].income += tx.amount;
    } else {
      dateGroups[dateLabel].expense += tx.amount;
    }
  });

  const labels = Object.keys(dateGroups);
  const incomeData = labels.map(l => dateGroups[l].income);
  const expenseData = labels.map(l => dateGroups[l].expense);

  trendChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Pemasukan',
          data: incomeData,
          backgroundColor: 'rgba(16, 185, 129, 0.75)',
          borderColor: '#10b981',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.5
        },
        {
          label: 'Pengeluaran',
          data: expenseData,
          backgroundColor: 'rgba(244, 63, 94, 0.75)',
          borderColor: '#f43f5e',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 11 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.04)' },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Plus Jakarta Sans', size: 11 },
            callback: function(value) {
              if (value >= 1000000) return 'Rp ' + (value / 1000000).toFixed(1) + 'jt';
              if (value >= 1000) return 'Rp ' + (value / 1000).toFixed(0) + 'rb';
              return 'Rp ' + value;
            }
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
          align: 'end',
          labels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 12 }, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              return ` ${context.dataset.label}: ${formatRupiah(context.parsed.y)}`;
            }
          }
        }
      }
    }
  });
}
