import { Suspense, lazy, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { LocateFixed, MapPin, Plus, Star, X } from 'lucide-react';
import { listCafes, useAsync } from '../lib/db.js';
import { isConfigured } from '../lib/supabase.js';
import { CAFE_REGIONS, CAFE_TAGS } from '../data/cafes.js';
import NaverMapButton from '../components/NaverMapButton.jsx';
import { Avatar, Button, Card, Notice, PageHeader, Segmented, Spinner, cx } from '../components/ui.jsx';

// Leaflet(지도 라이브러리)은 이 탭에서만 받는다
const CafeMap = lazy(() => import('../components/CafeMap.jsx'));

export default function Cafes() {
  const { data, loading, error, reload } = useAsync(listCafes, []);
  const [params, setParams] = useSearchParams();
  const region = params.get('region') ?? '';
  const tag = params.get('tag') ?? '';
  const sort = params.get('sort') ?? 'new';
  const [selected, setSelected] = useState(null);
  const [focus, setFocus] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
    setSelected(null);
    setFocus(null);
  };

  const all = data ?? [];
  const regionCounts = useMemo(() => {
    const m = new Map();
    all.forEach((c) => m.set(c.region, (m.get(c.region) || 0) + 1));
    return m;
  }, [all]);

  const cafes = useMemo(() => {
    const list = all.filter((c) => (!region || c.region === region) && (!tag || c.tags?.includes(tag)));
    if (sort === 'rating') list.sort((a, b) => b.rating - a.rating || b.created_at.localeCompare(a.created_at));
    return list;
  }, [all, region, tag, sort]);

  const locate = () => {
    if (!('geolocation' in navigator)) return setLocError('이 브라우저는 위치 찾기를 지원하지 않아요.');
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (p) => { setFocus({ lat: p.coords.latitude, lng: p.coords.longitude, zoom: 14 }); setLocating(false); },
      () => { setLocError('위치 권한을 허용하면 내 주변 카페를 볼 수 있어요.'); setLocating(false); },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };

  return (
    <>
      <PageHeader
        eyebrow="Cafés"
        title="카페 지도"
        action={<Button to="/cafes/new"><Plus size={18} /> 카페 추가</Button>}
      >
        부원들이 직접 다녀온 전국의 커피 맛집. 핀을 누르면 한 줄 평과 추천 메뉴를 볼 수 있어요.
      </PageHeader>

      {!isConfigured && <Notice>Supabase가 연결되면 부원들이 기록한 카페가 지도에 모여요.</Notice>}

      {/* 지역 */}
      <div className="mb-3 overflow-x-auto [scrollbar-width:none]" role="group" aria-label="지역">
        <div className="flex w-max gap-1.5">
          <RegionChip label="전국" count={all.length} active={!region} onClick={() => update('region', '')} />
          {CAFE_REGIONS.map((r) => (
            <RegionChip key={r} label={r} count={regionCounts.get(r) || 0} active={region === r} onClick={() => update('region', region === r ? '' : r)} />
          ))}
        </div>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <select
          aria-label="분위기·특징"
          value={tag}
          onChange={(e) => update('tag', e.target.value)}
          className={cx('field h-11 w-auto py-0 pr-8 text-sm font-semibold sm:h-10', tag && 'border-ink')}
        >
          <option value="">특징 전체</option>
          {CAFE_TAGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(region || tag) && (
          <button type="button" onClick={() => { setParams({}, { replace: true }); setSelected(null); }} className="inline-flex h-11 items-center gap-1 px-2 text-sm text-muted hover:text-ink sm:h-10">
            <X size={15} /> 초기화
          </button>
        )}
        <div className="ml-auto">
          <Segmented
            label="정렬"
            value={sort}
            onChange={(v) => update('sort', v === 'new' ? '' : v)}
            options={[{ value: 'new', label: '최신순' }, { value: 'rating', label: '별점순' }]}
          />
        </div>
      </div>

      {error && (
        <div className="mb-4"><Notice tone="accent" action={<Button size="sm" variant="outline" onClick={reload}>다시 시도</Button>}>{error}</Notice></div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="relative lg:sticky lg:top-24">
          <Suspense fallback={<div className="h-[52vh] min-h-80 animate-pulse rounded-[var(--radius-card)] bg-sunken lg:h-[calc(100vh-8rem)]" />}>
            <CafeMap
              cafes={cafes}
              selectedId={selected?.id}
              onSelect={setSelected}
              focus={focus}
              className="h-[52vh] min-h-80 lg:h-[calc(100vh-8rem)]"
            />
          </Suspense>
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            aria-label="내 위치로 이동"
            className="absolute right-3 top-3 z-[500] inline-flex h-11 items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 text-sm font-semibold shadow-sm hover:bg-sunken disabled:opacity-60"
          >
            <LocateFixed size={16} /> {locating ? '찾는 중…' : '내 주변'}
          </button>
          {locError && <p className="mt-2 text-sm text-muted">{locError}</p>}
          {selected && <SelectedCafe cafe={selected} onClose={() => setSelected(null)} />}
        </div>

        <section aria-label="카페 목록">
          {loading ? (
            <Spinner />
          ) : cafes.length ? (
            <>
              <p className="mb-3 text-sm text-muted tnum">{cafes.length}곳</p>
              <ul className="space-y-2.5">
                {cafes.map((c) => (
                  <li key={c.id}>
                    <CafeRow cafe={c} active={selected?.id === c.id} onFocusMap={() => { setSelected(c); setFocus({ lat: c.lat, lng: c.lng, zoom: 15 }); }} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            !error && (
              <Card className="px-6 py-12 text-center">
                <p className="font-semibold">{region || tag ? '조건에 맞는 카페가 없어요' : '아직 기록된 카페가 없어요'}</p>
                <p className="mt-1 text-sm text-muted">{region || tag ? '지역이나 특징을 바꿔 보세요.' : '다녀온 커피 맛집을 첫 번째로 올려 주세요.'}</p>
                <Button to="/cafes/new" size="sm" variant="outline" className="mt-4"><Plus size={15} /> 카페 추가</Button>
              </Card>
            )
          )}
        </section>
      </div>
    </>
  );
}

function RegionChip({ label, count, active, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'inline-flex h-11 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors sm:h-9',
        active ? 'border-ink bg-ink font-semibold text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong',
      )}
    >
      {label}
      {count > 0 && <span className={cx('text-xs tnum', active ? 'text-paper/70' : 'text-muted')}>{count}</span>}
    </button>
  );
}

function CafeRow({ cafe, active, onFocusMap }) {
  return (
    <div className={cx('flex items-stretch rounded-[var(--radius-card)] border bg-surface transition-colors', active ? 'border-ink' : 'border-line hover:border-line-strong')}>
      <Link to={`/cafes/${cafe.id}`} className="group min-w-0 flex-1 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate font-bold group-hover:text-accent">{cafe.name}</h3>
          <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-accent tnum">
            <Star size={13} fill="currentColor" /> {Number(cafe.rating).toFixed(1)}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">{cafe.region}{cafe.address ? ` · ${cafe.address}` : ''}</p>
        {cafe.signature && <p className="mt-1.5 truncate text-sm text-ink-soft">추천 · {cafe.signature}</p>}
        {cafe.tags?.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1">
            {cafe.tags.slice(0, 4).map((t) => <span key={t} className="rounded-md bg-sunken px-1.5 py-0.5 text-xs text-ink-soft">{t}</span>)}
          </p>
        )}
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted">
          <Avatar name={cafe.author_name} src={cafe.author_avatar} size={18} /> {cafe.author_name}
        </p>
      </Link>
      <button
        type="button"
        onClick={onFocusMap}
        aria-label={`${cafe.name} 지도에서 보기`}
        className="grid w-12 shrink-0 place-items-center border-l border-line text-muted hover:bg-sunken hover:text-accent"
      >
        <MapPin size={18} />
      </button>
    </div>
  );
}

function SelectedCafe({ cafe, onClose }) {
  return (
    <div className="absolute inset-x-3 bottom-3 z-[500] rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[0_12px_32px_-12px_rgb(48_42_37/0.4)]" role="dialog" aria-label={`${cafe.name} 미리보기`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <strong className="truncate text-base">{cafe.name}</strong>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-accent tnum"><Star size={13} fill="currentColor" /> {Number(cafe.rating).toFixed(1)}</span>
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">{cafe.address || cafe.region}</p>
          {cafe.memo && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">{cafe.memo}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="닫기" className="-mr-1.5 -mt-1.5 grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken"><X size={17} /></button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <NaverMapButton cafe={cafe} />
        <Button to={`/cafes/${cafe.id}`} size="sm" variant="outline">마루 후기 보기</Button>
      </div>
    </div>
  );
}
