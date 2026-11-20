import { useEffect, useMemo, useState } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import { COFFEE_ORIGINS, originById } from '../data/origins.js';
import { cx } from './ui.jsx';

const W = 960;
const H = 400;
const TROPIC = 23.44;
const COFFEE_IDS = new Set(COFFEE_ORIGINS.map((o) => o.id));

// 지도 데이터(약 100KB)는 지도가 처음 보일 때 한 번만 받는다
let atlasPromise = null;
function loadCountries() {
  atlasPromise ??= import('world-atlas/countries-110m.json').then((m) => {
    const topo = m.default ?? m;
    return feature(topo, topo.objects.countries).features;
  });
  return atlasPromise;
}

// 커피 벨트 주변(멕시코~파푸아뉴기니, 남위 35°~북위 40°)만 잘라 크게 보여 준다
const projection = geoNaturalEarth1().fitSize([W, H], {
  type: 'MultiPoint',
  coordinates: [[-118, -35], [158, -35], [-118, 40], [158, 40]],
});
const path = geoPath(projection);

/**
 * counts     : Map(국가 id → 노트 수) — 있으면 진하기로 표시하고 점 크기로 강조
 * selectedId : 고른 나라 (진한 크림슨 + 핀)
 * onSelect   : 주면 산지 나라를 누를 수 있다 (노트 작성·필터)
 */
export default function WorldMap({ counts, selectedId, onSelect, className, caption }) {
  const [countries, setCountries] = useState(null);
  const [failed, setFailed] = useState(false);
  const [hoverId, setHoverId] = useState(null);

  useEffect(() => {
    let alive = true;
    loadCountries().then((f) => alive && setCountries(f)).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, []);

  const shapes = useMemo(() => {
    if (!countries) return null;
    return countries.map((f) => ({
      id: f.id,
      d: path(f),
      coffee: COFFEE_IDS.has(f.id),
      centroid: COFFEE_IDS.has(f.id) ? path.centroid(f) : null,
    }));
  }, [countries]);

  const max = counts ? Math.max(1, ...counts.values()) : 1;
  const interactive = Boolean(onSelect);
  const activeId = hoverId ?? selectedId;
  const active = activeId ? originById(activeId) : null;
  const yN = projection([0, TROPIC])[1];
  const yS = projection([0, -TROPIC])[1];

  const fillOf = (s) => {
    if (!s.coffee) return 'var(--color-sunken)';
    if (s.id === selectedId) return 'var(--color-accent)';
    const n = counts?.get(s.id) || 0;
    if (n > 0) return `color-mix(in srgb, var(--color-accent) ${Math.round(30 + (n / max) * 55)}%, var(--color-surface))`;
    return 'color-mix(in srgb, var(--color-crema) 38%, var(--color-surface))';
  };

  const select = (id) => {
    const o = originById(id);
    if (o) onSelect?.(o);
  };

  return (
    <figure className={cx('m-0', className)}>
      <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-line bg-surface" style={{ aspectRatio: `${W} / ${H}` }}>
        {failed ? (
          <p className="grid h-full place-items-center text-sm text-muted">지도를 불러오지 못했어요</p>
        ) : !shapes ? (
          <div className="h-full animate-pulse bg-sunken/50" aria-hidden />
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-full w-full" role="img" aria-label={caption || '커피 산지 지도'}>
            {/* 커피 벨트: 남·북회귀선 사이 */}
            <rect x={0} y={yN} width={W} height={yS - yN} fill="var(--color-crema)" opacity={0.08} />
            {[yN, yS].map((y) => (
              <line key={y} x1={0} x2={W} y1={y} y2={y} stroke="var(--color-crema)" strokeWidth={1} strokeDasharray="4 6" opacity={0.7} />
            ))}
            <text x={12} y={yN - 7} fontSize={13} fill="var(--color-muted)" fontWeight={600} letterSpacing="0.08em">COFFEE BELT</text>

            {shapes.filter((s) => !s.coffee).map((s) => (
              <path key={s.id ?? s.d.slice(0, 20)} d={s.d} fill={fillOf(s)} stroke="var(--color-surface)" strokeWidth={0.6} />
            ))}
            {shapes.filter((s) => s.coffee).map((s) => {
              const o = originById(s.id);
              const n = counts?.get(s.id) || 0;
              return (
                <path
                  key={s.id}
                  d={s.d}
                  fill={fillOf(s)}
                  stroke={s.id === activeId ? 'var(--color-ink)' : 'var(--color-surface)'}
                  strokeWidth={s.id === activeId ? 1.6 : 0.8}
                  className={cx('transition-[fill] duration-150', interactive && 'cursor-pointer outline-none')}
                  onPointerEnter={() => setHoverId(s.id)}
                  onPointerLeave={() => setHoverId(null)}
                  {...(interactive && {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `${o.name}${counts ? `, 노트 ${n}개` : ''}`,
                    'aria-pressed': s.id === selectedId,
                    onClick: () => select(s.id),
                    onFocus: () => setHoverId(s.id),
                    onBlur: () => setHoverId(null),
                    onKeyDown: (e) => {
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(s.id); }
                    },
                  })}
                />
              );
            })}

            {/* 노트가 있는 나라는 점으로 한 번 더 — 르완다·엘살바도르처럼 작은 나라도 보이게 */}
            {counts && shapes.filter((s) => s.coffee && counts.get(s.id) && s.id !== selectedId).map((s) => (
              <circle
                key={`dot-${s.id}`}
                cx={s.centroid[0]}
                cy={s.centroid[1]}
                r={3 + Math.sqrt(counts.get(s.id) / max) * 7}
                fill="var(--color-accent)"
                stroke="var(--color-surface)"
                strokeWidth={1.5}
                pointerEvents="none"
              />
            ))}

            {/* 고른 나라에 핀 */}
            {selectedId && shapes.find((s) => s.id === selectedId) && (() => {
              const [x, y] = shapes.find((s) => s.id === selectedId).centroid;
              return (
                <g transform={`translate(${x} ${y})`} pointerEvents="none">
                  <path d="M0 0 C-9 -12 -12 -17 -12 -23 A12 12 0 1 1 12 -23 C12 -17 9 -12 0 0Z" fill="var(--color-ink)" stroke="var(--color-surface)" strokeWidth={2} />
                  <circle cy={-23} r={4.5} fill="var(--color-surface)" />
                </g>
              );
            })()}
          </svg>
        )}

        {active && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-paper shadow-sm" aria-hidden>
            {active.name}
            {counts && <span className="ml-1.5 font-normal text-paper/70 tnum">노트 {counts.get(active.id) || 0}</span>}
          </span>
        )}
      </div>
      {caption && <figcaption className="mt-2 text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}
