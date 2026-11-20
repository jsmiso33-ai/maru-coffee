import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, CalendarDays, MapPin, Plus } from 'lucide-react';
import { getNote, listActivities, saveNote } from '../lib/db.js';
import { daysUntil, formatDay } from '../lib/format.js';
import { useAuth } from '../lib/auth.jsx';
import { isConfigured } from '../lib/supabase.js';
import { ATTRIBUTES, BREW_METHODS, ORIGINS, PROCESSES, ROAST_LEVELS, processOption } from '../data/options.js';
import { FLAVOR_GROUPS } from '../data/flavors.js';
import { Button, Card, FlavorChip, Label, Notice, ScaleInput, Spinner, StarInput, cx } from '../components/ui.jsx';
import MemberGate from '../components/MemberGate.jsx';
import RadarChart from '../components/RadarChart.jsx';
import WorldMap from '../components/WorldMap.jsx';
import { matchOrigin } from '../data/origins.js';
import { NotFound } from './NotFound.jsx';

const MAX_FLAVORS = 12;

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY = {
  bean_name: '', roaster: '', origin: '', process: '', customProcess: '', roast_level: '', brew_method: '',
  tasted_on: today(), flavors: [], acidity: 3, sweetness: 3, body: 3, bitterness: 3, aftertaste: 3,
  rating: 3.5, memo: '', activity_id: '', activity_bean_id: '',
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
  const [params] = useSearchParams();
  const [activities, setActivities] = useState([]);
  const prefilled = useRef(false);

  // 노트를 연결할 수 있는 활동: 최근 120일 ~ 일주일 뒤
  useEffect(() => {
    listActivities()
      .then((all) => setActivities(all.filter((a) => daysUntil(a.held_on) >= -120 && daysUntil(a.held_on) <= 7)))
      .catch(() => setActivities([]));
  }, []);

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
        else setForm({ ...EMPTY, ...Object.fromEntries(Object.entries(n).map(([k, v]) => [k, v ?? ''])), ...processFields(n.process), rating: Number(n.rating) });
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

  const allPreset = new Set(FLAVOR_GROUPS.flatMap((g) => g.items));
  const customSelected = form.flavors.filter((f) => !allPreset.has(f));
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
      const saved = await saveNote({ ...form, process, bean_name: form.bean_name.trim() }, id);
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
          <div>
            <Label htmlFor="bean_name" hint="필수">원두 이름</Label>
            <input {...bind('bean_name')} maxLength={80} className="field" placeholder="예: 에티오피아 예가체프 코체레" aria-invalid={touched && beanMissing} />
            {touched && beanMissing && <p className="mt-1.5 text-sm text-accent">원두 이름을 적어 주세요.</p>}
          </div>
          <div>
            <Label htmlFor="roaster">로스터리 · 카페</Label>
            <input {...bind('roaster')} maxLength={60} className="field" placeholder="어디서 샀거나 마셨나요" />
          </div>
          <div>
            <Label htmlFor="origin" hint="지도에서 나라를 누르거나 직접 입력">산지</Label>
            <WorldMap
              selectedId={originMatch?.id}
              onSelect={(o) => setForm((f) => ({ ...f, origin: keepRegion(f.origin, o.name) }))}
              className="mb-2.5"
            />
            <input {...bind('origin')} maxLength={60} className="field" list="origin-list" placeholder="예: 에티오피아 구지 · 블렌드" />
            <datalist id="origin-list">{ORIGINS.map((o) => <option key={o} value={o} />)}</datalist>
            {!form.origin.trim() && guessedOrigin && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, origin: guessedOrigin.name }))}
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent-soft px-3.5 text-sm font-semibold text-accent-strong sm:min-h-9"
              >
                <MapPin size={14} /> 원두 이름에 있는 ‘{guessedOrigin.name}’로 넣기
              </button>
            )}
          </div>
          <OptionRow label="가공 방식" options={PROCESSES} value={form.process} onChange={set('process')} />
          {form.process === '기타' && <div>
            <Label htmlFor="customProcess" hint="선택 · 최대 30자">가공 방식 직접 입력</Label>
            <input {...bind('customProcess')} maxLength={30} className="field" placeholder="예: 카보닉 매서레이션" />
          </div>}
          <OptionRow label="로스팅" options={ROAST_LEVELS} value={form.roast_level} onChange={set('roast_level')} />
          <OptionRow label="추출 방식" options={BREW_METHODS} value={form.brew_method} onChange={set('brew_method')} />
          <div className="sm:w-1/2">
            <Label htmlFor="tasted_on">마신 날</Label>
            <input {...bind('tasted_on')} type="date" max={today()} className="field" />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <SectionTitle n="2">맛은 어땠나요</SectionTitle>
          <div className="mt-5 grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div className="space-y-5">
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
          <div className="flex items-baseline justify-between gap-3">
            <SectionTitle n="3">느낀 향미</SectionTitle>
            <span className="text-sm text-muted tnum">{form.flavors.length}/{MAX_FLAVORS}</span>
          </div>
          <p className="mt-1 text-sm text-muted">확실하지 않아도 괜찮아요. 떠오르는 것을 골라 보세요.</p>
          <div className="mt-5 space-y-4">
            {FLAVOR_GROUPS.map((g) => (
              <div key={g.name}>
                <p className="mb-2 text-xs font-semibold text-muted">{g.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((f) => (
                    <FlavorChip key={f} name={f} selected={form.flavors.includes(f)} onClick={() => toggleFlavor(f)} />
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="mb-2 text-xs font-semibold text-muted">직접 추가</p>
              <div className="flex flex-wrap gap-1.5">
                {customSelected.map((f) => (
                  <FlavorChip key={f} name={f} selected onClick={() => toggleFlavor(f)} />
                ))}
              </div>
              <div className="mt-2 flex max-w-sm gap-2">
                <input
                  value={customFlavor}
                  onChange={(e) => setCustomFlavor(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomFlavor(); } }}
                  maxLength={20}
                  className="field h-10 py-0"
                  placeholder="예: 유자, 곶감"
                  aria-label="향미 직접 입력"
                />
                <Button variant="outline" size="sm" className="h-10 shrink-0" onClick={addCustomFlavor} disabled={!customFlavor.trim() || form.flavors.length >= MAX_FLAVORS}>
                  <Plus size={15} /> 추가
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="space-y-5 p-5 sm:p-6">
          <SectionTitle n="4">한 줄 정리</SectionTitle>
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
    next.roast_level = bean.roast_level ?? '';
  }
  return next;
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

function OptionRow({ label, options, value, onChange }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(value === o ? '' : o)}
            className={cx(
              'h-11 rounded-full border px-3.5 text-sm sm:h-9 transition-colors',
              value === o ? 'border-ink bg-ink font-semibold text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong',
            )}
          >
            {o}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
