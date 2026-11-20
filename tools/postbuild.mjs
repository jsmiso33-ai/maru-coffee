// GitHub Pages용 후처리.
// · 404.html: 모르는 경로로 직접 들어와도 SPA가 뜨게 한다 (상태 코드는 404).
// · 공개 고정 페이지(개인정보처리방침 등)는 실제 폴더로 복사해 200으로 응답하게 한다
//   — 구글 OAuth 동의 화면 검사처럼 상태 코드를 보는 크롤러를 위해.
// · sw.js: 빌드 결과물 목록으로 서비스 워커(PWA 오프라인 캐시)를 만든다.
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const STATIC_ROUTES = ['privacy', 'activities', 'notes', 'recipes', 'brew'];

// 라우트 폴더 복사본·404.html은 index.html과 같으므로 미리 받을 목록에서 뺀다
function listFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? listFiles(full) : [full];
  });
}
const precache = listFiles('dist')
  .map((f) => relative('dist', f).replaceAll('\\', '/'))
  .filter((f) => f !== 'sw.js' && !f.endsWith('.map'))
  .sort();

const hash = createHash('sha256');
for (const f of precache) hash.update(f).update(readFileSync(join('dist', f)));
const version = hash.digest('hex').slice(0, 12);

const sw = readFileSync('tools/sw-template.js', 'utf8')
  .replace('__VERSION__', version)
  .replace('__PRECACHE__', JSON.stringify(precache));
writeFileSync('dist/sw.js', sw);

copyFileSync('dist/index.html', 'dist/404.html');
for (const route of STATIC_ROUTES) {
  mkdirSync(`dist/${route}`, { recursive: true });
  copyFileSync('dist/index.html', `dist/${route}/index.html`);
}

console.log(`sw.js ${version} · 미리 받을 파일 ${precache.length}개`);
