import { Link } from 'react-router';
import { Star, LoaderCircle } from 'lucide-react';
import { flavorDot } from '../data/flavors.js';

const cx = (...c) => c.filter(Boolean).join(' ');

const BUTTON = {
  primary: 'bg-ink text-paper hover:bg-ink-soft',
  accent: 'bg-accent text-white hover:bg-accent-strong',
  ghost: 'text-ink-soft hover:bg-sunken',
  outline: 'border border-line-strong text-ink hover:bg-sunken',
  danger: 'text-accent hover:bg-accent-soft',
};

export function Button({ variant = 'primary', size = 'md', to, href, className, children, ...rest }) {
  const cls = cx(
    'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors active:translate-y-px disabled:opacity-50 disabled:pointer-events-none select-none',
    size === 'sm' ? 'h-11 px-4 text-sm sm:h-9 sm:px-3.5' : size === 'lg' ? 'h-13 px-6 text-base' : 'h-11 px-5 text-[0.95rem]',
    BUTTON[variant],
    className,
  );
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>;
  // 외부 링크(카카오맵 등)는 새 탭으로
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls} {...rest}>{children}</a>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

export function Card({ as: Tag = 'div', className, children, ...rest }) {
  return (
    <Tag className={cx('rounded-[var(--radius-card)] border border-line bg-surface shadow-[var(--shadow-card)]', className)} {...rest}>
      {children}
    </Tag>
  );
}

export function FlavorChip({ name, selected, onClick, size = 'md' }) {
  const base = cx(
    'inline-flex items-center gap-1.5 rounded-full border transition-colors',
    size === 'sm' ? 'px-2 py-0.5 text-xs' : 'min-h-11 px-3.5 py-1.5 text-sm sm:min-h-9',
  );
  const dot = <span aria-hidden className="size-1.5 rounded-full shrink-0" style={{ background: flavorDot(name) }} />;
  if (!onClick) {
    return <span className={cx(base, 'border-line bg-paper text-ink-soft')}>{dot}{name}</span>;
  }
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(base, selected ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong')}
    >
      {dot}{name}
    </button>
  );
}

export function Avatar({ name, src, size = 28 }) {
  const initial = (name || '?').trim().slice(0, 1);
  return src ? (
    <img src={src} alt="" width={size} height={size} referrerPolicy="no-referrer" className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="inline-grid place-items-center rounded-full bg-sunken text-ink-soft font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  );
}

export function Stars({ value, size = 16 }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star size={size} className="absolute inset-0 text-outline" strokeWidth={1.6} />
            {fill > 0 && (
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star size={size} className="text-accent fill-accent" strokeWidth={1.6} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

// 반 별 단위 입력: 별의 왼쪽 절반을 누르면 .5
export function StarInput({ value, onChange }) {
  const set = (v) => onChange(Math.max(0.5, Math.min(5, v)));
  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="별점"
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuenow={value}
      aria-valuetext={`${value}점`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); set(value + 0.5); }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); set(value - 0.5); }
      }}
      className="inline-flex items-center gap-3 rounded-lg"
    >
      <span className="inline-flex">
        {[1, 2, 3, 4, 5].map((i) => {
          const fill = Math.max(0, Math.min(1, value - (i - 1)));
          return (
            <span key={i} className="relative inline-block size-10">
              <Star size={36} className="absolute inset-0.5 text-outline" strokeWidth={1.4} />
              {fill > 0 && (
                <span className="absolute inset-0.5 overflow-hidden" style={{ width: `${fill * 36}px` }}>
                  <Star size={36} className="text-accent fill-accent" strokeWidth={1.4} />
                </span>
              )}
              <button type="button" tabIndex={-1} aria-hidden className="absolute inset-y-0 left-0 w-1/2" onClick={() => set(i - 0.5)} />
              <button type="button" tabIndex={-1} aria-hidden className="absolute inset-y-0 right-0 w-1/2" onClick={() => set(i)} />
            </span>
          );
        })}
      </span>
      <span className="font-display text-2xl tnum w-10">{value.toFixed(1)}</span>
    </div>
  );
}

// 1~5 단계 선택 (산미·단맛 등)
export function ScaleInput({ label, low, high, value, onChange }) {
  return (
    <fieldset>
      <legend className="flex w-full items-baseline justify-between text-sm">
        <span className="font-semibold text-ink">{label}</span>
        <span className="text-xs text-muted">{low} → {high}</span>
      </legend>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`${label} ${n}단계`}
            onClick={() => onChange(n)}
            className={cx(
              'h-11 rounded-xl border text-sm font-semibold tnum transition-colors duration-150',
              value === n ? 'border-ink bg-ink text-paper' : n <= value ? 'border-line-strong bg-sunken text-ink' : 'border-line bg-surface text-muted hover:border-line-strong',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function Label({ htmlFor, children, hint }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-sm font-semibold text-ink">
      {children}
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Spinner({ label = '불러오는 중' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
      <LoaderCircle className="animate-spin" size={18} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Notice({ tone = 'neutral', icon: Icon, children, action }) {
  const tones = {
    neutral: 'border-line bg-sunken/60 text-ink-soft',
    accent: 'border-accent/25 bg-accent-soft text-accent-strong',
  };
  return (
    <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border px-4 py-3 text-sm', tones[tone])}>
      {Icon && <Icon size={18} className="shrink-0" />}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  );
}

// 페이지 제목: 크림슨 영문 제목(크게) + 한국어 설명 한 줄 + 오른쪽 버튼.
// 한국어 제목은 화면에서는 숨기고 스크린리더·검색용으로만 남긴다.
export function PageHeader({ eyebrow, title, children, action }) {
  return (
    <header className="page-heading">
      <div className="min-w-0">
        {eyebrow ? (
          <h1 className="page-title-en">
            <span className="sr-only">{title}</span>
            <span aria-hidden>{eyebrow}</span>
          </h1>
        ) : (
          <h1 className="text-[clamp(1.7rem,3vw,2.3rem)] font-bold leading-tight tracking-[-0.05em]">{title}</h1>
        )}
        {children && <p className="mt-1.5 max-w-xl text-[0.95rem] leading-relaxed text-muted">{children}</p>}
      </div>
      {/* 모바일에서는 오른쪽 아래 떠 있는 버튼(엄지 닿는 곳)으로 — index.css .page-action */}
      {action && <div className="page-action">{action}</div>}
    </header>
  );
}

export function Segmented({ options, value, onChange, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-sunken/70 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'h-10 rounded-full px-4 text-sm font-semibold transition-colors',
            value === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const CHEVRON = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="#6f6258" stroke-width="2"><path d="m2 4 4 4 4-4"/></svg>')}")`;

// 둥근 드롭다운 필터. options: 문자열 또는 { value, label }. 첫 줄(빈 값)은 placeholder
export function PillSelect({ label, placeholder = label, value, onChange, options, className }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'h-11 cursor-pointer appearance-none rounded-full border bg-surface pl-4 pr-9 text-sm font-semibold sm:h-10',
        'bg-[position:right_0.85rem_center] bg-no-repeat',
        value ? 'border-ink text-ink' : 'border-line text-ink-soft',
        className,
      )}
      style={{ backgroundImage: CHEVRON }}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        return <option key={opt.value} value={opt.value}>{opt.label}</option>;
      })}
    </select>
  );
}

export { cx };
