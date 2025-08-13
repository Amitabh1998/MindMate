// client/src/pages/SignupPage.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../components/Logo";
import { registerUser } from "../lib/api";

export default function SignupPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    if (!form.name.trim()) return setErr("Please enter your full name.");
    if (form.password.length < 8) return setErr("Password must be at least 8 characters.");
    if (form.password !== form.confirm) return setErr("Passwords do not match.");

    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(), // normalize
        password: form.password,
      };
      await registerUser(payload);
      alert("Account created! Please log in.");
      navigate("/login", { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Registration failed");
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
          {/* Left: Form */}
          <section className="max-w-md">
            <h1 className="mb-8 text-3xl font-semibold tracking-tight sm:text-4xl">
              Create your account
            </h1>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-800">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Full Name"
                  autoComplete="name"
                  value={form.name}
                  onChange={onChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-800">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  value={form.email}
                  onChange={onChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-800">
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={onChange}
                  className={inputClass}
                  required
                  minLength={8}
                  aria-describedby="password-help"
                />
                <p id="password-help" className="mt-1 text-xs text-slate-500">
                  At least 8 characters.
                </p>
              </div>

              <div>
                <label htmlFor="confirm" className="mb-1 block text-sm font-medium text-slate-800">
                  Confirm Password
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type={showPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={onChange}
                  className={inputClass}
                  required
                />
              </div>

              {err && (
                <p className="text-sm text-rose-600" role="alert">
                  {err}
                </p>
              )}

              <button
                disabled={loading}
                type="submit"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
              >
                {loading ? "Creating…" : "Sign Up"}
              </button>
            </form>

            <p className="pt-6 text-sm text-slate-600">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-indigo-700 hover:underline">
                Log in
              </Link>
            </p>
          </section>

          {/* Right: Illustration */}
          <aside className="hidden lg:block">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl">
                <img
                  src="/meditation.png"
                  alt="Mindful art"
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
