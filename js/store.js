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
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndweGxnamVxb2FzaG9tdHVjaWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYxODM5NzAsImV4cCI6MjEwMTc1OTk3MH0.-EfnnwMZfawqEYWLX2Iv_9rF6sGEGmiad5sGNKMLKmU';

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
    const res = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=email`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify({
        email: user.email,
        full_name: user.name,
        password: user.password,
        pin: user.pin,
        avatar: user.avatar || null
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error('[Supabase] upsert user failed:', res.status, errText);
    }
  } catch (e) {
    console.warn('[Supabase] network error:', e.message);
  }
}

// Room Cloud Sync Helpers
async function fetchCloudRooms() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rooms?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      return data.map(r => {
        let membersList = [r.host_email];
        if (r.members) {
          try {
            membersList = typeof r.members === 'string' ? JSON.parse(r.members) : r.members;
          } catch (e) {
            membersList = [r.host_email];
          }
        }
        if (!Array.isArray(membersList)) membersList = [r.host_email];
        if (r.host_email && !membersList.includes(r.host_email)) {
          membersList.unshift(r.host_email);
        }
        return {
          code: r.code,
          name: r.name,
          hostEmail: r.host_email,
          members: membersList
        };
      });
    }
  } catch (e) {
    console.warn('Supabase fetch rooms error:', e);
  }
  return [];
}

async function saveRoomToCloud(room) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rooms?on_conflict=code`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        code: room.code,
        name: room.name,
        host_email: room.hostEmail,
        members: JSON.stringify(room.members || [room.hostEmail])
      })
    });
    if (!res.ok) {
      console.error('[Supabase] save room failed:', res.status, await res.text());
    }
  } catch (e) {
    console.warn('Could not sync room to Supabase:', e);
  }
}

// ── Room Members Cloud Helpers ──────────────────────────────────────────────

/** Fetch all members of a room from cloud */
async function fetchRoomMembers(roomCode) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/room_members?room_code=eq.${encodeURIComponent(roomCode)}&select=*&order=joined_at.asc`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (res.ok) return await res.json();
  } catch (e) { console.warn('fetchRoomMembers error:', e); }
  return [];
}

/** Upsert (insert or update) a member row in room_members */
async function upsertRoomMember(roomCode, email, role = 'member', isActive = true) {
  const now = new Date().toISOString();
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/room_members?on_conflict=room_code,email`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          room_code: roomCode,
          email: email,
          role: role,
          is_active: isActive,
          last_seen: now
        })
      }
    );
    if (!res.ok) console.error('[Supabase] upsertRoomMember failed:', res.status, await res.text());
  } catch (e) { console.warn('upsertRoomMember error:', e); }
}

/** Update a member's role and set role_updated_at */
async function updateMemberRoleCloud(roomCode, email, role) {
  const now = new Date().toISOString();
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/room_members?room_code=eq.${encodeURIComponent(roomCode)}&email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: role, role_updated_at: now })
      }
    );
    if (!res.ok) console.error('[Supabase] updateMemberRoleCloud failed:', res.status, await res.text());
  } catch (e) { console.warn('updateMemberRoleCloud error:', e); }
}

/** Heartbeat: mark member as active and refresh last_seen */
async function heartbeatMemberCloud(roomCode, email) {
  const now = new Date().toISOString();
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/room_members?room_code=eq.${encodeURIComponent(roomCode)}&email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: true, last_seen: now })
      }
    );
  } catch (e) { /* silent fail for heartbeat */ }
}

/** Mark member as inactive when they leave */
async function markMemberInactiveCloud(roomCode, email) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/room_members?room_code=eq.${encodeURIComponent(roomCode)}&email=eq.${encodeURIComponent(email)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: false })
      }
    );
  } catch (e) { /* silent */ }
}

/** Get the current user's role in a specific room */
async function getMyRoomRoleCloud(roomCode, email) {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/room_members?room_code=eq.${encodeURIComponent(roomCode)}&email=eq.${encodeURIComponent(email)}&select=role,role_updated_at`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    if (res.ok) {
      const data = await res.json();
      return data.length > 0 ? data[0] : null;
    }
  } catch (e) { /* silent */ }
  return null;
}

// Transaction Cloud Sync Helpers

async function fetchCloudTransactions() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?select=*`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      return data.map(t => ({
        id: t.id,
        userEmail: t.user_email,
        title: t.title,
        amount: parseFloat(t.amount) || 0,
        currency: t.currency || 'IDR',
        type: t.type || 'expense',
        categoryId: t.category_id,
        datetime: t.datetime,
        note: t.note || '',
        roomCode: t.room_code || null
      }));
    }
  } catch (e) {
    console.warn('Supabase fetch transactions error:', e);
  }
  return [];
}

async function saveTransactionToCloud(tx) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?on_conflict=id`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        id: tx.id,
        user_email: tx.userEmail,
        title: tx.title,
        amount: tx.amount,
        currency: tx.currency || 'IDR',
        type: tx.type || 'expense',
        category_id: tx.categoryId,
        datetime: tx.datetime,
        note: tx.note || '',
        room_code: tx.roomCode || null
      })
    });
    if (!res.ok) {
      console.error('[Supabase] save tx failed:', res.status, await res.text());
    }
  } catch (e) {
    console.warn('Could not sync tx to Supabase:', e);
  }
}

async function deleteTransactionFromCloud(id) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/transactions?id=eq.${id}`, {
      method: 'DELETE',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (!res.ok) {
      console.error('[Supabase] delete tx failed:', res.status, await res.text());
    }
  } catch (e) {
    console.warn('Could not delete tx from Supabase:', e);
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

    /** Current user's role in activeRoom: 'host'|'member'|'editor'|'viewer'|null */
    this.roomRole = null;
    /** Timestamp of last known role_updated_at (for change detection) */
    this.lastRoleUpdatedAt = null;

    // Initial background sync from cloud for multi-browser support
    this.syncAllFromCloud();
  }

  async syncAllFromCloud() {
    await Promise.all([
      this.syncUsersFromCloud(),
      this.syncRoomsFromCloud(),
      this.syncTransactionsFromCloud()
    ]);
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

      if (this.currentUser) {
        const updatedCurrent = this.users.find(u => u.email === this.currentUser.email);
        if (updatedCurrent) {
          this.currentUser = { ...updatedCurrent };
          this.saveCurrentUser();
        }
      }
    }
  }

  async syncRoomsFromCloud() {
    const cloudRooms = await fetchCloudRooms();
    if (cloudRooms && cloudRooms.length > 0) {
      cloudRooms.forEach(cr => {
        const idx = this.rooms.findIndex(r => r.code === cr.code);
        if (idx !== -1) {
          this.rooms[idx] = { ...this.rooms[idx], ...cr };
        } else {
          this.rooms.push(cr);
        }
      });
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(this.rooms));
    }
  }

  async syncTransactionsFromCloud() {
    const cloudTxs = await fetchCloudTransactions();
    if (cloudTxs && cloudTxs.length > 0) {
      cloudTxs.forEach(ctx => {
        const idx = this.transactions.findIndex(t => t.id === ctx.id);
        if (idx !== -1) {
          this.transactions[idx] = { ...this.transactions[idx], ...ctx };
        } else {
          this.transactions.push(ctx);
        }
      });
      this.saveTransactions();
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
    const cleanPass = password.trim();
    const cleanName = name.trim();
    const cleanPin = pin.trim();

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
    await this.syncAllFromCloud();

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
    this.activeRoom = null;
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROOM);
    return this.currentUser;
  }

  async loginUser(email, password) {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    // Always sync from cloud first
    await this.syncAllFromCloud();

    let user = this.users.find(u => u.email === cleanEmail);

    if (!user) {
      throw new Error('Email tidak ditemukan. Pastikan kamu sudah mendaftar.');
    }
    if (user.password !== cleanPass) {
      throw new Error('Password salah. Coba lagi dengan hati-hati.');
    }

    this.currentUser = { ...user };
    this.saveCurrentUser();
    this.activeRoom = null;
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROOM);
    return this.currentUser;
  }

  async loginWithPin(email, pin) {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPin = pin ? pin.trim() : '';

    if (!cleanEmail || !cleanPin) {
      throw new Error('Email dan PIN wajib diisi.');
    }

    // Always sync from cloud first
    await this.syncAllFromCloud();

    const userByEmail = this.users.find(u => u.email === cleanEmail);

    if (!userByEmail) {
      throw new Error(`Email "${cleanEmail}" belum terdaftar. Silakan klik "Daftar" terlebih dahulu.`);
    }

    if (userByEmail.pin !== cleanPin) {
      throw new Error('PIN salah. Pastikan kamu memasukkan PIN yang benar.');
    }

    this.currentUser = { ...userByEmail };
    this.saveCurrentUser();
    this.activeRoom = null;
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROOM);
    return this.currentUser;
  }

  async updateUserProfile({ name, email, password, pin, avatar }) {
    if (!this.currentUser) throw new Error('Pengguna belum login.');

    const cleanEmail = email ? email.trim().toLowerCase() : this.currentUser.email;
    const cleanName = name ? name.trim() : this.currentUser.name;
    const cleanPass = password ? password.trim() : this.currentUser.password;
    const cleanPin = pin ? pin.trim() : (this.currentUser.pin || '123456');

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

    // Await sync to Cloud DB so other browsers get updates immediately
    await saveUserToCloud(updatedUser);

    this.currentUser = { ...updatedUser };
    this.saveCurrentUser();
    return this.currentUser;
  }

  logoutUser() {
    this.currentUser = null;
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    this.activeRoom = null;
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROOM);
  }

  // --- Rooms Handlers ---
  loadRooms() {
    const data = localStorage.getItem(STORAGE_KEYS.ROOMS);
    return data ? JSON.parse(data) : [];
  }

  loadActiveRoom() {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ROOM) || null;
  }

  async createRoom(roomCode, roomName, importExistingData = false) {
    const cleanCode = roomCode.toUpperCase().trim();
    await this.syncRoomsFromCloud();

    const existing = this.rooms.find(r => r.code === cleanCode);
    if (existing) {
      throw new Error('Kode Room sudah digunakan. Buat kode lain.');
    }
    const hostEmail = this.currentUser ? this.currentUser.email : 'demo@fintrack.id';
    const newRoom = {
      code: cleanCode,
      name: roomName,
      hostEmail: hostEmail,
      members: [hostEmail]
    };
    this.rooms.push(newRoom);
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(this.rooms));

    // Sync room + add host to room_members
    await saveRoomToCloud(newRoom);
    await upsertRoomMember(cleanCode, hostEmail, 'host', true);

    this.activeRoom = cleanCode;
    this.roomRole = 'host';
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROOM, cleanCode);

    // If user wants to import their existing personal transactions into this room
    if (importExistingData) {
      const myEmail = hostEmail;
      const personalTxs = this.transactions.filter(
        t => t.userEmail === myEmail && !t.roomCode
      );
      for (const tx of personalTxs) {
        tx.roomCode = cleanCode;
        await saveTransactionToCloud(tx);
      }
      if (personalTxs.length > 0) {
        this.saveTransactions();
      }
      return { ...newRoom, importedCount: personalTxs.length };
    }

    return newRoom;
  }


  async joinRoom(roomCode) {
    const cleanCode = roomCode.toUpperCase().trim();

    // Sync rooms from cloud so rooms created on another device are fetched!
    await this.syncRoomsFromCloud();

    const room = this.rooms.find(r => r.code === cleanCode);
    if (!room) {
      throw new Error(`Room dengan kode "${cleanCode}" tidak ditemukan.`);
    }

    const email = this.currentUser ? this.currentUser.email : 'guest@fintrack.id';
    const isHost = room.hostEmail === email;
    const defaultRole = isHost ? 'host' : 'member';

    // Always upsert to room_members (preserves existing role if already joined)
    const existingRecord = await getMyRoomRoleCloud(cleanCode, email);
    const assignedRole = existingRecord ? existingRecord.role : defaultRole;

    if (!room.members.includes(email)) {
      room.members.push(email);
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(this.rooms));
      await saveRoomToCloud(room);
    }
    await upsertRoomMember(cleanCode, email, assignedRole, true);

    this.activeRoom = cleanCode;
    this.roomRole = assignedRole;
    this.lastRoleUpdatedAt = existingRecord ? existingRecord.role_updated_at : null;
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ROOM, cleanCode);

    // Sync transactions for this room from cloud
    await this.syncTransactionsFromCloud();

    return room;
  }

  async leaveRoom() {
    if (this.activeRoom && this.currentUser) {
      await markMemberInactiveCloud(this.activeRoom, this.currentUser.email);
    }
    this.activeRoom = null;
    this.roomRole = null;
    this.lastRoleUpdatedAt = null;
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROOM);
  }

  // ── Public Room Member API ─────────────────────────────────────────────────

  /** Fetch all room_members rows for current active room */
  async fetchRoomMemberList() {
    if (!this.activeRoom) return [];
    return await fetchRoomMembers(this.activeRoom);
  }

  /** Update a member's role (host only action) */
  async updateMemberRole(email, role) {
    if (!this.activeRoom) return;
    await updateMemberRoleCloud(this.activeRoom, email, role);
  }

  /** Heartbeat: keep current user marked as active */
  async heartbeat() {
    if (!this.activeRoom || !this.currentUser) return;
    await heartbeatMemberCloud(this.activeRoom, this.currentUser.email);
  }

  /** Poll for role change; returns new role if changed, null otherwise */
  async pollRoleChange() {
    if (!this.activeRoom || !this.currentUser) return null;
    const record = await getMyRoomRoleCloud(this.activeRoom, this.currentUser.email);
    if (!record) return null;
    // Detect change by comparing role_updated_at timestamp
    if (this.lastRoleUpdatedAt && record.role_updated_at !== this.lastRoleUpdatedAt) {
      this.lastRoleUpdatedAt = record.role_updated_at;
      this.roomRole = record.role;
      return record.role;
    }
    if (!this.lastRoleUpdatedAt) {
      this.lastRoleUpdatedAt = record.role_updated_at;
      this.roomRole = record.role;
    }
    return null;
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
        const cleaned = parsed.filter(t => t.userEmail !== 'demo@fintrack.id' && !['tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-5'].includes(t.id));
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

  async addTransaction(tx) {
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

    // Sync to Supabase Cloud
    await saveTransactionToCloud(newTx);

    return newTx;
  }

  async updateTransaction(id, txData) {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Transaksi tidak ditemukan.');

    const updatedTx = {
      ...this.transactions[index],
      title: txData.title !== undefined ? txData.title : this.transactions[index].title,
      amount: txData.amount !== undefined ? parseFloat(txData.amount) : this.transactions[index].amount,
      currency: txData.currency || this.transactions[index].currency || 'IDR',
      type: txData.type || this.transactions[index].type,
      categoryId: txData.categoryId || this.transactions[index].categoryId,
      datetime: txData.datetime ? new Date(txData.datetime).toISOString() : this.transactions[index].datetime,
      note: txData.note !== undefined ? txData.note : this.transactions[index].note
    };

    this.transactions[index] = updatedTx;
    this.saveTransactions();

    // Sync to Supabase Cloud
    await saveTransactionToCloud(updatedTx);

    return updatedTx;
  }

  async deleteTransaction(id) {
    this.transactions = this.transactions.filter(t => t.id !== id);
    this.saveTransactions();

    // Delete from Supabase Cloud
    await deleteTransactionFromCloud(id);
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

  generateSpreadsheetData(filteredTxs) {
    const headers = ['NO', 'TANGGAL & JAM', 'KETERANGAN', 'KATEGORI', 'JENIS', 'JUMLAH', 'MATA UANG', 'AKUN / ROOM', 'CATATAN'];

    let totalIncome = 0;
    let totalExpense = 0;

    const rowsTsv = [];
    const rowsHtml = [];

    // Header TSV
    rowsTsv.push(headers.join('\t'));

    filteredTxs.forEach((tx, i) => {
      const cat = this.getCategoryById(tx.categoryId);
      const isIncome = tx.type === 'income';
      const dt = formatDateTime(tx.datetime);
      const dateTimeStr = `${dt.dateStr} ${dt.timeStr}`;
      const amountVal = tx.amount;
      const currency = tx.currency || 'IDR';
      const formattedAmt = formatMoney(amountVal, currency);

      const amountInIdr = convertCurrency(amountVal, currency, 'IDR');
      if (isIncome) totalIncome += amountInIdr;
      else totalExpense += amountInIdr;

      // TSV row (tab delimited for Excel/Google Sheets direct paste)
      rowsTsv.push([
        i + 1,
        dateTimeStr,
        tx.title,
        cat.name,
        isIncome ? 'Pemasukan' : 'Pengeluaran',
        amountVal,
        currency,
        tx.roomCode ? `Room: ${tx.roomCode}` : (tx.userEmail || 'Pribadi'),
        tx.note || ''
      ].join('\t'));

      // HTML formatted table row
      rowsHtml.push(`
        <tr class="${isIncome ? 'income-row' : 'expense-row'}">
          <td style="text-align:center;font-weight:600;">${i + 1}</td>
          <td>${dateTimeStr}</td>
          <td style="font-weight:600;">${tx.title}</td>
          <td><span style="display:inline-block;padding:2px 8px;border-radius:12px;background:${cat.color}22;color:${cat.color};font-weight:600;font-size:12px;">${cat.name}</span></td>
          <td><span style="font-weight:700;color:${isIncome ? 'var(--emerald)' : 'var(--red)'};">${isIncome ? '➕ Pemasukan' : '➖ Pengeluaran'}</span></td>
          <td style="text-align:right;font-weight:700;color:${isIncome ? 'var(--emerald)' : 'var(--red)'};">${isIncome ? '+' : '-'}${formattedAmt}</td>
          <td style="font-size:12px;color:var(--text-3);">${tx.roomCode ? 'Room: ' + tx.roomCode : 'Pribadi'}</td>
          <td style="font-size:12px;color:var(--text-3);">${tx.note || '-'}</td>
        </tr>
      `);
    });

    const netBalance = totalIncome - totalExpense;

    // TSV Summary rows
    rowsTsv.push('');
    rowsTsv.push(['', '', 'TOTAL PEMASUKAN', '', '', totalIncome, 'IDR', '', ''].join('\t'));
    rowsTsv.push(['', '', 'TOTAL PENGELUARAN', '', '', totalExpense, 'IDR', '', ''].join('\t'));
    rowsTsv.push(['', '', 'SALDO BERSIH', '', '', netBalance, 'IDR', '', ''].join('\t'));

    const tsvText = rowsTsv.join('\n');

    const htmlTable = `
      <div style="margin-bottom:12px;display:flex;gap:16px;flex-wrap:wrap;font-size:13px;">
        <div style="background:rgba(16,185,129,0.1);padding:8px 14px;border-radius:8px;color:var(--emerald);font-weight:700;">
          📥 Total Pemasukan: ${formatMoney(totalIncome, 'IDR')}
        </div>
        <div style="background:rgba(244,63,94,0.1);padding:8px 14px;border-radius:8px;color:var(--red);font-weight:700;">
          📤 Total Pengeluaran: ${formatMoney(totalExpense, 'IDR')}
        </div>
        <div style="background:rgba(99,102,241,0.1);padding:8px 14px;border-radius:8px;color:var(--primary);font-weight:800;">
          💼 Saldo Bersih: ${formatMoney(netBalance, 'IDR')}
        </div>
      </div>
      <table class="spreadsheet-formatted-table" style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:var(--bg-input);">
            <th style="padding:10px;border:1px solid var(--border);">No</th>
            <th style="padding:10px;border:1px solid var(--border);">Tanggal & Jam</th>
            <th style="padding:10px;border:1px solid var(--border);">Keterangan</th>
            <th style="padding:10px;border:1px solid var(--border);">Kategori</th>
            <th style="padding:10px;border:1px solid var(--border);">Jenis</th>
            <th style="padding:10px;border:1px solid var(--border);text-align:right;">Jumlah</th>
            <th style="padding:10px;border:1px solid var(--border);">Akun / Room</th>
            <th style="padding:10px;border:1px solid var(--border);">Catatan</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.join('')}
        </tbody>
        <tfoot>
          <tr class="summary-row" style="background:var(--bg-input);font-weight:800;">
            <td colspan="5" style="padding:12px;border:1px solid var(--border);text-align:right;">TOTAL PEMASUKAN:</td>
            <td style="padding:12px;border:1px solid var(--border);text-align:right;color:var(--emerald);">${formatMoney(totalIncome, 'IDR')}</td>
            <td colspan="2" style="border:1px solid var(--border);"></td>
          </tr>
          <tr class="summary-row" style="background:var(--bg-input);font-weight:800;">
            <td colspan="5" style="padding:12px;border:1px solid var(--border);text-align:right;">TOTAL PENGELUARAN:</td>
            <td style="padding:12px;border:1px solid var(--border);text-align:right;color:var(--red);">${formatMoney(totalExpense, 'IDR')}</td>
            <td colspan="2" style="border:1px solid var(--border);"></td>
          </tr>
          <tr class="summary-row" style="background:var(--bg-input);font-weight:800;">
            <td colspan="5" style="padding:12px;border:1px solid var(--border);text-align:right;">SALDO BERSIH:</td>
            <td style="padding:12px;border:1px solid var(--border);text-align:right;color:var(--primary);">${formatMoney(netBalance, 'IDR')}</td>
            <td colspan="2" style="border:1px solid var(--border);"></td>
          </tr>
        </tfoot>
      </table>
    `;

    return { tsvText, htmlTable, count: filteredTxs.length };
  }

  exportToExcel(filteredTxs) {
    const { htmlTable } = this.generateSpreadsheetData(filteredTxs);
    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Rekap Keuangan</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; font-size: 12px; }
          th { background-color: #0f9d58; color: white; border: 1px solid #cccccc; padding: 8px; text-align: left; }
          td { border: 1px solid #cccccc; padding: 8px; }
          .income-row { background-color: #e6f4ea; }
          .expense-row { background-color: #fce8e6; }
          .summary-row { background-color: #e8f0fe; font-weight: bold; }
        </style>
      </head>
      <body>
        <h2>📊 Rekap Keuangan FinTrack ID</h2>
        <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
        ${htmlTable}
      </body>
      </html>
    `;

    const blob = new Blob(['\uFEFF' + excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FinTrack_Rekap_Keuangan_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  exportToCSV(filteredTxs) {
    const { tsvText } = this.generateSpreadsheetData(filteredTxs);
    const blob = new Blob([tsvText], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `FinTrack_Spreadsheet_${new Date().toISOString().slice(0, 10)}.tsv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export const store = new Store();
