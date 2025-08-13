import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RequireAuth({ children }: PropsWithChildren) {
  const token = localStorage.getItem("mm_token");
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}
