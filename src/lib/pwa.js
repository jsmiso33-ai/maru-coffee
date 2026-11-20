import { useEffect, useState, useSyncExternalStore } from 'react';

// ───── 서비스 워커 등록 (배포 빌드에서만 — 개발 중 캐시가 화면을 가리지 않게) ─────
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
  });
}

// ───── 설치 가능 여부 ─────
// beforeinstallprompt는 React가 뜨기 전에 올 수 있어 모듈 로드 시점부터 잡아 둔다.
let deferredPrompt = null;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emit();
  });
}

function subscribe(l) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

// 아이폰·아이패드 사파리: 설치 이벤트가 없어 "공유 → 홈 화면에 추가"를 안내해야 한다
export function isIosSafari() {
  const ua = window.navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const otherBrowser = /crios|fxios|edgios|kakaotalk|naver|instagram|line\//i.test(ua);
  return ios && !otherBrowser;
}

// 카카오톡·인스타그램 등 인앱 브라우저: 설치 불가 → 외부 브라우저로 열라고 안내
export function isInAppBrowser() {
  return /kakaotalk|instagram|naver|line\/|fban|fbav/i.test(window.navigator.userAgent);
}

export function useInstall() {
  const prompt = useSyncExternalStore(subscribe, () => deferredPrompt, () => null);
  const [standalone, setStandalone] = useState(() => isStandalone());

  useEffect(() => {
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const on = () => setStandalone(isStandalone());
    mq?.addEventListener?.('change', on);
    return () => mq?.removeEventListener?.('change', on);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    emit();
    return outcome === 'accepted';
  };

  let mode = 'none';
  if (standalone) mode = 'installed';
  else if (prompt) mode = 'prompt';
  else if (isInAppBrowser()) mode = 'inapp';
  else if (isIosSafari()) mode = 'ios';
  return { mode, install };
}

// ───── 온라인 여부 ─────
export function useOnline() {
  return useSyncExternalStore(
    (l) => {
      window.addEventListener('online', l);
      window.addEventListener('offline', l);
      return () => {
        window.removeEventListener('online', l);
        window.removeEventListener('offline', l);
      };
    },
    () => navigator.onLine,
    () => true,
  );
}
