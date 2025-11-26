import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Ticket, User, CheckInLog, Branch, UserRole, TicketType, TicketStatus, AuditLog, CustomerDetail, Tenant, Package } from '../types';

// --- Constants ---
const HMAC_SECRET = 'winson-secure-key-2024';
const STORAGE_KEY = 'onin_db_v3'; // Bump version
const SESSION_KEY = 'onin_session_user';

// --- UTILS ---
const tryParseJSON = (str: string) => {
    try {
        const cleaned = str.replace(/^"|"$/g, '').replace(/\\"/g, '"');
        return JSON.parse(cleaned);
    } catch (e) {
        // Fallback: try to extract ID if it looks like a JSON but failed
        const idMatch = str.match(/"id"\s*:\s*"([^"]+)"/);
        if (idMatch && idMatch[1]) return { id: idMatch[1] };
        
        // Fallback 2: Assume string is just ID
        if (!str.trim().startsWith('{')) return { id: str.trim() };
        
        return null;
    }
};

const mockHmac = (text: string): string => {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; 
    }
    return Math.abs(hash).toString(16);
};

// --- LOCAL STORAGE FALLBACK ---
interface LocalDB {
    packages: Package[];
    tenants: Tenant[];
    users: User[];
    tickets: Ticket[];
    checkin_logs: CheckInLog[];
    audit_logs: AuditLog[];
    branches: Branch[];
}

const SEED_DB: LocalDB = {
    packages: [
        { id: 'pkg_basic', name: 'Gói Cơ Bản', max_branches: 2, price: 1000000, description: 'Phù hợp phòng tập nhỏ' },
        { id: 'pkg_pro', name: 'Gói Chuyên Nghiệp', max_branches: 10, price: 5000000, description: 'Chuỗi phòng tập' }
    ],
    tenants: [
        { id: 'anan', name: 'Yoga An An', status: 'active', subscription_end: '2030-01-01T00:00:00Z', created_at: new Date().toISOString(), package_id: 'pkg_basic' }
    ],
    branches: [
        { id: 'anan1', tenant_id: 'anan', name: 'Yoga An An - Lê Lợi', address: '123 Lê Lợi, Q1' },
    ],
    users: [
        { id: 'admin', name: 'ONIN Admin', phone: 'admin', role: UserRole.PLATFORM_ADMIN, password: 'root123' },
        { id: 'owner1', tenant_id: 'anan', name: 'Nguyễn Văn Chủ', phone: '0909000001', role: UserRole.OWNER, password: 'admin123' },
        { id: 'staff1', tenant_id: 'anan', name: 'Lê Văn Quản', phone: '0909000002', role: UserRole.STAFF, password: 'staff123', branch_id: 'anan1' },
    ],
    tickets: [],
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
export const saveSession = (user: User, tenantName?: string) => {
    const sessionData = { ...user, tenantName };
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
};

export const getSession = (): (User & { tenantName?: string }) | null => {
    const str = localStorage.getItem(SESSION_KEY);
    return str ? JSON.parse(str) : null;
};

export const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = () => getSession();
const getTenantId = () => getSession()?.tenant_id;

// --- PLATFORM ADMIN SERVICES (Level 1) ---

export const getPackages = async (): Promise<Package[]> => {
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('packages').select('*');
        return (data as Package[]) || [];
    }
    return getLocalDB().packages;
};

export const createPackage = async (pkg: Package) => {
    if (isSupabaseConfigured()) {
        await supabase.from('packages').insert(pkg);
    } else {
        const db = getLocalDB();
        db.packages.push(pkg);
        saveLocalDB(db);
    }
};

export const getAllTenants = async (): Promise<Tenant[]> => {
    if (isSupabaseConfigured()) {
        const { data: tenants } = await supabase.from('tenants').select('*');
        const result = (tenants as Tenant[]) || [];
        
        // Aggregate stats for each tenant
        for (const t of result) {
            const { count: branches } = await supabase.from('branches').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id);
            const { count: staff } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id).eq('role', UserRole.STAFF);
            const { count: customers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id).eq('role', UserRole.CUSTOMER);
            const { count: checkins } = await supabase.from('checkin_logs').select('*', { count: 'exact', head: true }).eq('tenant_id', t.id);
            
            t.stats = {
                branches: branches || 0,
                staff: staff || 0,
                customers: customers || 0,
                checkins: checkins || 0
            };
        }
        return result;
    }
    
    // Local DB logic
    const db = getLocalDB();
    return db.tenants.map(t => ({
        ...t,
        stats: {
            branches: db.branches.filter(b => b.tenant_id === t.id).length,
            staff: db.users.filter(u => u.tenant_id === t.id && u.role === UserRole.STAFF).length,
            customers: db.users.filter(u => u.tenant_id === t.id && u.role === UserRole.CUSTOMER).length,
            checkins: db.checkin_logs.filter(l => l.tenant_id === t.id).length
        }
    }));
};

export const createTenant = async (name: string, ownerPhone: string, ownerPassword: string, packageId: string) => {
    const tenantId = `t_${Date.now()}`;
    const newTenant: Tenant = {
        id: tenantId, name, status: 'active', package_id: packageId,
        subscription_end: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
        created_at: new Date().toISOString()
    };
    
    const newOwner: User = {
        id: `owner_${Date.now()}`, tenant_id: tenantId,
        name: 'Chủ sở hữu', phone: ownerPhone, role: UserRole.OWNER, password: ownerPassword
    };

    // Create default branch
    const defaultBranch: Branch = {
        id: `${tenantId}_b1`, tenant_id: tenantId, name: 'Chi nhánh 1', address: 'Địa chỉ mặc định'
    };

    if (isSupabaseConfigured()) {
        const { error: tErr } = await supabase.from('tenants').insert(newTenant);
        if (tErr) return { success: false, message: tErr.message };
        
        await supabase.from('users').insert(newOwner);
        await supabase.from('branches').insert(defaultBranch);
    } else {
        const db = getLocalDB();
        db.tenants.push(newTenant);
        db.users.push(newOwner);
        db.branches.push(defaultBranch);
        saveLocalDB(db);
    }
    return { success: true };
};

export const adminDeleteTenant = async (id: string) => {
    if (isSupabaseConfigured()) {
        // Simple cascade delete logic (ideally handled by DB constraints)
        await supabase.from('checkin_logs').delete().eq('tenant_id', id);
        await supabase.from('tickets').delete().eq('tenant_id', id);
        await supabase.from('users').delete().eq('tenant_id', id);
        await supabase.from('branches').delete().eq('tenant_id', id);
        await supabase.from('tenants').delete().eq('id', id);
    } else {
        const db = getLocalDB();
        db.tenants = db.tenants.filter(t => t.id !== id);
        db.users = db.users.filter(u => u.tenant_id !== id);
        db.tickets = db.tickets.filter(t => t.tenant_id !== id);
        db.branches = db.branches.filter(b => b.tenant_id !== id);
        saveLocalDB(db);
    }
};

export const adminUpdateTenant = async (id: string, updates: Partial<Tenant>) => {
    if (isSupabaseConfigured()) {
        await supabase.from('tenants').update(updates).eq('id', id);
    } else {
        const db = getLocalDB();
        const t = db.tenants.find(x => x.id === id);
        if (t) { Object.assign(t, updates); saveLocalDB(db); }
    }
};

export const updateTenantStatus = async (id: string, status: 'active' | 'locked') => {
    await adminUpdateTenant(id, { status });
};

// --- BRAND OWNER SERVICES (Level 2) ---

export const getBranches = async (): Promise<Branch[]> => {
    const tid = getTenantId();
    if (!tid) return [];
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('branches').select('*').eq('tenant_id', tid);
        return (data as Branch[]) || [];
    }
    return getLocalDB().branches.filter(b => b.tenant_id === tid);
};

export const createBranch = async (name: string, address: string) => {
    const tid = getTenantId();
    if (!tid) return;
    const newBranch: Branch = {
        id: `${tid}_b${Date.now()}`, tenant_id: tid, name, address
    };
    if (isSupabaseConfigured()) {
        await supabase.from('branches').insert(newBranch);
    } else {
        const db = getLocalDB();
        db.branches.push(newBranch);
        saveLocalDB(db);
    }
};

export const deleteBranch = async (id: string) => {
     if (isSupabaseConfigured()) {
        await supabase.from('branches').delete().eq('id', id);
    } else {
        const db = getLocalDB();
        db.branches = db.branches.filter(b => b.id !== id);
        saveLocalDB(db);
    }
}

// --- COMMON SERVICES ---

export const login = async (phone: string, secret: string, requiredRole?: UserRole): Promise<{ user: User | null; error?: string; tenantName?: string }> => {
    let user: User | undefined;
    let tenantName = 'ONIN Platform';
    
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('users').select('*').eq('phone', phone).single();
        if (!data) return { user: null, error: 'Tài khoản không tồn tại' };
        user = data as User;

        if (user.tenant_id) {
            const { data: t } = await supabase.from('tenants').select('*').eq('id', user.tenant_id).single();
            if (t) {
                if (t.status === 'locked') return { user: null, error: 'Thương hiệu đang bị khóa.' };
                tenantName = t.name;
            }
        }
    } else {
        const db = getLocalDB();
        user = db.users.find(u => u.phone === phone);
        if (!user) return { user: null, error: 'Tài khoản không tồn tại' };
        
        if (user.tenant_id) {
             const t = db.tenants.find(x => x.id === user.tenant_id);
             if (t) {
                 if (t.status === 'locked') return { user: null, error: 'Thương hiệu bị khóa.' };
                 tenantName = t.name;
             }
        }
    }

    // Role check logic
    if (requiredRole && user.role !== requiredRole) {
         // Allow Platform Admin to access generic login if needed, but usually strict
         if (user.role !== UserRole.PLATFORM_ADMIN) {
             return { user: null, error: `Sai quyền truy cập` };
         }
    }

    // Auth Check
    const isValid = user.role === UserRole.CUSTOMER ? user.pin_hash === secret : user.password === secret;
    if (!isValid) return { user: null, error: 'Mật khẩu/PIN không đúng' };

    saveSession(user, tenantName);
    return { user, tenantName };
};


export const updateBrandName = async (newName: string) => {
    const tid = getTenantId();
    if (!tid) return;
    
    if (isSupabaseConfigured()) {
        await supabase.from('tenants').update({ name: newName }).eq('id', tid);
    } else {
        const db = getLocalDB();
        const t = db.tenants.find(x => x.id === tid);
        if (t) { t.name = newName; saveLocalDB(db); }
    }
    const u = getSession();
    if (u) saveSession(u, newName);
};

export const registerCustomer = async (name: string, phone: string, pin: string, performerId: string) => {
    const tid = getTenantId();
    if (!tid) return { success: false, message: 'Lỗi phiên đăng nhập' };

    const newUser: User = {
        id: `u_${Date.now()}`, tenant_id: tid,
        name, phone, role: UserRole.CUSTOMER, pin_hash: pin, identity_token: '' 
    };
    newUser.identity_token = generateIdentityToken(newUser);

    if (isSupabaseConfigured()) {
        const { error } = await supabase.from('users').insert(newUser);
        if (error) {
             if (error.code === '23505') return { success: false, message: 'Số điện thoại đã tồn tại' };
             return { success: false, message: `Lỗi DB: ${error.message}` };
        }
    } else {
        const db = getLocalDB();
        if (db.users.some(u => u.phone === phone)) return { success: false, message: 'SĐT đã tồn tại' };
        db.users.push(newUser);
        saveLocalDB(db);
    }
    return { success: true, user: newUser };
};

export const getCustomers = async (): Promise<User[]> => {
    const tid = getTenantId();
    if (!tid) return [];

    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('users').select('*').eq('role', UserRole.CUSTOMER).eq('tenant_id', tid);
        return (data as User[]) || [];
    } else {
        return getLocalDB().users.filter(u => u.role === UserRole.CUSTOMER && u.tenant_id === tid);
    }
};

export const getCustomerFullDetails = async (phone: string): Promise<CustomerDetail | null> => {
    const tid = getTenantId();
    let user: User | undefined;
    let tickets: Ticket[] = [];
    let logs: CheckInLog[] = [];

    if (isSupabaseConfigured()) {
        const { data: u } = await supabase.from('users').select('*').eq('phone', phone).eq('tenant_id', tid).single();
        if (!u) return null;
        user = u as User;
        const { data: t } = await supabase.from('tickets').select('*').eq('owner_phone', phone).eq('tenant_id', tid);
        tickets = (t as Ticket[]) || [];
        const { data: l } = await supabase.from('checkin_logs').select('*').eq('user_phone', phone).eq('tenant_id', tid).order('timestamp', { ascending: false });
        logs = (l as CheckInLog[]) || [];
    } else {
        const db = getLocalDB();
        user = db.users.find(u => u.phone === phone && u.tenant_id === tid);
        if (!user) return null;
        tickets = db.tickets.filter(t => t.owner_phone === phone && t.tenant_id === tid);
        logs = db.checkin_logs.filter(l => l.user_phone === phone && l.tenant_id === tid);
    }
    return { user, tickets, logs };
};

export const createTicket = async (
    data: { owner_phone: string, owner_name: string, type: TicketType, type_label?: string, custom_sessions?: number, custom_days?: number, specific_date?: string }, 
    performerId: string
): Promise<Ticket | null> => {
    const tid = getTenantId();
    if (!tid) return null;

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
        tenant_id: tid,
        shop_id: tid, 
        branch_id: 'anan1', // Default
        owner_phone: data.owner_phone, owner_name: data.owner_name,
        type: data.type,
        type_label: data.type_label || data.type.toUpperCase(),
        total_uses: totalUses, remaining_uses: totalUses,
        expires_at: expiresAt.toISOString(),
        status: TicketStatus.ACTIVE, require_pin: true, created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured()) {
        const { data: user } = await supabase.from('users').select('id').eq('phone', data.owner_phone).eq('tenant_id', tid).single();
        if (!user) {
             const regResult = await registerCustomer(data.owner_name, data.owner_phone, '1234', performerId);
             if (!regResult.success) { console.error(regResult.message); return null; }
        }
        const { error } = await supabase.from('tickets').insert(newTicket);
        if (error) { console.error('Create Ticket Error', error); return null; }
    } else {
        const db = getLocalDB();
        db.tickets.unshift(newTicket);
        saveLocalDB(db);
    }
    return newTicket;
};

export const deleteTicket = async (ticketId: string) => {
    if (isSupabaseConfigured()) {
        await supabase.from('tickets').delete().eq('ticket_id', ticketId);
    } else {
        const db = getLocalDB();
        db.tickets = db.tickets.filter(t => t.ticket_id !== ticketId);
        saveLocalDB(db);
    }
    return true;
};

export const getAllTickets = async (): Promise<Ticket[]> => {
    const tid = getTenantId();
    if (!tid) return [];
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('tickets').select('*').eq('tenant_id', tid);
        return (data as Ticket[]) || [];
    }
    return getLocalDB().tickets.filter(t => t.tenant_id === tid);
};

export const getTicketsByPhone = async (phone: string): Promise<Ticket[]> => {
    const tid = getTenantId();
    if (!tid) return [];
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('tickets').select('*').eq('owner_phone', phone).eq('tenant_id', tid);
        return (data as Ticket[]) || [];
    } else {
        return getLocalDB().tickets.filter(t => t.owner_phone === phone && t.tenant_id === tid);
    }
};

export const generateIdentityToken = (user: User) => {
    const payload = { "Thẻ": "Thành Viên", "Khách": user.name, "SĐT": user.phone, "type": "identity", "sig": mockHmac(user.phone + HMAC_SECRET) };
    return JSON.stringify(payload);
};

export const parseIdentityToken = (token: string): string | null => {
    const json = tryParseJSON(token);
    if (json && (json.type === 'identity' || json.SĐT) && (json.phone || json.SĐT)) {
        return json.phone || json.SĐT;
    }
    return null;
};

export const changePin = async (phone: string, oldPin: string, newPin: string) => {
    const { user } = await login(phone, oldPin, UserRole.CUSTOMER);
    if (!user) return { success: false, message: 'PIN cũ không đúng' };
    if (isSupabaseConfigured()) {
        await supabase.from('users').update({ pin_hash: newPin }).eq('phone', phone);
    } else {
        const db = getLocalDB();
        const idx = db.users.findIndex(u => u.phone === phone);
        if (idx !== -1) { db.users[idx].pin_hash = newPin; saveLocalDB(db); }
    }
    return { success: true, message: 'Đổi PIN thành công' };
};

export const generateTicketToken = async (ticketId: string) => {
    const timestamp = Date.now();
    const signature = mockHmac(`${ticketId}|${timestamp}|${HMAC_SECRET}`);
    let ticket: Ticket | undefined;
    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('tickets').select('*').eq('ticket_id', ticketId).single();
        if (data) ticket = data as Ticket;
    } else {
        ticket = getLocalDB().tickets.find(t => t.ticket_id === ticketId);
    }
    const payload: any = { 
        "Vé": ticket?.type_label || ticket?.type || "Vé Tập",
        "Khách": ticket?.owner_name || "",
        "SĐT": ticket?.owner_phone || "",
        "Hạn": ticket ? new Date(ticket.expires_at).toLocaleDateString('vi-VN') : "",
        "id": ticketId, "ts": timestamp, "sig": signature, "type": "dynamic" 
    };
    return JSON.stringify(payload);
};

export const generateDayPassToken = async (ticketId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const signature = mockHmac(`${ticketId}|${today}|daypass|${HMAC_SECRET}`);
    const payload = { "Loại": "QR Trong Ngày", "Ngày": today, "id": ticketId, "type": "daypass", "sig": signature };
    return JSON.stringify(payload);
};

export const generateStaticTicketQR = async (ticket: Ticket) => {
    const signature = mockHmac(`${ticket.ticket_id}|${ticket.owner_phone}|static_card|${HMAC_SECRET}`);
    const payload = {
        "Vé": ticket.type_label, "Khách": ticket.owner_name, "SĐT": ticket.owner_phone,
        "Hạn": new Date(ticket.expires_at).toLocaleDateString('vi-VN'),
        "id": ticket.ticket_id, "type": "static_card", "sig": signature
    };
    return JSON.stringify(payload);
};

export const previewTicketToken = async (identifier: string): Promise<{ success: boolean; ticket?: Ticket; message: string }> => {
    let ticketId = identifier;
    const json = tryParseJSON(identifier);
    if (json && json.id) ticketId = json.id;
    if (!json) {
         const idMatch = identifier.match(/T\d+/);
         if (idMatch) ticketId = idMatch[0];
    }

    let dbTicket: Ticket | undefined;
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase.from('tickets').select('*').eq('ticket_id', ticketId).single();
        if (error) return { success: false, message: `Lỗi DB: ${error.message}` };
        if (data) dbTicket = data as Ticket;
    } else {
        dbTicket = getLocalDB().tickets.find(t => t.ticket_id === ticketId);
    }
    if (!dbTicket) return { success: false, message: `Vé không tồn tại (${ticketId})` };
    const session = getSession();
    if (session && session.tenant_id && dbTicket.tenant_id !== session.tenant_id) {
        return { success: false, message: 'Vé này thuộc về hệ thống khác!' };
    }
    return { success: true, ticket: dbTicket, message: 'Tìm thấy vé' };
};

export const performCheckIn = async (
  identifier: string, method: 'QR_CHUNG' | 'QR_RIENG' | 'MANUAL', branchId: string, performedBy?: string, pin?: string 
): Promise<{ success: boolean; message: string; remaining?: number; requirePin?: boolean; ticketInfo?: any }> => {
  const prev = await previewTicketToken(identifier);
  if (!prev.success || !prev.ticket) return { success: false, message: prev.message };
  const dbTicket = prev.ticket;
  
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
  const ticketInfo = {
      type_label: dbTicket.type_label,
      owner_name: dbTicket.owner_name,
      remaining: newRemaining
  };

  if (isSupabaseConfigured()) {
      await supabase.from('tickets').update({ remaining_uses: newRemaining }).eq('ticket_id', dbTicket.ticket_id);
      await supabase.from('checkin_logs').insert({
          ticket_id: dbTicket.ticket_id, user_name: dbTicket.owner_name, user_phone: dbTicket.owner_phone, 
          method, branch_id: branchId, status: 'SUCCESS', is_manual_by_staff: method === 'MANUAL',
          tenant_id: dbTicket.tenant_id
      });
  } else {
      const db = getLocalDB();
      const tIdx = db.tickets.findIndex(t => t.ticket_id === dbTicket?.ticket_id);
      if (tIdx !== -1) db.tickets[tIdx].remaining_uses = newRemaining;
      db.checkin_logs.unshift({
          id: `chk_${Date.now()}`, ticket_id: dbTicket.ticket_id, user_name: dbTicket.owner_name, user_phone: dbTicket.owner_phone,
          timestamp: new Date().toISOString(), method, branch_id: branchId, status: 'SUCCESS', is_manual_by_staff: method === 'MANUAL',
          tenant_id: dbTicket.tenant_id
      });
      saveLocalDB(db);
  }
  return { success: true, message: 'Check-in Thành Công', remaining: newRemaining, ticketInfo };
};

export const updateTicket = async (ticketId: string, data: Partial<Ticket>, ownerId: string) => {
    if (isSupabaseConfigured()) {
        await supabase.from('tickets').update(data).eq('ticket_id', ticketId);
    } else {
        const db = getLocalDB();
        const idx = db.tickets.findIndex(t => t.ticket_id === ticketId);
        if (idx !== -1) { db.tickets[idx] = { ...db.tickets[idx], ...data }; saveLocalDB(db); }
    }
    return true;
};
export const toggleTicketLock = async (ticketId: string, performerId: string) => {
    const db = getLocalDB();
    const t = db.tickets.find(x => x.ticket_id === ticketId);
    if (t) { t.status = t.status === TicketStatus.LOCKED ? TicketStatus.ACTIVE : TicketStatus.LOCKED; saveLocalDB(db); }
    if (isSupabaseConfigured()) { await supabase.rpc('toggle_ticket_lock', { t_id: ticketId }); }
};
export const resetPin = async (phone: string, performerId: string) => { return changePin(phone, 'IGNORE', '1234'); };

export const getStaffUsers = async (): Promise<User[]> => {
    const tid = getTenantId();
    if (!tid) return [];
    if (isSupabaseConfigured()) {
        const { data: users } = await supabase.from('users').select('*').eq('role', UserRole.STAFF).eq('tenant_id', tid);
        return (users as User[]) || [];
    }
    return getLocalDB().users.filter(u => u.role === UserRole.STAFF && u.tenant_id === tid);
};

export const addStaff = async (staffData: Partial<User>, performerId: string) => {
    const tid = getTenantId();
    const newUser = {
        id: `staff_${Date.now()}`, tenant_id: tid,
        name: staffData.name || 'Nhân viên mới', phone: staffData.phone || '',
        role: UserRole.STAFF, branch_id: staffData.branch_id, password: staffData.password || 'password123'
    };
    if (isSupabaseConfigured()) { await supabase.from('users').insert(newUser); }
    else { const db = getLocalDB(); db.users.push(newUser as User); saveLocalDB(db); }
};
export const removeStaff = async (staffId: string, performerId: string) => {
    if (isSupabaseConfigured()) { await supabase.from('users').delete().eq('id', staffId); }
    else { const db = getLocalDB(); db.users = db.users.filter(u => u.id !== staffId); saveLocalDB(db); }
};
export const getCheckInLogs = async (branchId?: string, dateStr?: string): Promise<CheckInLog[]> => {
    const tid = getTenantId();
    if (!tid) return [];
    
    if (isSupabaseConfigured()) {
        let query = supabase.from('checkin_logs').select('*').eq('tenant_id', tid).order('timestamp', { ascending: false }).limit(50);
        if (branchId) query = query.eq('branch_id', branchId);
        if (dateStr) {
             const nextDay = new Date(dateStr);
             nextDay.setDate(nextDay.getDate() + 1);
             query = query.gte('timestamp', dateStr).lt('timestamp', nextDay.toISOString().split('T')[0]);
        }
        const { data } = await query;
        return (data as CheckInLog[]) || [];
    }
    
    let logs = getLocalDB().checkin_logs.filter(l => l.tenant_id === tid);
    if (branchId) logs = logs.filter(l => l.branch_id === branchId);
    if (dateStr) logs = logs.filter(l => l.timestamp.startsWith(dateStr));
    return logs;
};
export const getAuditLogs = async (): Promise<AuditLog[]> => {
    const session = getSession();
    if (!session) return [];
    
    // Platform Admin sees everything, Tenant Owner sees only their own
    if (isSupabaseConfigured()) {
        let query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
        if (session.role !== UserRole.PLATFORM_ADMIN) {
             query = query.eq('tenant_id', session.tenant_id);
        }
        const { data } = await query;
        return (data as AuditLog[]) || [];
    }
    const db = getLocalDB();
    if (session.role === UserRole.PLATFORM_ADMIN) return db.audit_logs;
    return db.audit_logs.filter(l => l.tenant_id === session.tenant_id);
};

// --- STATS (Dashboard Level 2) ---
export const getDashboardStats = async (branchId?: string) => {
    const tid = getTenantId();
    if (!tid) return { totalCheckins: 0, activeTickets: 0, expiringSoon: 0, todayCheckins: 0, expiredTickets: 0 };

    if (isSupabaseConfigured()) {
        const todayStr = new Date().toISOString().slice(0, 10);
        
        let logQuery = supabase.from('checkin_logs').select('id', { count: 'exact', head: true }).eq('tenant_id', tid);
        if (branchId) logQuery = logQuery.eq('branch_id', branchId);
        const { count: totalCheckins } = await logQuery;

        let todayQuery = supabase.from('checkin_logs').select('id', { count: 'exact', head: true }).eq('tenant_id', tid).gte('timestamp', todayStr);
        if (branchId) todayQuery = todayQuery.eq('branch_id', branchId);
        const { count: todayCheckins } = await todayQuery;

        let ticketQuery = supabase.from('tickets').select('*').eq('tenant_id', tid);
        if (branchId) ticketQuery = ticketQuery.eq('branch_id', branchId);
        
        const { data: allTickets } = await ticketQuery;
        
        const activeTickets = allTickets?.filter(t => t.status === 'active' && t.remaining_uses > 0 && new Date(t.expires_at) >= new Date()).length || 0;
        const expiringSoon = allTickets?.filter(t => t.status === 'active' && t.remaining_uses > 0 && t.remaining_uses <= 3).length || 0;
        const expiredTickets = allTickets?.filter(t => t.remaining_uses === 0 || new Date(t.expires_at) < new Date()).length || 0;

        return { 
            totalCheckins: totalCheckins || 0, 
            activeTickets, 
            expiringSoon, 
            todayCheckins: todayCheckins || 0,
            expiredTickets
        };
    }

    const db = getLocalDB();
    let myLogs = db.checkin_logs.filter(l => l.tenant_id === tid);
    let myTickets = db.tickets.filter(t => t.tenant_id === tid);

    if (branchId) {
        myLogs = myLogs.filter(l => l.branch_id === branchId);
        myTickets = myTickets.filter(t => t.branch_id === branchId);
    }
    
    const today = new Date().toISOString().slice(0, 10);

    return {
        totalCheckins: myLogs.length,
        activeTickets: myTickets.filter(t => t.status === 'active' && t.remaining_uses > 0 && new Date(t.expires_at) >= new Date()).length,
        expiringSoon: myTickets.filter(t => t.status === 'active' && t.remaining_uses > 0 && t.remaining_uses <= 3).length,
        expiredTickets: myTickets.filter(t => t.remaining_uses === 0 || new Date(t.expires_at) < new Date()).length,
        todayCheckins: myLogs.filter(l => l.timestamp.startsWith(today)).length
    };
};

// --- CHART DATA (REAL DATA) ---
export const getHourlyChartData = async (branchId?: string) => {
    const tid = getTenantId();
    if (!tid) return Array(24).fill(0).map((_, i) => ({ name: `${i}h`, v: 0 }));

    const hours = Array(24).fill(0);
    const todayStr = new Date().toISOString().slice(0, 10);

    if (isSupabaseConfigured()) {
        let query = supabase.from('checkin_logs').select('timestamp').eq('tenant_id', tid).gte('timestamp', todayStr);
        if (branchId) query = query.eq('branch_id', branchId);
        const { data } = await query;

        if (data) {
            data.forEach((log: any) => {
                const h = new Date(log.timestamp).getHours();
                hours[h]++;
            });
        }
    } else {
        const db = getLocalDB();
        let logs = db.checkin_logs.filter(l => l.tenant_id === tid && l.timestamp.startsWith(todayStr));
        if (branchId) logs = logs.filter(l => l.branch_id === branchId);
        logs.forEach(l => {
            const h = new Date(l.timestamp).getHours();
            hours[h]++;
        });
    }

    return hours.map((count, i) => ({ name: `${i}h`, v: count }));
};

export const exportData = async (type: 'logs' | 'tickets', performerId: string) => { return { url: '#' }; };

export const getMyHistory = async (phone: string): Promise<CheckInLog[]> => {
    const tid = getTenantId();
    if (!tid) return [];

    if (isSupabaseConfigured()) {
        const { data } = await supabase.from('checkin_logs')
            .select('*')
            .eq('user_phone', phone)
            .eq('tenant_id', tid)
            .order('timestamp', { ascending: false })
            .limit(20);
        return (data as CheckInLog[]) || [];
    } else {
        const db = getLocalDB();
        return db.checkin_logs
            .filter(l => l.user_phone === phone && l.tenant_id === tid)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 20);
    }
};