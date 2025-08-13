// client/src/App.tsx
import { Routes, Route, Navigate, Link } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import DashboardPage from "./pages/DashboardPage";
import SetGoalsPage from "./pages/SetGoalsPage";
import MeditatePage from "./pages/MeditatePage";
import ScheduleTherapyPage from "./pages/ScheduleTherapyPage";
import RequireAuth from "./components/RequireAuth";

function DevNav() {
  const Item = ({ to, label }: { to: string; label: string }) => (
    <Link
      to={to}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
    >
      {label}
    </Link>
  );
  return (
    <div className="fixed bottom-4 right-4 z-[1000] rounded-xl border border-slate-200 bg-white/90 p-2 shadow-md backdrop-blur">
      <div className="mb-1 px-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        Pages
      </div>
      <div className="flex flex-wrap gap-2">
        <Item to="/dashboard" label="Dashboard" />
        <Item to="/login" label="Login" />
        <Item to="/signup" label="Sign Up" />
        <Item to="/goals" label="Set Goals" />
        <Item to="/meditate" label="Meditate" />
        <Item to="/schedule" label="Schedule Therapy" />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/goals"
          element={
            <RequireAuth>
              <SetGoalsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/meditate"
          element={
            <RequireAuth>
              <MeditatePage />
            </RequireAuth>
          }
        />
        <Route
          path="/schedule"
          element={
            <RequireAuth>
              <ScheduleTherapyPage />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>

      <DevNav />
    </>
  );
}
