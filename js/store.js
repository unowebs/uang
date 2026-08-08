/* ==========================================================================
   FinTrack - Enhanced Data Store with Auth, Rooms, Supabase Sync & Recaps
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

// Default Categories
const DEFAULT_CATEGORIES = [
  { id: 'cat-makanan', name: 'Makanan & Minuman', type: 'expense', icon: 'utensils', color: '#f43f5e', budget: 2000000 },
  { id: 'cat-transport', name: 'Transportasi', type: 'expense', icon: 'car', color: '#3b82f6', budget: 1000000 },
  { id: 'cat-belanja', name: 'Belanja & Groceries', type: 'expense', icon: 'shopping-bag', color: '#8b5cf6', budget: 1500000 },
  { id: 'cat-tagihan', name: 'Tagihan & Utilitas', type: 'expense', icon: 'zap', color: '#f59e0b', budget: 1200000 },
  { id: 'cat-hiburan', name: 'Hiburan & Recreasi', type: 'expense', icon: 'film', color: '#ec4899', budget: 800000 },
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

function generateInitialTransactions(userEmail = 'demo@fintrack.id') {
  const now = new Date();
  const formatDateOffset = (daysAgo, hoursAgo = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(d.getHours() - hoursAgo);
    return d.toISOString();
  };

  return [
    {
      id: 'tx-1',
      userEmail: userEmail,
      roomCode: null,
      title: 'Gaji Bulanan Utama',
      amount: 9500000,
      type: 'income',
      categoryId: 'cat-gaji',
      datetime: formatDateOffset(1, 4),
      note: 'Gaji masuk rekening'
    },
    {
      id: 'tx-2',
      userEmail: userEmail,
      roomCode: null,
      title: 'Makan Siang & Kopi',
      amount: 45000,
      type: 'expense',
      categoryId: 'cat-makanan',
      datetime: formatDateOffset(0, 2),
      note: 'Kafe Kopi Susu'
    },
    {
      id: 'tx-3',
      userEmail: userEmail,
      roomCode: null,
      title: 'Isi Bensin Pertamax',
      amount: 200000,
      type: 'expense',
      categoryId: 'cat-transport',
      datetime: formatDateOffset(2, 3),
      note: 'Bensin penuh'
    },
    {
      id: 'tx-4',
      userEmail: userEmail,
      roomCode: null,
      title: 'Supermarket Superindo',
      amount: 720000,
      type: 'expense',
      categoryId: 'cat-belanja',
      datetime: formatDateOffset(3, 5),
      note: 'Beli stok bulanan'
    },
    {
      id: 'tx-5',
      userEmail: userEmail,
      roomCode: null,
      title: 'Tagihan Listrik & Wi-Fi',
      amount: 520000,
      type: 'expense',
      categoryId: 'cat-tagihan',
      datetime: formatDateOffset(5, 8),
      note: 'Tagihan rutin bulanan'
    }
  ];
}

class Store {
  constructor() {
    this.users = this.loadUsers();
    this.currentUser = this.loadCurrentUser();
    this.categories = this.loadCategories();
    this.transactions = this.loadTransactions();
    this.rooms = this.loadRooms();
    this.activeRoom = this.loadActiveRoom();
    this.chartType = localStorage.getItem(STORAGE_KEYS.CHART_TYPE) || 'doughnut'; // doughnut, bar, line, scatter, radar
    this.chartImagePattern = localStorage.getItem(STORAGE_KEYS.CHART_IMAGE) || null;
  }

  // --- Auth Handlers ---
  loadUsers() {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      const defaultUser = [{ name: 'User Demo', email: 'demo@fintrack.id', password: 'password123' }];
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(data);
  }

  loadCurrentUser() {
    const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!data) {
      const defaultUser = { name: 'User Demo', email: 'demo@fintrack.id' };
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(defaultUser));
      return defaultUser;
    }
    return JSON.parse(data);
  }

  registerUser(name, email, password) {
    const existing = this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('Email sudah terdaftar. Silakan login.');
    }
    const newUser = { name, email: email.toLowerCase(), password };
    this.users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));

    this.currentUser = { name: newUser.name, email: newUser.email };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
    return this.currentUser;
  }

  loginUser(email, password) {
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      throw new Error('Email atau password salah.');
    }
    this.currentUser = { name: user.name, email: user.email };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
    return this.currentUser;
  }

  logoutUser() {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }

  // --- Rooms Handlers ---
  loadRooms() {
    const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
    if (!data) {
      const defaultRoom = [
        { code: 'ROOM-UTAMA', name: 'Room Keuangan Keluarga', hostEmail: 'demo@fintrack.id', members: ['demo@fintrack.id'] }
      ];
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(defaultRoom));
      return defaultRoom;
    }
    return JSON.parse(data);
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
    if (!data) {
      const initial = generateInitialTransactions();
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
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

  // Set Chart Type (doughnut, bar, line, scatter, radar)
  setChartType(type) {
    this.chartType = type;
    localStorage.setItem(STORAGE_KEYS.CHART_TYPE, type);
  }

  // Set Chart Pattern Image Data URL
  setChartImagePattern(dataUrl) {
    this.chartImagePattern = dataUrl;
    if (dataUrl) {
      localStorage.setItem(STORAGE_KEYS.CHART_IMAGE, dataUrl);
    } else {
      localStorage.removeItem(STORAGE_KEYS.CHART_IMAGE);
    }
  }

  // Filtering Logic (Accounts for User email and Active Room monitoring)
  getFilteredTransactions(timeframe = 'monthly', customStart = null, customEnd = null, categoryFilter = 'all', typeFilter = 'all', searchQuery = '') {
    const now = new Date();
    const currentUserEmail = this.currentUser ? this.currentUser.email : 'demo@fintrack.id';

    return this.transactions.filter(tx => {
      // Room Mode vs Personal Mode
      if (this.activeRoom) {
        if (tx.roomCode !== this.activeRoom) return false;
      } else {
        // Personal mode: match user's own transactions or personal room
        if (tx.roomCode) return false;
        if (tx.userEmail && tx.userEmail !== currentUserEmail) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;

      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Search query filter
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const cat = this.getCategoryById(tx.categoryId);
        const matchTitle = tx.title.toLowerCase().includes(query);
        const matchNote = tx.note.toLowerCase().includes(query);
        const matchCat = cat.name.toLowerCase().includes(query);
        if (!matchTitle && !matchNote && !matchCat) return false;
      }

      // Timeframe Filter
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

  // Summary Metrics Calculation
  calculateSummary(filteredTxs) {
    let totalIncome = 0;
    let totalExpense = 0;

    filteredTxs.forEach(tx => {
      if (tx.type === 'income') {
        totalIncome += tx.amount;
      } else {
        totalExpense += tx.amount;
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
      if (!breakdownMap[cat.id]) {
        breakdownMap[cat.id] = {
          id: cat.id,
          name: cat.name,
          color: cat.color,
          total: 0,
          budget: cat.budget || 0
        };
      }
      breakdownMap[cat.id].total += tx.amount;
    });

    return Object.values(breakdownMap).sort((a, b) => b.total - a.total);
  }

  exportToCSV(filteredTxs) {
    const headers = ['ID', 'Judul', 'Jenis', 'Jumlah (Rp)', 'Kategori', 'Tanggal & Jam', 'User / Room', 'Catatan'];
    const rows = filteredTxs.map(tx => {
      const cat = this.getCategoryById(tx.categoryId);
      return [
        `"${tx.id}"`,
        `"${tx.title.replace(/"/g, '""')}"`,
        `"${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}"`,
        tx.amount,
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

export function formatRupiah(number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(number);
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

export const store = new Store();
