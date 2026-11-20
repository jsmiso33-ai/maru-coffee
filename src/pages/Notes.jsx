import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, Search, X, ChevronDown } from 'lucide-react';
import { listNotes, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { BREW_METHODS, PROCESSES, processOption } from '../data/options.js';
import { Button, Card, Notice, PageHeader, Spinner, cx, PillSelect } from '../components/ui.jsx';
import NoteCard from '../components/NoteCard.jsx';
import WorldMap from '../components/WorldMap.jsx';
import { matchOrigin } from '../data/origins.js';

export default function Notes() {
  const { data: notes, loading, error } = useAsync(listNotes, []);
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const method = params.get('method') ?? '';
  const process = params.get('process') ?? '';
  const flavor = params.get('flavor') ?? '';
  const origin = params.get('origin') ?? '';
  const sort = params.get('sort') ?? 'new';
  const mine = params.get('mine') === '1';

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const filtered = useMemo(() => {
    if (!notes) return [];
    const needle = q.trim().toLowerCase();
    const list = notes.filter((n) => {
      if (flavor && !n.flavors?.includes(flavor)) return false;
      if (origin && matchOrigin(n.origin)?.name !== origin) return false;
      if (method && n.brew_method !== method) return false;
      if (process && n.process !== process && !(process === '기타' && processOption(n.process) === '기타')) return false;
      if (!needle) return true;
      return [n.bean_name, n.roaster, n.origin, n.process, n.author_name, n.memo, ...(n.flavors || [])]
        .some((v) => v?.toLowerCase().includes(needle));
    });
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating || b.created_at.localeCompare(a.created_at));
    return list;
  }, [notes, q, method, process, flavor, origin, sort]);
  const myCount = user ? scopedCount(filtered, user.id) : 0;
  const shown = mine ? filtered.filter((n) => n.user_id === user?.id) : filtered;

  // 산지별 노트 수 (지도 진하기)
  const originCounts = useMemo(() => {
    const m = new Map();
    notes?.forEach((n) => {
      const o = matchOrigin(n.origin);
      if (o) m.set(o.id, (m.get(o.id) || 0) + 1);
    });
    return m;
  }, [notes]);
  const originSel = origin ? matchOrigin(origin) : null;

  const filterOn = q || method || process || flavor || origin;
  const hasFilter = filterOn || mine;

  return (
    <>
      <PageHeader
        eyebrow="Tasting Notes"
        title="테이스팅 노트"
        action={<Button to="/notes/new"><Plus size={18} /> 노트 쓰기</Button>}
      >
        부원들이 마신 커피 기록이에요.
      </PageHeader>

      {notes && (
        <WorldMap
          counts={originCounts}
          selectedId={originSel?.id}
          onSelect={(o) => update('origin', o.name === origin ? '' : o.name)}
          caption={originCounts.size ? `${originCounts.size}개 나라의 커피를 마셨어요 · 나라를 누르면 그 산지 노트만 보여요` : '산지를 적은 노트가 쌓이면 지도에 표시돼요'}
          className="mb-5"
        />
      )}

      <div className="filter-panel mb-5 space-y-3">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => update('q', e.target.value)}
            placeholder="원두, 로스터리, 향미, 작성자 검색"
            aria-label="노트 검색"
            className="field pl-10"
          />
        </div>
        {/* 드롭다운 두 개 + 초기화(✕) — 옆으로 넘기지 않는 한 줄 */}
        <div className="flex items-center gap-2">
          <PillSelect className="min-w-0 flex-1 md:flex-none" label="추출 방식" value={method} onChange={(v) => update('method', v)} options={BREW_METHODS} />
          <PillSelect className="min-w-0 flex-1 md:flex-none" label="가공 방식" value={process} onChange={(v) => update('process', v)} options={PROCESSES} />
          {filterOn && (
            <button type="button" onClick={() => setParams(mine ? { mine: '1' } : {}, { replace: true })} aria-label="필터 초기화" title="초기화" className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink sm:size-10">
              <X size={17} />
            </button>
          )}
        </div>
        {(origin || flavor) && (
          <div className="flex flex-wrap gap-1.5">
            {origin && (
              <button type="button" onClick={() => update('origin', '')} aria-label={`${origin} 산지 필터 해제`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-sm font-semibold text-accent-strong">
                산지 · {origin} <X size={14} />
              </button>
            )}
            {flavor && (
              <button type="button" onClick={() => update('flavor', '')} aria-label={`${flavor} 향미 필터 해제`}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent-soft px-3 text-sm font-semibold text-accent-strong">
                향미 · {flavor} <X size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 전체/내 노트는 밑줄 탭(개수 포함), 정렬은 오른쪽 작은 드롭다운 — 카페 목록과 같은 모양 */}
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line">
        <div role="tablist" aria-label="노트 보기" className="flex gap-4">
          {[['', '전체', filtered.length], ...(user ? [['1', '내 노트', myCount]] : [])].map(([v, label, n]) => {
            const active = (mine ? '1' : '') === v;
            return (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => update('mine', v)}
                className={cx(
                  '-mb-px inline-flex h-11 items-center gap-1 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors',
                  active ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
                )}
              >
                {label}
                {!loading && <span className={cx('text-xs tnum', active ? 'text-accent' : 'text-muted')}>{n}</span>}
              </button>
            );
          })}
        </div>
        <label className="relative shrink-0">
          <span className="sr-only">정렬</span>
          <select
            value={sort}
            onChange={(e) => update('sort', e.target.value === 'new' ? '' : e.target.value)}
            className="h-8 cursor-pointer appearance-none bg-transparent pr-5 text-sm font-semibold text-ink-soft"
          >
            <option value="new">최신순</option>
            <option value="rating">평점순</option>
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-muted" />
        </label>
      </div>

      {error && <Notice tone="accent">{error}</Notice>}
      {loading ? (
        <Spinner />
      ) : shown.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((n) => <NoteCard key={n.id} note={n} />)}
        </div>
      ) : (
        !error && (
          <Card className="px-6 py-14 text-center">
            <p className="font-semibold">{hasFilter ? '조건에 맞는 노트가 없어요' : '아직 노트가 없어요'}</p>
            <p className="mt-1 text-sm text-muted">{hasFilter ? '검색어나 필터를 바꿔 보세요.' : '오늘 마신 커피부터 기록해 볼까요?'}</p>
          </Card>
        )
      )}
    </>
  );
}

function scopedCount(list, userId) {
  return list.filter((n) => n.user_id === userId).length;
}
