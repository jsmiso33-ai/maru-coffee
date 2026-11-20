import { supabase } from './supabase.js';

// 장소 검색 — 1순위 네이버 지역 검색(카페 이름으로 찾기, Supabase Edge Function 'naver-local' 경유),
// 결과가 없거나 아직 설정 전이면 OpenStreetMap Nominatim(주소 검색)으로.
// Nominatim (키 없이 무료).
// 이용 규칙: 초당 1회 이하, 자동완성 금지 → 검색 버튼을 눌렀을 때만, 지도 탭 후 주소 찾기도 한 번씩만 부른다.
const BASE = 'https://nominatim.openstreetmap.org';

// Nominatim 주소 조각을 한국식 순서(시·도 → 구 → 동 → 도로 → 번지)로
function koreanAddress(a = {}) {
  const parts = [
    a.province || a.state, a.city, a.county, a.borough, a.city_district, a.town, a.village,
    a.suburb, a.quarter, a.road, a.house_number,
  ].filter(Boolean).map((p) => String(p).replace(/[,\s]+$/, ''));
  return [...new Set(parts)].join(' ');
}

function toPlace(r) {
  return {
    name: r.name || r.display_name?.split(',')[0] || '',
    address: koreanAddress(r.address) || r.display_name || '',
    lat: Number(r.lat),
    lng: Number(r.lon),
  };
}

let last = 0;
async function politeFetch(url) {
  const wait = Math.max(0, last + 1100 - Date.now());
  if (wait) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error('주소 검색 서버가 응답하지 않아요. 잠시 뒤 다시 시도해 주세요.');
  return res.json();
}

async function searchNaver(q) {
  if (!supabase) return [];
  const { data, error } = await supabase.functions.invoke('naver-local', { body: { query: q } });
  if (error) throw error;
  return (data?.places ?? []).map((p) => ({ ...p, source: 'naver' }));
}

export async function searchPlaces(query) {
  const q = query.trim();
  if (!q) return [];
  try {
    const naver = await searchNaver(q);
    if (naver.length) return naver;
  } catch { /* 네이버 검색 미설정·장애 → 주소 검색으로 */ }
  return searchAddress(q);
}

async function searchAddress(query) {
  const q = query.trim();
  const url = `${BASE}/search?format=jsonv2&addressdetails=1&countrycodes=kr&accept-language=ko&limit=6&q=${encodeURIComponent(q)}`;
  return (await politeFetch(url)).map(toPlace);
}

export async function reverseGeocode(lat, lng) {
  const url = `${BASE}/reverse?format=jsonv2&addressdetails=1&accept-language=ko&zoom=18&lat=${lat}&lon=${lng}`;
  const r = await politeFetch(url);
  return r?.address ? koreanAddress(r.address) : '';
}
