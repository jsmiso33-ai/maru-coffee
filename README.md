# MARU — 고려대 스페셜티 커피 소모임

부원용 웹사이트. Vite + React 19 + Tailwind v4 + Supabase(구글 로그인), GitHub Pages 배포.

## 기능
- **활동** — 운영진이 일자별 모임(날짜·시간·장소·준비물·마실 원두)을 등록, 월간 캘린더 + 다가오는/지난 활동 목록, 활동별로 원두마다 부원 노트 평균(별점·맛 프로필·향미) 비교
- **테이스팅 노트** — 원두·산지·가공·로스팅·추출, 5개 감각 항목(산미·단맛·바디·쓴맛·여운) 레이더 차트, 향미 태그, 반 별점, 검색·필터
- **브루잉 레시피** — MARU 표준 레시피 8종 + 부원 레시피 공유, 원두 양에 맞춰 자동 스케일링
- **계산기·타이머** — 비율 계산(물↔원두 양방향), 뜸·나눠 붓기 스케줄 자동 생성, 단계별 알림음·진동, 화면 꺼짐 방지
- **추출 수율 계산** — TDS → EY, 브루잉 컨트롤 차트 표시
- **부원 관리** — 관리자만. 명단(이메일)에 있는 구글 계정만 글쓰기 가능

Supabase를 연결하지 않으면 "미리보기 모드"로 돌아간다(샘플 노트, 읽기 전용).

## 로컬 실행
```bash
npm install
cp .env.example .env   # Supabase URL·anon 키 입력 (없어도 미리보기 모드로 실행됨)
npm run dev            # http://localhost:5180
```
개발 서버에서는 주소 뒤에 `?preview`를 붙이면 로그인 없이 작성 화면을 볼 수 있다 (예: `/notes/new?preview`).

## Supabase 설정 (최초 1회)
1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성
2. SQL Editor에 `supabase/schema.sql` 붙여넣기 → 맨 아래 이메일을 **회장 본인 구글 이메일**로 바꾸고 Run
   - 이어서 `supabase/migrations/` 안의 파일을 번호 순서대로 하나씩 붙여넣고 Run (여러 번 실행해도 안전)
3. Authentication → Sign In / Providers → **Google** 활성화
   - Google Cloud Console → API 및 서비스 → 사용자 인증 정보 → OAuth 클라이언트 ID(웹) 생성
   - 승인된 리디렉션 URI: `https://<프로젝트ref>.supabase.co/auth/v1/callback`
   - 클라이언트 ID/보안 비밀을 Supabase에 입력
4. Authentication → URL Configuration
   - Site URL: 배포 주소 (예: `https://<계정>.github.io/maru-coffee/`)
   - Redirect URLs: 배포 주소 + `http://localhost:5180/**`
5. Settings → API에서 Project URL, anon 키를 복사해 `.env`와 GitHub 저장소 Variables에 등록

## 배포
`.github/workflows/deploy.yml` — main에 푸시하면 자동 배포.
- 저장소 Settings → Pages → Source: **GitHub Actions**
- Settings → Secrets and variables → Actions → **Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `BASE_PATH`(`/maru-coffee/`, 커스텀 도메인이면 생략)

## 자주 바꿀 곳
- 동아리 이름·소개·인스타: `src/lib/config.js`
- 표준 레시피: `src/data/recipes.js`
- 향미 목록: `src/data/flavors.js` / 선택지(가공·로스팅·추출): `src/data/options.js`
- 색·폰트: `src/index.css`의 `@theme`
