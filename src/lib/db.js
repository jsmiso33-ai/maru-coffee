import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { SAMPLE_NOTES } from '../data/sampleNotes.js';

// 작성자·작성일 컬럼은 DB 트리거가 채우므로 클라이언트는 아래 필드만 보낸다.
const NOTE_FIELDS = [
  'bean_name', 'roaster', 'origin', 'process', 'roast_level', 'brew_method', 'tasted_on',
  'flavors', 'acidity', 'sweetness', 'body', 'bitterness', 'aftertaste', 'rating', 'memo',
  'activity_id', 'activity_bean_id',
];
const RECIPE_FIELDS = [
  'title', 'method', 'dose_g', 'water_g', 'water_temp', 'grind', 'total_time_s', 'steps', 'bean_hint', 'memo',
];

function pick(obj, keys) {
  return Object.fromEntries(keys.map((k) => [k, obj[k] === '' ? null : obj[k] ?? null]));
}

function unwrap({ data, error }) {
  if (error) throw new Error(friendlyError(error));
  return data;
}

function friendlyError(error) {
  const msg = error?.message ?? String(error);
  if (/row-level security|violates row-level/i.test(msg)) return '권한이 없어요. 부원 명단에 등록된 계정인지 확인해 주세요.';
  if (/JWT|session/i.test(msg)) return '로그인이 만료됐어요. 다시 로그인해 주세요.';
  if (/Failed to fetch|NetworkError/i.test(msg)) return '네트워크 연결을 확인해 주세요.';
  return msg;
}

// ───── 테이스팅 노트 ─────
// 목록 카드에 댓글 수를 보여 주려고 함께 센다 → note.comments = [{ count }]
const COMMENT_COUNT = 'comments:note_comments(count)';

export function commentCount(note) {
  return note?.comments?.[0]?.count ?? 0;
}
export async function listNotes() {
  if (!supabase) return SAMPLE_NOTES;
  return unwrap(await supabase.from('tasting_notes').select(`*, ${COMMENT_COUNT}`).order('created_at', { ascending: false }).limit(500));
}

export async function getNote(id) {
  if (!supabase) return SAMPLE_NOTES.find((n) => n.id === id) ?? null;
  return unwrap(await supabase.from('tasting_notes').select('*').eq('id', id).maybeSingle());
}

export async function saveNote(note, id) {
  const row = pick(note, NOTE_FIELDS);
  const q = id
    ? supabase.from('tasting_notes').update(row).eq('id', id)
    : supabase.from('tasting_notes').insert(row);
  return unwrap(await q.select().single());
}

export async function deleteNote(id) {
  unwrap(await supabase.from('tasting_notes').delete().eq('id', id));
}

export async function listNotesForActivity(activityId) {
  if (!supabase) return [];
  return unwrap(await supabase.from('tasting_notes').select(`*, ${COMMENT_COUNT}`).eq('activity_id', activityId).order('created_at', { ascending: true }));
}

// ───── 활동 (일자별 모임) ─────
const ACTIVITY_FIELDS = ['title', 'kind', 'held_on', 'start_time', 'place', 'description', 'prep'];
const BEAN_FIELDS = ['name', 'roaster', 'origin', 'process', 'roast_level'];
const ACTIVITY_SELECT = '*, beans:activity_beans(*)';

function sortBeans(a) {
  if (a?.beans) a.beans.sort((x, y) => x.sort - y.sort);
  return a;
}

export async function listActivities() {
  if (!supabase) return [];
  const rows = unwrap(await supabase.from('activities').select(ACTIVITY_SELECT).order('held_on', { ascending: false }).limit(500));
  return rows.map(sortBeans);
}

export async function getActivity(id) {
  if (!supabase) return null;
  return sortBeans(unwrap(await supabase.from('activities').select(ACTIVITY_SELECT).eq('id', id).maybeSingle()));
}

// 활동 본문 저장 후 원두 목록을 맞춘다: 남은 원두는 수정, 빠진 원두는 삭제, 새 원두는 추가.
// 원두 id를 유지해야 거기에 연결된 노트가 끊기지 않는다.
export async function saveActivity(activity, beans, id) {
  const row = pick(activity, ACTIVITY_FIELDS);
  const saved = unwrap(await (id
    ? supabase.from('activities').update(row).eq('id', id)
    : supabase.from('activities').insert(row)
  ).select().single());

  const keep = beans.filter((b) => b.id).map((b) => b.id);
  if (id) {
    let del = supabase.from('activity_beans').delete().eq('activity_id', saved.id);
    if (keep.length) del = del.not('id', 'in', `(${keep.join(',')})`);
    unwrap(await del);
  }
  for (const [i, b] of beans.entries()) {
    const data = { ...pick(b, BEAN_FIELDS), sort: i, activity_id: saved.id };
    unwrap(await (b.id
      ? supabase.from('activity_beans').update(data).eq('id', b.id)
      : supabase.from('activity_beans').insert(data)));
  }
  return saved;
}

export async function deleteActivity(id) {
  unwrap(await supabase.from('activities').delete().eq('id', id));
}

// ───── 노트 댓글 ─────
export async function listComments(noteId) {
  if (!supabase) return [];
  return unwrap(await supabase.from('note_comments').select('*').eq('note_id', noteId).order('created_at', { ascending: true }));
}

export async function addComment(noteId, body) {
  return unwrap(await supabase.from('note_comments').insert({ note_id: noteId, body: body.trim() }).select().single());
}

export async function updateComment(id, body) {
  return unwrap(await supabase.from('note_comments').update({ body: body.trim() }).eq('id', id).select().single());
}

export async function deleteComment(id) {
  unwrap(await supabase.from('note_comments').delete().eq('id', id));
}

// ───── 부원 레시피 ─────
export async function listRecipes() {
  if (!supabase) return [];
  return unwrap(await supabase.from('recipes').select('*').order('created_at', { ascending: false }).limit(300));
}

export async function getRecipe(id) {
  if (!supabase) return null;
  return unwrap(await supabase.from('recipes').select('*').eq('id', id).maybeSingle());
}

export async function saveRecipe(recipe, id) {
  const row = pick(recipe, RECIPE_FIELDS);
  const q = id ? supabase.from('recipes').update(row).eq('id', id) : supabase.from('recipes').insert(row);
  return unwrap(await q.select().single());
}

export async function deleteRecipe(id) {
  unwrap(await supabase.from('recipes').delete().eq('id', id));
}

// ───── 부원 명단 (관리자) ─────
export async function listMembers() {
  return unwrap(await supabase.from('members').select('*').order('created_at', { ascending: true }));
}

export async function upsertMember({ email, name, role }) {
  const row = { email: email.trim().toLowerCase(), name: name?.trim() || null, role };
  return unwrap(await supabase.from('members').upsert(row).select().single());
}

export async function removeMember(email) {
  unwrap(await supabase.from('members').delete().eq('email', email));
}

// 간단한 비동기 로딩 훅: { data, error, loading, reload }
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    run()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((e) => alive && setState({ data: null, error: friendlyError(e), loading: false }));
    return () => { alive = false; };
  }, [run, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}
