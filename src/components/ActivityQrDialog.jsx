import { useEffect, useRef, useState } from 'react';
import { useHref } from 'react-router';
import { Download, Link2, X } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from './ui.jsx';

export default function ActivityQrDialog({ activity, onClose }) {
  const dialogRef = useRef(null);
  const canvasRef = useRef(null);
  const [copyStatus, setCopyStatus] = useState('idle');
  const href = useHref(`/activities/${activity.id}`);
  const url = new URL(href, window.location.origin).href;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  function close() {
    dialogRef.current.close();
    onClose();
  }

  function saveImage() {
    const link = document.createElement('a');
    link.href = canvasRef.current.toDataURL('image/png');
    link.download = `마루-${activity.title}-QR.png`;
    link.click();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('manual');
    }
  }

  return (
    <dialog ref={dialogRef} aria-labelledby="activity-qr-title" aria-describedby="activity-qr-hint"
      onCancel={(event) => { event.preventDefault(); close(); }}
      className="fixed inset-0 m-auto max-h-[92dvh] w-[min(92vw,26rem)] overflow-auto rounded-2xl border border-line bg-surface p-5 text-ink backdrop:bg-black/60 sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <h2 id="activity-qr-title" className="min-w-0 self-center text-xl font-bold break-words">{activity.title}</h2>
        <Button variant="ghost" className="size-11 shrink-0 !p-0" aria-label="닫기" onClick={close}><X size={20} /></Button>
      </div>
      <p id="activity-qr-hint" className="mt-1 text-sm text-muted">휴대폰 카메라로 QR을 찍으면 이 활동이 열려요.</p>
      <QRCodeCanvas ref={canvasRef} value={url} size={640} level="M" marginSize={4}
        role="img" aria-label={`${activity.title} 활동 QR 코드`}
        className="mx-auto my-5 block !h-auto !w-full max-w-80" />
      <div className="grid grid-cols-2 gap-2">
        <Button className="!px-2" onClick={saveImage}><Download size={16} /> QR 저장</Button>
        <Button className="!px-2" variant="outline" onClick={copyLink}><Link2 size={16} /> 링크 복사</Button>
      </div>
      <p role="status" className="text-sm text-ink-soft empty:hidden mt-2">
        {copyStatus === 'copied' && '활동 링크를 복사했어요.'}
        {copyStatus === 'manual' && '아래 주소를 길게 눌러 복사해 주세요.'}
      </p>
      {copyStatus === 'manual' && (
        <input aria-label="활동 주소" readOnly value={url} onFocus={(event) => event.target.select()}
          className="mt-1 w-full rounded-lg border border-line p-2 text-base" />
      )}
    </dialog>
  );
}
