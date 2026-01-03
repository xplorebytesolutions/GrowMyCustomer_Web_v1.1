import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import UserMenuDropdown from "../common/UserMenuDropdown";
import { useAuth } from "../../app/providers/AuthProvider";
import { usePlan } from "../../pages/auth/hooks/usePlan";

const ROLE_LABELS = {
  superadmin: "Super Admin",
  partner: "Business Partner",
  reseller: "Reseller Partner",
  business: "Business",
  staff: "Staff",
};
const ROLE_STYLES = {
  superadmin: "bg-red-50 text-red-700 border border-red-200",
  partner: "bg-sapphire-50 text-sapphire-700 border border-sapphire-200",
  reseller: "bg-cyan-50 text-cyan-700 border border-cyan-200",
  business: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  staff: "bg-gray-50 text-gray-700 border border-gray-200",
  default: "bg-gray-100 text-gray-600 border border-gray-200",
};

export default function Topbar() {
  const navigate = useNavigate();
  const { userName, role } = useAuth();
  const { plan, planId, loading: planLoading, error: planError } = usePlan();

  const roleKey = (role || "").toLowerCase();
  const roleLabel = ROLE_LABELS[roleKey] || roleKey || "Unknown";
  const roleClass = ROLE_STYLES[roleKey] || ROLE_STYLES.default;

  // Roles that do NOT require a plan
  const isAdminRole =
    roleKey === "superadmin" ||
    roleKey === "admin" ||
    roleKey === "partner" ||
    roleKey === "reseller";

  // Only enforce plan presence for business/staff (or any non-admin)
  const planRelevant = !isAdminRole;

  // ── Plan state derivation ──────────────────────────────────────────────
  // "Visible" plan = actual customer-facing plan we know by id + name
  const hasVisiblePlan = planRelevant && !planLoading && !!planId && !!plan;

  // "Free setup mode" = no exposed plan (internal/default plan on backend side)
  const isFreeSetup =
    planRelevant && !planLoading && !planId && !plan && !planError;

  // "Error" = something went wrong while resolving plan (e.g., API error)
  const hasPlanError =
    planRelevant && !planLoading && !!planError && !hasVisiblePlan;

  // This is the old "planMissing", now restricted to *real* error states only
  const planMissing = hasPlanError;

  // Upgrade button:
  // - show for relevant roles
  // - when we either have a visible plan OR we are in free setup mode
  const showUpgrade =
    planRelevant && !planLoading && (hasVisiblePlan || isFreeSetup);

  // Tooltip: plan info only for relevant roles
  const badgeTitle = planRelevant
    ? `Role: ${roleLabel}` +
      (planLoading
        ? " • Plan: loading…"
        : hasVisiblePlan
        ? ` • Plan: ${plan}`
        : isFreeSetup
        ? " • Plan: Free setup mode (no paid plan yet)"
        : hasPlanError
        ? " • Plan: Error loading plan"
        : "")
    : `Role: ${roleLabel}`;

  // Console note only when there is an actual error, not in free mode
  if (hasPlanError && typeof window !== "undefined") {
    // eslint-disable-next-line no-console
    console.warn("[Topbar] Plan load error for current user.", {
      planId,
      planError,
      role: roleKey,
      userName,
    });
  }

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="pl-2 lg:pl-4 pr-4 lg:pr-8 py-[9px]">
        <div className="flex items-center justify-between gap-6">
          {/* Left Side - Brand */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate("/app/welcomepage")}
              className="flex items-center gap-4 hover:opacity-90 transition-all duration-300 group"
              title="GrowMyCustomer"
            >
              <img 
                src="/new_logo_gmc.png" 
                alt="GrowMyCustomer" 
                className="h-12 w-auto transition-transform duration-300 group-hover:scale-105 object-contain" 
              />
            </button>
          </div>

          {/* Visual Separator */}
          <div className="hidden lg:block h-8 w-px bg-gray-200 flex-shrink-0" />

          {/* Right Side - User Info & Actions */}
          <div className="flex items-center gap-4 ml-auto">
            {/* User Info */}
            <div className="hidden md:flex items-center gap-4">
              <div className="text-right">
                {/* Static welcome line */}
                <div className="text-xs text-gray-600">Welcome</div>
                {/* User name */}
                <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                  {userName || "User"}
                </div>
              </div>


              {/* Role Badge (always shows admin / reseller / etc.) */}
              <div
                className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium ${roleClass} shadow-sm`}
                title={badgeTitle}
                aria-label={badgeTitle}
              >
                {roleLabel}
              </div>

              {/* Plan / mode badges */}
              {/* Free setup mode badge (no paid plan yet, but not an error) */}
              {planRelevant && !planLoading && isFreeSetup && (
                <div
                  className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200 shadow-sm"
                  title="You are in free setup mode. WhatsApp can be connected before choosing a paid plan."
                  aria-label="Free setup mode"
                >
                  Free setup mode
                </div>
              )}

              {/* Error badge only if there was a real problem loading plan */}
              {planRelevant && !planLoading && hasPlanError && (
                <div
                  className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 border border-red-200 shadow-sm"
                  title="There was an error loading your plan. Please contact support."
                  aria-label="Plan error"
                >
                  Plan Error
                </div>
              )}
            </div>

            {/* Notifications */}
            <button
              title="Notifications"
              className="relative p-2.5 rounded-lg text-gray-600 hover:text-sapphire-600 hover:bg-sapphire-50 transition-all duration-200 group"
            >
              <Bell size={20} />
              {/* Enhanced Notification dot with ping animation */}
              <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            </button>

            {/* Upgrade Button */}
            {showUpgrade && (
              <button
                onClick={() => navigate("/app/settings/billing")}
                className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 text-white text-sm font-semibold px-4 py-1.5 rounded-lg shadow-md hover:shadow-lg hover:scale-105 transition-all duration-300 ring-2 ring-emerald-200 ring-offset-1"
                title="Upgrade your plan"
              >
                Upgrade Plan
              </button>
            )}

            {/* User Menu */}
            <UserMenuDropdown />
          </div>
        </div>
      </div>
    </header>
  );
}

// import { Menu, Bell, ChevronRight } from "lucide-react";
// import { useNavigate, useLocation } from "react-router-dom";
// import UserMenuDropdown from "../common/UserMenuDropdown";
// import { useAuth } from "../../app/providers/AuthProvider";
// import { usePlan } from "../../pages/auth/hooks/usePlan";
// import { getBreadcrumbs } from "../../utils/breadcrumbUtils";

// const ROLE_LABELS = {
//   superadmin: "Super Admin",
//   partner: "Business Partner",
//   reseller: "Reseller Partner",
//   business: "Business",
//   staff: "Staff",
// };
// const ROLE_STYLES = {
//   superadmin: "bg-red-50 text-red-700 border border-red-200",
//   partner: "bg-sapphire-50 text-sapphire-700 border border-sapphire-200",
//   reseller: "bg-cyan-50 text-cyan-700 border border-cyan-200",
//   business: "bg-emerald-50 text-emerald-700 border border-emerald-200",
//   staff: "bg-gray-50 text-gray-700 border border-gray-200",
//   default: "bg-gray-100 text-gray-600 border border-gray-200",
// };

// export default function Topbar({ collapsed, setCollapsed }) {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { userName, role } = useAuth();
//   const { plan, planId, loading: planLoading, error: planError } = usePlan();

//   const breadcrumbs = getBreadcrumbs(location.pathname);

//   const roleKey = (role || "").toLowerCase();
//   const roleLabel = ROLE_LABELS[roleKey] || roleKey || "Unknown";
//   const roleClass = ROLE_STYLES[roleKey] || ROLE_STYLES.default;

//   // Roles that do NOT require a plan
//   const isAdminRole =
//     roleKey === "superadmin" ||
//     roleKey === "admin" ||
//     roleKey === "partner" ||
//     roleKey === "reseller";

//   // Only enforce plan presence for business/staff (or any non-admin)
//   const planRelevant = !isAdminRole;

//   // Missing only matters for relevant roles
//   const planMissing = planRelevant && !planLoading && (!planId || !plan);

//   // Upgrade button only for relevant roles with a known 'basic' plan
//   const showUpgrade =
//     planRelevant && !planLoading && !planMissing && plan === "basic";

//   // Tooltip: only mention plan for relevant roles
//   const badgeTitle = planRelevant
//     ? `Role: ${roleLabel}` +
//       (planLoading
//         ? " • Plan: loading…"
//         : planMissing
//         ? " • Plan: MISSING"
//         : ` • Plan: ${plan}`)
//     : `Role: ${roleLabel}`;

//   // Optional console note only when relevant
//   if (planRelevant && planMissing && typeof window !== "undefined") {
//     // eslint-disable-next-line no-console
//     console.warn("[Topbar] Plan is missing for current user.", {
//       planId,
//       planError,
//       role: roleKey,
//       userName,
//     });
//   }

//   return (
//     <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
//       <div className="px-4 lg:px-6 py-3">
//         <div className="flex items-center justify-between">
//           {/* Left Side - Menu Button & Breadcrumb */}
//           <div className="flex items-center gap-4">
//             <button
//               onClick={() => setCollapsed(prev => !prev)}
//               className="p-2 rounded-lg text-gray-600 hover:text-sapphire-600 hover:bg-sapphire-50 transition-all duration-200"
//               title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
//             >
//               <Menu size={20} />
//             </button>

//             {/* Breadcrumb Navigation */}
//             <nav className="hidden md:flex items-center space-x-2 text-sm">
//               {breadcrumbs.map((breadcrumb, index) => (
//                 <div key={index} className="flex items-center space-x-2">
//                   {index > 0 && (
//                     <ChevronRight size={14} className="text-emerald-400" />
//                   )}
//                   <button
//                     onClick={() => navigate(breadcrumb.path)}
//                     className={`transition-colors hover:text-emerald-600 ${
//                       breadcrumb.isActive
//                         ? "text-emerald-600 font-medium"
//                         : "text-emerald-500 hover:text-emerald-600"
//                     }`}
//                   >
//                     {breadcrumb.label}
//                   </button>
//                 </div>
//               ))}
//             </nav>
//           </div>

//           {/* Right Side - User Info & Actions */}
//           <div className="flex items-center gap-3">
//             {/* User Info */}
//             <div className="hidden md:flex items-center gap-3">
//               <div className="text-right">
//                 {/* Static welcome line */}
//                 <div className="text-xs text-gray-500">Welcome</div>
//                 {/* User name */}
//                 <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
//                   {userName || "User"}
//                 </div>
//               </div>

//               {/* Role Badge (keeps showing admin / reseller / etc.) */}
//               <div
//                 className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${roleClass}`}
//                 title={badgeTitle}
//                 aria-label={badgeTitle}
//               >
//                 {roleLabel}
//               </div>

//               {/* Plan Missing Badge */}
//               {planRelevant && !planLoading && planMissing && (
//                 <div
//                   className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200"
//                   title="Plan is missing for this user. Please assign a plan."
//                   aria-label="Plan is missing for this user. Please assign a plan."
//                 >
//                   Plan Missing
//                 </div>
//               )}
//             </div>

//             {/* Notifications */}
//             <button
//               title="Notifications"
//               className="p-2 rounded-lg text-gray-600 hover:text-sapphire-600 hover:bg-sapphire-50 transition-all duration-200 relative"
//             >
//               <Bell size={20} />
//               {/* Notification dot */}
//               <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
//             </button>

//             {/* Upgrade Button */}
//             {showUpgrade && (
//               <button
//                 onClick={() => navigate("/app/upgrade")}
//                 className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md transition-all duration-200"
//                 title="Upgrade your plan"
//               >
//                 <span className="text-xs">🚀</span>
//                 Upgrade Plan
//               </button>
//             )}

//             {/* User Menu */}
//             <UserMenuDropdown />
//           </div>
//         </div>
//       </div>
//     </header>
//   );
// }

// import { Menu, Bell, ChevronRight } from "lucide-react";
// import { useNavigate, useLocation } from "react-router-dom";
// import UserMenuDropdown from "../common/UserMenuDropdown";
// import { useAuth } from "../../app/providers/AuthProvider";
// import { usePlan } from "../../pages/auth/hooks/usePlan";
// import { getBreadcrumbs } from "../../utils/breadcrumbUtils";

// const ROLE_LABELS = {
//   superadmin: "Super Admin",
//   partner: "Business Partner",
//   reseller: "Reseller Partner",
//   business: "Business Owner",
//   staff: "Staff",
// };
// const ROLE_STYLES = {
//   superadmin: "bg-red-50 text-red-700 border border-red-200",
//   partner: "bg-sapphire-50 text-sapphire-700 border border-sapphire-200",
//   reseller: "bg-cyan-50 text-cyan-700 border border-cyan-200",
//   business: "bg-emerald-50 text-emerald-700 border border-emerald-200",
//   staff: "bg-gray-50 text-gray-700 border border-gray-200",
//   default: "bg-gray-100 text-gray-600 border border-gray-200",
// };

// export default function Topbar({ collapsed, setCollapsed }) {
//   const navigate = useNavigate();
//   const location = useLocation();
//   const { userName, role } = useAuth();
//   const { plan, planId, loading: planLoading, error: planError } = usePlan();

//   const breadcrumbs = getBreadcrumbs(location.pathname);

//   const roleKey = (role || "").toLowerCase();
//   const roleLabel = ROLE_LABELS[roleKey] || roleKey || "Unknown";
//   const roleClass = ROLE_STYLES[roleKey] || ROLE_STYLES.default;

//   // Roles that do NOT require a plan
//   const isAdminRole =
//     roleKey === "superadmin" ||
//     roleKey === "admin" ||
//     roleKey === "partner" ||
//     roleKey === "reseller";

//   // Only enforce plan presence for business/staff (or any non-admin)
//   const planRelevant = !isAdminRole;

//   // Missing only matters for relevant roles
//   const planMissing = planRelevant && !planLoading && (!planId || !plan);

//   // Upgrade button only for relevant roles with a known 'basic' plan
//   const showUpgrade =
//     planRelevant && !planLoading && !planMissing && plan === "basic";

//   // Tooltip: only mention plan for relevant roles
//   const badgeTitle = planRelevant
//     ? `Role: ${roleLabel}` +
//       (planLoading
//         ? " • Plan: loading…"
//         : planMissing
//         ? " • Plan: MISSING"
//         : ` • Plan: ${plan}`)
//     : `Role: ${roleLabel}`;

//   // Optional console note only when relevant
//   if (planRelevant && planMissing && typeof window !== "undefined") {
//     // eslint-disable-next-line no-console
//     console.warn("[Topbar] Plan is missing for current user.", {
//       planId,
//       planError,
//       role: roleKey,
//       userName,
//     });
//   }

//   return (
//     <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
//       <div className="px-4 lg:px-6 py-3">
//         <div className="flex items-center justify-between">
//           {/* Left Side - Menu Button & Breadcrumb */}
//           <div className="flex items-center gap-4">
//             <button
//               onClick={() => setCollapsed(prev => !prev)}
//               className="p-2 rounded-lg text-gray-600 hover:text-sapphire-600 hover:bg-sapphire-50 transition-all duration-200"
//               title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
//             >
//               <Menu size={20} />
//             </button>

//             {/* Breadcrumb Navigation */}
//             <nav className="hidden md:flex items-center space-x-2 text-sm">
//               {breadcrumbs.map((breadcrumb, index) => (
//                 <div key={index} className="flex items-center space-x-2">
//                   {index > 0 && (
//                     <ChevronRight size={14} className="text-emerald-400" />
//                   )}
//                   <button
//                     onClick={() => navigate(breadcrumb.path)}
//                     className={`transition-colors hover:text-emerald-600 ${
//                       breadcrumb.isActive
//                         ? "text-emerald-600 font-medium"
//                         : "text-emerald-500 hover:text-emerald-600"
//                     }`}
//                   >
//                     {breadcrumb.label}
//                   </button>
//                 </div>
//               ))}
//             </nav>
//           </div>

//           {/* Right Side - User Info & Actions */}
//           <div className="flex items-center gap-3">
//             {/* User Info */}
//             <div className="hidden md:flex items-center gap-3">
//               <div className="text-right">
//                 <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
//                   {userName || "User"}
//                 </div>
//                 <div className="text-xs text-gray-500">{roleLabel}</div>
//               </div>

//               {/* Role Badge */}
//               <div
//                 className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${roleClass}`}
//                 title={badgeTitle}
//                 aria-label={badgeTitle}
//               >
//                 {roleLabel}
//               </div>

//               {/* Plan Missing Badge */}
//               {planRelevant && !planLoading && planMissing && (
//                 <div
//                   className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200"
//                   title="Plan is missing for this user. Please assign a plan."
//                   aria-label="Plan is missing for this user. Please assign a plan."
//                 >
//                   Plan Missing
//                 </div>
//               )}
//             </div>

//             {/* Notifications */}
//             <button
//               title="Notifications"
//               className="p-2 rounded-lg text-gray-600 hover:text-sapphire-600 hover:bg-sapphire-50 transition-all duration-200 relative"
//             >
//               <Bell size={20} />
//               {/* Notification dot */}
//               <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
//             </button>

//             {/* Upgrade Button */}
//             {showUpgrade && (
//               <button
//                 onClick={() => navigate("/app/upgrade")}
//                 className="hidden sm:inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-sm hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md transition-all duration-200"
//                 title="Upgrade your plan"
//               >
//                 <span className="text-xs">🚀</span>
//                 Upgrade Plan
//               </button>
//             )}

//             {/* User Menu */}
//             <UserMenuDropdown />
//           </div>
//         </div>
//       </div>
//     </header>
//   );
// }
