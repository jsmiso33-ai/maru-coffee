import { useEffect, useRef, useState } from 'react';
import { Camera, LoaderCircle, X } from 'lucide-react';
import { MAX_PHOTOS, photoUrl, uploadPhoto } from '../lib/photos.js';
import { cx } from './ui.jsx';

// 사진 고르기: 고르는 즉시 줄여서 올리고, 경로 배열(value)을 돌려준다
export function PhotoPicker({ value = [], onChange, label = '사진' }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState('');
  const left = MAX_PHOTOS - value.length - busy;

  const pick = async (e) => {
    const files = [...(e.target.files ?? [])].slice(0, Math.max(0, left));
    e.target.value = '';
    if (!files.length) return;
    setError('');
    setBusy((b) => b + files.length);
    const added = [];
    for (const f of files) {
      try {
        added.push(await uploadPhoto(f));
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy((b) => b - 1);
      }
    }
    if (added.length) onChange([...value, ...added].slice(0, MAX_PHOTOS));
  };

  return (
    <div>
      <p className="mb-2 flex items-baseline justify-between text-sm font-semibold">
        {label} <span className="text-xs font-normal text-muted tnum">{value.length}/{MAX_PHOTOS}</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {value.map((p) => (
          <div key={p} className="relative size-24 overflow-hidden rounded-xl border border-line bg-sunken">
            <img src={photoUrl(p)} alt="" className="size-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== p))}
              aria-label="사진 빼기"
              className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-ink/75 text-paper hover:bg-ink"
            >
              <X size={15} />
            </button>
          </div>
        ))}
        {Array.from({ length: busy }, (_, i) => (
          <div key={`busy-${i}`} className="grid size-24 place-items-center rounded-xl border border-line bg-sunken text-muted" role="status" aria-label="사진 올리는 중">
            <LoaderCircle size={20} className="animate-spin" />
          </div>
        ))}
        {left > 0 && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="grid size-24 place-items-center rounded-xl border border-dashed border-line-strong text-muted hover:bg-sunken hover:text-ink"
          >
            <span className="flex flex-col items-center gap-1 text-xs font-semibold"><Camera size={20} /> 사진 추가</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={pick} />
      {error && <p className="mt-1.5 text-sm text-accent">{error}</p>}
    </div>
  );
}

// 사진 보여 주기: 누르면 크게
export function PhotoStrip({ paths = [], className }) {
  const [open, setOpen] = useState(null);
  useEffect(() => {
    if (open == null) return;
    const esc = (e) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);
  if (!paths.length) return null;
  return (
    <>
      <div className={cx('grid gap-2', paths.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3', className)}>
        {paths.map((p, i) => (
          <button key={p} type="button" onClick={() => setOpen(i)} className="overflow-hidden rounded-xl bg-sunken" aria-label={`사진 ${i + 1} 크게 보기`}>
            <img src={photoUrl(p)} alt="" loading="lazy" className={cx('w-full object-cover transition-transform hover:scale-[1.02]', paths.length === 1 ? 'max-h-96' : 'aspect-square')} />
          </button>
        ))}
      </div>
      {open != null && (
        <div role="dialog" aria-label="사진" className="fixed inset-0 z-50 grid place-items-center bg-ink/90 p-4" onClick={() => setOpen(null)}>
          <img src={photoUrl(paths[open])} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
          <button type="button" aria-label="닫기" className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] grid size-11 place-items-center rounded-full bg-paper/15 text-paper" onClick={() => setOpen(null)}>
            <X size={20} />
          </button>
        </div>
      )}
    </>
  );
}
