import { useNavigate } from "react-router-dom";

export default function LogoutButton() {
  const navigate = useNavigate();

  const onLogout = () => {
    localStorage.removeItem("mm_token");
    navigate("/login", { replace: true });
  };

  return (
    <button
      onClick={onLogout}
      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
      aria-label="Log out"
    >
      Logout
    </button>
  );
}
