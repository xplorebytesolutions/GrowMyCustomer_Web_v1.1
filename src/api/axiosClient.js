// 📄 src/api/axiosClient.js
import axios from "axios";
import { toast } from "react-toastify";
import { requestUpgrade } from "../utils/upgradeBus"; // ← src/api → ../utils ✅

// ---------------- Base URL (env overrideable) ----------------
const rawBase =
  (process.env.REACT_APP_API_BASE_URL &&
    process.env.REACT_APP_API_BASE_URL.trim()) ||
  "http://localhost:7113/api";

function normalizeBaseUrl(url) {
  const u = (url || "").replace(/\/+$/, ""); // strip trailing slashes
  return u.endsWith("/api") ? u : `${u}/api`;
}

const apiBaseUrl = normalizeBaseUrl(rawBase);

// ---------------- Token key (single source of truth) --------
export const TOKEN_KEY = "xbyte_token";

// ✅ SuperAdmin selected business keys (must match AuthProvider)
const SA_BIZ_ID_KEY = "sa_selectedBusinessId";

// ✅ Header name used by backend for business override (SuperAdmin scope)
const BIZ_HEADER = "X-Business-Id";

// ---------------- Axios instance ----------------------------
const axiosClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false, // using Bearer tokens, not cookies
});

// ------------------------------------------------------------
// ✅ JWT helper (no dependencies)
// ------------------------------------------------------------
function safeParseJwt(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const payloadB64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");

    // base64 decode with padding
    const padded = payloadB64 + "===".slice((payloadB64.length + 3) % 4);

    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractRoleFromClaims(claims) {
  if (!claims) return null;

  // Common locations/keys across systems
  // - "role": "superadmin"
  // - "roles": ["superadmin"]
  // - Microsoft WS-Fed style role claim:
  //   "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
  const direct =
    claims.role ||
    claims.Role ||
    claims.userRole ||
    claims.UserRole ||
    claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] ||
    claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/role"];

  if (typeof direct === "string") return direct;

  const arr = claims.roles || claims.Roles;
  if (Array.isArray(arr) && arr.length > 0) return arr[0];

  return null;
}

function isSuperAdminToken(token) {
  const claims = safeParseJwt(token);
  const role = String(extractRoleFromClaims(claims) || "").toLowerCase();
  return role === "admin" || role === "superadmin";
}

function readSelectedBusinessId() {
  try {
    const id = localStorage.getItem(SA_BIZ_ID_KEY);
    return id && String(id).trim() ? String(id).trim() : null;
  } catch {
    return null;
  }
}

// Attach Authorization header if token exists
axiosClient.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // ----------------------------------------------------------
  // ✅ SuperAdmin business context injection
  //
  // Rules:
  // 1) Only attach if token role == superadmin
  // 2) Only attach if a selected business exists
  // 3) Allow per-request opt-out via:
  //    config.__skipBizHeader = true
  //    or header "x-skip-biz-header"
  // ----------------------------------------------------------
  const skipBiz =
    config?.__skipBizHeader === true ||
    config?.headers?.["x-skip-biz-header"] === "1" ||
    config?.headers?.["x-skip-biz-header"] === 1 ||
    config?.headers?.["x-skip-biz-header"] === true;

  if (!skipBiz && token && isSuperAdminToken(token)) {
    const selectedBizId = readSelectedBusinessId();
    if (selectedBizId) {
      config.headers[BIZ_HEADER] = selectedBizId;
    } else {
      // Ensure we don't send a stale header
      if (config.headers && config.headers[BIZ_HEADER]) {
        delete config.headers[BIZ_HEADER];
      }
    }
  }

  return config;
});

// ---------------- Helpers -----------------------------------
const AUTH_PAGES = [
  "/login",
  "/signup",
  "/pending-approval",
  "/profile-completion",
];
const isOnAuthPage = () =>
  AUTH_PAGES.some(p => (window.location?.pathname || "").startsWith(p));

let showingAuthToast = false; // 401 / generic / 403 (generic)
let showingQuotaToast = false; // 429

// 403 subscription set (server-side [RequireActiveSubscription] style)
const SUBSCRIPTION_STATUS_CODES = [
  "trialexpired",
  "pastdue",
  "suspended",
  "cancelled",
  "expired",
  "noactivesubscription",
  "noplan",
  "paymentrequired",
];

function isSubscriptionAccessError(error) {
  if (!error?.response) return false;
  const { status, data } = error.response;
  if (status !== 403 || !data) return false;
  if (data.ok !== false) return false;

  const code = String(
    data.status || data.code || data.errorCode || ""
  ).toLowerCase();
  return !!code && SUBSCRIPTION_STATUS_CODES.includes(code);
}

function handleSubscriptionAccessError(error, { suppress403 }) {
  const { data } = error.response || {};
  const message =
    data?.message || "Your subscription does not allow access to this feature.";

  const path = window.location?.pathname || "";
  const onBilling =
    path.startsWith("/app/settings/billing") ||
    path.startsWith("/app/payment/status");

  if (!suppress403 && !showingAuthToast) {
    toast.error(message, { toastId: "subscription-403" });
    showingAuthToast = true;
    setTimeout(() => (showingAuthToast = false), 1500);
  }

  if (!suppress403 && !isOnAuthPage() && !onBilling) {
    setTimeout(() => {
      window.location.href = "/app/settings/billing";
    }, 800);
  }
}

// 403 feature/permission denial (upgrade flow)
const FEATURE_FORBIDDEN_CODES = [
  "featuredenied",
  "feature_denied",
  "featuredisabled",
  "feature_disabled",
  "permissiondenied",
  "permission_denied",
  "forbidden_feature",
];

function isFeatureForbidden403(error) {
  if (!error?.response) return false;
  const { status, data } = error.response;
  if (status !== 403 || !data) return false;
  if (isSubscriptionAccessError(error)) return false;

  const lower = v => String(v || "").toLowerCase();
  const code = lower(data.code || data.errorCode || data.status || data.reason);

  if (FEATURE_FORBIDDEN_CODES.includes(code)) return true;

  const msg = lower(data.message);
  if (!msg) return false;
  return (
    (msg.includes("feature") &&
      (msg.includes("denied") || msg.includes("disabled"))) ||
    (msg.includes("permission") && msg.includes("denied"))
  );
}

function handleFeatureForbidden403(error, { suppress403 }) {
  const data = error?.response?.data || {};
  const featureCode =
    data.featureCode ||
    data.permissionCode ||
    data.code ||
    data.errorCode ||
    data.reason ||
    null;

  const message =
    data?.message ||
    "This feature isn’t available on your current plan. Upgrade to continue.";

  if (!suppress403 && !showingAuthToast) {
    toast.warn(message, { toastId: "feature-403", autoClose: 4000 });
    showingAuthToast = true;
    setTimeout(() => (showingAuthToast = false), 1500);
  }

  // Fire global upgrade modal
  try {
    requestUpgrade({ reason: "feature", code: featureCode });
  } catch {
    // If the bus isn't mounted yet, fail soft
  }

  const path = window.location?.pathname || "";
  const onBilling =
    path.startsWith("/app/settings/billing") ||
    path.startsWith("/app/payment/status");

  if (!suppress403 && !isOnAuthPage() && !onBilling) {
    setTimeout(() => {
      window.location.href = "/app/settings/billing?source=feature";
    }, 800);
  }
}

// 429 quota/entitlement denial
function isQuotaDenial429(error) {
  return !!error?.response && error.response.status === 429;
}

function handleQuotaDenial429(error, { suppress429 }) {
  const data = error?.response?.data || {};
  const reason = String(data.reason || "").toUpperCase() || "QUOTA_LIMIT";
  const quotaKey = data.quotaKey || data.key || data.code || null;

  const msg =
    data?.message ||
    (quotaKey
      ? `Limit reached for ${quotaKey}. Consider upgrading your plan.`
      : `You're out of quota for this action. Consider upgrading your plan.`);

  if (!suppress429 && !showingQuotaToast) {
    toast.warn(msg, { toastId: "quota-429", autoClose: 5000 });
    showingQuotaToast = true;
    setTimeout(() => (showingQuotaToast = false), 1500);
  }

  // Trigger upgrade flow
  try {
    requestUpgrade({ reason: "quota", code: quotaKey || reason });
  } catch {
    // ignore
  }

  // breadcrumb for UI (e.g., Billing page can read & show details)
  try {
    sessionStorage.setItem(
      "last_quota_denial",
      JSON.stringify({
        at: new Date().toISOString(),
        reason,
        quotaKey,
        path: error?.config?.url || "",
      })
    );
  } catch {}

  const path = window.location?.pathname || "";
  const onBilling =
    path.startsWith("/app/settings/billing") ||
    path.startsWith("/app/payment/status");

  if (!suppress429 && !isOnAuthPage() && !onBilling) {
    setTimeout(() => {
      window.location.href = "/app/settings/billing?source=quota";
    }, 800);
  }
}

// ---------------- Response interceptor ----------------------
axiosClient.interceptors.response.use(
  res => res,
  error => {
    const status = error?.response?.status;
    const msg =
      error?.response?.data?.message ||
      error?.message ||
      "❌ Something went wrong.";

    const cfg = error?.config || {};
    const suppressToast =
      cfg.__silentToast || cfg.__silent || cfg.headers?.["x-suppress-toast"];
    const suppress401 =
      suppressToast ||
      cfg.__silent401 ||
      cfg.headers?.["x-suppress-401-toast"] ||
      isOnAuthPage();
    const suppress403 =
      suppressToast ||
      cfg.__silent403 ||
      cfg.headers?.["x-suppress-403-toast"] ||
      isOnAuthPage();
    const suppress429 =
      suppressToast ||
      cfg.__silent429 ||
      cfg.headers?.["x-suppress-429-toast"] ||
      false;

    // 🔍 Detect login / signup calls so we don't redirect those 401s
    const isLoginCall =
      typeof cfg.url === "string" &&
      (cfg.url.includes("/auth/login") || cfg.url.includes("/auth/signup"));

    // 401 → clear token, soft-redirect to login (except for /auth/login itself)
    if (status === 401) {
      // Let normal login errors bubble up to the login form
      if (isLoginCall) {
        return Promise.reject(error);
      }

      localStorage.removeItem(TOKEN_KEY);

      // Mark that this was a session-expired redirect
      try {
        sessionStorage.setItem("auth_last_reason", "session-expired");
      } catch {
        // ignore
      }

      if (!suppress401 && !showingAuthToast) {
        toast.error("⏰ Session expired. Please log in again.");
        showingAuthToast = true;
        setTimeout(() => (showingAuthToast = false), 2000);
      }

      if (!suppress401 && !isOnAuthPage()) {
        const redirectTo = encodeURIComponent(
          (window.location?.pathname || "") +
            (window.location?.search || "") +
            (window.location?.hash || "")
        );
        // include reason=session-expired so Login page can show a banner
        window.location.href = `/login?reason=session-expired&redirectTo=${redirectTo}`;
      }

      return Promise.reject(error);
    }

    // 403 → subscription vs feature vs generic forbidden
    if (status === 403) {
      if (isSubscriptionAccessError(error)) {
        handleSubscriptionAccessError(error, { suppress403 });
      } else if (isFeatureForbidden403(error)) {
        handleFeatureForbidden403(error, { suppress403 });
      } else {
        if (!suppress403 && !showingAuthToast) {
          toast.error("⛔ Access denied.");
          showingAuthToast = true;
          setTimeout(() => (showingAuthToast = false), 2000);
        }
      }
      return Promise.reject(error);
    }

    // 429 → quota/entitlement denial
    if (isQuotaDenial429(error)) {
      handleQuotaDenial429(error, { suppress429 });
      return Promise.reject(error);
    }

    // Generic non-401/403/429
    if (!suppressToast && !showingAuthToast) {
      toast.error(msg);
      showingAuthToast = true;
      setTimeout(() => (showingAuthToast = false), 1500);
    }

    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[Axios Error]", error);
    }

    return Promise.reject(error);
  }
);

if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.log("✅ Axios BASE URL:", axiosClient.defaults.baseURL);
}

export default axiosClient;

// // 📄 src/api/axiosClient.js
// import axios from "axios";
// import { toast } from "react-toastify";
// import { requestUpgrade } from "../utils/upgradeBus"; // ← src/api → ../utils ✅

// // ---------------- Base URL (env overrideable) ----------------
// const rawBase =
//   (process.env.REACT_APP_API_BASE_URL &&
//     process.env.REACT_APP_API_BASE_URL.trim()) ||
//   "http://localhost:7113/api";

// function normalizeBaseUrl(url) {
//   const u = (url || "").replace(/\/+$/, ""); // strip trailing slashes
//   return u.endsWith("/api") ? u : `${u}/api`;
// }

// const apiBaseUrl = normalizeBaseUrl(rawBase);

// // ---------------- Token key (single source of truth) --------
// export const TOKEN_KEY = "xbyte_token";

// // ---------------- Axios instance ----------------------------
// const axiosClient = axios.create({
//   baseURL: apiBaseUrl,
//   headers: {
//     "Content-Type": "application/json",
//     Accept: "application/json",
//   },
//   withCredentials: false, // using Bearer tokens, not cookies
// });

// // Attach Authorization header if token exists
// axiosClient.interceptors.request.use(config => {
//   const token = localStorage.getItem(TOKEN_KEY);
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

// // ---------------- Helpers -----------------------------------
// const AUTH_PAGES = [
//   "/login",
//   "/signup",
//   "/pending-approval",
//   "/profile-completion",
// ];
// const isOnAuthPage = () =>
//   AUTH_PAGES.some(p => (window.location?.pathname || "").startsWith(p));

// let showingAuthToast = false; // 401 / generic / 403 (generic)
// let showingQuotaToast = false; // 429

// // 403 subscription set (server-side [RequireActiveSubscription] style)
// const SUBSCRIPTION_STATUS_CODES = [
//   "trialexpired",
//   "pastdue",
//   "suspended",
//   "cancelled",
//   "expired",
//   "noactivesubscription",
//   "noplan",
//   "paymentrequired",
// ];

// function isSubscriptionAccessError(error) {
//   if (!error?.response) return false;
//   const { status, data } = error.response;
//   if (status !== 403 || !data) return false;
//   if (data.ok !== false) return false;

//   const code = String(
//     data.status || data.code || data.errorCode || ""
//   ).toLowerCase();
//   return !!code && SUBSCRIPTION_STATUS_CODES.includes(code);
// }

// function handleSubscriptionAccessError(error, { suppress403 }) {
//   const { data } = error.response || {};
//   const message =
//     data?.message || "Your subscription does not allow access to this feature.";

//   const path = window.location?.pathname || "";
//   const onBilling =
//     path.startsWith("/app/settings/billing") ||
//     path.startsWith("/app/payment/status");

//   if (!suppress403 && !showingAuthToast) {
//     toast.error(message, { toastId: "subscription-403" });
//     showingAuthToast = true;
//     setTimeout(() => (showingAuthToast = false), 1500);
//   }

//   if (!suppress403 && !isOnAuthPage() && !onBilling) {
//     setTimeout(() => {
//       window.location.href = "/app/settings/billing";
//     }, 800);
//   }
// }

// // 403 feature/permission denial (upgrade flow)
// const FEATURE_FORBIDDEN_CODES = [
//   "featuredenied",
//   "feature_denied",
//   "featuredisabled",
//   "feature_disabled",
//   "permissiondenied",
//   "permission_denied",
//   "forbidden_feature",
// ];

// function isFeatureForbidden403(error) {
//   if (!error?.response) return false;
//   const { status, data } = error.response;
//   if (status !== 403 || !data) return false;
//   if (isSubscriptionAccessError(error)) return false;

//   const lower = v => String(v || "").toLowerCase();
//   const code = lower(data.code || data.errorCode || data.status || data.reason);

//   if (FEATURE_FORBIDDEN_CODES.includes(code)) return true;

//   const msg = lower(data.message);
//   if (!msg) return false;
//   return (
//     (msg.includes("feature") &&
//       (msg.includes("denied") || msg.includes("disabled"))) ||
//     (msg.includes("permission") && msg.includes("denied"))
//   );
// }

// function handleFeatureForbidden403(error, { suppress403 }) {
//   const data = error?.response?.data || {};
//   const featureCode =
//     data.featureCode ||
//     data.permissionCode ||
//     data.code ||
//     data.errorCode ||
//     data.reason ||
//     null;

//   const message =
//     data?.message ||
//     "This feature isn’t available on your current plan. Upgrade to continue.";

//   if (!suppress403 && !showingAuthToast) {
//     toast.warn(message, { toastId: "feature-403", autoClose: 4000 });
//     showingAuthToast = true;
//     setTimeout(() => (showingAuthToast = false), 1500);
//   }

//   // Fire global upgrade modal
//   try {
//     requestUpgrade({ reason: "feature", code: featureCode });
//   } catch {
//     // If the bus isn't mounted yet, fail soft
//   }

//   const path = window.location?.pathname || "";
//   const onBilling =
//     path.startsWith("/app/settings/billing") ||
//     path.startsWith("/app/payment/status");

//   if (!suppress403 && !isOnAuthPage() && !onBilling) {
//     setTimeout(() => {
//       window.location.href = "/app/settings/billing?source=feature";
//     }, 800);
//   }
// }

// // 429 quota/entitlement denial
// function isQuotaDenial429(error) {
//   return !!error?.response && error.response.status === 429;
// }

// function handleQuotaDenial429(error, { suppress429 }) {
//   const data = error?.response?.data || {};
//   const reason = String(data.reason || "").toUpperCase() || "QUOTA_LIMIT";
//   const quotaKey = data.quotaKey || data.key || data.code || null;

//   const msg =
//     data?.message ||
//     (quotaKey
//       ? `Limit reached for ${quotaKey}. Consider upgrading your plan.`
//       : `You're out of quota for this action. Consider upgrading your plan.`);

//   if (!suppress429 && !showingQuotaToast) {
//     toast.warn(msg, { toastId: "quota-429", autoClose: 5000 });
//     showingQuotaToast = true;
//     setTimeout(() => (showingQuotaToast = false), 1500);
//   }

//   // Trigger upgrade flow
//   try {
//     requestUpgrade({ reason: "quota", code: quotaKey || reason });
//   } catch {
//     // ignore
//   }

//   // breadcrumb for UI (e.g., Billing page can read & show details)
//   try {
//     sessionStorage.setItem(
//       "last_quota_denial",
//       JSON.stringify({
//         at: new Date().toISOString(),
//         reason,
//         quotaKey,
//         path: error?.config?.url || "",
//       })
//     );
//   } catch {}

//   const path = window.location?.pathname || "";
//   const onBilling =
//     path.startsWith("/app/settings/billing") ||
//     path.startsWith("/app/payment/status");

//   if (!suppress429 && !isOnAuthPage() && !onBilling) {
//     setTimeout(() => {
//       window.location.href = "/app/settings/billing?source=quota";
//     }, 800);
//   }
// }

// // ---------------- Response interceptor ----------------------
// axiosClient.interceptors.response.use(
//   res => res,
//   error => {
//     const status = error?.response?.status;
//     const msg =
//       error?.response?.data?.message ||
//       error?.message ||
//       "❌ Something went wrong.";

//     const cfg = error?.config || {};
//     const suppressToast =
//       cfg.__silentToast || cfg.__silent || cfg.headers?.["x-suppress-toast"];
//     const suppress401 =
//       suppressToast ||
//       cfg.__silent401 ||
//       cfg.headers?.["x-suppress-401-toast"] ||
//       isOnAuthPage();
//     const suppress403 =
//       suppressToast ||
//       cfg.__silent403 ||
//       cfg.headers?.["x-suppress-403-toast"] ||
//       isOnAuthPage();
//     const suppress429 =
//       suppressToast ||
//       cfg.__silent429 ||
//       cfg.headers?.["x-suppress-429-toast"] ||
//       false;

//     // 🔍 Detect login / signup calls so we don't redirect those 401s
//     const isLoginCall =
//       typeof cfg.url === "string" &&
//       (cfg.url.includes("/auth/login") || cfg.url.includes("/auth/signup"));

//     // 401 → clear token, soft-redirect to login (except for /auth/login itself)
//     if (status === 401) {
//       // Let normal login errors bubble up to the login form
//       if (isLoginCall) {
//         return Promise.reject(error);
//       }

//       localStorage.removeItem(TOKEN_KEY);

//       // Mark that this was a session-expired redirect
//       try {
//         sessionStorage.setItem("auth_last_reason", "session-expired");
//       } catch {
//         // ignore
//       }

//       if (!suppress401 && !showingAuthToast) {
//         toast.error("⏰ Session expired. Please log in again.");
//         showingAuthToast = true;
//         setTimeout(() => (showingAuthToast = false), 2000);
//       }

//       if (!suppress401 && !isOnAuthPage()) {
//         const redirectTo = encodeURIComponent(
//           (window.location?.pathname || "") +
//             (window.location?.search || "") +
//             (window.location?.hash || "")
//         );
//         // include reason=session-expired so Login page can show a banner
//         window.location.href = `/login?reason=session-expired&redirectTo=${redirectTo}`;
//       }

//       return Promise.reject(error);
//     }

//     // 403 → subscription vs feature vs generic forbidden
//     if (status === 403) {
//       if (isSubscriptionAccessError(error)) {
//         handleSubscriptionAccessError(error, { suppress403 });
//       } else if (isFeatureForbidden403(error)) {
//         handleFeatureForbidden403(error, { suppress403 });
//       } else {
//         if (!suppress403 && !showingAuthToast) {
//           toast.error("⛔ Access denied.");
//           showingAuthToast = true;
//           setTimeout(() => (showingAuthToast = false), 2000);
//         }
//       }
//       return Promise.reject(error);
//     }

//     // 429 → quota/entitlement denial
//     if (isQuotaDenial429(error)) {
//       handleQuotaDenial429(error, { suppress429 });
//       return Promise.reject(error);
//     }

//     // Generic non-401/403/429
//     if (!suppressToast && !showingAuthToast) {
//       toast.error(msg);
//       showingAuthToast = true;
//       setTimeout(() => (showingAuthToast = false), 1500);
//     }

//     if (process.env.NODE_ENV !== "production") {
//       // eslint-disable-next-line no-console
//       console.error("[Axios Error]", error);
//     }

//     return Promise.reject(error);
//   }
// );

// if (process.env.NODE_ENV !== "production") {
//   // eslint-disable-next-line no-console
//   console.log("✅ Axios BASE URL:", axiosClient.defaults.baseURL);
// }

// export default axiosClient;
