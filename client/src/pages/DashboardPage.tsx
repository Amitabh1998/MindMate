// client/src/pages/DashboardPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, Search, Play, Target, CalendarClock } from "lucide-react";

import Logo from "../components/Logo";
import LogoutButton from "../components/LogoutButton";
import ChatAssistant from "../components/ChatAssistant";

import {
  getMe,
  saveMood,
  getMoodSeries,
  getRecommendations,
  type RecItem,
} from "../lib/api";

type Mood = "Happy" | "Content" | "Neutral" | "Stressed" | "Sad";

export default function DashboardPage() {
  /* ---------- header / identity ---------- */
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    let alive = true;
    getMe().then(
      (res) => alive && setUserName(res.user?.name ?? ""),
      () => {}
    );
    return () => {
      alive = false;
    };
  }, []);

  /* ---------- mood input ---------- */
  const [mood, setMood] = useState<Mood>("Happy");
  const [level, setLevel] = useState<number>(50);
  const [saveNote, setSaveNote] = useState<string>("");

  // Debounced save of mood; refresh series afterwards.
  useEffect(() => {
    const value = Math.max(1, Math.min(5, Math.round((level / 100) * 4 + 1)));
    const t = setTimeout(async () => {
      try {
        await saveMood({ label: mood, value, level });
        setSaveNote(`Saved as ${mood} with intensity ${level} (${value}/5).`);
        await refreshSeries(); // pull latest
      } catch {
        /* ignore transient */
      }
    }, 450);
    return () => clearTimeout(t);
  }, [mood, level]);

  /* ---------- for-you recommendations ---------- */
  const [recs, setRecs] = useState<RecItem[]>([]);

  async function loadRecs() {
    try {
      const r = await getRecommendations({ label: mood, level });
      // Ensure images present (fallbacks live in server /static)
      const filled = (r.items || []).map((it) => ({
        ...it,
        img: it.img || fallbackImageFor(it.title),
      }));
      setRecs(filled.slice(0, 3));
    } catch {
      // Safe local defaults
      setRecs([
        {
          title: "Mindful Breathing",
          blurb: "A short 4–4 rhythm to refresh your focus.",
          to: "/meditate",
          img: "/static/for-you/meditation.png",
        },
        {
          title: "Nudge a Stuck Goal",
          blurb: "Pick one tiny action and move the bar by 5–10%.",
          to: "/goals",
          img: "/static/for-you/goals.png",
        },
        {
          title: "Daily Check-in",
          blurb: "Review your trend and celebrate a win.",
          to: "/dashboard",
          img: "/static/for-you/checkin.png",
        },
      ]);
    }
  }

  useEffect(() => {
    loadRecs();
  }, [mood, level, loadRecs]);

  /* ---------- series (last 30 days) ---------- */
  const [dates, setDates] = useState<string[]>([]);
  const [values, setValues] = useState<(number | null)[]>([]);
  const [seriesLoading, setSeriesLoading] = useState<boolean>(false);

  async function refreshSeries() {
    try {
      setSeriesLoading(true);
      const s = await getMoodSeries(30);
      setDates(s.dates || []);
      setValues(s.values || []);
    } finally {
      setSeriesLoading(false);
    }
  }

  useEffect(() => {
    refreshSeries();
  }, []);

  const validValues = useMemo(
    () => values.filter((v): v is number => v !== null),
    [values]
  );

  const avg = useMemo(
    () =>
      validValues.length
        ? round1(validValues.reduce((a, b) => a + b, 0) / validValues.length)
        : null,
    [validValues]
  );

  const last7Avg = useMemo(() => {
    const last7 = values.slice(-7).filter((v): v is number => v !== null);
    return last7.length
      ? round1(last7.reduce((a, b) => a + b, 0) / last7.length)
      : null;
  }, [values]);

  const prev7Avg = useMemo(() => {
    const prev7 = values.slice(-14, -7).filter((v): v is number => v !== null);
    return prev7.length
      ? round1(prev7.reduce((a, b) => a + b, 0) / prev7.length)
      : null;
  }, [values]);

  const deltaPct = useMemo(() => {
    if (last7Avg == null || prev7Avg == null || prev7Avg === 0) return 0;
    return round1(((last7Avg - prev7Avg) / prev7Avg) * 100);
  }, [last7Avg, prev7Avg]);

  // SVG path (breaks on nulls)
  const sparkPath = useMemo(() => {
    if (!values.length) return "";
    const W = 100;
    const H = 100;
    const step = values.length > 1 ? W / (values.length - 1) : W;
    const y = (v: number) => H - ((v - 1) / 4) * H; // map 1..5 -> 100..0

    let d = "";
    values.forEach((v, i) => {
      if (v == null) return; // break
      const cmd = d === "" ? "M" : "L";
      d += `${cmd} ${i * step},${y(v)} `;
    });
    return d.trim();
  }, [values]);

  /* ---------- slider fill (solid until thumb) ---------- */
  const sliderStyle = useMemo(() => {
    const pct = `${level}%`;
    // Two-layer background: filled (indigo) + track (slate)
    return {
      background:
        `linear-gradient(#4f46e5, #4f46e5) 0/ ${pct} 100% no-repeat, ` +
        "linear-gradient(#e5e7eb, #e5e7eb)",
    } as React.CSSProperties;
  }, [level]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          {/* Logo stays left */}
          <Logo />
          <div className="ml-auto flex items-center gap-2">
            <button aria-label="Search" className="rounded-lg p-2 hover:bg-slate-100">
              <Search className="h-5 w-5 text-slate-700" />
            </button>
            <button aria-label="Notifications" className="rounded-lg p-2 hover:bg-slate-100">
              <Bell className="h-5 w-5 text-slate-700" />
            </button>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Page */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {`Welcome back${userName ? `, ${userName}` : ""}`}
        </h1>

        {/* Two-column layout */}
        <section className="mt-8 grid gap-10 lg:grid-cols-2">
          {/* ---------- LEFT COLUMN ---------- */}
          <div>
            {/* Mood chips */}
            <p className="mb-3 text-sm font-medium text-slate-800">
              How are you feeling today?
            </p>
            <div className="flex flex-wrap gap-2">
              {(["Happy", "Content", "Neutral", "Stressed", "Sad"] as const).map(
                (m) => (
                  <button
                    key={m}
                    onClick={() => setMood(m)}
                    className={[
                      "rounded-full border px-3.5 py-1.5 text-sm",
                      mood === m
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    {m}
                  </button>
                )
              )}
            </div>

            {/* Solid slider */}
            <div className="mt-6 flex items-center gap-4">
              <input
                aria-label="Mood Level"
                type="range"
                min={0}
                max={100}
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value, 10))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full"
                style={sliderStyle}
              />
              <span className="w-10 text-right text-sm text-slate-700">
                {level}
              </span>
            </div>
            {saveNote && (
              <p className="mt-2 text-sm text-slate-600">{saveNote}</p>
            )}

            {/* AI Mood Analysis (static copy for now) */}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold">AI Mood Analysis</h2>
              <div className="mt-3 space-y-3 text-sm leading-6 text-slate-700">
                <p>
                  <span className="font-medium">Insight:</span> As you track
                  your mood daily, patterns will appear here.
                </p>
                <p>
                  <span className="font-medium">Tip:</span> Try logging at a
                  similar time each day for a clearer trend.
                </p>
                <p>
                  <span className="font-medium">Next:</span> Use the assistant
                  to reflect whenever you want.
                </p>
              </div>
            </div>

            {/* AI Assistant on the left */}
            <ChatAssistant className="mt-8" />
          </div>

          {/* ---------- RIGHT COLUMN ---------- */}
          <div>
            {/* For You cards */}
            <h2 className="mb-4 text-base font-semibold">For you</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recs.map((card) => (
                <ForYouCard
                  key={card.title}
                  title={card.title}
                  blurb={card.blurb}
                  img={card.img}
                  to={card.to}
                />
              ))}
            </div>

            {/* Quick action CTAs */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ActionButton
                icon={<Play className="h-4 w-4" />}
                label="Meditate"
                to="/meditate"
              />
              <ActionButton
                icon={<Target className="h-4 w-4" />}
                label="Set Goals"
                to="/goals"
              />
            </div>
            <div className="mt-3 grid">
              <ActionButton
                icon={<CalendarClock className="h-4 w-4" />}
                label="Schedule Therapy"
                to="/schedule"
              />
            </div>

            {/* Progress (chart + stats) */}
            <section className="mt-8 space-y-6">
              <h2 className="text-base font-semibold">
                Your Progress — Last 30 Days
              </h2>

              {/* Graph */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                {seriesLoading ? (
                  <p className="text-sm text-slate-600">Loading…</p>
                ) : !validValues.length ? (
                  <div className="rounded-xl border border-slate-200 p-5 text-slate-600">
                    No data yet. Log your mood above.
                  </div>
                ) : (
                  <>
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="h-44 w-full"
                    >
                      <path
                        d={sparkPath}
                        fill="none"
                        stroke="#4f46e5"
                        strokeWidth="3"
                        strokeLinecap="butt"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                      <span>{fmtShort(dates[0])}</span>
                      <span>
                        {fmtShort(dates[Math.floor(dates.length / 2)] ?? "")}
                      </span>
                      <span>{fmtShort(dates[dates.length - 1])}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Stats */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <p className="text-sm text-slate-600">Mood (1–5)</p>
                  <p className="text-2xl font-semibold">
                    Average: {avg != null ? avg.toFixed(1) : "—"}
                  </p>
                  {/* Extract the nested ternary operation */}
                  {(() => {
                    const percentageColorClass = (deltaPct || 0) >= 0 ? "text-emerald-600" : "text-rose-600";
                    return (
                      <p className={`text-xs ${percentageColorClass}`}>
                        Last 7d vs prev 7d{" "}
                        {(deltaPct || 0) >= 0 ? "+" : ""}
                        {(deltaPct || 0).toFixed(1)}%
                      </p>
                    );
                  })()}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <StatBox
                    label="Latest"
                    value={`${latestValue(values) ?? "—"}${
                      latestValue(values) != null ? " / 5" : ""
                    }`}
                  />
                  <StatBox
                    label="Best day"
                    value={`${maxValue(values) ?? "—"}${
                      maxValue(values) != null ? " / 5" : ""
                    }`}
                  />
                  <StatBox
                    label="Lowest day"
                    value={`${minValue(values) ?? "—"}${
                      minValue(values) != null ? " / 5" : ""
                    }`}
                  />
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

/* ---------- helpers / subcomponents ---------- */

function ForYouCard({
  title,
  blurb,
  img,
  to,
}: {
  title: string;
  blurb: string;
  img?: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow"
    >
      <div className="aspect-[4/3] w-full overflow-hidden">
        {img ? (
          <img
            src={img}
            alt=""
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(120deg,#fde6d8,#e8f0ff)]" />
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs text-slate-600">{blurb}</p>
      </div>
    </Link>
  );
}

function ActionButton({
  icon,
  label,
  to,
}: {
  icon: React.ReactNode;
  label: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
    >
      {icon}
      {label}
    </Link>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}

/* ---------- small utils ---------- */
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function latestValue(arr: (number | null)[]) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] != null) return arr[i]!.toFixed(1);
  }
  return null;
}
function maxValue(arr: (number | null)[]) {
  const vals = arr.filter((v): v is number => v != null);
  return vals.length ? Math.max(...vals).toFixed(1) : null;
}
function minValue(arr: (number | null)[]) {
  const vals = arr.filter((v): v is number => v != null);
  return vals.length ? Math.min(...vals).toFixed(1) : null;
}
function fmtShort(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fallbackImageFor(title: string) {
  const t = title.toLowerCase();
  if (t.includes("breath") || t.includes("meditat")) return "/static/for-you/meditation.png";
  if (t.includes("goal")) return "/static/for-you/goals.png";
  if (t.includes("check")) return "/static/for-you/checkin.png";
  if (t.includes("run") || t.includes("energy")) return "/static/for-you/energy.png";
  if (t.includes("eat") || t.includes("food")) return "/static/for-you/nutrition.png";
  return "/static/for-you/checkin.png";
}
