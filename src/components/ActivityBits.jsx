import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, Clock, MapPin, Coffee } from 'lucide-react';
import { cx } from './ui.jsx';
import { dDayLabel, daysUntil, formatClock, parseDateKey, toDateKey, todayKey } from '../lib/format.js';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

export function KindBadge({ kind }) {
  return <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{kind}</span>;
}

export function DDay({ date }) {
  const n = daysUntil(date);
  return (
    <span
      className={cx(
        'rounded-full px-2.5 py-0.5 text-xs font-bold tnum',
        n === 0 ? 'bg-accent text-white' : n > 0 ? 'bg-accent-soft text-accent-strong' : 'bg-sunken text-muted',
      )}
    >
      {dDayLabel(date)}
    </span>
  );
}

// 월간 달력. 활동이 있는 날에는 점, 고른 날은 진하게.
export function MonthCalendar({ month, onMonth, countsByDate, selected, onSelect }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
  // 마지막 줄이 전부 다음 달이면 잘라 낸다
  const weeks = days[35].getMonth() !== month.getMonth() ? 5 : 6;
  const today = todayKey();
  const shift = (n) => onMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button type="button" onClick={() => shift(-1)} aria-label="이전 달" className="grid size-11 place-items-center rounded-full hover:bg-sunken">
          <ChevronLeft size={18} />
        </button>
        <h2 className="font-display text-xl font-medium tnum" aria-live="polite">
          {month.getFullYear()}. {String(month.getMonth() + 1).padStart(2, '0')}
        </h2>
        <button type="button" onClick={() => shift(1)} aria-label="다음 달" className="grid size-11 place-items-center rounded-full hover:bg-sunken">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted" aria-hidden>
        {WEEK.map((w, i) => (
          <span key={w} className={cx('pb-2', i === 0 && 'text-accent')}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1" role="grid" aria-label="활동 달력">
        {days.slice(0, weeks * 7).map((d) => {
          const key = toDateKey(d);
          const inMonth = d.getMonth() === month.getMonth();
          const count = countsByDate.get(key) || 0;
          const isSel = selected === key;
          const isToday = key === today;
          return (
            <button
              key={key}
              type="button"
              role="gridcell"
              aria-selected={isSel}
              aria-label={`${d.getMonth() + 1}월 ${d.getDate()}일${count ? `, 활동 ${count}개` : ''}${isToday ? ', 오늘' : ''}`}
              onClick={() => onSelect(isSel ? null : key)}
              className={cx(
                'relative mx-auto flex h-12 w-full max-w-12 flex-col items-center justify-center rounded-xl text-sm tnum transition-colors',
                isSel ? 'bg-ink text-paper' : count ? 'font-semibold text-ink hover:bg-sunken' : 'hover:bg-sunken',
                !inMonth && !isSel && 'text-muted/50',
                isToday && !isSel && 'ring-1 ring-inset ring-accent',
              )}
            >
              {d.getDate()}
              {count > 0 && (
                <span className="absolute bottom-1.5 flex gap-0.5" aria-hidden>
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <span key={i} className={cx('size-1.5 rounded-full', isSel ? 'bg-crema' : 'bg-accent')} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// 목록 한 줄: 왼쪽 날짜 블록 + 제목·시간·장소
export function ActivityRow({ activity }) {
  const d = parseDateKey(activity.held_on);
  const past = daysUntil(activity.held_on) < 0;
  return (
    <Link
      to={`/activities/${activity.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong"
    >
      <div className={cx('grid w-14 shrink-0 place-items-center rounded-xl py-2 text-center', past ? 'bg-sunken text-ink-soft' : 'bg-ink text-paper')}>
        <span className="text-[0.7rem] font-semibold opacity-75">{d.getMonth() + 1}월 · {WEEK[d.getDay()]}</span>
        <span className="font-display text-2xl leading-none tnum">{d.getDate()}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <KindBadge kind={activity.kind} />
          {!past && <DDay date={activity.held_on} />}
        </div>
        <h3 className="mt-1.5 truncate font-bold group-hover:text-accent">{activity.title}</h3>
        <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-muted">
          {activity.start_time && <span className="inline-flex items-center gap-1"><Clock size={13} />{formatClock(activity.start_time)}</span>}
          {activity.place && <span className="inline-flex min-w-0 items-center gap-1"><MapPin size={13} /><span className="truncate">{activity.place}</span></span>}
          {activity.beans?.length > 0 && <span className="inline-flex items-center gap-1"><Coffee size={13} />원두 {activity.beans.length}종</span>}
        </p>
      </div>
    </Link>
  );
}
