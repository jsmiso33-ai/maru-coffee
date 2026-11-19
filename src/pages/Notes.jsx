import { useMemo } from 'react';
import { useSearchParams } from 'react-router';
import { Plus, Search, X } from 'lucide-react';
import { listNotes, useAsync } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { BREW_METHODS, PROCESSES } from '../data/options.js';
import { Button, Card, Notice, PageHeader, Segmented, Spinner, cx } from '../components/ui.jsx';
import NoteCard from '../components/NoteCard.jsx';

export default function Notes() {
  const { data: notes, loading, error } = useAsync(listNotes, []);
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const method = params.get('method') ?? '';
  const process = params.get('process') ?? '';
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
      if (method && n.brew_method !== method) return false;
      if (process && n.process !== process) return false;
      if (mine && n.user_id !== user?.id) return false;
      if (!needle) return true;
      return [n.bean_name, n.roaster, n.origin, n.author_name, n.memo, ...(n.flavors || [])]
        .some((v) => v?.toLowerCase().includes(needle));
    });
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating || b.created_at.localeCompare(a.created_at));
    return list;
  }, [notes, q, method, process, sort, mine, user?.id]);

  const hasFilter = q || method || process || mine;

  return (
    <>
      <PageHeader
        eyebrow="Tasting Notes"
        title="테이스팅 노트"
        action={<Button to="/notes/new"><Plus size={18} /> 노트 쓰기</Button>}
      >
        부원들이 마신 원두와 카페 기록. 향미나 산지로 검색해서 다음에 살 원두를 골라 보세요.
      </PageHeader>

      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={q}
            onChange={(e) => update('q', e.target.value)}
            placeholder="원두, 로스터리, 향미(예: 자스민), 작성자"
            aria-label="노트 검색"
            className="field pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="추출 방식" value={method} onChange={(v) => update('method', v)} options={BREW_METHODS} />
          <FilterSelect label="가공 방식" value={process} onChange={(v) => update('process', v)} options={PROCESSES} />
          {user && (
            <button
              type="button"
              aria-pressed={mine}
              onClick={() => update('mine', mine ? '' : '1')}
              className={cx('h-10 rounded-full border px-4 text-sm font-semibold', mine ? 'border-ink bg-ink text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong')}
            >
              내 노트
            </button>
          )}
          {hasFilter && (
            <button type="button" onClick={() => setParams({}, { replace: true })} className="inline-flex h-10 items-center gap-1 px-2 text-sm text-muted hover:text-ink">
              <X size={15} /> 초기화
            </button>
          )}
          <div className="ml-auto">
            <Segmented
              label="정렬"
              value={sort}
              onChange={(v) => update('sort', v === 'new' ? '' : v)}
              options={[{ value: 'new', label: '최신순' }, { value: 'rating', label: '평점순' }]}
            />
          </div>
        </div>
      </div>

      {error && <Notice tone="accent">{error}</Notice>}
      {loading ? (
        <Spinner />
      ) : filtered.length ? (
        <>
          <p className="mb-3 text-sm text-muted tnum">{filtered.length}개의 노트</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((n) => <NoteCard key={n.id} note={n} />)}
          </div>
        </>
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

const CHEVRON = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="#7a6c61" stroke-width="2"><path d="m2 4 4 4 4-4"/></svg>')}")`;

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        'h-10 cursor-pointer appearance-none rounded-full border bg-surface pl-4 pr-9 text-sm font-semibold',
        'bg-[position:right_0.85rem_center] bg-no-repeat',
        value ? 'border-ink text-ink' : 'border-line text-ink-soft',
      )}
      style={{ backgroundImage: CHEVRON }}
    >
      <option value="">{label} 전체</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
