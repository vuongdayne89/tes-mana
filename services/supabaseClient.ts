import { createClient } from '@supabase/supabase-js';

// BẠN CẦN THAY THẾ 2 GIÁ TRỊ NÀY BẰNG THÔNG TIN TỪ SUPABASE DASHBOARD CỦA BẠN
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);