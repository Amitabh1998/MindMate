// client/src/pages/ScheduleTherapyPage.tsx
import { useState } from "react";
import Logo from "../components/Logo";
import LogoutButton from "../components/LogoutButton";
import { CalendarClock, User2, Video, Phone } from "lucide-react";

type Mode = "Video" | "Voice" | "In-person";

export default function ScheduleTherapyPage() {
  const [name, setName] = useState("");
  const [mode, setMode] = useState<Mode>("Video");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState<null | {
    name: string;
    mode: Mode;
    date: string;
    time: string;
    notes?: string;
  }>(null);

  const getModeIcon = (modeType: Mode) => {
    if (modeType === "Video") {
      return <Video className="mr-1 inline h-4 w-4" />;
    }
    if (modeType === "Voice") {
      return <Phone className="mr-1 inline h-4 w-4" />;
    }
    return null;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !date || !time) return alert("Please fill in your name, date and time.");
    setConfirmed({ name, mode, date, time, notes: notes || undefined });
  };

  const reset = () => setConfirmed(null);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <Logo inline />
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
              <CalendarClock className="h-4 w-4" />
              Schedule Therapy
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Book a session</h1>
        <p className="mt-2 text-sm text-slate-600">
          Choose your preferred mode, pick a date and time, and add any notes for your therapist.
        </p>

        {!confirmed ? (
          <form
            onSubmit={submit}
            className="mt-8 grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:grid-cols-2"
          >
            {/* Left column */}
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-800">
                  Your Name
                </label>
                <div className="relative">
                  <User2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-transparent bg-slate-100 px-4 py-3 pl-9 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                    placeholder="Full name"
                  />
                </div>
              </div>

              <div>
                <span className="mb-1 block text-sm font-medium text-slate-800">Mode</span>
                <div className="flex flex-wrap gap-2">
                  {(["Video", "Voice", "In-person"] as const).map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => setMode(m)}
                      className={[
                        "rounded-full border px-3.5 py-1.5 text-sm",
                        mode === m
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      {getModeIcon(m)}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="date" className="mb-1 block text-sm font-medium text-slate-800">
                    Date
                  </label>
                  <input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-transparent bg-slate-100 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  />
                </div>
                <div>
                  <label htmlFor="time" className="mb-1 block text-sm font-medium text-slate-800">
                    Time
                  </label>
                  <input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full rounded-xl border border-transparent bg-slate-100 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  />
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div>
                <label htmlFor="notes" className="mb-1 block text-sm font-medium text-slate-800">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  rows={8}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full resize-none rounded-xl border border-transparent bg-slate-100 px-4 py-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  placeholder="Anything you'd like your therapist to know before the session."
                />
              </div>

              <div className="pt-2">
                <button className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
                  Confirm booking
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold">Booking confirmed</h2>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-medium">{confirmed.name}</span>, your{" "}
              <span className="font-medium">{confirmed.mode.toLowerCase()}</span> session is scheduled on{" "}
              <span className="font-medium">{confirmed.date}</span> at{" "}
              <span className="font-medium">{confirmed.time}</span>.
            </p>
            {confirmed.notes && (
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium">Notes:</span> {confirmed.notes}
              </p>
            )}

            <div className="mt-4">
              <button
                onClick={reset}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                Book another
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
