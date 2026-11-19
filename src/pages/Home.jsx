import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Timer, NotebookPen, Calculator, Clock, MapPin, Plus } from 'lucide-react';
import { CLUB } from '../lib/config.js';
import { listActivities, listNotes, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { DDay } from '../components/ActivityBits.jsx';
import { STANDARD_RECIPES } from '../data/recipes.js';
import { Button, Card, FlavorChip, Spinner } from '../components/ui.jsx';
import NoteCard from '../components/NoteCard.jsx';
import { formatClock, formatDay, formatDuration, ratioOf, todayKey } from '../lib/format.js';

export default function Home() {
  const { data: notes, loading } = useAsync(listNotes, []);

  const stats = useMemo(() => {
    if (!notes) return null;
    const counts = new Map();
    notes.forEach((n) => n.flavors?.forEach((f) => counts.set(f, (counts.get(f) || 0) + 1)));
    const topFlavors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([f]) => f);
    const people = new Set(notes.map((n) => n.user_id || n.author_name)).size;
    const beans = new Set(notes.map((n) => n.bean_name.trim())).size;
    return { total: notes.length, people, beans, topFlavors };
  }, [notes]);

  const featured = STANDARD_RECIPES.slice(0, 3);

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* 소개 */}
      <section className="grid items-end gap-10 pt-2 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="text-sm font-semibold text-accent">{CLUB.school} {CLUB.tagline}</p>
          <h1 className="mt-3 font-display text-[clamp(4.5rem,16vw,9.5rem)] font-medium leading-[0.85] tracking-[-0.045em]">
            {CLUB.name}
          </h1>
          <p className="mt-6 max-w-lg text-[1.05rem] leading-relaxed text-ink-soft">{CLUB.intro}</p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Button to="/notes/new" size="lg"><NotebookPen size={18} /> 테이스팅 노트 쓰기</Button>
            <Button to="/brew" size="lg" variant="outline"><Timer size={18} /> 브루잉 타이머</Button>
          </div>
        </div>

        <Card className="min-h-[15.5rem] p-6 sm:p-7">
          <p className="text-sm font-semibold text-muted">지금까지 마루가 마신 커피</p>
          {stats ? (
            <>
              <dl className="mt-4 grid grid-cols-3 gap-4">
                {[
                  ['노트', stats.total],
                  ['원두', stats.beans],
                  ['참여 부원', stats.people],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="mt-1 font-display text-4xl font-normal tnum">{value}</dd>
                  </div>
                ))}
              </dl>
              {stats.topFlavors.length > 0 && (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-xs text-muted">가장 많이 적힌 향미</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {stats.topFlavors.map((f) => <FlavorChip key={f} name={f} size="sm" />)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Spinner />
          )}
        </Card>
      </section>

      <NextActivity />

      {/* 최근 노트 */}
      <section>
        <SectionHead title="최근 테이스팅 노트" to="/notes" link="전체 보기" />
        {loading ? (
          <Spinner />
        ) : notes?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.slice(0, 6).map((n) => <NoteCard key={n.id} note={n} />)}
          </div>
        ) : (
          <Card className="px-6 py-12 text-center text-muted">
            아직 노트가 없어요. 첫 번째 기록을 남겨 주세요.
          </Card>
        )}
      </section>

      {/* 레시피 & 도구 */}
      <section>
        <SectionHead title="오늘 뭐 내려 마실까" to="/recipes" link="레시피 전체" />
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.1fr]">
          {featured.map((r) => (
            <Link key={r.id} to={`/recipes/std/${r.id}`} className="group rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-line-strong">
              <p className="text-xs font-semibold text-muted">{r.method}</p>
              <h3 className="mt-1 font-bold group-hover:text-accent">{r.title}</h3>
              <p className="mt-4 font-display text-2xl tnum">
                {r.dose_g}<span className="text-base text-muted">g</span>
                <span className="mx-1.5 text-muted">/</span>
                {r.water_g}<span className="text-base text-muted">g</span>
              </p>
              <p className="mt-1 text-sm text-muted tnum">1:{ratioOf(r.dose_g, r.water_g)} · {r.water_temp}°C · {formatDuration(r.total_time_s)}</p>
            </Link>
          ))}
          <Link to="/brew" className="group flex flex-col justify-between rounded-[var(--radius-card)] bg-ink p-5 text-paper transition hover:-translate-y-0.5">
            <Calculator size={22} className="text-crema" />
            <div className="mt-8">
              <h3 className="font-bold">비율 계산기 · 추출 수율</h3>
              <p className="mt-1 text-sm text-paper/65">원두 양만 넣으면 물·뜸·나눠 붓기까지</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-crema">계산하기 <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ title, to, link }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ink-soft hover:text-accent">
        {link} <ArrowRight size={15} />
      </Link>
    </div>
  );
}

// 다가오는 활동이 있으면 그걸, 없으면 가장 최근 활동을 보여 준다
function NextActivity() {
  const { isAdmin } = useAuth();
  const { data } = useAsync(listActivities, []);
  if (!data) return null;
  const today = todayKey();
  const upcoming = data.filter((a) => a.held_on >= today).sort((a, b) => a.held_on.localeCompare(b.held_on));
  const activity = upcoming[0] ?? data[0];

  if (!activity) {
    if (!isAdmin) return null;
    return (
      <section>
        <SectionHead title="활동" to="/activities" link="캘린더" />
        <Card className="flex flex-wrap items-center justify-between gap-4 px-6 py-6">
          <p className="text-ink-soft">첫 활동을 등록하면 여기와 캘린더에 표시돼요.</p>
          <Button to="/activities/new" size="sm"><Plus size={15} /> 활동 만들기</Button>
        </Card>
      </section>
    );
  }

  const isUpcoming = activity.held_on >= today;
  return (
    <section>
      <SectionHead title={isUpcoming ? '다음 활동' : '최근 활동'} to="/activities" link="캘린더" />
      <Link
        to={`/activities/${activity.id}`}
        className="group grid gap-5 rounded-[var(--radius-card)] bg-ink p-6 text-paper transition-colors hover:bg-ink-soft sm:p-8 md:grid-cols-[1fr_auto] md:items-end"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-paper/15 px-2.5 py-0.5 text-xs font-semibold">{activity.kind}</span>
            <DDay date={activity.held_on} />
          </div>
          <h3 className="mt-3 text-2xl font-bold leading-snug sm:text-3xl">{activity.title}</h3>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-paper/75">
            <span className="font-semibold text-paper">{formatDay(activity.held_on)}</span>
            {activity.start_time && <span className="inline-flex items-center gap-1.5"><Clock size={15} />{formatClock(activity.start_time)}</span>}
            {activity.place && <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{activity.place}</span>}
          </p>
          {activity.beans?.length > 0 && (
            <p className="mt-4 text-sm text-paper/70">
              <span className="text-crema">원두 {activity.beans.length}종</span> · {activity.beans.map((b) => b.name).join(', ')}
            </p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 font-semibold text-crema">
          {isUpcoming ? '자세히 보기' : '노트 보러 가기'} <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
        </span>
      </Link>
    </section>
  );
}
