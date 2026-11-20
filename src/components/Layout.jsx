import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { House, CalendarDays, NotebookPen, BookOpen, LogOut, Users, Eye, WifiOff, Download, Coffee, Images } from 'lucide-react';
import { useInstall, useOnline } from '../lib/pwa.js';
import InstallPrompt, { IosSteps } from './InstallPrompt.jsx';
import { useAuth } from '../lib/auth.jsx';
import { isConfigured } from '../lib/supabase.js';
import { CLUB } from '../lib/config.js';
import { Avatar, Notice, Spinner, cx } from './ui.jsx';

const NAV = [
  { to: '/', label: '홈', icon: House, end: true },
  { to: '/activities', label: '활동', icon: CalendarDays },
  { to: '/notes', label: '테이스팅 노트', short: '노트', icon: NotebookPen },
  { to: '/cafes', label: '카페 지도', short: '카페', icon: Coffee },
  { to: '/recipes', label: '레시피', icon: BookOpen },
  { to: '/gallery', label: '갤러리', icon: Images },
];

function MenuLink({ item, mobile = false }) {
  const { to, label, short, icon: Icon, end, disabled } = item;
  const style = mobile ? 'mobile-nav-link' : 'desktop-nav-link';
  const content = mobile ? <><Icon aria-hidden size={22} strokeWidth={1.8} />{short || label}</> : label;
  if (disabled) {
    return <span role="link" aria-disabled="true" className={style}>{content}</span>;
  }
  return <NavLink to={to} end={end} className={({ isActive }) => cx(style, isActive && 'is-current')}>{content}</NavLink>;
}

function NavIndicator() {
  const ref = useRef(null);
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const line = ref.current;
    const nav = line.parentElement;
    const active = nav.querySelector('a[aria-current="page"]');
    const align = () => {
      line.hidden = !active || !nav.clientWidth;
      if (line.hidden) return;
      const tab = active.getBoundingClientRect();
      line.style.width = `${tab.width}px`;
      line.style.transform = `translateX(${tab.left - nav.getBoundingClientRect().left}px)`;
    };
    align();
    const observer = new ResizeObserver(align);
    observer.observe(nav);
    nav.querySelectorAll('a').forEach((link) => observer.observe(link));
    return () => observer.disconnect();
  }, [pathname]);

  return <span ref={ref} className="nav-indicator" aria-hidden="true" />;
}

function Wordmark() {
  return (
    <Link to="/" className="wordmark" aria-label={`${CLUB.name} 홈`}>
      <img src={`${import.meta.env.BASE_URL}favicon.svg`} width="35" height="35" alt="" />
      <span><b>{CLUB.name}</b><small>Coffee Club</small></span>
    </Link>
  );
}

function AccountMenu() {
  const { user, displayName, avatar, isAdmin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-11 items-center gap-2 rounded-full pl-1.5 pr-3 transition-colors hover:bg-sunken"
      >
        <Avatar name={displayName} src={avatar} size={30} />
        <span className="max-w-[7rem] truncate text-sm font-semibold">{displayName}</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow-card)]">
          <p className="truncate px-3 pb-2 pt-1.5 text-xs text-muted">{user.email}</p>
          {isAdmin && (
            <Link role="menuitem" to="/members" className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-sunken">
              <Users size={16} /> 운영진 관리
            </Link>
          )}
          <button role="menuitem" type="button" onClick={signOut} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-sunken">
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      )}
    </div>
  );
}

function AuthArea() {
  const { user, loading, signIn } = useAuth();
  if (!isConfigured) return <PreviewInfo />;
  if (loading && !user) return <span className="h-10 w-24" />;
  if (user) return <AccountMenu />;
  return (
    <button type="button" onClick={signIn} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold transition-colors hover:bg-sunken">
      <GoogleMark /> 로그인
    </button>
  );
}

function PreviewInfo() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const trigger = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!ref.current?.contains(event.target)) setOpen(false); };
    const escape = (event) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button ref={trigger} type="button" aria-expanded={open} aria-controls="preview-info" onClick={() => setOpen(!open)} className="preview-toggle">
        <Eye size={15} /> 미리보기
      </button>
      <div id="preview-info" hidden={!open} className="preview-info">
        샘플 노트를 둘러볼 수 있어요. 표준 레시피와 레시피 타이머는 바로 사용할 수 있어요.
      </div>
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
        본문으로 건너뛰기
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="site-width flex h-16 items-center justify-between gap-3 md:h-[4.5rem]">
          <Wordmark />
          <nav aria-label="주요 메뉴" className="relative hidden h-full items-stretch gap-2 md:flex lg:gap-5">
            <NavIndicator />
            {NAV.map((item) => <MenuLink key={item.to} item={item} />)}
          </nav>
          <AuthArea />
        </div>
      </header>

      <OfflineNotice />

      <main id="main" className="site-width pb-28 pt-5 sm:pt-9 md:pb-16">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-line">
        <div className="site-width flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-6 text-sm text-muted sm:py-8">
          <p><span className="font-display font-semibold text-ink">{CLUB.name}</span> · {CLUB.school} {CLUB.tagline}</p>
          <div className="flex items-center gap-4">
            {CLUB.instagram && (
              <a href={`https://instagram.com/${CLUB.instagram}`} target="_blank" rel="noreferrer" className="-my-3 py-3 hover:text-ink">@{CLUB.instagram}</a>
            )}
            <InstallLink />
            <Link to="/privacy" className="-my-3 py-3 hover:text-ink">개인정보처리방침</Link>
          </div>
        </div>
      </footer>

      {pathname === '/' && <InstallPrompt />}

      {/* 모바일 하단 탭 — 브루잉 중 한 손으로 이동 */}
      <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <NavIndicator />
        <ul className="grid grid-flow-col auto-cols-fr">
          {NAV.map((item) => (
            <li key={item.to}><MenuLink item={item} mobile /></li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function OfflineNotice() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="site-width pt-4" role="status">
      <Notice icon={WifiOff}>
        <strong className="font-semibold">오프라인</strong> — 노트·활동은 연결되면 다시 불러와요. 표준 레시피와 레시피 타이머는 그대로 쓸 수 있어요.
      </Notice>
    </div>
  );
}

// 바닥글의 "앱으로 설치": 안내 배너를 닫은 사람도 언제든 설치할 수 있게
function InstallLink() {
  const { mode, install } = useInstall();
  const [open, setOpen] = useState(false);
  if (mode === 'installed' || mode === 'none') return null;
  if (mode === 'prompt') {
    return (
      <button type="button" onClick={install} className="-my-3 inline-flex items-center gap-1 py-3 hover:text-ink">
        <Download size={14} /> 앱으로 설치
      </button>
    );
  }
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="-my-3 inline-flex items-center gap-1 py-3 hover:text-ink">
        <Download size={14} /> 앱으로 설치
      </button>
      {open && (
        <div className="absolute bottom-full right-0 z-30 mb-3 w-64 rounded-2xl border border-line bg-surface p-4 text-left shadow-[var(--shadow-card)]">
          {mode === 'ios' ? (
            <>
              <span className="block font-semibold text-ink">홈 화면에 추가하기</span>
              <IosSteps />
            </>
          ) : (
            <span className="block text-sm text-ink-soft">
              카카오톡·인스타그램 안에서는 설치할 수 없어요. 오른쪽 위 메뉴에서 <strong className="font-semibold text-ink">다른 브라우저로 열기</strong>를 누른 뒤 설치해 주세요.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
