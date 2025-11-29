
export enum UserRole {
  PLATFORM_ADMIN = 'PLATFORM_ADMIN', // Owner of ONIN
  OWNER = 'OWNER', // Brand Owner
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER'
}

export enum TicketType {
  SESSION_12 = '12-buoi',
  SESSION_20 = '20-buoi',
  MONTHLY = 'thang',
  EVENT = 'su-kien',
  CUSTOM = 'tuy-chon'
}

export enum TicketStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  LOCKED = 'locked'
}

export interface Package {
  id: string;
  name: string;
  max_branches: number;
  price: number;
  description: string;
}

export interface Tenant {
  id: string;
  name: string; // Brand Name
  package_id?: string;
  status: 'active' | 'locked';
  subscription_end: string;
  created_at: string;
  city?: string;
  address_detail?: string;
  // Stats fields (populated dynamically)
  stats?: {
    branches: number;
    staff: number;
    customers: number;
    checkins: number;
  };
}

export interface PlatformStats {
    mrr: number;
    totalTenants: number;
    totalMembers: number;
    totalCheckins: number;
    churnRate: number; // percentage
    topRegions: { name: string, value: number }[];
}

export interface Ticket {
  ticket_id: string;
  tenant_id: string;
  shop_id: string;
  branch_id: string;
  owner_phone: string;
  owner_name: string;
  type: TicketType;
  type_label?: string;
  total_uses: number;
  remaining_uses: number;
  expires_at: string;
  status: TicketStatus;
  require_pin: boolean;
  created_at: string;
}

export interface User {
  id: string;
  tenant_id?: string; 
  name: string;
  phone: string;
  role: UserRole;
  password?: string;
  pin_hash?: string;
  branch_id?: string;
  failed_pin_attempts?: number;
  locked_until?: string;
  identity_token?: string;
}

export interface CheckInLog {
  id: string;
  tenant_id: string;
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
  tenant_id: string;
  action: 'CREATE_TICKET' | 'LOCK_TICKET' | 'RESET_PIN' | 'EXPORT_DATA' | 'MANUAL_CHECKIN' | 'CREATE_CUSTOMER' | 'UPDATE_BRAND' | 'MANAGE_BRANCH';
  performer_id: string;
  target_id?: string;
  details: string;
  timestamp: string;
  ip_address: string;
}

export interface Branch {
  id: string;
  tenant_id: string;
  name: string;
  address: string;
  city?: string;
  address_detail?: string;
}

export interface CustomerDetail {
  user: User;
  tickets: Ticket[];
  logs: CheckInLog[];
}
