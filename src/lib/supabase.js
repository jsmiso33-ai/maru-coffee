import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// 환경변수가 없으면 null — 사이트는 "미리보기 모드"(샘플 데이터, 읽기 전용)로 동작한다.
// implicit 흐름: Safari ITP가 PKCE code_verifier를 지워 로그인이 간헐 실패하는 문제 회피.
export const supabase = url && key
  ? createClient(url, key, {
      auth: { flowType: 'implicit', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    })
  : null;

export const isConfigured = Boolean(supabase);
