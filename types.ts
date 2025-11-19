export enum UserRole {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER'
}

export enum TicketType {
  SESSION_12 = '12-buoi',
  SESSION_20 = '20-buoi',
  MONTHLY = 'thang',
  EVENT = 'su-kien'
}

export enum TicketStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  LOCKED = 'locked'
}

export interface Ticket {
  ticket_id: string;
  shop_id: string;
  branch_id: string;
  owner_phone: string;
  owner_name: string;
  type: TicketType;
  total_uses: number;
  remaining_uses: number;
  expires_at: string; // ISO date
  status: TicketStatus;
  require_pin: boolean;
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  password?: string; // For Staff/Owner
  pin_hash?: string; // For Customer (Mocked)
  branch_id?: string; // For staff
  failed_pin_attempts?: number;
  locked_until?: string; // ISO date
}

export interface CheckInLog {
  id: string;
  ticket_id: string;
  user_name: string;
  user_phone: string;
  timestamp: string;
  method: 'QR_CHUNG' | 'QR_RIENG' | 'MANUAL';
  branch_id: string;
  status: 'SUCCESS' | 'FAILED';
  message?: string;
  is_manual_by_staff?: boolean;
}

export interface AuditLog {
  id: string;
  action: 'CREATE_TICKET' | 'LOCK_TICKET' | 'RESET_PIN' | 'EXPORT_DATA' | 'MANUAL_CHECKIN';
  performer_id: string;
  target_id?: string; // ticket_id or user_id
  details: string;
  timestamp: string;
  ip_address: string;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
}