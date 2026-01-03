import { Navigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";

/**
 * AdminRouteGuard (extended)
 *
 * Back-compat:
 * - If no requireFeature/requirePermission are provided, it behaves like the old guard:
 *   allows roles: superadmin, admin, partner, reseller OR hasAllAccess.
 *
 * Phase-2 extension:
 * - If requireFeature or requirePermission are provided, it first enforces those using
 *   live entitlements from AuthProvider (hasFeature/hasPermission).
 * - If entitlements are still loading, it shows nothing (you can add a skeleton if you like).
 */
export default function AdminRouteGuard({
  children,
  requireFeature, // e.g., "CAMPAIGNS"
  requirePermission, // e.g., "ADMIN.DASHBOARD.VIEW"
  redirectTo = "/no-access",
}) {
  const {
    isLoading,
    role,
    hasAllAccess,
    hasFeature,
    hasPermission,
    entitlementsLoading,
  } = useAuth();

  if (isLoading) return null; // still loading JWT/session
  if (entitlementsLoading) return null; // optional: tiny skeleton

  const safeRole = String(role || "").toLowerCase();
  const isAdminish = ["superadmin", "admin", "partner", "reseller"].includes(
    safeRole
  );

  // Phase-2 checks (only if provided)
  if (requireFeature && !hasFeature?.(requireFeature)) {
    return <Navigate to={redirectTo} replace />;
  }
  if (requirePermission && !hasPermission?.(requirePermission)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Legacy behavior (unchanged)
  if (hasAllAccess || isAdminish) return children;

  return <Navigate to={redirectTo} replace />;
}
