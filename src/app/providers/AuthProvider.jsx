// 📄 File: src/app/providers/AuthProvider.jsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import axiosClient, { TOKEN_KEY } from "../../api/axiosClient";
import { toast } from "react-toastify";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// ---- local cache for entitlements (warm start only) ----
// We use this just to prefill UI quickly; we ALWAYS revalidate from server.
const ENTLS_KEY = bizId => `entitlements:${bizId}`;
// TTL only controls how old warm-start data can be, it no longer skips network.
const ENTLS_TTL_MS = 5 * 60 * 1000; // 5 minutes

const readCache = bizId => {
  try {
    const raw = localStorage.getItem(ENTLS_KEY(bizId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?._cachedAt) return null;
    if (Date.now() - parsed._cachedAt > ENTLS_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (bizId, snap) => {
  try {
    localStorage.setItem(
      ENTLS_KEY(bizId),
      JSON.stringify({ ...snap, _cachedAt: Date.now() })
    );
  } catch {
    // ignore storage errors
  }
};

// ---- helpers for permissions & entitlements ----

// Normalize any permission/feature code to a canonical uppercase string
const normalizeCode = code => {
  if (!code) return "";
  return String(code).trim().toUpperCase();
};

function extractContextPermissions(perms) {
  if (!Array.isArray(perms)) return [];

  return perms
    .map(p => {
      if (typeof p === "string") return p;
      if (p && typeof p === "object") {
        return p.code || p.Code || p.permissionCode || p.PermissionCode || null;
      }
      return null;
    })
    .filter(Boolean);
}

// Normalize permissions coming from EntitlementsSnapshotDto
function extractEntitlementPermissions(entitlements) {
  if (!entitlements) return [];

  const raw =
    entitlements.GrantedPermissions ??
    entitlements.grantedPermissions ??
    entitlements.Permissions ??
    entitlements.permissions ??
    [];

  if (!Array.isArray(raw)) return [];

  // Normalize to array of strings (but not uppercased yet)
  return raw
    .map(p => {
      if (typeof p === "string") return p;
      if (p && typeof p === "object") {
        return p.code || p.Code || p.permissionCode || p.PermissionCode || null;
      }
      return null;
    })
    .filter(Boolean);
}

// Get the "family" of a permission code, e.g.
// "MESSAGING.SEND.TEXT" → "MESSAGING"
function getPermissionFamily(code) {
  const norm = normalizeCode(code);
  if (!norm) return null;
  const idx = norm.indexOf(".");
  if (idx === -1) return null;
  return norm.slice(0, idx);
}

// Decide if a code should be considered "plan-managed".
// Rule: if entitlements contain *any* permission of the same family,
// that family is controlled by the plan.
//
// NOTE: This expects entitlementPerms to already be normalized (uppercase).
function isPlanManagedPermission(code, entitlementPerms) {
  const family = getPermissionFamily(code);
  if (!family) return false;

  const familyPrefix = family + ".";
  return (entitlementPerms || []).some(p => p.startsWith(familyPrefix));
}

export default function AuthProvider({ children }) {
  // core auth
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [businessId, setBusinessId] = useState(null); // ✅ explicit businessId for frontend
  const [role, setRole] = useState(null);
  const [status, setStatus] = useState(null);
  const [hasAllAccess, setHasAllAccess] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [availableFeatures, setAvailableFeatures] = useState({});

  // entitlements
  const [entitlements, setEntitlements] = useState(null);
  const [entLoading, setEntLoading] = useState(false);
  const [entError, setEntError] = useState(null);

  const clearAuthState = useCallback(() => {
    setUser(null);
    setBusiness(null);
    setBusinessId(null); // ✅ clear businessId
    setRole(null);
    setStatus(null);
    setHasAllAccess(false);
    setPermissions([]);
    setAvailableFeatures({});
    setEntitlements(null); // 🔁 also clear entitlements on logout
  }, []);

  // ✅ Central logout: clears token + legacy keys + React state
  const logout = useCallback(() => {
    try {
      // main JWT
      localStorage.removeItem(TOKEN_KEY);

      // legacy auth keys (from previous iterations)
      const legacyKeys = [
        "xbytechat-auth",
        "accessToken",
        "role",
        "plan",
        "businessId",
        "companyName",
        "xbytechat-auth-data",
      ];
      legacyKeys.forEach(k => localStorage.removeItem(k));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[Auth] Failed to clear token/keys on logout", err);
    }

    clearAuthState();
    setIsLoading(false);

    try {
      toast.info("You have been logged out.");
    } catch {
      // ignore toast failures
    }
  }, [clearAuthState]);

  const refreshAuthContext = useCallback(async () => {
    setIsLoading(true);
    try {
      // Cookie-first auth: do not require a localStorage token to attempt context refresh.
      // If a token exists, axiosClient will still attach it as a fallback.
      const { data } = await axiosClient.get("/auth/context", {
        __silent401: true,
      });
      const {
        isAuthenticated,
        user: u,
        business: b,
        role: r,
        status: s,
        hasAllAccess: haa,
        permissions: perms,
        features,
        businessId: ctxBusinessId, // ✅ pick businessId if backend returns it top-level
      } = data || {};

      if (!isAuthenticated) {
        clearAuthState();
        return null;
      }

      setUser(u || null);
      setBusiness(b || null);
      setRole(r || null);
      setStatus(s || null);
      setHasAllAccess(!!haa);
      setPermissions(extractContextPermissions(perms));
      const feat = Array.isArray(features)
        ? Object.fromEntries(features.map(code => [code, true]))
        : {};
      setAvailableFeatures(feat);

      // ✅ derive effective businessId from context + nested objects
      const effectiveBizId =
        ctxBusinessId ||
        b?.id ||
        b?.businessId ||
        b?.BusinessId ||
        u?.businessId ||
        u?.BusinessId ||
        null;

      setBusinessId(effectiveBizId || null);
      if (effectiveBizId) {
        try {
          localStorage.setItem("businessId", effectiveBizId);
        } catch {
          // ignore storage error
        }
      }

      return data;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[Auth] /auth/context failed", err);
      clearAuthState();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [clearAuthState]);

  useEffect(() => {
    refreshAuthContext();
  }, [refreshAuthContext]);

  // ✅ can(): normalization-aware, plan-first for plan-managed families
  // const can = useCallback(
  //   rawCode => {
  //     if (!rawCode) return true;

  //     // 🔓 Superadmin / full-access accounts bypass plan checks
  //     if (hasAllAccess) return true;

  //     const code = normalizeCode(rawCode);

  //     // Normalize context + entitlement arrays once per call
  //     const ctxPermsNorm = Array.isArray(permissions)
  //       ? permissions.map(normalizeCode)
  //       : [];

  //     const entPermsRaw = extractEntitlementPermissions(entitlements);
  //     const entPermsNorm = Array.isArray(entPermsRaw)
  //       ? entPermsRaw.map(normalizeCode)
  //       : [];

  //     const isMessagingCode = code.startsWith("MESSAGING.");

  //     // ✅ SPECIAL RULE: Messaging is always plan-managed when entitlements exist.
  //     if (entitlements && isMessagingCode) {
  //       // Only allowed if plan explicitly grants this permission
  //       return entPermsNorm.includes(code);
  //     }

  //     // ✅ Generic plan-managed logic for other families (Campaigns, CRM, etc.)
  //     if (entPermsNorm.length > 0) {
  //       // 1) If the plan explicitly grants this permission, allow it.
  //       if (entPermsNorm.includes(code)) {
  //         return true;
  //       }

  //       // 2) If the plan is managing this family (e.g. CAMPAIGNS.*, CRM.*),
  //       //    then anything not in GrantedPermissions is denied.
  //       if (isPlanManagedPermission(code, entPermsNorm)) {
  //         return false;
  //       }
  //     }

  //     // 3) For non plan-managed codes (admin-only, legacy, etc.)
  //     //    fall back to role/context permissions.
  //     return ctxPermsNorm.includes(code);
  //   },
  //   [permissions, entitlements, hasAllAccess]
  // );
  // ✅ can(): normalization-aware, plan-first for plan-managed families
  const can = useCallback(
    rawCode => {
      if (!rawCode) return true;

      // 🔓 Superadmin / full-access accounts bypass plan checks
      if (hasAllAccess) return true;

      const code = normalizeCode(rawCode);

      // Role/context permissions (from /auth/context)
      const ctxPermsNorm = Array.isArray(permissions)
        ? permissions.map(normalizeCode)
        : [];

      // Plan permissions (from entitlements snapshot)
      const entPermsRaw = extractEntitlementPermissions(entitlements);
      const entPermsNorm = Array.isArray(entPermsRaw)
        ? entPermsRaw.map(normalizeCode)
        : [];

      // Role permission is always required unless hasAllAccess.
      const hasRolePerm = ctxPermsNorm.includes(code);

      // INBOX permissions are security controls (role-managed, not plan-managed).
      if (code.startsWith("INBOX.")) return hasRolePerm;

      // ✅ If we have entitlements, treat plan as an outer "ceiling" for plan-managed families
      if (
        entitlements &&
        entPermsNorm.length > 0 &&
        isPlanManagedPermission(code, entPermsNorm)
      ) {
        return entPermsNorm.includes(code) && hasRolePerm;
      }

      // Non plan-managed codes: fall back to role/context permissions
      return hasRolePerm;
    },
    [permissions, entitlements, hasAllAccess]
  );

  // ✅ SWR-style entitlements: warm-start from cache, ALWAYS revalidate from server
  const fetchEntitlements = useCallback(
    async (bizId, { useWarmCache = true } = {}) => {
      if (!bizId) return null;

      // 1) Warm-start from cache for faster initial render
      if (useWarmCache) {
        const cached = readCache(bizId);
        if (cached) {
          setEntitlements(cached);
        }
      }

      // 2) Always revalidate from backend (big-player style)
      try {
        setEntLoading(true);
        setEntError(null);
        const { data } = await axiosClient.get(`/entitlements/${bizId}`);

        // Optional: if you later add UpdatedAtUtc, you can compare here
        writeCache(bizId, data);
        setEntitlements(data);
        return data;
      } catch (err) {
        setEntError(err);
        // eslint-disable-next-line no-console
        console.warn("[Entitlements] fetch failed", err);
        return null;
      } finally {
        setEntLoading(false);
      }
    },
    []
  );

  // ✅ hasFeature(): use entitlements.Features if present; otherwise treat feature code as permission code
  const hasFeature = useCallback(
    code => {
      if (!code) return true;

      // 1) If snapshot has explicit Features list, use that
      const featuresList =
        entitlements &&
        (entitlements.Features ||
          entitlements.features ||
          entitlements.FeatureGrants ||
          entitlements.featureGrants);

      if (Array.isArray(featuresList)) {
        const f = featuresList.find(
          x =>
            x.code === code ||
            x.Code === code ||
            x.featureKey === code ||
            x.FeatureKey === code
        );
        if (f) {
          const allowed =
            f.allowed ??
            f.Allowed ??
            f.isAllowed ??
            f.IsAllowed ??
            f.enabled ??
            f.Enabled;
          return !!allowed;
        }
      }

      // 2) Otherwise, fall back to permission-based gating
      if (can(code)) return true;

      // 3) Finally, fall back to older /auth/context "features" map
      return !!availableFeatures[code];
    },
    [entitlements, availableFeatures, can]
  );

  // ✅ getQuota(): align with EntitlementsSnapshotDto.Quotas shape
  const getQuota = useCallback(
    code => {
      const quotas =
        (entitlements &&
          (entitlements.Quotas ||
            entitlements.quotas ||
            entitlements.planQuotas)) ||
        [];

      if (!Array.isArray(quotas) || !code) {
        return { quotaKey: code, limit: 0, used: 0, remaining: 0 };
      }

      const q = quotas.find(
        x =>
          x.quotaKey === code ||
          x.QuotaKey === code ||
          x.code === code ||
          x.Code === code
      );

      if (!q) {
        return { quotaKey: code, limit: 0, used: 0, remaining: 0 };
      }

      const quotaKey = q.quotaKey ?? q.QuotaKey ?? code;

      const limit = q.limit ?? q.Limit ?? q.max ?? q.Max ?? null;

      const used = q.used ?? q.Used ?? q.consumed ?? q.Consumed ?? 0;

      let remaining = q.remaining ?? q.Remaining ?? null;

      if (remaining == null && limit != null) {
        remaining = Math.max(0, limit - used);
      }

      return {
        ...q,
        quotaKey,
        limit,
        used,
        remaining,
      };
    },
    [entitlements]
  );

  const canUseQuota = useCallback(
    (code, amount = 1) => {
      if (!entitlements) return { ok: false, reason: "no-entitlements" };
      if (!hasFeature(code)) return { ok: false, reason: "no-feature" };
      const q = getQuota(code);
      if (q.limit == null || q.limit === 0) {
        return { ok: false, reason: "quota-exceeded" };
      }
      if (q.remaining < amount) {
        return { ok: false, reason: "quota-exceeded" };
      }
      return { ok: true };
    },
    [entitlements, hasFeature, getQuota]
  );

  // 🔄 Explicit manual refresh → always network, no warm-only mode
  const refreshEntitlements = useCallback(async () => {
    const entBizId = business?.id || businessId;
    if (entBizId) {
      return fetchEntitlements(entBizId, { useWarmCache: false });
    }
    return null;
  }, [business?.id, businessId, fetchEntitlements]);

  // Initial load: warm from cache if available, then revalidate
  useEffect(() => {
    const entBizId = business?.id || businessId;
    if (entBizId) {
      fetchEntitlements(entBizId, { useWarmCache: true }).catch(() => {});
    } else {
      setEntitlements(null);
    }
  }, [business?.id, businessId, fetchEntitlements]);

  // ✅ DERIVED DISPLAY NAME for UI (Topbar, etc.)
  // Keep permissions fresh after admin updates role permissions (MVP: refresh on focus/visibility)
  const lastEntRefreshAtRef = useRef(0);
  useEffect(() => {
    const MIN_MS = 30 * 1000;

    const maybeRefresh = () => {
      const now = Date.now();
      if (now - lastEntRefreshAtRef.current < MIN_MS) return;
      lastEntRefreshAtRef.current = now;
      refreshEntitlements().catch(() => {});
    };

    const onFocus = () => maybeRefresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") maybeRefresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshEntitlements]);

  const userName =
    business?.businessName ||
    business?.name ||
    business?.companyName ||
    user?.fullName ||
    user?.name ||
    user?.displayName ||
    null;

  const value = useMemo(
    () => ({
      // core
      isLoading,
      user,
      business,
      businessId, // ✅ exposed here for CampaignBuilder, ESU, etc.
      role,
      status,
      hasAllAccess,
      permissions,
      availableFeatures,
      can,
      refreshAuthContext,
      userName,
      logout, // 👈 exposed here

      // entitlements
      entitlements,
      entLoading,
      entError,
      hasFeature,
      getQuota,
      canUseQuota,
      refreshEntitlements,
    }),
    [
      isLoading,
      user,
      business,
      businessId,
      role,
      status,
      hasAllAccess,
      permissions,
      availableFeatures,
      can,
      refreshAuthContext,
      userName,
      logout,
      entitlements,
      entLoading,
      entError,
      hasFeature,
      getQuota,
      canUseQuota,
      refreshEntitlements,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
