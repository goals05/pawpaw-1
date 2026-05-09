import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 환경 변수가 설정되지 않았습니다. Settings 메뉴에서 VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 설정해주세요.');
}

export const supabase = createClient(
  supabaseUrl || 'https://your-project.supabase.co', 
  supabaseAnonKey || 'your-anon-key'
);
