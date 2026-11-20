-- 005 · 카페 지도 — 부원들이 기록하는 대한민국 커피 맛집
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 Run. 여러 번 실행해도 안전하다.
--
-- 권한: 누구나 읽기, 로그인하면 작성(is_member), 본인 수정, 본인·운영진 삭제.
--       작성자 이름·사진은 기존 stamp_author 트리거가 채운다.

create table if not exists public.cafes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name   text not null,
  author_avatar text,
  name          text not null check (char_length(btrim(name)) between 1 and 60),
  address       text check (char_length(address) <= 160),
  region        text not null check (char_length(region) <= 20),
  lat           double precision not null check (lat between 32 and 39.5),
  lng           double precision not null check (lng between 123.5 and 132),
  rating        numeric(2, 1) not null check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  tags          text[] not null default '{}' check (cardinality(tags) <= 10),
  signature     text check (char_length(signature) <= 80),
  memo          text check (char_length(memo) <= 2000),
  link          text check (char_length(link) <= 300 and (link is null or link ~* '^https?://')),
  visited_on    date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists cafes_created_idx on public.cafes (created_at desc);
create index if not exists cafes_region_idx on public.cafes (region);
create index if not exists cafes_user_idx on public.cafes (user_id);

drop trigger if exists cafes_stamp on public.cafes;
create trigger cafes_stamp before insert or update on public.cafes
  for each row execute function public.stamp_author();

alter table public.cafes enable row level security;

drop policy if exists "cafes: 누구나 읽기" on public.cafes;
create policy "cafes: 누구나 읽기" on public.cafes for select to anon, authenticated using (true);

drop policy if exists "cafes: 로그인 작성" on public.cafes;
create policy "cafes: 로그인 작성" on public.cafes for insert to authenticated with check ((select public.is_member()));

drop policy if exists "cafes: 본인 수정" on public.cafes;
create policy "cafes: 본인 수정" on public.cafes for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "cafes: 본인·운영진 삭제" on public.cafes;
create policy "cafes: 본인·운영진 삭제" on public.cafes for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
