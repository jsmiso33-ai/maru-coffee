import { Lock, UserRoundX } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';
import { isConfigured } from '../lib/supabase.js';
import { Button, Card, Spinner } from './ui.jsx';
import { GoogleMark } from './Layout.jsx';

// 부원만 볼 수 있는 화면(작성·수정·관리)을 감싼다.
export default function MemberGate({ children, admin = false, what = '글을 쓰려면' }) {
  const { user, loading, isMember, isAdmin, signIn, signOut } = useAuth();

  // 로컬 개발 전용: ?preview 를 붙이면 로그인 없이 작성 화면을 미리 볼 수 있다 (배포 빌드에선 제거됨)
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('preview')) return children;

  if (!isConfigured) {
    return (
      <GateCard icon={Lock} title="아직 준비 중이에요">
        Supabase가 연결되면 부원들이 직접 노트와 레시피를 올릴 수 있어요.
      </GateCard>
    );
  }
  if (loading) return <Spinner />;
  if (!user) {
    return (
      <GateCard icon={Lock} title={`${what} 로그인이 필요해요`}>
        부원 명단에 등록된 구글 계정으로 로그인해 주세요.
        <div className="mt-5">
          <Button variant="outline" onClick={signIn}><GoogleMark /> 구글로 로그인</Button>
        </div>
      </GateCard>
    );
  }
  if (admin ? !isAdmin : !isMember) {
    return (
      <GateCard icon={UserRoundX} title={admin ? '관리자만 볼 수 있어요' : '부원 명단에 없는 계정이에요'}>
        {admin ? '부원 관리는 회장·운영진 계정에서만 열려요.' : (
          <>
            <strong className="font-semibold text-ink">{user.email}</strong> 을(를) 회장에게 알려 주면 명단에 추가해 줄 거예요.
            다른 계정으로 로그인했다면 로그아웃 후 다시 시도해 주세요.
          </>
        )}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={signOut}>로그아웃</Button>
          <Button variant="ghost" to="/">홈으로</Button>
        </div>
      </GateCard>
    );
  }
  return children;
}

function GateCard({ icon: Icon, title, children }) {
  return (
    <Card className="mx-auto mt-6 max-w-md px-6 py-10 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-sunken text-ink-soft"><Icon size={22} /></span>
      <h2 className="mt-4 text-lg font-bold">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div>
    </Card>
  );
}
