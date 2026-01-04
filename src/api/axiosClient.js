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

// ---------------- Axios instance ----------------------------
const axiosClient = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: false, // using Bearer tokens, not cookies
});

// Attach Authorization header if token exists
axiosClient.interceptors.request.use(config => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
//     const suppress401 =
//       cfg.__silent401 ||
//       cfg.headers?.["x-suppress-401-toast"] ||
//       isOnAuthPage();
//     const suppress403 =
//       cfg.__silent403 ||
//       cfg.headers?.["x-suppress-403-toast"] ||
//       isOnAuthPage();
//     const suppress429 =
//       cfg.__silent429 || cfg.headers?.["x-suppress-429-toast"] || false;

//     // 401 → clear token, soft-redirect to login
//     if (status === 401) {
//       localStorage.removeItem(TOKEN_KEY);

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
//         window.location.href = `/login?redirectTo=${redirectTo}`;
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
//     if (!showingAuthToast) {
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
