import { useEffect, useState } from 'react';
import { Download, Share, SquarePlus, X } from 'lucide-react';
import { useInstall } from '../lib/pwa.js';
import { cx } from './ui.jsx';

const DISMISS_KEY = 'maru-install-dismissed';
const DISMISS_DAYS = 30;

function recentlyDismissed() {
  try {
    const t = Number(localStorage.getItem(DISMISS_KEY));
    return t && Date.now() - t < DISMISS_DAYS * 86400000;
  } catch {
    return false;
  }
}

// 홈 화면 하단에 한 번 뜨는 설치 안내. 닫으면 30일 동안 다시 안 뜬다.
export default function InstallPrompt() {
  const { mode, install } = useInstall();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (mode !== 'prompt' && mode !== 'ios') return;
    if (recentlyDismissed()) return;
    const t = setTimeout(() => setVisible(true), 2500);
    return () => clearTimeout(t);
  }, [mode]);

  if (!visible || (mode !== 'prompt' && mode !== 'ios')) return null;

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* noop */ }
  };

  return (
    <div
      role="dialog"
      aria-label="앱 설치 안내"
      className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mx-auto max-w-md rounded-2xl border border-line bg-surface p-4 shadow-[0_12px_40px_-12px_rgb(42_31_26/0.35)] md:bottom-6 md:left-auto md:right-6"
    >
      <div className="flex items-start gap-3">
        <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="font-bold">MARU를 앱으로 쓰기</p>
          {mode === 'prompt' ? (
            <p className="mt-0.5 text-sm text-muted">홈 화면에서 바로 열리고, 인터넷이 없어도 타이머·계산기를 쓸 수 있어요.</p>
          ) : (
            <IosSteps />
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label="닫기" className="-mr-1.5 -mt-1.5 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken">
          <X size={18} />
        </button>
      </div>
      {mode === 'prompt' && (
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={dismiss} className="h-11 rounded-full px-4 text-sm font-semibold text-ink-soft hover:bg-sunken">나중에</button>
          <button
            type="button"
            onClick={async () => { if (await install()) setVisible(false); }}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink-soft"
          >
            <Download size={16} /> 설치
          </button>
        </div>
      )}
    </div>
  );
}

export function IosSteps({ className }) {
  return (
    <ol className={cx('mt-1 space-y-1 text-sm text-ink-soft', className)}>
      <li className="flex items-center gap-1.5">
        <span className="font-semibold text-muted tnum">1</span> 아래 <Share size={15} className="text-[#0a84ff]" aria-label="공유" /> 공유 버튼 누르기
      </li>
      <li className="flex items-center gap-1.5">
        <span className="font-semibold text-muted tnum">2</span> <SquarePlus size={15} aria-hidden /> <strong className="font-semibold">홈 화면에 추가</strong> 선택
      </li>
    </ol>
  );
}
