-- 006 · 사진 첨부 + 카페 후기 여러 개 + 가보고 싶어요
-- 기존 데이터는 지우지 않는다(카페 한 줄 = 첫 후기로 옮겨 담기만 한다). 여러 번 실행해도 안전하다.

-- ───────────────────────── 1. 사진 저장소 ─────────────────────────
-- 부원 누구나 자기 폴더({user_id}/...)에만 올리고 지울 수 있다. 읽기는 공개.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg'])
on conflict (id) do nothing;

drop policy if exists photos_read on storage.objects;
create policy photos_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'photos');

drop policy if exists photos_upload on storage.objects;
create policy photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists photos_remove on storage.objects;
create policy photos_remove on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

-- 노트에 사진 경로(최대 3장)
alter table public.tasting_notes
  add column if not exists photos text[] not null default '{}' check (cardinality(photos) <= 3);

-- ───────────────────────── 2. 카페 후기 ─────────────────────────
-- cafes는 "장소"만 맡고, 별점·한 줄 평은 부원마다 cafe_reviews에 하나씩.
-- 후기 없이 "가보고 싶어요"로만 등록된 장소도 있을 수 있어 rating을 비워 둘 수 있게 한다.
alter table public.cafes alter column rating drop not null;

create table if not exists public.cafe_reviews (
  id            uuid primary key default gen_random_uuid(),
  cafe_id       uuid not null references public.cafes (id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name   text not null,
  author_avatar text,
  rating        numeric(2, 1) not null check (rating between 0.5 and 5 and rating * 2 = floor(rating * 2)),
  tags          text[] not null default '{}' check (cardinality(tags) <= 10),
  signature     text check (char_length(signature) <= 80),
  memo          text check (char_length(memo) <= 2000),
  visited_on    date,
  photos        text[] not null default '{}' check (cardinality(photos) <= 3),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (cafe_id, user_id)
);
create index if not exists cafe_reviews_cafe_idx on public.cafe_reviews (cafe_id);

drop trigger if exists cafe_reviews_stamp on public.cafe_reviews;
create trigger cafe_reviews_stamp before insert or update on public.cafe_reviews
  for each row execute function public.stamp_author();

-- 수정할 때 다른 카페로 옮기지 못하게
create or replace function public.lock_review_cafe()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.cafe_id := old.cafe_id;
  return new;
end;
$$;
drop trigger if exists cafe_reviews_lock on public.cafe_reviews;
create trigger cafe_reviews_lock before update on public.cafe_reviews
  for each row execute function public.lock_review_cafe();

alter table public.cafe_reviews enable row level security;
drop policy if exists "cafe_reviews: 누구나 읽기" on public.cafe_reviews;
create policy "cafe_reviews: 누구나 읽기" on public.cafe_reviews for select to anon, authenticated using (true);
drop policy if exists "cafe_reviews: 로그인 작성" on public.cafe_reviews;
create policy "cafe_reviews: 로그인 작성" on public.cafe_reviews for insert to authenticated with check ((select public.is_member()));
drop policy if exists "cafe_reviews: 본인 수정" on public.cafe_reviews;
create policy "cafe_reviews: 본인 수정" on public.cafe_reviews for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "cafe_reviews: 본인·운영진 삭제" on public.cafe_reviews;
create policy "cafe_reviews: 본인·운영진 삭제" on public.cafe_reviews for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- 기존 카페 기록을 첫 후기로 옮겨 담기 (작성자·작성 시각 그대로 — 트리거를 잠시 끄고 넣는다)
alter table public.cafe_reviews disable trigger cafe_reviews_stamp;
insert into public.cafe_reviews (cafe_id, user_id, author_name, author_avatar, rating, tags, signature, memo, visited_on, created_at, updated_at)
select c.id, c.user_id, c.author_name, c.author_avatar, c.rating, c.tags, c.signature, c.memo, c.visited_on, c.created_at, c.updated_at
from public.cafes c
where c.rating is not null
on conflict (cafe_id, user_id) do nothing;
alter table public.cafe_reviews enable trigger cafe_reviews_stamp;

-- ───────────────────────── 3. 가보고 싶어요 ─────────────────────────
create table if not exists public.cafe_wishes (
  cafe_id     uuid not null references public.cafes (id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author_name text not null,
  created_at  timestamptz not null default now(),
  primary key (cafe_id, user_id)
);

-- 찜한 사람 이름은 서버가 채운다
create or replace function public.stamp_wish()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare jwt jsonb := auth.jwt();
begin
  new.user_id := auth.uid();
  new.author_name := coalesce(
    (select m.name from public.members m where m.email = lower(jwt ->> 'email') and m.name <> ''),
    jwt -> 'user_metadata' ->> 'full_name',
    split_part(jwt ->> 'email', '@', 1)
  );
  new.created_at := now();
  return new;
end;
$$;
drop trigger if exists cafe_wishes_stamp on public.cafe_wishes;
create trigger cafe_wishes_stamp before insert on public.cafe_wishes
  for each row execute function public.stamp_wish();

alter table public.cafe_wishes enable row level security;
drop policy if exists "cafe_wishes: 누구나 읽기" on public.cafe_wishes;
create policy "cafe_wishes: 누구나 읽기" on public.cafe_wishes for select to anon, authenticated using (true);
drop policy if exists "cafe_wishes: 본인 추가" on public.cafe_wishes;
create policy "cafe_wishes: 본인 추가" on public.cafe_wishes for insert to authenticated with check ((select public.is_member()));
drop policy if exists "cafe_wishes: 본인 삭제" on public.cafe_wishes;
create policy "cafe_wishes: 본인 삭제" on public.cafe_wishes for delete to authenticated
  using (user_id = (select auth.uid()));

-- ───────────────────────── 4. 카페(장소) 삭제 규칙 ─────────────────────────
-- 다른 부원 후기가 달린 장소는 등록한 사람도 지울 수 없다(남의 후기까지 같이 지워지므로). 운영진은 가능.
drop policy if exists "cafes: 본인·운영진 삭제" on public.cafes;
create policy "cafes: 본인·운영진 삭제" on public.cafes for delete to authenticated
  using (
    (select public.is_admin())
    or (user_id = (select auth.uid())
        and not exists (select 1 from public.cafe_reviews r where r.cafe_id = cafes.id and r.user_id <> (select auth.uid())))
  );
