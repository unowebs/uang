/* ==========================================================================
   FinTrack ID — Application Controller
   Clean, Happy & Interactive
   ========================================================================== */

import { store, formatRupiah, formatDateTime, getCurrentDateTimeLocalString } from './store.js';
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
};

// ─────────────────────────────────────────
// THEME
// ─────────────────────────────────────────
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('btnTheme');
  if (btn) { btn.textContent = t === 'light' ? '🌙' : '☀️'; btn.title = t === 'light' ? 'Dark Mode' : 'Light Mode'; }
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
  setTimeout(() => { el.style.transition = 'all .3s ease'; el.style.opacity = '0'; el.style.transform = 'translateX(110%)'; setTimeout(() => el.remove(), 310); }, 3400);
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
// MODAL
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
  }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('open');
}

// ─────────────────────────────────────────
// DYNAMIC TX FORM
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
  if (amtL) amtL.textContent = isIn ? '💵 Jumlah Pemasukan (Rp)' : '💸 Jumlah Pengeluaran (Rp)';
  if (sub)  sub.style.background = isIn
    ? 'linear-gradient(135deg, #10b981, #059669)'
    : 'linear-gradient(135deg, #7c3aed, #6d28d9)';
}

// ─────────────────────────────────────────
// AUTH UI
// ─────────────────────────────────────────
function updateAuthUI() {
  const user = store.currentUser;

  document.getElementById('guestBtns').style.display = user ? 'none' : 'flex';
  document.getElementById('userArea').style.display  = user ? 'flex' : 'none';

  if (user) {
    document.getElementById('navName').textContent   = user.name;
    document.getElementById('navAvatar').textContent = user.name.charAt(0).toUpperCase();
  }

  // view switch
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
  if (store.activeRoom) {
    if (badge) badge.textContent = `Room: ${store.activeRoom}`;
    if (leave) leave.classList.remove('hidden');
  } else {
    if (badge) badge.textContent = 'Pribadi';
    if (leave) leave.classList.add('hidden');
  }
}

// ─────────────────────────────────────────
// CATEGORY DROPDOWNS
// ─────────────────────────────────────────
function refreshCatDropdowns() {
  const txCat   = document.getElementById('txCat');
  const filtCat = document.getElementById('filterCat');
  if (!txCat || !filtCat) return;

  const cats = store.categories;
  const prevFilter = filtCat.value;

  txCat.innerHTML = cats.map(c =>
    `<option value="${c.id}">${c.type === 'income' ? '[Pemasukan] ' : '[Pengeluaran] '}${c.name}</option>`
  ).join('');

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
    spent[t.categoryId] = (spent[t.categoryId] || 0) + t.amount;
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
    if (isIn) inc += tx.amount; else exp += tx.amount;
    return `<tr>
      <td style="color:var(--text-3)">${i+1}</td>
      <td style="white-space:nowrap;font-size:12px;">${dateStr}<br><span style="color:var(--text-3)">${timeStr}</span></td>
      <td><strong>${tx.title}</strong>${tx.note ? `<br><span style="color:var(--text-3);font-size:11px;">${tx.note}</span>` : ''}</td>
      <td><span style="color:${cat.color};font-weight:700">${cat.name}</span></td>
      <td style="color:${isIn ? 'var(--green)' : 'var(--red)'};font-weight:700">${isIn ? 'MASUK' : 'KELUAR'}</td>
      <td style="text-align:right;font-weight:700;color:${isIn ? 'var(--green)' : 'var(--red)'}">${isIn ? '+' : '-'} ${formatRupiah(tx.amount)}</td>
    </tr>`;
  }).join('');

  const net = inc - exp;
  const totRow = `<tr class="total-row">
    <td colspan="4" style="text-align:right;font-weight:800;">TOTAL REKAP:</td>
    <td style="color:var(--green);font-weight:700">Masuk: ${formatRupiah(inc)}</td>
    <td style="text-align:right;font-weight:900;color:${net >= 0 ? 'var(--green)' : 'var(--red)'}">Net: ${formatRupiah(net)}</td>
  </tr>`;

  body.innerHTML = rows + totRow;
}

// ─────────────────────────────────────────
// TRANSACTION TABLE
// ─────────────────────────────────────────
function renderTxTable(txs) {
  const body    = document.getElementById('txBody');
  const empty   = document.getElementById('emptyTx');
  const badge   = document.getElementById('txCount');
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
          <span class="amount ${isIn ? 'in' : 'out'}">${isIn ? '+' : '-'} ${formatRupiah(tx.amount)}</span>
        </td>
        <td style="text-align:right">
          <button class="icon-btn btn-del-tx" data-id="${tx.id}" title="Hapus">
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
  document.getElementById('btnNewTx')?.addEventListener('click',   () => openModal('modalTx'));
  document.getElementById('btnNewCat')?.addEventListener('click',  () => openModal('modalCat'));
  document.getElementById('btnAddCatQ')?.addEventListener('click', () => openModal('modalCat'));
  document.getElementById('btnCreateRoom')?.addEventListener('click', () => openModal('modalCreateRoom'));
  document.getElementById('btnJoinRoom')?.addEventListener('click',   () => openModal('modalJoinRoom'));

  // ── Close modals ──
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', e => closeModal(e.currentTarget.dataset.close));
  });
  document.querySelectorAll('.overlay').forEach(ov => {
    ov.addEventListener('click', e => { if (e.target === ov) closeModal(ov.id); });
  });

  // ── Theme toggle ──
  document.getElementById('btnTheme')?.addEventListener('click', () => {
    const cur  = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('fintrack-theme', next);
  });

  // ── Auth: Login ──
  document.getElementById('loginForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass  = document.getElementById('loginPass').value;
    try {
      store.loginUser(email, pass);
      closeModal('modalLogin');
      document.getElementById('loginForm').reset();
      clearErr('loginError');
      refresh();
      toast(`Selamat datang, ${store.currentUser.name}! 👋`, '✅');
    } catch (err) { showErr('loginError', err.message); }
  });

  // ── Auth: Register ──
  document.getElementById('registerForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const name  = document.getElementById('regName').value;
    const email = document.getElementById('regEmail').value;
    const pass  = document.getElementById('regPass').value;
    try {
      store.registerUser(name, email, pass);
      closeModal('modalRegister');
      document.getElementById('registerForm').reset();
      clearErr('registerError');
      refresh();
      toast(`Akun dibuat! Selamat datang, ${store.currentUser.name}! 🎉`, '🎊', 't-income');
    } catch (err) { showErr('registerError', err.message); }
  });

  // ── Auth: Logout ──
  document.getElementById('btnLogout')?.addEventListener('click', () => {
    store.logoutUser();
    refresh();
    toast('Kamu sudah logout.', '👋');
  });

  // ── Tx type radio → dynamic form ──
  document.querySelectorAll('input[name="txType"]').forEach(r => {
    r.addEventListener('change', e => updateTxForm(e.target.value));
  });

  // ── Tx form submit ──
  document.getElementById('txForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const type     = document.querySelector('input[name="txType"]:checked').value;
    const title    = document.getElementById('txTitle').value.trim();
    const amount   = parseFloat(document.getElementById('txAmount').value);
    const catId    = document.getElementById('txCat').value;
    const datetime = document.getElementById('txDatetime').value;
    const note     = document.getElementById('txNote').value.trim();
    const source   = document.getElementById('txSource')?.value || '';
    const merchant = document.getElementById('txMerchant')?.value.trim() || '';

    if (!title || isNaN(amount) || amount <= 0 || !datetime) {
      alert('Mohon lengkapi data transaksi.'); return;
    }

    let enrichedNote = note;
    if (type === 'income' && source)   enrichedNote = source + (note ? ` • ${note}` : '');
    if (type === 'expense' && merchant) enrichedNote = merchant + (note ? ` • ${note}` : '');

    store.addTransaction({ title, amount, categoryId: catId, datetime, note: enrichedNote, type });
    closeModal('modalTx');
    document.getElementById('txForm').reset();
    updateTxForm('expense');
    refresh();

    celebrate(type);
    const msg = type === 'income'
      ? `💰 ${title} — Yeay, selamat kamu kaya!`
      : `😅 ${title} — tercatat sebagai pengeluaran!`;
    toast(msg, type === 'income' ? '🤑' : '😢', type === 'income' ? 't-income' : 't-expense');
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
  document.getElementById('createRoomForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('roomName').value.trim();
    const code = document.getElementById('roomCode').value.trim();
    try {
      store.createRoom(code, name);
      closeModal('modalCreateRoom');
      document.getElementById('createRoomForm').reset();
      refresh();
      toast(`Room "${name}" [${code.toUpperCase()}] dibuat!`, '🏠');
    } catch (err) { alert(err.message); }
  });

  // ── Room: join ──
  document.getElementById('joinRoomForm')?.addEventListener('submit', e => {
    e.preventDefault();
    const code = document.getElementById('joinCode').value.trim();
    try {
      const room = store.joinRoom(code);
      closeModal('modalJoinRoom');
      document.getElementById('joinRoomForm').reset();
      refresh();
      toast(`Bergabung ke Room: ${room.name}`, '🚀');
    } catch (err) { alert(err.message); }
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

  // ── Delete tx ──
  document.getElementById('txBody')?.addEventListener('click', e => {
    const btn = e.target.closest('.btn-del-tx');
    if (!btn) return;
    if (confirm('Hapus transaksi ini?')) {
      store.deleteTransaction(btn.dataset.id);
      refresh();
      toast('Transaksi dihapus.', '🗑️');
    }
  });

  // ── Recap / spreadsheet ──
  document.getElementById('btnRecap')?.addEventListener('click', () => {
    const from = document.getElementById('recapFrom').value;
    const to   = document.getElementById('recapTo').value;
    const txs  = store.getFilteredTransactions('custom', from, to, 'all', 'all', '');
    renderSheet(txs);
    toast(`Rekap berhasil (${txs.length} transaksi)`, '📊');
  });

  document.getElementById('btnDownloadPDF')?.addEventListener('click', () => {
    const from = document.getElementById('recapFrom').value;
    const to   = document.getElementById('recapTo').value;
    const txs  = store.getFilteredTransactions(from ? 'custom' : state.timeframe, from, to, 'all', 'all', '');
    if (!txs.length) { alert('Tidak ada data untuk diekspor.'); return; }
    exportRecapToPDF(txs, from, to);
    toast('Menyiapkan PDF…', '📄');
  });

  document.getElementById('btnExportCSV')?.addEventListener('click', () => {
    const from = document.getElementById('recapFrom').value;
    const to   = document.getElementById('recapTo').value;
    const txs  = store.getFilteredTransactions(from ? 'custom' : state.timeframe, from, to, 'all', 'all', '');
    if (!txs.length) { alert('Tidak ada data untuk diekspor.'); return; }
    store.exportToCSV(txs);
    toast('CSV / Excel berhasil diunduh!', '📥');
  });
}

// ─────────────────────────────────────────
// CHARTS: remap canvas IDs
// ─────────────────────────────────────────
// charts.js uses 'categoryChartCanvas' and 'trendChartCanvas'
// We need to keep those IDs or patch charts.js.
// Easier: we named canvases canvasCategory / canvasTrend — update charts.js usage inline here
// Actually simpler: just alias via CSS ID in HTML. But since charts.js hardcodes IDs,
// let's check what charts.js looks for.

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
