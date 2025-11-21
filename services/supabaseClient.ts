import { createClient } from '@supabase/supabase-js';

// Lấy cấu hình từ biến môi trường (Vite/Netlify support)
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'your-anon-key-here';

// Kiểm tra xem đã cấu hình đúng chưa (URL không chứa 'your-project-id')
export const isSupabaseConfigured = () => {
  return SUPABASE_URL !== 'https://your-project-id.supabase.co' && 
         SUPABASE_ANON_KEY !== 'your-anon-key-here';
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);