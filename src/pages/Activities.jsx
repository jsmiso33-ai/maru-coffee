import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import { listActivities, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { isConfigured } from '../lib/supabase.js';
import { Button, Card, Notice, PageHeader, Spinner } from '../components/ui.jsx';
import { ActivityRow, MonthCalendar } from '../components/ActivityBits.jsx';
import { formatDay, parseDateKey, todayKey } from '../lib/format.js';

export default function Activities() {
  const { isAdmin } = useAuth();
  const { data, loading, error } = useAsync(listActivities, []);
  const [params, setParams] = useSearchParams();

  // 달(?m=2026-11)과 고른 날(?d=2026-11-27)은 주소에 남겨 뒤로 가기·공유가 되게
  const selected = params.get('d');
  const monthKey = params.get('m') || (selected ? selected.slice(0, 7) : todayKey().slice(0, 7));
  const month = parseDateKey(`${monthKey}-01`);
  const setQuery = (next) => setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true });

  const activities = data ?? [];
  const countsByDate = useMemo(() => {
    const m = new Map();
    activities.forEach((a) => m.set(a.held_on, (m.get(a.held_on) || 0) + 1));
    return m;
  }, [activities]);

  const today = todayKey();
  const upcoming = activities.filter((a) => a.held_on >= today).sort((a, b) => a.held_on.localeCompare(b.held_on));

  const [showAllPast, setShowAllPast] = useState(false);
  let listTitle;
  let list;
  if (selected) {
    listTitle = formatDay(selected);
    list = activities.filter((a) => a.held_on === selected);
  } else {
    listTitle = `${month.getMonth() + 1}월 활동`;
    list = activities.filter((a) => a.held_on.startsWith(monthKey)).sort((a, b) => a.held_on.localeCompare(b.held_on));
  }
  const past = activities.filter((a) => a.held_on < today); // 이미 최신순
  const pastShown = showAllPast ? past : past.slice(0, 5);

  return (
    <>
      <PageHeader
        title="활동"
        action={isAdmin && <Button to="/activities/new"><Plus size={18} /> 활동 만들기</Button>}
      >
        모임 일정과 그날 마신 원두를 모아 봐요.
      </PageHeader>

      {!isConfigured && <Notice>Supabase가 연결되면 운영진이 등록한 활동이 여기에 보여요.</Notice>}
      {error && <Notice tone="accent">{error}</Notice>}
      {loading ? (
        <Spinner />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Card className="p-4 sm:p-5 lg:sticky lg:top-24">
            <MonthCalendar
              month={month}
              onMonth={(m) => setQuery({ m: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}` })}
              countsByDate={countsByDate}
              selected={selected}
              onSelect={(d) => setQuery({ m: monthKey, d })}
            />
            {upcoming.length > 0 && !selected && (
              <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
                다음 활동 · <button type="button" className="font-semibold text-ink underline-offset-2 hover:underline" onClick={() => setQuery({ m: upcoming[0].held_on.slice(0, 7), d: upcoming[0].held_on })}>{formatDay(upcoming[0].held_on)}</button>
              </p>
            )}
          </Card>

          <div className="space-y-8">
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h2 className="text-lg font-bold">{listTitle}</h2>
                {selected && (
                  <button type="button" onClick={() => setQuery({ m: monthKey })} className="-my-2 py-2 text-sm font-semibold text-muted hover:text-ink">
                    {month.getMonth() + 1}월 전체 보기
                  </button>
                )}
              </div>
              {list.length ? (
                <div className="space-y-2.5">{list.map((a) => <ActivityRow key={a.id} activity={a} />)}</div>
              ) : (
                <Card className="px-5 py-10 text-center text-sm text-muted">
                  {selected ? '이 날은 등록된 활동이 없어요.' : '이 달에는 등록된 활동이 없어요.'}
                  {isAdmin && (
                    <div className="mt-4">
                      <Button size="sm" variant="outline" to={`/activities/new${selected ? `?date=${selected}` : ''}`}><Plus size={15} /> 활동 만들기</Button>
                    </div>
                  )}
                </Card>
              )}
            </section>

            {!selected && past.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-bold">지난 활동</h2>
                <div className="space-y-2.5">{pastShown.map((a) => <ActivityRow key={a.id} activity={a} />)}</div>
                {past.length > pastShown.length && (
                  <Button variant="ghost" size="sm" className="mt-3" onClick={() => setShowAllPast(true)}>
                    {past.length - pastShown.length}개 더 보기
                  </Button>
                )}
              </section>
            )}
          </div>
        </div>
      )}
    </>
  );
}
