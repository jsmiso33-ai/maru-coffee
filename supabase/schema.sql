-- MARU 커피 소모임 — Supabase 스키마
-- Supabase 대시보드 → SQL Editor에 이 파일 전체를 붙여넣고 Run.
-- 맨 아래 "첫 관리자 등록"의 이메일을 회장 본인 구글 계정으로 바꾼 뒤 실행할 것.
--
-- 권한 모델
--   · 누구나(비로그인 포함) 노트·레시피를 읽을 수 있다.
--   · 쓰기는 구글 로그인 + members 명단에 이메일이 있는 부원만.
--   · 수정은 본인 글만, 삭제는 본인 또는 관리자(admin).
--   · 작성자 이름/사진은 트리거가 채운다(클라이언트가 남의 이름으로 쓰지 못하게).

-- ───────────────────────── 부원 명단 ─────────────────────────
create table if not exists public.members (
  email      text primary key check (email = lower(email)),
  name       text,
  role       text not null default 'member' check (role in ('member', 'admin')),
  created_at timestamptz not null default now()
);
alter table public.members enable row level security;

-- security definer: members의 RLS를 우회해 자기 역할만 조회 (정책 안에서 재귀 방지)
create or replace function public.my_role()
returns text language sql stable security definer set search_path = ''
as $$
  select role from public.members where email = lower(auth.jwt() ->> 'email')
$$;

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.members where email = lower(auth.jwt() ->> 'email'))
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.members where email = lower(auth.jwt() ->> 'email') and role = 'admin')
$$;

revoke all on function public.my_role(), public.is_member(), public.is_admin() from public;
grant execute on function public.my_role(), public.is_member(), public.is_admin() to anon, authenticated;

drop policy if exists "members: 본인 또는 관리자 조회" on public.members;
create policy "members: 본인 또는 관리자 조회" on public.members
  for select to authenticated
  using (email = lower((select auth.jwt()) ->> 'email') or (select public.is_admin()));

drop policy if exists "members: 관리자 추가" on public.members;
create policy "members: 관리자 추가" on public.members
  for insert to authenticated with check ((select public.is_admin()));

drop policy if exists "members: 관리자 수정" on public.members;
create policy "members: 관리자 수정" on public.members
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "members: 관리자 삭제" on public.members;
create policy "members: 관리자 삭제" on public.members
  for delete to authenticated using ((select public.is_admin()));

-- ───────────────────── 작성자 자동 채우기 트리거 ─────────────────────
create or replace function public.stamp_author()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  jwt jsonb := auth.jwt();
begin
  if tg_op = 'INSERT' then
    new.user_id := auth.uid();
    new.author_name := coalesce(
      (select m.name from public.members m where m.email = lower(jwt ->> 'email') and m.name <> ''),
      jwt -> 'user_metadata' ->> 'full_name',
      split_part(jwt ->> 'email', '@', 1)
    );
    new.author_avatar := jwt -> 'user_metadata' ->> 'avatar_url';
    new.created_at := now();
  else
    -- 수정 시 작성자·작성일은 바꿀 수 없다
    new.user_id := old.user_id;
    new.author_name := old.author_name;
    new.author_avatar := old.author_avatar;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

-- ───────────────────────── 테이스팅 노트 ─────────────────────────
create table if not exists public.tasting_notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name   text not null,
  author_avatar text,
  bean_name     text not null check (char_length(bean_name) between 1 and 80),
  roaster       text check (char_length(roaster) <= 60),
  origin        text check (char_length(origin) <= 60),
  process       text check (char_length(process) <= 30),
  roast_level   text check (char_length(roast_level) <= 30),
  brew_method   text check (char_length(brew_method) <= 30),
  tasted_on     date not null default current_date,
  flavors       text[] not null default '{}' check (cardinality(flavors) <= 12),
  acidity       smallint not null check (acidity between 1 and 5),
  sweetness     smallint not null check (sweetness between 1 and 5),
  body          smallint not null check (body between 1 and 5),
  bitterness    smallint not null check (bitterness between 1 and 5),
  aftertaste    smallint not null check (aftertaste between 1 and 5),
  rating        numeric(2, 1) not null check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  memo          text check (char_length(memo) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists tasting_notes_created_idx on public.tasting_notes (created_at desc);
create index if not exists tasting_notes_user_idx on public.tasting_notes (user_id);

drop trigger if exists tasting_notes_stamp on public.tasting_notes;
create trigger tasting_notes_stamp before insert or update on public.tasting_notes
  for each row execute function public.stamp_author();

alter table public.tasting_notes enable row level security;

drop policy if exists "notes: 누구나 읽기" on public.tasting_notes;
create policy "notes: 누구나 읽기" on public.tasting_notes
  for select to anon, authenticated using (true);

drop policy if exists "notes: 부원 작성" on public.tasting_notes;
create policy "notes: 부원 작성" on public.tasting_notes
  for insert to authenticated with check ((select public.is_member()));

drop policy if exists "notes: 본인 수정" on public.tasting_notes;
create policy "notes: 본인 수정" on public.tasting_notes
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_member()))
  with check (user_id = (select auth.uid()));

drop policy if exists "notes: 본인·관리자 삭제" on public.tasting_notes;
create policy "notes: 본인·관리자 삭제" on public.tasting_notes
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ───────────────────────── 부원 레시피 ─────────────────────────
-- steps: [{ "at": 초, "label": "뜸 들이기", "target": 누적 물 g | null }]
create table if not exists public.recipes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name   text not null,
  author_avatar text,
  title         text not null check (char_length(title) between 1 and 60),
  method        text not null check (char_length(method) <= 30),
  dose_g        numeric(5, 1) not null check (dose_g > 0 and dose_g <= 200),
  water_g       numeric(6, 1) not null check (water_g > 0 and water_g <= 3000),
  water_temp    smallint check (water_temp between 0 and 100),
  grind         text check (char_length(grind) <= 40),
  total_time_s  integer check (total_time_s between 0 and 86400),
  steps         jsonb not null default '[]' check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 20),
  bean_hint     text check (char_length(bean_hint) <= 80),
  memo          text check (char_length(memo) <= 2000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists recipes_created_idx on public.recipes (created_at desc);
create index if not exists recipes_user_idx on public.recipes (user_id);

drop trigger if exists recipes_stamp on public.recipes;
create trigger recipes_stamp before insert or update on public.recipes
  for each row execute function public.stamp_author();

alter table public.recipes enable row level security;

drop policy if exists "recipes: 누구나 읽기" on public.recipes;
create policy "recipes: 누구나 읽기" on public.recipes
  for select to anon, authenticated using (true);

drop policy if exists "recipes: 부원 작성" on public.recipes;
create policy "recipes: 부원 작성" on public.recipes
  for insert to authenticated with check ((select public.is_member()));

drop policy if exists "recipes: 본인 수정" on public.recipes;
create policy "recipes: 본인 수정" on public.recipes
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_member()))
  with check (user_id = (select auth.uid()));

drop policy if exists "recipes: 본인·관리자 삭제" on public.recipes;
create policy "recipes: 본인·관리자 삭제" on public.recipes
  for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ───────────────────────── 첫 관리자 등록 ─────────────────────────
-- ↓ 회장 본인의 구글 로그인 이메일로 바꿔서 실행 (소문자)
insert into public.members (email, name, role)
values ('your-email@gmail.com', '회장', 'admin')
on conflict (email) do update set role = 'admin';
