import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { getRecipe, saveRecipe } from '../lib/db.js';
import { useAuth } from '../lib/auth.jsx';
import { RECIPE_METHODS } from '../data/options.js';
import { Button, Card, Label, Notice, Spinner, cx } from '../components/ui.jsx';
import MemberGate from '../components/MemberGate.jsx';
import { mmss, parseTime, ratioOf } from '../lib/format.js';
import { NotFound } from './NotFound.jsx';

const EMPTY = {
  title: '', method: 'V60', dose_g: '15', water_g: '250', water_temp: '93', grind: '', total_time: '3:00',
  bean_hint: '', memo: '',
  steps: [
    { at: '0:00', label: '뜸 들이기', target: '40' },
    { at: '0:40', label: '붓기', target: '250' },
    { at: '3:00', label: '완료', target: '' },
  ],
};

// DB 레코드(숫자·초) ↔ 폼(문자열·m:ss)
function toForm(r) {
  return {
    title: r.title ?? '',
    method: r.method ?? 'V60',
    dose_g: String(Number(r.dose_g) || ''),
    water_g: String(Number(r.water_g) || ''),
    water_temp: r.water_temp != null ? String(r.water_temp) : '',
    grind: r.grind ?? '',
    total_time: r.total_time_s != null ? mmss(r.total_time_s) : '',
    bean_hint: r.bean_hint ?? '',
    memo: r.memo ?? '',
    steps: (r.steps || []).map((s) => ({ at: mmss(s.at), label: s.label, target: s.target != null ? String(s.target) : '' })),
  };
}

function validate(f) {
  const errors = {};
  if (!f.title.trim()) errors.title = '레시피 이름을 적어 주세요.';
  if (!(Number(f.dose_g) > 0)) errors.dose_g = '원두 양을 확인해 주세요.';
  if (!(Number(f.water_g) > 0)) errors.water_g = '물 양을 확인해 주세요.';
  if (f.total_time && parseTime(f.total_time) == null) errors.total_time = '"3:00"처럼 적어 주세요.';
  f.steps.forEach((s, i) => {
    if (parseTime(s.at) == null) errors[`step${i}`] = '시간을 "0:45"처럼 적어 주세요.';
    else if (!s.label.trim()) errors[`step${i}`] = '할 일을 적어 주세요.';
  });
  return errors;
}

export default function RecipeForm() {
  return (
    <MemberGate what="레시피를 공유하려면">
      <RecipeFormInner />
    </MemberGate>
  );
}

function RecipeFormInner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const prefill = location.state?.recipe;
  const [form, setForm] = useState(id ? null : prefill ? toForm(prefill) : EMPTY);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getRecipe(id)
      .then((r) => (!r || r.user_id !== user?.id ? setNotFound(true) : setForm(toForm(r))))
      .catch((e) => setLoadError(e.message));
  }, [id, user?.id]);

  if (notFound) return <NotFound what="레시피" />;
  if (loadError) return <Notice tone="accent">{loadError}</Notice>;
  if (!form) return <Spinner />;

  const errors = touched ? validate(form) : {};
  const bind = (key) => ({
    id: key,
    value: form[key],
    onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })),
    'aria-invalid': Boolean(errors[key]) || undefined,
  });
  const setStep = (i, key, value) => setForm((f) => ({ ...f, steps: f.steps.map((s, j) => (j === i ? { ...s, [key]: value } : s)) }));
  const addStep = () => setForm((f) => {
    const last = f.steps.at(-1);
    const at = last ? mmss((parseTime(last.at) ?? 0) + 30) : '0:00';
    return { ...f, steps: [...f.steps, { at, label: '', target: '' }] };
  });
  const removeStep = (i) => setForm((f) => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(validate(form)).length) return;
    const steps = form.steps
      .map((s) => ({ at: parseTime(s.at), label: s.label.trim(), target: s.target === '' ? null : Number(s.target) }))
      .sort((a, b) => a.at - b.at);
    const lastAt = steps.at(-1)?.at ?? null;
    setSaving(true);
    setError('');
    try {
      const saved = await saveRecipe({
        title: form.title.trim(),
        method: form.method,
        dose_g: Number(form.dose_g),
        water_g: Number(form.water_g),
        water_temp: form.water_temp === '' ? null : Number(form.water_temp),
        grind: form.grind.trim(),
        total_time_s: form.total_time ? parseTime(form.total_time) : lastAt,
        steps,
        bean_hint: form.bean_hint.trim(),
        memo: form.memo.trim(),
      }, id);
      navigate(`/recipes/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const ratio = ratioOf(Number(form.dose_g), Number(form.water_g));

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-3xl">
      <Link to={id ? `/recipes/${id}` : '/recipes?tab=members'} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> 레시피
      </Link>
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{id ? '레시피 수정' : '레시피 공유'}</h1>

      <div className="space-y-5">
        <Card className="space-y-5 p-5 sm:p-6">
          <div>
            <Label htmlFor="title" hint="필수">레시피 이름</Label>
            <input {...bind('title')} maxLength={60} className="field" placeholder="예: 내추럴 원두용 V60 3분할" />
            <FieldError msg={errors.title} />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">추출 방식</legend>
            <div className="flex flex-wrap gap-1.5">
              {RECIPE_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={form.method === m}
                  onClick={() => setForm((f) => ({ ...f, method: m }))}
                  className={cx('h-11 rounded-full border px-3.5 text-sm sm:h-9', form.method === m ? 'border-ink bg-ink font-semibold text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong')}
                >
                  {m}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumberField label="원두 (g)" {...bind('dose_g')} error={errors.dose_g} />
            <NumberField label={form.method === '에스프레소' ? '추출량 (g)' : '물 (g)'} {...bind('water_g')} error={errors.water_g} />
            <NumberField label="물 온도 (°C)" {...bind('water_temp')} />
            <div>
              <Label htmlFor="total_time">총 시간</Label>
              <input {...bind('total_time')} className="field tnum" placeholder="3:00" inputMode="numeric" />
              <FieldError msg={errors.total_time} />
            </div>
          </div>
          {ratio && <p className="-mt-2 text-sm text-muted tnum">비율 1:{ratio}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="grind">분쇄도</Label>
              <input {...bind('grind')} maxLength={40} className="field" placeholder="예: 코만단테 24클릭" />
            </div>
            <div>
              <Label htmlFor="bean_hint">어울리는 원두</Label>
              <input {...bind('bean_hint')} maxLength={80} className="field" placeholder="예: 에티오피아 내추럴" />
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-bold">단계</h2>
          <p className="mt-1 text-sm text-muted">시간은 시작 기준, 물은 그 시점까지의 <strong className="font-semibold text-ink-soft">누적</strong> 무게예요. 타이머가 이 순서대로 안내해요.</p>
          <ol className="mt-5 space-y-2.5">
            {form.steps.map((s, i) => (
              <li key={i}>
                <div className="grid grid-cols-[4.5rem_1fr_4.75rem_2.5rem] items-center gap-2">
                  <input value={s.at} onChange={(e) => setStep(i, 'at', e.target.value)} className="field px-2 text-center tnum" aria-label={`${i + 1}단계 시간`} inputMode="numeric" placeholder="0:00" />
                  <input value={s.label} onChange={(e) => setStep(i, 'label', e.target.value)} maxLength={40} className="field" aria-label={`${i + 1}단계 할 일`} placeholder="할 일" />
                  <div className="relative">
                    <input value={s.target} onChange={(e) => setStep(i, 'target', e.target.value.replace(/[^\d.]/g, ''))} className="field pr-6 text-right tnum" aria-label={`${i + 1}단계 누적 물(g)`} inputMode="decimal" placeholder="—" />
                    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted">g</span>
                  </div>
                  <button type="button" onClick={() => removeStep(i)} aria-label={`${i + 1}단계 삭제`} className="grid size-10 place-items-center rounded-full text-muted hover:bg-sunken hover:text-ink">
                    <X size={16} />
                  </button>
                </div>
                <FieldError msg={errors[`step${i}`]} />
              </li>
            ))}
          </ol>
          <Button variant="outline" size="sm" className="mt-4" onClick={addStep} disabled={form.steps.length >= 20}>
            <Plus size={15} /> 단계 추가
          </Button>
        </Card>

        <Card className="p-5 sm:p-6">
          <Label htmlFor="memo">팁 · 메모</Label>
          <textarea {...bind('memo')} rows={4} maxLength={2000} className="field resize-y leading-relaxed" placeholder="이 레시피를 쓰는 이유, 맛이 어떻게 달라지는지, 주의할 점" />
        </Card>
      </div>

      {error && <div className="mt-5"><Notice tone="accent">{error}</Notice></div>}
      {touched && Object.keys(errors).length > 0 && <p className="mt-4 text-right text-sm text-accent">빨간 칸을 확인해 주세요.</p>}

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-6 flex justify-end md:bottom-4">
        <div className="flex gap-2 rounded-full border border-line bg-surface/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur">
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={saving}>취소</Button>
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-strong disabled:opacity-50">
            {saving ? '저장 중…' : id ? '수정 완료' : '레시피 올리기'}
          </button>
        </div>
      </div>
    </form>
  );
}

function NumberField({ label, error, id, ...rest }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <input id={id} {...rest} type="number" inputMode="decimal" min={0} className="field tnum" />
      <FieldError msg={error} />
    </div>
  );
}

function FieldError({ msg }) {
  return msg ? <p className="mt-1.5 text-sm text-accent">{msg}</p> : null;
}
