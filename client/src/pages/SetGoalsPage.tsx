// client/src/pages/SetGoalsPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2, CheckCircle2, CalendarDays } from "lucide-react";
import Logo from "../components/Logo";
import LogoutButton from "../components/LogoutButton";
import { createGoal, deleteGoal, listGoals, updateGoal, type Goal } from "../lib/api";

export default function SetGoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState<string>(""); // yyyy-mm-dd
  const [submitting, setSubmitting] = useState(false);

  // load goals
  useEffect(() => {
    let alive = true;
    listGoals()
      .then(({ goals }) => {
        if (alive) setGoals(goals);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const iso = dueAt ? new Date(dueAt + "T00:00:00").toISOString() : null;
      const { goal } = await createGoal({ title: title.trim(), dueAt: iso });
      setGoals((g) => [goal, ...g]);
      setTitle("");
      setDueAt("");
    } catch (e) {
      // you can toast here
    } finally {
      setSubmitting(false);
    }
  }

  async function onProgressChange(g: Goal, value: number) {
    const next = Math.max(0, Math.min(100, Math.round(value)));
    setGoals((list) => list.map((it) => (it._id === g._id ? { ...it, progress: next } : it))); // optimistic
    try {
      await updateGoal(g._id, { progress: next });
    } catch {
      // revert if needed (keeping it optimistic for now)
    }
  }

  async function toggleComplete(g: Goal) {
    const completed = !g.completedAt;
    // optimistic
    setGoals((list) =>
      list.map((it) =>
        it._id === g._id
          ? { ...it, completedAt: completed ? new Date().toISOString() : null, progress: completed ? 100 : it.progress }
          : it
      )
    );
    try {
      await updateGoal(g._id, { completed });
    } catch {
      // noop
    }
  }

  async function remove(g: Goal) {
    const prev = goals;
    setGoals((list) => list.filter((it) => it._id !== g._id));
    try {
      await deleteGoal(g._id);
    } catch {
      setGoals(prev); // rollback on error
    }
  }

  const activeGoals = useMemo(() => goals.filter((g) => !g.completedAt), [goals]);
  const completedGoals = useMemo(() => goals.filter((g) => !!g.completedAt), [goals]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <Logo inline />
          <nav className="hidden items-center gap-6 md:flex">
            <Link className="text-sm text-slate-700 hover:text-slate-900" to="/dashboard">
              Dashboard
            </Link>
            <Link className="text-sm text-slate-700 hover:text-slate-900" to="/meditate">
              Meditate
            </Link>
          </nav>
          <LogoutButton />
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Your Goals</h1>

        {/* Create form */}
        <form onSubmit={onCreate} className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe a small, doable goal (e.g., 'Meditate 5 minutes')"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
            />
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <input
                type="date"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              />
            </div>
            <button
              disabled={submitting || !title.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" /> Add goal
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Keep it specific and small—you can always add more later.</p>
        </form>

        {/* Active goals */}
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Active</h2>
          {(() => {
            if (loading) {
              return <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading…</div>;
            }
            
            if (activeGoals.length === 0) {
              return (
                <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                  No active goals yet—create one above.
                </div>
              );
            }
            
            return (
              <ul className="space-y-4">
                {activeGoals.map((g) => (
                  <li key={g._id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-semibold">{g.title}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {g.dueAt ? `Due ${fmtDate(new Date(g.dueAt))}` : "No due date"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleComplete(g)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50"
                          title="Mark complete"
                        >
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Complete
                        </button>
                        <button
                          onClick={() => remove(g)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 text-rose-700"
                          title="Delete goal"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </div>

                    {/* Single, solid slider merged with progress bar */}
                    <div className="mt-4 flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={g.progress ?? 0}
                        onChange={(e) => onProgressChange(g, parseInt(e.target.value))}
                        className="range-solid h-2 w-full appearance-none rounded-full"
                        style={{
                          background: `linear-gradient(to right, rgb(79 70 229) ${g.progress ?? 0}%, rgb(226 232 240) ${
                            g.progress ?? 0
                          }%)`,
                        }}
                      />
                      <span className="w-10 text-right text-sm tabular-nums text-slate-700">
                        {Math.round(g.progress ?? 0)}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            );
          })()}
        </section>

        {/* Completed goals */}
        {completedGoals.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-base font-semibold">Completed</h2>
            <ul className="space-y-3">
              {completedGoals.map((g) => (
                <li key={g._id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold line-through text-slate-500">{g.title}</h3>
                      <p className="mt-1 text-xs text-slate-500">
                        {g.completedAt ? `Completed ${fmtDate(new Date(g.completedAt))}` : "Completed"}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(g)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 text-rose-700"
                      title="Delete goal"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
