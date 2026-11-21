import { X } from 'lucide-react';
import { ROAST_LEVELS } from '../data/options.js';
import { cx } from './ui.jsx';

// 로스팅 정도: 0(라이트) ~ 100(다크) 연속값. 글자 단계(ROAST_LEVELS 5개)는 20씩 나눠 붙인다.
const STOPS = ['#d8b892', '#b9875a', '#8c5a34', '#5e3b22', '#2f1e15']; // 생두에 가까운 색 → 진한 원두색

export function roastLabel(value) {
  if (value == null || value === '') return '';
  return ROAST_LEVELS[Math.min(4, Math.floor(Number(value) / 20))];
}

// 글자 단계만 있는 옛 기록 → 그 단계의 가운데 값
export function roastValueOf(label) {
  const i = ROAST_LEVELS.indexOf(label);
  return i < 0 ? null : i * 20 + 10;
}

export function roastColor(value) {
  const t = Math.max(0, Math.min(1, Number(value) / 100)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t));
  const f = t - i;
  const mix = (a, b) => Math.round(a + (b - a) * f);
  const [a, b] = [STOPS[i], STOPS[i + 1]].map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)));
  return `rgb(${mix(a[0], b[0])} ${mix(a[1], b[1])} ${mix(a[2], b[2])})`;
}

const GRADIENT = `linear-gradient(90deg, ${STOPS.join(', ')})`;

// 노트 작성용 슬라이더 (값 없음 = 선택 안 함)
export default function RoastSlider({ id = 'roast', value, onChange }) {
  const empty = value == null || value === '';
  const v = empty ? 50 : Number(value);
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-semibold">로스팅</label>
        {!empty && (
          <button type="button" onClick={() => onChange(null)} className="inline-flex h-8 items-center gap-1 rounded-full border border-line px-2.5 text-xs text-muted hover:text-ink">
            <X size={12} /> 지우기
          </button>
        )}
      </div>
      <p className={cx('mt-1 flex items-center gap-2 text-lg font-bold', empty && 'font-semibold text-muted')}>
        {!empty && <span aria-hidden className="size-3.5 rounded-full ring-1 ring-black/10" style={{ background: roastColor(v) }} />}
        {empty ? '밀어서 고르기' : roastLabel(v)}
      </p>
      <div className="relative mt-1 flex h-11 items-center">
        <div aria-hidden className="absolute inset-x-0 h-2.5 rounded-full" style={{ background: GRADIENT, opacity: empty ? 0.45 : 1 }} />
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={v}
          data-empty={empty}
          onChange={(e) => onChange(Number(e.target.value))}
          // 아직 안 고른 상태에서 가운데를 그냥 눌러도 '미디엄'으로 선택되게
          onClick={(e) => empty && onChange(Number(e.currentTarget.value))}
          aria-valuetext={empty ? '선택 안 함' : roastLabel(v)}
          className="roast-range relative w-full"
          style={{ '--roast-thumb': empty ? 'var(--color-surface)' : roastColor(v) }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted" aria-hidden>
        <span>라이트</span><span>미디엄</span><span>다크</span>
      </div>
    </div>
  );
}

// 보기용: 그라데이션 막대 위 점 하나
export function RoastMeter({ value, className }) {
  if (value == null || value === '') return null;
  return (
    <span className={cx('relative block h-2 w-full rounded-full', className)} style={{ background: GRADIENT }} aria-hidden>
      <span
        className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface shadow"
        style={{ left: `${value}%`, background: roastColor(value) }}
      />
    </span>
  );
}
