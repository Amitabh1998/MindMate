import { Leaf } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
  /** Use inline when Logo sits inside an existing header layout (e.g., Dashboard). */
  inline?: boolean;
  /** Route to navigate to on click (default: /dashboard). */
  to?: string;
  className?: string;
};

export default function Logo({ inline = false, to = "/dashboard", className = "" }: Props) {
  const row = (
    <Link
      to={to}
      className={`group flex items-center gap-2 py-3 ${className}`}
      aria-label="Go to dashboard"
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-700 text-white transition-transform group-hover:scale-105">
        <Leaf className="h-4 w-4" />
      </div>
      <span className="text-sm font-semibold tracking-tight transition-colors group-hover:text-emerald-700">
        MindMate
      </span>
    </Link>
  );

  // When used in pages like Login/Signup, keep a little left padding but DO NOT center.
  if (!inline) {
    return <div className="px-4">{row}</div>; // <— removed mx-auto and max-w-6xl
  }

  // Inline (use inside a header flex on Dashboard)
  return row;
}
