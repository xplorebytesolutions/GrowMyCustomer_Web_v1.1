// 📄 src/app/routes/guards/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { TOKEN_KEY } from "../../../api/axiosClient";
import { requestUpgrade } from "../../../utils/upgradeBus";

export default function ProtectedRoute({ children, featureCode }) {
  const {
    isLoading,
    entLoading,
    user,
    business,
    role,
    status, // e.g., "active" | "profilepending" | "pending" | "underreview" | "suspended"
    hasFeature,
    hasAllAccess,
  } = useAuth() || {};

  // 0) If there is no token at all, go to login immediately.
  const token =
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  if (!token) {
    return <Navigate to={`/login${window.location.search}`} replace />;
  }

  // 1) While auth or entitlements are still loading, render nothing (avoid premature redirects).
  if (isLoading || entLoading) {
    return null; // or a small spinner/skeleton
  }

  // 2) Handle onboarding / account status.
  const s = String(status || "").toLowerCase();
  if (s === "profilepending") {
    return <Navigate to={`/app/profile-completion${window.location.search}`} replace />;
  }
  if (s === "pending" || s === "underreview") {
    return <Navigate to={`/pending-approval${window.location.search}`} replace />;
  }
  if (s === "suspended" || s === "blocked") {
    return <Navigate to={`/no-access${window.location.search}`} replace />;
  }

  // 3) Enforce "authenticated" presence minimally.
  // User must exist; business may be missing for admin-ish roles.
  const safeRole = String(role || "").toLowerCase();
  const isAdminish = ["superadmin", "admin", "partner", "reseller"].includes(
    safeRole
  );

  // business can be { id } or { businessId }
  const hasBusinessId = !!(business && (business.id || business.businessId));

  if (!user) {
    // No user after loading (token invalid/expired server-side)
    return <Navigate to={`/login${window.location.search}`} replace />;
  }

  // For business/staff roles we still expect a business; for admin-ish we don't.
  if (!isAdminish && !hasBusinessId) {
    // Let’s fail soft to dashboard rather than hard-kicking to login
    // (prevents loop if context is momentarily incomplete).
    return <Navigate to={`/app/dashboard${window.location.search}`} replace />;
  }

  // 4) Optional feature-gating per route.
  if (featureCode && !hasAllAccess) {
    if (typeof hasFeature === "function" && !hasFeature(featureCode)) {
      requestUpgrade({ reason: "feature", code: featureCode });
      // Use your in-app billing route (matches axiosClient’s interceptors)
      return <Navigate to={`/app/settings/billing${window.location.search}`} replace />;
    }
  }

  // 5) All checks passed
  return children;
}
