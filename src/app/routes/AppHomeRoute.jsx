// src/app/routes/AppHomeRoute.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function AppHomeRoute() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading) return;

    // Not logged in → send back to login
    if (!isAuthenticated) {
      navigate(`/login${window.location.search}`, { replace: true });
      return;
    }

    // Logged in (any business user, with or without plan) → go to dashboard
    navigate(`/app/dashboard${window.location.search}`, { replace: true });
  }, [isLoading, isAuthenticated, navigate]);

  // We render nothing; this component is just a redirector
  return null;
}
