import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase.js';
import { SAMPLE_NOTES } from '../data/sampleNotes.js';

// 작성자·작성일 컬럼은 DB 트리거가 채우므로 클라이언트는 아래 필드만 보낸다.
const NOTE_FIELDS = [
  'bean_name', 'roaster', 'origin', 'process', 'roast_level', 'brew_method', 'tasted_on',
  'flavors', 'acidity', 'sweetness', 'body', 'bitterness', 'aftertaste', 'rating', 'memo',
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
export async function listNotes() {
  if (!supabase) return SAMPLE_NOTES;
  return unwrap(await supabase.from('tasting_notes').select('*').order('created_at', { ascending: false }).limit(500));
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
