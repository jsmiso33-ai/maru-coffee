import { useEffect, useRef, useState } from 'react';
import { Images, Plus, X } from 'lucide-react';
import { Button, Card, Notice, PageHeader, Spinner } from '../components/ui.jsx';
import { useAuth } from '../lib/auth.jsx';
import { useAsync } from '../lib/db.js';
import { formatDate } from '../lib/format.js';
import { listPhotos, PAGE_SIZE, publishPhoto, removePhoto } from '../lib/gallery.js';

function PhotoForm({ onPosted, onCancel }) {
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!file) { setPreview(''); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function submit(event) {
    event.preventDefault();
    if (!file || !caption.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await publishPhoto(file, caption.trim());
      onPosted();
    } catch (e) { setError(e.message); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="mb-6 grid max-w-xl gap-4 rounded-xl border border-line bg-surface p-5">
      <label className="grid gap-2 font-semibold">게시할 사진
        <input type="file" accept="image/jpeg,image/png,image/webp" required disabled={busy}
          className="w-full text-sm file:mr-3 file:rounded-lg file:bg-sunken file:px-3 file:py-3"
          onChange={(e) => { setFile(e.target.files[0] ?? null); setError(''); }} />
      </label>
      {preview && <img src={preview} alt="선택한 사진 미리보기" className="max-h-64 max-w-full rounded-lg object-contain" />}
      <label className="grid gap-2 font-semibold">사진 설명
        <input className="field" value={caption} maxLength={160} required disabled={busy}
          placeholder="예: 정기 모임에서 함께 내린 첫 드립" onChange={(e) => setCaption(e.target.value)} />
      </label>
      <p className="text-sm text-muted">게시하면 모든 방문자가 사진을 볼 수 있어요.</p>
      {error && <p role="alert" className="text-sm text-accent">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy || !file || !caption.trim()}>{busy ? '게시 중…' : '사진 게시'}</Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>취소</Button>
      </div>
    </form>
  );
}

function PhotoViewer({ photo, isAdmin, onClose, onRemoved }) {
  const ref = useRef(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  async function remove() {
    setBusy(true);
    try { await removePhoto(photo.name); onRemoved(); }
    catch (e) { setError(e.message); setBusy(false); }
  }
  return (
    <dialog ref={ref} aria-label="사진 크게 보기" onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }}
      className="fixed inset-0 m-auto max-h-[94dvh] w-[min(94vw,60rem)] overflow-auto rounded-xl bg-surface p-3 text-ink backdrop:bg-black/75 sm:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <time className="text-sm text-muted">{formatDate(photo.created_at)}</time>
        <button aria-label="닫기" disabled={busy} className="grid size-11 place-items-center rounded-lg hover:bg-sunken" onClick={onClose}><X size={20} /></button>
      </div>
      <img src={photo.url} alt={photo.caption} className="mx-auto max-h-[65dvh] w-full object-contain" />
      <p className="mt-3 font-medium">{photo.caption}</p>
      {isAdmin && <div className="mt-3 flex flex-wrap items-center gap-2">
        {confirming ? <>
          <span className="text-sm">이 사진을 갤러리에서 삭제할까요?</span>
          <Button size="sm" variant="danger" disabled={busy} onClick={remove}>{busy ? '삭제 중…' : '삭제하기'}</Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>취소</Button>
        </> : <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>사진 삭제</Button>}
      </div>}
      {error && <p role="alert" className="text-sm text-accent">{error}</p>}
    </dialog>
  );
}

export default function Gallery() {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState('');
  const { data, loading, error, reload } = useAsync(() => listPhotos(page), [page]);
  const photos = data?.slice(0, PAGE_SIZE) ?? [];
  const hasNext = data?.length > PAGE_SIZE;
  const firstPage = () => { if (page) setPage(0); else reload(); };
  return (
    <>
      <PageHeader eyebrow="Gallery" title="갤러리" action={isAdmin && !adding &&
        <Button onClick={() => { setAdding(true); setMessage(''); }}><Plus size={17} /> 사진 올리기</Button>}>
        마루의 모임과 커피를 사진으로 기록합니다.
      </PageHeader>
      {message && <p role="status" className="mb-4 text-sm text-ink-soft">{message}</p>}
      {isAdmin && adding && <PhotoForm onCancel={() => setAdding(false)} onPosted={() => {
        setAdding(false); setMessage('사진을 게시했어요.'); firstPage();
      }} />}
      {loading ? <Spinner /> : error ? <Notice tone="accent" action={<Button onClick={reload} size="sm">다시 시도</Button>}>{error}</Notice>
        : photos.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-5">
          {photos.map((photo) => <button key={photo.name} onClick={() => setSelected(photo)} className="group min-w-0 rounded-lg text-left">
            <img src={photo.url} alt="" loading="lazy" className="aspect-square w-full rounded-lg bg-sunken object-cover sm:aspect-[4/3]" />
            <span className="mt-2 block line-clamp-2 text-sm font-semibold group-hover:text-accent sm:text-base">{photo.caption}</span>
            <time className="mt-1 block text-xs text-muted">{formatDate(photo.created_at)}</time>
          </button>)}
        </div> : <Card className="grid justify-items-center gap-3 px-6 py-14 text-center">
          <Images size={32} strokeWidth={1.3} className="text-accent" />
          <h2 className="font-semibold">{page ? '이 페이지에는 사진이 없어요' : '아직 게시된 사진이 없어요'}</h2>
          <p className="text-sm text-muted">운영진이 선정한 모임 사진이 이곳에 모여요.</p>
        </Card>}
      {!loading && !error && (page > 0 || hasNext) && <div className="mt-6 flex items-center justify-center gap-3">
        <Button variant="outline" disabled={!page} onClick={() => setPage(page - 1)}>이전</Button>
        <span className="text-sm">{page + 1}페이지</span>
        <Button variant="outline" disabled={!hasNext} onClick={() => setPage(page + 1)}>다음</Button>
      </div>}
      {selected && <PhotoViewer photo={selected} isAdmin={isAdmin} onClose={() => setSelected(null)} onRemoved={() => {
        setSelected(null); setMessage('사진을 삭제했어요.'); firstPage();
      }} />}
    </>
  );
}
