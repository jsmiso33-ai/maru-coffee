import { Link, useSearchParams } from 'react-router';
import { Plus } from 'lucide-react';
import { STANDARD_RECIPES } from '../data/recipes.js';
import { listRecipes, useAsync } from '../lib/db.js';
import { isConfigured } from '../lib/supabase.js';
import { Avatar, Button, Card, Notice, PageHeader, Segmented, Spinner } from '../components/ui.jsx';
import { formatDuration, ratioOf } from '../lib/format.js';

export default function Recipes() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'members' ? 'members' : 'standard';

  return (
    <>
      <PageHeader
        title="브루잉 레시피"
        action={<Button to="/recipes/new"><Plus size={18} /> 레시피 공유</Button>}
      >
        MARU 표준 레시피와 부원들의 레시피예요.
      </PageHeader>

      <div className="mb-6">
        <Segmented
          label="레시피 종류"
          value={tab}
          onChange={(v) => setParams(v === 'members' ? { tab: v } : {}, { replace: true })}
          options={[{ value: 'standard', label: 'MARU 표준' }, { value: 'members', label: '부원 레시피' }]}
        />
      </div>

      {tab === 'standard' ? (
        <RecipeGrid recipes={STANDARD_RECIPES} hrefOf={(r) => `/recipes/std/${r.id}`} />
      ) : (
        <MemberRecipes />
      )}
    </>
  );
}

function MemberRecipes() {
  const { data, loading, error } = useAsync(listRecipes, []);
  if (!isConfigured) return <Notice>Supabase가 연결되면 부원들이 올린 레시피가 여기에 모여요.</Notice>;
  if (loading) return <Spinner />;
  if (error) return <Notice tone="accent">{error}</Notice>;
  if (!data.length) {
    return (
      <Card className="px-6 py-14 text-center">
        <p className="font-semibold">아직 공유된 레시피가 없어요</p>
        <p className="mt-1 text-sm text-muted">자주 쓰는 내 레시피를 올려 부원들과 나눠 보세요.</p>
      </Card>
    );
  }
  return <RecipeGrid recipes={data} hrefOf={(r) => `/recipes/${r.id}`} showAuthor />;
}

function RecipeGrid({ recipes, hrefOf, showAuthor }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((r) => (
        <Link
          key={r.id}
          to={hrefOf(r)}
          className="group flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-line-strong"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-sunken px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{r.method}</span>
            <span className="text-xs text-muted tnum">{formatDuration(r.total_time_s)}</span>
          </div>
          <h3 className="mt-3 text-lg font-bold leading-snug group-hover:text-accent">{r.title}</h3>
          {r.memo && <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted">{r.memo}</p>}
          <dl className="mt-auto grid grid-cols-4 gap-2 border-t border-line pt-4 text-center">
            {[
              ['원두', `${Number(r.dose_g)}g`],
              [r.yieldLabel || '물', `${Number(r.water_g)}g`],
              ['비율', `1:${ratioOf(r.dose_g, r.water_g)}`],
              ['온도', r.water_temp != null ? `${r.water_temp}°` : '—'],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[0.7rem] text-muted">{k}</dt>
                <dd className="mt-0.5 text-sm font-semibold tnum">{v}</dd>
              </div>
            ))}
          </dl>
          {showAuthor && (
            <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft">
              <Avatar name={r.author_name} src={r.author_avatar} size={22} /> {r.author_name}
            </p>
          )}
        </Link>
      ))}
    </div>
  );
}
