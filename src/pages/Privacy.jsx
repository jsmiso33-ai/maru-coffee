import { CLUB } from '../lib/config.js';
import { PageHeader } from '../components/ui.jsx';

const UPDATED = '2026-11-20';

export default function Privacy() {
  const contact = CLUB.contact
    ? <a href={`mailto:${CLUB.contact}`} className="font-semibold text-ink underline underline-offset-2">{CLUB.contact}</a>
    : `${CLUB.name} 회장`;

  return (
    <article className="mx-auto max-w-2xl">
      <PageHeader eyebrow="Privacy" title="개인정보처리방침">
        {CLUB.school} {CLUB.tagline} {CLUB.name}(이하 “동아리”)의 부원용 웹사이트가 어떤 정보를 왜 쓰는지 설명합니다.
      </PageHeader>

      <div className="space-y-8 leading-relaxed text-ink-soft [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
        <section>
          <h2>1. 수집하는 정보</h2>
          <p>구글 계정으로 로그인하면 구글이 제공하는 아래 정보만 받습니다.</p>
          <ul>
            <li>이메일 주소 — 로그인 확인과 운영진 권한 확인</li>
            <li>이름, 프로필 사진 — 작성한 노트·레시피에 작성자로 표시</li>
          </ul>
          <p className="mt-2">로그인하지 않고 노트·레시피·계산기를 보는 것만으로는 개인정보를 수집하지 않습니다. 비밀번호는 사이트가 받지도, 저장하지도 않습니다.</p>
        </section>

        <section>
          <h2>2. 직접 올리는 정보</h2>
          <p>부원이 작성한 테이스팅 노트와 레시피는 작성자 이름·사진과 함께 <strong className="font-semibold text-ink">사이트 방문자 누구나 볼 수 있습니다.</strong> 공개되면 곤란한 내용은 적지 말아 주세요.</p>
        </section>

        <section>
          <h2>3. 이용 목적</h2>
          <ul>
            <li>로그인 유지와 운영진 권한 확인</li>
            <li>작성자 표시, 본인 글 수정·삭제 권한 확인</li>
          </ul>
          <p className="mt-2">광고, 마케팅, 외부 제공 목적으로는 쓰지 않으며 분석·추적 도구도 사용하지 않습니다.</p>
        </section>

        <section>
          <h2>4. 보관과 처리</h2>
          <p>정보는 데이터베이스·로그인 서비스인 Supabase에 저장됩니다. 운영진 명단(이메일)은 운영진만 볼 수 있습니다. 로그인 상태는 이용자 브라우저에 저장되며 로그아웃하면 지워집니다.</p>
        </section>

        <section>
          <h2>5. 보관 기간과 삭제</h2>
          <p>탈퇴하거나 삭제를 요청하면 로그인 계정 정보를 지체 없이 삭제합니다. 작성한 노트·레시피는 본인이 언제든 직접 삭제할 수 있고, 요청 시 운영진이 함께 삭제합니다.</p>
        </section>

        <section>
          <h2>6. 문의</h2>
          <p>개인정보 관련 문의나 삭제 요청: {contact}</p>
        </section>

        <p className="border-t border-line pt-5 text-sm text-muted">시행일 {UPDATED}</p>
      </div>
    </article>
  );
}
