/* ==========================================================================
   FinTrack - Enhanced Application Controller
   Auth, Room Collaboration, Chart Textures, Spreadsheet Grid & PDF Export
   ========================================================================== */

import { store, formatRupiah, formatDateTime, getCurrentDateTimeLocalString } from './store.js';
import { renderCustomCategoryChart, updateTrendChart } from './charts.js';
import { exportRecapToPDF } from './pdfExport.js';

// Application Filter State
const appState = {
  timeframe: 'monthly',
  customStart: '',
  customEnd: '',
  categoryFilter: 'all',
  typeFilter: 'all',
  searchQuery: '',
  recapStart: '',
  recapEnd: ''
};

// Theme Management
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('btnThemeToggle');
  if (btn) {
    btn.textContent = theme === 'light' ? '🌙' : '☀️';
    btn.title = theme === 'light' ? 'Ganti ke Dark Mode' : 'Ganti ke Light Mode';
  }
}

// Toast Notifications
function showToast(message, iconName = 'check-circle', type = '') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'income' ? 'income-toast' : type === 'expense' ? 'expense-toast' : ''}`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" style="color: ${type === 'income' ? 'var(--income)' : type === 'expense' ? 'var(--expense)' : 'var(--primary)'};"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  lucide.createIcons({ props: { element: toast } });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Inline form error helpers
function showFormError(containerId, message) {
  let el = document.getElementById(containerId);
  if (!el) {
    // Create error container if not already there
    const form = document.querySelector(`#${containerId.replace('Error', 'Form')}`);
    if (!form) return;
    el = document.createElement('div');
    el.id = containerId;
    el.style.cssText = 'background: var(--expense-bg); border: 1px solid var(--expense); color: var(--expense); padding: 10px 14px; border-radius: var(--radius-md); font-size: 13px; font-weight: 700; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;';
    form.querySelector('.modal-body').prepend(el);
  }
  el.style.display = 'flex';
  el.innerHTML = `<span style="font-size:18px;">⚠️</span> ${message}`;
}

function clearFormError(containerId) {
  const el = document.getElementById(containerId);
  if (el) el.style.display = 'none';
}

// Emoji Celebration Popup
function showEmojiCelebration(type) {
  const container = document.getElementById('emojiPopupContainer');
  if (!container) return;

  const isIncome = type === 'income';
  const emoji = isIncome ? '🤑' : '😢';
  const message = isIncome ? 'Yeay, selamat kamu kaya! 🎉' : 'Wah, kamu sudah impulsif hari ini.';

  // Create popup
  const popup = document.createElement('div');
  popup.className = 'emoji-popup';
  popup.innerHTML = `
    <div class="emoji-popup-inner">
      <div class="emoji-big">${emoji}</div>
      <div class="emoji-label">${message}</div>
    </div>
  `;
  container.appendChild(popup);

  // Spawn confetti only for income
  if (isIncome) {
    const colors = ['#7c3aed', '#ec4899', '#fbbf24', '#10b981', '#06b6d4', '#f97316'];
    for (let i = 0; i < 60; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.cssText = `
        left: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        --duration: ${1.8 + Math.random() * 1.4}s;
        --delay: ${Math.random() * 0.6}s;
        width: ${6 + Math.random() * 8}px;
        height: ${8 + Math.random() * 10}px;
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      `;
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 3500);
    }
  }

  // Remove popup after animation
  setTimeout(() => popup.remove(), 2600);
}


// Switch form fields based on transaction type
function updateTxFormByType(type) {
  const isIncome = type === 'income';

  // Dynamic modal title
  const title = document.getElementById('txModalTitle');
  if (title) {
    title.innerHTML = isIncome
      ? '<i data-lucide="arrow-up-right" style="color: var(--income);"></i> Catat Pemasukan'
      : '<i data-lucide="arrow-down-right" style="color: var(--expense);"></i> Catat Pengeluaran';
    lucide.createIcons();
  }

  // Dynamic title label & placeholder
  const titleLabel = document.getElementById('txTitleLabel');
  const titleInput = document.getElementById('txTitle');
  if (isIncome) {
    if (titleLabel) titleLabel.textContent = '📝 Nama / Keterangan Pemasukan';
    if (titleInput) titleInput.placeholder = 'Contoh: Gaji Agustus, Hasil Jualan, Uang Saku...';
  } else {
    if (titleLabel) titleLabel.textContent = '📝 Untuk Apa? (Keterangan)';
    if (titleInput) titleInput.placeholder = 'Contoh: Makan Siang, Bensin, Belanja...';
  }

  // Show/hide income source field
  const incomeSourceGroup = document.getElementById('incomeSourceGroup');
  if (incomeSourceGroup) incomeSourceGroup.style.display = isIncome ? 'block' : 'none';

  // Show/hide expense merchant field
  const merchantGroup = document.getElementById('expenseMerchantGroup');
  if (merchantGroup) merchantGroup.style.display = isIncome ? 'none' : 'block';

  // Dynamic amount label
  const amountLabel = document.getElementById('txAmountLabel');
  if (amountLabel) {
    amountLabel.textContent = isIncome ? '💵 Jumlah Pemasukan (Rp)' : '💸 Jumlah Pengeluaran (Rp)';
  }

  // Dynamic submit button color
  const submitBtn = document.getElementById('txSubmitBtn');
  if (submitBtn) {
    submitBtn.style.background = isIncome
      ? 'linear-gradient(135deg, #10b981, #059669)'
      : 'linear-gradient(135deg, var(--primary), #6d28d9)';
  }
}

// Modal Helpers
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    if (modalId === 'txModal') {
      const datetimeInput = document.getElementById('txDatetime');
      if (datetimeInput) {
        datetimeInput.value = getCurrentDateTimeLocalString();
      }
      // Init form fields for current selected type
      const currentType = document.querySelector('input[name="txType"]:checked')?.value || 'expense';
      updateTxFormByType(currentType);
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Switch Active View (Landing vs Dashboard)
function switchView(viewName) {
  const landingView = document.getElementById('landingView');
  const dashboardView = document.getElementById('mainDashboardView');

  if (viewName === 'dashboard') {
    if (landingView) landingView.style.display = 'none';
    if (dashboardView) dashboardView.style.display = 'block';
  } else {
    if (landingView) landingView.style.display = 'block';
    if (dashboardView) dashboardView.style.display = 'none';
  }
}

// Update Auth User Navigation UI
function updateAuthUI() {
  const profileContainer = document.getElementById('authUserProfile');
  const guestButtons = document.getElementById('authGuestButtons');
  const authActions = document.getElementById('authenticatedActions');
  const navAvatar = document.getElementById('userNavAvatar');
  const navName = document.getElementById('userNavName');

  if (store.currentUser) {
    if (profileContainer) profileContainer.style.display = 'flex';
    if (authActions) authActions.style.display = 'flex';
    if (guestButtons) guestButtons.style.display = 'none';
    if (navName) navName.textContent = store.currentUser.name;
    if (navAvatar) navAvatar.textContent = store.currentUser.name.charAt(0).toUpperCase();
    switchView('dashboard');
  } else {
    if (profileContainer) profileContainer.style.display = 'none';
    if (authActions) authActions.style.display = 'none';
    if (guestButtons) guestButtons.style.display = 'flex';
    switchView('landing');
  }
}

// Update Active Room UI
function updateRoomUI() {
  const badge = document.getElementById('activeRoomBadge');
  const btnLeave = document.getElementById('btnLeaveRoom');

  if (store.activeRoom) {
    if (badge) {
      badge.textContent = `Room: ${store.activeRoom}`;
      badge.style.background = '#8b5cf6';
    }
    if (btnLeave) btnLeave.style.display = 'inline-flex';
  } else {
    if (badge) {
      badge.textContent = 'Keuangan Pribadi';
      badge.style.background = 'var(--primary)';
    }
    if (btnLeave) btnLeave.style.display = 'none';
  }
}

// Update Category Dropdowns
function updateCategoryDropdowns() {
  const txCategorySelect = document.getElementById('txCategory');
  const filterSelect = document.getElementById('categoryFilterSelect');
  
  if (!txCategorySelect || !filterSelect) return;

  const categories = store.categories;
  const currentSelectedFilter = filterSelect.value;

  txCategorySelect.innerHTML = categories.map(cat => `
    <option value="${cat.id}">
      ${cat.type === 'income' ? '[Pemasukan] ' : '[Pengeluaran] '} ${cat.name}
    </option>
  `).join('');

  filterSelect.innerHTML = `
    <option value="all">Semua Kategori</option>
    ${categories.map(cat => `
      <option value="${cat.id}">${cat.name}</option>
    `).join('')}
  `;

  filterSelect.value = currentSelectedFilter;
}

// Render Summary Metrics
function renderMetrics(summary) {
  const netEl = document.getElementById('metricNetBalance');
  const incEl = document.getElementById('metricTotalIncome');
  const expEl = document.getElementById('metricTotalExpense');
  const avgEl = document.getElementById('metricDailyAvg');

  if (netEl) netEl.textContent = formatRupiah(summary.netBalance);
  if (incEl) incEl.textContent = formatRupiah(summary.totalIncome);
  if (expEl) expEl.textContent = formatRupiah(summary.totalExpense);
  if (avgEl) avgEl.textContent = formatRupiah(summary.dailyAverageExpense);
}

// Render Category Budget Limits Progress Section
function renderBudgetLimits(filteredTxs) {
  const container = document.getElementById('budgetListContainer');
  if (!container) return;

  const expenseCategories = store.categories.filter(c => c.type === 'expense');
  const spentMap = {};
  filteredTxs.filter(t => t.type === 'expense').forEach(tx => {
    spentMap[tx.categoryId] = (spentMap[tx.categoryId] || 0) + tx.amount;
  });

  if (expenseCategories.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>Belum ada kategori pengeluaran.</p></div>`;
    return;
  }

  container.innerHTML = expenseCategories.map(cat => {
    const spent = spentMap[cat.id] || 0;
    const budget = cat.budget || 0;
    const hasBudget = budget > 0;
    const percent = hasBudget ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
    const isExceeded = hasBudget && spent > budget;
    const isWarning = hasBudget && percent >= 90 && !isExceeded;

    let barColor = cat.color || 'var(--primary)';
    if (isExceeded) barColor = 'var(--expense)';
    else if (isWarning) barColor = 'var(--warning)';

    return `
      <div class="budget-item">
        <div class="budget-info">
          <span class="budget-cat-name">
            <span class="budget-cat-dot" style="background: ${cat.color};"></span>
            ${cat.name}
          </span>
          <span class="budget-amounts">
            <strong>${formatRupiah(spent)}</strong>
            ${hasBudget ? ` / ${formatRupiah(budget)}` : ''}
          </span>
        </div>
        ${hasBudget ? `
          <div class="budget-progress-bg">
            <div class="budget-progress-bar" style="width: ${percent}%; background: ${barColor};"></div>
          </div>
          ${isExceeded ? `<div style="font-size:11px; color:var(--expense); margin-top:4px; font-weight:600;">⚠️ Melebihi anggaran ${formatRupiah(spent - budget)}</div>` : ''}
        ` : `
          <div style="font-size:11px; color:var(--text-dim);">Batas anggaran belum diatur</div>
        `}
      </div>
    `;
  }).join('');
}

// Render Interactive Spreadsheet Grid View
function renderSpreadsheetGrid(filteredTxs) {
  const tbody = document.getElementById('spreadsheetBody');
  if (!tbody) return;

  if (filteredTxs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 24px;">Tidak ada data rekapan pada rentang tanggal ini.</td></tr>`;
    return;
  }

  let totalInc = 0;
  let totalExp = 0;

  const rowsHtml = filteredTxs.map((tx, index) => {
    const cat = store.getCategoryById(tx.categoryId);
    const { dateStr, timeStr } = formatDateTime(tx.datetime);
    const isIncome = tx.type === 'income';

    if (isIncome) totalInc += tx.amount;
    else totalExp += tx.amount;

    return `
      <tr>
        <td style="color: var(--text-dim);">${index + 1}</td>
        <td style="white-space: nowrap;">${dateStr} ${timeStr}</td>
        <td><strong>${tx.title}</strong> ${tx.note ? `<small style="color: var(--text-dim);">(${tx.note})</small>` : ''}</td>
        <td><span style="color: ${cat.color}; font-weight: 600;">${cat.name}</span></td>
        <td style="color: ${isIncome ? 'var(--income)' : 'var(--expense)'}; font-weight: 600;">
          ${isIncome ? 'PEMASUKAN' : 'PENGELUARAN'}
        </td>
        <td style="text-align: right; font-weight: 700; color: ${isIncome ? 'var(--income)' : 'var(--expense)'};">
          ${isIncome ? '+' : '-'} ${formatRupiah(tx.amount)}
        </td>
      </tr>
    `;
  }).join('');

  const net = totalInc - totalExp;

  const totalsHtml = `
    <tr class="total-row">
      <td colspan="4" style="text-align: right; font-weight: 800; font-size: 14px;">TOTAL REKAPAN KEUANGAN:</td>
      <td style="color: var(--income); font-weight: 700;">Masuk: ${formatRupiah(totalInc)}</td>
      <td style="text-align: right; color: ${net >= 0 ? 'var(--income)' : 'var(--expense)'}; font-size: 15px; font-weight: 800;">
        Saldo Net: ${formatRupiah(net)}
      </td>
    </tr>
  `;

  tbody.innerHTML = rowsHtml + totalsHtml;
}

// Render Transaction Table
function renderTransactionTable(transactions) {
  const tbody = document.getElementById('txTableBody');
  const emptyState = document.getElementById('emptyTableState');
  const txCountBadge = document.getElementById('txCountBadge');

  if (!tbody) return;

  if (txCountBadge) {
    txCountBadge.textContent = `${transactions.length} Transaksi`;
  }

  if (transactions.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  const sorted = [...transactions].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));

  tbody.innerHTML = sorted.map(tx => {
    const cat = store.getCategoryById(tx.categoryId);
    const { dateStr, timeStr } = formatDateTime(tx.datetime);
    const isIncome = tx.type === 'income';

    return `
      <tr data-id="${tx.id}">
        <td>
          <div style="font-weight: 600; color: var(--text-main);">${tx.title}</div>
          ${tx.note ? `<div style="font-size: 12px; color: var(--text-dim);">${tx.note}</div>` : ''}
          ${tx.roomCode ? `<span style="font-size: 10px; background: rgba(139, 92, 246, 0.2); color: #8b5cf6; padding: 2px 6px; border-radius: 4px;">Room: ${tx.roomCode}</span>` : ''}
        </td>
        <td>
          <span class="cat-badge" style="background: ${cat.color}22; color: ${cat.color}; border: 1px solid ${cat.color}44;">
            <i data-lucide="${cat.icon || 'tag'}" style="width: 12px; height: 12px;"></i>
            ${cat.name}
          </span>
        </td>
        <td style="font-size: 13px; color: var(--text-muted); white-space: nowrap;">
          ${dateStr} <small style="display:block; color: var(--text-dim);">${timeStr}</small>
        </td>
        <td class="amount-cell ${isIncome ? 'income' : 'expense'}">
          ${isIncome ? '+' : '-'} ${formatRupiah(tx.amount)}
        </td>
        <td style="text-align: right;">
          <button class="action-btn btn-delete-tx" data-id="${tx.id}" title="Hapus transaksi">
            <i data-lucide="trash-2"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

function updatePeriodBadgeText() {
  const badge = document.getElementById('activePeriodLabel');
  if (!badge) return;

  const labels = {
    daily: 'Periode: Hari Ini',
    weekly: 'Periode: Minggu Ini',
    monthly: 'Periode: Bulan Ini',
    yearly: 'Periode: Tahun Ini',
    all: 'Periode: Semua Transaksi',
    custom: `Periode Kustom: ${appState.customStart || '?'} s/d ${appState.customEnd || 'Sekarang'}`
  };
  badge.textContent = labels[appState.timeframe] || 'Periode: Bulan Ini';
}

// Global Refresh View
function refreshAppView() {
  updateAuthUI();
  updateRoomUI();

  const filteredTxs = store.getFilteredTransactions(
    appState.timeframe,
    appState.customStart,
    appState.customEnd,
    appState.categoryFilter,
    appState.typeFilter,
    appState.searchQuery
  );

  const summary = store.calculateSummary(filteredTxs);
  renderMetrics(summary);

  const breakdownData = store.getCategoryBreakdown(filteredTxs);
  renderCustomCategoryChart(breakdownData);
  updateTrendChart(filteredTxs);

  renderBudgetLimits(filteredTxs);
  renderSpreadsheetGrid(filteredTxs);
  renderTransactionTable(filteredTxs);
  updatePeriodBadgeText();
}

// Event Binding Setup
function initEventListeners() {
  // Landing Page CTA Triggers
  document.getElementById('landingBtnLogin')?.addEventListener('click', () => openModal('loginModal'));
  document.getElementById('landingBtnRegister')?.addEventListener('click', () => openModal('registerModal'));

  // Modal Triggers
  document.getElementById('btnOpenTxModal')?.addEventListener('click', () => openModal('txModal'));
  document.getElementById('btnOpenCategoryModal')?.addEventListener('click', () => openModal('categoryModal'));
  document.getElementById('btnAddCategoryQuick')?.addEventListener('click', () => openModal('categoryModal'));
  document.getElementById('btnOpenLoginModal')?.addEventListener('click', () => openModal('loginModal'));
  document.getElementById('btnOpenRegisterModal')?.addEventListener('click', () => openModal('registerModal'));
  document.getElementById('btnOpenCreateRoomModal')?.addEventListener('click', () => openModal('createRoomModal'));
  document.getElementById('btnOpenJoinRoomModal')?.addEventListener('click', () => openModal('joinRoomModal'));

  // Close modals
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modalId = e.currentTarget.getAttribute('data-close');
      closeModal(modalId);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });

  // Auth Form Handlers
  document.getElementById('loginForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass  = document.getElementById('loginPassword').value;

    try {
      store.loginUser(email, pass);
      closeModal('loginModal');
      document.getElementById('loginForm').reset();
      clearFormError('loginError');
      refreshAppView();
      showToast(`Selamat datang kembali, ${store.currentUser.name}! 👋`, 'user-check');
    } catch (err) {
      showFormError('loginError', err.message);
    }
  });

  document.getElementById('registerForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name  = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass  = document.getElementById('regPassword').value;

    try {
      store.registerUser(name, email, pass);
      closeModal('registerModal');
      document.getElementById('registerForm').reset();
      clearFormError('registerError');
      refreshAppView();
      showToast(`Akun berhasil dibuat! Selamat datang, ${store.currentUser.name}! 🎉`, 'user-plus');
    } catch (err) {
      showFormError('registerError', err.message);
    }
  });

  document.getElementById('btnLogout')?.addEventListener('click', () => {
    window.guestDashboardMode = false;
    store.logoutUser();
    refreshAppView();
    showToast('Anda telah logout.', 'log-out');
  });

  // Room Collaboration Handlers
  document.getElementById('createRoomForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('roomName').value.trim();
    const code = document.getElementById('roomCodeInput').value.trim();

    try {
      store.createRoom(code, name);
      closeModal('createRoomModal');
      document.getElementById('createRoomForm').reset();
      refreshAppView();
      showToast(`Room "${name}" dengan kode [${code.toUpperCase()}] berhasil dibuat!`, 'users');
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('joinRoomForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = document.getElementById('joinCodeInput').value.trim();

    try {
      const room = store.joinRoom(code);
      closeModal('joinRoomModal');
      document.getElementById('joinRoomForm').reset();
      refreshAppView();
      showToast(`Berhasil bergabung ke Room: ${room.name}`, 'users');
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('btnLeaveRoom')?.addEventListener('click', () => {
    store.leaveRoom();
    refreshAppView();
    showToast('Kembali ke mode Keuangan Pribadi.', 'user');
  });

  // Listen for type radio change — update form fields dynamically
  document.querySelectorAll('input[name="txType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      updateTxFormByType(e.target.value);
    });
  });

  document.getElementById('chartTypeSelect')?.addEventListener('change', (e) => {
    store.setChartType(e.target.value);
    refreshAppView();
  });

  document.getElementById('chartImageUpload')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
      store.setChartImagePattern(evt.target.result);
      document.getElementById('btnResetChartImage').style.display = 'inline-flex';
      refreshAppView();
      showToast('Tekstur foto kustom berhasil diterapkan pada grafik!', 'image');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btnResetChartImage')?.addEventListener('click', () => {
    store.setChartImagePattern(null);
    document.getElementById('btnResetChartImage').style.display = 'none';
    document.getElementById('chartImageUpload').value = '';
    refreshAppView();
    showToast('Foto grafik telah direset.', 'rotate-ccw');
  });

  // Timeframe Tabs Switcher
  document.querySelectorAll('.time-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.time-tab').forEach(t => t.classList.remove('active'));
      const target = e.currentTarget;
      target.classList.add('active');

      const timeframe = target.getAttribute('data-timeframe');
      appState.timeframe = timeframe;

      const customContainer = document.getElementById('customDateRangeContainer');
      if (timeframe === 'custom') {
        if (customContainer) customContainer.style.display = 'flex';
      } else {
        if (customContainer) customContainer.style.display = 'none';
        refreshAppView();
      }
    });
  });

  document.getElementById('btnApplyCustomDate')?.addEventListener('click', () => {
    appState.customStart = document.getElementById('startDateInput').value;
    appState.customEnd = document.getElementById('endDateInput').value;
    refreshAppView();
  });

  // Rekapan Spreadsheet & PDF Exporter Handlers
  document.getElementById('btnGenerateRecap')?.addEventListener('click', () => {
    const start = document.getElementById('recapStartDate').value;
    const end = document.getElementById('recapEndDate').value;
    appState.recapStart = start;
    appState.recapEnd = end;

    const recapTxs = store.getFilteredTransactions('custom', start, end, 'all', 'all', '');
    renderSpreadsheetGrid(recapTxs);
    showToast(`Rekapan spreadsheet berhasil dibuat (${recapTxs.length} transaksi)`, 'table');
  });

  document.getElementById('btnDownloadPDF')?.addEventListener('click', () => {
    const start = document.getElementById('recapStartDate').value || appState.customStart;
    const end = document.getElementById('recapEndDate').value || appState.customEnd;
    const recapTxs = store.getFilteredTransactions(start ? 'custom' : appState.timeframe, start, end, 'all', 'all', '');

    if (recapTxs.length === 0) {
      alert('Tidak ada transaksi pada rentang ini untuk diunduh sebagai PDF.');
      return;
    }

    exportRecapToPDF(recapTxs, start, end);
    showToast('Menyiapkan dokumen PDF Laporan Keuangan...', 'file-text');
  });

  document.getElementById('btnExportCSVRecap')?.addEventListener('click', () => {
    const start = document.getElementById('recapStartDate').value;
    const end = document.getElementById('recapEndDate').value;
    const recapTxs = store.getFilteredTransactions(start ? 'custom' : appState.timeframe, start, end, 'all', 'all', '');

    if (recapTxs.length === 0) {
      alert('Tidak ada transaksi untuk diekspor.');
      return;
    }
    store.exportToCSV(recapTxs);
    showToast('Laporan Excel / CSV berhasil diunduh!', 'download');
  });

  // Table Filters & Search
  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    appState.searchQuery = e.target.value;
    refreshAppView();
  });

  document.getElementById('categoryFilterSelect')?.addEventListener('change', (e) => {
    appState.categoryFilter = e.target.value;
    refreshAppView();
  });

  document.getElementById('typeFilterSelect')?.addEventListener('change', (e) => {
    appState.typeFilter = e.target.value;
    refreshAppView();
  });

  // Delete Transaction Handler
  document.getElementById('txTableBody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete-tx');
    if (btn) {
      const id = btn.getAttribute('data-id');
      if (confirm('Hapus catatan transaksi ini?')) {
        store.deleteTransaction(id);
        refreshAppView();
        showToast('Transaksi dihapus.', 'trash-2');
      }
    }
  });

  // Submit Forms: Add Transaction & Category
  document.getElementById('txForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('txTitle').value.trim();
    const amount = parseFloat(document.getElementById('txAmount').value);
    const categoryId = document.getElementById('txCategory').value;
    const datetime = document.getElementById('txDatetime').value;
    const note = document.getElementById('txNote').value.trim();
    const type = document.querySelector('input[name="txType"]:checked').value;
    const incomeSource = document.getElementById('txIncomeSource')?.value || '';
    const merchant = document.getElementById('txMerchant')?.value.trim() || '';

    if (!title || isNaN(amount) || amount <= 0 || !datetime) {
      alert('Mohon isi data transaksi dengan lengkap.');
      return;
    }

    // Build the note with source/merchant context
    let enrichedNote = note;
    if (type === 'income' && incomeSource) {
      enrichedNote = incomeSource + (note ? ` • ${note}` : '');
    } else if (type === 'expense' && merchant) {
      enrichedNote = merchant + (note ? ` • ${note}` : '');
    }

    store.addTransaction({ title, amount, categoryId, datetime, note: enrichedNote, type });
    closeModal('txModal');
    document.getElementById('txForm').reset();
    // Reset form fields to expense default after submit
    updateTxFormByType('expense');
    refreshAppView();

    // Emoji celebration based on transaction type
    showEmojiCelebration(type);

    const toastMsg = type === 'income'
      ? `💰 ${title} — Yeay, selamat kamu kaya!`
      : `😅 ${title} — tercatat sebagai pengeluaran!`;
    showToast(toastMsg, type === 'income' ? 'trending-up' : 'trending-down', type);
  });

  document.getElementById('categoryForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('catName').value.trim();
    const type = document.getElementById('catType').value;
    const budget = parseFloat(document.getElementById('catBudget').value) || 0;
    const color = document.getElementById('catColor').value || '#f43f5e';

    if (!name) return;
    store.addCategory({ name, type, budget, color, icon: type === 'income' ? 'trending-up' : 'tag' });
    closeModal('categoryModal');
    document.getElementById('categoryForm').reset();
    updateCategoryDropdowns();
    refreshAppView();
    showToast(`Kategori "${name}" berhasil ditambahkan!`, 'folder-plus');
  });
}

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  updateCategoryDropdowns();

  // --- Theme Toggle Init ---
  const savedTheme = localStorage.getItem('fintrack-theme') || 'dark';
  applyTheme(savedTheme);

  document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('fintrack-theme', next);
  });

  if (store.chartType) {
    const sel = document.getElementById('chartTypeSelect');
    if (sel) sel.value = store.chartType;
  }
  if (store.chartImagePattern) {
    const btnReset = document.getElementById('btnResetChartImage');
    if (btnReset) btnReset.style.display = 'inline-flex';
  }

  initEventListeners();
  refreshAppView();
});
