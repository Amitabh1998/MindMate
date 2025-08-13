// client/src/pages/MeditatePage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Logo from "../components/Logo";
import LogoutButton from "../components/LogoutButton";
import { Play, Pause, RotateCcw } from "lucide-react";

type Phase = "inhale" | "exhale";

function fmtMMSS(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export default function MeditatePage() {
  // Session presets (5/10/15 min)
  const presets = useMemo(() => [5 * 60, 10 * 60, 15 * 60], []);
  const [duration, setDuration] = useState(presets[0]);
  const [remaining, setRemaining] = useState(presets[0]);
  const [running, setRunning] = useState(false);

  // Breath durations (user-adjustable): 2–10 seconds
  const MIN = 2, MAX = 10;
  const [inhaleSec, setInhaleSec] = useState(4);
  const [exhaleSec, setExhaleSec] = useState(4);
  const inhaleMs = inhaleSec * 1000;
  const exhaleMs = exhaleSec * 1000;

  // Breath phase loop
  const [phase, setPhase] = useState<Phase>("inhale");
  const phaseTimer = useRef<number | null>(null);
  const tickTimer = useRef<number | null>(null);

  // Countdown
  useEffect(() => {
    if (!running) return;
    tickTimer.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (tickTimer.current) clearInterval(tickTimer.current);
          if (phaseTimer.current) clearTimeout(phaseTimer.current);
          setRunning(false);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (tickTimer.current) clearInterval(tickTimer.current);
      tickTimer.current = null;
    };
  }, [running]);

  // Loop phases; restart if inhale/exhale duration changes while running
  useEffect(() => {
    if (!running) return;
    let cancelled = false;
    let tid: number | undefined;

    const step = (next: Phase) => {
      if (cancelled) return;
      setPhase(next);
      const wait = next === "inhale" ? inhaleMs : exhaleMs;
      tid = window.setTimeout(() => step(next === "inhale" ? "exhale" : "inhale"), wait);
      phaseTimer.current = tid as unknown as number;
    };

    step(phase); // continue from current phase

    return () => {
      cancelled = true;
      if (tid) clearTimeout(tid);
      phaseTimer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, inhaleMs, exhaleMs]);

  // Controls
  const start = () => {
    setPhase("inhale");
    setRunning(true);
  };
  const pause = () => {
    setRunning(false);
    if (phaseTimer.current) clearTimeout(phaseTimer.current);
    phaseTimer.current = null;
  };
  const reset = () => {
    pause();
    setRemaining(duration);
    setPhase("inhale");
  };
  const setPreset = (secs: number) => {
    pause();
    setDuration(secs);
    setRemaining(secs);
  };

  // Ring visuals
  const ms = phase === "inhale" ? inhaleMs : exhaleMs;
  const scale = phase === "inhale" ? 1.14 : 0.88;
  const glow = phase === "inhale" ? 0.48 : 0.18;

  // Pretty filled sliders
  const pct = (v: number) => ((v - MIN) / (MAX - MIN)) * 100;
  const fill = (v: number) => `linear-gradient(90deg, #4f46e5 ${pct(v)}%, #e5e7eb ${pct(v)}%)`;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <Logo inline />
          <div className="flex items-center gap-3">
            <div className="hidden text-sm text-slate-600 sm:block">Meditate</div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          Mindful breathing
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Choose a duration and start. The ring expands for <span className="font-medium">inhale</span> and
          contracts for <span className="font-medium">exhale</span>.
        </p>

        {/* Session length presets */}
        <div className="mt-6 flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={[
                "rounded-full border px-4 py-2 text-sm",
                duration === p
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {Math.round(p / 60)} min
            </button>
          ))}
        </div>

        {/* Adjustable inhale/exhale durations */}
        <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Inhale duration</span>
              <span className="tabular-nums">{inhaleSec}s</span>
            </div>
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={1}
              value={inhaleSec}
              onChange={(e) => setInhaleSec(parseInt(e.target.value, 10))}
              className="mm-range w-full"
              style={{ background: fill(inhaleSec) }}
            />
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Exhale duration</span>
              <span className="tabular-nums">{exhaleSec}s</span>
            </div>
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={1}
              value={exhaleSec}
              onChange={(e) => setExhaleSec(parseInt(e.target.value, 10))}
              className="mm-range w-full"
              style={{ background: fill(exhaleSec) }}
            />
          </div>
        </div>

        {/* Timer + Ring */}
        <section className="mt-10 grid items-center gap-10 lg:grid-cols-2">
          {/* Timer & controls */}
          <div className="flex flex-col items-start">
            <div className="text-7xl font-semibold tabular-nums leading-none">
              {fmtMMSS(remaining)}
            </div>
            <div className="mt-5 flex items-center gap-3">
              {running ? (
                <button
                  onClick={pause}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Pause className="h-4 w-4" /> Pause
                </button>
              ) : (
                <button
                  onClick={start}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  <Play className="h-4 w-4" /> Start
                </button>
              )}
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </button>
            </div>
          </div>

          {/* Breathing Ring */}
          <div className="flex items-center justify-center">
            <div className="relative h-80 w-80">
              {/* Glow/halo */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  transition: `transform ${ms}ms ease-in-out, box-shadow ${ms}ms ease-in-out, opacity ${ms}ms ease-in-out`,
                  transform: `scale(${scale})`,
                  boxShadow: `0 0 0 8px rgba(99,102,241,${glow * 0.6}), 0 0 60px rgba(99,102,241,${glow})`,
                  opacity: 0.9,
                }}
              />
              {/* Outer ring */}
              <div
                className="absolute inset-0 rounded-full border-[6px]"
                style={{
                  borderColor: "rgba(99,102,241,0.6)",
                  transition: `transform ${ms}ms ease-in-out, border-color ${ms}ms ease-in-out`,
                  transform: `scale(${scale})`,
                }}
              />
              {/* Inner pad */}
              <div
                className="absolute inset-4 rounded-full"
                style={{
                  background:
                    "radial-gradient(100% 100% at 50% 30%, rgba(99,102,241,0.12) 0%, rgba(99,102,241,0.06) 40%, rgba(255,255,255,0.85) 100%)",
                  transition: `transform ${ms}ms ease-in-out, filter ${ms}ms ease-in-out`,
                  transform: `scale(${scale})`,
                  filter: phase === "inhale" ? "brightness(1.05)" : "brightness(0.98)",
                }}
              />
              {/* Phase label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="rounded-full px-4 py-2 text-sm font-medium"
                  style={{
                    backgroundColor:
                      phase === "inhale"
                        ? "rgba(99,102,241,0.08)"
                        : "rgba(16,185,129,0.08)",
                    color: phase === "inhale" ? "#4f46e5" : "#059669",
                    transition: `all ${ms}ms ease-in-out`,
                  }}
                  aria-live="polite"
                >
                  {phase === "inhale" ? `Inhale ${inhaleSec}s` : `Exhale ${exhaleSec}s`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tip */}
        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm">
          Adjust the inhale/exhale sliders above; the ring’s expansion and contraction match those durations exactly.
        </div>
      </main>

      {/* Slider styling (filled track) */}
      <style>{`
        .mm-range {
          -webkit-appearance: none;
          appearance: none;
          height: 10px;
          border-radius: 9999px;
          background: #e5e7eb;
          outline: none;
        }
        .mm-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          height: 18px;
          width: 18px;
          background: #4f46e5;
          border-radius: 9999px;
          border: none;
          box-shadow: 0 0 0 3px #fff;
          cursor: pointer;
        }
        .mm-range::-moz-range-thumb {
          height: 18px;
          width: 18px;
          background: #4f46e5;
          border: none;
          border-radius: 9999px;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
