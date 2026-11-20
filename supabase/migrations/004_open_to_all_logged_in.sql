-- 004 · 부원 명단 없이 "로그인한 누구나" 노트·레시피·댓글 작성
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 Run. 여러 번 실행해도 안전하다.
--
-- 바뀌는 점
--   · is_member(): 명단 대신 "로그인했는가"로 판단 → 노트·레시피·댓글 정책이 그대로 로그인 사용자 전체에 열린다.
--   · my_role(): 운영진(members.role = 'admin')이면 'admin', 로그인만 했으면 'member'.
--   · members 테이블은 이제 운영진 명단 역할만 한다(활동 등록, 모든 글 삭제, 운영진 관리).
--     role = 'member'로 남아 있는 줄은 권한에 영향이 없고, 등록된 이름은 작성자 이름으로 계속 쓰인다.

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = ''
as $$
  select auth.uid() is not null
$$;

create or replace function public.my_role()
returns text language sql stable security definer set search_path = ''
as $$
  select case
    when exists (select 1 from public.members where email = lower(auth.jwt() ->> 'email') and role = 'admin') then 'admin'
    when auth.uid() is not null then 'member'
  end
$$;

revoke all on function public.my_role(), public.is_member() from public;
grant execute on function public.my_role(), public.is_member() to anon, authenticated;
