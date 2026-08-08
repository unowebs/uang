/* ==========================================================================
   FinTrack - Data Store with Auth, PIN, Cloud Sync, Multi-Currency & Rooms
   ========================================================================== */

const STORAGE_KEYS = {
  USERS: 'fintrack_users_v2',
  CURRENT_USER: 'fintrack_current_user_v2',
  TRANSACTIONS: 'fintrack_transactions_v2',
  CATEGORIES: 'fintrack_categories_v2',
  ROOMS: 'fintrack_rooms_v2',
  ACTIVE_ROOM: 'fintrack_active_room_v2',
  CHART_IMAGE: 'fintrack_chart_image_v2',
  CHART_TYPE: 'fintrack_chart_type_v2'
};

const SUPABASE_URL = 'https://wpxlgjeqoashomtucibg.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweGxnamVxb2FzaG9tdHVjaWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNDg4NDgsImV4cCI6MjA1NTYyNDg0OH0.s7_G35Yp9H-iR-XN44o-bJ7hXpXnJ2E-31y80lS15Q8';

export const EXCHANGE_RATES = {
  IDR: { symbol: 'Rp', rate: 1, name: 'Rupiah (Rp)' },
  USD: { symbol: '$', rate: 16000, name: 'US Dollar ($)' },
  EUR: { symbol: '€', rate: 17200, name: 'Euro (€)' },
  SGD: { symbol: 'S$', rate: 12000, name: 'Singapore Dollar (S$)' },
  JPY: { symbol: '¥', rate: 105, name: 'Yen (¥)' },
  MYR: { symbol: 'RM', rate: 3600, name: 'Ringgit (RM)' }
};

// Default Categories
const DEFAULT_CATEGORIES = [
  { id: 'cat-makanan', name: 'Makanan & Minuman', type: 'expense', icon: 'utensils', color: '#f43f5e', budget: 2000000 },
  { id: 'cat-transport', name: 'Transportasi', type: 'expense', icon: 'car', color: '#3b82f6', budget: 1000000 },
  { id: 'cat-belanja', name: 'Belanja & Groceries', type: 'expense', icon: 'shopping-bag', color: '#8b5cf6', budget: 1500000 },
  { id: 'cat-tagihan', name: 'Tagihan & Utilitas', type: 'expense', icon: 'zap', color: '#f59e0b', budget: 1200000 },
  { id: 'cat-hiburan', name: 'Hiburan & Rekreasi', type: 'expense', icon: 'film', color: '#ec4899', budget: 800000 },
  { id: 'cat-kesehatan', name: 'Kesehatan', type: 'expense', icon: 'activity', color: '#06b6d4', budget: 500000 },
  { id: 'cat-gaji', name: 'Gaji Utama', type: 'income', icon: 'wallet', color: '#10b981', budget: 0 },
  { id: 'cat-bonus', name: 'Bonus & Side Job', type: 'income', icon: 'trending-up', color: '#34d399', budget: 0 },
  { id: 'cat-investasi', name: 'Hasil Investasi', type: 'income', icon: 'pie-chart', color: '#14b8a6', budget: 0 },
  { id: 'cat-lainnya', name: 'Lain-lain', type: 'expense', icon: 'grid', color: '#64748b', budget: 500000 }
];

export function getCurrentDateTimeLocalString(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function convertCurrency(amount, fromCurr = 'IDR', toCurr = 'IDR') {
  if (fromCurr === toCurr) return amount;
  const fromRate = EXCHANGE_RATES[fromCurr]?.rate || 1;
  const toRate = EXCHANGE_RATES[toCurr]?.rate || 1;
  const amountInIdr = amount * fromRate;
  return amountInIdr / toRate;
}

export function formatMoney(amount, currency = 'IDR') {
  const curr = EXCHANGE_RATES[currency] || EXCHANGE_RATES.IDR;
  const isDecimal = currency !== 'IDR' && currency !== 'JPY';
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: isDecimal ? 2 : 0,
    maximumFractionDigits: isDecimal ? 2 : 0
  }).format(amount);
  return `${curr.symbol} ${formatted}`;
}

export function formatRupiah(number) {
  return formatMoney(number, 'IDR');
}

export function formatDateTime(isoString) {
  const date = new Date(isoString);
  const dateStr = date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
  return { dateStr, timeStr };
}

// Cloud API Sync Helpers (Supabase REST API)
async function fetchCloudUsers() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      return data.map(p => ({
        name: p.full_name || p.name || 'User',
        email: (p.email || '').toLowerCase(),
        password: p.password || p.pass || '',
        pin: p.pin || '123456',
        avatar: p.avatar || null
      }));
    }
  } catch (e) {
    console.warn('Supabase Cloud Sync offline or unreachable:', e);
  }
  return [];
}

async function saveUserToCloud(user) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        email: user.email,
        full_name: user.name,
        password: user.password,
        pin: user.pin,
        avatar: user.avatar
      })
    });
  } catch (e) {
    console.warn('Could not sync user to Supabase Cloud:', e);
  }
}

class Store {
  constructor() {
    this.users = this.loadUsers();
    this.currentUser = this.loadCurrentUser();
    this.categories = this.loadCategories();
    this.transactions = this.loadTransactions();
    this.rooms = this.loadRooms();
    this.activeRoom = this.loadActiveRoom();
    this.chartType = localStorage.getItem(STORAGE_KEYS.CHART_TYPE) || 'doughnut';
    this.chartImagePattern = localStorage.getItem(STORAGE_KEYS.CHART_IMAGE) || null;

    // Initial background sync from cloud for multi-browser support
    this.syncUsersFromCloud();
  }

  async syncUsersFromCloud() {
    const cloudUsers = await fetchCloudUsers();
    if (cloudUsers && cloudUsers.length > 0) {
      cloudUsers.forEach(cu => {
        const idx = this.users.findIndex(u => u.email === cu.email);
        if (idx !== -1) {
          this.users[idx] = { ...this.users[idx], ...cu };
        } else {
          this.users.push(cu);
        }
      });
      this.saveUsers();
    }
  }

  // --- Auth & Profile Handlers ---
  loadUsers() {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  }

  saveUsers() {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
    } catch (e) {
      console.error('LocalStorage quota error:', e);
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        throw new Error('Penyimpanan browser penuh. Foto telah otomatis dikompresi, silakan coba simpan kembali.');
      }
      throw e;
    }
  }

  loadCurrentUser() {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!data) return null;
    try {
      const user = JSON.parse(data);
      if (user && (user.email === 'demo@fintrack.id' || user.name === 'User Demo')) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        return null;
      }
      return user;
    } catch (e) {
      return null;
    }
  }

  saveCurrentUser() {
    try {
      if (this.currentUser) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
      } else {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    } catch (e) {
      console.error('LocalStorage quota error on currentUser:', e);
    }
  }

  async registerUser(name, email, password, pin = '') {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass  = password.trim();
    const cleanName  = name.trim();
    const cleanPin   = pin.trim();

    if (!cleanName || !cleanEmail || !cleanPass) {
      throw new Error('Semua kolom wajib diisi.');
    }
    if (cleanPass.length < 6) {
      throw new Error('Password minimal 6 karakter.');
    }
    if (cleanPin && (cleanPin.length < 4 || cleanPin.length > 6 || !/^\d+$/.test(cleanPin))) {
      throw new Error('PIN harus berupa 4-6 angka.');
    }

    // Check cloud & local
    await this.syncUsersFromCloud();

    const existing = this.users.find(u => u.email === cleanEmail);
    if (existing) {
      throw new Error('Email sudah terdaftar. Silakan login.');
    }

    const newUser = {
      name: cleanName,
      email: cleanEmail,
      password: cleanPass,
      pin: cleanPin || '123456',
      avatar: null
    };
    this.users.push(newUser);
    this.saveUsers();

    // Sync to Cloud DB so other browsers can log in instantly
    saveUserToCloud(newUser);

    this.currentUser = { ...newUser };
    this.saveCurrentUser();
    return this.currentUser;
  }

  async loginUser(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass  = password.trim();

    let user = this.users.find(u => u.email === cleanEmail);

    // If not found in local memory, sync from Cloud DB!
    if (!user) {
      await this.syncUsersFromCloud();
      user = this.users.find(u => u.email === cleanEmail);
    }

    if (!user) {
      throw new Error('Email tidak ditemukan. Pastikan kamu sudah mendaftar.');
    }
    if (user.password !== cleanPass) {
      throw new Error('Password salah. Coba lagi dengan hati-hati.');
    }

    this.currentUser = { ...user };
    this.saveCurrentUser();
    return this.currentUser;
  }

  async loginWithPin(email, pin) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPin   = pin ? pin.trim() : '';

    if (!cleanEmail || !cleanPin) {
      throw new Error('Email dan PIN wajib diisi.');
    }

    let userByEmail = this.users.find(u => u.email === cleanEmail);

    // If not found in local memory, sync from Cloud DB!
    if (!userByEmail) {
      await this.syncUsersFromCloud();
      userByEmail = this.users.find(u => u.email === cleanEmail);
    }

    if (!userByEmail) {
      throw new Error(`Email "${cleanEmail}" belum terdaftar. Silakan klik "Daftar" terlebih dahulu.`);
    }

    if (userByEmail.pin !== cleanPin) {
      throw new Error('PIN salah. Pastikan kamu memasukkan PIN yang benar.');
    }

    this.currentUser = { ...userByEmail };
    this.saveCurrentUser();
    return this.currentUser;
  }

  async updateUserProfile({ name, email, password, pin, avatar }) {
    if (!this.currentUser) throw new Error('Pengguna belum login.');

    const cleanEmail = email ? email.trim().toLowerCase() : this.currentUser.email;
    const cleanName  = name ? name.trim() : this.currentUser.name;
    const cleanPass  = password ? password.trim() : this.currentUser.password;
    const cleanPin   = pin ? pin.trim() : (this.currentUser.pin || '123456');

    if (!cleanName || !cleanEmail || !cleanPass) {
      throw new Error('Nama, Email, dan Password tidak boleh kosong.');
    }
    if (cleanPass.length < 6) {
      throw new Error('Password minimal 6 karakter.');
    }
    if (cleanPin && (cleanPin.length < 4 || cleanPin.length > 6 || !/^\d+$/.test(cleanPin))) {
      throw new Error('PIN harus berupa 4-6 angka.');
    }

    const index = this.users.findIndex(u => u.email === this.currentUser.email);
    const updatedUser = {
      name: cleanName,
      email: cleanEmail,
      password: cleanPass,
      pin: cleanPin,
      avatar: avatar !== undefined ? avatar : (this.currentUser.avatar || null)
    };

    if (index !== -1) {
      this.users[index] = updatedUser;
    } else {
      this.users.push(updatedUser);
    }
    this.saveUsers();

    // Sync to Cloud DB
    saveUserToCloud(updatedUser);

    this.currentUser = { ...updatedUser };
    this.saveCurrentUser();
    return this.currentUser;
  }

  logoutUser() {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  // --- Rooms Handlers ---
  loadRooms() {
    const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
    return data ? JSON.parse(data) : [];
  }

  loadActiveRoom() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ROOM) || null;
  }

  createRoom(roomCode, roomName) {
    const cleanCode = roomCode.toUpperCase().trim();
    const existing = this.rooms.find(r => r.code === cleanCode);
    if (existing) {
      throw new Error('Kode Room sudah digunakan. Buat kode lain.');
    }
    const newRoom = {
      code: cleanCode,
      name: roomName,
      hostEmail: this.currentUser ? this.currentUser.email : 'demo@fintrack.id',
      members: [this.currentUser ? this.currentUser.email : 'demo@fintrack.id']
    };
    this.rooms.push(newRoom);
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(this.rooms));

    this.activeRoom = cleanCode;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROOM, cleanCode);
    return newRoom;
  }

  joinRoom(roomCode) {
    const cleanCode = roomCode.toUpperCase().trim();
    const room = this.rooms.find(r => r.code === cleanCode);
    if (!room) {
      throw new Error(`Room dengan kode "${cleanCode}" tidak ditemukan.`);
    }

    const email = this.currentUser ? this.currentUser.email : 'guest@fintrack.id';
    if (!room.members.includes(email)) {
      room.members.push(email);
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(this.rooms));
    }

    this.activeRoom = cleanCode;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROOM, cleanCode);
    return room;
  }

  leaveRoom() {
    this.activeRoom = null;
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROOM);
  }

  // --- Categories & Transactions Handlers ---
  loadCategories() {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(data);
  }

  saveCategories() {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(this.categories));
  }

  loadTransactions() {
    const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(t => t.userEmail !== 'demo@fintrack.id' && !['tx-1','tx-2','tx-3','tx-4','tx-5'].includes(t.id));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(cleaned));
        }
        return cleaned;
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  saveTransactions() {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
  }

  addTransaction(tx) {
    const newTx = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      userEmail: this.currentUser ? this.currentUser.email : 'demo@fintrack.id',
      roomCode: this.activeRoom || null,
      title: tx.title || 'Transaksi Baru',
      amount: parseFloat(tx.amount) || 0,
      currency: tx.currency || 'IDR',
      type: tx.type || 'expense',
      categoryId: tx.categoryId,
      datetime: tx.datetime ? new Date(tx.datetime).toISOString() : new Date().toISOString(),
      note: tx.note || ''
    };
    this.transactions.unshift(newTx);
    this.saveTransactions();
    return newTx;
  }

  deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.saveTransactions();
  }

  addCategory(cat) {
    const newCat = {
      id: 'cat-' + Date.now(),
      name: cat.name,
      type: cat.type || 'expense',
      icon: cat.icon || 'tag',
      color: cat.color || '#6366f1',
      budget: parseFloat(cat.budget) || 0
    };
    this.categories.push(newCat);
    this.saveCategories();
    return newCat;
  }

  getCategoryById(id) {
    return this.categories.find(c => c.id === id) || {
      name: 'Umum',
      color: '#64748b',
      icon: 'grid',
      type: 'expense'
    };
  }

  setChartType(type) {
    this.chartType = type;
    localStorage.setItem(STORAGE_KEYS.CHART_TYPE, type);
  }

  setChartImagePattern(dataUrl) {
    this.chartImagePattern = dataUrl;
    if (dataUrl) {
      localStorage.setItem(STORAGE_KEYS.CHART_IMAGE, dataUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CHART_IMAGE);
    }
  }

  // Filtering Logic
  getFilteredTransactions(timeframe = 'monthly', customStart = null, customEnd = null, categoryFilter = 'all', typeFilter = 'all', searchQuery = '') {
    const now = new Date();
    const currentUserEmail = this.currentUser ? this.currentUser.email : 'demo@fintrack.id';

    return this.transactions.filter(tx => {
      if (this.activeRoom) {
        if (tx.roomCode !== this.activeRoom) return false;
      } else {
        if (tx.roomCode) return false;
        if (tx.userEmail && tx.userEmail !== currentUserEmail) return false;
      }

      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const cat = this.getCategoryById(tx.categoryId);
        const matchTitle = tx.title.toLowerCase().includes(query);
        const matchNote = tx.note.toLowerCase().includes(query);
        const matchCat = cat.name.toLowerCase().includes(query);
        if (!matchTitle && !matchNote && !matchCat) return false;
      }

      const txDate = new Date(tx.datetime);
      if (timeframe === 'daily') {
        return txDate.toDateString() === now.toDateString();
      } else if (timeframe === 'weekly') {
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay() || 7;
        startOfWeek.setDate(startOfWeek.getDate() - day + 1);
        startOfWeek.setHours(0, 0, 0, 0);

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        return txDate >= startOfWeek && txDate <= endOfWeek;
      } else if (timeframe === 'monthly') {
        return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
      } else if (timeframe === 'yearly') {
        return txDate.getFullYear() === now.getFullYear();
      } else if (timeframe === 'custom' && customStart) {
        const startDate = new Date(customStart);
        startDate.setHours(0, 0, 0, 0);
        
        const endDate = customEnd ? new Date(customEnd) : new Date();
        endDate.setHours(23, 59, 59, 999);

        return txDate >= startDate && txDate <= endDate;
      }

      return true;
    });
  }

  // Summary Metrics Calculation (Converts all transactions to IDR equivalent for metrics summary)
  calculateSummary(filteredTxs) {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTxs.forEach(tx => {
      const amountInIdr = convertCurrency(tx.amount, tx.currency || 'IDR', 'IDR');
      if (tx.type === 'income') {
        totalIncome += amountInIdr;
      } else {
        totalExpense += amountInIdr;
      }
    });

    const netBalance = totalIncome - totalExpense;
    const uniqueDays = new Set(filteredTxs.map(t => new Date(t.datetime).toDateString())).size || 1;
    const dailyAverageExpense = totalExpense / uniqueDays;

    return {
      totalIncome,
      totalExpense,
      netBalance,
      dailyAverageExpense,
      count: filteredTxs.length
    };
  }

  getCategoryBreakdown(filteredTxs) {
    const breakdownMap = {};

    filteredTxs.filter(t => t.type === 'expense').forEach(tx => {
      const cat = this.getCategoryById(tx.categoryId);
      const amountInIdr = convertCurrency(tx.amount, tx.currency || 'IDR', 'IDR');
      if (!breakdownMap[cat.id]) {
        breakdownMap[cat.id] = {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          total: 0,
          budget: cat.budget || 0
        };
      }
      breakdownMap[cat.id].total += amountInIdr;
    });

    return Object.values(breakdownMap).sort((a, b) => b.total - a.total);
  }

  exportToCSV(filteredTxs) {
    const headers = ['ID', 'Judul', 'Jenis', 'Jumlah', 'Mata Uang', 'Kategori', 'Tanggal & Jam', 'User / Room', 'Catatan'];
    const rows = filteredTxs.map(tx => {
      const cat = this.getCategoryById(tx.categoryId);
      return [
        `"${tx.id}"`,
        `"${tx.title.replace(/"/g, '""')}"`,
        `"${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}"`,
        tx.amount,
        `"${tx.currency || 'IDR'}"`,
        `"${cat.name.replace(/"/g, '""')}"`,
        `"${new Date(tx.datetime).toLocaleString('id-ID')}"`,
        `"${tx.roomCode ? 'Room: ' + tx.roomCode : tx.userEmail}"`,
        `"${(tx.note || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FinTrack_Rekapan_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const store = new Store();
