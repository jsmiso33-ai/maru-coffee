import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { deleteNote, getActivity, getNote, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { ATTRIBUTES } from '../data/options.js';
import { Avatar, Button, Card, FlavorChip, Notice, Spinner, Stars } from '../components/ui.jsx';
import { NotFound } from './NotFound.jsx';
import Comments from '../components/Comments.jsx';
import FlavorWheel from '../components/FlavorWheel.jsx';
import { RoastMeter } from '../components/RoastSlider.jsx';
import { PhotoStrip } from '../components/Photos.jsx';
import { removePhotos } from '../lib/photos.js';
import WorldMap from '../components/WorldMap.jsx';
import { matchOrigin } from '../data/origins.js';
import RadarChart from '../components/RadarChart.jsx';
import { formatDate, formatDay } from '../lib/format.js';

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { data: note, loading, error } = useAsync(() => getNote(id), [id]);
  const { data: activity } = useAsync(
    () => (note?.activity_id ? getActivity(note.activity_id) : Promise.resolve(null)),
    [note?.activity_id],
  );
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  if (loading) return <Spinner />;
  if (error) return <Notice tone="accent">{error}</Notice>;
  if (!note) return <NotFound />;

  const isOwner = user && note.user_id === user.id;
  const canDelete = isOwner || isAdmin;

  const remove = async () => {
    setBusy(true);
    setActionError('');
    try {
      await deleteNote(note.id);
      removePhotos(note.photos);
      navigate('/notes', { replace: true });
    } catch (e) {
      setActionError(e.message);
      setBusy(false);
    }
  };

  const origin = matchOrigin(note.origin);
  const facts = [
    ['산지', note.origin],
    ['가공', note.process],
    ['로스팅', note.roast_level && (
      <span className="block">
        {note.roast_level}
        {note.roast_value != null && <RoastMeter value={note.roast_value} className="mt-2 max-w-[9rem]" />}
      </span>
    )],
    ['추출', note.brew_method],
    ['마신 날', formatDate(note.tasted_on)],
  ].filter(([, v]) => v);

  return (
    <article className="mx-auto max-w-4xl">
      <Link to="/notes" className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> 테이스팅 노트
      </Link>

      <header>
        <p className="text-sm font-medium text-muted">{note.roaster || '로스터리 미기재'}</p>
        <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{note.bean_name}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="flex items-center gap-2">
            <Stars value={Number(note.rating)} size={20} />
            <span className="font-display text-2xl tnum">{Number(note.rating).toFixed(1)}</span>
          </span>
          <Link to={note.user_id ? `/people/${note.user_id}` : '#'} className="flex items-center gap-2 text-sm text-ink-soft hover:text-accent">
            <Avatar name={note.author_name} src={note.author_avatar} size={26} />
            <span className="font-semibold">{note.author_name}</span>
          </Link>
        </div>
      </header>

      {activity && (
        <Link
          to={`/activities/${activity.id}`}
          className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-sm transition-colors hover:border-line-strong"
        >
          <CalendarDays size={18} className="shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="text-muted">{formatDay(activity.held_on)} · </span>
            <strong className="font-semibold">{activity.title}</strong>
            <span className="text-muted">에서 마신 원두</span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-muted" />
        </Link>
      )}

      {note.photos?.length > 0 && <PhotoStrip paths={note.photos} className="mt-6" />}

      <div className="mt-8 grid gap-5 md:grid-cols-[1fr_1.15fr]">
        <Card className="flex flex-col items-center p-5">
          <h2 className="self-start text-sm font-semibold text-muted">맛 프로필</h2>
          <RadarChart note={note} size={260} />
          <dl className="mt-2 grid w-full grid-cols-5 gap-1 border-t border-line pt-4 text-center">
            {ATTRIBUTES.map((a) => (
              <div key={a.key}>
                <dt className="text-xs text-muted">{a.label}</dt>
                <dd className="mt-0.5 font-display text-xl tnum">{note[a.key]}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <div className="space-y-5">
          {origin && (
            <Card className="p-4">
              <h2 className="mb-2.5 flex items-baseline justify-between gap-2 text-sm font-semibold text-muted">
                산지 <span className="text-ink">{note.origin}</span>
              </h2>
              <WorldMap selectedId={origin.id} caption={`${origin.region} · ${origin.name}`} />
            </Card>
          )}
          {note.flavors?.length > 0 && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-muted">느낀 향미</h2>
              <FlavorWheel selected={note.flavors} size="sm" className="mt-3" />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {note.flavors.map((f) => <FlavorChip key={f} name={f} />)}
              </div>
            </Card>
          )}
          {facts.length > 0 && (
            <Card className="p-5">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:grid-cols-3">
                {facts.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="mt-0.5 font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}
          {note.memo && (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-muted">메모</h2>
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{note.memo}</p>
            </Card>
          )}
        </div>
      </div>

      {(isOwner || canDelete) && (
        <div className="mt-8 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          {actionError && <p className="mr-auto text-sm text-accent">{actionError}</p>}
          {confirming ? (
            <>
              <span className="text-sm text-ink-soft">이 노트를 삭제할까요? 되돌릴 수 없어요.</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>취소</Button>
              <Button variant="accent" size="sm" onClick={remove} disabled={busy}>삭제</Button>
            </>
          ) : (
            <>
              {canDelete && <Button variant="danger" size="sm" onClick={() => setConfirming(true)}><Trash2 size={15} /> 삭제</Button>}
              {isOwner && <Button variant="outline" size="sm" to={`/notes/${note.id}/edit`}><Pencil size={15} /> 수정</Button>}
            </>
          )}
        </div>
      )}

      <Comments note={note} />
    </article>
  );
}
