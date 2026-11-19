import { StrictMode, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import './index.css';
import { AuthProvider } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
const Notes = lazy(() => import('./pages/Notes.jsx'));
import { NotFound } from './pages/NotFound.jsx';
const NoteDetail = lazy(() => import('./pages/NoteDetail.jsx'));
const NoteForm = lazy(() => import('./pages/NoteForm.jsx'));
const Recipes = lazy(() => import('./pages/Recipes.jsx'));
const RecipeDetail = lazy(() => import('./pages/RecipeDetail.jsx'));
const RecipeForm = lazy(() => import('./pages/RecipeForm.jsx'));
const Brew = lazy(() => import('./pages/Brew.jsx'));
const Members = lazy(() => import('./pages/Members.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));

// GitHub Pages는 SPA 라우팅을 모르므로 빌드 후 tools/postbuild.mjs가 index.html을 404.html 등으로 복사한다.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
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
