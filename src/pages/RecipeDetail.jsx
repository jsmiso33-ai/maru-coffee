import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Minus, Pencil, Plus, Trash2 } from 'lucide-react';
import { findStandardRecipe } from '../data/recipes.js';
import { deleteRecipe, getRecipe, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { Avatar, Button, Card, Notice, Spinner } from '../components/ui.jsx';
import BrewTimer from '../components/BrewTimer.jsx';
import { formatDuration, mmss, ratioOf, round1 } from '../lib/format.js';
import { NotFound } from './NotFound.jsx';

export default function RecipeDetail({ standard = false }) {
  const { id } = useParams();
  const { data, loading, error } = useAsync(
    () => (standard ? Promise.resolve(findStandardRecipe(id)) : getRecipe(id)),
    [id, standard],
  );
  if (loading) return <Spinner />;
  if (error) return <Notice tone="accent">{error}</Notice>;
  if (!data) return <NotFound what="레시피" />;
  return <RecipeView recipe={data} standard={standard} key={data.id} />;
}

function RecipeView({ recipe, standard }) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const baseDose = Number(recipe.dose_g);
  const [doseText, setDoseText] = useState(String(baseDose));
  const parsed = Number(doseText);
  const dose = parsed > 0 && parsed <= 500 ? parsed : baseDose;
  const setDose = (fn) => setDoseText(String(fn(dose)));
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState('');

  const k = dose / baseDose;
  const water = Math.round(Number(recipe.water_g) * k);
  const steps = useMemo(
    () => (recipe.steps || []).map((s) => ({ ...s, target: s.target != null ? Math.round(s.target * k) : null })),
    [recipe.steps, k],
  );

  const isOwner = !standard && user && recipe.user_id === user.id;
  const canDelete = !standard && (isOwner || isAdmin);
  const step = baseDose >= 50 ? 10 : 1;

  const remove = async () => {
    try {
      await deleteRecipe(recipe.id);
      navigate('/recipes?tab=members', { replace: true });
    } catch (e) {
      setActionError(e.message);
    }
  };

  return (
    <article className="mx-auto max-w-5xl">
      <Link to={standard ? '/recipes' : '/recipes?tab=members'} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> 레시피
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{recipe.method}</span>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{recipe.title}</h1>
          {standard ? (
            <p className="mt-2 text-sm text-muted">MARU 표준{recipe.credit ? ` · 참고: ${recipe.credit}` : ''}</p>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
              <Avatar name={recipe.author_name} src={recipe.author_avatar} size={24} /> {recipe.author_name}
            </p>
          )}
          {recipe.memo && <p className="mt-5 whitespace-pre-line leading-relaxed text-ink-soft">{recipe.memo}</p>}
          {recipe.bean_hint && <p className="mt-3 text-sm text-muted">추천 원두 · {recipe.bean_hint}</p>}

          <Card className="mt-6 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">원두 양</p>
                <p className="text-xs text-muted">바꾸면 물과 단계별 목표가 같이 바뀌어요</p>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="원두 줄이기" onClick={() => setDose((d) => Math.max(step, round1(d - step)))} className="grid size-10 place-items-center rounded-full border border-line hover:bg-sunken"><Minus size={16} /></button>
                <label className="relative">
                  <span className="sr-only">원두 양(g)</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={1}
                    max={500}
                    value={doseText}
                    onChange={(e) => setDoseText(e.target.value)}
                    onBlur={() => setDoseText(String(dose))}
                    className="field h-10 w-20 px-2 text-center font-display text-xl tnum"
                  />
                </label>
                <button type="button" aria-label="원두 늘리기" onClick={() => setDose((d) => Math.min(500, round1(d + step)))} className="grid size-10 place-items-center rounded-full border border-line hover:bg-sunken"><Plus size={16} /></button>
              </div>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-line pt-5 sm:grid-cols-3">
              {[
                [recipe.yieldLabel || '물', `${water}g`],
                ['비율', `1:${ratioOf(recipe.dose_g, recipe.water_g)}`],
                ['물 온도', recipe.water_temp != null ? `${recipe.water_temp}°C` : '—'],
                ['분쇄도', recipe.grind || '—'],
                ['총 시간', formatDuration(recipe.total_time_s)],
              ].map(([key, v]) => (
                <div key={key}>
                  <dt className="text-xs text-muted">{key}</dt>
                  <dd className="mt-0.5 font-semibold tnum">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {(isOwner || canDelete) && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {confirming ? (
                <>
                  <span className="text-sm text-ink-soft">삭제할까요?</span>
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>취소</Button>
                  <Button variant="accent" size="sm" onClick={remove}>삭제</Button>
                </>
              ) : (
                <>
                  {isOwner && <Button variant="outline" size="sm" to={`/recipes/${recipe.id}/edit`}><Pencil size={15} /> 수정</Button>}
                  {canDelete && <Button variant="danger" size="sm" onClick={() => setConfirming(true)}><Trash2 size={15} /> 삭제</Button>}
                </>
              )}
              {actionError && <p className="w-full text-sm text-accent">{actionError}</p>}
            </div>
          )}
        </div>

        <div>
          {recipe.noTimer || (recipe.total_time_s ?? 0) > 3600 ? (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-muted">순서</h2>
              <ol className="mt-3 space-y-3">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="w-16 shrink-0 text-sm font-semibold text-muted tnum">{s.at >= 3600 ? formatDuration(s.at) : mmss(s.at)}</span>
                    <span>{s.label}{s.target != null && <span className="text-muted"> · {s.target}g</span>}</span>
                  </li>
                ))}
              </ol>
            </Card>
          ) : steps.length ? (
            <BrewTimer steps={steps} total={recipe.total_time_s} water={water} />
          ) : (
            <Notice>단계가 등록되지 않은 레시피예요.</Notice>
          )}
        </div>
      </div>
    </article>
  );
}
