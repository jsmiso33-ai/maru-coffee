import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Heart, LoaderCircle, MapPin, Search, Star } from 'lucide-react';
import { getCafe, listCafes, saveCafePlace, saveReview, setWish } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { reverseGeocode, searchPlaces } from '../lib/geocode.js';
import { CAFE_REGIONS, guessRegion } from '../data/cafes.js';
import { Button, Card, Label, Notice, Segmented, Spinner, cx } from '../components/ui.jsx';
import CafeReviewFields, { EMPTY_REVIEW, cleanReview } from '../components/CafeReviewFields.jsx';
import MemberGate from '../components/MemberGate.jsx';
import { NotFound } from './NotFound.jsx';

const CafeMap = lazy(() => import('../components/CafeMap.jsx'));

// 장소 정보(cafes). 별점·한 줄 평은 후기(cafe_reviews)로 따로 저장한다
const EMPTY = { name: '', address: '', region: '', lat: null, lng: null, link: '' };

// 두 지점 사이 거리(m)
function meters(a, b) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();

export default function CafeForm() {
  return (
    <MemberGate what="카페를 기록하려면">
      <CafeFormInner />
    </MemberGate>
  );
}

function CafeFormInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(id ? null : EMPTY);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('visited'); // 새 카페: 다녀왔어요(후기) | 가보고 싶어요(찜)
  const [review, setReview] = useState(EMPTY_REVIEW);
  const [existing, setExisting] = useState([]);

  // 장소 검색
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [focus, setFocus] = useState(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!id) {
      listCafes().then(setExisting).catch(() => {}); // 이미 등록된 카페인지 확인용
      return;
    }
    getCafe(id)
      .then((c) => {
        if (!c || c.user_id !== user?.id) return setNotFound(true);
        setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, c[k] ?? EMPTY[k]])));
        setFocus({ lat: c.lat, lng: c.lng, zoom: 16 });
      })
      .catch((e) => setLoadError(e.message));
  }, [id, user?.id]);

  if (notFound) return <NotFound what="카페" />;
  if (loadError) return <Notice tone="accent">{loadError}</Notice>;
  if (!form) return <Spinner />;

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const bind = (key) => ({ id: key, value: form[key], onChange: (e) => set(key)(e.target.value) });
  const hasPin = form.lat != null && form.lng != null;

  const search = async (e) => {
    e?.preventDefault();
    const q = query.trim() || form.name.trim();
    if (!q) return;
    setSearching(true);
    setSearchError('');
    try {
      setResults(await searchPlaces(q));
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  };

  const choose = (p) => {
    setForm((f) => ({
      ...f,
      name: f.name.trim() ? f.name : p.name,
      address: p.address,
      region: guessRegion(p.address) || f.region,
      lat: p.lat,
      lng: p.lng,
      link: f.link || (/^https?:\/\//.test(p.link ?? '') ? p.link : ''),
    }));
    setFocus({ lat: p.lat, lng: p.lng, zoom: 17 });
    setResults(null);
  };

  // 지도를 누르거나 핀을 끌면 위치를 바꾸고 주소도 다시 찾는다
  const pickOnMap = async ({ lat, lng }) => {
    setForm((f) => ({ ...f, lat, lng }));
    setResolving(true);
    try {
      const address = await reverseGeocode(lat, lng);
      if (address) setForm((f) => ({ ...f, address, region: guessRegion(address) || f.region }));
    } catch { /* 주소는 직접 적으면 된다 */ } finally {
      setResolving(false);
    }
  };

  // 핀 근처(120m)에 이름이 비슷하거나 아주 가까운(40m) 카페가 이미 있으면 알려 준다
  const duplicate = !id && hasPin
    ? existing.find((c) => {
        const d = meters(c, form);
        const sameName = form.name.trim() && (norm(c.name).includes(norm(form.name)) || norm(form.name).includes(norm(c.name)));
        return d < 40 || (d < 120 && sameName);
      })
    : null;

  const errors = touched ? {
    name: !form.name.trim() && '카페 이름을 적어 주세요.',
    pin: !hasPin && '지도에서 위치를 찍거나 검색해서 골라 주세요.',
    region: !form.region && '지역을 골라 주세요.',
    link: form.link && !/^https?:\/\//i.test(form.link.trim()) && 'https:// 로 시작하는 주소를 넣어 주세요.',
  } : {};

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    const link = form.link.trim();
    if (!form.name.trim() || !hasPin || !form.region || (link && !/^https?:\/\//i.test(link))) return;
    setSaving(true);
    setError('');
    try {
      const place = await saveCafePlace({ ...form, name: form.name.trim(), address: form.address.trim(), link }, id);
      if (!id) {
        if (mode === 'visited') await saveReview(place.id, cleanReview(review));
        else await setWish(place.id, true);
      }
      navigate(`/cafes/${place.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-3xl">
      <Link to={id ? `/cafes/${id}` : '/cafes'} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> 카페 지도
      </Link>
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{id ? '카페 정보 수정' : '카페 추가'}</h1>
      {!id && (
        <div className="mb-6">
          <Segmented
            label="어떤 카페인가요"
            value={mode}
            onChange={setMode}
            options={[{ value: 'visited', label: '다녀왔어요' }, { value: 'wish', label: '가보고 싶어요' }]}
          />
          <p className="mt-2 text-sm text-muted">
            {mode === 'visited' ? '별점과 한 줄 평을 남겨요. 다른 부원도 같은 카페에 후기를 더할 수 있어요.' : '후기 없이 찜만 해 둬요. 카페 투어 장소를 정할 때 모아 볼 수 있어요.'}
          </p>
        </div>
      )}

      <div className="space-y-5">
        <Card className="space-y-5 p-5 sm:p-6">
          <div>
            <Label htmlFor="name" hint="필수">카페 이름</Label>
            <input {...bind('name')} maxLength={60} className="field" placeholder="예: 프릳츠 원서점" aria-invalid={Boolean(errors.name)} />
            {errors.name && <p className="mt-1.5 text-sm text-accent">{errors.name}</p>}
          </div>

          <div>
            <p className="mb-1.5 flex items-baseline justify-between text-sm font-semibold">
              위치 <span className="text-xs font-normal text-muted">검색하거나 지도를 눌러 핀 찍기</span>
            </p>
            <div className="mb-2.5 flex gap-2" role="search">
              <div className="relative flex-1">
                <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') search(e); }}
                  className="field pl-10"
                  placeholder={form.name ? `‘${form.name}’ 또는 주소로 찾기` : '카페 이름이나 도로명 주소'}
                  aria-label="장소 검색"
                />
              </div>
              <Button variant="outline" onClick={search} disabled={searching}>
                {searching ? <LoaderCircle size={16} className="animate-spin" /> : '검색'}
              </Button>
            </div>
            {searchError && <p className="mb-2 text-sm text-accent">{searchError}</p>}
            {results && (
              <div className="mb-3 rounded-[var(--radius-card)] border border-line bg-surface">
                {results.length ? (
                  <ul className="divide-y divide-line">
                    {results.map((p, i) => (
                      <li key={`${p.lat}-${p.lng}-${i}`}>
                        <button type="button" onClick={() => choose(p)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-sunken">
                          <MapPin size={16} className="mt-0.5 shrink-0 text-accent" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold">
                              {p.name}
                              {p.category && <span className="ml-1.5 text-xs font-normal text-muted">{p.category.split('>').pop()}</span>}
                            </span>
                            <span className="block truncate text-sm text-muted">{p.address}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-sm text-muted">
                    검색 결과가 없어요. 지역 이름을 붙여 보거나(예: ‘성수 ○○커피’) <strong className="font-semibold text-ink-soft">도로명 주소</strong>로 찾고, 그래도 없으면 지도를 직접 눌러 주세요.
                  </p>
                )}
              </div>
            )}

            <Suspense fallback={<div className="h-72 animate-pulse rounded-[var(--radius-card)] bg-sunken sm:h-96" />}>
              <CafeMap pick={hasPin ? { lat: form.lat, lng: form.lng } : null} onPick={pickOnMap} focus={focus} fitToCafes={false} className="h-72 sm:h-96" />
            </Suspense>
            <p className="mt-2 text-xs text-muted">{hasPin ? '핀을 끌어서 정확한 위치로 옮길 수 있어요.' : '지도를 확대해서 카페 자리를 눌러 주세요.'}</p>
            {errors.pin && <p className="mt-1 text-sm text-accent">{errors.pin}</p>}
          </div>

          {duplicate && (
            <Notice tone="accent" icon={MapPin}>
              <strong className="font-semibold">‘{duplicate.name}’</strong>이(가) 이미 지도에 있어요. 같은 곳이면 거기에 더해 주세요.
              <span className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="accent" to={`/cafes/${duplicate.id}/review`}><Star size={14} /> 후기 남기기</Button>
                <Button size="sm" variant="outline" to={`/cafes/${duplicate.id}`}><Heart size={14} /> 카페 보러 가기</Button>
              </span>
            </Notice>
          )}

          <div>
            <Label htmlFor="address" hint={resolving ? '주소 찾는 중…' : undefined}>주소</Label>
            <input {...bind('address')} maxLength={160} className="field" placeholder="핀을 찍으면 자동으로 채워져요" />
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">지역 <span className="text-xs font-normal text-muted">필수</span></legend>
            <div className="flex flex-wrap gap-1.5">
              {CAFE_REGIONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={form.region === r}
                  onClick={() => set('region')(r)}
                  className={cx('h-11 rounded-full border px-3.5 text-sm sm:h-9', form.region === r ? 'border-ink bg-ink font-semibold text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong')}
                >
                  {r}
                </button>
              ))}
            </div>
            {errors.region && <p className="mt-1.5 text-sm text-accent">{errors.region}</p>}
          </fieldset>
          <div>
            <Label htmlFor="link">링크</Label>
            <input {...bind('link')} type="url" inputMode="url" maxLength={300} className="field" placeholder="인스타그램·홈페이지 주소 (선택)" aria-invalid={Boolean(errors.link)} />
            {errors.link && <p className="mt-1.5 text-sm text-accent">{errors.link}</p>}
          </div>
        </Card>

        {!id && mode === 'visited' && (
          <Card className="p-5 sm:p-6">
            <h2 className="mb-5 text-lg font-bold">내 후기</h2>
            <CafeReviewFields review={review} onChange={setReview} />
          </Card>
        )}
      </div>

      {error && <div className="mt-5"><Notice tone="accent">{error}</Notice></div>}

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-6 flex justify-end md:bottom-4">
        <div className="flex gap-2 rounded-full border border-line bg-surface/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur">
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={saving}>취소</Button>
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-strong disabled:opacity-50">
            {saving ? '저장 중…' : id ? '수정 완료' : mode === 'visited' ? '후기 올리기' : '찜해 두기'}
          </button>
        </div>
      </div>
    </form>
  );
}
