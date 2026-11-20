import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import './index.css';
import { AuthProvider } from './lib/auth.jsx';
import { registerServiceWorker } from './lib/pwa.js';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
// 배포 직후엔 브라우저에 캐시된 옛 HTML이 지워진 청크를 찾다 실패할 수 있다 → 한 번만 새로고침
function page(load) {
  return lazy(() => load().then((mod) => {
    try { sessionStorage.removeItem('maru-chunk-reload'); } catch { /* noop */ }
    return mod;
  }, (err) => {
    try {
      if (!sessionStorage.getItem('maru-chunk-reload')) {
        sessionStorage.setItem('maru-chunk-reload', '1');
        window.location.reload();
        return new Promise(() => {});
      }
    } catch { /* storage 차단 시 그대로 오류 표시 */ }
    throw err;
  }));
}
const Notes = page(() => import('./pages/Notes.jsx'));
import { NotFound } from './pages/NotFound.jsx';
const NoteDetail = page(() => import('./pages/NoteDetail.jsx'));
const NoteForm = page(() => import('./pages/NoteForm.jsx'));
const Recipes = page(() => import('./pages/Recipes.jsx'));
const RecipeDetail = page(() => import('./pages/RecipeDetail.jsx'));
const RecipeForm = page(() => import('./pages/RecipeForm.jsx'));
const Members = page(() => import('./pages/Members.jsx'));
const Privacy = page(() => import('./pages/Privacy.jsx'));
const Activities = page(() => import('./pages/Activities.jsx'));
const Gallery = page(() => import('./pages/Gallery.jsx'));
const ActivityDetail = page(() => import('./pages/ActivityDetail.jsx'));
const ActivityForm = page(() => import('./pages/ActivityForm.jsx'));
const Cafes = page(() => import('./pages/Cafes.jsx'));
const CafeDetail = page(() => import('./pages/CafeDetail.jsx'));
const CafeForm = page(() => import('./pages/CafeForm.jsx'));
const CafeReviewForm = page(() => import('./pages/CafeReviewForm.jsx'));
const Profile = page(() => import('./pages/Profile.jsx'));
const MyProfile = page(() => import('./pages/Profile.jsx').then((m) => ({ default: m.MyProfile })));

// GitHub Pages는 SPA 라우팅을 모르므로 빌드 후 tools/postbuild.mjs가 index.html을 404.html 등으로 복사한다.
registerServiceWorker();

// 개발 서버 전용: /fonts 폰트 비교 화면과, 거기서 고른 폰트를 사이트 전체에 미리 적용 (배포 빌드에선 빠진다)
const FontLab = import.meta.env.DEV ? page(() => import('./pages/FontLab.jsx')) : null;
if (import.meta.env.DEV) import('./pages/FontLab.jsx').then((m) => m.applyFontPreview());

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="activities" element={<Activities />} />
            <Route path="gallery" element={<Gallery />} />
            <Route path="activities/new" element={<ActivityForm />} />
            <Route path="activities/:id" element={<ActivityDetail />} />
            <Route path="activities/:id/edit" element={<ActivityForm />} />
            <Route path="notes" element={<Notes />} />
            <Route path="notes/new" element={<NoteForm />} />
            <Route path="notes/:id" element={<NoteDetail />} />
            <Route path="notes/:id/edit" element={<NoteForm />} />
            <Route path="cafes" element={<Cafes />} />
            <Route path="cafes/new" element={<CafeForm />} />
            <Route path="cafes/:id" element={<CafeDetail />} />
            <Route path="cafes/:id/edit" element={<CafeForm />} />
            <Route path="cafes/:id/review" element={<CafeReviewForm />} />
            <Route path="people/:id" element={<Profile />} />
            <Route path="me" element={<MyProfile />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="recipes/new" element={<RecipeForm />} />
            <Route path="recipes/std/:id" element={<RecipeDetail standard />} />
            <Route path="recipes/:id" element={<RecipeDetail />} />
            <Route path="recipes/:id/edit" element={<RecipeForm />} />
            {/* 계산기·타이머 탭은 없앴다 — 예전 링크·앱 바로가기는 레시피로 */}
            <Route path="brew" element={<Navigate to="/recipes" replace />} />
            <Route path="members" element={<Members />} />
            <Route path="privacy" element={<Privacy />} />
            {FontLab && <Route path="fonts" element={<FontLab />} />}
            <Route path="*" element={<NotFound what="페이지" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
