import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Minus, Plus, Save } from 'lucide-react';
import { BREW_PRESETS, STANDARD_RECIPES } from '../data/recipes.js';
import { Button, Card, PageHeader, cx } from '../components/ui.jsx';
import BrewTimer from '../components/BrewTimer.jsx';
import { formatDuration, round1 } from '../lib/format.js';

// 침출식·에스프레소는 붓기 스케줄 대신 표준 레시피 단계를 비율대로 늘려 쓴다
const FIXED_STEPS = {
  에어로프레스: 'aeropress',
  프렌치프레스: 'french-press',
  에스프레소: 'espresso',
  콜드브루: 'cold-brew',
};
const BLOOM_SECONDS = 40;

function buildSchedule({ method, dose, water, bloomX, pours, interval, totalTime }) {
  const fixedId = FIXED_STEPS[method];
  if (fixedId) {
    const base = STANDARD_RECIPES.find((r) => r.id === fixedId);
    const k = water / base.water_g;
    return {
      steps: base.steps.map((s) => ({ ...s, target: s.target != null ? Math.round(s.target * k) : null })),
      total: base.total_time_s,
    };
  }
  const steps = [];
  const bloom = bloomX > 0 ? Math.min(water, Math.round(dose * bloomX)) : 0;
  let t = 0;
  if (bloom) {
    steps.push({ at: 0, label: '뜸 들이기', target: bloom });
    t = BLOOM_SECONDS;
  }
  const rest = water - bloom;
  for (let i = 1; i <= pours; i++) {
    steps.push({
      at: t,
      label: pours === 1 ? '나머지 물 붓기' : `${i}차 붓기`,
      target: Math.round(bloom + (rest * i) / pours),
    });
    t += interval;
  }
  const lastPour = steps.at(-1)?.at ?? 0;
  const total = Math.max(totalTime, lastPour + 60);
  steps.push({ at: total, label: '드립 완료', target: null });
  return { steps, total };
}

export default function Brew() {
  const navigate = useNavigate();
  const [method, setMethod] = useState('V60');
  const preset = BREW_PRESETS.find((p) => p.method === method);
  const [dose, setDose] = useState('15');
  const [ratio, setRatio] = useState(String(preset.ratio));
  const [waterText, setWaterText] = useState(null); // 물을 직접 입력 중일 때만 문자열
  const [bloomX, setBloomX] = useState(preset.bloomX);
  const [pours, setPours] = useState(preset.pours);
  const [interval, setIntervalSec] = useState(preset.interval);

  const doseN = Number(dose) > 0 ? Number(dose) : 0;
  const ratioN = Number(ratio) > 0 ? Number(ratio) : 0;
  const water = Math.round(doseN * ratioN);
  const isPourOver = !FIXED_STEPS[method];
  const isEspresso = method === '에스프레소';

  const choose = (m) => {
    const p = BREW_PRESETS.find((x) => x.method === m);
    setMethod(m);
    setRatio(String(p.ratio));
    setBloomX(p.bloomX);
    setPours(p.pours);
    setIntervalSec(p.interval);
    setWaterText(null);
    if (m === '에스프레소') setDose('18');
    else if (m === '콜드브루') setDose('100');
    else if (method === '에스프레소' || method === '콜드브루') setDose('15');
  };

  const onWater = (text) => {
    setWaterText(text);
    const w = Number(text);
    if (w > 0 && ratioN > 0) setDose(String(round1(w / ratioN)));
  };

  const schedule = useMemo(
    () => (doseN && water ? buildSchedule({ method, dose: doseN, water, bloomX, pours, interval, totalTime: preset.time }) : null),
    [method, doseN, water, bloomX, pours, interval, preset.time],
  );

  const saveAsRecipe = () => {
    navigate('/recipes/new', {
      state: {
        recipe: {
          title: `나의 ${method} ${doseN}g`,
          method,
          dose_g: doseN,
          water_g: water,
          water_temp: preset.temp,
          total_time_s: schedule.total,
          steps: schedule.steps,
        },
      },
    });
  };

  return (
    <>
      <PageHeader eyebrow="Brew" title="계산기 · 타이머">
        원두 양과 비율만 정하면 물 양, 뜸, 나눠 붓기 스케줄이 나오고 바로 타이머로 내릴 수 있어요.
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.05fr]">
        <div className="space-y-5">
          <Card className="p-5 sm:p-6">
            <fieldset>
              <legend className="mb-2.5 text-sm font-semibold">추출 방식</legend>
              <div className="flex flex-wrap gap-1.5">
                {BREW_PRESETS.map((p) => (
                  <button
                    key={p.method}
                    type="button"
                    aria-pressed={method === p.method}
                    onClick={() => choose(p.method)}
                    className={cx('h-9 rounded-full border px-3.5 text-sm', method === p.method ? 'border-ink bg-ink font-semibold text-paper' : 'border-line bg-surface text-ink-soft hover:border-line-strong')}
                  >
                    {p.method}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-2 sm:gap-3">
              <BigNumber label="원두" unit="g" value={dose} onChange={(v) => { setDose(v); setWaterText(null); }} step={isEspresso ? 0.5 : 1} />
              <span className="pb-4 font-display text-2xl text-muted">×</span>
              <BigNumber label="비율 1 :" value={ratio} onChange={(v) => { setRatio(v); setWaterText(null); }} step={0.5} />
            </div>
            <div className="mt-3">
              <label htmlFor="water" className="text-xs font-semibold text-muted">{isEspresso ? '추출량' : '물'} — 직접 정해도 원두가 맞춰져요</label>
              <div className="mt-1 flex items-baseline gap-2 rounded-2xl bg-ink px-4 py-3 text-paper">
                <input
                  id="water"
                  type="number"
                  inputMode="decimal"
                  value={waterText ?? (water || '')}
                  onChange={(e) => onWater(e.target.value)}
                  onBlur={() => setWaterText(null)}
                  className="w-full min-w-0 bg-transparent font-display text-5xl font-light tnum outline-none"
                />
                <span className="text-xl text-paper/60">g</span>
              </div>
              <p className="mt-2 text-sm text-muted tnum">
                {isEspresso
                  ? `권장 추출 시간 27~32초 · ${preset.temp}°C`
                  : `물 온도 ${preset.temp}°C · 컵에 남는 양 약 ${Math.max(0, Math.round(water - doseN * 2))}g (원두가 약 2배 머금음)`}
              </p>
            </div>
          </Card>

          {isPourOver && (
            <Card className="space-y-5 p-5 sm:p-6">
              <h2 className="text-sm font-semibold">붓기 설정</h2>
              <Stepper label="뜸 물" value={bloomX} onChange={setBloomX} min={0} max={4} step={0.5} format={(v) => (v ? `원두 × ${v} = ${Math.round(doseN * v)}g` : '뜸 안 들이기')} />
              <Stepper label="나눠 붓기" value={pours} onChange={setPours} min={1} max={6} step={1} format={(v) => `${v}번`} />
              {pours > 1 && <Stepper label="붓기 간격" value={interval} onChange={setIntervalSec} min={15} max={60} step={5} format={(v) => `${v}초`} />}
            </Card>
          )}

          <ExtractionCalc defaultDose={doseN} defaultBeverage={Math.max(0, Math.round(water - doseN * 2))} />
        </div>

        <div className="space-y-3 lg:sticky lg:top-24">
          {schedule && (method === '콜드브루' ? (
            <Card className="p-5">
              <h2 className="text-sm font-semibold text-muted">콜드브루 순서 · {formatDuration(schedule.total)}</h2>
              <ol className="mt-3 space-y-2">
                {schedule.steps.map((s, i) => (
                  <li key={i} className="flex gap-3"><span className="w-16 shrink-0 text-sm font-semibold text-muted">{s.at ? formatDuration(s.at) : '시작'}</span>{s.label}{s.target != null && ` · ${s.target}g`}</li>
                ))}
              </ol>
            </Card>
          ) : (
            <BrewTimer key={`${method}-${water}-${bloomX}-${pours}-${interval}`} steps={schedule.steps} total={schedule.total} water={water} />
          ))}
          {schedule && (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={saveAsRecipe}><Save size={15} /> 이 설정을 레시피로 저장</Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BigNumber({ label, unit, value, onChange, step }) {
  const n = Number(value) || 0;
  const bump = (d) => onChange(String(Math.max(step, round1(n + d))));
  return (
    <div>
      <p className="text-xs font-semibold text-muted">{label}</p>
      <div className="mt-1 flex items-center rounded-2xl border border-line bg-paper">
        <button type="button" onClick={() => bump(-step)} aria-label={`${label} 줄이기`} className="grid h-14 w-10 shrink-0 place-items-center text-muted hover:text-ink"><Minus size={16} /></button>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          className="w-full min-w-0 bg-transparent text-center font-display text-3xl tnum outline-none"
        />
        {unit && <span className="-ml-1 text-muted">{unit}</span>}
        <button type="button" onClick={() => bump(step)} aria-label={`${label} 늘리기`} className="grid h-14 w-10 shrink-0 place-items-center text-muted hover:text-ink"><Plus size={16} /></button>
      </div>
    </div>
  );
}

function Stepper({ label, value, onChange, min, max, step, format }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-ink-soft">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold tnum">{format(value)}</span>
        <div className="flex">
          <button type="button" aria-label={`${label} 줄이기`} disabled={value <= min} onClick={() => onChange(round1(value - step))} className="grid size-9 place-items-center rounded-l-full border border-line hover:bg-sunken disabled:opacity-40"><Minus size={14} /></button>
          <button type="button" aria-label={`${label} 늘리기`} disabled={value >= max} onClick={() => onChange(round1(value + step))} className="grid size-9 place-items-center rounded-r-full border border-l-0 border-line hover:bg-sunken disabled:opacity-40"><Plus size={14} /></button>
        </div>
      </div>
    </div>
  );
}

// ───── 추출 수율(EY) — TDS 측정값이 있을 때 ─────
// EY(%) = TDS(%) × 음료 무게 / 원두 무게. SCA 골드컵 기준: TDS 1.15~1.35%, EY 18~22%.
function ExtractionCalc({ defaultDose, defaultBeverage }) {
  const [tds, setTds] = useState('');
  const [bev, setBev] = useState('');
  const [dose, setDose] = useState('');
  const doseN = Number(dose || defaultDose);
  const bevN = Number(bev || defaultBeverage);
  const tdsN = Number(tds);
  const ey = doseN > 0 && bevN > 0 && tdsN > 0 ? (tdsN * bevN) / doseN : null;

  let verdict = tdsN > 0 ? null : 'TDS를 입력하면 수율과 추출 상태를 알려 드려요.';
  if (ey != null) {
    const strength = tdsN < 1.15 ? '연함' : tdsN > 1.35 ? '진함' : '적정 농도';
    const extraction = ey < 18 ? '과소추출 — 분쇄를 가늘게, 물 온도를 높게' : ey > 22 ? '과다추출 — 분쇄를 굵게, 시간을 짧게' : '이상적인 추출 범위';
    verdict = `${strength} · ${extraction}`;
  }

  return (
    <Card className="p-5 sm:p-6">
      <h2 className="text-sm font-semibold">추출 수율 계산</h2>
      <p className="mt-1 text-xs text-muted">TDS 측정기(굴절계)가 있을 때. 비워 둔 칸은 위 설정값을 써요.</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <SmallField label="TDS (%)" value={tds} onChange={setTds} placeholder="1.30" />
        <SmallField label="음료 (g)" value={bev} onChange={setBev} placeholder={String(defaultBeverage)} />
        <SmallField label="원두 (g)" value={dose} onChange={setDose} placeholder={String(defaultDose)} />
      </div>
      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs text-muted">추출 수율</p>
          <p className="font-display text-5xl font-light tnum">{ey != null ? ey.toFixed(1) : '—'}<span className="text-2xl text-muted">%</span></p>
          {verdict && <p className="mt-1 text-sm text-ink-soft">{verdict}</p>}
        </div>
        <ControlChart tds={tdsN} ey={ey} />
      </div>
    </Card>
  );
}

function SmallField({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted">{label}</span>
      <input type="number" inputMode="decimal" step="0.01" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="field mt-1 tnum" />
    </label>
  );
}

// 브루잉 컨트롤 차트 축소판: x = 추출 수율 14~26%, y = TDS 0.9~1.7%
function ControlChart({ tds, ey }) {
  const W = 360, H = 170, P = { l: 34, r: 10, t: 12, b: 24 };
  const x = (v) => P.l + ((v - 14) / 12) * (W - P.l - P.r);
  const y = (v) => H - P.b - ((v - 0.9) / 0.8) * (H - P.t - P.b);
  const inChart = ey != null && tds > 0;
  const px = inChart ? x(Math.min(26, Math.max(14, ey))) : 0;
  const py = inChart ? y(Math.min(1.7, Math.max(0.9, tds))) : 0;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={inChart ? `TDS ${tds}%, 수율 ${ey.toFixed(1)}% 위치` : '브루잉 컨트롤 차트'}>
      <rect x={P.l} y={P.t} width={W - P.l - P.r} height={H - P.t - P.b} fill="var(--color-paper)" stroke="var(--color-line)" />
      <rect x={x(18)} y={y(1.35)} width={x(22) - x(18)} height={y(1.15) - y(1.35)} fill="var(--color-ok)" fillOpacity={0.14} stroke="var(--color-ok)" strokeOpacity={0.5} strokeDasharray="3 3" />
      <text x={(x(18) + x(22)) / 2} y={y(1.35) - 4} textAnchor="middle" fontSize={10} fill="var(--color-ok)" fontWeight={600}>이상 범위</text>
      {[14, 18, 22, 26].map((v) => (
        <text key={v} x={x(v)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--color-muted)">{v}%</text>
      ))}
      {[0.9, 1.15, 1.35, 1.7].map((v) => (
        <text key={v} x={P.l - 4} y={y(v) + 3} textAnchor="end" fontSize={10} fill="var(--color-muted)">{v}</text>
      ))}
      {inChart && <circle cx={px} cy={py} r={5.5} fill="var(--color-accent)" stroke="var(--color-surface)" strokeWidth={2} />}
    </svg>
  );
}

