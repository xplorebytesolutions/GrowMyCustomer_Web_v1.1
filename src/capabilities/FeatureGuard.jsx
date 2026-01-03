// 📄 src/capabilities/FeatureGuard.jsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../app/providers/AuthProvider";

const normalizeCode = code =>
  String(code || "")
    .trim()
    .toUpperCase();

const isDev =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    !import.meta.env.PROD) ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.NODE_ENV !== "production");

export default function FeatureGuard({
  featureKey,
  code,
  codes,
  fallback,
  children,
}) {
  const location = useLocation();
  const { isLoading, entLoading, hasAllAccess, can } = useAuth();

  // If dev passed *something*, but it resolves to nothing usable,
  // that’s a config bug and MUST deny (fail closed).
  const hadExplicitRequirement = Boolean(codes || featureKey || code);

  // ---- normalize required keys ----
  let required = [];

  if (codes) {
    required = Array.isArray(codes) ? codes : [codes];
  } else {
    const single = code;
    if (single) required = [single];
  }

  const requiredNorm = required
    .filter(x => typeof x === "string" && x.trim().length > 0)
    .map(normalizeCode)
    .filter(Boolean);

  // ✅ Fail closed if caller intended to protect, but passed undefined/invalid keys
  if (hadExplicitRequirement && requiredNorm.length === 0) {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.warn(
        "[FeatureGuard] Invalid/missing permission key. DENYING access.",
        {
          featureKey,
          code,
          codes,
          path: window.location.pathname,
        }
      );
    }

    if (fallback !== undefined) return fallback;
    return <Navigate to="/no-access" replace state={{ from: location }} />;
  }

  // No requirement provided → allow by default
  if (!requiredNorm.length) return children;

  // While loading, don't block yet
  if (isLoading || entLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center py-16">
        <p className="text-sm text-gray-500">Loading workspace…</p>
      </div>
    );
  }

  const allowed = hasAllAccess || requiredNorm.some(c => can(c));

  if (!allowed) {
    if (fallback !== undefined) return fallback;
    return <Navigate to="/no-access" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
