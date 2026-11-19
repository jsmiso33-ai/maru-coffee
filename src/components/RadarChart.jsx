import { ATTRIBUTES } from '../data/options.js';

// 5개 감각 항목(1~5)을 오각형으로. compact는 카드용 작은 크기(라벨 없음).
export default function RadarChart({ note, size = 240, compact = false }) {
  const pad = compact ? 4 : 44;
  const r = size / 2 - pad;
  const c = size / 2;
  const n = ATTRIBUTES.length;
  const point = (i, v) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [c + Math.cos(a) * r * (v / 5), c + Math.sin(a) * r * (v / 5)];
  };
  const ring = (v) => ATTRIBUTES.map((_, i) => point(i, v).join(',')).join(' ');
  const shape = ATTRIBUTES.map((a, i) => point(i, note[a.key] || 0).join(',')).join(' ');
  const summary = ATTRIBUTES.map((a) => `${a.label} ${note[a.key]}`).join(', ');

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`맛 프로필: ${summary}`} className="max-w-full h-auto">
      {[1, 2, 3, 4, 5].map((v) => (
        <polygon key={v} points={ring(v)} fill={v === 5 ? 'var(--color-paper)' : 'none'} stroke="var(--color-line)" strokeWidth={v === 5 ? 1.2 : 0.8} />
      ))}
      {ATTRIBUTES.map((_, i) => {
        const [x, y] = point(i, 5);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="var(--color-line)" strokeWidth={0.8} />;
      })}
      <polygon points={shape} fill="var(--color-accent)" fillOpacity={0.16} stroke="var(--color-accent)" strokeWidth={compact ? 1.4 : 2} strokeLinejoin="round" />
      {!compact &&
        ATTRIBUTES.map((a, i) => {
          const [x, y] = point(i, note[a.key] || 0);
          const [lx, ly] = point(i, 6.3);
          return (
            <g key={a.key}>
              <circle cx={x} cy={y} r={3.5} fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth={2} />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" fontSize={12.5} fontWeight={600} fill="var(--color-ink-soft)">
                {a.label}
                <tspan fill="var(--color-muted)" fontWeight={500}> {note[a.key]}</tspan>
              </text>
            </g>
          );
        })}
    </svg>
  );
}
