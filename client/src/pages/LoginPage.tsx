// client/src/pages/LoginPage.tsx
import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import Logo from "../components/Logo";
import { loginUser } from "../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname || "/dashboard";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await loginUser({
        email: email.trim().toLowerCase(), // normalize
        password,
      });
      localStorage.setItem("mm_token", res.token);
      navigate(from, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Header */}
      <header className="w-full border-b border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <Logo />
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          {/* Left: form */}
          <section className="max-w-md">
            <h1 className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl">
              Welcome back
            </h1>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-sm font-medium text-slate-800"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  className={inputClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-slate-800"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="text-xs text-indigo-700 hover:underline"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className={inputClass}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>

              {err && (
                <p className="text-sm text-rose-600" role="alert">
                  {err}
                </p>
              )}

              <div className="pt-1">
                <a className="text-sm text-slate-600 hover:text-slate-900" href="#">
                  Forgot Password?
                </a>
              </div>

              <button
                disabled={loading}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              >
                {loading ? "Logging in…" : "Login"}
              </button>
            </form>

            <p className="pt-6 text-sm text-slate-600">
              Don’t have an account?{" "}
              <Link to="/signup" className="font-medium text-indigo-700 hover:underline">
                Sign Up
              </Link>
            </p>
          </section>

          {/* Right: artwork */}
          <aside className="hidden lg:block">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                {/* Use your existing asset in /client/public */}
                <img
                  src="/meditation.png"
                  alt="Meditation illustration"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

const inputClass = [
  "block w-full rounded-xl",
  "border border-transparent bg-slate-100",
  "px-4 py-3 text-slate-900 placeholder:text-slate-400",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:border-transparent",
].join(" ");
