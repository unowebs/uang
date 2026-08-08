/* ==========================================================================
   FinTrack ID — Application Controller
   Clean, Happy, Interactive + PIN Auth, Profile & Multi-Currency
   ========================================================================== */

import {
  store,
  formatRupiah,
  formatMoney,
  convertCurrency,
  EXCHANGE_RATES,
  formatDateTime,
  getCurrentDateTimeLocalString
} from './store.js';

import { renderCustomCategoryChart, updateTrendChart } from './charts.js';
import { exportRecapToPDF } from './pdfExport.js';

// ─────────────────────────────────────────
// STATE
// ─────────────────────────────────────────
const state = {
  timeframe: 'monthly',
  customStart: '',
  customEnd: '',
  catFilter: 'all',
  typeFilter: 'all',
  search: '',
  pendingAvatarBase64: null
};

// ─────────────────────────────────────────
// NUMBER FORMATTING HELPERS (1.000 / 100.000)
// ─────────────────────────────────────────
function formatNumberWithDots(rawVal) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return '';
  const numStr = String(rawVal).replace(/[^0-9.,]/g, '');
  if (!numStr) return '';

  const hasComma = numStr.includes(',');
  const parts = numStr.split(/[,.]/);

  // Take integer part and add dots every 3 digits
  const cleanInt = parts[0].replace(/^0+(?=\d)/, '');
  const formattedInt = (cleanInt || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  if (hasComma && parts.length > 1) {
    return formattedInt + ',' + parts[1].slice(0, 2);
  }
  return formattedInt;
}

function parseFormattedNumber(formattedStr) {
  if (!formattedStr) return 0;
  // Strip dots (thousands separator) and convert comma to dot for float parsing
  const clean = String(formattedStr).replace(/\./g, '').replace(',', '.');
  return parseFloat(clean) || 0;
}

// ─────────────────────────────────────────
// THEME
// ─────────────────────────────────────────
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('btnTheme');
  if (btn) {
    btn.textContent = t === 'light' ? '🌙' : '☀️';
    btn.title = t === 'light' ? 'Dark Mode' : 'Light Mode';
  }
}

// ─────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────
function toast(msg, icon = '✅', cls = 't-info') {
  const rack = document.getElementById('toastRack');
  if (!rack) return;
  const el = document.createElement('div');
  el.className = `toast ${cls}`;
  el.innerHTML = `<span style="font-size:18px;">${icon}</span><span>${msg}</span>`;
  rack.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'all .3s ease';
    el.style.opacity = '0';
    el.style.transform = 'translateX(110%)';
    setTimeout(() => el.remove(), 310);
  }, 3400);
}

// ─────────────────────────────────────────
// FORM ERROR
// ─────────────────────────────────────────
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('show');
  const span = el.querySelector('span') || el;
  span.textContent = msg;
}

function clearErr(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

// ─────────────────────────────────────────
// EMOJI CELEBRATION
// ─────────────────────────────────────────
function celebrate(type) {
  const wrap = document.getElementById('emojiContainer');
  if (!wrap) return;

  const isIncome = type === 'income';
  const emoji    = isIncome ? '🤑' : '😢';
  const msg      = isIncome ? 'Yeay, selamat kamu kaya! 🎉' : 'Wah, kamu sudah impulsif hari ini.';

  const popup = document.createElement('div');
  popup.className = 'emoji-popup';
  popup.innerHTML = `<div class="emoji-inner"><div class="emoji-big">${emoji}</div><div class="emoji-text">${msg}</div></div>`;
  wrap.appendChild(popup);

  if (isIncome) {
    const colors = ['#7c3aed','#ec4899','#fbbf24','#10b981','#06b6d4','#f97316','#f43f5e'];
    for (let i = 0; i < 55; i++) {
      const p = document.createElement('div');
      p.className = 'confetti';
      p.style.cssText = `left:${Math.random()*100}%;background:${colors[i%colors.length]};width:${6+Math.random()*8}px;height:${8+Math.random()*10}px;border-radius:${Math.random()>.5?'50%':'3px'};--dur:${1.8+Math.random()*1.5}s;--delay:${Math.random()*.5}s`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 3500);
    }
  }

  setTimeout(() => popup.remove(), 2700);
}

// ─────────────────────────────────────────
// MODAL HANDLERS
// ─────────────────────────────────────────
function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  m.classList.add('open');

  if (id === 'modalTx') {
    const dt = document.getElementById('txDatetime');
    if (dt) dt.value = getCurrentDateTimeLocalString();
    const type = document.querySelector('input[name="txType"]:checked')?.value || 'expense';
    updateTxForm(type);

    // Set initial currency dataset
    const currSelect = document.getElementById('txCurrency');
    if (currSelect) currSelect.dataset.prevCurr = currSelect.value || 'IDR';
  } else if (id === 'modalProfile') {
    populateProfileModal();
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

// ─────────────────────────────────────────
// PROFILE MODAL POPULATION & AVATAR
// ─────────────────────────────────────────
function populateProfileModal() {
  const user = store.currentUser;
  if (!user) return;

  document.getElementById('profName').value  = user.name || '';
  document.getElementById('profEmail').value = user.email || '';
  document.getElementById('profPass').value  = user.password || '';
  document.getElementById('profPin').value   = user.pin || '123456';

  const avatarImg = document.getElementById('profileAvatarImg');
  const avatarTxt = document.getElementById('profileAvatarText');
  const btnRemove = document.getElementById('btnRemoveAvatar');

  state.pendingAvatarBase64 = user.avatar || null;

  if (user.avatar) {
    avatarImg.src = user.avatar;
    avatarImg.classList.remove('hidden');
    avatarTxt.classList.add('hidden');
    btnRemove?.classList.remove('hidden');
  } else {
    avatarImg.src = '';
    avatarImg.classList.add('hidden');
    avatarTxt.textContent = user.name.charAt(0).toUpperCase();
    avatarTxt.classList.remove('hidden');
    btnRemove?.classList.add('hidden');
  }
  clearErr('profileError');
}

// ─────────────────────────────────────────
// DYNAMIC TX FORM & CATEGORY FILTERING BY TYPE
// ─────────────────────────────────────────
function updateTxForm(type) {
  const isIn = type === 'income';

  const title = document.getElementById('txModalTitle');
  if (title) {
    title.innerHTML = isIn
      ? '<i data-lucide="arrow-up-right" style="color:var(--green)"></i> Catat Pemasukan'
      : '<i data-lucide="arrow-down-right" style="color:var(--red)"></i> Catat Pengeluaran';
    lucide.createIcons();
  }

  const lbl = document.getElementById('txTitleLbl');
  const inp = document.getElementById('txTitle');
  if (lbl) lbl.textContent = isIn ? '📝 Nama / Keterangan Pemasukan' : '📝 Untuk Apa?';
  if (inp) inp.placeholder = isIn ? 'Gaji Agustus, hasil jualan…' : 'Makan siang, bensin, belanja…';

  const src  = document.getElementById('sourceGroup');
  const mer  = document.getElementById('merchantGroup');
  const amtL = document.getElementById('txAmountLbl');
  const sub  = document.getElementById('txSubmit');

  if (src) src.classList.toggle('hidden', !isIn);
  if (mer) mer.classList.toggle('hidden', isIn);

  const currSymbol = EXCHANGE_RATES[document.getElementById('txCurrency')?.value || 'IDR']?.symbol || 'Rp';
  if (amtL) amtL.textContent = isIn ? `💵 Jumlah Pemasukan (${currSymbol})` : `💸 Jumlah Pengeluaran (${currSymbol})`;

  if (sub)  sub.style.background = isIn
    ? 'linear-gradient(135deg, #10b981, #059669)'
    : 'linear-gradient(135deg, #7c3aed, #6d28d9)';

  // Filter Category Dropdown in Tx Modal based on selected type (Income vs Expense)
  refreshTxModalCategoryDropdown(type);
}

function refreshTxModalCategoryDropdown(typeFilter = 'expense') {
  const txCat = document.getElementById('txCat');
  if (!txCat) return;

  // Filter categories matching selected type
  const matchingCats = store.categories.filter(c => c.type === typeFilter);

  txCat.innerHTML = matchingCats.map(c =>
    `<option value="${c.id}">${c.name}</option>`
  ).join('');

  // Fallback if no category matches
  if (matchingCats.length === 0) {
    txCat.innerHTML = `<option value="">-- Belum ada kategori ${typeFilter === 'income' ? 'Pemasukan' : 'Pengeluaran'} --</option>`;
  }
}

// ─────────────────────────────────────────
// AUTH UI & PROFILE AVATAR
// ─────────────────────────────────────────
function updateAuthUI() {
  const user = store.currentUser;

  document.getElementById('guestBtns').style.display = user ? 'none' : 'flex';
  document.getElementById('userArea').style.display  = user ? 'flex' : 'none';

  if (user) {
    document.getElementById('navName').textContent = user.name;
    const navAvatar = document.getElementById('navAvatar');
    if (navAvatar) {
      if (user.avatar) {
        navAvatar.innerHTML = `<img src="${user.avatar}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      } else {
        navAvatar.textContent = user.name.charAt(0).toUpperCase();
      }
    }
  }

  // View switch
  const landing   = document.getElementById('viewLanding');
  const dashboard = document.getElementById('viewDashboard');
  if (user) {
    landing.classList.add('hidden');
    dashboard.classList.remove('hidden');
  } else {
    landing.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }
}

// ─────────────────────────────────────────
// ROOM UI
// ─────────────────────────────────────────
function updateRoomUI() {
  const badge = document.getElementById('roomBadge');
  const leave = document.getElementById('btnLeaveRoom');
  const btnMem = document.getElementById('btnRoomMembers');
  if (store.activeRoom) {
    if (badge) badge.textContent = `Room: ${store.activeRoom}`;
    if (leave) leave.classList.remove('hidden');
    if (btnMem) btnMem.classList.remove('hidden');
  } else {
    if (badge) badge.textContent = 'Pribadi';
    if (leave) leave.classList.add('hidden');
    if (btnMem) btnMem.classList.add('hidden');
  }
}

// ─────────────────────────────────────────
// CATEGORY DROPDOWNS FOR FILTER
// ─────────────────────────────────────────
function refreshCatDropdowns() {
  const filtCat = document.getElementById('filterCat');
  if (!filtCat) return;

  const cats = store.categories;
  const prevFilter = filtCat.value;

  filtCat.innerHTML = `<option value="all">Semua Kategori</option>` +
    cats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  filtCat.value = prevFilter;
}

// ─────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────
function renderMetrics(s) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('mNet',    formatRupiah(s.netBalance));
  set('mIncome', formatRupiah(s.totalIncome));
  set('mExpense',formatRupiah(s.totalExpense));
  set('mAvg',    formatRupiah(s.dailyAverageExpense));
}

// ─────────────────────────────────────────
// BUDGET LIST
// ─────────────────────────────────────────
function renderBudget(txs) {
  const container = document.getElementById('budgetList');
  if (!container) return;

  const expCats = store.categories.filter(c => c.type === 'expense');
  if (expCats.length === 0) {
    container.innerHTML = `<div class="empty"><p>Belum ada kategori pengeluaran.</p></div>`;
    return;
  }

  const spent = {};
  txs.filter(t => t.type === 'expense').forEach(t => {
    const amountInIdr = convertCurrency(t.amount, t.currency || 'IDR', 'IDR');
    spent[t.categoryId] = (spent[t.categoryId] || 0) + amountInIdr;
  });

  container.innerHTML = expCats.map(cat => {
    const s = spent[cat.id] || 0;
    const b = cat.budget || 0;
    const pct = b > 0 ? Math.min(Math.round(s / b * 100), 100) : 0;
    const over = b > 0 && s > b;
    const warn = b > 0 && pct >= 90 && !over;
    const fillColor = over ? 'var(--red)' : warn ? 'var(--yellow)' : cat.color;

    return `
      <div class="budget-item">
        <div class="budget-row">
          <div class="budget-name">
            <div class="dot" style="background:${cat.color}"></div>
            ${cat.name}
          </div>
          <div class="budget-amounts">
            <strong>${formatRupiah(s)}</strong>${b > 0 ? ` / ${formatRupiah(b)}` : ''}
          </div>
        </div>
        ${b > 0 ? `
          <div class="prog-bg"><div class="prog-fill" style="width:${pct}%;background:${fillColor}"></div></div>
          ${over ? `<div style="font-size:11px;color:var(--red);margin-top:4px;font-weight:700;">⚠️ Melebihi ${formatRupiah(s-b)}</div>` : ''}
        ` : `<div style="font-size:11px;color:var(--text-3);">Batas anggaran belum diatur</div>`}
      </div>`;
  }).join('');
}

// ─────────────────────────────────────────
// SPREADSHEET
// ─────────────────────────────────────────
function renderSheet(txs) {
  const body = document.getElementById('sheetBody');
  if (!body) return;

  if (txs.length === 0) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--text-3);">Tidak ada data.</td></tr>`;
    return;
  }

  let inc = 0, exp = 0;
  const rows = txs.map((tx, i) => {
    const cat = store.getCategoryById(tx.categoryId);
    const { dateStr, timeStr } = formatDateTime(tx.datetime);
    const isIn = tx.type === 'income';
    const amountInIdr = convertCurrency(tx.amount, tx.currency || 'IDR', 'IDR');
    if (isIn) inc += amountInIdr; else exp += amountInIdr;

    return `<tr>
      <td style="color:var(--text-3)">${i+1}</td>
      <td style="white-space:nowrap;font-size:12px;">${dateStr}<br><span style="color:var(--text-3)">${timeStr}</span></td>
      <td><strong>${tx.title}</strong>${tx.note ? `<br><span style="color:var(--text-3);font-size:11px;">${tx.note}</span>` : ''}</td>
      <td><span style="color:${cat.color};font-weight:700">${cat.name}</span></td>
      <td style="color:${isIn ? 'var(--green)' : 'var(--red)'};font-weight:700">${isIn ? 'MASUK' : 'KELUAR'}</td>
      <td style="text-align:right;font-weight:700;color:${isIn ? 'var(--green)' : 'var(--red)'}">${isIn ? '+' : '-'} ${formatMoney(tx.amount, tx.currency || 'IDR')}</td>
    </tr>`;
  }).join('');

  const net = inc - exp;
  const totRow = `<tr class="total-row">
    <td colspan="4" style="text-align:right;font-weight:800;">TOTAL REKAP (IDR):</td>
    <td style="color:var(--green);font-weight:700">Masuk: ${formatRupiah(inc)}</td>
    <td style="text-align:right;font-weight:900;color:${net >= 0 ? 'var(--green)' : 'var(--red)'}">Net: ${formatRupiah(net)}</td>
  </tr>`;

  body.innerHTML = rows + totRow;
}

// ─────────────────────────────────────────
// TRANSACTION TABLE
// ─────────────────────────────────────────
function renderTxTable(txs) {
  const body  = document.getElementById('txBody');
  const empty = document.getElementById('emptyTx');
  const badge = document.getElementById('txCount');
  if (!body) return;

  if (badge) badge.textContent = `${txs.length} transaksi`;

  if (txs.length === 0) {
    body.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }
  if (empty) empty.classList.add('hidden');

  const sorted = [...txs].sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  body.innerHTML = sorted.map(tx => {
    const cat = store.getCategoryById(tx.categoryId);
    const { dateStr, timeStr } = formatDateTime(tx.datetime);
    const isIn = tx.type === 'income';
    return `
      <tr data-id="${tx.id}">
        <td>
          <div style="font-weight:700">${tx.title}</div>
          ${tx.note ? `<div style="font-size:12px;color:var(--text-3)">${tx.note}</div>` : ''}
          ${tx.roomCode ? `<span style="font-size:11px;background:var(--primary-lt);color:var(--primary);padding:2px 8px;border-radius:99px">Room: ${tx.roomCode}</span>` : ''}
        </td>
        <td>
          <span class="cat-chip" style="background:${cat.color}22;color:${cat.color};border:1px solid ${cat.color}44">
            <i data-lucide="${cat.icon || 'tag'}" style="width:11px;height:11px"></i> ${cat.name}
          </span>
        </td>
        <td style="font-size:12.5px;white-space:nowrap">
          ${dateStr}<br><span style="color:var(--text-3)">${timeStr}</span>
        </td>
        <td style="text-align:right">
          <span class="amount ${isIn ? 'in' : 'out'}">${isIn ? '+' : '-'} ${formatMoney(tx.amount, tx.currency || 'IDR')}</span>
        </td>
        <td style="text-align:right;white-space:nowrap">
          <button class="icon-btn btn-edit-tx" data-id="${tx.id}" title="Edit Transaksi" style="color:var(--primary);margin-right:4px;">
            <i data-lucide="edit-3" style="width:14px;height:14px"></i>
          </button>
          <button class="icon-btn btn-del-tx" data-id="${tx.id}" title="Hapus Transaksi" style="color:var(--red)">
            <i data-lucide="trash-2" style="width:14px;height:14px"></i>
          </button>
        </td>
      </tr>`;
  }).join('');
  lucide.createIcons();
}

// ─────────────────────────────────────────
// PERIOD LABEL
// ─────────────────────────────────────────
function setPeriodLabel() {
  const el = document.getElementById('periodLabel');
  if (!el) return;
  const map = {
    daily: 'Hari Ini', weekly: 'Minggu Ini', monthly: 'Bulan Ini',
    yearly: 'Tahun Ini', all: 'Semua Waktu',
    custom: `${state.customStart || '?'} s/d ${state.customEnd || 'Sekarang'}`
  };
  el.textContent = map[state.timeframe] || 'Bulan Ini';
}

// ─────────────────────────────────────────
// MAIN REFRESH
// ─────────────────────────────────────────
function refresh() {
  updateAuthUI();
  updateRoomUI();

  const txs = store.getFilteredTransactions(
    state.timeframe, state.customStart, state.customEnd,
    state.catFilter, state.typeFilter, state.search
  );

  renderMetrics(store.calculateSummary(txs));
  renderCustomCategoryChart(store.getCategoryBreakdown(txs));
  updateTrendChart(txs);
  renderBudget(txs);
  renderSheet(txs);
  renderTxTable(txs);
  setPeriodLabel();
}

// ─────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────
function bindEvents() {

  // ── Open modals ──
  document.getElementById('btnLogin')?.addEventListener('click',    () => openModal('modalLogin'));
  document.getElementById('btnRegister')?.addEventListener('click', () => openModal('modalRegister'));
  document.getElementById('landingLogin')?.addEventListener('click',    () => openModal('modalLogin'));
  document.getElementById('landingRegister')?.addEventListener('click', () => openModal('modalRegister'));
  document.getElementById('btnNewTx')?.addEventListener('click', () => {
    document.getElementById('editTxId').value = '';
    document.getElementById('txForm').reset();
    document.getElementById('txAmount').value = '';
    const titleEl = document.getElementById('txModalTitle');
    const submitEl = document.getElementById('txSubmit');
    if (titleEl) titleEl.innerHTML = '<i data-lucide="plus-circle" style="color:var(--primary)"></i> Catat Transaksi';
    if (submitEl) submitEl.textContent = 'Simpan ✓';
    updateTxForm('expense');
    openModal('modalTx');
  });
  document.getElementById('btnNewCat')?.addEventListener('click',  () => openModal('modalCat'));
  document.getElementById('btnAddCatQ')?.addEventListener('click', () => openModal('modalCat'));
  document.getElementById('btnCreateRoom')?.addEventListener('click', () => openModal('modalCreateRoom'));
  document.getElementById('btnJoinRoom')?.addEventListener('click',   () => openModal('modalJoinRoom'));

  // Open Profile modal on clicking User Chip in header
  document.getElementById('userChip')?.addEventListener('click', () => openModal('modalProfile'));

  // ── Close modals ──
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', e => closeModal(e.currentTarget.dataset.close));
  });
  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id); });
  });

  // ── Eye icon toggle for Password & PIN fields ──
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn-eye-toggle');
    if (!btn) return;
    const wrap = btn.closest('.input-wrap');
    if (!wrap) return;
    const input = wrap.querySelector('input');
    if (!input) return;

    if (input.type === 'password') {
      input.type = 'text';
      btn.innerHTML = '<i data-lucide="eye-off" style="width:16px;height:16px;"></i>';
      btn.title = 'Sembunyikan';
    } else {
      input.type = 'password';
      btn.innerHTML = '<i data-lucide="eye" style="width:16px;height:16px;"></i>';
      btn.title = 'Lihat';
    }
    lucide.createIcons();
  });

  // ── Theme toggle ──
  document.getElementById('btnTheme')?.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('fintrack-theme', next);
  });

  // ── Login Modal Tabs (Password vs PIN) ──
  document.getElementById('tabLoginPass')?.addEventListener('click', () => {
    document.getElementById('tabLoginPass').classList.add('active');
    document.getElementById('tabLoginPin').classList.remove('active');
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('loginPinForm').classList.add('hidden');
    clearErr('loginError');
  });

  document.getElementById('tabLoginPin')?.addEventListener('click', () => {
    document.getElementById('tabLoginPin').classList.add('active');
    document.getElementById('tabLoginPass').classList.remove('active');
    document.getElementById('loginPinForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    clearErr('loginPinError');
  });

  // ── Auth: Login with Password ──
  document.getElementById('loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('[type="submit"]');
    const email = document.getElementById('loginEmail').value;
    const pass  = document.getElementById('loginPass').value;
    if (btn) { btn.disabled = true; btn.textContent = 'Memeriksa…'; }
    try {
      await store.loginUser(email, pass);
      closeModal('modalLogin');
      document.getElementById('loginForm').reset();
      clearErr('loginError');
      refresh();
      toast(`Selamat datang kembali, ${store.currentUser.name}! 👋`, '✅');
    } catch (err) {
      showErr('loginError', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Masuk →'; }
    }
  });

  // ── Auth: Login with PIN ──
  document.getElementById('loginPinForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('[type="submit"]');
    const email = document.getElementById('loginPinEmail').value;
    const pin   = document.getElementById('loginPinVal').value;
    if (btn) { btn.disabled = true; btn.textContent = 'Memeriksa…'; }
    try {
      await store.loginWithPin(email, pin);
      closeModal('modalLogin');
      document.getElementById('loginPinForm').reset();
      clearErr('loginPinError');
      refresh();
      toast(`Selamat datang kembali, ${store.currentUser.name}! 🔓`, '🔓');
    } catch (err) {
      showErr('loginPinError', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Masuk via PIN 🔒'; }
    }
  });

  // ── Auth: Register ──
  document.getElementById('registerForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('[type="submit"]');
    const name  = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass  = document.getElementById('regPass').value;
    const pin   = document.getElementById('regPin').value;
    if (btn) { btn.disabled = true; btn.textContent = 'Mendaftarkan…'; }
    try {
      await store.registerUser(name, email, pass, pin);
      closeModal('modalRegister');
      document.getElementById('registerForm').reset();
      clearErr('registerError');
      refresh();
      toast(`Akun berhasil dibuat! Selamat datang, ${store.currentUser.name}! 🎉`, '🎊', 't-income');
    } catch (err) {
      showErr('registerError', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Daftar →'; }
    }
  });

function compressImage(file, maxDimension = 200, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Gagal memproses file foto.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Gagal membaca file foto.'));
    reader.readAsDataURL(file);
  });
}

  // ── User Profile Edit & Photo Upload ──
  document.getElementById('profilePhotoInput')?.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Compress avatar to ~15KB to avoid localStorage QuotaExceededError
      const compressedBase64 = await compressImage(file, 200, 0.75);
      state.pendingAvatarBase64 = compressedBase64;

      const avatarImg = document.getElementById('profileAvatarImg');
      const avatarTxt = document.getElementById('profileAvatarText');
      const btnRemove = document.getElementById('btnRemoveAvatar');

      avatarImg.src = compressedBase64;
      avatarImg.classList.remove('hidden');
      avatarTxt.classList.add('hidden');
      btnRemove.classList.remove('hidden');
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('btnRemoveAvatar')?.addEventListener('click', () => {
    state.pendingAvatarBase64 = null;
    const avatarImg = document.getElementById('profileAvatarImg');
    const avatarTxt = document.getElementById('profileAvatarText');
    const btnRemove = document.getElementById('btnRemoveAvatar');

    avatarImg.src = '';
    avatarImg.classList.add('hidden');
    avatarTxt.textContent = (document.getElementById('profName').value || 'U').charAt(0).toUpperCase();
    avatarTxt.classList.remove('hidden');
    btnRemove.classList.add('hidden');
  });

  document.getElementById('profileForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn   = e.currentTarget.querySelector('[type="submit"]');
    const name  = document.getElementById('profName').value;
    const email = document.getElementById('profEmail').value;
    const pass  = document.getElementById('profPass').value;
    const pin   = document.getElementById('profPin').value;

    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan…'; }
    try {
      await store.updateUserProfile({
        name,
        email,
        password: pass,
        pin,
        avatar: state.pendingAvatarBase64
      });
      closeModal('modalProfile');
      refresh();
      toast('Profil & foto berhasil diperbarui! ✨', '👤');
    } catch (err) {
      showErr('profileError', err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Simpan Profil ✓'; }
    }
  });

  // ── Auth: Logout ──
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    store.logoutUser();
    refresh();
    toast('Kamu sudah logout.', '👋');
  });

  // ── Tx Type Radio Switch (Pengeluaran vs Pemasukan) ──
  document.querySelectorAll('input[name="txType"]').forEach(r => {
    r.addEventListener('change', e => updateTxForm(e.target.value));
  });

  // ── Amount Input Formatting (1.000 / 100.000) ──
  document.getElementById('txAmount')?.addEventListener('input', e => {
    const rawValue = parseFormattedNumber(e.target.value);
    e.target.value = formatNumberWithDots(rawValue > 0 ? rawValue : '');
  });

  // ── Currency Switch with Auto Conversion ──
  document.getElementById('txCurrency')?.addEventListener('change', e => {
    const currSelect = e.target;
    const prevCurr = currSelect.dataset.prevCurr || 'IDR';
    const newCurr  = currSelect.value || 'IDR';

    const currentVal = parseFormattedNumber(document.getElementById('txAmount').value);
    if (currentVal > 0) {
      const converted = convertCurrency(currentVal, prevCurr, newCurr);
      document.getElementById('txAmount').value = formatNumberWithDots(Math.round(converted * 100) / 100);
    }
    currSelect.dataset.prevCurr = newCurr;

    // Update label text with new symbol
    const isIncome = document.querySelector('input[name="txType"]:checked')?.value === 'income';
    const symbol = EXCHANGE_RATES[newCurr]?.symbol || 'Rp';
    const amtL = document.getElementById('txAmountLbl');
    if (amtL) amtL.textContent = isIncome ? `💵 Jumlah Pemasukan (${symbol})` : `💸 Jumlah Pengeluaran (${symbol})`;
  });

  // ── Tx form submit (Tambah & Edit) ──
  document.getElementById('txForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = e.currentTarget.querySelector('[type="submit"]');
    const editId = document.getElementById('editTxId').value;
    const type     = document.querySelector('input[name="txType"]:checked').value;
    const title    = document.getElementById('txTitle').value.trim();
    const formattedAmount = document.getElementById('txAmount').value;
    const amount   = parseFormattedNumber(formattedAmount);
    const currency = document.getElementById('txCurrency')?.value || 'IDR';
    const catId    = document.getElementById('txCat').value;
    const datetime = document.getElementById('txDatetime').value;
    const note     = document.getElementById('txNote').value.trim();
    const source   = document.getElementById('txSource')?.value || '';
    const merchant = document.getElementById('txMerchant')?.value.trim() || '';

    if (!title || isNaN(amount) || amount <= 0 || !datetime || !catId) {
      alert('Mohon lengkapi data transaksi dengan kategori yang valid.'); return;
    }

    let enrichedNote = note;
    if (type === 'income' && source && !note.includes(source))    enrichedNote = source + (note ? ` • ${note}` : '');
    if (type === 'expense' && merchant && !note.includes(merchant)) enrichedNote = merchant + (note ? ` • ${note}` : '');

    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan…'; }

    try {
      if (editId) {
        await store.updateTransaction(editId, {
          title,
          amount,
          currency,
          categoryId: catId,
          datetime,
          note: enrichedNote,
          type
        });
        toast(`Transaksi "${title}" berhasil diperbarui! ✏️`, '✨');
      } else {
        await store.addTransaction({
          title,
          amount,
          currency,
          categoryId: catId,
          datetime,
          note: enrichedNote,
          type
        });
        celebrate(type);
        const moneyStr = formatMoney(amount, currency);
        const msg = type === 'income'
          ? `💰 ${title} (${moneyStr}) — Yeay, selamat kamu kaya!`
          : `😅 ${title} (${moneyStr}) — tercatat sebagai pengeluaran!`;
        toast(msg, type === 'income' ? '🤑' : '😢', type === 'income' ? 't-income' : 't-expense');
      }

      closeModal('modalTx');
      document.getElementById('txForm').reset();
      document.getElementById('editTxId').value = '';
      document.getElementById('txAmount').value = '';
      updateTxForm('expense');
      refresh();
    } catch (err) {
      alert(err.message || 'Gagal menyimpan transaksi.');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = editId ? 'Simpan Perubahan ✓' : 'Simpan ✓'; }
    }
  });

  // ── Category form submit ──
  document.getElementById('catForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const name   = document.getElementById('catName').value.trim();
    const type   = document.getElementById('catType').value;
    const budget = parseFloat(document.getElementById('catBudget').value) || 0;
    const color  = document.getElementById('catColor').value || '#f43f5e';
    if (!name) return;
    store.addCategory({ name, type, budget, color, icon: type === 'income' ? 'trending-up' : 'tag' });
    closeModal('modalCat');
    document.getElementById('catForm').reset();
    refreshCatDropdowns();
    refresh();
    toast(`Kategori "${name}" ditambahkan!`, '📁');
  });

  // ── Color swatches ──
  document.getElementById('colorSwatches')?.addEventListener('click', e => {
    const sw = e.target.closest('.swatch');
    if (!sw) return;
    document.querySelectorAll('.swatch').forEach(s => s.classList.remove('picked'));
    sw.classList.add('picked');
    document.getElementById('catColor').value = sw.dataset.color;
  });

  // ── Room: create ──
  document.getElementById('createRoomForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = e.currentTarget.querySelector('[type="submit"]');
    const name = document.getElementById('roomName').value.trim();
    const code = document.getElementById('roomCode').value.trim();
    if (btn) { btn.disabled = true; btn.textContent = 'Membuat…'; }
    try {
      await store.createRoom(code, name);
      closeModal('modalCreateRoom');
      document.getElementById('createRoomForm').reset();
      refresh();
      toast(`Room "${name}" [${code.toUpperCase()}] dibuat! 🏠`, '🏠');
    } catch (err) {
      alert(err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Buat Room'; }
    }
  });

  // ── Room: join ──
  document.getElementById('joinRoomForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn  = e.currentTarget.querySelector('[type="submit"]');
    const code = document.getElementById('joinCode').value.trim();
    if (btn) { btn.disabled = true; btn.textContent = 'Mencari Room…'; }
    try {
      const room = await store.joinRoom(code);
      closeModal('modalJoinRoom');
      document.getElementById('joinRoomForm').reset();
      refresh();
      toast(`Bergabung ke Room: ${room.name} 🚀`, '🚀');
    } catch (err) {
      alert(err.message);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Gabung'; }
    }
  });

  // ── Room: leave ──
  document.getElementById('btnLeaveRoom')?.addEventListener('click', () => {
    store.leaveRoom(); refresh(); toast('Kembali ke mode Pribadi.', '🏠');
  });

  // ── Timeframe tabs ──
  document.querySelectorAll('.tab[data-tf]').forEach(tab => {
    tab.addEventListener('click', e => {
      document.querySelectorAll('.tab[data-tf]').forEach(t => t.classList.remove('active'));
      e.currentTarget.classList.add('active');
      state.timeframe = e.currentTarget.dataset.tf;
      const cRange = document.getElementById('customRange');
      if (state.timeframe === 'custom') {
        cRange?.classList.remove('hidden');
      } else {
        cRange?.classList.add('hidden');
        refresh();
      }
    });
  });

  document.getElementById('btnApplyRange')?.addEventListener('click', () => {
    state.customStart = document.getElementById('dateStart').value;
    state.customEnd   = document.getElementById('dateEnd').value;
    refresh();
  });

  // ── Chart type ──
  document.getElementById('chartType')?.addEventListener('change', e => {
    store.setChartType(e.target.value);
    refresh();
  });

  // ── Chart photo upload ──
  document.getElementById('chartPhoto')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      store.setChartImagePattern(ev.target.result);
      document.getElementById('btnResetPhoto')?.classList.remove('hidden');
      refresh();
      toast('Foto kustom diterapkan!', '🖼️');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('btnResetPhoto')?.addEventListener('click', () => {
    store.setChartImagePattern(null);
    document.getElementById('btnResetPhoto')?.classList.add('hidden');
    document.getElementById('chartPhoto').value = '';
    refresh();
    toast('Foto grafik direset.', '🔄');
  });

  // ── Chart tab toggle ──
  document.getElementById('tabCategory')?.addEventListener('click', () => {
    document.getElementById('chartCategory')?.classList.remove('hidden');
    document.getElementById('chartTrend')?.classList.add('hidden');
    document.getElementById('tabCategory').classList.add('active');
    document.getElementById('tabTrend').classList.remove('active');
  });

  document.getElementById('tabTrend')?.addEventListener('click', () => {
    document.getElementById('chartCategory')?.classList.add('hidden');
    document.getElementById('chartTrend')?.classList.remove('hidden');
    document.getElementById('tabTrend').classList.add('active');
    document.getElementById('tabCategory').classList.remove('active');
  });

  // ── Search & filters ──
  document.getElementById('searchInput')?.addEventListener('input', e => { state.search = e.target.value; refresh(); });
  document.getElementById('filterCat')?.addEventListener('change',  e => { state.catFilter  = e.target.value; refresh(); });
  document.getElementById('filterType')?.addEventListener('change', e => { state.typeFilter = e.target.value; refresh(); });

  // ── Edit & Delete Tx ──
  document.getElementById('txBody')?.addEventListener('click', async e => {
    // Edit button
    const editBtn = e.target.closest('.btn-edit-tx');
    if (editBtn) {
      const id = editBtn.dataset.id;
      const tx = store.transactions.find(t => t.id === id);
      if (!tx) return;

      document.getElementById('editTxId').value = tx.id;
      document.getElementById('txTitle').value = tx.title;
      document.getElementById('txAmount').value = formatNumberWithDots(tx.amount);
      if (document.getElementById('txCurrency')) {
        document.getElementById('txCurrency').value = tx.currency || 'IDR';
      }

      // Type radio
      const isIncome = tx.type === 'income';
      const radInc = document.getElementById('typeIn');
      const radExp = document.getElementById('typeOut');
      if (isIncome && radInc) radInc.checked = true;
      if (!isIncome && radExp) radExp.checked = true;
      updateTxForm(tx.type);

      if (document.getElementById('txCat')) {
        document.getElementById('txCat').value = tx.categoryId;
      }
      if (document.getElementById('txDatetime')) {
        const dt = new Date(tx.datetime);
        document.getElementById('txDatetime').value = getCurrentDateTimeLocalString(dt);
      }
      if (document.getElementById('txNote')) {
        document.getElementById('txNote').value = tx.note || '';
      }

      const titleEl = document.getElementById('txModalTitle');
      const submitEl = document.getElementById('txSubmit');
      if (titleEl) titleEl.innerHTML = '<i data-lucide="edit-3" style="color:var(--primary)"></i> Edit Transaksi';
      if (submitEl) submitEl.textContent = 'Simpan Perubahan ✓';

      openModal('modalTx');
      return;
    }

    // Delete button
    const delBtn = e.target.closest('.btn-del-tx');
    if (delBtn) {
      if (confirm('Hapus transaksi ini?')) {
        await store.deleteTransaction(delBtn.dataset.id);
        refresh();
        toast('Transaksi dihapus.', '🗑️');
      }
    }
  });

  // ── Room Members Modal ──
  document.getElementById('btnRoomMembers')?.addEventListener('click', () => {
    if (!store.activeRoom) return;
    const room = store.rooms.find(r => r.code === store.activeRoom);
    if (!room) { alert('Data Room tidak ditemukan.'); return; }

    const titleEl = document.getElementById('roomMembersTitle');
    const listEl  = document.getElementById('roomMembersList');

    if (titleEl) {
      titleEl.innerHTML = `🏠 Room: <span style="color:var(--primary);">${room.name}</span> <span style="font-size:12px;background:var(--bg-input);padding:3px 8px;border-radius:6px;border:1px solid var(--border);">[${room.code}]</span>`;
    }

    const hostEmail = (room.hostEmail || '').toLowerCase();
    const members = Array.isArray(room.members) && room.members.length > 0 ? room.members : [hostEmail];

    if (listEl) {
      listEl.innerHTML = members.map(mEmail => {
        const cleanM = (mEmail || '').toLowerCase();
        const userObj = store.users.find(u => u.email === cleanM);
        const name = userObj ? userObj.name : cleanM;
        const avatar = userObj ? userObj.avatar : null;
        const isHost = cleanM === hostEmail;

        const avatarHtml = avatar
          ? `<img src="${avatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;">`
          : `<div style="width:36px;height:36px;border-radius:50%;background:var(--primary-lt);color:var(--primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">${name.charAt(0).toUpperCase()}</div>`;

        return `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              ${avatarHtml}
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--text-1);">${name}</div>
                <div style="font-size:12px;color:var(--text-3);">${cleanM}</div>
              </div>
            </div>
            ${isHost ? `
              <span style="font-size:12px;font-weight:700;background:rgba(245,158,11,0.15);color:#f59e0b;padding:4px 10px;border-radius:99px;border:1px solid rgba(245,158,11,0.3);display:flex;align-items:center;gap:4px;">
                👑 Pemilik Room (Host)
              </span>
            ` : `
              <span style="font-size:12px;font-weight:600;background:var(--bg-input);color:var(--text-2);padding:4px 10px;border-radius:99px;border:1px solid var(--border);">
                👤 Anggota
              </span>
            `}
          </div>
        `;
      }).join('');
    }

    openModal('modalRoomMembers');
  });

  // ── Recap / spreadsheet ──
  document.getElementById('btnRecap')?.addEventListener('click', () => {
    const from = document.getElementById('recapFrom').value;
    const to   = document.getElementById('recapTo').value;
    const timeframe = (from || to) ? 'custom' : state.timeframe;
    const txs  = store.getFilteredTransactions(timeframe, from, to, 'all', 'all', '');
    renderSheet(txs);
    toast(`Rekap berhasil (${txs.length} transaksi)`, '📊');
  });

  document.getElementById('btnDownloadPDF')?.addEventListener('click', () => {
    const from = document.getElementById('recapFrom').value;
    const to   = document.getElementById('recapTo').value;
    const timeframe = (from || to) ? 'custom' : state.timeframe;
    const txs  = store.getFilteredTransactions(timeframe, from, to, 'all', 'all', '');
    if (!txs.length) { alert('Tidak ada data untuk diekspor.'); return; }
    exportRecapToPDF(txs, from, to);
    toast('Menyiapkan PDF…', '📄');
  });

  // ── Web Spreadsheet & Google Sheets Modal ──
  let activeSpreadsheetTsv = '';

  document.getElementById('btnExportSpreadsheet')?.addEventListener('click', () => {
    const from = document.getElementById('recapFrom').value;
    const to   = document.getElementById('recapTo').value;
    const timeframe = (from || to) ? 'custom' : state.timeframe;
    const txs  = store.getFilteredTransactions(timeframe, from, to, 'all', 'all', '');
    if (!txs.length) { alert('Tidak ada data transaksi untuk ditampilkan.'); return; }

    const { tsvText, htmlTable } = store.generateSpreadsheetData(txs);
    activeSpreadsheetTsv = tsvText;

    const container = document.getElementById('sheetModalContainer');
    if (container) container.innerHTML = htmlTable;

    // Auto-copy TSV to clipboard immediately so it's ready for Google Sheets
    if (navigator.clipboard) {
      navigator.clipboard.writeText(tsvText).catch(() => {});
    }

    openModal('modalSpreadsheet');
    toast(`Spreadsheet siap (${txs.length} transaksi)`, '📊');
  });

  // ── Buka Google Sheets & Auto Paste ──
  document.getElementById('btnOpenGoogleSheets')?.addEventListener('click', () => {
    if (activeSpreadsheetTsv && navigator.clipboard) {
      navigator.clipboard.writeText(activeSpreadsheetTsv).then(() => {
        toast('📋 Data disalin ke clipboard! Membuka Google Sheets…', '🚀');
      }).catch(() => {});
    }
    window.open('https://sheets.new', '_blank');
  });

  // ── Salin TSV ──
  document.getElementById('btnCopySheetFormat')?.addEventListener('click', () => {
    if (activeSpreadsheetTsv && navigator.clipboard) {
      navigator.clipboard.writeText(activeSpreadsheetTsv).then(() => {
        toast('✅ Format Spreadsheet disalin! Tinggal Ctrl+V di Excel/Google Sheets.', '📋');
      });
    }
  });

  // ── Cetak Spreadsheet ──
  document.getElementById('btnPrintSpreadsheet')?.addEventListener('click', () => {
    const content = document.getElementById('sheetModalContainer')?.innerHTML;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>FinTrack ID — Spreadsheet Rekap Keuangan</title>
        <style>
          body { font-family: sans-serif; padding: 20px; color: #1e293b; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 13px; }
          th { background: #f1f5f9; text-align: left; }
          .income-row { background: #f0fdf4; }
          .expense-row { background: #fef2f2; }
          .summary-row { background: #e0e7ff; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>📊 Rekap Keuangan FinTrack ID</h2>
        <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
        ${content}
        <script>window.print();</script>
      </body>
      </html>
    `);
    win.document.close();
  });
}

// ─────────────────────────────────────────
// INIT
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();

  // Theme
  const saved = localStorage.getItem('fintrack-theme') || 'dark';
  applyTheme(saved);

  // Chart type
  const sel = document.getElementById('chartType');
  if (sel && store.chartType) sel.value = store.chartType;

  // Chart photo reset button
  if (store.chartImagePattern) {
    document.getElementById('btnResetPhoto')?.classList.remove('hidden');
  }

  refreshCatDropdowns();
  bindEvents();
  refresh();
});
