import { Suspense, lazy, useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router';
import { Coffee, NotebookPen, Star } from 'lucide-react';
import { listCafes, listNotes, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { ATTRIBUTES } from '../data/options.js';
import { FLAVOR_GROUPS, flavorDot } from '../data/flavors.js';
import { matchOrigin } from '../data/origins.js';
import { Avatar, Button, Card, Notice, Spinner, cx } from '../components/ui.jsx';
import RadarChart from '../components/RadarChart.jsx';
import FlavorWheel from '../components/FlavorWheel.jsx';
import NoteCard from '../components/NoteCard.jsx';
import MemberGate from '../components/MemberGate.jsx';

const WorldMap = lazy(() => import('../components/WorldMap.jsx'));

// 가장 두드러진 맛으로 한 줄 취향 이름 붙이기
const TASTE_WORDS = {
  acidity: ['밝은 산미파', '과일처럼 산뜻한 커피를 즐겨요'],
  sweetness: ['달콤한 단맛파', '단맛이 또렷한 커피를 높게 쳐요'],
  body: ['묵직한 바디파', '입안을 꽉 채우는 커피를 좋아해요'],
  bitterness: ['쌉싸름한 쓴맛파', '진하고 쌉싸름한 커피가 취향이에요'],
  aftertaste: ['긴 여운파', '마시고 난 뒤 남는 여운을 중요하게 봐요'],
};

// /me — 로그인한 내 페이지로
export function MyProfile() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <MemberGate what="내 커피 취향을 보려면"><span /></MemberGate>;
  return <Navigate to={`/people/${user.id}`} replace />;
}

export default function Profile() {
  const { id } = useParams();
  const { user, displayName, avatar } = useAuth();
  const { data, loading, error } = useAsync(() => Promise.all([listNotes(), listCafes()]), []);
  const isMe = user?.id === id;

  const stats = useMemo(() => {
    if (!data) return null;
    const [allNotes, cafes] = data;
    const notes = allNotes.filter((n) => n.user_id === id);
    const reviews = cafes.flatMap((c) => c.reviews.filter((r) => r.user_id === id).map((r) => ({ ...r, cafe: c })));
    const wishes = cafes.filter((c) => c.wishes.some((w) => w.user_id === id));
    const who = notes[0] ?? reviews[0] ?? null;

    const avg = notes.length
      ? Object.fromEntries(ATTRIBUTES.map((a) => [a.key, Math.round((notes.reduce((s, n) => s + Number(n[a.key]), 0) / notes.length) * 10) / 10]))
      : null;
    const top = avg ? ATTRIBUTES.reduce((best, a) => (avg[a.key] > avg[best.key] ? a : best), ATTRIBUTES[0]) : null;

    const count = (list) => {
      const m = new Map();
      list.filter(Boolean).forEach((x) => m.set(x, (m.get(x) || 0) + 1));
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const flavors = count(notes.flatMap((n) => n.flavors ?? []));
    const groupOf = new Map(FLAVOR_GROUPS.flatMap((g) => g.items.map((i) => [i, g.name])));
    const groups = count(notes.flatMap((n) => (n.flavors ?? []).map((f) => groupOf.get(f) ?? '기타')));
    const origins = new Map();
    notes.forEach((n) => { const o = matchOrigin(n.origin); if (o) origins.set(o.id, (origins.get(o.id) || 0) + 1); });

    return {
      notes,
      reviews,
      wishes,
      name: who?.author_name ?? (isMe ? displayName : '부원'),
      avatar: who?.author_avatar ?? (isMe ? avatar : null),
      avg,
      top,
      flavors: flavors.slice(0, 5),
      flavorCounts: new Map(flavors),
      groups: groups.slice(0, 4),
      origins,
      process: count(notes.map((n) => n.process))[0]?.[0],
      method: count(notes.map((n) => n.brew_method))[0]?.[0],
      best: [...notes].sort((a, b) => b.rating - a.rating || b.created_at.localeCompare(a.created_at)).slice(0, 3),
      beans: new Set(notes.map((n) => n.bean_name.trim())).size,
    };
  }, [data, id, isMe, displayName, avatar]);

  if (loading) return <Spinner />;
  if (error) return <Notice tone="accent">{error}</Notice>;
  const s = stats;
  const empty = !s.notes.length && !s.reviews.length;
  const maxFlavor = s.flavors[0]?.[1] ?? 1;

  return (
    <article className="mx-auto max-w-5xl">
      <header className="flex flex-wrap items-center gap-4">
        <Avatar name={s.name} src={s.avatar} size={64} />
        <div className="min-w-0 flex-1">
          <p className="page-title-en !text-[1.4rem]">{isMe ? 'My Coffee' : 'Coffee Profile'}</p>
          <h1 className="text-2xl font-bold tracking-tight">{s.name}</h1>
          <p className="mt-1 text-sm text-muted tnum">
            노트 {s.notes.length} · 원두 {s.beans}종 · 산지 {s.origins.size}개국 · 카페 {s.reviews.length}곳
          </p>
        </div>
      </header>

      {empty ? (
        <Card className="mt-8 px-6 py-12 text-center">
          <p className="font-semibold">{isMe ? '아직 기록이 없어요' : '아직 기록이 없는 부원이에요'}</p>
          {isMe && (
            <>
              <p className="mt-1 text-sm text-muted">노트를 쓰면 여기에 내 커피 취향이 쌓여요.</p>
              <Button to="/notes/new" className="mt-5"><NotebookPen size={16} /> 첫 노트 쓰기</Button>
            </>
          )}
        </Card>
      ) : (
        <>
          {/* 취향 요약 */}
          {s.avg && (
            <section className="mt-8 grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
              <Card className="flex flex-col items-center p-5">
                <h2 className="self-start text-sm font-semibold text-muted">평균 맛 프로필</h2>
                <RadarChart note={s.avg} size={240} />
              </Card>
              <Card className="p-6">
                <h2 className="text-sm font-semibold text-muted">한 줄 취향</h2>
                {s.notes.length >= 3 ? (
                  <>
                    <p className="mt-2 font-display text-3xl italic text-accent">{TASTE_WORDS[s.top.key][0]}</p>
                    <p className="mt-1 text-ink-soft">{TASTE_WORDS[s.top.key][1]}</p>
                  </>
                ) : (
                  <p className="mt-2 text-ink-soft">노트가 3개 이상 쌓이면 취향을 정리해 드려요. (지금 {s.notes.length}개)</p>
                )}
                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-5 text-sm">
                  <div><dt className="text-xs text-muted">자주 고른 가공</dt><dd className="mt-0.5 font-semibold">{s.process ?? '—'}</dd></div>
                  <div><dt className="text-xs text-muted">자주 쓴 추출</dt><dd className="mt-0.5 font-semibold">{s.method ?? '—'}</dd></div>
                </dl>
                {s.groups.length > 0 && (
                  <p className="mt-4 text-sm text-muted">
                    향미는 주로 <strong className="font-semibold text-ink">{s.groups.map(([g]) => g).slice(0, 2).join('·')}</strong> 계열
                  </p>
                )}
              </Card>
            </section>
          )}

          {/* 향미 TOP 5 */}
          {s.flavors.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-bold">자주 적은 향미</h2>
              <Card className="grid items-center gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                {/* 지금까지 고른 향미를 휠에 — 많이 고를수록 진하게 */}
                <FlavorWheel counts={s.flavorCounts} size="sm" />
                <ol className="space-y-2.5">
                  {s.flavors.map(([f, n], i) => (
                    <li key={f} className="grid grid-cols-[1.25rem_6.5rem_1fr_2rem] items-center gap-2 text-sm">
                      <span className="font-display text-muted tnum">{i + 1}</span>
                      <Link to={`/notes?flavor=${encodeURIComponent(f)}`} className="flex items-center gap-1.5 truncate font-semibold hover:text-accent">
                        <span className="size-2 shrink-0 rounded-full" style={{ background: flavorDot(f) }} aria-hidden /> {f}
                      </Link>
                      <span className="h-2 overflow-hidden rounded-full bg-sunken" aria-hidden>
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${(n / maxFlavor) * 100}%` }} />
                      </span>
                      <span className="text-right text-muted tnum">{n}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </section>
          )}

          {/* 산지 지도 */}
          {s.origins.size > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-bold">마신 산지</h2>
              <Suspense fallback={<div className="aspect-[12/5] animate-pulse rounded-[var(--radius-card)] bg-sunken" />}>
                <WorldMap counts={s.origins} caption={`${s.origins.size}개 나라의 커피를 마셨어요`} />
              </Suspense>
            </section>
          )}

          {/* 최고 원두 */}
          {s.best.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-bold">가장 좋았던 원두</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {s.best.map((n) => <NoteCard key={n.id} note={n} />)}
              </div>
            </section>
          )}

          {/* 카페 */}
          {(s.reviews.length > 0 || s.wishes.length > 0) && (
            <section className="mt-8">
              <h2 className="mb-3 text-lg font-bold">카페</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {s.reviews.length > 0 && (
                  <Card className="p-5">
                    <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted"><Coffee size={15} /> 다녀온 곳 {s.reviews.length}</h3>
                    <ul className="space-y-1">
                      {s.reviews.map((r) => (
                        <li key={r.id}>
                          <Link to={`/cafes/${r.cafe.id}`} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 hover:bg-sunken">
                            <span className="min-w-0 truncate"><span className="font-semibold">{r.cafe.name}</span> <span className="text-sm text-muted">{r.cafe.region}</span></span>
                            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-accent tnum"><Star size={13} fill="currentColor" /> {Number(r.rating).toFixed(1)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
                {s.wishes.length > 0 && (
                  <Card className={cx('p-5', !s.reviews.length && 'md:col-span-2')}>
                    <h3 className="mb-3 text-sm font-semibold text-muted">가보고 싶은 곳 {s.wishes.length}</h3>
                    <ul className="flex flex-wrap gap-1.5">
                      {s.wishes.map((c) => (
                        <li key={c.id}><Link to={`/cafes/${c.id}`} className="inline-flex min-h-10 items-center rounded-full border border-line px-3 text-sm hover:border-line-strong">{c.name}</Link></li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            </section>
          )}

          {isMe && s.notes.length > 0 && (
            <p className="mt-8 text-center">
              <Button to="/notes?mine=1" variant="outline"><NotebookPen size={16} /> 내 노트 전체 보기</Button>
            </p>
          )}
        </>
      )}
    </article>
  );
}
