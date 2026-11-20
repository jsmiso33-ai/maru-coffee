import { Suspense, lazy, useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowRight, ArrowUpRight, BookOpen, Clock, MapPin, NotebookPen, Plus } from 'lucide-react';
import { CLUB } from '../lib/config.js';
import { listActivities, listNotes, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { DDay } from '../components/ActivityBits.jsx';
import { STANDARD_RECIPES } from '../data/recipes.js';
import { Button, Card, FlavorChip, Notice, Spinner } from '../components/ui.jsx';
import NoteCard from '../components/NoteCard.jsx';
import { formatClock, formatDay, todayKey } from '../lib/format.js';
import brewPhoto from '../assets/hand-drip.webp';
import { COFFEE_ORIGINS, matchOrigin } from '../data/origins.js';

// 지도(d3-geo)는 홈 첫 화면 번들에서 빼고 따로 받는다
const WorldMap = lazy(() => import('../components/WorldMap.jsx'));

// 표지 사진 카드가 여는 표준 레시피
const featureRecipe = STANDARD_RECIPES[0];

export default function Home() {
  const { data: notes, loading, error, reload } = useAsync(listNotes, []);

  return (
    <div className="journal-home">
      <section className="journal-cover" aria-labelledby="cover-title">
        <div className="cover-copy">
          <p className="club-byline">{CLUB.school} {CLUB.tagline}</p>
          <h1 id="cover-title" className="cover-title">Coffee <em>Journal</em></h1>
          <p className="cover-intro">{CLUB.intro}</p>
          <div className="cover-actions">
            <Button to="/notes/new" variant="accent"><NotebookPen size={17} /> 노트 쓰기</Button>
            <Button to="/cafes" variant="outline"><MapPin size={17} /> 카페 지도</Button>
          </div>
        </div>
        <Link to={`/recipes/std/${featureRecipe.id}`} className="cover-photo" aria-label={`${featureRecipe.title} 레시피 보기`}>
          <img src={brewPhoto} width="1260" height="840" alt="" fetchPriority="high" />
          <div className="photo-caption">
            <span><small><BookOpen size={13} /> 표준 레시피</small><b>{featureRecipe.title}</b></span>
            <span className="photo-open"><ArrowUpRight size={20} /></span>
          </div>
        </Link>
      </section>

      <NextActivity />

      <section>
        <SectionHead title="최근 테이스팅 노트" to="/notes" link="노트 전체 보기" />
        {loading ? <Spinner /> : error ? (
          <Notice tone="accent" action={<Button size="sm" variant="outline" onClick={reload}>다시 시도</Button>}>{error}</Notice>
        ) : notes?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.slice(0, 6).map((note) => <NoteCard key={note.id} note={note} />)}
          </div>
        ) : (
          <Card className="px-6 py-12 text-center">
            <p className="mb-4 text-ink-soft">아직 테이스팅 노트가 없어요. 오늘 마신 원두의 맛을 남겨 보세요.</p>
            <Button to="/notes/new" size="sm" variant="outline">첫 노트 쓰기</Button>
          </Card>
        )}
        {notes?.length > 0 && <JournalStats notes={notes} />}
      </section>

      {notes && <OriginMap notes={notes} />}
    </div>
  );
}

function JournalStats({ notes }) {
  const { beans, authors, flavors } = useMemo(() => {
    const counts = new Map();
    for (const note of notes) {
      for (const flavor of note.flavors || []) counts.set(flavor, (counts.get(flavor) || 0) + 1);
    }
    return {
      beans: new Set(notes.map((n) => n.bean_name.trim())).size,
      authors: new Set(notes.map((n) => n.user_id || n.author_name)).size,
      flavors: [...counts.keys()].sort((a, b) => counts.get(b) - counts.get(a)).slice(0, 6),
    };
  }, [notes]);
  return (
    <section aria-label="노트로 보는 마루" className="journal-stats">
      <dl className="stat-counts">
        {[['테이스팅 노트', notes.length], ['기록한 원두', beans], ['참여 부원', authors]].map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value.toLocaleString('ko-KR')}</dd></div>
        ))}
      </dl>
      {flavors.length > 0 && (
        <div className="popular-flavors">
          <p>자주 기록한 향미</p>
          <div>{flavors.map((flavor) => (
            <Link key={flavor} to={`/notes?flavor=${encodeURIComponent(flavor)}`} aria-label={`${flavor} 향미 노트 보기`}>
              <FlavorChip name={flavor} size="sm" />
            </Link>
          ))}</div>
        </div>
      )}
    </section>
  );
}

// 마루가 마신 커피 산지: 지도 + 많이 마신 나라 순위
function OriginMap({ notes }) {
  const navigate = useNavigate();
  const { counts, ranking, unknown } = useMemo(() => {
    const m = new Map();
    let unmatched = 0;
    for (const n of notes) {
      const o = matchOrigin(n.origin);
      if (o) m.set(o.id, (m.get(o.id) || 0) + 1);
      else unmatched++;
    }
    const ranked = COFFEE_ORIGINS.filter((o) => m.has(o.id)).sort((a, b) => m.get(b.id) - m.get(a.id));
    return { counts: m, ranking: ranked, unknown: unmatched };
  }, [notes]);
  const top = ranking.slice(0, 5);
  const max = top.length ? counts.get(top[0].id) : 1;
  const open = (o) => navigate(`/notes?origin=${encodeURIComponent(o.name)}`);

  return (
    <section aria-labelledby="origin-map-title">
      <div className="section-head">
        <h2 id="origin-map-title">마루가 마신 커피 지도</h2>
        <Link to="/notes">산지별 노트 보기 <ArrowRight size={15} /></Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr] lg:items-center">
        <Suspense fallback={<div className="aspect-[12/5] animate-pulse rounded-[var(--radius-card)] bg-sunken/60" />}>
          <WorldMap counts={counts} onSelect={open} caption="나라를 누르면 그 산지 노트를 볼 수 있어요" />
        </Suspense>
        {top.length ? (
          <div>
            <p className="mb-3 text-sm text-muted tnum">
              <strong className="font-display text-3xl font-normal text-ink">{ranking.length}</strong>개 나라 ·{' '}
              노트 {notes.length - unknown}개
            </p>
            <ol className="space-y-1">
              {top.map((o, i) => (
                <li key={o.id}>
                  <button type="button" onClick={() => open(o)} className="group grid min-h-11 w-full grid-cols-[1.5rem_5.5rem_1fr_2rem] items-center gap-2 rounded-lg px-1 text-left text-sm hover:bg-sunken">
                    <span className="font-display text-muted tnum">{i + 1}</span>
                    <span className="truncate font-semibold group-hover:text-accent">{o.name}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
                      <span className="block h-full rounded-full bg-accent" style={{ width: `${(counts.get(o.id) / max) * 100}%` }} />
                    </span>
                    <span className="text-right text-muted tnum">{counts.get(o.id)}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            노트에 산지를 적으면 이 지도가 하나씩 채워져요. 에티오피아부터 파나마까지, 마루의 커피 여행을 기록해 보세요.
          </p>
        )}
      </div>
    </section>
  );
}

function SectionHead({ title, to, link }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      <Link to={to}>{link} <ArrowRight size={15} /></Link>
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
