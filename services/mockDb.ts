import { supabase } from './supabaseClient';
import { Ticket, User, CheckInLog, Branch, UserRole, TicketType, TicketStatus, AuditLog } from '../types';

// --- Constants ---
export const BRANCHES: Branch[] = [
  { id: 'anan1', name: 'Yoga An An - Lê Lợi', address: '123 Lê Lợi, Q1' },
  { id: 'anan2', name: 'Yoga An An - Nguyễn Huệ', address: '45 Nguyễn Huệ, Q1' },
];

// --- Helper for Audit Logs (DB) ---
const logAudit = async (action: AuditLog['action'], performerId: string, details: string, targetId?: string) => {
  try {
    await supabase.from('audit_logs').insert({
      action,
      performer_id: performerId,
      details,
      target_id: targetId,
      ip_address: 'client-ip', // Client side limitation
    });
  } catch (error) {
    console.error('Audit Log Error', error);
  }
};

// --- Services (Real Database Implementation) ---

// 1. Auth & Security
export const login = async (phone: string, secret: string, requiredRole?: UserRole): Promise<{ user: User | null; error?: string }> => {
  try {
    // Fetch user
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('phone', phone)
      .single();

    if (fetchError || !user) {
        return { user: null, error: 'Số điện thoại không tồn tại' };
    }

    // Check Role
    if (requiredRole && user.role !== requiredRole) {
      return { user: null, error: `Tài khoản không có quyền truy cập vào khu vực ${requiredRole}` };
    }

    // Check Lock status
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return { user: null, error: `Tài khoản bị khóa do sai nhiều lần. Thử lại sau ${remaining} phút.` };
    }

    // Auth Logic
    if (user.role === UserRole.CUSTOMER) {
      // PIN Check (Mocked hash comparison for demo, in real app usage bcrypt on backend or simple string match if plain text)
      if (user.pin_hash !== secret) {
        const newAttempts = (user.failed_pin_attempts || 0) + 1;
        let updateData: any = { failed_pin_attempts: newAttempts };
        let errorMsg = `Sai PIN. Còn ${5 - newAttempts} lần thử.`;

        if (newAttempts >= 5) {
          updateData.locked_until = new Date(Date.now() + 5 * 60 * 1000).toISOString();
          updateData.failed_pin_attempts = 0;
          errorMsg = 'Sai PIN 5 lần. Tài khoản bị khóa 5 phút.';
        }

        await supabase.from('users').update(updateData).eq('id', user.id);
        return { user: null, error: errorMsg };
      }
      
      // Success: Reset attempts
      await supabase.from('users').update({ failed_pin_attempts: 0, locked_until: null }).eq('id', user.id);

    } else {
      // Password Check for OWNER/STAFF
      if (user.password !== secret) {
        return { user: null, error: 'Mật khẩu không đúng' };
      }
    }

    return { user: user as User };
  } catch (err) {
    console.error(err);
    return { user: null, error: 'Lỗi kết nối server' };
  }
};

export const changePin = async (phone: string, oldPin: string, newPin: string): Promise<{ success: boolean; message: string }> => {
  const { user, error } = await login(phone, oldPin, UserRole.CUSTOMER);
  if (!user) return { success: false, message: error || 'Mật khẩu cũ không đúng' };

  const { error: updateError } = await supabase
    .from('users')
    .update({ pin_hash: newPin })
    .eq('phone', phone);

  if (updateError) return { success: false, message: 'Lỗi cập nhật PIN' };
  return { success: true, message: 'Đổi PIN thành công!' };
};

// 2. Ticket Logic
export const getTicketsByPhone = async (phone: string): Promise<Ticket[]> => {
  const { data } = await supabase
    .from('tickets')
    .select('*')
    .eq('owner_phone', phone);
  return (data as Ticket[]) || [];
};

export const getAllTickets = async (): Promise<Ticket[]> => {
  const { data } = await supabase.from('tickets').select('*');
  return (data as Ticket[]) || [];
};

export const generateTicketToken = async (ticketId: string): Promise<string> => {
  // In a real app, this should use a server-side secret to sign
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
  
  let ticketId = identifier;

  // Decode Token if QR_RIENG
  if (method === 'QR_RIENG') {
    try {
      const decoded = JSON.parse(atob(identifier));
      ticketId = decoded.id;
      const tokenTime = decoded.ts;
      if (Date.now() - tokenTime > 300000) { // 5 minutes token validity
         return { success: false, message: 'QR Code đã hết hạn. Vui lòng làm mới.' };
      }
    } catch (e) {
      return { success: false, message: 'Mã QR không hợp lệ.' };
    }
  }

  // Fetch Ticket
  const { data: ticket, error } = await supabase
    .from('tickets')
    .select('*')
    .eq('ticket_id', ticketId)
    .single();

  if (error || !ticket) return { success: false, message: 'Vé không tồn tại.' };

  // Validations
  if (new Date(ticket.expires_at) < new Date()) {
    return { success: false, message: 'Vé đã hết hạn (Expired).' };
  }
  if (ticket.status === TicketStatus.LOCKED) {
    return { success: false, message: 'Vé đang bị khóa (Locked).' };
  }
  if (ticket.remaining_uses <= 0) {
    return { success: false, message: 'Vé đã hết số buổi tập.' };
  }

  // PIN Check
  if (ticket.require_pin && method !== 'MANUAL') {
      if (!pin) {
          return { success: false, message: 'Cần nhập PIN để xác thực.', requirePin: true };
      }
      // Verify PIN against User
      const { data: user } = await supabase.from('users').select('pin_hash').eq('phone', ticket.owner_phone).single();
      if (!user || user.pin_hash !== pin) {
         return { success: false, message: 'PIN không đúng.' };
      }
  }

  // Anti-Fraud: Rate Limit (2 mins)
  const { data: lastLogs } = await supabase
    .from('checkin_logs')
    .select('timestamp')
    .eq('ticket_id', ticketId)
    .eq('status', 'SUCCESS')
    .order('timestamp', { ascending: false })
    .limit(1);

  if (lastLogs && lastLogs.length > 0) {
    const lastTime = new Date(lastLogs[0].timestamp).getTime();
    if (Date.now() - lastTime < 2 * 60 * 1000) {
        return { success: false, message: 'Check-in quá nhanh. Vui lòng đợi 2 phút.' };
    }
  }

  // Execute Check-in (Ideally this should be an RPC/Transaction)
  const newRemaining = ticket.remaining_uses - 1;
  
  const { error: updateError } = await supabase
    .from('tickets')
    .update({ remaining_uses: newRemaining })
    .eq('ticket_id', ticketId);

  if (updateError) return { success: false, message: 'Lỗi hệ thống khi trừ vé.' };

  // Log Check-in
  await supabase.from('checkin_logs').insert({
    ticket_id: ticket.ticket_id,
    user_name: ticket.owner_name,
    user_phone: ticket.owner_phone,
    method,
    branch_id: branchId,
    status: 'SUCCESS',
    is_manual_by_staff: method === 'MANUAL'
  });

  if (method === 'MANUAL' && performedBy) {
    await logAudit('MANUAL_CHECKIN', performedBy, `Checked in ticket ${ticketId}`, ticketId);
  }

  return { success: true, message: 'Check-in thành công!', remaining: newRemaining };
};

// 4. Admin Functions
export const createTicket = async (data: Partial<Ticket>, ownerId: string) => {
  const newTicket = {
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
    require_pin: true
  };

  await supabase.from('tickets').insert(newTicket);
  await logAudit('CREATE_TICKET', ownerId, `Created ticket ${newTicket.ticket_id}`, newTicket.ticket_id);
  return newTicket;
};

export const updateTicket = async (ticketId: string, data: Partial<Ticket>, ownerId: string) => {
  const { error } = await supabase
    .from('tickets')
    .update(data)
    .eq('ticket_id', ticketId);
  
  if (!error) {
     await logAudit('CREATE_TICKET', ownerId, `Updated ticket ${ticketId}`, ticketId); // Action name reused as per requirements
     return true;
  }
  return false;
};

export const toggleTicketLock = async (ticketId: string, performerId: string) => {
  // Get current status
  const { data: ticket } = await supabase.from('tickets').select('status').eq('ticket_id', ticketId).single();
  if (ticket) {
    const newStatus = ticket.status === TicketStatus.LOCKED ? TicketStatus.ACTIVE : TicketStatus.LOCKED;
    await supabase.from('tickets').update({ status: newStatus }).eq('ticket_id', ticketId);
    await logAudit('LOCK_TICKET', performerId, `Changed status to ${newStatus}`, ticketId);
  }
};

export const resetPin = async (phone: string, performerId: string) => {
  const { error } = await supabase
    .from('users')
    .update({ pin_hash: '1234', failed_pin_attempts: 0, locked_until: null })
    .eq('phone', phone);
    
  if (!error) {
    await logAudit('RESET_PIN', performerId, `Reset PIN for ${phone}`);
    return true;
  }
  return false;
};

export const getStaffUsers = async (): Promise<User[]> => {
  const { data } = await supabase.from('users').select('*').eq('role', UserRole.STAFF);
  return (data as User[]) || [];
};

export const addStaff = async (staffData: Partial<User>, performerId: string) => {
  const newUser = {
    name: staffData.name || 'New Staff',
    phone: staffData.phone || '',
    role: UserRole.STAFF,
    branch_id: staffData.branch_id || 'anan1',
    password: 'password123'
  };
  await supabase.from('users').insert(newUser);
  return newUser;
};

export const removeStaff = async (staffId: string, performerId: string) => {
  await supabase.from('users').delete().eq('id', staffId);
};

export const getCheckInLogs = async (): Promise<CheckInLog[]> => {
  const { data } = await supabase.from('checkin_logs').select('*').order('timestamp', { ascending: false }).limit(50);
  return (data as CheckInLog[]) || [];
};

export const getAuditLogs = async (): Promise<AuditLog[]> => {
  const { data } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(50);
  return (data as AuditLog[]) || [];
}

export const getDashboardStats = async () => {
   // This is expensive in real DB, usually use COUNT query
   const { count: totalCheckins } = await supabase.from('checkin_logs').select('*', { count: 'exact', head: true });
   const { count: activeTickets } = await supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'active');
   
   // Complex filter logic is better done with exact queries, simplifying here for demo
   const { data: expiringTickets } = await supabase.from('tickets').select('remaining_uses').lt('remaining_uses', 3).eq('status', 'active');
   
   const todayStr = new Date().toISOString().split('T')[0];
   const { count: todayCheckins } = await supabase.from('checkin_logs')
     .select('*', { count: 'exact', head: true })
     .gte('timestamp', todayStr);

   return {
     totalCheckins: totalCheckins || 0,
     activeTickets: activeTickets || 0,
     expiringSoon: expiringTickets?.length || 0,
     todayCheckins: todayCheckins || 0
   };
};

export const exportData = async (type: 'logs' | 'tickets', performerId: string) => {
    await logAudit('EXPORT_DATA', performerId, `Exported ${type}`);
    // Real app would trigger a backend function to generate CSV and return signed URL
    return { url: `#` }; 
};