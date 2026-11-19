// GitHub Pages용 후처리.
// · 404.html: 모르는 경로로 직접 들어와도 SPA가 뜨게 한다 (상태 코드는 404).
// · 공개 고정 페이지(개인정보처리방침 등)는 실제 폴더로 복사해 200으로 응답하게 한다
//   — 구글 OAuth 동의 화면 검사처럼 상태 코드를 보는 크롤러를 위해.
import { copyFileSync, mkdirSync } from 'node:fs';

const STATIC_ROUTES = ['privacy', 'notes', 'recipes', 'brew'];

copyFileSync('dist/index.html', 'dist/404.html');
for (const route of STATIC_ROUTES) {
  mkdirSync(`dist/${route}`, { recursive: true });
  copyFileSync('dist/index.html', `dist/${route}/index.html`);
}
