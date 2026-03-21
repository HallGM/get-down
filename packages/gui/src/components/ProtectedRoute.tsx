import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../api/auth.js";
import LoadingState from "./LoadingState.js";

export default function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
