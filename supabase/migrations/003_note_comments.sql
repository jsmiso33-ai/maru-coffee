-- 003 · 테이스팅 노트 댓글
-- Supabase SQL Editor에 이 파일 전체를 붙여넣고 Run. 여러 번 실행해도 안전하다.
--
-- 권한: 누구나 읽기(노트와 같이 공개), 부원만 쓰기, 본인만 수정.
--       삭제는 본인 · 그 노트 작성자 · 운영진.
--       작성자 이름·사진·작성 시각은 기존 stamp_author 트리거가 채운다(남의 이름으로 못 씀).

create table if not exists public.note_comments (
  id            uuid primary key default gen_random_uuid(),
  note_id       uuid not null references public.tasting_notes (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name   text not null,
  author_avatar text,
  body          text not null check (char_length(btrim(body)) between 1 and 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists note_comments_note_idx on public.note_comments (note_id, created_at);
create index if not exists note_comments_user_idx on public.note_comments (user_id);

drop trigger if exists note_comments_stamp on public.note_comments;
create trigger note_comments_stamp before insert or update on public.note_comments
  for each row execute function public.stamp_author();

-- 수정할 때 다른 노트로 옮기지 못하게
create or replace function public.lock_comment_note()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.note_id := old.note_id;
  return new;
end;
$$;

drop trigger if exists note_comments_lock_note on public.note_comments;
create trigger note_comments_lock_note before update on public.note_comments
  for each row execute function public.lock_comment_note();

alter table public.note_comments enable row level security;

drop policy if exists "comments: 누구나 읽기" on public.note_comments;
create policy "comments: 누구나 읽기" on public.note_comments
  for select to anon, authenticated using (true);

drop policy if exists "comments: 부원 작성" on public.note_comments;
create policy "comments: 부원 작성" on public.note_comments
  for insert to authenticated with check ((select public.is_member()));

drop policy if exists "comments: 본인 수정" on public.note_comments;
create policy "comments: 본인 수정" on public.note_comments
  for update to authenticated
  using (user_id = (select auth.uid()) and (select public.is_member()))
  with check (user_id = (select auth.uid()));

drop policy if exists "comments: 본인·노트 작성자·운영진 삭제" on public.note_comments;
create policy "comments: 본인·노트 작성자·운영진 삭제" on public.note_comments
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.tasting_notes n where n.id = note_id and n.user_id = (select auth.uid()))
  );
