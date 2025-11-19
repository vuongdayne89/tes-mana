import { createClient } from '@supabase/supabase-js';

// BẠN CẦN THAY THẾ 2 GIÁ TRỊ NÀY BẰNG THÔNG TIN TỪ SUPABASE DASHBOARD CỦA BẠN
const SUPABASE_URL = 'https://mxaqvkkplplxhttmlwxp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14YXF2a2twbHBseGh0dG1sd3hwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1Mjk5NDUsImV4cCI6MjA3OTEwNTk0NX0.NcgrNSoCuabW6yIK-D5x05IRTVa0f1OwpS3SxyfrArE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
