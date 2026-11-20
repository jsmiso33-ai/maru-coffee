import { Suspense, lazy, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, Copy, ExternalLink, Heart, Pencil, Star, Trash2, UtensilsCrossed } from 'lucide-react';
import { deleteCafe, deleteReview, getCafe, setWish, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { removePhotos } from '../lib/photos.js';
import { kakaoMapUrl } from '../data/cafes.js';
import { Avatar, Button, Card, Notice, Spinner, Stars, cx } from '../components/ui.jsx';
import { PhotoStrip } from '../components/Photos.jsx';
import { NotFound } from './NotFound.jsx';
import NaverMapButton from '../components/NaverMapButton.jsx';
import { formatDate } from '../lib/format.js';

const CafeMap = lazy(() => import('../components/CafeMap.jsx'));

export default function CafeDetail() {
  const { id } = useParams();
  const { data: cafe, loading, error, reload } = useAsync(() => getCafe(id), [id]);
  if (loading && !cafe) return <Spinner />;
  if (error) return <Notice tone="accent">{error}</Notice>;
  if (!cafe) return <NotFound what="카페" />;
  return <CafeView cafe={cafe} reload={reload} />;
}

function CafeView({ cafe, reload }) {
  const navigate = useNavigate();
  const { user, isAdmin, isMember, signIn } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);

  const mine = user ? cafe.reviews.find((r) => r.user_id === user.id) : null;
  const wished = user ? cafe.wishes.some((w) => w.user_id === user.id) : false;
  const isCreator = user && cafe.user_id === user.id;
  const othersReviewed = cafe.reviews.some((r) => r.user_id !== user?.id);
  const canDeleteCafe = isAdmin || (isCreator && !othersReviewed);

  const toggleWish = async () => {
    if (!user) return signIn();
    setBusy(true);
    setActionError('');
    try {
      await setWish(cafe.id, !wished);
      reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeCafe = async () => {
    setBusy(true);
    try {
      await deleteCafe(cafe.id);
      removePhotos(cafe.reviews.flatMap((r) => r.photos ?? []));
      navigate('/cafes', { replace: true });
    } catch (e) {
      setActionError(e.message);
      setBusy(false);
    }
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(cafe.address || cafe.name);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* 복사 권한 없음 — 조용히 무시 */ }
  };

  return (
    <article className="mx-auto max-w-5xl">
      <Link to={`/cafes?region=${encodeURIComponent(cafe.region)}`} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> 카페 지도
      </Link>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div>
          <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{cafe.region}</span>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{cafe.name}</h1>

          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {cafe.avgRating != null ? (
              <span className="flex items-center gap-2">
                <Stars value={cafe.avgRating} size={20} />
                <span className="font-display text-2xl tnum">{cafe.avgRating.toFixed(1)}</span>
                <span className="text-sm text-muted tnum">후기 {cafe.reviewCount}</span>
              </span>
            ) : (
              <span className="text-sm text-muted">아직 다녀온 부원이 없어요</span>
            )}
          </p>

          {cafe.address && (
            <button type="button" onClick={copyAddress} className="mt-3 inline-flex min-h-11 items-center gap-2 text-left text-ink-soft hover:text-ink">
              <Copy size={15} className="shrink-0" /> {cafe.address}
              <span className="text-xs text-muted" aria-live="polite">{copied ? '복사됨' : ''}</span>
            </button>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <NaverMapButton cafe={cafe} />
            <Button variant="outline" size="sm" href={kakaoMapUrl(cafe)}><ExternalLink size={15} /> 카카오맵</Button>
            {cafe.link && <Button variant="ghost" size="sm" href={cafe.link}><ExternalLink size={15} /> 링크</Button>}
          </div>

          {/* 가보고 싶어요 */}
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-3.5">
            <button
              type="button"
              onClick={toggleWish}
              disabled={busy}
              aria-pressed={wished}
              className={cx(
                'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors sm:h-10',
                wished ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line-strong hover:bg-sunken',
              )}
            >
              <Heart size={16} fill={wished ? 'currentColor' : 'none'} /> 가보고 싶어요 <span className="tnum">{cafe.wishCount}</span>
            </button>
            <p className="min-w-0 flex-1 text-sm text-muted">
              {cafe.wishCount ? `${cafe.wishes.map((w) => w.author_name).slice(0, 4).join(', ')}${cafe.wishCount > 4 ? ` 외 ${cafe.wishCount - 4}명` : ''}` : '카페 투어 후보로 찜해 두세요.'}
            </p>
          </div>

          {actionError && <p className="mt-2 text-sm text-accent">{actionError}</p>}
        </div>

        <Suspense fallback={<div className="h-72 animate-pulse rounded-[var(--radius-card)] bg-sunken lg:h-[26rem]" />}>
          <CafeMap cafes={[cafe]} selectedId={cafe.id} className="h-72 lg:h-[26rem]" />
        </Suspense>
      </div>

      {/* 후기 */}
      <section className="mt-10" aria-labelledby="reviews-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <h2 id="reviews-title" className="text-xl font-bold tracking-tight">부원 후기 <span className="text-muted tnum">{cafe.reviewCount}</span></h2>
          {(!user || isMember) && (
            <Button to={user ? `/cafes/${cafe.id}/review` : undefined} onClick={user ? undefined : signIn} variant={mine ? 'outline' : 'accent'} size="sm">
              {mine ? <><Pencil size={15} /> 내 후기 고치기</> : <><Star size={15} /> 후기 남기기</>}
            </Button>
          )}
        </div>
        {cafe.reviews.length ? (
          <ul className="space-y-3">
            {cafe.reviews.map((r) => (
              <ReviewItem key={r.id} review={r} canEdit={user?.id === r.user_id} canDelete={user?.id === r.user_id || isAdmin} onChanged={reload} />
            ))}
          </ul>
        ) : (
          <Card className="px-6 py-10 text-center text-sm text-muted">다녀왔다면 첫 후기를 남겨 주세요.</Card>
        )}
      </section>

      {(isCreator || isAdmin) && (
        <div className="mt-8 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          {confirming ? (
            <>
              <span className="text-sm text-ink-soft">카페와 후기를 모두 지울까요?</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>취소</Button>
              <Button variant="accent" size="sm" onClick={removeCafe} disabled={busy}>삭제</Button>
            </>
          ) : (
            <>
              {canDeleteCafe ? (
                <Button variant="danger" size="sm" onClick={() => setConfirming(true)}><Trash2 size={15} /> 카페 삭제</Button>
              ) : (
                <span className="mr-auto text-xs text-muted">다른 부원 후기가 있어서 운영진만 지울 수 있어요.</span>
              )}
              {isCreator && <Button variant="outline" size="sm" to={`/cafes/${cafe.id}/edit`}><Pencil size={15} /> 장소 정보 수정</Button>}
            </>
          )}
        </div>
      )}
    </article>
  );
}

function ReviewItem({ review, canEdit, canDelete, onChanged }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    setBusy(true);
    try {
      await deleteReview(review.id);
      removePhotos(review.photos);
      onChanged();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  return (
    <li>
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to={`/people/${review.user_id}`} className="flex items-center gap-2 text-sm font-semibold text-ink-soft hover:text-accent">
            <Avatar name={review.author_name} src={review.author_avatar} size={26} /> {review.author_name}
          </Link>
          <span className="flex items-center gap-2">
            <Stars value={Number(review.rating)} size={15} />
            <span className="font-semibold tnum">{Number(review.rating).toFixed(1)}</span>
          </span>
        </div>
        {(review.signature || review.visited_on) && (
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
            {review.signature && <span className="inline-flex items-center gap-1.5"><UtensilsCrossed size={14} className="text-muted" /> {review.signature}</span>}
            {review.visited_on && <span className="inline-flex items-center gap-1.5 tnum"><CalendarDays size={14} className="text-muted" /> {formatDate(review.visited_on)}</span>}
          </p>
        )}
        {review.memo && <p className="mt-2.5 whitespace-pre-line leading-relaxed">{review.memo}</p>}
        {review.photos?.length > 0 && <PhotoStrip paths={review.photos} className="mt-3" />}
        {review.tags?.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-1.5">
            {review.tags.map((t) => (
              <Link key={t} to={`/cafes?tag=${encodeURIComponent(t)}`} className="rounded-full border border-line px-2.5 py-1 text-xs text-ink-soft hover:border-line-strong">{t}</Link>
            ))}
          </p>
        )}
        {(canEdit || canDelete) && (
          <div className="mt-3 flex items-center justify-end gap-1 text-sm">
            {confirming ? (
              <>
                <span className="mr-1 text-ink-soft">후기를 지울까요?</span>
                <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>취소</Button>
                <Button variant="accent" size="sm" onClick={remove} disabled={busy}>삭제</Button>
              </>
            ) : (
              <>
                {canDelete && <Button variant="danger" size="sm" onClick={() => setConfirming(true)}><Trash2 size={14} /> 삭제</Button>}
                {canEdit && <Button variant="ghost" size="sm" to={`/cafes/${review.cafe_id}/review`}><Pencil size={14} /> 고치기</Button>}
              </>
            )}
          </div>
        )}
        {error && <p className="mt-1 text-sm text-accent">{error}</p>}
      </Card>
    </li>
  );
}
