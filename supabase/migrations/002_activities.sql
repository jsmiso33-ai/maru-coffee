-- 002 · 활동(일자별 모임) — 일정 캘린더 + 그날 원두·노트 모아보기
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 Run. 여러 번 실행해도 안전하다.
--
-- 권한: 활동·원두는 누구나 읽고, 운영진(admin)만 만들고 고치고 지운다.
--       노트는 기존 규칙 그대로(부원 작성·본인 수정)이며 활동/원두를 선택적으로 연결한다.

-- ───────────────────────── 활동 ─────────────────────────
create table if not exists public.activities (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 60),
  kind        text not null default '정기 모임' check (char_length(kind) <= 20),
  held_on     date not null,
  start_time  time,
  place       text check (char_length(place) <= 80),
  description text check (char_length(description) <= 2000),
  prep        text check (char_length(prep) <= 300),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists activities_held_on_idx on public.activities (held_on desc);

-- 그날 함께 마시는 원두
create table if not exists public.activity_beans (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities (id) on delete cascade,
  sort        smallint not null default 0,
  name        text not null check (char_length(name) between 1 and 80),
  roaster     text check (char_length(roaster) <= 60),
  origin      text check (char_length(origin) <= 60),
  process     text check (char_length(process) <= 30),
  roast_level text check (char_length(roast_level) <= 30)
);
create index if not exists activity_beans_activity_idx on public.activity_beans (activity_id, sort);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists activities_touch on public.activities;
create trigger activities_touch before update on public.activities
  for each row execute function public.touch_updated_at();

alter table public.activities enable row level security;
alter table public.activity_beans enable row level security;

drop policy if exists "activities: 누구나 읽기" on public.activities;
create policy "activities: 누구나 읽기" on public.activities for select to anon, authenticated using (true);
drop policy if exists "activities: 운영진 작성" on public.activities;
create policy "activities: 운영진 작성" on public.activities for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "activities: 운영진 수정" on public.activities;
create policy "activities: 운영진 수정" on public.activities for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "activities: 운영진 삭제" on public.activities;
create policy "activities: 운영진 삭제" on public.activities for delete to authenticated using ((select public.is_admin()));

drop policy if exists "activity_beans: 누구나 읽기" on public.activity_beans;
create policy "activity_beans: 누구나 읽기" on public.activity_beans for select to anon, authenticated using (true);
drop policy if exists "activity_beans: 운영진 작성" on public.activity_beans;
create policy "activity_beans: 운영진 작성" on public.activity_beans for insert to authenticated with check ((select public.is_admin()));
drop policy if exists "activity_beans: 운영진 수정" on public.activity_beans;
create policy "activity_beans: 운영진 수정" on public.activity_beans for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "activity_beans: 운영진 삭제" on public.activity_beans;
create policy "activity_beans: 운영진 삭제" on public.activity_beans for delete to authenticated using ((select public.is_admin()));

-- ───────────────────── 노트 ↔ 활동 연결 ─────────────────────
alter table public.tasting_notes
  add column if not exists activity_id uuid references public.activities (id) on delete set null,
  add column if not exists activity_bean_id uuid references public.activity_beans (id) on delete set null;
create index if not exists tasting_notes_activity_idx on public.tasting_notes (activity_id);
create index if not exists tasting_notes_activity_bean_idx on public.tasting_notes (activity_bean_id);

-- 원두를 고르면 활동은 그 원두의 활동으로 맞춘다(클라이언트가 엉뚱한 조합을 보내지 못하게)
create or replace function public.sync_note_activity()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.activity_bean_id is not null then
    new.activity_id := (select b.activity_id from public.activity_beans b where b.id = new.activity_bean_id);
  end if;
  return new;
end;
$$;

drop trigger if exists tasting_notes_sync_activity on public.tasting_notes;
create trigger tasting_notes_sync_activity before insert or update of activity_id, activity_bean_id on public.tasting_notes
  for each row execute function public.sync_note_activity();
