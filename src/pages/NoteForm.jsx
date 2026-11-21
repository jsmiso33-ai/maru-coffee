import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CalendarDays, MapPin, Plus, X } from 'lucide-react';
import { getActivity, getNote, listActivities, saveNote } from '../lib/db.js';
import { daysUntil, formatDay } from '../lib/format.js';
import { useAuth } from '../lib/auth.jsx';
import { isConfigured } from '../lib/supabase.js';
import { ATTRIBUTES, BREW_METHODS, ORIGINS, PROCESSES, methodOption, processOption } from '../data/options.js';
import { FLAVOR_GROUPS, flavorDot } from '../data/flavors.js';
import { Button, Card, FlavorChip, Label, Notice, ScaleInput, Spinner, StarInput, cx, FieldSelect } from '../components/ui.jsx';
import MemberGate from '../components/MemberGate.jsx';
import { PhotoPicker } from '../components/Photos.jsx';
import RadarChart from '../components/RadarChart.jsx';
import FlavorWheel from '../components/FlavorWheel.jsx';
import RoastSlider, { roastLabel, roastValueOf } from '../components/RoastSlider.jsx';
import WorldMap from '../components/WorldMap.jsx';
import { matchOrigin } from '../data/origins.js';
import { NotFound } from './NotFound.jsx';

const MAX_FLAVORS = 12;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY = {
  bean_name: '', roaster: '', origin: '', process: '', customProcess: '', roast_level: '', brew_method: '', customMethod: '',
  tasted_on: today(), flavors: [], acidity: 3, sweetness: 3, body: 3, bitterness: 3, aftertaste: 3,
  rating: 3.5, memo: '', activity_id: '', activity_bean_id: '', roast_value: null,
  photos: [],
};

export default function NoteForm() {
  const { id } = useParams();
  if (!isConfigured && !id) return <NoteFormInner preview />;
  return (
    <MemberGate what="노트를 쓰려면">
      <NoteFormInner />
    </MemberGate>
  );
}

function NoteFormInner({ preview = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState(id ? null : EMPTY);
  const [loadError, setLoadError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState(false);
  const [customFlavor, setCustomFlavor] = useState('');
  const [flavorGroup, setFlavorGroup] = useState(FLAVOR_GROUPS[0].name);
  const [flavorView, setFlavorView] = useState(() => {
    try { return localStorage.getItem('maru-flavor-view') || 'wheel'; } catch { return 'wheel'; }
  });
  const chooseFlavorView = (v) => {
    setFlavorView(v);
    try { localStorage.setItem('maru-flavor-view', v); } catch { /* noop */ }
  };
  const [params] = useSearchParams();
  const requestedActivityId = id ? null : params.get('activity');
  const [activities, setActivities] = useState([]);
  const prefilled = useRef(false);

  // 활동에서 바로 들어오면 날짜와 관계없이 해당 모임과 원두를 선택할 수 있다.
  useEffect(() => {
    let active = true;
    async function loadActivities() {
      const all = await listActivities();
      const options = all.filter((a) => a.id === requestedActivityId || (daysUntil(a.held_on) >= -120 && daysUntil(a.held_on) <= 7));
      if (requestedActivityId && !options.some((a) => a.id === requestedActivityId)) {
        const requested = await getActivity(requestedActivityId).catch(() => null);
        if (requested) options.push(requested);
      }
      if (active) setActivities(options);
    }
    loadActivities().catch(() => { if (active) setActivities([]); });
    return () => { active = false; };
  }, [requestedActivityId]);

  // 활동 페이지의 "이 원두 노트 쓰기"로 들어오면(?activity=&bean=) 원두 정보를 미리 채운다
  useEffect(() => {
    if (id || prefilled.current || !activities.length) return;
    const activity = activities.find((a) => a.id === params.get('activity'));
    if (!activity) return;
    prefilled.current = true;
    const bean = activity.beans?.find((b) => b.id === params.get('bean'));
    setForm((f) => applyActivity(f, activity, bean));
  }, [activities, id, params]);

  useEffect(() => {
    if (!id) return;
    getNote(id)
      .then((n) => {
        if (!n || n.user_id !== user?.id) setNotFound(true);
        else setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v ?? ''])), ...processFields(n.process), ...methodFields(n.brew_method), rating: Number(n.rating), roast_value: n.roast_value ?? roastValueOf(n.roast_level) });
      })
      .catch((e) => setLoadError(e.message));
  }, [id, user?.id]);

  if (notFound) return <NotFound />;
  if (loadError) return <Notice tone="accent">{loadError}</Notice>;
  if (!form) return <Spinner />;

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const bind = (key) => ({ id: key, value: form[key], onChange: (e) => set(key)(e.target.value) });

  const toggleFlavor = (name) => {
    setForm((f) => {
      if (f.flavors.includes(name)) return { ...f, flavors: f.flavors.filter((x) => x !== name) };
      if (f.flavors.length >= MAX_FLAVORS) return f;
      return { ...f, flavors: [...f.flavors, name] };
    });
  };

  const addCustomFlavor = () => {
    const name = customFlavor.trim().slice(0, 20);
    if (name && !form.flavors.includes(name)) toggleFlavor(name);
    setCustomFlavor('');
  };

  const linked = activities.find((a) => a.id === form.activity_id);
  const chooseActivity = (activityId) => {
    const activity = activities.find((a) => a.id === activityId);
    setForm((f) => (activity ? applyActivity(f, activity, null) : { ...f, activity_id: '', activity_bean_id: '' }));
  };
  const chooseBean = (bean) => setForm((f) => applyActivity(f, linked, bean));

  const originMatch = matchOrigin(form.origin);
  const guessedOrigin = matchOrigin(form.bean_name);

  const beanMissing = !form.bean_name.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (preview) return;
    setTouched(true);
    if (beanMissing) {
      document.getElementById('bean_name')?.focus();
      return;
    }
    setSaving(true);
    setError('');
    try {
      const process = form.process === '기타' ? form.customProcess.trim() || '기타' : form.process;
      const brew_method = form.brew_method === '기타' ? form.customMethod.trim() || '기타' : form.brew_method;
      const roast_value = form.roast_value === '' || form.roast_value == null ? null : Number(form.roast_value);
      const saved = await saveNote({ ...form, process, roast_value, roast_level: roastLabel(roast_value), brew_method, bean_name: form.bean_name.trim() }, id);
      navigate(`/notes/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl" noValidate>
      <Link to={id ? `/notes/${id}` : '/notes'} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> {id ? '노트로 돌아가기' : '테이스팅 노트'}
      </Link>
      <h1 className="mb-5 text-3xl font-bold tracking-tight">{id ? '노트 수정' : '테이스팅 노트 쓰기'}</h1>
      {preview && <div className="mb-5"><Notice>작성 화면 미리보기예요. 향미와 별점을 골라 보세요. 입력한 내용은 저장되지 않아요.</Notice></div>}

      <div className="space-y-5">
        {(activities.length > 0 || form.activity_id) && (
          <Card className="p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-lg font-bold"><CalendarDays size={20} /> 활동에서 마셨나요</h2>
            <p className="mt-1 text-sm text-muted">활동을 고르면 그날 원두 목록에서 바로 고를 수 있고, 활동 페이지에 원두별로 모여요.</p>
            <select
              aria-label="연결할 활동"
              value={form.activity_id}
              onChange={(e) => chooseActivity(e.target.value)}
              className="field mt-4"
            >
              <option value="">활동과 상관없이 마신 커피</option>
              {linked == null && form.activity_id && <option value={form.activity_id}>연결된 활동</option>}
              {activities.map((a) => <option key={a.id} value={a.id}>{formatDay(a.held_on)} · {a.title}</option>)}
            </select>
            {linked?.beans?.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-sm font-semibold">어떤 원두였나요</p>
                <div className="flex flex-wrap gap-1.5">
                  {linked.beans.map((b, i) => (
                    <button
                      key={b.id}
                      type="button"
                      aria-pressed={form.activity_bean_id === b.id}
                      onClick={() => chooseBean(b)}
                      className={cx(
                        'inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-sm sm:min-h-9',
                        form.activity_bean_id === b.id ? 'border-ink bg-ink font-semibold text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong',
                      )}
                    >
                      <span className="font-display tnum opacity-70">{i + 1}</span>{b.name}
                    </button>
                  ))}
                  <button
                    type="button"
                    aria-pressed={!form.activity_bean_id}
                    onClick={() => setForm((f) => ({ ...f, activity_bean_id: '' }))}
                    className={cx(
                      'min-h-11 rounded-full border px-3.5 text-sm sm:min-h-9',
                      !form.activity_bean_id ? 'border-ink bg-ink font-semibold text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong',
                    )}
                  >
                    목록에 없는 원두
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        <Card className="space-y-5 p-5 sm:p-6">
          <SectionTitle n="1">어떤 커피였나요</SectionTitle>
          {/* 원두 · 어디서 · 언제 */}
          <div>
            <Label htmlFor="bean_name" hint="필수">원두 이름</Label>
            <input {...bind('bean_name')} maxLength={80} className="field" placeholder="예: 에티오피아 예가체프 코체레" aria-invalid={touched && beanMissing} />
            {touched && beanMissing && <p className="mt-1.5 text-sm text-accent">원두 이름을 적어 주세요.</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="roaster">로스터리 · 카페</Label>
              <input {...bind('roaster')} maxLength={60} className="field" placeholder="어디서 샀나요" />
            </div>
            <div>
              <Label htmlFor="tasted_on">마신 날</Label>
              <input {...bind('tasted_on')} type="date" max={today()} className="field px-2.5" />
            </div>
          </div>

          {/* 산지: 입력이 먼저, 지도는 눌러서 고르는 보조 */}
          <div className="border-t border-line pt-5">
            <Label htmlFor="origin" hint="입력하거나 지도에서 나라 누르기">산지</Label>
            <input {...bind('origin')} maxLength={60} className="field" list="origin-list" placeholder="예: 에티오피아 구지 · 블렌드" />
            <datalist id="origin-list">{ORIGINS.map((o) => <option key={o} value={o} />)}</datalist>
            {!form.origin.trim() && guessedOrigin && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, origin: guessedOrigin.name }))}
                className="mt-2 inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 text-sm font-semibold text-accent-strong sm:min-h-9"
              >
                <MapPin size={14} /> 원두 이름에 있는 ‘{guessedOrigin.name}’로 넣기
              </button>
            )}
            <WorldMap
              selectedId={originMatch?.id}
              onSelect={(o) => setForm((f) => ({ ...f, origin: keepRegion(f.origin, o.name) }))}
              className="mt-2.5"
            />
          </div>

          {/* 가공 · 로스팅 · 추출: 드롭다운 세 칸 */}
          <div className="grid grid-cols-2 gap-3 border-t border-line pt-5">
            <div>
              <Label htmlFor="process">가공 방식</Label>
              <FieldSelect id="process" value={form.process} onChange={set('process')} options={PROCESSES} />
            </div>
            <div>
              <Label htmlFor="brew_method">추출 방식</Label>
              <FieldSelect id="brew_method" value={form.brew_method} onChange={set('brew_method')} options={BREW_METHODS} />
            </div>
            {form.process === '기타' && (
              <div className="col-span-2">
                <Label htmlFor="customProcess" hint="선택 · 최대 30자">가공 방식 직접 입력</Label>
                <input {...bind('customProcess')} maxLength={30} className="field" placeholder="예: 카보닉 매서레이션" />
              </div>
            )}
            {form.brew_method === '기타' && (
              <div className="col-span-2">
                <Label htmlFor="customMethod" hint="선택 · 최대 30자">추출 방식 직접 입력</Label>
                <input {...bind('customMethod')} maxLength={30} className="field" placeholder="예: 키와미, 칼리타 웨이브, 콜드브루" />
              </div>
            )}
            {/* 로스팅: 라이트~다크 사이 어디쯤인지 밀어서 */}
            <div className="col-span-2 mt-1">
              <RoastSlider id="roast_value" value={form.roast_value} onChange={set('roast_value')} />
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SectionTitle n="2">맛은 어땠나요</SectionTitle>
              <p className="mt-1 text-sm text-muted">1 약함 · 5 강함</p>
            </div>
            {/* 휴대폰: 제목 옆 작은 맛 그래프로 바로 확인 */}
            <div className="-my-1 shrink-0 md:hidden" aria-hidden>
              <RadarChart note={form} size={84} compact />
            </div>
          </div>
          <div className="mt-5 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-3">
              {ATTRIBUTES.map((a) => (
                <ScaleInput key={a.key} label={a.label} low={a.low} high={a.high} value={form[a.key]} onChange={set(a.key)} />
              ))}
            </div>
            <div className="hidden md:block" aria-hidden>
              <RadarChart note={form} size={240} />
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle n="3">느낀 향미</SectionTitle>
            {/* 휠 / 목록 보기 전환 (고른 방식은 이 기기에 기억) */}
            <div role="radiogroup" aria-label="향미 고르는 방식" className="inline-flex shrink-0 rounded-full border border-line bg-sunken/70 p-0.5 text-sm">
              {[['wheel', '휠'], ['list', '목록']].map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={flavorView === v}
                  onClick={() => chooseFlavorView(v)}
                  className={cx('h-9 rounded-full px-3.5 font-semibold transition-colors', flavorView === v ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-sm text-muted">확실하지 않아도 괜찮아요. 떠오르는 것을 골라 보세요.</p>
          {/* 고른 향미: 위에 모아 보여 주고 누르면 빼기 */}
          <div className="mt-4 flex min-h-11 flex-wrap items-center gap-1.5 rounded-xl bg-sunken/60 p-2">
            {form.flavors.length ? (
              form.flavors.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => toggleFlavor(f)}
                  aria-label={`${f} 빼기`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink pl-3 pr-2 text-sm font-semibold text-paper"
                >
                  <span aria-hidden className="size-1.5 rounded-full" style={{ background: flavorDot(f) }} />
                  {f} <X size={13} className="opacity-70" />
                </button>
              ))
            ) : (
              <span className="px-2 text-sm text-muted">아래에서 골라 주세요 · 최대 {MAX_FLAVORS}개</span>
            )}
          </div>

          {flavorView === 'wheel' ? (
            <>
              <FlavorWheel selected={form.flavors} onToggle={toggleFlavor} max={MAX_FLAVORS} className="mt-4" />
              <div className="mt-4 flex max-w-sm gap-2">
                <input
                  value={customFlavor}
                  onChange={(e) => setCustomFlavor(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomFlavor(); } }}
                  maxLength={20}
                  className="field h-11 py-0"
                  placeholder="직접 추가 (예: 유자)"
                  aria-label="향미 직접 입력"
                />
                <Button variant="outline" className="h-11 shrink-0" onClick={addCustomFlavor} disabled={!customFlavor.trim() || form.flavors.length >= MAX_FLAVORS}>
                  <Plus size={15} /> 추가
                </Button>
              </div>
            </>
          ) : (
            <>
            {/* 분류 탭 → 그 분류의 향미만 */}
            <div role="tablist" aria-label="향미 분류" className="mt-4 grid grid-cols-4 gap-1.5 sm:flex sm:flex-wrap">
              {FLAVOR_GROUPS.map((g) => {
                const n = g.items.filter((i) => form.flavors.includes(i)).length;
                const active = flavorGroup === g.name;
                return (
                  <button
                    key={g.name}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-label={g.name}
                    onClick={() => setFlavorGroup(g.name)}
                    className={cx(
                      'inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-full border px-2 text-[0.8rem] font-semibold whitespace-nowrap transition-colors sm:px-3.5 sm:text-sm',
                      active ? 'border-ink bg-surface text-ink' : 'border-transparent bg-sunken/70 text-ink-soft hover:text-ink',
                    )}
                  >
                    <span aria-hidden className="hidden size-2 shrink-0 rounded-full sm:inline-block" style={{ background: g.dot }} />
                    <span className="sm:hidden">{g.short ?? g.name}</span>
                    <span className="hidden sm:inline">{g.name}</span>
                    {n > 0 && <span className="text-xs text-accent tnum">{n}</span>}
                  </button>
                );
              })}
              <button
                type="button"
                role="tab"
                aria-selected={flavorGroup === '직접'}
                onClick={() => setFlavorGroup('직접')}
                className={cx(
                  'inline-flex h-10 min-w-0 items-center justify-center gap-1 rounded-full border px-2 text-[0.8rem] font-semibold whitespace-nowrap sm:px-3.5 sm:text-sm',
                  flavorGroup === '직접' ? 'border-ink bg-surface text-ink' : 'border-transparent bg-sunken/70 text-ink-soft hover:text-ink',
                )}
              >
                <Plus size={13} /> 직접
              </button>
            </div>

            <div className="mt-3 min-h-[5.5rem]">
              {flavorGroup === '직접' ? (
                <div className="flex max-w-sm gap-2">
                  <input
                    value={customFlavor}
                    onChange={(e) => setCustomFlavor(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomFlavor(); } }}
                    maxLength={20}
                    className="field h-11 py-0"
                    placeholder="예: 유자, 곶감"
                    aria-label="향미 직접 입력"
                  />
                  <Button variant="outline" className="h-11 shrink-0" onClick={addCustomFlavor} disabled={!customFlavor.trim() || form.flavors.length >= MAX_FLAVORS}>
                    <Plus size={15} /> 추가
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {FLAVOR_GROUPS.find((g) => g.name === flavorGroup).items.map((f) => (
                    <FlavorChip key={f} name={f} selected={form.flavors.includes(f)} onClick={() => toggleFlavor(f)} />
                  ))}
                </div>
              )}
            </div>
            </>
          )}
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <SectionTitle n="4">한 줄 정리</SectionTitle>
          <PhotoPicker label="사진 (원두 봉투·잔·카페)" value={Array.isArray(form.photos) ? form.photos : []} onChange={set('photos')} />
          <div>
            <p className="mb-2 text-sm font-semibold">별점</p>
            <StarInput value={form.rating} onChange={set('rating')} />
          </div>
          <div>
            <Label htmlFor="memo" hint={`${form.memo.length}/2000`}>메모</Label>
            <textarea {...bind('memo')} rows={5} maxLength={2000} className="field resize-y leading-relaxed" placeholder="레시피, 온도에 따른 변화, 같이 먹은 디저트, 다음에 바꿔 볼 점…" />
          </div>
        </Card>
      </div>

      {error && <div className="mt-5"><Notice tone="accent">{error}</Notice></div>}

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-6 flex justify-end gap-2 md:bottom-4">
        <div className="flex gap-2 rounded-full border border-line bg-surface/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur">
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={saving}>취소</Button>
          <button type="submit" disabled={saving || preview} className="inline-flex h-11 items-center rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-strong disabled:opacity-50">
            {preview ? '미리보기 · 저장 불가' : saving ? '저장 중…' : id ? '수정 완료' : '노트 올리기'}
          </button>
        </div>
      </div>
    </form>
  );
}

// 지도에서 다른 나라를 누르면 산지를 바꾸되, 같은 나라면 "에티오피아 구지"처럼 적어 둔 세부 지역은 남긴다
function keepRegion(current, country) {
  const prev = matchOrigin(current);
  return prev && prev.name === country && current.trim() ? current : country;
}

// 활동(과 원두)을 고르면 마신 날과 원두 정보를 채운다. 사용자가 이미 적은 값은 원두를 고를 때만 덮어쓴다.
function applyActivity(form, activity, bean) {
  const next = { ...form, activity_id: activity.id, activity_bean_id: bean?.id ?? '' };
  if (activity.held_on <= today()) next.tasted_on = activity.held_on;
  if (bean) {
    next.bean_name = bean.name;
    next.roaster = bean.roaster ?? '';
    next.origin = bean.origin ?? '';
    Object.assign(next, processFields(bean.process));
    next.roast_value = roastValueOf(bean.roast_level);
  }
  return next;
}

function methodFields(value = '') {
  const choice = methodOption(value) || '';
  return { brew_method: choice, customMethod: choice === '기타' && value !== '기타' ? value : '' };
}

function processFields(value = '') {
  const choice = processOption(value) || '';
  return { process: choice, customProcess: choice === '기타' && value !== '기타' ? value : '' };
}

function SectionTitle({ n, children }) {
  return (
    <h2 className="flex items-center gap-2.5 text-lg font-bold">
      <span className="grid size-6 place-items-center rounded-full bg-ink font-display text-xs text-paper">{n}</span>
      {children}
    </h2>
  );
}
