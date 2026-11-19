import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { mmss } from '../lib/format.js';
import { cx } from './ui.jsx';

// 단계 전환 때 짧은 비프음 + 진동. 오디오 컨텍스트는 사용자 클릭 후에만 만들 수 있다.
function useBeeper() {
  const ctxRef = useRef(null);
  return {
    unlock() {
      try {
        if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current.resume?.();
      } catch { /* 소리 없이 진행 */ }
    },
    beep(final = false) {
      try {
        const ctx = ctxRef.current;
        if (!ctx) return;
        const t = ctx.currentTime;
        [0, final ? 0.18 : null, final ? 0.36 : null].filter((d) => d !== null).forEach((d) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.value = final ? 1046 : 880;
          gain.gain.setValueAtTime(0.0001, t + d);
          gain.gain.exponentialRampToValueAtTime(0.25, t + d + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.14);
          osc.connect(gain).connect(ctx.destination);
          osc.start(t + d);
          osc.stop(t + d + 0.16);
        });
      } catch { /* noop */ }
      try { navigator.vibrate?.(final ? [120, 80, 120] : 90); } catch { /* noop */ }
    },
  };
}

// 타이머가 돌아가는 동안 화면이 꺼지지 않게
function useWakeLock(active) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock = null;
    let released = false;
    navigator.wakeLock.request('screen').then((l) => {
      if (released) l.release();
      else lock = l;
    }).catch(() => {});
    return () => {
      released = true;
      lock?.release().catch(() => {});
    };
  }, [active]);
}

export default function BrewTimer({ steps, total, water }) {
  const sorted = useMemo(() => [...steps].sort((a, b) => a.at - b.at), [steps]);
  const end = Math.max(total || 0, sorted.at(-1)?.at || 0);

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0); // 초(소수)
  const [sound, setSound] = useState(true);
  const startRef = useRef(0); // performance.now() 기준 시작 시각(일시정지 보정 포함)
  const lastStepRef = useRef(-1);
  const beeper = useBeeper();
  useWakeLock(running);

  useEffect(() => {
    if (!running) return;
    let raf;
    const tick = () => {
      const now = (performance.now() - startRef.current) / 1000;
      setElapsed(now);
      if (now >= end + 60 * 10) setRunning(false); // 끝나고 10분 지나면 자동 정지
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, end]);

  const currentIndex = sorted.reduce((idx, s, i) => (elapsed >= s.at ? i : idx), -1);
  const current = sorted[currentIndex];
  const next = sorted[currentIndex + 1];
  const done = elapsed >= end && elapsed > 0;

  // 새 단계에 진입하면 알림
  useEffect(() => {
    if (!running) return;
    if (currentIndex !== lastStepRef.current) {
      if (lastStepRef.current !== -1 || currentIndex > 0) {
        if (sound) beeper.beep(currentIndex === sorted.length - 1);
      }
      lastStepRef.current = currentIndex;
    }
  }, [currentIndex, running, sound, sorted.length, beeper]);

  const toggle = () => {
    beeper.unlock();
    if (running) {
      setRunning(false);
    } else {
      if (done) reset();
      startRef.current = performance.now() - (done ? 0 : elapsed) * 1000;
      if (elapsed === 0 || done) {
        lastStepRef.current = 0;
        if (sound) beeper.beep(false);
      }
      setRunning(true);
    }
  };

  function reset() {
    setRunning(false);
    setElapsed(0);
    lastStepRef.current = -1;
  }

  const progress = end ? Math.min(1, elapsed / end) : 0;
  const toNext = next ? next.at - elapsed : 0;

  return (
    <section aria-label="브루잉 타이머" className="overflow-hidden rounded-[var(--radius-card)] bg-ink text-paper">
      <div className="px-5 pb-5 pt-6 sm:px-8 sm:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-paper/50">{done ? '완료' : running ? '진행 중' : elapsed > 0 ? '일시정지' : '준비'}</p>
            <p className="mt-1 font-display text-[4.5rem] font-light leading-none tnum sm:text-[5.5rem]" aria-live="off">
              {mmss(Math.floor(elapsed))}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSound((s) => !s)}
            aria-label={sound ? '알림음 끄기' : '알림음 켜기'}
            className="grid size-10 place-items-center rounded-full text-paper/70 hover:bg-paper/10"
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        <div className="mt-5 min-h-[4.5rem]" aria-live="polite">
          {current ? (
            <>
              <p className="text-xl font-semibold leading-snug">{current.label}</p>
              {current.target != null && (
                <p className="mt-1 text-paper/70">
                  저울 <strong className="font-display text-2xl font-normal text-crema tnum">{current.target}g</strong>까지
                </p>
              )}
            </>
          ) : (
            <p className="text-paper/60">시작을 누르면 첫 단계가 안내돼요{water ? ` · 총 ${water}g` : ''}</p>
          )}
        </div>

        {next && (running || elapsed > 0) && (
          <p className="mt-2 text-sm text-paper/60">
            다음 · {next.label} <span className="tnum text-paper/90">{mmss(Math.ceil(toNext))}</span> 후
          </p>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={toggle}
            className="inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-full bg-paper text-lg font-semibold text-ink hover:bg-white sm:flex-none sm:px-10"
          >
            {running ? <><Pause size={20} /> 일시정지</> : <><Play size={20} /> {done ? '다시 시작' : elapsed > 0 ? '계속' : '시작'}</>}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={elapsed === 0}
            aria-label="처음으로"
            className="grid size-14 place-items-center rounded-full border border-paper/20 text-paper/80 hover:bg-paper/10 disabled:opacity-30"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-paper/10" aria-hidden>
        <div className="h-full bg-crema" style={{ width: `${progress * 100}%` }} />
      </div>

      <ol className="divide-y divide-paper/10 text-sm">
        {sorted.map((s, i) => (
          <li
            key={i}
            className={cx(
              'flex items-center gap-4 px-5 py-3 sm:px-8',
              i === currentIndex ? 'bg-paper/10 text-paper' : i < currentIndex ? 'text-paper/40' : 'text-paper/75',
            )}
          >
            <span className="w-12 shrink-0 tnum font-semibold">{mmss(s.at)}</span>
            <span className="min-w-0 flex-1">{s.label}</span>
            <span className="w-14 shrink-0 text-right tnum">{s.target != null ? `${s.target}g` : ''}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
