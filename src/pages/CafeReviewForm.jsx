import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { getCafe, saveReview } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { removePhotos } from '../lib/photos.js';
import { Button, Card, Notice, Spinner } from '../components/ui.jsx';
import MemberGate from '../components/MemberGate.jsx';
import CafeReviewFields, { EMPTY_REVIEW, cleanReview } from '../components/CafeReviewFields.jsx';
import { NotFound } from './NotFound.jsx';

// 이미 지도에 있는 카페에 내 후기 쓰기·고치기 (한 사람당 카페 하나에 후기 하나)
export default function CafeReviewForm() {
  return (
    <MemberGate what="후기를 쓰려면">
      <Inner />
    </MemberGate>
  );
}

function Inner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cafe, setCafe] = useState(null);
  const [mine, setMine] = useState(null);
  const [review, setReview] = useState(EMPTY_REVIEW);
  const [state, setState] = useState('loading');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCafe(id)
      .then((c) => {
        if (!c) return setState('missing');
        setCafe(c);
        const own = c.reviews.find((r) => r.user_id === user?.id);
        if (own) {
          setMine(own);
          setReview({ ...EMPTY_REVIEW, ...Object.fromEntries(Object.keys(EMPTY_REVIEW).map((k) => [k, own[k] ?? EMPTY_REVIEW[k]])), rating: Number(own.rating) });
        }
        setState('ready');
      })
      .catch((e) => { setError(e.message); setState('error'); });
  }, [id, user?.id]);

  if (state === 'loading') return <Spinner />;
  if (state === 'missing') return <NotFound what="카페" />;
  if (state === 'error') return <Notice tone="accent">{error}</Notice>;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const clean = cleanReview(review);
      await saveReview(cafe.id, clean, mine?.id);
      // 고치면서 뺀 사진 파일 정리
      if (mine) removePhotos((mine.photos ?? []).filter((p) => !clean.photos.includes(p)));
      navigate(`/cafes/${cafe.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-3xl">
      <Link to={`/cafes/${cafe.id}`} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> {cafe.name}
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">{mine ? '내 후기 고치기' : '후기 남기기'}</h1>
      <p className="mb-6 mt-1.5 text-muted">{cafe.name} · {cafe.address || cafe.region}</p>

      <Card className="p-5 sm:p-6">
        <CafeReviewFields review={review} onChange={setReview} />
      </Card>

      {error && <div className="mt-5"><Notice tone="accent">{error}</Notice></div>}

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-6 flex justify-end md:bottom-4">
        <div className="flex gap-2 rounded-full border border-line bg-surface/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur">
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={saving}>취소</Button>
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-strong disabled:opacity-50">
            {saving ? '저장 중…' : mine ? '수정 완료' : '후기 올리기'}
          </button>
        </div>
      </div>
    </form>
  );
}
