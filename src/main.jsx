import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import './index.css';
import { AuthProvider } from './lib/auth.jsx';
import Layout from './components/Layout.jsx';
import Home from './pages/Home.jsx';
import Notes from './pages/Notes.jsx';
import NoteDetail, { NotFound } from './pages/NoteDetail.jsx';
import NoteForm from './pages/NoteForm.jsx';
import Recipes from './pages/Recipes.jsx';
import RecipeDetail from './pages/RecipeDetail.jsx';
import RecipeForm from './pages/RecipeForm.jsx';
import Brew from './pages/Brew.jsx';
import Members from './pages/Members.jsx';

// GitHub Pages는 SPA 라우팅을 모르므로 빌드 때 index.html을 404.html로 복사해 둔다(package.json build).
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
            <Route path="*" element={<NotFound what="페이지" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
