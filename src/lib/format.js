export function mmss(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// "1:30" · "90" · "1분 30초" → 90. 해석 불가면 null
export function parseTime(text) {
  const t = String(text).trim();
  if (!t) return null;
  const colon = t.match(/^(\d+):(\d{1,2})$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);
  const ko = t.match(/^(?:(\d+)\s*분)?\s*(?:(\d+)\s*초)?$/);
  if (ko && (ko[1] || ko[2])) return Number(ko[1] || 0) * 60 + Number(ko[2] || 0);
  if (/^\d+$/.test(t)) return Number(t);
  return null;
}

export function formatDuration(totalSeconds) {
  if (totalSeconds == null) return '—';
  if (totalSeconds >= 3600) {
    const h = totalSeconds / 3600;
    return `${Number.isInteger(h) ? h : h.toFixed(1)}시간`;
  }
  return mmss(totalSeconds);
}

export function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}

export function ratioOf(dose, water) {
  if (!dose || !water) return null;
  return round1(water / dose);
}

// ───── 날짜 (활동은 'YYYY-MM-DD' 문자열, 로컬 날짜 기준) ─────
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayKey() {
  return toDateKey(new Date());
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// "11월 27일 (목)"
export function formatDay(key, { year = false } = {}) {
  const d = parseDateKey(key);
  return `${year ? `${d.getFullYear()}년 ` : ''}${d.getMonth() + 1}월 ${d.getDate()}일 (${WEEKDAYS[d.getDay()]})`;
}

// "19:00" → "오후 7시", "13:30" → "오후 1시 30분"
export function formatClock(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}시${m ? ` ${m}분` : ''}`;
}

// 오늘 기준 며칠 남았는지: 0 = 오늘, 음수 = 지난 날
export function daysUntil(key) {
  const ms = parseDateKey(key) - parseDateKey(todayKey());
  return Math.round(ms / 86400000);
}

export function dDayLabel(key) {
  const n = daysUntil(key);
  if (n === 0) return '오늘';
  if (n === 1) return '내일';
  return n > 0 ? `D-${n}` : `${-n}일 전`;
}
