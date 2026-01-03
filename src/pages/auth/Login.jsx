// 📄 src/pages/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Clock } from "lucide-react";
import { login } from "./services/authService";
import { useAuth } from "../../app/providers/AuthProvider";

function routeForStatus(status = "") {
  const s = String(status || "").toLowerCase();
  if (s === "profilepending") return "/app/profile-completion";
  if (s === "pending" || s === "underreview") return "/pending-approval";
  if (s === "suspended" || s === "blocked") return "/no-access";
  return "/app/welcomepage";
}

const LAST_EMAIL_KEY = "auth_last_email";
const LAST_REASON_KEY = "auth_last_reason";

export default function Login() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const { refreshAuthContext } = useAuth();

  const [email, setEmail] = useState(() => {
    const fromQuery = search.get("email");
    if (fromQuery) return fromQuery;
    try {
      return localStorage.getItem(LAST_EMAIL_KEY) || "";
    } catch {
      return "";
    }
  });

  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sessionNotice, setSessionNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let reasonFromUrl = search.get("reason");
    let reasonFromStorage = null;
    try {
      reasonFromStorage = sessionStorage.getItem(LAST_REASON_KEY);
    } catch {
      /* ignore */
    }

    const effectiveReason = reasonFromUrl || reasonFromStorage;
    if (effectiveReason === "session-expired") {
      setSessionNotice("Your session has expired. Please sign in again.");
    }
    try {
      sessionStorage.removeItem(LAST_REASON_KEY);
    } catch {
      /* ignore */
    }
  }, [search]);

  const handleSubmit = async e => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await login(email, password);
      try {
        sessionStorage.setItem("xb_suppress_401_toast", "1");
        setTimeout(
          () => sessionStorage.removeItem("xb_suppress_401_toast"),
          4000
        );
      } catch {}

      const ctx = await refreshAuthContext();
      const statusFromCtx = ctx?.status || res?.status;

      try {
        localStorage.setItem("xb_session_stamp", String(Date.now()));
        localStorage.removeItem("messaging-pinned");
        localStorage.removeItem("messaging-archived");
        localStorage.removeItem("messaging-order");
        localStorage.setItem(LAST_EMAIL_KEY, email);
        sessionStorage.removeItem(LAST_REASON_KEY);
      } catch {}

      const candidate = search.get("redirectTo");
      const next =
        (candidate && candidate.startsWith("/") && !candidate.startsWith("//")
          ? candidate
          : null) || routeForStatus(statusFromCtx);

      if (next === "/app/profile-completion") {
        toast.info("🧩 Please complete your profile to continue.");
      } else if (next === "/pending-approval") {
        toast.warn("⏳ Your account is pending approval.");
      } else {
        toast.success("✅ Login successful");
      }
      navigate(next, { replace: true });
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || "❌ Login failed.";
      const lower = String(message).toLowerCase();
      const isWarning =
        lower.includes("pending") || lower.includes("under review");
      (isWarning ? toast.warn : toast.error)(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const errorText = String(error || "").trim();
  const errorLower = errorText.toLowerCase();
  const displayErrorText =
    errorLower.includes("not active") ||
    errorLower.includes("under review") ||
    errorLower.includes("pending approval")
      ? "Your account is under review and will be activated shortly after approval."
      : errorText;
  const isWarning =
    typeof error === "string" &&
    (error.toLowerCase().includes("pending") ||
      error.toLowerCase().includes("under review"));
  const showErrorIcon =
    displayErrorText !== "" && /^[A-Za-z0-9]/.test(displayErrorText);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-6 font-sans text-gray-900 bg-gray-50"
      style={{
        // NEW: Subtle background noise pattern for the whole page (optional, keeps it pro)
        backgroundImage: "radial-gradient(#e5e7eb 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
      data-test-id="login-page"
    >
      <div className="flex flex-col lg:flex-row w-full max-w-5xl shadow-2xl rounded-3xl overflow-hidden bg-white ring-1 ring-gray-900/5">
        {/* LEFT SIDE - MARKETING 
           Enhancement: Added a technical "Dot Grid" pattern overlay and a "Workflow" line connecting the icons.
        */}
        <div className="lg:w-1/2 relative bg-emerald-50 p-8 lg:p-12 flex flex-col justify-center overflow-hidden">
          {/* DECORATION: CSS-only Dot Pattern for "Tech Vibe" */}
          <div
            className="absolute inset-0 opacity-[0.4]"
            style={{
              backgroundImage:
                "radial-gradient(#10b981 1.5px, transparent 1.5px)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Content sits above the pattern */}
          <div className="relative z-10">
            <div className="mb-8">
              <div className="flex items-center space-x-3 mb-6">
                <img src="/new_logo_gmc.png" alt="GrowMyCustomer" className="h-20 w-auto object-contain" />
              </div>

              <h1 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                Scale your business on{" "}
                <span className="text-emerald-600">WhatsApp</span>
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed">
                Join thousands of businesses automating their customer growth
                journey.
              </p>
            </div>

            {/* ENHANCED FEATURE LIST: Connected "Workflow" Line */}
            <div className="space-y-6 relative">
              {/* The Vertical Line Connector */}
              <div className="absolute left-5 top-2 bottom-6 w-0.5 bg-emerald-200" />

              {/* Item 1 */}
              <div className="flex items-start space-x-4 relative">
                <div className="w-10 h-10 rounded-full bg-white border-4 border-emerald-50 flex items-center justify-center shadow-sm z-10">
                  <svg
                    className="w-4 h-4 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    Official API Access
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Verified green tick & high limits
                  </p>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-start space-x-4 relative">
                <div className="w-10 h-10 rounded-full bg-white border-4 border-emerald-50 flex items-center justify-center shadow-sm z-10">
                  <svg
                    className="w-4 h-4 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    24/7 Automation
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Replies even when you sleep
                  </p>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-start space-x-4 relative">
                <div className="w-10 h-10 rounded-full bg-white border-4 border-emerald-50 flex items-center justify-center shadow-sm z-10">
                  <svg
                    className="w-4 h-4 text-emerald-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <div className="pt-2">
                  <h3 className="text-sm font-bold text-gray-900">
                    Real-time Analytics
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Track open rates & ROI
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - FORM 
           Enhancement: More whitespace, better input typography, and tactile focus states.
        */}
        <div className="lg:w-1/2 bg-white p-8 lg:p-12 flex flex-col justify-center">
          <div className="w-full max-w-sm mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              Welcome Back
            </h2>
            <p className="text-gray-500 mb-8">
              Please enter your details to sign in.
            </p>

            {sessionNotice && (
              <div className="p-4 rounded-xl mb-6 text-sm font-medium bg-amber-50 text-amber-800 border border-amber-100 flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                {sessionNotice}
              </div>
            )}

            {error && (
              <div
                className={`p-4 rounded-xl mb-6 text-sm font-medium border flex items-center ${
                  isWarning
                    ? "bg-amber-50 text-amber-800 border-amber-100"
                    : "bg-red-50 text-red-700 border-red-100"
                }`}
              >
                {showErrorIcon && (
                  <span className="mr-2">{isWarning ? "⚠️" : "🚫"}</span>
                )}{" "}
                {displayErrorText || error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400"
                  placeholder="name@company.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full px-4 py-3 pr-11 border border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all duration-200 bg-gray-50 focus:bg-white text-gray-900 placeholder-gray-400"
                    placeholder="Enter password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    onClick={() => setShowPassword(prev => !prev)}
                  >
                    {showPassword ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password link (Visual enhancement only, links to # for now) */}
              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-xl font-bold text-white shadow-lg shadow-emerald-200 transition-all duration-200 transform hover:-translate-y-0.5 ${
                  loading
                    ? "bg-gray-300 shadow-none cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-300"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In to Account"
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Don&apos;t have an account yet?{" "}
                <Link
                  to="/signup-for-trial"
                  className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Start 14-day free trial
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
// // 📄 src/pages/auth/Login.jsx
// import React, { useState, useEffect } from "react";
// import { useNavigate, Link, useSearchParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import { login } from "./services/authService";
// import { useAuth } from "../../app/providers/AuthProvider";

// function routeForStatus(status = "") {
//   const s = String(status || "").toLowerCase();
//   if (s === "profilepending") return "/app/profile-completion";
//   if (s === "pending" || s === "underreview") return "/pending-approval";
//   if (s === "suspended" || s === "blocked") return "/no-access";
//   return "/app/welcomepage";
// }

// // Persisted keys for nicer UX
// const LAST_EMAIL_KEY = "auth_last_email";
// const LAST_REASON_KEY = "auth_last_reason";

// export default function Login() {
//   const navigate = useNavigate();
//   const [search] = useSearchParams();
//   const { refreshAuthContext } = useAuth();

//   // Pre-fill email from ?email= or localStorage
//   const [email, setEmail] = useState(() => {
//     const fromQuery = search.get("email");
//     if (fromQuery) return fromQuery;
//     try {
//       return localStorage.getItem(LAST_EMAIL_KEY) || "";
//     } catch {
//       return "";
//     }
//   });

//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [sessionNotice, setSessionNotice] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);

//   // Detect session-expired reason (URL or sessionStorage) and show a banner
//   useEffect(() => {
//     let reasonFromUrl = search.get("reason");
//     let reasonFromStorage = null;

//     try {
//       reasonFromStorage = sessionStorage.getItem(LAST_REASON_KEY);
//     } catch {
//       // ignore
//     }

//     const effectiveReason = reasonFromUrl || reasonFromStorage;

//     if (effectiveReason === "session-expired") {
//       setSessionNotice(
//         "Your session has expired. Please sign in again to continue."
//       );
//     }

//     // One-shot: clear after reading so it doesn't show forever
//     try {
//       sessionStorage.removeItem(LAST_REASON_KEY);
//     } catch {
//       // ignore
//     }
//   }, [search]);

//   const handleSubmit = async e => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       // 1) Server login
//       const res = await login(email, password);

//       // 2) Quiet any transient 401 toast
//       try {
//         sessionStorage.setItem("xb_suppress_401_toast", "1");
//         setTimeout(
//           () => sessionStorage.removeItem("xb_suppress_401_toast"),
//           4000
//         );
//       } catch {}

//       // 3) Hydrate AuthProvider
//       const ctx = await refreshAuthContext();
//       const statusFromCtx = ctx?.status || res?.status;

//       // 4) Clear caches
//       try {
//         localStorage.setItem("xb_session_stamp", String(Date.now()));
//         localStorage.removeItem("messaging-pinned");
//         localStorage.removeItem("messaging-archived");
//         localStorage.removeItem("messaging-order");
//         localStorage.setItem(LAST_EMAIL_KEY, email);
//         sessionStorage.removeItem(LAST_REASON_KEY);
//       } catch {}

//       // 5) Redirect
//       const candidate = search.get("redirectTo");
//       const next =
//         (candidate && candidate.startsWith("/") && !candidate.startsWith("//")
//           ? candidate
//           : null) || routeForStatus(statusFromCtx);

//       if (next === "/app/profile-completion") {
//         toast.info("🧩 Please complete your profile to continue.");
//       } else if (next === "/pending-approval") {
//         toast.warn("⏳ Your account is pending approval.");
//       } else {
//         toast.success("✅ Login successful");
//       }

//       navigate(next, { replace: true });
//     } catch (err) {
//       const message =
//         err?.response?.data?.message || err?.message || "❌ Login failed.";
//       const lower = String(message).toLowerCase();
//       const isWarning =
//         lower.includes("pending") || lower.includes("under review");

//       (isWarning ? toast.warn : toast.error)(message);
//       setError(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isWarning =
//     typeof error === "string" &&
//     (error.toLowerCase().includes("pending") ||
//       error.toLowerCase().includes("under review"));

//   return (
//     <div
//       // CHANGED: Removed gradient. Used a soft gray-50 to reduce eye glare.
//       className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-4"
//       data-test-id="login-page"
//     >
//       <div className="flex flex-col lg:flex-row w-full max-w-5xl shadow-xl rounded-2xl overflow-hidden bg-white border border-gray-100">
//         {/* Left Side - Marketing Panel
//             CHANGED: Removed gradient. Used a solid, soft 'emerald-50' bg.
//             This gives the Green vibe without the visual noise.
//         */}
//         <div className="lg:w-1/2 bg-emerald-50 p-6 lg:p-8 flex flex-col justify-center border-r border-emerald-100">
//           <div className="mb-6">
//             <div className="flex items-center space-x-3">
//               <img
//                 src="/logo/logo.svg"
//                 alt="XploreByte Logo"
//                 className="w-10 h-10 rounded-lg" // Removed shadow for cleaner look
//               />
//               {/* CHANGED: Text to emerald-900 for high contrast */}
//               <span className="text-2xl font-bold text-emerald-950">
//                 XploreByte
//               </span>
//             </div>
//           </div>

//           <div className="mb-6">
//             <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
//               Welcome Back!
//             </h1>
//             <p className="text-gray-600 text-lg">
//               Sign in to continue your Business Growth journey
//             </p>
//           </div>

//           <div className="space-y-4">
//             {/* Feature 1 */}
//             <div className="flex items-center space-x-3">
//               {/* CHANGED: Icon bg to white for "pop" on the green background */}
//               <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
//                 <svg
//                   className="w-5 h-5 text-emerald-600"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M5 13l4 4L19 7"
//                   />
//                 </svg>
//               </div>
//               <span className="text-sm font-medium text-emerald-900">
//                 Access your WhatsApp Business API
//               </span>
//             </div>

//             {/* Feature 2 */}
//             <div className="flex items-center space-x-3">
//               <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
//                 {/* CHANGED: Switched from Cyan to Teal/Emerald for consistency */}
//                 <svg
//                   className="w-5 h-5 text-emerald-600"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M13 10V3L4 14h7v7l9-11h-7z"
//                   />
//                 </svg>
//               </div>
//               <span className="text-sm font-medium text-emerald-900">
//                 Manage campaigns and automation
//               </span>
//             </div>

//             {/* Feature 3 */}
//             <div className="flex items-center space-x-3">
//               <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
//                 {/* CHANGED: Switched from Sapphire to Emerald */}
//                 <svg
//                   className="w-5 h-5 text-emerald-600"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
//                   />
//                 </svg>
//               </div>
//               <span className="text-sm font-medium text-emerald-900">
//                 View analytics and insights
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* Right Side - Login Form */}
//         <div className="lg:w-1/2 bg-white p-6 lg:p-8 flex flex-col justify-center">
//           <div className="mb-6">
//             <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
//             <p className="text-gray-600 text-sm">
//               Enter your credentials to access your account
//             </p>
//           </div>

//           {sessionNotice && (
//             <div
//               className="p-3 rounded-lg mb-4 text-sm font-medium bg-blue-50 text-blue-800 border border-blue-100"
//               role="status"
//             >
//               {sessionNotice}
//             </div>
//           )}

//           {error && (
//             <div
//               className={`p-3 rounded-lg mb-4 text-sm font-medium ${
//                 isWarning
//                   ? "bg-amber-50 text-amber-800 border border-amber-200"
//                   : "bg-red-50 text-red-700 border border-red-200"
//               }`}
//               role="alert"
//             >
//               {error}
//             </div>
//           )}

//           <form
//             onSubmit={handleSubmit}
//             className="space-y-5" // Increased spacing slightly for "breathing room"
//             data-test-id="login-form"
//           >
//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1">
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 // CHANGED: Focus ring is now solid emerald-500, no generic blue
//                 className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm bg-gray-50 focus:bg-white"
//                 placeholder="name@company.com"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 required
//                 autoComplete="username email"
//                 name="email"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-semibold text-gray-700 mb-1">
//                 Password
//               </label>
//               <div className="relative">
//                 <input
//                   type={showPassword ? "text" : "password"}
//                   className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm bg-gray-50 focus:bg-white"
//                   placeholder="Enter your password"
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   required
//                   autoComplete="current-password"
//                   name="password"
//                 />
//                 <button
//                   type="button"
//                   className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                   onClick={() => setShowPassword(prev => !prev)}
//                 >
//                   {showPassword ? "🙈" : "👁️"}
//                 </button>
//               </div>
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               // CHANGED: Removed Gradient. Used Solid Emerald.
//               // This is the key change for readability. Solid buttons are authoritative and calm.
//               className={`w-full py-2.5 px-4 rounded-lg font-semibold transition shadow-md hover:shadow-lg ${
//                 loading
//                   ? "bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200"
//                   : "bg-emerald-600 hover:bg-emerald-700 text-white"
//               }`}
//             >
//               {loading ? "Signing in..." : "Sign In"}
//             </button>
//           </form>

//           <div className="text-center mt-6 text-sm text-gray-600">
//             Don&apos;t have an account?{" "}
//             <Link
//               to="/signup-for-trial"
//               // CHANGED: Link color to match Emerald theme
//               className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline"
//               data-test-id="signup-link"
//             >
//               Start your FREE trial
//             </Link>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
// // 📄 src/pages/auth/Login.jsx
// import React, { useState, useEffect } from "react";
// import { useNavigate, Link, useSearchParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import { login } from "./services/authService";
// import { useAuth } from "../../app/providers/AuthProvider";

// function routeForStatus(status = "") {
//   const s = String(status || "").toLowerCase();
//   if (s === "profilepending") return "/app/profile-completion";
//   if (s === "pending" || s === "underreview") return "/pending-approval";
//   if (s === "suspended" || s === "blocked") return "/no-access";
//   return "/app/welcomepage";
// }

// // Persisted keys for nicer UX
// const LAST_EMAIL_KEY = "auth_last_email";
// const LAST_REASON_KEY = "auth_last_reason";

// export default function Login() {
//   const navigate = useNavigate();
//   const [search] = useSearchParams();
//   const { refreshAuthContext } = useAuth();

//   // Pre-fill email from ?email= or localStorage
//   const [email, setEmail] = useState(() => {
//     const fromQuery = search.get("email");
//     if (fromQuery) return fromQuery;
//     try {
//       return localStorage.getItem(LAST_EMAIL_KEY) || "";
//     } catch {
//       return "";
//     }
//   });

//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [sessionNotice, setSessionNotice] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);

//   // Detect session-expired reason (URL or sessionStorage) and show a banner
//   useEffect(() => {
//     let reasonFromUrl = search.get("reason");
//     let reasonFromStorage = null;

//     try {
//       reasonFromStorage = sessionStorage.getItem(LAST_REASON_KEY);
//     } catch {
//       // ignore
//     }

//     const effectiveReason = reasonFromUrl || reasonFromStorage;

//     if (effectiveReason === "session-expired") {
//       setSessionNotice(
//         "Your session has expired. Please sign in again to continue."
//       );
//     }

//     // One-shot: clear after reading so it doesn't show forever
//     try {
//       sessionStorage.removeItem(LAST_REASON_KEY);
//     } catch {
//       // ignore
//     }
//   }, [search]);

//   const handleSubmit = async e => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       // 1) Server login (stores JWT in localStorage via authService)
//       const res = await login(email, password);

//       // 2) Quiet any transient 401 toast during the immediate refetch
//       try {
//         sessionStorage.setItem("xb_suppress_401_toast", "1");
//         setTimeout(
//           () => sessionStorage.removeItem("xb_suppress_401_toast"),
//           4000
//         );
//       } catch {}

//       // 3) Hydrate AuthProvider (user/business/permissions/features)
//       const ctx = await refreshAuthContext(); // calls /auth/context inside provider
//       const statusFromCtx = ctx?.status || res?.status;

//       // 4) Clear some UI caches + remember email + clear last reason
//       try {
//         localStorage.setItem("xb_session_stamp", String(Date.now()));
//         localStorage.removeItem("messaging-pinned");
//         localStorage.removeItem("messaging-archived");
//         localStorage.removeItem("messaging-order");

//         // Persist email for next time
//         localStorage.setItem(LAST_EMAIL_KEY, email);

//         // Clear any previous session-expired flag on successful login
//         sessionStorage.removeItem(LAST_REASON_KEY);
//       } catch {}

//       // 5) Redirect: prefer ?redirectTo=... if present and safe
//       const candidate = search.get("redirectTo");
//       const next =
//         (candidate && candidate.startsWith("/") && !candidate.startsWith("//")
//           ? candidate
//           : null) || routeForStatus(statusFromCtx);

//       if (next === "/app/profile-completion") {
//         toast.info("🧩 Please complete your profile to continue.");
//       } else if (next === "/pending-approval") {
//         toast.warn("⏳ Your account is pending approval.");
//       } else {
//         toast.success("✅ Login successful");
//       }

//       navigate(next, { replace: true });
//     } catch (err) {
//       const message =
//         err?.response?.data?.message || err?.message || "❌ Login failed.";
//       const lower = String(message).toLowerCase();
//       const isWarning =
//         lower.includes("pending") || lower.includes("under review");

//       (isWarning ? toast.warn : toast.error)(message);
//       setError(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isWarning =
//     typeof error === "string" &&
//     (error.toLowerCase().includes("pending") ||
//       error.toLowerCase().includes("under review"));

//   return (
//     <div
//       className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center px-4 py-4"
//       data-test-id="login-page"
//     >
//       <div className="flex flex-col lg:flex-row w-full max-w-5xl shadow-2xl rounded-2xl overflow-hidden bg-white">
//         {/* Left Side - Marketing Panel */}
//         <div className="lg:w-1/2 bg-gradient-to-br from-emerald-50 to-cyan-50 p-6 lg:p-8 flex flex-col justify-center">
//           <div className="mb-6">
//             <div className="flex items-center space-x-3">
//               <img
//                 src="/logo/logo.svg"
//                 alt="XploreByte Logo"
//                 className="w-10 h-10 rounded-lg shadow-sm"
//               />
//               <span className="text-2xl font-bold text-gray-900">
//                 XploreByte
//               </span>
//             </div>
//           </div>

//           <div className="mb-6">
//             <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
//               Welcome Back!
//             </h1>
//             <p className="text-gray-600 text-lg">
//               Sign in to continue your Business Growth journey
//             </p>
//           </div>

//           <div className="space-y-3">
//             <div className="flex items-center space-x-3">
//               <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
//                 <svg
//                   className="w-4 h-4 text-emerald-600"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M5 13l4 4L19 7"
//                   />
//                 </svg>
//               </div>
//               <span className="text-sm text-gray-700">
//                 Access your WhatsApp Business API
//               </span>
//             </div>
//             <div className="flex items-center space-x-3">
//               <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
//                 <svg
//                   className="w-4 h-4 text-cyan-600"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M13 10V3L4 14h7v7l9-11h-7z"
//                   />
//                 </svg>
//               </div>
//               <span className="text-sm text-gray-700">
//                 Manage campaigns and automation
//               </span>
//             </div>
//             <div className="flex items-center space-x-3">
//               <div className="w-8 h-8 bg-sapphire-100 rounded-lg flex items-center justify-center">
//                 <svg
//                   className="w-4 h-4 text-sapphire-600"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
//                   />
//                 </svg>
//               </div>
//               <span className="text-sm text-gray-700">
//                 View analytics and insights
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* Right Side - Login Form */}
//         <div className="lg:w-1/2 bg-white p-6 lg:p-8 flex flex-col justify-center">
//           <div className="mb-6">
//             <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
//             <p className="text-gray-600 text-sm">
//               Enter your credentials to access your account
//             </p>
//           </div>

//           {/* Session notice (e.g., session expired) */}
//           {sessionNotice && (
//             <div
//               className="p-3 rounded-lg mb-4 text-sm font-medium bg-blue-50 text-blue-800 border border-blue-200"
//               role="status"
//               aria-live="polite"
//               data-test-id="session-notice"
//             >
//               {sessionNotice}
//             </div>
//           )}

//           {/* Error from login attempt */}
//           {error && (
//             <div
//               className={`p-3 rounded-lg mb-4 text-sm font-medium ${
//                 isWarning
//                   ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
//                   : "bg-red-50 text-red-700 border border-red-200"
//               }`}
//               role="alert"
//               aria-live="polite"
//               data-test-id="auth-error"
//             >
//               {error}
//             </div>
//           )}

//           <form
//             onSubmit={handleSubmit}
//             className="space-y-4"
//             data-test-id="login-form"
//             aria-busy={loading ? "true" : "false"}
//           >
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
//                 placeholder="Enter your email address"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 required
//                 autoComplete="username email"
//                 name="email"
//                 data-test-id="login-email"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Password
//               </label>
//               <div className="relative">
//                 <input
//                   type={showPassword ? "text" : "password"}
//                   className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
//                   placeholder="Enter your password"
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   required
//                   autoComplete="current-password"
//                   name="password"
//                   data-test-id="login-password"
//                 />
//                 <button
//                   type="button"
//                   className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                   onClick={() => setShowPassword(prev => !prev)}
//                   data-test-id="toggle-password-visibility"
//                   aria-label={showPassword ? "Hide password" : "Show password"}
//                 >
//                   {showPassword ? "🙈" : "👁️"}
//                 </button>
//               </div>
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className={`w-full py-2 px-4 rounded-lg font-medium transition ${
//                 loading
//                   ? "bg-gray-300 text-gray-500 cursor-not-allowed"
//                   : "bg-gradient-to-r from-emerald-600 to-sapphire-600 hover:from-emerald-700 hover:to-sapphire-700 text-white shadow-lg hover:shadow-xl"
//               }`}
//               data-test-id="login-submit"
//             >
//               {loading ? "Signing in..." : "Sign In"}
//             </button>
//           </form>

//           <div className="text-center mt-6 text-sm text-gray-600">
//             Don&apos;t have an account?{" "}
//             <Link
//               to="/signup-for-trial"
//               className="text-sapphire-600 hover:underline font-medium"
//               data-test-id="signup-link"
//             >
//               Start your FREE trial
//             </Link>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // 📄 src/pages/auth/Login.jsx
// import React, { useState } from "react";
// import { useNavigate, Link, useSearchParams } from "react-router-dom";
// import { toast } from "react-toastify";
// import { login } from "./services/authService";
// import { useAuth } from "../../app/providers/AuthProvider";

// function routeForStatus(status = "") {
//   const s = String(status || "").toLowerCase();
//   if (s === "profilepending") return "/app/profile-completion";
//   if (s === "pending" || s === "underreview") return "/pending-approval";
//   if (s === "suspended" || s === "blocked") return "/no-access";
//   return "/app/dashboard";
// }

// export default function Login() {
//   const navigate = useNavigate();
//   const [search] = useSearchParams();
//   const { refreshAuthContext } = useAuth();

//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [showPassword, setShowPassword] = useState(false);

//   const handleSubmit = async e => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       // 1) Server login (stores JWT in localStorage via authService)
//       const res = await login(email, password);

//       // 2) Quiet any transient 401 toast during the immediate refetch
//       try {
//         sessionStorage.setItem("xb_suppress_401_toast", "1");
//         setTimeout(
//           () => sessionStorage.removeItem("xb_suppress_401_toast"),
//           4000
//         );
//       } catch {}

//       // 3) Hydrate AuthProvider (user/business/permissions/features)
//       const ctx = await refreshAuthContext(); // calls /auth/context inside provider
//       const statusFromCtx = ctx?.status || res?.status;

//       // 4) Clear some UI caches
//       try {
//         localStorage.setItem("xb_session_stamp", String(Date.now()));
//         localStorage.removeItem("messaging-pinned");
//         localStorage.removeItem("messaging-archived");
//         localStorage.removeItem("messaging-order");
//       } catch {}

//       // 5) Redirect: prefer ?redirectTo=... if present and safe
//       const candidate = search.get("redirectTo");
//       const next =
//         (candidate && candidate.startsWith("/") && !candidate.startsWith("//")
//           ? candidate
//           : null) || routeForStatus(statusFromCtx);

//       if (next === "/app/profile-completion") {
//         toast.info("🧩 Please complete your profile to continue.");
//       } else if (next === "/pending-approval") {
//         toast.warn("⏳ Your account is pending approval.");
//       } else {
//         toast.success("✅ Login successful");
//       }

//       navigate(next, { replace: true });
//     } catch (err) {
//       const message =
//         err?.response?.data?.message || err?.message || "❌ Login failed.";
//       const lower = String(message).toLowerCase();
//       const isWarning =
//         lower.includes("pending") || lower.includes("under review");

//       (isWarning ? toast.warn : toast.error)(message);
//       setError(message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const isWarning =
//     typeof error === "string" &&
//     (error.toLowerCase().includes("pending") ||
//       error.toLowerCase().includes("under review"));

//   return (
//     <div
//       className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-50 flex items-center justify-center px-4 py-4"
//       data-test-id="login-page"
//     >
//       <div className="flex flex-col lg:flex-row w-full max-w-5xl shadow-2xl rounded-2xl overflow-hidden bg-white">
//         {/* Left Side - Marketing Panel */}
//         <div className="lg:w-1/2 bg-gradient-to-br from-emerald-50 to-cyan-50 p-6 lg:p-8 flex flex-col justify-center">
//           <div className="mb-6">
//             <div className="flex items-center space-x-3">
//               <img
//                 src="/logo/logo.svg"
//                 alt="XploreByte Logo"
//                 className="w-10 h-10 rounded-lg shadow-sm"
//               />
//               <span className="text-2xl font-bold text-gray-900">
//                 XploreByte
//               </span>
//             </div>
//           </div>

//           <div className="mb-6">
//             <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
//               Welcome Back!
//             </h1>
//             <p className="text-gray-600 text-lg">
//               Sign in to continue your WhatsApp Business journey
//             </p>
//           </div>

//           <div className="space-y-3">
//             <div className="flex items-center space-x-3">
//               <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
//                 <svg
//                   className="w-4 h-4 text-emerald-600"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M5 13l4 4L19 7"
//                   />
//                 </svg>
//               </div>
//               <span className="text-sm text-gray-700">
//                 Access your WhatsApp Business API
//               </span>
//             </div>
//             <div className="flex items-center space-x-3">
//               <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
//                 <svg
//                   className="w-4 h-4 text-cyan-600"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M13 10V3L4 14h7v7l9-11h-7z"
//                   />
//                 </svg>
//               </div>
//               <span className="text-sm text-gray-700">
//                 Manage campaigns and automation
//               </span>
//             </div>
//             <div className="flex items-center space-x-3">
//               <div className="w-8 h-8 bg-sapphire-100 rounded-lg flex items-center justify-center">
//                 <svg
//                   className="w-4 h-4 text-sapphire-600"
//                   fill="none"
//                   stroke="currentColor"
//                   viewBox="0 0 24 24"
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
//                   />
//                 </svg>
//               </div>
//               <span className="text-sm text-gray-700">
//                 View analytics and insights
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* Right Side - Login Form */}
//         <div className="lg:w-1/2 bg-white p-6 lg:p-8 flex flex-col justify-center">
//           <div className="mb-6">
//             <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
//             <p className="text-gray-600 text-sm">
//               Enter your credentials to access your account
//             </p>
//           </div>

//           {error && (
//             <div
//               className={`p-3 rounded-lg mb-4 text-sm font-medium ${
//                 isWarning
//                   ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
//                   : "bg-red-50 text-red-700 border border-red-200"
//               }`}
//               role="alert"
//               aria-live="polite"
//               data-test-id="auth-error"
//             >
//               {error}
//             </div>
//           )}

//           <form
//             onSubmit={handleSubmit}
//             className="space-y-4"
//             data-test-id="login-form"
//             aria-busy={loading ? "true" : "false"}
//           >
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Email Address
//               </label>
//               <input
//                 type="email"
//                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
//                 placeholder="Enter your email address"
//                 value={email}
//                 onChange={e => setEmail(e.target.value)}
//                 required
//                 autoComplete="username email"
//                 name="email"
//                 data-test-id="login-email"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Password
//               </label>
//               <div className="relative">
//                 <input
//                   type={showPassword ? "text" : "password"}
//                   className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-sm"
//                   placeholder="Enter your password"
//                   value={password}
//                   onChange={e => setPassword(e.target.value)}
//                   required
//                   autoComplete="current-password"
//                   name="password"
//                   data-test-id="login-password"
//                 />
//                 <button
//                   type="button"
//                   className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
//                   onClick={() => setShowPassword(prev => !prev)}
//                   data-test-id="toggle-password-visibility"
//                   aria-label={showPassword ? "Hide password" : "Show password"}
//                 >
//                   {showPassword ? "🙈" : "👁️"}
//                 </button>
//               </div>
//             </div>

//             <button
//               type="submit"
//               disabled={loading}
//               className={`w-full py-2 px-4 rounded-lg font-medium transition ${
//                 loading
//                   ? "bg-gray-300 text-gray-500 cursor-not-allowed"
//                   : "bg-gradient-to-r from-emerald-600 to-sapphire-600 hover:from-emerald-700 hover:to-sapphire-700 text-white shadow-lg hover:shadow-xl"
//               }`}
//               data-test-id="login-submit"
//             >
//               {loading ? "Signing in..." : "Sign In"}
//             </button>
//           </form>

//           <div className="text-center mt-6 text-sm text-gray-600">
//             Don&apos;t have an account?{" "}
//             <Link
//               to="/signup-for-trial"
//               className="text-sapphire-600 hover:underline font-medium"
//               data-test-id="signup-link"
//             >
//               Start your FREE trial
//             </Link>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
