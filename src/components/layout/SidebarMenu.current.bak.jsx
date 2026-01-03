// 📄 src/components/layout/SidebarMenu.jsx
import { NavLink } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  UsersRound,
  Megaphone,
  Package,
  Inbox,
  ShieldCheck,
  Settings2,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Bot,
  ChartArea,
} from "lucide-react";
import { WORKSPACE_PERMS } from "../../capabilities/workspacePerms";

export default function SidebarMenu({ collapsed, setCollapsed }) {
  const {
    role,
    isLoading,
    availableFeatures = {}, // { Dashboard:true, Messaging:true, ... } (legacy flags)
    can, // (permCode) => boolean  ✅ entitlements-aware
    hasAllAccess, // true if "*" or super on server
    entLoading, // ✅ loading state for entitlements snapshot
  } = useAuth();

  if (isLoading) return null;

  const safeRole = String(role || "").toLowerCase();
  const isSuper = safeRole === "superadmin";
  const superAccess = isSuper || !!hasAllAccess;
  const iconSize = collapsed ? 22 : 18;

  // ---------- helpers ----------
  const hasFeature = key => !!availableFeatures[key];

  const anyPerm = (codes = []) =>
    superAccess
      ? true
      : codes.some(c => (typeof can === "function" ? can(c) : false));

  // Workspaces – make superAccess always show
  // const showDashboard = superAccess || hasFeature("Dashboard");
  const showDashboard = true;

  const showSuperAdmin =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.superadmin || []));

  // ✅ Messaging workspace – now using shared WORKSPACE_PERMS
  const showMessaging =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.messaging || []));

  // ✅ Campaigns workspace – same shared source
  const showCampaigns =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.campaigns || []));

  // ✅ Automation workspace – same shared source
  const showAutomation =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.automation || []));

  // ✅ TemplateBuilder workspace – same shared source
  const showTemplateBuilder =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.templates || []));

  // ✅ catalog workspace – same shared source
  const showCatalog =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.catalog || []));

  // ✅ catalog workspace – same shared source
  const showCRM =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.crm || []));

  // ✅ catalog workspace – same shared source
  const showInbox =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.inbox || []));

  const showSettings =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.settings || []));

  // ✅ Settings workspace: show if user has settings.* or whatsappsettings, or a Settings feature flag

  const sections = [
    {
      title: "Workspaces",
      items: [
        {
          label: "Dashboard",
          short: "Dashboard",
          path: "/app/welcomepage",
          icon: <ChartArea size={iconSize} />,
          show: showDashboard,
        },
        {
          label: "CRM",
          short: "CRM",
          path: "/app/crm",
          icon: <UsersRound size={iconSize} />,
          show: showCRM,
        },
        {
          label: "Campaigns",
          short: "Campaigns",
          path: "/app/campaigns",
          icon: <Megaphone size={iconSize} />,
          show: showCampaigns,
        },
        {
          label: "Catalog",
          short: "Catalog",
          path: "/app/catalog",
          icon: <Package size={iconSize} />,
          show: showCatalog,
        },
        {
          label: "Message",
          short: "Messaging",
          path: "/app/messaging",
          icon: <MessageSquare size={iconSize} />,
          show: showMessaging, // ✅ now truly tied to plan grants
        },
        {
          label: "Template Builder",
          short: "Template",
          path: "/app/templatebuilder",
          icon: <Bot size={iconSize} />,
          show: showTemplateBuilder,
        },
        {
          label: "Automation",
          short: "Automation",
          path: "/app/automation",
          icon: <Bot size={iconSize} />,
          show: showAutomation,
        },
        {
          label: "Inbox",
          short: "Inbox",
          path: "/app/inbox",
          icon: <Inbox size={iconSize} />,
          show: showInbox,
        },
        {
          label: "Admin",
          short: "Admin",
          path: "/app/admin",
          icon: <ShieldCheck size={iconSize} />,
          show: showSuperAdmin,
        },
      ],
    },

    {
      title: "My Account",
      items: [
        {
          label: "Settings",
          short: "Settings",
          path: "/app/settings",
          icon: <Settings2 size={iconSize} />,
          show: showSettings,
        },
      ],
    },
  ];

  return (
    <aside
      className={`${
        collapsed
          ? "w-20 bg-gradient-to-r from-emerald-50 to-cyan-50"
          : "w-64 bg-gradient-to-r from-emerald-50 to-cyan-50"
      } shadow-lg border-r border-gray-200 flex flex-col transition-all duration-300 h-screen`}
    >
      <div className="p-4 flex items-center justify-center">
        {collapsed ? (
          <img
            src="/logo/logo.svg"
            alt="XploreByte Logo"
            className="h-10 w-10"
          />
        ) : (
          <div className="flex items-center gap-3">
            <img
              src="/logo/logo.svg"
              alt="XploreByte Logo"
              className="h-10 w-10"
            />
            <div>
              <h1 className="text-lg font-bold text-gray-900">XploreByte</h1>
              <p className="text-xs text-emerald-600 font-medium">
                WhatsApp Platform
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        <nav>
          {sections.map(section => {
            const visibleItems = section.items.filter(i => i.show);
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title} className="mb-4">
                {!collapsed && (
                  <div className="text-xs font-semibold text-emerald-600 px-4 mb-2 uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                <ul className={`space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
                  {visibleItems.map(item => (
                    <li key={item.path}>
                      <NavLink
                        to={item.path}
                        className={({ isActive }) =>
                          `flex items-center ${
                            collapsed ? "justify-center" : "gap-3"
                          } px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            isActive
                              ? "bg-gradient-to-r from-emerald-100 to-cyan-100 text-emerald-800 border-l-4 border-emerald-500 shadow-md hover:from-emerald-200 hover:to-cyan-200"
                              : collapsed
                              ? "text-black hover:bg-gradient-to-r hover:from-emerald-100 hover:to-cyan-100 hover:text-emerald-800 hover:shadow-sm"
                              : "text-black hover:bg-gradient-to-r hover:from-emerald-100 hover:to-cyan-100 hover:text-emerald-800 hover:shadow-sm"
                          }`
                        }
                      >
                        <div
                          className="flex flex-col items-center"
                          title={collapsed ? item.label : undefined}
                        >
                          <span className="text-emerald-600">{item.icon}</span>
                          {collapsed && (
                            <span className="text-[10px] text-emerald-700 mt-1 leading-tight font-medium">
                              {item.short}
                            </span>
                          )}
                        </div>
                        {!collapsed && (
                          <div className="flex justify-between items-center w-full pr-2">
                            <span>{item.label}</span>
                          </div>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </nav>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-3 mb-2 mt-auto flex items-center justify-center gap-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 text-sm font-medium transition-all duration-200 rounded-lg py-2"
      >
        {collapsed ? (
          <ChevronRight size={18} className="text-emerald-600" />
        ) : (
          <>
            <ChevronLeft size={18} className="text-emerald-600" />
            <span className="text-sm">Minimise</span>
          </>
        )}
      </button>

      <div className="text-center text-xs text-emerald-500 border-t border-emerald-100 p-3">
        {!collapsed && "Powered by XploreByte"}
      </div>
    </aside>
  );
}

// // 📄 src/components/layout/SidebarMenu.jsx
// import { NavLink } from "react-router-dom";
// import { useAuth } from "../../app/providers/AuthProvider";
// import {
//   UsersRound,
//   Megaphone,
//   Package,
//   Inbox,
//   ShieldCheck,
//   Settings2,
//   ChevronLeft,
//   ChevronRight,
//   MessageSquare,
//   Bot,
//   ChartArea,
// } from "lucide-react";
// import { WORKSPACE_PERMS } from "../../capabilities/workspacePerms";

// export default function SidebarMenu({ collapsed, setCollapsed }) {
//   const {
//     role,
//     isLoading,
//     availableFeatures = {},
//     can,
//     hasAllAccess,
//     entLoading,
//   } = useAuth();

//   if (isLoading) return null;

//   const safeRole = String(role || "").toLowerCase();
//   const isSuper = safeRole === "superadmin";
//   const superAccess = isSuper || !!hasAllAccess;
//   // Adjusted icon size for better proportion
//   const iconSize = collapsed ? 20 : 18;

//   // ---------- helpers ----------
//   const anyPerm = (codes = []) =>
//     superAccess
//       ? true
//       : codes.some(c => (typeof can === "function" ? can(c) : false));

//   // Feature Flags
//   const showDashboard = true;
//   const showSuperAdmin =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.superadmin || []));
//   const showMessaging =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.messaging || []));
//   const showCampaigns =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.campaigns || []));
//   const showAutomation =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.automation || []));
//   const showTemplateBuilder =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.templates || []));
//   const showCatalog =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.catalog || []));
//   const showCRM =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.crm || []));
//   const showInbox =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.inbox || []));
//   const showSettings =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.settings || []));

//   const sections = [
//     {
//       title: "Workspaces",
//       items: [
//         {
//           label: "Dashboard",
//           short: "Dash",
//           path: "/app/welcomepage",
//           icon: <ChartArea size={iconSize} />,
//           show: showDashboard,
//         },
//         {
//           label: "CRM Customers",
//           short: "CRM",
//           path: "/app/crm",
//           icon: <UsersRound size={iconSize} />,
//           show: showCRM,
//         },
//         {
//           label: "Campaigns",
//           short: "B'cast",
//           path: "/app/campaigns",
//           icon: <Megaphone size={iconSize} />,
//           show: showCampaigns,
//         },
//         {
//           label: "Catalog",
//           short: "Catalog",
//           path: "/app/catalog",
//           icon: <Package size={iconSize} />,
//           show: showCatalog,
//         },
//         {
//           label: "Team Inbox",
//           short: "Inbox",
//           path: "/app/inbox",
//           icon: <Inbox size={iconSize} />,
//           show: showInbox,
//         },
//         {
//           label: "Live Chat",
//           short: "Chat",
//           path: "/app/messaging",
//           icon: <MessageSquare size={iconSize} />,
//           show: showMessaging,
//         },
//         {
//           label: "Template Builder",
//           short: "Templ",
//           path: "/app/templatebuilder",
//           icon: <Bot size={iconSize} />,
//           show: showTemplateBuilder,
//         },
//         {
//           label: "Automation Flow",
//           short: "Flow",
//           path: "/app/automation",
//           icon: <Bot size={iconSize} />,
//           show: showAutomation,
//         },
//         {
//           label: "Administration",
//           short: "Admin",
//           path: "/app/admin",
//           icon: <ShieldCheck size={iconSize} />,
//           show: showSuperAdmin,
//         },
//       ],
//     },
//     {
//       title: "System",
//       items: [
//         {
//           label: "Settings",
//           short: "Config",
//           path: "/app/settings",
//           icon: <Settings2 size={iconSize} />,
//           show: showSettings,
//         },
//       ],
//     },
//   ];

//   return (
//     <aside
//       className={`${
//         collapsed ? "w-[88px]" : "w-[260px]"
//       } bg-[#f8f9fa] border-r border-gray-200/80 flex flex-col transition-all duration-300 h-screen shadow-xl shadow-gray-200/40 relative overflow-hidden`}
//     >
//       {/* --- CREATIVE BACKGROUND LAYER: Subtle Dot Pattern --- */}
//       {/* This adds texture without noise. It looks very premium. */}
//       <div
//         className="absolute inset-0 z-0 pointer-events-none opacity-40"
//         style={{
//           backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
//           backgroundSize: "24px 24px",
//         }}
//       ></div>

//       {/* --- HEADER --- */}
//       <div className="relative z-10 h-20 flex items-center justify-center border-b border-gray-200/60 bg-[#f8f9fa]/80 backdrop-blur-sm">
//         <div
//           className={`flex items-center gap-3 transition-all duration-300 ${
//             collapsed ? "justify-center" : "w-full px-6"
//           }`}
//         >
//           {/* Logo with slight glow */}
//           <div className="relative group">
//             <div className="absolute -inset-2 bg-emerald-500/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
//             <img
//               src="/logo/logo.svg"
//               alt="Logo"
//               className="relative h-9 w-9 object-contain"
//             />
//           </div>

//           {!collapsed && (
//             <div className="flex flex-col">
//               <h1 className="text-gray-800 font-bold text-lg leading-tight tracking-tight">
//                 XploreByte
//               </h1>
//               <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-widest">
//                 Platform
//               </span>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* --- NAVIGATION --- */}
//       <div className="flex-1 overflow-y-auto relative z-10 py-6 custom-scrollbar">
//         <nav className="space-y-6">
//           {sections.map(section => {
//             const visibleItems = section.items.filter(i => i.show);
//             if (visibleItems.length === 0) return null;

//             return (
//               <div key={section.title}>
//                 {/* Section Title */}
//                 {!collapsed && (
//                   <div className="px-6 mb-3 flex items-center">
//                     <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
//                       {section.title}
//                     </span>
//                     <div className="ml-3 h-[1px] flex-1 bg-gray-200"></div>
//                   </div>
//                 )}
//                 {/* Divider for collapsed */}
//                 {collapsed && (
//                   <div className="w-8 mx-auto h-[1px] bg-gray-200 my-4" />
//                 )}

//                 <ul className="space-y-1 px-3">
//                   {visibleItems.map(item => (
//                     <li key={item.path}>
//                       <NavLink
//                         to={item.path}
//                         className={({ isActive }) => {
//                           // Base classes
//                           const base =
//                             "relative flex items-center rounded-xl transition-all duration-200 group overflow-hidden";
//                           const layout = collapsed
//                             ? "flex-col justify-center h-14 w-14 mx-auto"
//                             : "px-4 py-3 w-full gap-3";

//                           // Active State (Official WhatsApp Green #00a884)
//                           if (isActive) {
//                             return `${base} ${layout} bg-[#00a884] text-white shadow-lg shadow-emerald-500/30 translate-x-1`;
//                           }
//                           // Inactive State
//                           return `${base} ${layout} text-slate-600 hover:bg-white hover:text-emerald-700 hover:shadow-md hover:shadow-gray-200/50 hover:border-gray-100 border border-transparent`;
//                         }}
//                       >
//                         {({ isActive }) => (
//                           <>
//                             {/* Icon */}
//                             <span
//                               className={`relative z-10 transition-transform duration-300 ${
//                                 isActive ? "scale-110" : "group-hover:scale-110"
//                               }`}
//                             >
//                               {item.icon}
//                             </span>

//                             {/* Label (Expanded) */}
//                             {!collapsed && (
//                               <span
//                                 className={`text-[14px] font-medium tracking-wide relative z-10 ${
//                                   isActive ? "font-semibold" : ""
//                                 }`}
//                               >
//                                 {item.label}
//                               </span>
//                             )}

//                             {/* Label (Collapsed - Small text below icon) */}
//                             {collapsed && (
//                               <span
//                                 className={`text-[9px] mt-1 font-medium truncate max-w-full ${
//                                   isActive
//                                     ? "text-emerald-50"
//                                     : "text-slate-400 group-hover:text-emerald-600"
//                                 }`}
//                               >
//                                 {item.short}
//                               </span>
//                             )}

//                             {/* Active Indicator (Right Edge) - Optional Polish */}
//                             {!collapsed && isActive && (
//                               <div className="absolute right-2 w-1.5 h-1.5 bg-white rounded-full opacity-50"></div>
//                             )}
//                           </>
//                         )}
//                       </NavLink>
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             );
//           })}
//         </nav>
//       </div>

//       {/* --- FOOTER --- */}
//       <div className="p-4 border-t border-gray-200 bg-[#f8f9fa] relative z-20">
//         <button
//           onClick={() => setCollapsed(!collapsed)}
//           className={`w-full flex items-center ${
//             collapsed ? "justify-center" : "justify-between px-3"
//           } py-2.5 rounded-xl border border-gray-200 bg-white hover:border-emerald-200 hover:text-emerald-600 text-gray-500 shadow-sm hover:shadow transition-all duration-200 group`}
//         >
//           {!collapsed && (
//             <span className="text-xs font-bold uppercase tracking-wider">
//               Collapse
//             </span>
//           )}

//           <div
//             className={`transition-transform duration-300 ${
//               !collapsed ? "rotate-0" : "rotate-180"
//             }`}
//           >
//             {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
//           </div>
//         </button>

//         {/* Footer Branding */}
//         {!collapsed && (
//           <div className="mt-4 flex flex-col items-center">
//             <div className="text-[10px] text-gray-400 font-medium">
//               Powered by
//             </div>
//             <div className="text-xs font-bold text-gray-800 tracking-tight">
//               XploreByte
//             </div>
//           </div>
//         )}
//       </div>
//     </aside>
//   );
// }
