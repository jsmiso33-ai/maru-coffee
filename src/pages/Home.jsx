import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Timer, NotebookPen, Calculator } from 'lucide-react';
import { CLUB } from '../lib/config.js';
import { listNotes, useAsync } from '../lib/db.js';
import { STANDARD_RECIPES } from '../data/recipes.js';
import { Button, Card, FlavorChip, Spinner } from '../components/ui.jsx';
import NoteCard from '../components/NoteCard.jsx';
import { formatDuration, ratioOf } from '../lib/format.js';

export default function Home() {
  const { data: notes, loading } = useAsync(listNotes, []);

  const stats = useMemo(() => {
    if (!notes) return null;
    const counts = new Map();
    notes.forEach((n) => n.flavors?.forEach((f) => counts.set(f, (counts.get(f) || 0) + 1)));
    const topFlavors = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([f]) => f);
    const people = new Set(notes.map((n) => n.user_id || n.author_name)).size;
    const beans = new Set(notes.map((n) => n.bean_name.trim())).size;
    return { total: notes.length, people, beans, topFlavors };
  }, [notes]);

  const featured = STANDARD_RECIPES.slice(0, 3);

  return (
    <div className="space-y-16 sm:space-y-20">
      {/* 소개 */}
      <section className="grid items-end gap-10 pt-2 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <p className="text-sm font-semibold text-accent">{CLUB.school} {CLUB.tagline}</p>
          <h1 className="mt-3 font-display text-[clamp(4.5rem,16vw,9.5rem)] font-medium leading-[0.85] tracking-[-0.045em]">
            {CLUB.name}
          </h1>
          <p className="mt-6 max-w-lg text-[1.05rem] leading-relaxed text-ink-soft">{CLUB.intro}</p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            <Button to="/notes/new" size="lg"><NotebookPen size={18} /> 테이스팅 노트 쓰기</Button>
            <Button to="/brew" size="lg" variant="outline"><Timer size={18} /> 브루잉 타이머</Button>
          </div>
        </div>

        <Card className="min-h-[15.5rem] p-6 sm:p-7">
          <p className="text-sm font-semibold text-muted">지금까지 마루가 마신 커피</p>
          {stats ? (
            <>
              <dl className="mt-4 grid grid-cols-3 gap-4">
                {[
                  ['노트', stats.total],
                  ['원두', stats.beans],
                  ['참여 부원', stats.people],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="mt-1 font-display text-4xl font-normal tnum">{value}</dd>
                  </div>
                ))}
              </dl>
              {stats.topFlavors.length > 0 && (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="text-xs text-muted">가장 많이 적힌 향미</p>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {stats.topFlavors.map((f) => <FlavorChip key={f} name={f} size="sm" />)}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Spinner />
          )}
        </Card>
      </section>

      {/* 최근 노트 */}
      <section>
        <SectionHead title="최근 테이스팅 노트" to="/notes" link="전체 보기" />
        {loading ? (
          <Spinner />
        ) : notes?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {notes.slice(0, 6).map((n) => <NoteCard key={n.id} note={n} />)}
          </div>
        ) : (
          <Card className="px-6 py-12 text-center text-muted">
            아직 노트가 없어요. 첫 번째 기록을 남겨 주세요.
          </Card>
        )}
      </section>

      {/* 레시피 & 도구 */}
      <section>
        <SectionHead title="오늘 뭐 내려 마실까" to="/recipes" link="레시피 전체" />
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.1fr]">
          {featured.map((r) => (
            <Link key={r.id} to={`/recipes/std/${r.id}`} className="group rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:border-line-strong">
              <p className="text-xs font-semibold text-muted">{r.method}</p>
              <h3 className="mt-1 font-bold group-hover:text-accent">{r.title}</h3>
              <p className="mt-4 font-display text-2xl tnum">
                {r.dose_g}<span className="text-base text-muted">g</span>
                <span className="mx-1.5 text-muted">/</span>
                {r.water_g}<span className="text-base text-muted">g</span>
              </p>
              <p className="mt-1 text-sm text-muted tnum">1:{ratioOf(r.dose_g, r.water_g)} · {r.water_temp}°C · {formatDuration(r.total_time_s)}</p>
            </Link>
          ))}
          <Link to="/brew" className="group flex flex-col justify-between rounded-[var(--radius-card)] bg-ink p-5 text-paper transition hover:-translate-y-0.5">
            <Calculator size={22} className="text-crema" />
            <div className="mt-8">
              <h3 className="font-bold">비율 계산기 · 추출 수율</h3>
              <p className="mt-1 text-sm text-paper/65">원두 양만 넣으면 물·뜸·나눠 붓기까지</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-crema">계산하기 <ArrowRight size={15} className="transition group-hover:translate-x-0.5" /></span>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}

function SectionHead({ title, to, link }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
      <Link to={to} className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ink-soft hover:text-accent">
        {link} <ArrowRight size={15} />
      </Link>
    </div>
  );
}
