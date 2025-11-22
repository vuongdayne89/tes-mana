
import { createClient } from '@supabase/supabase-js';

// Cấu hình trực tiếp Credentials của bạn
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://mxaqvkkplplxhttmlwxp.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXF2a2twbHBseGh0dG1sd3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1Mjk5NDUsImV4cCI6MjA3OTEwNTk0NX0.NcgrNSoCuabW6yIK-D5x05IRTVa0f1OwpS3SxyfrArE';

// Kiểm tra trạng thái cấu hình
export const isSupabaseConfigured = () => {
  return SUPABASE_URL.includes('supabase.co') && !SUPABASE_URL.includes('your-project-id');
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
