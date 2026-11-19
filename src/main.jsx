import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import './index.css';
import { AuthProvider } from './lib/auth.jsx';
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
const Brew = page(() => import('./pages/Brew.jsx'));
const Members = page(() => import('./pages/Members.jsx'));
const Privacy = page(() => import('./pages/Privacy.jsx'));
const Activities = page(() => import('./pages/Activities.jsx'));
const ActivityDetail = page(() => import('./pages/ActivityDetail.jsx'));
const ActivityForm = page(() => import('./pages/ActivityForm.jsx'));

// GitHub Pages는 SPA 라우팅을 모르므로 빌드 후 tools/postbuild.mjs가 index.html을 404.html 등으로 복사한다.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="activities" element={<Activities />} />
            <Route path="activities/new" element={<ActivityForm />} />
            <Route path="activities/:id" element={<ActivityDetail />} />
            <Route path="activities/:id/edit" element={<ActivityForm />} />
            <Route path="notes" element={<Notes />} />
            <Route path="notes/new" element={<NoteForm />} />
            <Route path="notes/:id" element={<NoteDetail />} />
            <Route path="notes/:id/edit" element={<NoteForm />} />
            <Route path="recipes" element={<Recipes />} />
            <Route path="recipes/new" element={<RecipeForm />} />
            <Route path="recipes/std/:id" element={<RecipeDetail standard />} />
            <Route path="recipes/:id" element={<RecipeDetail />} />
            <Route path="recipes/:id/edit" element={<RecipeForm />} />
            <Route path="brew" element={<Brew />} />
            <Route path="members" element={<Members />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="*" element={<NotFound what="페이지" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
