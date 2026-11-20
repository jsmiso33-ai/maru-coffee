import { Suspense, lazy, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { ChevronDown, Heart, LocateFixed, MapPin, Plus, Star, X } from 'lucide-react';
import { photoUrl } from '../lib/photos.js';
import { listCafes, useAsync } from '../lib/db.js';
import { isConfigured } from '../lib/supabase.js';
import { CAFE_REGIONS, CAFE_TAGS } from '../data/cafes.js';
import NaverMapButton from '../components/NaverMapButton.jsx';
import { Avatar, Button, Card, Notice, PageHeader, Spinner, cx, PillSelect } from '../components/ui.jsx';

// Leaflet(지도 라이브러리)은 이 탭에서만 받는다
const CafeMap = lazy(() => import('../components/CafeMap.jsx'));

export default function Cafes() {
  const { data, loading, error, reload } = useAsync(listCafes, []);
  const [params, setParams] = useSearchParams();
  const region = params.get('region') ?? '';
  const tag = params.get('tag') ?? '';
  const sort = params.get('sort') ?? 'new';
  const kind = params.get('kind') ?? ''; // '' | visited | wish
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

  // 지역·특징으로 거른 뒤, 탭(전체/다녀온 곳/가보고 싶은 곳)별 개수를 같이 센다
  const scoped = useMemo(
    () => all.filter((c) => (!region || c.region === region) && (!tag || c.tagList.includes(tag))),
    [all, region, tag],
  );
  const kindCounts = {
    '': scoped.length,
    visited: scoped.filter((c) => c.reviewCount > 0).length,
    wish: scoped.filter((c) => c.wishCount > 0).length,
  };
  const cafes = useMemo(() => {
    const list = scoped.filter((c) => (kind !== 'visited' || c.reviewCount > 0) && (kind !== 'wish' || c.wishCount > 0));
    if (sort === 'rating') list.sort((a, b) => (b.avgRating ?? -1) - (a.avgRating ?? -1) || b.created_at.localeCompare(a.created_at));
    return list;
  }, [scoped, sort, kind]);

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
        eyebrow="Cafés" title="카페 지도"
        action={<Button to="/cafes/new"><Plus size={18} /> 카페 추가</Button>}
      >
        부원들이 다녀온 전국의 커피 맛집이에요.
      </PageHeader>

      {!isConfigured && <Notice>Supabase가 연결되면 부원들이 기록한 카페가 지도에 모여요.</Notice>}

      {/* 지역·특징: 둥근 드롭다운 두 개 (지도 위) */}
      <div className="mb-4 flex items-center gap-2">
        <PillSelect
          className="min-w-0 flex-1 md:flex-none"
          label="지역"
          placeholder={`전국 ${all.length}`}
          value={region}
          onChange={(v) => update('region', v)}
          options={CAFE_REGIONS.map((r) => ({ value: r, label: `${r}${regionCounts.get(r) ? ` ${regionCounts.get(r)}` : ''}` }))}
        />
        <PillSelect className="min-w-0 flex-1 md:flex-none" label="분위기·특징" placeholder="특징 전체" value={tag} onChange={(v) => update('tag', v)} options={CAFE_TAGS} />
        {(region || tag || kind) && (
          <button type="button" onClick={() => { setParams({}, { replace: true }); setSelected(null); }} aria-label="필터 초기화" title="초기화" className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink sm:size-10">
            <X size={17} />
          </button>
        )}
      </div>
      {error && (
        <div className="mb-4"><Notice tone="accent" action={<Button size="sm" variant="outline" onClick={reload}>다시 시도</Button>}>{error}</Notice></div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="relative lg:sticky lg:top-24">
          <Suspense fallback={<div className="h-[46vh] min-h-72 animate-pulse rounded-[var(--radius-card)] bg-sunken lg:h-[calc(100vh-8rem)]" />}>
            <CafeMap
              cafes={cafes}
              selectedId={selected?.id}
              onSelect={setSelected}
              focus={focus}
              className="h-[46vh] min-h-72 lg:h-[calc(100vh-8rem)]"
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
          {/* 분류는 밑줄 탭(개수 포함), 정렬은 오른쪽 작은 글자 — 한 줄로 */}
          <div className="mb-3 flex items-center justify-between gap-3 border-b border-line">
            <div role="tablist" aria-label="분류" className="flex gap-4">
              {[['', '전체'], ['visited', '다녀온 곳'], ['wish', '가보고 싶은 곳']].map(([v, label]) => (
                <button
                  key={v || 'all'}
                  type="button"
                  role="tab"
                  aria-selected={kind === v}
                  onClick={() => update('kind', v)}
                  className={cx(
                    '-mb-px inline-flex h-11 items-center gap-1 border-b-2 text-sm font-semibold whitespace-nowrap transition-colors',
                    kind === v ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink',
                  )}
                >
                  {label}
                  {!loading && <span className={cx('text-xs tnum', kind === v ? 'text-accent' : 'text-muted')}>{kindCounts[v]}</span>}
                </button>
              ))}
            </div>
            <label className="relative shrink-0">
              <span className="sr-only">정렬</span>
              <select
                value={sort}
                onChange={(e) => update('sort', e.target.value === 'new' ? '' : e.target.value)}
                className="h-8 cursor-pointer appearance-none bg-transparent pr-5 text-sm font-semibold text-ink-soft"
              >
                <option value="new">최신순</option>
                <option value="rating">별점순</option>
              </select>
              <ChevronDown size={14} className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-muted" />
            </label>
          </div>
          {loading ? (
            <Spinner />
          ) : cafes.length ? (
            <>
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

function CafeRow({ cafe, active, onFocusMap }) {
  return (
    <div className={cx('flex items-stretch rounded-[var(--radius-card)] border bg-surface transition-colors', active ? 'border-ink' : 'border-line hover:border-line-strong')}>
      <Link to={`/cafes/${cafe.id}`} className="group min-w-0 flex-1 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate font-bold group-hover:text-accent">{cafe.name}</h3>
          <CafeScore cafe={cafe} />
        </div>
        <p className="mt-0.5 truncate text-sm text-muted">{cafe.region}{cafe.address ? ` · ${cafe.address}` : ''}</p>
        <div className="mt-2 flex gap-3">
          <div className="min-w-0 flex-1">
            {cafe.latest?.signature && <p className="truncate text-sm text-ink-soft">추천 · {cafe.latest.signature}</p>}
            {cafe.latest?.memo && <p className="mt-0.5 line-clamp-1 text-sm text-muted">“{cafe.latest.memo}”</p>}
            {cafe.tagList.length > 0 && (
              <p className="mt-2 flex flex-wrap gap-1">
                {cafe.tagList.slice(0, 3).map((t) => <span key={t} className="rounded-md bg-sunken px-1.5 py-0.5 text-xs text-ink-soft">{t}</span>)}
              </p>
            )}
          </div>
          {cafe.cover && <img src={photoUrl(cafe.cover)} alt="" loading="lazy" className="size-16 shrink-0 rounded-lg object-cover" />}
        </div>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {cafe.reviewCount > 0 && <span className="inline-flex items-center gap-1.5"><Avatar name={cafe.latest.author_name} src={cafe.latest.author_avatar} size={18} /> {cafe.reviewCount > 1 ? `${cafe.latest.author_name} 외 ${cafe.reviewCount - 1}명` : cafe.latest.author_name}</span>}
          {cafe.wishCount > 0 && <span className="inline-flex items-center gap-1 text-accent"><Heart size={12} fill="currentColor" /> {cafe.wishCount}</span>}
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
            <CafeScore cafe={cafe} />
          </p>
          <p className="mt-0.5 truncate text-sm text-muted">{cafe.address || cafe.region}</p>
          {cafe.latest?.memo && <p className="mt-1.5 line-clamp-2 text-sm text-ink-soft">“{cafe.latest.memo}”</p>}
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

// 별점 평균(후기 수) — 후기 없이 찜만 된 곳은 '가보고 싶어요'
function CafeScore({ cafe }) {
  if (cafe.avgRating == null) {
    return <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-accent"><Heart size={12} /> 가보고 싶어요</span>;
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-accent tnum">
      <Star size={13} fill="currentColor" /> {cafe.avgRating.toFixed(1)}
      {cafe.reviewCount > 1 && <span className="text-xs font-normal text-muted">({cafe.reviewCount})</span>}
    </span>
  );
}
