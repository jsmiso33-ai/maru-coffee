import { Suspense, lazy, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, LoaderCircle, MapPin, Search } from 'lucide-react';
import { getCafe, saveCafe } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { reverseGeocode, searchPlaces } from '../lib/geocode.js';
import { CAFE_REGIONS, CAFE_TAGS, guessRegion } from '../data/cafes.js';
import { Button, Card, Label, Notice, Spinner, StarInput, cx } from '../components/ui.jsx';
import MemberGate from '../components/MemberGate.jsx';
import { NotFound } from './NotFound.jsx';
import { todayKey } from '../lib/format.js';

const CafeMap = lazy(() => import('../components/CafeMap.jsx'));

const EMPTY = {
  name: '', address: '', region: '', lat: null, lng: null, rating: 4, tags: [],
  signature: '', memo: '', link: '', visited_on: '',
};

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

  // 장소 검색
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [focus, setFocus] = useState(null);
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCafe(id)
      .then((c) => {
        if (!c || c.user_id !== user?.id) return setNotFound(true);
        setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v ?? ''])), rating: Number(c.rating), tags: c.tags ?? [] });
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

  const toggleTag = (t) => setForm((f) => ({
    ...f,
    tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : f.tags.length >= 10 ? f.tags : [...f.tags, t],
  }));

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
      const saved = await saveCafe({ ...form, name: form.name.trim(), address: form.address.trim(), signature: form.signature.trim(), memo: form.memo.trim(), link }, id);
      navigate(`/cafes/${saved.id}`, { replace: true });
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
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{id ? '카페 기록 수정' : '카페 기록하기'}</h1>

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
                            <span className="block truncate font-semibold">{p.name}</span>
                            <span className="block truncate text-sm text-muted">{p.address}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-sm text-muted">
                    검색 결과가 없어요. 작은 카페는 이름으로 안 나올 수 있어요 — <strong className="font-semibold text-ink-soft">도로명 주소</strong>로 찾거나 지도를 직접 눌러 주세요.
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
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="mb-2 text-sm font-semibold">별점</p>
            <StarInput value={form.rating} onChange={set('rating')} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="signature">추천 메뉴</Label>
              <input {...bind('signature')} maxLength={80} className="field" placeholder="예: 게이샤 핸드드립, 플랫화이트" />
            </div>
            <div>
              <Label htmlFor="visited_on">다녀온 날</Label>
              <input {...bind('visited_on')} type="date" max={todayKey()} className="field" />
            </div>
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">특징 <span className="text-xs font-normal text-muted">여러 개 선택</span></legend>
            <div className="flex flex-wrap gap-1.5">
              {CAFE_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={form.tags.includes(t)}
                  onClick={() => toggleTag(t)}
                  className={cx('h-11 rounded-full border px-3.5 text-sm sm:h-9', form.tags.includes(t) ? 'border-ink bg-ink font-semibold text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong')}
                >
                  {t}
                </button>
              ))}
            </div>
          </fieldset>
          <div>
            <Label htmlFor="memo" hint={`${form.memo.length}/2000`}>한 줄 평</Label>
            <textarea {...bind('memo')} rows={4} maxLength={2000} className="field resize-y leading-relaxed" placeholder="어떤 원두를 쓰는지, 분위기, 다시 갈 이유…" />
          </div>
          <div>
            <Label htmlFor="link">링크</Label>
            <input {...bind('link')} type="url" inputMode="url" maxLength={300} className="field" placeholder="인스타그램·네이버 플레이스 주소 (선택)" aria-invalid={Boolean(errors.link)} />
            {errors.link && <p className="mt-1.5 text-sm text-accent">{errors.link}</p>}
          </div>
        </Card>
      </div>

      {error && <div className="mt-5"><Notice tone="accent">{error}</Notice></div>}

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-6 flex justify-end md:bottom-4">
        <div className="flex gap-2 rounded-full border border-line bg-surface/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur">
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={saving}>취소</Button>
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-strong disabled:opacity-50">
            {saving ? '저장 중…' : id ? '수정 완료' : '카페 올리기'}
          </button>
        </div>
      </div>
    </form>
  );
}
