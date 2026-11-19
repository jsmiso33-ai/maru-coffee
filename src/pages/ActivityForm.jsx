import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, ArrowDown, ArrowUp, Plus, X } from 'lucide-react';
import { getActivity, saveActivity } from '../lib/db.js';
import { ACTIVITY_KINDS, ORIGINS, PROCESSES, ROAST_LEVELS } from '../data/options.js';
import { Button, Card, Label, Notice, Spinner, cx } from '../components/ui.jsx';
import MemberGate from '../components/MemberGate.jsx';
import { NotFound } from './NotFound.jsx';
import { todayKey } from '../lib/format.js';

const EMPTY_BEAN = { name: '', roaster: '', origin: '', process: '', roast_level: '' };

export default function ActivityForm() {
  return (
    <MemberGate admin what="활동을 만들려면">
      <ActivityFormInner />
    </MemberGate>
  );
}

function ActivityFormInner() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(
    id ? null : { title: '', kind: '정기 모임', held_on: params.get('date') || todayKey(), start_time: '', place: '', description: '', prep: '' },
  );
  const [beans, setBeans] = useState(id ? [] : [{ ...EMPTY_BEAN }]);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getActivity(id)
      .then((a) => {
        if (!a) return setNotFound(true);
        setForm({
          title: a.title, kind: a.kind, held_on: a.held_on, start_time: a.start_time?.slice(0, 5) ?? '',
          place: a.place ?? '', description: a.description ?? '', prep: a.prep ?? '',
        });
        setBeans((a.beans || []).map((b) => ({ id: b.id, ...Object.fromEntries(Object.keys(EMPTY_BEAN).map((k) => [k, b[k] ?? ''])) })));
      })
      .catch((e) => setLoadError(e.message));
  }, [id]);

  if (notFound) return <NotFound what="활동" />;
  if (loadError) return <Notice tone="accent">{loadError}</Notice>;
  if (!form) return <Spinner />;

  const bind = (key) => ({ id: key, value: form[key], onChange: (e) => setForm((f) => ({ ...f, [key]: e.target.value })) });
  const setBean = (i, key, value) => setBeans((bs) => bs.map((b, j) => (j === i ? { ...b, [key]: value } : b)));
  const moveBean = (i, d) => setBeans((bs) => {
    const next = [...bs];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    return next;
  });

  const titleMissing = !form.title.trim();
  const dateMissing = !form.held_on;
  // 이름이 빈 원두 줄은 저장할 때 무시
  const filledBeans = beans.filter((b) => b.name.trim());

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (titleMissing || dateMissing) return;
    setSaving(true);
    setError('');
    try {
      const saved = await saveActivity(
        { ...form, title: form.title.trim(), start_time: form.start_time || null },
        filledBeans.map((b) => ({ ...b, name: b.name.trim() })),
        id,
      );
      navigate(`/activities/${saved.id}`, { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-3xl">
      <Link to={id ? `/activities/${id}` : '/activities'} className="mb-6 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft size={16} /> 활동
      </Link>
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{id ? '활동 수정' : '활동 만들기'}</h1>

      <div className="space-y-5">
        <Card className="space-y-5 p-5 sm:p-6">
          <div>
            <Label htmlFor="title" hint="필수">활동 이름</Label>
            <input {...bind('title')} maxLength={60} className="field" placeholder="예: 11월 정기 커핑 — 에티오피아 3종" aria-invalid={touched && titleMissing} />
            {touched && titleMissing && <p className="mt-1.5 text-sm text-accent">활동 이름을 적어 주세요.</p>}
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">종류</legend>
            <div className="flex flex-wrap gap-1.5">
              {ACTIVITY_KINDS.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-pressed={form.kind === k}
                  onClick={() => setForm((f) => ({ ...f, kind: k }))}
                  className={cx('h-11 rounded-full border px-3.5 text-sm sm:h-9', form.kind === k ? 'border-ink bg-ink font-semibold text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong')}
                >
                  {k}
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-[1fr_1fr_1.4fr]">
            <div>
              <Label htmlFor="held_on" hint="필수">날짜</Label>
              <input {...bind('held_on')} type="date" className="field" aria-invalid={touched && dateMissing} />
            </div>
            <div>
              <Label htmlFor="start_time">시작 시간</Label>
              <input {...bind('start_time')} type="time" step={600} className="field" />
            </div>
            <div>
              <Label htmlFor="place">장소</Label>
              <input {...bind('place')} maxLength={80} className="field" placeholder="예: 학생회관 302호" />
            </div>
          </div>
          <div>
            <Label htmlFor="description">소개</Label>
            <textarea {...bind('description')} rows={3} maxLength={2000} className="field resize-y leading-relaxed" placeholder="이번 활동에서 무엇을 하는지, 진행 순서" />
          </div>
          <div>
            <Label htmlFor="prep">준비물</Label>
            <input {...bind('prep')} maxLength={300} className="field" placeholder="예: 개인 컵, 회비 5,000원" />
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-bold">마실 원두</h2>
          <p className="mt-1 text-sm text-muted">여기 등록한 원두를 부원들이 노트에서 고르면, 활동 페이지에 원두별 평균이 모여요.</p>
          <ol className="mt-5 space-y-3">
            {beans.map((b, i) => (
              <li key={b.id || `new-${i}`} className="rounded-2xl border border-line bg-paper/60 p-3.5">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ink font-display text-sm text-paper">{i + 1}</span>
                  <input
                    value={b.name}
                    onChange={(e) => setBean(i, 'name', e.target.value)}
                    maxLength={80}
                    className="field"
                    placeholder="원두 이름 (예: 에티오피아 구지 우라가)"
                    aria-label={`${i + 1}번 원두 이름`}
                  />
                  <div className="flex shrink-0">
                    <button type="button" disabled={i === 0} onClick={() => moveBean(i, -1)} aria-label="위로" className="grid size-11 place-items-center rounded-full text-muted hover:bg-sunken disabled:opacity-30"><ArrowUp size={16} /></button>
                    <button type="button" disabled={i === beans.length - 1} onClick={() => moveBean(i, 1)} aria-label="아래로" className="grid size-11 place-items-center rounded-full text-muted hover:bg-sunken disabled:opacity-30"><ArrowDown size={16} /></button>
                    <button type="button" onClick={() => setBeans((bs) => bs.filter((_, j) => j !== i))} aria-label={`${i + 1}번 원두 빼기`} className="grid size-11 place-items-center rounded-full text-muted hover:bg-sunken hover:text-accent"><X size={16} /></button>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input value={b.roaster} onChange={(e) => setBean(i, 'roaster', e.target.value)} maxLength={60} className="field" placeholder="로스터리" aria-label={`${i + 1}번 로스터리`} />
                  <input value={b.origin} onChange={(e) => setBean(i, 'origin', e.target.value)} maxLength={60} className="field" placeholder="산지" list="activity-origins" aria-label={`${i + 1}번 산지`} />
                  <BeanSelect label={`${i + 1}번 가공`} value={b.process} onChange={(v) => setBean(i, 'process', v)} options={PROCESSES} placeholder="가공" />
                  <BeanSelect label={`${i + 1}번 로스팅`} value={b.roast_level} onChange={(v) => setBean(i, 'roast_level', v)} options={ROAST_LEVELS} placeholder="로스팅" />
                </div>
              </li>
            ))}
          </ol>
          <datalist id="activity-origins">{ORIGINS.map((o) => <option key={o} value={o} />)}</datalist>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setBeans((bs) => [...bs, { ...EMPTY_BEAN }])} disabled={beans.length >= 12}>
            <Plus size={15} /> 원두 추가
          </Button>
          {id && <p className="mt-3 text-xs text-muted">원두를 빼면 그 원두에 연결된 노트는 남고, 원두 연결만 풀려요.</p>}
        </Card>
      </div>

      {error && <div className="mt-5"><Notice tone="accent">{error}</Notice></div>}

      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-10 mt-6 flex justify-end md:bottom-4">
        <div className="flex gap-2 rounded-full border border-line bg-surface/95 p-1.5 shadow-[var(--shadow-card)] backdrop-blur">
          <Button variant="ghost" onClick={() => navigate(-1)} disabled={saving}>취소</Button>
          <button type="submit" disabled={saving} className="inline-flex h-11 items-center rounded-full bg-accent px-6 font-semibold text-white hover:bg-accent-strong disabled:opacity-50">
            {saving ? '저장 중…' : id ? '수정 완료' : '활동 만들기'}
          </button>
        </div>
      </div>
    </form>
  );
}

function BeanSelect({ label, value, onChange, options, placeholder }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={cx('field', !value && 'text-[#857769]')}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
