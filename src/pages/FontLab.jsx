import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import NoteCard from '../components/NoteCard.jsx';
import { Button, FlavorChip, cx } from '../components/ui.jsx';
import { SAMPLE_NOTES } from '../data/sampleNotes.js';

// 개발 서버 전용 폰트 비교 화면 (/fonts) — 배포 빌드에는 포함되지 않는다.
// 영문 크림슨 제목(Fraunces)은 그대로 두고 한글 본문 폰트만 바꿔 본다.

const LINKS = [
  'https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/variable/woff2/SUIT-Variable.css',
  'https://cdn.jsdelivr.net/gh/wanteddev/wanted-sans@v1.0.3/packages/wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.min.css',
  'https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=Gowun+Batang:wght@400;700&display=swap',
];

// 네이버 한글 폰트는 굵기마다 이름이 달라서, 한 이름 아래 굵기별로 다시 묶는다
const NAVER = 'https://hangeul.pstatic.net/hangeul_static/webfont';
const FACES = `
@font-face { font-family: 'MaruBuri Lab'; font-weight: 300; src: url(${NAVER}/MaruBuri/MaruBuri-Light.woff2) format('woff2'); font-display: swap; }
@font-face { font-family: 'MaruBuri Lab'; font-weight: 400; src: url(${NAVER}/MaruBuri/MaruBuri-Regular.woff2) format('woff2'); font-display: swap; }
@font-face { font-family: 'MaruBuri Lab'; font-weight: 600; src: url(${NAVER}/MaruBuri/MaruBuri-SemiBold.woff2) format('woff2'); font-display: swap; }
@font-face { font-family: 'MaruBuri Lab'; font-weight: 700; src: url(${NAVER}/MaruBuri/MaruBuri-Bold.woff2) format('woff2'); font-display: swap; }
@font-face { font-family: 'NanumSquareNeo Lab'; font-weight: 300; src: url(${NAVER}/NanumSquareNeo/NanumSquareNeoTTF-aLt.woff) format('woff'); font-display: swap; }
@font-face { font-family: 'NanumSquareNeo Lab'; font-weight: 400; src: url(${NAVER}/NanumSquareNeo/NanumSquareNeoTTF-bRg.woff) format('woff'); font-display: swap; }
@font-face { font-family: 'NanumSquareNeo Lab'; font-weight: 700; src: url(${NAVER}/NanumSquareNeo/NanumSquareNeoTTF-cBd.woff) format('woff'); font-display: swap; }
@font-face { font-family: 'NanumSquareNeo Lab'; font-weight: 800; src: url(${NAVER}/NanumSquareNeo/NanumSquareNeoTTF-dEb.woff) format('woff'); font-display: swap; }
`;

const FALLBACK = "-apple-system, BlinkMacSystemFont, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif";
export const FONT_CANDIDATES = [
  { id: 'pretendard', name: 'Pretendard', ko: '프리텐다드', note: '지금 쓰는 폰트. 깔끔하고 무난한 고딕', stack: `'Pretendard Variable', Pretendard, ${FALLBACK}` },
  { id: 'suit', name: 'SUIT', ko: '수트', note: '조금 더 단단하고 또렷한 고딕. 숫자가 예쁨', stack: `'SUIT Variable', ${FALLBACK}` },
  { id: 'wanted', name: 'Wanted Sans', ko: '원티드 산스', note: '폭이 살짝 넓고 현대적인 고딕', stack: `'Wanted Sans Variable', ${FALLBACK}` },
  { id: 'nanumsquare', name: 'NanumSquare Neo', ko: '나눔스퀘어 네오', note: '네모반듯하고 귀여운 느낌의 고딕', stack: `'NanumSquareNeo Lab', ${FALLBACK}` },
  { id: 'gowun-dodum', name: 'Gowun Dodum', ko: '고운돋움', note: '둥글고 따뜻한, 손글씨 기운이 있는 고딕', stack: `'Gowun Dodum', ${FALLBACK}` },
  { id: 'maruburi', name: 'MaruBuri', ko: '마루 부리', note: '붓으로 쓴 듯한 부드러운 명조. 동아리 이름과 같아요', stack: `'MaruBuri Lab', 'Noto Serif KR', serif` },
  { id: 'gowun-batang', name: 'Gowun Batang', ko: '고운바탕', note: '단정하고 따뜻한 명조. 잡지·저널 느낌', stack: `'Gowun Batang', 'Noto Serif KR', serif` },
];

const PREVIEW_KEY = 'maru-font-preview';

// 개발 중 "이 폰트로 사이트 전체 보기"를 누르면 :root의 --font-sans를 바꿔 둔다
export function applyFontPreview() {
  try {
    const id = localStorage.getItem(PREVIEW_KEY);
    const f = FONT_CANDIDATES.find((x) => x.id === id);
    if (f) {
      loadFonts();
      document.documentElement.style.setProperty('--font-sans', f.stack);
    }
  } catch { /* noop */ }
}

let loaded = false;
function loadFonts() {
  if (loaded) return;
  loaded = true;
  LINKS.forEach((href) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
  });
  const st = document.createElement('style');
  st.textContent = FACES;
  document.head.appendChild(st);
}

export default function FontLab() {
  const [active, setActive] = useState(() => { try { return localStorage.getItem(PREVIEW_KEY) || 'pretendard'; } catch { return 'pretendard'; } });
  useEffect(loadFonts, []);

  const useSiteWide = (f) => {
    setActive(f.id);
    try { localStorage.setItem(PREVIEW_KEY, f.id); } catch { /* noop */ }
    document.documentElement.style.setProperty('--font-sans', f.stack);
  };

  const note = SAMPLE_NOTES[0];
  return (
    <div>
      <header className="page-heading">
        <div>
          <h1 className="page-title-en"><span aria-hidden>Fonts</span><span className="sr-only">폰트 비교</span></h1>
          <p className="mt-1.5 text-[0.95rem] text-muted">같은 화면을 폰트만 바꿔 나란히 놓았어요. 마음에 드는 걸 누르면 사이트 전체가 그 폰트로 바뀌어요(이 컴퓨터에서만).</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {FONT_CANDIDATES.map((f) => (
          <section
            key={f.id}
            aria-label={f.ko}
            className={cx('rounded-[var(--radius-card)] border bg-surface p-5 sm:p-6', active === f.id ? 'border-accent ring-2 ring-accent/30' : 'border-line')}
            style={{ fontFamily: f.stack }}
          >
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
              <p>
                <strong className="text-xl">{f.ko}</strong>
                <span className="ml-2 text-sm text-muted">{f.name}</span>
              </p>
              <button
                type="button"
                onClick={() => useSiteWide(f)}
                className={cx('h-10 rounded-full px-4 text-sm font-semibold', active === f.id ? 'bg-accent text-white' : 'border border-line-strong hover:bg-sunken')}
                style={{ fontFamily: 'inherit' }}
              >
                {active === f.id ? '사이트에 적용 중' : '이 폰트로 사이트 보기'}
              </button>
            </div>
            <p className="mb-4 text-sm text-muted">{f.note}</p>

            {/* 실제 화면 조각들 */}
            <h2 className="page-title-en !text-[2rem]">Tasting Notes</h2>
            <p className="mt-1 text-[0.95rem] text-muted">부원들이 마신 커피 기록이에요.</p>
            <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-soft">
              같은 원두도 사람마다 다르게 마신다. 마루에서 함께 내린 커피와 각자의 취향을 기록합니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="accent"><Plus size={16} /> 노트 쓰기</Button>
              <Button variant="outline">카페 지도</Button>
            </div>
            <div className="relative mt-4">
              <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input className="field pl-10" style={{ fontFamily: 'inherit' }} placeholder="원두, 로스터리, 향미, 작성자 검색" readOnly />
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {['블루베리', '자스민', '밀크초콜릿', '꿀'].map((x) => <FlavorChip key={x} name={x} />)}
            </div>
            <div className="mt-4 max-w-md">
              <NoteCard note={{ ...note, id: `font-${f.id}` }} />
            </div>
            <p className="mt-4 text-sm text-muted tnum">원두 20g · 물 300g · 1:15 · 92°C · 3:30 · 2026.11.21</p>
          </section>
        ))}
      </div>
    </div>
  );
}
