
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Ticket, User, CheckInLog, Branch, UserRole, TicketType, TicketStatus, AuditLog, CustomerDetail } from '../types';

// --- Constants ---
export const BRANCHES: Branch[] = [
  { id: 'anan1', name: 'Yoga An An - Lê Lợi', address: '123 Lê Lợi, Q1' },
  { id: 'anan2', name: 'Yoga An An - Nguyễn Huệ', address: '45 Nguyễn Huệ, Q1' },
];

const HMAC_SECRET = 'winson-secure-key-2024';
const STORAGE_KEY = 'winson_db_v5'; 
const SESSION_KEY = 'winson_session_user';

// --- UTILS (Fix Unicode Error) ---
const safeEncode = (str: string) => {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
    }));
};

const safeDecode = (str: string) => {
    return decodeURIComponent(Array.prototype.map.call(atob(str), (c: any) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
};

// --- LOCAL STORAGE FALLBACK SYSTEM ---
interface LocalDB {
    users: User[];
    tickets: Ticket[];
    checkin_logs: CheckInLog[];
    audit_logs: AuditLog[];
}

const SEED_DB: LocalDB = {
    users: [
        { id: 'owner1', name: 'Nguyễn Văn Chủ', phone: '0909000001', role: UserRole.OWNER, password: 'admin123' },
        { id: 'staff1', name: 'Lê Văn Quản', phone: '0909000002', role: UserRole.STAFF, password: 'staff123', branch_id: 'anan1' },
        { id: 'cust1', name: 'Chị Lan', phone: '0912345678', role: UserRole.CUSTOMER, pin_hash: '1234', identity_token: 'ID_0912345678' }
    ],
    tickets: [
        { ticket_id: 'T001', shop_id: 'anan', branch_id: 'anan1', owner_phone: '0912345678', owner_name: 'Chị Lan', type: TicketType.SESSION_20, type_label: 'Gói 20 Buổi', total_uses: 20, remaining_uses: 15, expires_at: '2024-12-31T00:00:00Z', status: TicketStatus.ACTIVE, require_pin: true, created_at: '2024-01-01T00:00:00Z' }
    ],
    checkin_logs: [],
    audit_logs: []
};

const getLocalDB = (): LocalDB => {
    const str = localStorage.getItem(STORAGE_KEY);
    if (!str) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DB));
        return SEED_DB;
    }
    return JSON.parse(str);
};

const saveLocalDB = (db: LocalDB) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
};

// --- SESSION MANAGEMENT ---
export const saveSession = (user: User) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const getSession = (): User | null => {
    const str = localStorage.getItem(SESSION_KEY);
    return str ? JSON.parse(str) : null;
};

export const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
};

// --- SERVICES ---

const mockHmac = (text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    return Math.abs(hash).toString(16);
};

const logAudit = async (action: AuditLog['action'], performerId: string, details: string, targetId?: string) => {
    // Logic log (giữ nguyên)
    console.log(`[AUDIT] ${action}: ${details}`);
};

// 1. AUTH & USERS
export const login = async (phone: string, secret: string, requiredRole?: UserRole): Promise<{ user: User | null; error?: string }> => {
    let user: User | undefined;
    
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('users').select('*').eq('phone', phone).single();
        if (!data) return { user: null, error: 'Số điện thoại không tồn tại' };
        user = data as User;
    } else {
        const db = getLocalDB();
        user = db.users.find(u => u.phone === phone);
        if (!user) return { user: null, error: 'Số điện thoại không tồn tại' };
    }

    if (requiredRole && user.role !== requiredRole) {
        return { user: null, error: `Tài khoản không có quyền truy cập này` };
    }

    // Password/PIN check
    if (user.role === UserRole.CUSTOMER) {
        if (user.pin_hash !== secret) return { user: null, error: 'Mã PIN không đúng' };
    } else {
        if (user.password !== secret) return { user: null, error: 'Mật khẩu không đúng' };
    }

    saveSession(user); // Save to local storage
    return { user };
};

export const registerCustomer = async (name: string, phone: string, pin: string, performerId: string) => {
    const newUser: User = {
        id: `u_${Date.now()}`,
        name,
        phone,
        role: UserRole.CUSTOMER,
        pin_hash: pin,
        identity_token: '' 
    };
    
    newUser.identity_token = generateIdentityToken(newUser);

    if (isSupabaseConfigured()) {
        const { error } = await supabase.from('users').insert(newUser);
        if (error) return { success: false, message: error.message }; // Return exact Supabase error
    } else {
        const db = getLocalDB();
        if (db.users.some(u => u.phone === phone)) return { success: false, message: 'Số điện thoại đã tồn tại' };
        db.users.push(newUser);
        saveLocalDB(db);
    }
    return { success: true, user: newUser };
};

export const getCustomers = async (): Promise<User[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('users').select('*').eq('role', UserRole.CUSTOMER);
        return (data as User[]) || [];
    } else {
        return getLocalDB().users.filter(u => u.role === UserRole.CUSTOMER);
    }
};

export const getCustomerFullDetails = async (phone: string): Promise<CustomerDetail | null> => {
    let user: User | undefined;
    let tickets: Ticket[] = [];
    let logs: CheckInLog[] = [];

    if (isSupabaseConfigured()) {
        const { data: u } = await supabase.from('users').select('*').eq('phone', phone).single();
        if (!u) return null;
        user = u as User;
        const { data: t } = await supabase.from('tickets').select('*').eq('owner_phone', phone);
        tickets = (t as Ticket[]) || [];
        const { data: l } = await supabase.from('checkin_logs').select('*').eq('user_phone', phone).order('timestamp', { ascending: false });
        logs = (l as CheckInLog[]) || [];
    } else {
        const db = getLocalDB();
        user = db.users.find(u => u.phone === phone);
        if (!user) return null;
        tickets = db.tickets.filter(t => t.owner_phone === phone);
        logs = db.checkin_logs.filter(l => l.user_phone === phone);
    }

    return { user, tickets, logs };
};

export const generateIdentityToken = (user: User) => {
    const payload = JSON.stringify({
        type: 'identity',
        phone: user.phone,
        name: user.name,
        sig: mockHmac(user.phone + HMAC_SECRET)
    });
    return safeEncode(payload);
};

export const parseIdentityToken = (token: string): string | null => {
    try {
        const json = JSON.parse(safeDecode(token));
        if (json.type === 'identity' && json.phone) {
            return json.phone;
        }
        return null;
    } catch (e) {
        return null;
    }
};

export const changePin = async (phone: string, oldPin: string, newPin: string) => {
    const { user } = await login(phone, oldPin, UserRole.CUSTOMER);
    if (!user) return { success: false, message: 'PIN cũ không đúng' };

    if (isSupabaseConfigured()) {
        await supabase.from('users').update({ pin_hash: newPin }).eq('phone', phone);
    } else {
        const db = getLocalDB();
        const idx = db.users.findIndex(u => u.phone === phone);
        if (idx !== -1) {
            db.users[idx].pin_hash = newPin;
            saveLocalDB(db);
        }
    }
    return { success: true, message: 'Đổi PIN thành công' };
};

// 2. TICKETS
export const createTicket = async (
    data: { owner_phone: string, owner_name: string, type: TicketType, type_label?: string, custom_sessions?: number, custom_days?: number, specific_date?: string }, 
    performerId: string
): Promise<Ticket | null> => {
    
    let totalUses = 12;
    let expiresAt = new Date();

    if (data.type === TicketType.SESSION_12) totalUses = 12;
    else if (data.type === TicketType.SESSION_20) totalUses = 20;
    else if (data.type === TicketType.MONTHLY) totalUses = 30;
    else if (data.custom_sessions) totalUses = data.custom_sessions;

    if (data.specific_date) {
        expiresAt = new Date(data.specific_date);
    } else if (data.custom_days) {
        expiresAt.setDate(expiresAt.getDate() + data.custom_days);
    } else {
        if (data.type === TicketType.MONTHLY) expiresAt.setDate(expiresAt.getDate() + 30);
        else expiresAt.setDate(expiresAt.getDate() + 90); 
    }
    expiresAt.setHours(23, 59, 59, 999);

    const newTicket: Ticket = {
        ticket_id: `T${Date.now().toString().slice(-6)}`,
        shop_id: 'anan', branch_id: 'anan1',
        owner_phone: data.owner_phone, owner_name: data.owner_name,
        type: data.type,
        type_label: data.type_label || data.type.toUpperCase(),
        total_uses: totalUses, remaining_uses: totalUses,
        expires_at: expiresAt.toISOString(),
        status: TicketStatus.ACTIVE, require_pin: true, created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
        // Check if user exists FIRST to avoid 409
        const { data: user } = await supabase.from('users').select('id').eq('phone', data.owner_phone).single();
        if (!user) {
            // Auto-create customer if not exists (should be handled by registerCustomer, but this is a safety net)
             const regResult = await registerCustomer(data.owner_name, data.owner_phone, '1234', performerId);
             if (!regResult.success) { console.error(regResult.message); return null; }
        }

        const { error } = await supabase.from('tickets').insert(newTicket);
        if (error) { console.error('Create Ticket Error', error); return null; }
    } else {
        const db = getLocalDB();
        db.tickets.unshift(newTicket);
        // Auto create user in local
        if (!db.users.find(u => u.phone === newTicket.owner_phone)) {
             db.users.push({
                id: `u_${Date.now()}`, name: newTicket.owner_name, phone: newTicket.owner_phone, 
                role: UserRole.CUSTOMER, pin_hash: '1234', identity_token: '' 
            });
        }
        saveLocalDB(db);
    }
    
    return newTicket;
};

export const getTicketsByPhone = async (phone: string): Promise<Ticket[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('tickets').select('*').eq('owner_phone', phone);
        return (data as Ticket[]) || [];
    } else {
        return getLocalDB().tickets.filter(t => t.owner_phone === phone);
    }
};

export const getAllTickets = async (): Promise<Ticket[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('tickets').select('*');
        return (data as Ticket[]) || [];
    } else {
        return getLocalDB().tickets;
    }
};

export const generateTicketToken = async (ticketId: string) => {
    const timestamp = Date.now();
    const signature = mockHmac(`${ticketId}|${timestamp}|${HMAC_SECRET}`);
    const payload = JSON.stringify({ id: ticketId, ts: timestamp, sig: signature, type: 'dynamic' });
    return safeEncode(payload);
};

export const generateDayPassToken = async (ticketId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const signature = mockHmac(`${ticketId}|${today}|daypass|${HMAC_SECRET}`);
    const payload = JSON.stringify({ id: ticketId, date: today, sig: signature, type: 'daypass' });
    return safeEncode(payload);
};

export const generateStaticTicketQR = async (ticket: Ticket) => {
    const signature = mockHmac(`${ticket.ticket_id}|${ticket.owner_phone}|static_card|${HMAC_SECRET}`);
    const payload = JSON.stringify({
        id: ticket.ticket_id,
        name: ticket.owner_name,
        phone: ticket.owner_phone,
        type: ticket.type_label,
        rem: ticket.remaining_uses,
        card_type: 'static_card',
        sig: signature
    });
    return safeEncode(payload);
};

// 3. CHECK-IN & PREVIEW
export const previewTicketToken = async (identifier: string): Promise<{ success: boolean; ticket?: Ticket; message: string }> => {
    let ticketId = identifier;
    
    try {
        const decoded = JSON.parse(safeDecode(identifier));
        if (decoded.id) ticketId = decoded.id;
        else return { success: false, message: 'QR không hợp lệ' };
    } catch (e) {
        // Fallback for raw ID if any
    }

    let dbTicket: Ticket | undefined;
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('tickets').select('*').eq('ticket_id', ticketId).single();
        if (data) dbTicket = data as Ticket;
    } else {
        dbTicket = getLocalDB().tickets.find(t => t.ticket_id === ticketId);
    }

    if (!dbTicket) return { success: false, message: 'Vé không tồn tại trong hệ thống' };
    return { success: true, ticket: dbTicket, message: 'Tìm thấy vé' };
};

export const performCheckIn = async (
  identifier: string, 
  method: 'QR_CHUNG' | 'QR_RIENG' | 'MANUAL',
  branchId: string,
  performedBy?: string, 
  pin?: string 
): Promise<{ success: boolean; message: string; remaining?: number; requirePin?: boolean }> => {
  
  let ticketId = identifier;
  let dbTicket: Ticket | undefined;

  if (method === 'QR_RIENG') {
      try {
          const decoded = JSON.parse(safeDecode(identifier));
          ticketId = decoded.id;
      } catch (e) {
          return { success: false, message: 'Mã QR không hợp lệ' };
      }
  }

  if (isSupabaseConfigured()) {
      const { data } = await supabase.from('tickets').select('*').eq('ticket_id', ticketId).single();
      if (!data) return { success: false, message: 'Vé không tồn tại' };
      dbTicket = data as Ticket;
  } else {
      dbTicket = getLocalDB().tickets.find(t => t.ticket_id === ticketId);
  }

  if (!dbTicket) return { success: false, message: 'Vé không tìm thấy' };
  if (dbTicket.remaining_uses <= 0) return { success: false, message: 'Vé đã hết lượt sử dụng' };
  if (new Date(dbTicket.expires_at) < new Date()) return { success: false, message: 'Vé đã hết hạn' };
  if (dbTicket.status === TicketStatus.LOCKED) return { success: false, message: 'Vé đang bị khóa' };

  if (dbTicket.require_pin && method !== 'MANUAL') {
      if (!pin) return { success: false, message: 'Cần nhập PIN', requirePin: true };
      
      let validPin = false;
      if (isSupabaseConfigured()) {
          const { data } = await supabase.from('users').select('pin_hash').eq('phone', dbTicket.owner_phone).single();
          validPin = data?.pin_hash === pin;
      } else {
          const user = getLocalDB().users.find(u => u.phone === dbTicket?.owner_phone);
          validPin = user?.pin_hash === pin;
      }
      
      if (!validPin) return { success: false, message: 'Mã PIN sai' };
  }

  const newRemaining = dbTicket.remaining_uses - 1;
  
  if (isSupabaseConfigured()) {
      await supabase.from('tickets').update({ remaining_uses: newRemaining }).eq('ticket_id', ticketId);
      await supabase.from('checkin_logs').insert({
          ticket_id: ticketId, user_name: dbTicket.owner_name, user_phone: dbTicket.owner_phone, 
          method, branch_id: branchId, status: 'SUCCESS', is_manual_by_staff: method === 'MANUAL'
      });
  } else {
      const db = getLocalDB();
      const tIdx = db.tickets.findIndex(t => t.ticket_id === ticketId);
      if (tIdx !== -1) db.tickets[tIdx].remaining_uses = newRemaining;
      
      db.checkin_logs.unshift({
          id: `chk_${Date.now()}`, ticket_id: ticketId, user_name: dbTicket.owner_name, user_phone: dbTicket.owner_phone,
          timestamp: new Date().toISOString(), method, branch_id: branchId, status: 'SUCCESS', is_manual_by_staff: method === 'MANUAL'
      });
      saveLocalDB(db);
  }

  return { success: true, message: 'Check-in Thành Công', remaining: newRemaining };
};

// 4. ADMIN & STAFF
export const updateTicket = async (ticketId: string, data: Partial<Ticket>, ownerId: string) => {
    if (isSupabaseConfigured()) {
        await supabase.from('tickets').update(data).eq('ticket_id', ticketId);
    } else {
        const db = getLocalDB();
        const idx = db.tickets.findIndex(t => t.ticket_id === ticketId);
        if (idx !== -1) {
            db.tickets[idx] = { ...db.tickets[idx], ...data };
            saveLocalDB(db);
        }
    }
    return true;
};

export const toggleTicketLock = async (ticketId: string, performerId: string) => {
    const db = getLocalDB();
    const t = db.tickets.find(x => x.ticket_id === ticketId);
    if (t) {
        t.status = t.status === TicketStatus.LOCKED ? TicketStatus.ACTIVE : TicketStatus.LOCKED;
        saveLocalDB(db);
    }
};

export const resetPin = async (phone: string, performerId: string) => {
    return changePin(phone, 'IGNORE', '1234');
};

export const getStaffUsers = async (): Promise<User[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('users').select('*').eq('role', UserRole.STAFF);
        return (data as User[]) || [];
    }
    return getLocalDB().users.filter(u => u.role === UserRole.STAFF);
};

export const addStaff = async (staffData: Partial<User>, performerId: string) => {
    const newUser = {
        id: `staff_${Date.now()}`,
        name: staffData.name || 'Nhân viên mới', phone: staffData.phone || '',
        role: UserRole.STAFF, branch_id: 'anan1', password: 'password123'
    };
    
    if (isSupabaseConfigured()) {
        await supabase.from('users').insert(newUser);
    } else {
        const db = getLocalDB();
        db.users.push(newUser as User);
        saveLocalDB(db);
    }
};

export const removeStaff = async (staffId: string, performerId: string) => {
    const db = getLocalDB();
    db.users = db.users.filter(u => u.id !== staffId);
    saveLocalDB(db);
};

export const getCheckInLogs = async (): Promise<CheckInLog[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('checkin_logs').select('*').order('timestamp', { ascending: false }).limit(50);
        return (data as CheckInLog[]) || [];
    }
    return getLocalDB().checkin_logs;
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
        return (data as AuditLog[]) || [];
    }
    return getLocalDB().audit_logs;
};

export const getDashboardStats = async () => {
    const db = getLocalDB();
    return {
        totalCheckins: db.checkin_logs.length,
        activeTickets: db.tickets.filter(t => t.status === 'active').length,
        expiringSoon: db.tickets.filter(t => t.remaining_uses < 3).length,
        todayCheckins: db.checkin_logs.filter(l => l.timestamp.startsWith(new Date().toISOString().slice(0, 10))).length
    };
};

export const exportData = async (type: 'logs' | 'tickets', performerId: string) => {
    return { url: '#' };
};
