import { Ticket, User, CheckInLog, Branch, UserRole, TicketType, TicketStatus, AuditLog } from '../types';

// --- Mock Data ---

export const BRANCHES: Branch[] = [
  { id: 'anan1', name: 'Yoga An An - Lê Lợi', address: '123 Lê Lợi, Q1' },
  { id: 'anan2', name: 'Yoga An An - Nguyễn Huệ', address: '45 Nguyễn Huệ, Q1' },
];

let USERS: User[] = [
  { id: 'owner1', name: 'Nguyễn Văn Chủ', phone: '0909000001', role: UserRole.OWNER, password: 'admin123' },
  { id: 'staff1', name: 'Lê Văn Quản', phone: '0909000002', role: UserRole.STAFF, branch_id: 'anan1', password: 'staff123' },
  { id: 'cust1', name: 'Chị Lan', phone: '0912345678', role: UserRole.CUSTOMER, pin_hash: '1234', failed_pin_attempts: 0 },
  { id: 'cust2', name: 'Anh Minh', phone: '0987654321', role: UserRole.CUSTOMER, pin_hash: '0000', failed_pin_attempts: 0 },
];

let TICKETS: Ticket[] = [
  {
    ticket_id: 'T001',
    shop_id: 'anan',
    branch_id: 'anan1',
    owner_phone: '0912345678',
    owner_name: 'Chị Lan',
    type: TicketType.SESSION_20,
    total_uses: 20,
    remaining_uses: 15,
    expires_at: '2024-12-31T00:00:00Z',
    status: TicketStatus.ACTIVE,
    require_pin: true,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    ticket_id: 'T002',
    shop_id: 'anan',
    branch_id: 'anan2',
    owner_phone: '0912345678',
    owner_name: 'Chị Lan',
    type: TicketType.MONTHLY,
    total_uses: 30,
    remaining_uses: 28,
    expires_at: '2023-12-01T00:00:00Z', // Expired
    status: TicketStatus.EXPIRED,
    require_pin: true,
    created_at: '2023-11-01T00:00:00Z'
  },
  {
    ticket_id: 'T003',
    shop_id: 'anan',
    branch_id: 'anan1',
    owner_phone: '0987654321',
    owner_name: 'Anh Minh',
    type: TicketType.SESSION_12,
    total_uses: 12,
    remaining_uses: 12,
    expires_at: '2025-06-30T00:00:00Z',
    status: TicketStatus.ACTIVE,
    require_pin: true,
    created_at: '2024-03-01T00:00:00Z'
  }
];

let CHECKIN_LOGS: CheckInLog[] = [
  { id: 'L001', ticket_id: 'T001', user_name: 'Chị Lan', user_phone: '0912345678', timestamp: new Date(Date.now() - 86400000).toISOString(), method: 'QR_CHUNG', branch_id: 'anan1', status: 'SUCCESS' },
  { id: 'L002', ticket_id: 'T001', user_name: 'Chị Lan', user_phone: '0912345678', timestamp: new Date(Date.now() - 172800000).toISOString(), method: 'QR_CHUNG', branch_id: 'anan1', status: 'SUCCESS' },
  { id: 'L003', ticket_id: 'T003', user_name: 'Anh Minh', user_phone: '0987654321', timestamp: new Date(Date.now() - 3600000).toISOString(), method: 'QR_RIENG', branch_id: 'anan1', status: 'SUCCESS' },
];

let AUDIT_LOGS: AuditLog[] = [];

// --- Helper ---
const logAudit = (action: AuditLog['action'], performerId: string, details: string, targetId?: string) => {
  const log: AuditLog = {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    action,
    performer_id: performerId,
    details,
    target_id: targetId,
    timestamp: new Date().toISOString(),
    ip_address: '192.168.1.1' // Mock IP
  };
  AUDIT_LOGS.unshift(log);
};

// --- Services ---

// 1. Auth & Security (Unified)
export const login = async (phone: string, secret: string, requiredRole?: UserRole): Promise<{ user: User | null; error?: string }> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const userIndex = USERS.findIndex(u => u.phone === phone);
  if (userIndex === -1) return { user: null, error: 'Số điện thoại không tồn tại' };
  
  const user = USERS[userIndex];

  // Enforce Role Check if requested
  if (requiredRole && user.role !== requiredRole) {
    return { user: null, error: `Tài khoản không có quyền truy cập vào khu vực ${requiredRole}` };
  }

  // Check Lock status
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const remaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
    return { user: null, error: `Tài khoản bị khóa do sai nhiều lần. Thử lại sau ${remaining} phút.` };
  }

  // Auth Logic based on Role
  if (user.role === UserRole.CUSTOMER) {
    // PIN Check
    if (user.pin_hash !== secret) {
      user.failed_pin_attempts = (user.failed_pin_attempts || 0) + 1;
      
      if (user.failed_pin_attempts >= 5) {
        user.locked_until = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes lock
        user.failed_pin_attempts = 0;
        return { user: null, error: 'Sai PIN 5 lần. Tài khoản bị khóa 5 phút.' };
      }
      return { user: null, error: `Sai PIN. Còn ${5 - (user.failed_pin_attempts || 0)} lần thử.` };
    }
    // Success
    user.failed_pin_attempts = 0;
    user.locked_until = undefined;
  } else {
    // Password Check for OWNER / STAFF
    if (user.password !== secret) {
      return { user: null, error: 'Mật khẩu không đúng' };
    }
  }
  
  return { user };
};

export const changePin = async (phone: string, oldPin: string, newPin: string): Promise<{ success: boolean; message: string }> => {
  const { user, error } = await login(phone, oldPin, UserRole.CUSTOMER);
  if (!user) return { success: false, message: error || 'Mật khẩu cũ không đúng' };
  
  const userIndex = USERS.findIndex(u => u.phone === phone);
  if (userIndex > -1) {
      USERS[userIndex].pin_hash = newPin;
      return { success: true, message: 'Đổi PIN thành công!' };
  }
  return { success: false, message: 'Lỗi hệ thống' };
}

// 2. Ticket Logic & Tokens
export const getTicketsByPhone = async (phone: string): Promise<Ticket[]> => {
  await new Promise(resolve => setTimeout(resolve, 400));
  return TICKETS.filter(t => t.owner_phone === phone);
};

export const getAllTickets = async (): Promise<Ticket[]> => {
  return [...TICKETS];
};

export const generateTicketToken = async (ticketId: string): Promise<string> => {
  const timestamp = Date.now();
  const signature = `sig_${Math.floor(Math.random() * 10000)}`; 
  return btoa(JSON.stringify({ id: ticketId, ts: timestamp, sig: signature }));
};

// 3. Check-in Logic
export const performCheckIn = async (
  identifier: string, 
  method: 'QR_CHUNG' | 'QR_RIENG' | 'MANUAL',
  branchId: string,
  performedBy?: string, 
  pin?: string 
): Promise<{ success: boolean; message: string; remaining?: number; requirePin?: boolean }> => {
  await new Promise(resolve => setTimeout(resolve, 600));
  
  let ticketId = identifier;

  if (method === 'QR_RIENG') {
    try {
      const decoded = JSON.parse(atob(identifier));
      ticketId = decoded.id;
      const tokenTime = decoded.ts;
      
      if (Date.now() - tokenTime > 300000) {
         return { success: false, message: 'QR Code đã hết hạn. Vui lòng làm mới.' };
      }
    } catch (e) {
      return { success: false, message: 'Mã QR không hợp lệ.' };
    }
  }

  const ticketIndex = TICKETS.findIndex(t => t.ticket_id === ticketId);
  if (ticketIndex === -1) return { success: false, message: 'Vé không tồn tại.' };

  const ticket = TICKETS[ticketIndex];

  if (new Date(ticket.expires_at) < new Date()) {
    return { success: false, message: 'Vé đã hết hạn (Expired).' };
  }

  if (ticket.status === TicketStatus.LOCKED) {
    return { success: false, message: 'Vé đang bị khóa (Locked).' };
  }
  
  if (ticket.remaining_uses <= 0) {
    return { success: false, message: 'Vé đã hết số buổi tập.' };
  }

  if (ticket.require_pin && method !== 'MANUAL') {
      if (!pin) {
          return { success: false, message: 'Cần nhập PIN để xác thực.', requirePin: true };
      }
      const user = USERS.find(u => u.phone === ticket.owner_phone);
      if (!user || user.pin_hash !== pin) {
         return { success: false, message: 'PIN không đúng.' };
      }
  }

  const lastLog = CHECKIN_LOGS.find(l => l.ticket_id === ticketId && l.status === 'SUCCESS' && 
    (Date.now() - new Date(l.timestamp).getTime()) < 2 * 60 * 1000
  );

  if (lastLog) {
     return { success: false, message: 'Check-in quá nhanh. Vui lòng đợi 2 phút.' };
  }

  const updatedTicket = { ...ticket, remaining_uses: ticket.remaining_uses - 1 };
  TICKETS[ticketIndex] = updatedTicket;

  const newLog: CheckInLog = {
    id: `L${Date.now()}`,
    ticket_id: ticket.ticket_id,
    user_name: ticket.owner_name,
    user_phone: ticket.owner_phone,
    timestamp: new Date().toISOString(),
    method,
    branch_id: branchId,
    status: 'SUCCESS',
    is_manual_by_staff: method === 'MANUAL'
  };
  CHECKIN_LOGS.unshift(newLog);

  if (method === 'MANUAL' && performedBy) {
    logAudit('MANUAL_CHECKIN', performedBy, `Checked in ticket ${ticketId}`, ticketId);
  }

  return { success: true, message: 'Check-in thành công!', remaining: updatedTicket.remaining_uses };
};

// 4. Admin & Staff Management
export const createTicket = async (data: Partial<Ticket>, ownerId: string) => {
  const newTicket: Ticket = {
    ticket_id: `T${Date.now()}`,
    shop_id: 'anan',
    branch_id: 'anan1',
    owner_phone: data.owner_phone || '',
    owner_name: data.owner_name || 'New Member',
    type: data.type || TicketType.SESSION_12,
    total_uses: data.total_uses || 12,
    remaining_uses: data.total_uses || 12,
    expires_at: data.expires_at || new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    status: TicketStatus.ACTIVE,
    require_pin: true,
    created_at: new Date().toISOString(),
    ...data
  } as Ticket;

  TICKETS.push(newTicket);
  logAudit('CREATE_TICKET', ownerId, `Created ticket ${newTicket.ticket_id} for ${newTicket.owner_phone}`, newTicket.ticket_id);
  return newTicket;
};

export const updateTicket = async (ticketId: string, data: Partial<Ticket>, ownerId: string) => {
  const idx = TICKETS.findIndex(t => t.ticket_id === ticketId);
  if (idx > -1) {
    TICKETS[idx] = { ...TICKETS[idx], ...data };
    logAudit('CREATE_TICKET', ownerId, `Updated ticket ${ticketId} (Uses: ${data.remaining_uses}, Exp: ${data.expires_at})`, ticketId);
    return true;
  }
  return false;
};

export const toggleTicketLock = async (ticketId: string, performerId: string) => {
  const idx = TICKETS.findIndex(t => t.ticket_id === ticketId);
  if (idx > -1) {
    const newStatus = TICKETS[idx].status === TicketStatus.LOCKED ? TicketStatus.ACTIVE : TicketStatus.LOCKED;
    TICKETS[idx].status = newStatus;
    logAudit('LOCK_TICKET', performerId, `Changed status to ${newStatus}`, ticketId);
  }
};

export const resetPin = async (phone: string, performerId: string) => {
  const user = USERS.find(u => u.phone === phone);
  if (user) {
    user.pin_hash = '1234'; 
    user.failed_pin_attempts = 0;
    user.locked_until = undefined;
    logAudit('RESET_PIN', performerId, `Reset PIN for ${phone}`, user.id);
    return true;
  }
  return false;
};

export const getStaffUsers = async (): Promise<User[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  return USERS.filter(u => u.role === UserRole.STAFF);
};

export const addStaff = async (staffData: Partial<User>, performerId: string) => {
  const newUser: User = {
    id: `staff_${Date.now()}`,
    name: staffData.name || 'New Staff',
    phone: staffData.phone || '',
    role: UserRole.STAFF,
    branch_id: staffData.branch_id || 'anan1',
    password: 'password123' // Default password for new staff
  };
  USERS.push(newUser);
  return newUser;
};

export const removeStaff = async (staffId: string, performerId: string) => {
  USERS = USERS.filter(u => u.id !== staffId);
};

export const getCheckInLogs = async (): Promise<CheckInLog[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  return [...CHECKIN_LOGS];
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  return [...AUDIT_LOGS];
}

export const getDashboardStats = async () => {
   const totalCheckins = CHECKIN_LOGS.length;
   const activeTickets = TICKETS.filter(t => t.status === TicketStatus.ACTIVE).length;
   const expiringSoon = TICKETS.filter(t => t.remaining_uses < 3 && t.status === TicketStatus.ACTIVE).length;
   
   return {
     totalCheckins,
     activeTickets,
     expiringSoon,
     todayCheckins: CHECKIN_LOGS.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length
   };
};

export const exportData = async (type: 'logs' | 'tickets', performerId: string) => {
    logAudit('EXPORT_DATA', performerId, `Exported ${type}`);
    return { url: `https://mock-s3.com/export_${type}_${Date.now()}.csv` };
};