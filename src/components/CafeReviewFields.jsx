import { CAFE_TAGS } from '../data/cafes.js';
import { Label, StarInput, cx } from './ui.jsx';
import { PhotoPicker } from './Photos.jsx';
import { todayKey } from '../lib/format.js';

export const EMPTY_REVIEW = { rating: 4, tags: [], signature: '', memo: '', visited_on: '', photos: [] };

// 카페 후기 입력 칸 묶음 — 새 카페 등록과 후기 쓰기 화면이 같이 쓴다
export default function CafeReviewFields({ review, onChange }) {
  const set = (key) => (value) => onChange({ ...review, [key]: value });
  const bind = (key) => ({ id: `review-${key}`, value: review[key] ?? '', onChange: (e) => set(key)(e.target.value) });
  const toggleTag = (t) => set('tags')(
    review.tags.includes(t) ? review.tags.filter((x) => x !== t) : review.tags.length >= 10 ? review.tags : [...review.tags, t],
  );

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold">별점</p>
        <StarInput value={review.rating} onChange={set('rating')} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="review-signature">추천 메뉴</Label>
          <input {...bind('signature')} maxLength={80} className="field" placeholder="예: 게이샤 핸드드립, 플랫화이트" />
        </div>
        <div>
          <Label htmlFor="review-visited_on">다녀온 날</Label>
          <input {...bind('visited_on')} type="date" max={todayKey()} className="field" />
        </div>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">특징 <span className="text-xs font-normal text-muted">여러 개 선택</span></legend>
        <div className="flex flex-wrap gap-1.5">
          {CAFE_TAGS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={review.tags.includes(t)}
              onClick={() => toggleTag(t)}
              className={cx('h-11 rounded-full border px-3.5 text-sm sm:h-9', review.tags.includes(t) ? 'border-ink bg-ink font-semibold text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong')}
            >
              {t}
            </button>
          ))}
        </div>
      </fieldset>
      <div>
        <Label htmlFor="review-memo" hint={`${(review.memo ?? '').length}/2000`}>한 줄 평</Label>
        <textarea {...bind('memo')} rows={4} maxLength={2000} className="field resize-y leading-relaxed" placeholder="어떤 원두를 쓰는지, 분위기, 다시 갈 이유…" />
      </div>
      <PhotoPicker label="사진 (메뉴·공간)" value={Array.isArray(review.photos) ? review.photos : []} onChange={set('photos')} />
    </div>
  );
}

export function cleanReview(r) {
  return { ...r, signature: (r.signature ?? '').trim(), memo: (r.memo ?? '').trim(), photos: Array.isArray(r.photos) ? r.photos : [] };
}
