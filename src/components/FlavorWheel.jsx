import { useState } from 'react';
import { FLAVOR_GROUPS } from '../data/flavors.js';
import { cx } from './ui.jsx';

// 마루 플레이버 휠 — 안쪽 링은 분류, 바깥 링은 향미. (SCA 휠 그림을 옮긴 게 아니라 마루 향미 목록으로 그린 자체 휠)
//
// 고르기(onToggle 있음): 바깥 조각을 누르면 향미 선택/해제, 안쪽 분류를 누르면 그 분류만 크게(확대) — 휴대폰에서 누르기 쉽게.
// 보기(counts 있음): 많이 고른 향미일수록 진하게. selected만 주면 고른 것만 칠한다.

const S = 400;
const C = S / 2;
const R_CENTER = 62; // 가운데 원
const R_INNER = 128; // 분류 링 바깥
const R_OUTER = 196; // 향미 링 바깥
const TOTAL = FLAVOR_GROUPS.reduce((n, g) => n + g.items.length, 0);

// 각도는 12시 방향 0°, 시계 방향
const pt = (r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
};

function sector(r0, r1, a0, a1) {
  // 360° 한 조각은 SVG 호로 그릴 수 없어 아주 조금 덜 그린다
  const end = a1 - a0 >= 360 ? a0 + 359.99 : a1;
  const large = end - a0 > 180 ? 1 : 0;
  const [x0, y0] = pt(r1, a0);
  const [x1, y1] = pt(r1, end);
  const [x2, y2] = pt(r0, end);
  const [x3, y3] = pt(r0, a0);
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

// 반지름 방향으로 읽히는 글자(바깥 링). 왼쪽 절반은 뒤집어 거꾸로 보이지 않게
function radialRotate(deg) {
  return deg <= 180 ? deg - 90 : deg + 90;
}
// 원 둘레 방향으로 읽히는 글자(안쪽 링). 아래쪽 절반은 뒤집기
function tangentRotate(deg) {
  return deg > 90 && deg < 270 ? deg + 180 : deg;
}

// 진하게 칠한 조각 위 글자색: 밝은 색(노랑 등)이면 진한 글자
function inkOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? 'var(--color-ink)' : '#fff';
}

const tint = (color, pct) => `color-mix(in srgb, ${color} ${pct}%, var(--color-surface))`;

export default function FlavorWheel({ selected = [], onToggle, counts, max = 12, className, size = 'md' }) {
  const [zoom, setZoom] = useState(null); // 확대한 분류 이름
  const interactive = Boolean(onToggle);
  const isOn = (f) => selected.includes(f);
  const maxCount = counts ? Math.max(1, ...counts.values()) : 1;
  const full = selected.length >= max;

  // 보기 모드에서 향미 하나의 칠하기 강도
  const fillFor = (group, f) => {
    if (counts) {
      const n = counts.get(f) || 0;
      return n ? tint(group.dot, 30 + Math.round((n / maxCount) * 70)) : tint(group.dot, 10);
    }
    return isOn(f) ? group.dot : tint(group.dot, interactive ? 18 : 10);
  };
  const textOn = (group, f) => (counts ? (counts.get(f) || 0) / maxCount > 0.55 : isOn(f));

  const press = (fn) => ({
    role: 'button',
    tabIndex: 0,
    onClick: fn,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } },
    className: 'cursor-pointer outline-none [&:focus-visible>path]:stroke-ink [&:focus-visible>path]:stroke-[3]',
  });

  // ── 확대 모드: 한 분류의 향미가 휠 전체를 채운다 ──
  if (zoom) {
    const g = FLAVOR_GROUPS.find((x) => x.name === zoom);
    const step = 360 / g.items.length;
    return (
      <figure className={cx('m-0', className)}>
        <svg viewBox={`0 0 ${S} ${S}`} className={cx('mx-auto block h-auto w-full', size === 'sm' ? 'max-w-[260px]' : 'max-w-[420px]')} role="group" aria-label={`${g.name} 향미 고르기`}>
          {g.items.map((f, i) => {
            const a0 = i * step;
            const mid = a0 + step / 2;
            const [tx, ty] = pt((R_CENTER + R_OUTER) / 2 + 8, mid);
            return (
              <g key={f} {...press(() => onToggle(f))} aria-pressed={isOn(f)} aria-label={f} aria-disabled={!isOn(f) && full}>
                <path d={sector(R_CENTER + 6, R_OUTER, a0, a0 + step)} fill={fillFor(g, f)} stroke="var(--color-surface)" strokeWidth={3} />
                <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize={f.length > 5 ? 17 : 20} fontWeight={700}
                  fill={isOn(f) ? inkOn(g.dot) : 'var(--color-ink)'} transform={`rotate(${tangentRotate(mid)} ${tx} ${ty})`} pointerEvents="none">
                  {f}
                </text>
              </g>
            );
          })}
          <g {...press(() => setZoom(null))} aria-label="전체 휠로 돌아가기">
            <circle cx={C} cy={C} r={R_CENTER} fill="var(--color-surface)" stroke={g.dot} strokeWidth={3} />
            <text x={C} y={C - 8} textAnchor="middle" fontSize={20} fontWeight={700} fill="var(--color-ink)">{g.short ?? g.name}</text>
            <text x={C} y={C + 18} textAnchor="middle" fontSize={13} fill="var(--color-muted)">← 전체</text>
          </g>
        </svg>
        {interactive && <figcaption className="mt-2 text-center text-xs text-muted">향미를 눌러 고르고, 가운데를 누르면 전체 휠로 돌아가요</figcaption>}
      </figure>
    );
  }

  // ── 전체 휠 ──
  let cursor = 0;
  const groups = FLAVOR_GROUPS.map((g) => {
    const a0 = (cursor / TOTAL) * 360;
    cursor += g.items.length;
    return { g, a0, a1: (cursor / TOTAL) * 360, start: cursor - g.items.length };
  });
  const step = 360 / TOTAL;
  const picked = counts ? [...counts.values()].reduce((a, b) => a + b, 0) : selected.length;

  return (
    <figure className={cx('m-0', className)}>
      <svg viewBox={`0 0 ${S} ${S}`} className={cx('mx-auto block h-auto w-full', size === 'sm' ? 'max-w-[260px]' : 'max-w-[420px]')} role={interactive ? 'group' : 'img'}
        aria-label={interactive ? '플레이버 휠에서 향미 고르기' : `플레이버 휠: ${counts ? [...counts.keys()].join(', ') : selected.join(', ')}`}>
        {groups.map(({ g, a0, a1, start }) => {
          const mid = (a0 + a1) / 2;
          const [cx2, cy2] = pt((R_CENTER + R_INNER) / 2, mid);
          const has = g.items.some((f) => (counts ? counts.get(f) : isOn(f)));
          const catBody = (
            <>
              <path d={sector(R_CENTER, R_INNER, a0, a1)} fill={tint(g.dot, has ? 70 : 45)} stroke="var(--color-surface)" strokeWidth={2} />
              <text x={cx2} y={cy2} textAnchor="middle" dominantBaseline="middle" fontSize={14} fontWeight={700} fill="var(--color-ink)"
                transform={`rotate(${tangentRotate(mid)} ${cx2} ${cy2})`} pointerEvents="none">
                {g.short ?? g.name}
              </text>
            </>
          );
          return (
            <g key={g.name}>
              {interactive ? <g {...press(() => setZoom(g.name))} aria-label={`${g.name} 크게 보기`}>{catBody}</g> : catBody}
              {g.items.map((f, i) => {
                const b0 = (start + i) * step;
                const m = b0 + step / 2;
                const [tx, ty] = pt((R_INNER + R_OUTER) / 2, m);
                const body = (
                  <>
                    <path d={sector(R_INNER, R_OUTER, b0, b0 + step)} fill={fillFor(g, f)} stroke="var(--color-surface)" strokeWidth={1.5} />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fontSize={f.length > 5 ? 9 : 10.5} fontWeight={600}
                      fill={textOn(g, f) ? inkOn(g.dot) : 'var(--color-ink-soft)'} transform={`rotate(${radialRotate(m)} ${tx} ${ty})`} pointerEvents="none">
                      {f}
                    </text>
                  </>
                );
                return interactive ? (
                  <g key={f} {...press(() => onToggle(f))} aria-pressed={isOn(f)} aria-label={f} aria-disabled={!isOn(f) && full}>{body}</g>
                ) : (
                  <g key={f}>{body}</g>
                );
              })}
            </g>
          );
        })}
        <circle cx={C} cy={C} r={R_CENTER - 2} fill="var(--color-surface)" />
        <text x={C} y={C - 4} textAnchor="middle" fontSize={30} fontFamily="var(--font-display)" fill="var(--color-ink)">
          {interactive ? `${selected.length}` : picked}
        </text>
        <text x={C} y={C + 20} textAnchor="middle" fontSize={12} fill="var(--color-muted)">
          {interactive ? `/ ${max} 고름` : counts ? '번 기록' : '가지 향미'}
        </text>
      </svg>
      {interactive && <figcaption className="mt-2 text-center text-xs text-muted">바깥 조각을 누르거나, 안쪽 분류를 눌러 크게 보고 골라요</figcaption>}
    </figure>
  );
}
