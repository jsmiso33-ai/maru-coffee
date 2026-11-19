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
