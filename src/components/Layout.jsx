import { Suspense, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { House, NotebookPen, BookOpen, Timer, LogOut, Users, Eye } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { isConfigured } from '../lib/supabase.js';
import { CLUB } from '../lib/config.js';
import { Avatar, Notice, Spinner, cx } from './ui.jsx';

const NAV = [
  { to: '/', label: '홈', icon: House, end: true },
  { to: '/notes', label: '테이스팅 노트', short: '노트', icon: NotebookPen },
  { to: '/recipes', label: '레시피', icon: BookOpen },
  { to: '/brew', label: '계산기·타이머', short: '브루잉', icon: Timer },
];

function Wordmark() {
  return (
    <Link to="/" className="group flex items-baseline gap-2 py-2.5" aria-label={`${CLUB.name} 홈`}>
      <span className="font-display text-[1.6rem] font-semibold leading-none tracking-[-0.02em]">{CLUB.name}</span>
      <span className="hidden text-xs font-medium text-muted sm:inline">{CLUB.tagline}</span>
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
              <Users size={16} /> 부원 관리
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
  if (!isConfigured) return null;
  if (loading && !user) return <span className="h-10 w-24" />;
  if (user) return <AccountMenu />;
  return (
    <button type="button" onClick={signIn} className="inline-flex h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold transition-colors hover:bg-sunken">
      <GoogleMark /> 로그인
    </button>
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
      <header className="sticky top-0 z-20 border-b border-line/80 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
          <Wordmark />
          <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => cx(
                  'rounded-full px-3.5 py-2 text-[0.95rem] font-semibold transition-colors',
                  isActive ? 'bg-ink text-paper' : 'text-ink-soft hover:bg-sunken',
                )}
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <AuthArea />
        </div>
      </header>

      {!isConfigured && (
        <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
          <Notice icon={Eye}>
            <strong className="font-semibold">미리보기 모드</strong> — Supabase가 아직 연결되지 않아 샘플 노트만 보여요. 계산기·타이머·표준 레시피는 그대로 쓸 수 있어요.
          </Notice>
        </div>
      )}

      <main id="main" className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-6 text-sm text-muted sm:px-6 sm:py-8">
          <p><span className="font-display font-semibold text-ink">{CLUB.name}</span> · {CLUB.school} {CLUB.tagline}</p>
          <div className="flex items-center gap-4">
            {CLUB.instagram && (
              <a href={`https://instagram.com/${CLUB.instagram}`} target="_blank" rel="noreferrer" className="-my-3 py-3 hover:text-ink">@{CLUB.instagram}</a>
            )}
            <Link to="/privacy" className="-my-3 py-3 hover:text-ink">개인정보처리방침</Link>
          </div>
        </div>
      </footer>

      {/* 모바일 하단 탭 — 브루잉 중 한 손으로 이동 */}
      <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-4">
          {NAV.map(({ to, label, short, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) => cx(
                  'flex h-[4.25rem] flex-col items-center justify-center gap-1 text-[0.72rem] font-semibold',
                  isActive ? 'text-accent' : 'text-muted',
                )}
              >
                <Icon size={22} strokeWidth={1.8} />
                {short || label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
