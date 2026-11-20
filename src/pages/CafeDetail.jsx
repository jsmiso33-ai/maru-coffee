import { Suspense, lazy, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarDays, Copy, ExternalLink, Pencil, Trash2, UtensilsCrossed } from 'lucide-react';
import { deleteCafe, getCafe, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { kakaoMapUrl, naverMapUrl } from '../data/cafes.js';
import { Avatar, Button, Card, Notice, Spinner, Stars } from '../components/ui.jsx';
import { NotFound } from './NotFound.jsx';
import { formatDate } from '../lib/format.js';

const CafeMap = lazy(() => import('../components/CafeMap.jsx'));

export default function CafeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { data: cafe, loading, error } = useAsync(() => getCafe(id), [id]);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [copied, setCopied] = useState(false);

  if (loading) return <Spinner />;
  if (error) return <Notice tone="accent">{error}</Notice>;
  if (!cafe) return <NotFound what="카페" />;

  const isOwner = user && cafe.user_id === user.id;
  const canDelete = isOwner || isAdmin;

  const remove = async () => {
    setBusy(true);
    try {
      await deleteCafe(cafe.id);
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

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{cafe.region}</span>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{cafe.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-2">
              <Stars value={Number(cafe.rating)} size={20} />
              <span className="font-display text-2xl tnum">{Number(cafe.rating).toFixed(1)}</span>
            </span>
            <span className="flex items-center gap-2 text-sm text-ink-soft">
              <Avatar name={cafe.author_name} src={cafe.author_avatar} size={24} />
              <span className="font-semibold">{cafe.author_name}</span>
            </span>
          </div>

          {cafe.address && (
            <button type="button" onClick={copyAddress} className="mt-4 inline-flex min-h-11 items-center gap-2 text-left text-ink-soft hover:text-ink">
              <Copy size={15} className="shrink-0" /> {cafe.address}
              <span className="text-xs text-muted" aria-live="polite">{copied ? '복사됨' : ''}</span>
            </button>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" href={kakaoMapUrl(cafe)}><ExternalLink size={15} /> 카카오맵</Button>
            <Button variant="outline" size="sm" href={naverMapUrl(cafe)}><ExternalLink size={15} /> 네이버 지도</Button>
            {cafe.link && <Button variant="ghost" size="sm" href={cafe.link}><ExternalLink size={15} /> 링크</Button>}
          </div>

          <div className="mt-6 space-y-4">
            {(cafe.signature || cafe.visited_on) && (
              <Card className="grid gap-4 p-5 sm:grid-cols-2">
                {cafe.signature && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted"><UtensilsCrossed size={13} /> 추천 메뉴</p>
                    <p className="mt-1 font-semibold">{cafe.signature}</p>
                  </div>
                )}
                {cafe.visited_on && (
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold text-muted"><CalendarDays size={13} /> 다녀온 날</p>
                    <p className="mt-1 font-semibold tnum">{formatDate(cafe.visited_on)}</p>
                  </div>
                )}
              </Card>
            )}
            {cafe.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {cafe.tags.map((t) => (
                  <Link key={t} to={`/cafes?tag=${encodeURIComponent(t)}`} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft hover:border-line-strong">{t}</Link>
                ))}
              </div>
            )}
            {cafe.memo && (
              <Card className="p-5">
                <h2 className="text-sm font-semibold text-muted">한 줄 평</h2>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-soft">{cafe.memo}</p>
              </Card>
            )}
          </div>
        </div>

        <Suspense fallback={<div className="h-80 animate-pulse rounded-[var(--radius-card)] bg-sunken lg:h-[28rem]" />}>
          <CafeMap cafes={[cafe]} selectedId={cafe.id} className="h-80 lg:h-[28rem]" />
        </Suspense>
      </div>

      {canDelete && (
        <div className="mt-8 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">
          {actionError && <p className="mr-auto text-sm text-accent">{actionError}</p>}
          {confirming ? (
            <>
              <span className="text-sm text-ink-soft">이 카페 기록을 삭제할까요?</span>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={busy}>취소</Button>
              <Button variant="accent" size="sm" onClick={remove} disabled={busy}>삭제</Button>
            </>
          ) : (
            <>
              <Button variant="danger" size="sm" onClick={() => setConfirming(true)}><Trash2 size={15} /> 삭제</Button>
              {isOwner && <Button variant="outline" size="sm" to={`/cafes/${cafe.id}/edit`}><Pencil size={15} /> 수정</Button>}
            </>
          )}
        </div>
      )}
    </article>
  );
}
