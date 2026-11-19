import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Clock, MapPin, NotebookPen, Package, Pencil, Trash2 } from 'lucide-react';
import { deleteActivity, getActivity, listNotesForActivity, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { ATTRIBUTES } from '../data/options.js';
import { Button, Card, FlavorChip, Notice, Spinner, Stars } from '../components/ui.jsx';
import { DDay, KindBadge } from '../components/ActivityBits.jsx';
import NoteCard from '../components/NoteCard.jsx';
import RadarChart from '../components/RadarChart.jsx';
import { NotFound } from './NotFound.jsx';
import { formatClock, formatDay } from '../lib/format.js';

export default function ActivityDetail() {
  const { id } = useParams();
  const { data, loading, error } = useAsync(
    () => Promise.all([getActivity(id), listNotesForActivity(id)]),
    [id],
  );
  if (loading) return <Spinner />;
  if (error) return <Notice tone="accent">{error}</Notice>;
  const [activity, notes] = data;
  if (!activity) return <NotFound what="활동" />;
  return <ActivityView activity={activity} notes={notes} />;
}

// 같은 원두에 달린 노트들의 평균
function summarize(notes) {
  if (!notes.length) return null;
  const avg = (key) => Math.round((notes.reduce((s, n) => s + Number(n[key]), 0) / notes.length) * 10) / 10;
  const flavorCount = new Map();
  notes.forEach((n) => n.flavors?.forEach((f) => flavorCount.set(f, (flavorCount.get(f) || 0) + 1)));
  return {
    count: notes.length,
    rating: avg('rating'),
    profile: Object.fromEntries(ATTRIBUTES.map((a) => [a.key, avg(a.key)])),
    flavors: [...flavorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
  };
}

function ActivityView({ activity, notes }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState('');

  const byBean = useMemo(() => {
    const m = new Map();
    notes.forEach((n) => {
      const k = n.activity_bean_id || 'none';
      m.set(k, [...(m.get(k) || []), n]);
    });
    return m;
  }, [notes]);

  const remove = async () => {
    try {
      await deleteActivity(activity.id);
      navigate('/activities', { replace: true });
    } catch (e) {
      setActionError(e.message);
    }
  };

  const meta = [
    activity.start_time && { icon: Clock, text: formatClock(activity.start_time) },
    activity.place && { icon: MapPin, text: activity.place },
  ].filter(Boolean);

  return (
    <article className="mx-auto max-w-5xl">
      <Link to={`/activities?m=${activity.held_on.slice(0, 7)}`} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> 활동
      </Link>

      <header className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <KindBadge kind={activity.kind} />
            <DDay date={activity.held_on} />
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{activity.title}</h1>
          <p className="mt-2 text-lg font-semibold text-ink-soft">{formatDay(activity.held_on, { year: true })}</p>
          {meta.length > 0 && (
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-muted">
              {meta.map(({ icon: Icon, text }) => <span key={text} className="inline-flex items-center gap-1.5"><Icon size={15} />{text}</span>)}
            </p>
          )}
        </div>
        <Button to={`/notes/new?activity=${activity.id}`} size="lg"><NotebookPen size={18} /> 이 활동 노트 쓰기</Button>
      </header>

      {(activity.description || activity.prep) && (
        <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr_1fr]">
          {activity.description && (
            <Card className="p-5"><p className="whitespace-pre-line leading-relaxed text-ink-soft">{activity.description}</p></Card>
          )}
          {activity.prep && (
            <Card className="p-5">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-muted"><Package size={15} /> 준비물</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed">{activity.prep}</p>
            </Card>
          )}
        </div>
      )}

      {activity.beans?.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-1 text-xl font-bold tracking-tight">함께 마신 원두</h2>
          <p className="mb-5 text-sm text-muted">부원들이 남긴 노트의 평균이에요. 노트가 쌓일수록 정확해져요.</p>
          <div className="grid gap-4 md:grid-cols-2">
            {activity.beans.map((b, i) => (
              <BeanSummary key={b.id} bean={b} index={i + 1} activityId={activity.id} summary={summarize(byBean.get(b.id) || [])} />
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-bold tracking-tight">이 날의 노트 <span className="text-muted tnum">{notes.length}</span></h2>
        {notes.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => <NoteCard key={n.id} note={n} />)}
          </div>
        ) : (
          <Card className="px-6 py-12 text-center">
            <p className="font-semibold">아직 노트가 없어요</p>
            <p className="mt-1 text-sm text-muted">마신 원두의 첫 노트를 남겨 주세요.</p>
          </Card>
        )}
      </section>

      {isAdmin && (
        <div className="mt-10 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          {actionError && <p className="mr-auto text-sm text-accent">{actionError}</p>}
          {confirming ? (
            <>
              <span className="text-sm text-ink-soft">활동을 삭제할까요? 노트는 남고 활동 연결만 풀려요.</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>취소</Button>
              <Button variant="accent" size="sm" onClick={remove}>삭제</Button>
            </>
          ) : (
            <>
              <Button variant="danger" size="sm" onClick={() => setConfirming(true)}><Trash2 size={15} /> 삭제</Button>
              <Button variant="outline" size="sm" to={`/activities/${activity.id}/edit`}><Pencil size={15} /> 수정</Button>
            </>
          )}
        </div>
      )}
    </article>
  );
}

function BeanSummary({ bean, index, activityId, summary }) {
  const meta = [bean.roaster, bean.origin, bean.process, bean.roast_level].filter(Boolean).join(' · ');
  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink font-display text-sm text-paper">{index}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold leading-snug">{bean.name}</h3>
          {meta && <p className="mt-0.5 text-sm text-muted">{meta}</p>}
        </div>
      </div>

      {summary ? (
        <div className="mt-4 grid grid-cols-[auto_1fr] items-center gap-4">
          <RadarChart note={summary.profile} size={150} compact />
          <div className="min-w-0">
            <p className="flex items-center gap-2">
              <Stars value={summary.rating} size={16} />
              <span className="font-display text-2xl tnum">{summary.rating.toFixed(1)}</span>
            </p>
            <p className="text-xs text-muted tnum">노트 {summary.count}개 평균</p>
            <dl className="mt-3 grid grid-cols-5 gap-1 text-center">
              {ATTRIBUTES.map((a) => (
                <div key={a.key}>
                  <dt className="text-[0.7rem] text-muted">{a.label}</dt>
                  <dd className="text-sm font-semibold tnum">{summary.profile[a.key]}</dd>
                </div>
              ))}
            </dl>
          </div>
          {summary.flavors.length > 0 && (
            <div className="col-span-2 flex flex-wrap gap-1.5">
              {summary.flavors.map(([f, c]) => (
                <span key={f} className="inline-flex items-center gap-1">
                  <FlavorChip name={f} size="sm" />
                  {c > 1 && <span className="text-xs text-muted tnum">×{c}</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-sunken/60 px-4 py-5 text-center text-sm text-muted">아직 이 원두 노트가 없어요</p>
      )}

      <Button to={`/notes/new?activity=${activityId}&bean=${bean.id}`} variant="outline" size="sm" className="mt-4 self-start">
        <NotebookPen size={15} /> 이 원두 노트 쓰기
      </Button>
    </Card>
  );
}
