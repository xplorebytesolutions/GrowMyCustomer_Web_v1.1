// 📄 src/components/layout/SidebarMenu.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";
import {
  UsersRound,
  Megaphone,
  Package,
  Inbox,
  ShieldCheck,
  Settings2,
  Phone,
  Palette,
  Globe,
  UserCog,
  CreditCard,
  KeyRound,
  MessageSquare,
  Bot,
  ChartArea,
  PlusCircle,
  FileBarChart,
  MessageSquareText,
  Tags,
  BellRing,
  Clock4,
  StickyNote,
  ShoppingCart,
  BarChart2,
  Zap,
  Send,
  FileText,
  FileCode2,
  BarChart3,
  ArrowLeftToLine,
  Lock,
  SlidersHorizontal,
} from "lucide-react";
import { WORKSPACE_PERMS } from "../../capabilities/workspacePerms";
import { FK } from "../../capabilities/featureKeys";
import { requestUpgrade } from "../../utils/upgradeBus";

export default function SidebarMenu() {
  const location = useLocation();
  const railRef = useRef(null);
  const flyoutRef = useRef(null);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [flyoutKey, setFlyoutKey] = useState(null);
  const [isHoveringFlyout, setIsHoveringFlyout] = useState(false);
  const [isHoveringRail, setIsHoveringRail] = useState(false);
  const { role, isLoading, can, hasAllAccess, entLoading, planId } = useAuth();

  const safeRole = String(role || "").toLowerCase();
  const isSuper = safeRole === "superadmin";
  const superAccess = isSuper || !!hasAllAccess;

  const iconSize = 20;

  const anyPerm = (codes = []) =>
    superAccess
      ? true
      : codes.some(c => (typeof can === "function" ? can(c) : false));

  const showDashboard = true;

  const showSuperAdmin =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.superadmin || []));
  const showMessaging =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.messaging || []));
  const showCampaigns =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.campaigns || []));
  const showAutomation =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.automation || []));
  const showTemplateBuilder =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.templates || []));
  const showCatalog =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.catalog || []));
  const showCRM =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.crm || []));
  const showInbox =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.inbox || []));
  const showSettings =
    superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.settings || []));

  // ✅ Badge support (wire real count later)
  const inboxUnreadCount = (() => {
    try {
      const raw = window.localStorage.getItem("xb_inbox_unread");
      const n = Number(raw);
      return Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 0;
    } catch {
      return 0;
    }
  })();

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
          label: "Messaging",
          short: "Messaging",
          path: "/app/messaging",
          icon: <MessageSquare size={iconSize} />,
          show: showMessaging,
        },
        {
          label: "Templates",
          short: "Templates",
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
          badgeCount: inboxUnreadCount,
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

  const visibleSections = sections
    .map(s => ({
      ...s,
      items: s.items.filter(i => i.show),
    }))
    .filter(s => s.items.length > 0);

  const activeKey = (() => {
    const p = String(location?.pathname || "");
    const seg = p.split("/")[2] || "";
    if (seg === "template-builder") return "templatebuilder";
    if (seg === "cta-flow") return "automation";
    return seg;
  })();

  const isFeatureAllowed = featureKey => {
    if (
      !featureKey ||
      (Array.isArray(featureKey) && featureKey.filter(Boolean).length === 0)
    )
      return true;
    if (superAccess) return true;
    if (typeof can !== "function") return true;
    if (Array.isArray(featureKey)) return featureKey.some(k => k && can(k));
    return !!can(featureKey);
  };

  const hasPlan = requiredPlan => {
    if (!requiredPlan) return true;
    const tiers = ["trial", "basic", "smart", "advanced"];
    const current = String(planId || "basic").toLowerCase();
    return tiers.indexOf(current) >= tiers.indexOf(requiredPlan.toLowerCase());
  };

  const getSubmenuAccess = item => {
    const featureAllowed = isFeatureAllowed(item.featureKey);
    const planAllowed = hasPlan(item.requiredPlan);
    const allowed = featureAllowed && planAllowed;
    const blockedReason = !featureAllowed
      ? "feature"
      : !planAllowed
        ? "plan"
        : null;

    return { allowed, blockedReason };
  };

  const triggerSubmenuUpgrade = ({ blockedReason, item, source }) => {
    if (blockedReason === "plan") {
      requestUpgrade({
        reason: "plan",
        planTier: item.requiredPlan,
        source,
      });
      return;
    }

    const code = Array.isArray(item.featureKey)
      ? item.featureKey.find(Boolean)
      : item.featureKey;

    requestUpgrade({
      reason: "feature",
      code,
      source,
    });
  };

  const submenuByKey = {
    crm: [
      {
        label: "Contacts",
        path: "/app/crm/contacts",
        icon: <UsersRound size={18} />,
        show: showCRM,
        featureKey: FK.CRM_CONTACT_VIEW,
      },
      {
        label: "Attribute",
        path: "/app/crm/attributes",
        icon: <SlidersHorizontal size={18} />,
        show: showCRM,
        featureKey: FK.CRM_ATTRIBUTE_VIEW,
      },
      {
        label: "Tags",
        path: "/app/crm/tags",
        icon: <Tags size={18} />,
        show: showCRM,
        featureKey: FK.CRM_TAGS_VIEW,
      },
      {
        label: "Reminders",
        path: "/app/crm/reminders",
        icon: <BellRing size={18} />,
        show: showCRM,
        featureKey: FK.CRM_REMINDERS_VIEW,
      },
      {
        label: "Timeline",
        path: "/app/crm/timeline",
        icon: <Clock4 size={18} />,
        show: showCRM,
        featureKey: FK.CRM_TIMELINE_VIEW,
      },
      {
        label: "Notes",
        path: "/app/crm/notes",
        icon: <StickyNote size={18} />,
        show: showCRM,
        featureKey: FK.CRM_NOTES_VIEW,
      },
    ],
    campaigns: [
      {
        label: "Campaign Builder",
        path: "/app/campaigns/template-campaign-builder",
        icon: <PlusCircle size={18} />,
        show: showCampaigns,
        featureKey: FK.CAMPAIGN_BUILDER,
      },
      {
        label: "Manage Campaigns",
        path: "/app/campaigns/template-campaigns-list",
        icon: <PlusCircle size={18} />,
        show: showCampaigns,
        featureKey: FK.CAMPAIGN_LIST_VIEW,
      },
      {
        label: "Message Send Logs",
        path: "/app/campaigns/messagelogs",
        icon: <FileBarChart size={18} />,
        show: showCampaigns,
        featureKey: FK.CAMPAIGN_STATUS_VIEW,
      },
      {
        label: "CTA Management",
        path: "/app/campaigns/cta-management",
        icon: <MessageSquareText size={18} />,
        show: showCampaigns,
        featureKey: FK.CAMPAIGN_CTA_MANAGEMENT,
      },
    ],
    catalog: [
      {
        label: "Product Catalog",
        path: "/app/catalog/products",
        icon: <ShoppingCart size={18} />,
        show: showCatalog,
        featureKey: FK.CATALOG_VIEW,
      },
      {
        label: "Add New Product",
        path: "/app/catalog/form",
        icon: <PlusCircle size={18} />,
        show: showCatalog,
        featureKey: FK.CATALOG_CREATE,
      },
      {
        label: "Catalog Dashboard",
        path: "/app/catalog/insights",
        icon: <BarChart2 size={18} />,
        show: showCatalog,
        featureKey: FK.CATALOG_VIEW,
      },
      {
        label: "Auto-Responders",
        path: "/app/catalog/automation",
        icon: <Zap size={18} />,
        show: showCatalog,
        featureKey: FK.CATALOG_AUTOMATION,
        requiredPlan: "advanced",
      },
    ],
    messaging: [
      {
        label: "Send Non-Template Message",
        path: "/app/messaging/send-direct-text",
        icon: <Send size={18} />,
        show: showMessaging,
        featureKey: FK.MESSAGING_SEND_TEXT,
      },
      {
        label: "Send Template Message",
        path: "/app/messaging/send-template-message",
        icon: <FileText size={18} />,
        show: showMessaging,
        featureKey: FK.MESSAGING_SEND_TEMPLATE,
      },
      {
        label: "Reports & Analytics",
        path: "/app/messaging/reports",
        icon: <BarChart3 size={18} />,
        show: showMessaging,
        featureKey: FK.MESSAGING_REPORT_VIEW,
      },
    ],
    inbox: [
      {
        label: "Live Chat Inbox",
        path: "/app/inbox/livechat",
        icon: <MessageSquare size={18} />,
        show: showInbox,
        featureKey: FK.INBOX_VIEW,
      },
      {
        label: "Chat Inbox",
        path: "/app/inbox/chatinbox",
        icon: <Inbox size={18} />,
        show: showInbox,
        featureKey: FK.INBOX_CHAT_VIEW,
      },
    ],
    automation: [
      {
        label: "Auto Reply Builder",
        path: "/app/automation/auto-reply-builder",
        icon: <Bot size={18} />,
        show: showAutomation,
        featureKey: FK.AUTOMATION_CREATE_BOT,
      },
      {
        label: "Flow Visual Builder",
        path: "/app/cta-flow/visual-builder",
        icon: <Zap size={18} />,
        show: showAutomation,
        featureKey: FK.AUTOMATION_CREATE_TEMPLATE_FLOW,
      },
      {
        label: "Flow Manager",
        path: "/app/cta-flow/flow-manager",
        icon: <Zap size={18} />,
        show: showAutomation,
        featureKey: FK.AUTOMATION_VIEW_FLOW_MANAGE,
      },
    ],
    templatebuilder: [
      {
        label: "Library",
        path: "/app/template-builder/library",
        icon: <FileText size={18} />,
        show: showTemplateBuilder,
        featureKey: FK.TEMPLATE_BUILDER_LIBRARY_BROWSE,
      },
      {
        label: "Approved Templates",
        path: "/app/template-builder/approved",
        icon: <FileText size={18} />,
        show: showTemplateBuilder,
        featureKey: FK.TEMPLATE_BUILDER_APPROVED_TEMPLATES_VIEW,
      },
      {
        label: "Drafts",
        path: "/app/template-builder/drafts",
        icon: <FileText size={18} />,
        show: showTemplateBuilder,
        featureKey: FK.TEMPLATE_BUILDER_CREATE_DRAFT,
      },
    ],
    settings: [
      {
        label: "Profile Update",
        path: "/app/settings/profile-completion",
        icon: <UserCog size={18} />,
        show: showSettings,
        featureKey: FK.SETTINGS_PROFILE_UPDATE,
      },
      {
        label: "Change Password",
        path: "/app/settings/password",
        icon: <KeyRound size={18} />,
        show: showSettings,
        featureKey: FK.SETTINGS_PASSWORD_UPDATE,
      },
      {
        label: "User & Staff Management",
        path: "/app/settings/team-management",
        icon: <UsersRound size={18} />,
        show: showSettings,
        featureKey: FK.SETTINGS_STAFF_MANAGEMENT,
      },
      {
        label: "Role Permission Mapping",
        path: "/app/settings/role-permission-mapping",
        icon: <Lock size={18} />,
        show: showSettings,
        featureKey: FK.SETTINGS_ROLE_PERMISSIONS_MAPPING,
      },
      {
        label: "Meta Account Management",
        path: "/app/settings/meta-account",
        icon: <Globe size={18} />,
        show: showSettings,
        featureKey: FK.SETTINGS_META_ACCOUNT_MANAGEMENT,
      },
      {
        label: "Manual Api Setup",
        path: "/app/settings/whatsapp",
        icon: <Phone size={18} />,
        show: showSettings,
        featureKey: FK.SETTINGS_WHATSAPP_SETTINGS_VIEW,
      },
      {
        label: "Billing & Subscription",
        path: "/app/settings/billing",
        icon: <CreditCard size={18} />,
        show: showSettings,
        featureKey: FK.SETTINGS_BILLING_VIEW,
      },
    ],
    admin: [
      {
        label: "Business Approvals",
        path: "/app/admin/approvals",
        icon: <ShieldCheck size={18} />,
        show: showSuperAdmin,
        featureKey: FK.SUPER_ADMIN_NEW_BUSINESS_APPROVAL,
      },
      {
        label: "Plan → Feature Mapping",
        path: "/app/admin/plan-management",
        icon: <FileBarChart size={18} />,
        show: showSuperAdmin,
        featureKey: FK.SUPER_ADMIN_PLAN_MANAGER_VIEW,
      },
      {
        label: "Permissions list",
        path: "/app/admin/permissions",
        icon: <Settings2 size={18} />,
        show: showSuperAdmin,
        featureKey: FK.SUPER_ADMIN_PLAN_PERMISSIONS_LIST,
      },
      {
        label: "FB Embedded Signup Debug",
        path: "/app/admin/esu-debug",
        icon: <ShieldCheck size={18} />,
        show: showSuperAdmin,
        featureKey: FK.SUPER_ADMIN_ESU_DEBUG,
      },
      {
        label: "Signup Report",
        path: "/app/admin/account-insights",
        icon: <ChartArea size={18} />,
        show: showSuperAdmin,
        featureKey: FK.SUPER_ADMIN_SIGNUP_REPORT_VIEW,
      },
      {
        label: "Business Overview",
        path: "/app/admin/account-insights/account-reports",
        icon: <BarChart3 size={18} />,
        show: showSuperAdmin,
        featureKey: FK.SUPER_ADMIN_BUSINESS_OVERVIEW,
      },
      {
        label: "Webhook Reliability & Cleanup",
        path: "/app/admin/webhooks/monitor",
        icon: <Inbox size={18} />,
        show: showSuperAdmin,
        featureKey: FK.SUPER_ADMIN_WEBHOOK_MONITOR,
      },
      {
        label: "User Access & Permissions",
        path: "/app/admin/user-permissions",
        icon: <UsersRound size={18} />,
        show: showSuperAdmin,
        featureKey: FK.SUPER_ADMIN_USER_MANAGEMENT_VIEW,
      },
      {
        label: "Flow Execution Explorer",
        path: "/app/admin/audit/execution-explorer",
        icon: <Bot size={18} />,
        show: showSuperAdmin,
        featureKey: FK.SUPER_ADMIN_FLOW_EXECUTION_EXPLORER_VIEW,
      },
      {
        label: "Developer Notes",
        path: "/app/admin/developer-notes",
        icon: <FileCode2 size={18} />,
        show: superAccess,
        featureKey: FK.SUPER_ADMIN_WORKSPACE_VIEW,
      },
    ],
  };

  const effectiveKey = flyoutOpen && flyoutKey ? flyoutKey : activeKey;
  const effectiveSubmenu = (submenuByKey[effectiveKey] || []).filter(
    i => i.show !== false
  );
  const isCrmFlyout = effectiveKey === "crm";
  const isCampaignsFlyout = effectiveKey === "campaigns";
  const isCatalogFlyout = effectiveKey === "catalog";
  const isMessagingFlyout = effectiveKey === "messaging";
  const isAutomationFlyout = effectiveKey === "automation";
  const isInboxFlyout = effectiveKey === "inbox";
  const isSettingsFlyout = effectiveKey === "settings";
  const isTemplateBuilderFlyout = effectiveKey === "templatebuilder";
  const isAdminFlyout = effectiveKey === "admin";

  const moduleKeyFromPath = path => {
    const p = String(path || "");
    const seg = p.split("/")[2] || "";
    if (seg === "template-builder") return "templatebuilder";
    if (seg === "cta-flow") return "automation";
    return seg;
  };

  const closeFlyout = useCallback(() => {
    setFlyoutOpen(false);
    setFlyoutKey(null);
  }, []);

  const openFlyoutForKey = key => {
    if (!key || !submenuByKey[key] || submenuByKey[key].length === 0) return;
    // Toggle if the same menu is clicked again
    if (flyoutOpen && flyoutKey === key) {
      closeFlyout();
      return;
    }

    setFlyoutKey(key);
    setFlyoutOpen(true);
  };

  useEffect(() => {
    if (!flyoutOpen) return;

    const onMouseDown = e => {
      const t = e.target;
      if (railRef.current && railRef.current.contains(t)) return;
      if (flyoutRef.current && flyoutRef.current.contains(t)) return;
      closeFlyout();
    };

    const onKeyDown = e => {
      if (e.key === "Escape") {
        closeFlyout();
      }
    };

    document.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", onMouseDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [flyoutOpen, closeFlyout]);

  useEffect(() => {
    if (!flyoutOpen) return;
    if (isHoveringFlyout || isHoveringRail) return;

    const id = window.setTimeout(() => {
      closeFlyout();
    }, 450);

    return () => window.clearTimeout(id);
  }, [flyoutOpen, isHoveringFlyout, isHoveringRail, closeFlyout]);

  const Badge = ({ count, collapsedBadge }) => {
    if (!count || count <= 0) return null;

    // ✅ On-brand (emerald) and readable on dark base
    const pill =
      "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-extrabold " +
      "bg-emerald-400/20 text-emerald-50 ring-1 ring-emerald-200/30";

    if (collapsedBadge)
      return <span className={pill}>{count >= 99 ? "99+" : count}</span>;
    return <span className={pill}>{count >= 99 ? "99+" : count}</span>;
  };

  const RailTooltip = ({ text }) => {
    if (!text) return null;
    return (
      <span
        className="pointer-events-none absolute left-[72px] top-1/2 -translate-y-1/2 whitespace-nowrap z-50
                   opacity-0 group-hover:opacity-100 
                   transition-opacity duration-150"
        role="tooltip"
      >
        <span className="relative flex items-center">
          {/* Triangular pointer arrow */}
          <span 
            className="absolute -left-2 top-1/2 -translate-y-1/2 
                       border-t-[6px] border-t-transparent
                       border-r-[8px] border-r-gray-800
                       border-b-[6px] border-b-transparent"
          />
          
          {/* Tooltip box */}
          <span className="bg-gray-800 text-white text-sm font-medium px-3 py-1.5 rounded shadow-lg">
            {text}
          </span>
        </span>
      </span>
    );
  };

  if (isLoading) return null;

  return (
    <aside className="relative h-full w-20 overflow-visible border-r border-[rgba(255,255,255,0.08)] shadow-lg">
      {/* Left rail (Hostinger-like) */}
      <div
        ref={railRef}
        className="relative w-20 h-full bg-gradient-to-b from-[#0a322b] to-[#0a322b] overflow-visible flex flex-col"
        onMouseEnter={() => setIsHoveringRail(true)}
        onMouseLeave={() => setIsHoveringRail(false)}
      >
        {/* Subtle geometric mesh */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
          <svg
            className="w-full h-full"
            viewBox="0 0 200 900"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="xb-rail-poly"
                width="140"
                height="140"
                patternUnits="userSpaceOnUse"
              >
                <polygon
                  points="10,22 54,10 86,36 40,60"
                  fill="rgba(255,255,255,0.04)"
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth="1"
                />
                <polygon
                  points="78,34 132,18 138,72 96,88"
                  fill="rgba(255,255,255,0.03)"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="1"
                />
                <circle cx="54" cy="10" r="2" fill="rgba(255,255,255,0.22)" />
                <circle cx="86" cy="36" r="2" fill="rgba(255,255,255,0.22)" />
                <circle cx="40" cy="60" r="2" fill="rgba(255,255,255,0.18)" />
              </pattern>
              <radialGradient id="xb-rail-glow" cx="50%" cy="10%" r="80%">
                <stop offset="0" stopColor="rgba(8, 48, 33, 0.18)" />
                <stop offset="1" stopColor="rgba(52,211,153,0)" />
              </radialGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#xb-rail-poly)" />
            <rect width="100%" height="100%" fill="url(#xb-rail-glow)" />
          </svg>
        </div>

        {/* Rail shortcuts */}
        <div className="relative z-10 flex-1 pt-4 pb-3 space-y-2 overflow-y-auto overflow-x-hidden no-scrollbar">
          {visibleSections
            .flatMap(s => s.items)
            .map(item => (
              <NavLink
                key={`rail-${item.path}`}
                to={item.path}
                title={item.label}
                onClick={e => {
                  const key = moduleKeyFromPath(item.path);
                  const hasSubmenu =
                    Array.isArray(submenuByKey[key]) &&
                    submenuByKey[key].length > 0;

                  const isSameModule = key && activeKey === key;

                  // Rule:
                  // - If switching to a DIFFERENT module => navigate to that module's workspace home.
                  // - If clicking the SAME module while already inside it => open submenu switcher
                  //   (flyout).
                  if (hasSubmenu && isSameModule) {
                    e.preventDefault();
                    openFlyoutForKey(key);
                    return;
                  }

                  // No submenu: close any open flyout and allow navigation.
                  if (flyoutOpen) closeFlyout();
                }}
                className="group relative ml-2.5 flex flex-col items-center justify-center w-14 h-14 rounded-md outline-none
                  focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#064E3B]"
              >
                {({ isActive }) => (
                  <>
                    {/* Active styles are isolated to the icon wrapper only */}
                    <span
                      className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200
                        ${
                          isActive
                            ? "bg-[rgba(255,255,255,0.10)] scale-105"
                            : "bg-transparent group-hover:bg-[rgba(255,255,255,0.06)] group-hover:scale-105"
                        }`}
                    >
                      <span
                        className={`transition-colors ${
                          isActive
                            ? "text-[#34D399]"
                            : "text-[rgba(255,255,255,0.85)] group-hover:text-[#34D399]"
                        }`}
                      >
                        {item.icon}
                      </span>
                    </span>

                    {/* Text stays static (no scaling / no background) */}
                    <span
                      className={`mt-1 max-w-[72px] truncate px-1 text-center text-[10.5px] font-inter font-medium tracking-wide leading-[12px]
                        ${
                          isActive
                            ? "text-white"
                            : "text-emerald-50/70"
                        }`}
                    >
                      {item.short || item.label}
                    </span>

                    <RailTooltip text={item.label} />
                    {item.badgeCount > 0 && (
                      <span className="absolute top-2 right-2">
                        <Badge count={item.badgeCount} collapsedBadge />
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
        </div>
      </div>

      {/* Flyout submenu */}
      {flyoutOpen && effectiveSubmenu.length > 0 && (
        <>
          {(isCrmFlyout ||
            isCampaignsFlyout ||
            isCatalogFlyout ||
            isMessagingFlyout ||
            isAutomationFlyout ||
            isInboxFlyout ||
            isSettingsFlyout ||
            isTemplateBuilderFlyout ||
            isAdminFlyout) && (
            <div
              className="fixed left-20 top-0 right-0 bottom-0 z-20 bg-slate-900/10 backdrop-blur-[1px]"
              onMouseDown={() => {
                closeFlyout();
              }}
              aria-hidden="true"
            />
          )}

          <div
            ref={flyoutRef}
            className={`absolute left-20 top-0 bottom-0 ${
              isCrmFlyout
                ? "w-80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden"
                : isCampaignsFlyout
                  ? "w-80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden"
                  : isCatalogFlyout
                    ? "w-80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden"
                  : isMessagingFlyout
                      ? "w-80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden"
                  : isTemplateBuilderFlyout
                        ? "w-80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden"
                          : isAutomationFlyout
                            ? "w-80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden"
                          : isInboxFlyout
                            ? "w-80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden"
                            : isSettingsFlyout
                              ? "w-80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden"
                              : isAdminFlyout
                                ? "w-80 bg-white shadow-2xl shadow-black/10 ring-1 ring-black/5 overflow-hidden"
                                : "w-80 bg-white shadow-xl shadow-black/10"
            } border-r border-slate-200 z-40`}
            onMouseEnter={() => setIsHoveringFlyout(true)}
            onMouseLeave={() => setIsHoveringFlyout(false)}
            onFocusCapture={() => setIsHoveringFlyout(true)}
            onBlurCapture={e => {
              const next = e.relatedTarget;
              if (next && flyoutRef.current && flyoutRef.current.contains(next))
                return;
              setIsHoveringFlyout(false);
            }}
          >
            {isCrmFlyout ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                  <div className="px-6 py-4 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                          <UsersRound size={20} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[18px] font-extrabold text-slate-900 leading-tight truncate">
                            CRM Workspace
                          </div>
                          <div className="text-[12px] font-semibold text-slate-500 truncate">
                            Solutions that drive customer outcomes
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeFlyout();
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset"
                      aria-label="Hide submenu"
                      title="Hide"
                    >
                      <ArrowLeftToLine size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  <div className="p-6 relative">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,_#ffffff_0%,_#ffffff_86%,_#ecfdf5_100%)]" />

                    <div className="grid grid-cols-12 gap-5 relative">
                      {/* Left: submenu (closest to sidebar) */}
                      <div className="col-span-12">
                        <ul className="space-y-1">
                          {effectiveSubmenu.map(item => {
                            const { allowed, blockedReason } =
                              getSubmenuAccess(item);
                            return (
                              <li key={`flyout-crm-${item.path}`}>
                                <NavLink
                                  to={item.path}
                                  onClick={e => {
                                    if (!allowed) {
                                      e.preventDefault();
                                      triggerSubmenuUpgrade({
                                        blockedReason,
                                        item,
                                        source: "sidebar.flyout.crm",
                                      });
                                      return;
                                    }
                                    closeFlyout();
                                  }}
                                  className={({ isActive }) =>
                                    `group flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors transition-shadow
                                    focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset
                                     ${
                                       isActive
                                         ? "relative bg-[#0a322b]/[0.10] text-slate-900 shadow-sm ring-1 ring-[#0a322b]/[0.18] before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#0a322b] before:rounded-full"
                                         : "bg-transparent text-slate-900"
                                     } ${
                                      allowed
                                        ? "hover:bg-[#0a322b]/[0.10] hover:shadow-sm hover:ring-1 hover:ring-[#0a322b]/[0.18]"
                                        : "hover:bg-amber-50/50 hover:shadow-sm hover:ring-1 hover:ring-amber-200/60"
                                    }`
                                  }
                                  aria-disabled={!allowed}
                                >
                                  <span
                                    className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors transition-shadow ${
                                      allowed
                                        ? "bg-white border-slate-200 group-hover:bg-[#0a322b]/[0.10] group-hover:border-[#0a322b]/[0.18] group-hover:shadow-sm"
                                        : "bg-amber-50 border-amber-200"
                                    }`}
                                  >
                                    <span
                                      className={`transition-colors ${
                                        allowed
                                          ? "text-slate-700 group-hover:text-[#0a322b]"
                                          : "text-amber-700"
                                      }`}
                                    >
                                      {item.icon}
                                    </span>
                                  </span>

                                  <span className="min-w-0 flex-1 flex items-center gap-2 truncate">
                                    <span
                                      className={`truncate text-[14px] font-medium tracking-tight ${
                                        allowed
                                          ? "text-slate-900"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {item.label}
                                    </span>
                                    {!allowed && (
                                      <span className="inline-flex items-center text-amber-700">
                                        <Lock size={14} />
                                      </span>
                                    )}
                                  </span>

                                  {!allowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Upgrade
                                    </span>
                                  )}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isCampaignsFlyout ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                  <div className="px-6 py-4 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                          <Megaphone size={20} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[18px] font-extrabold text-slate-900 leading-tight truncate">
                            Campaigns Workspace
                          </div>
                          <div className="text-[12px] font-semibold text-slate-500 truncate">
                            Launch campaigns and track performance
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeFlyout();
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset"
                      aria-label="Hide submenu"
                      title="Hide"
                    >
                      <ArrowLeftToLine size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  <div className="p-6 relative">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,_#ffffff_0%,_#ffffff_86%,_#ecfdf5_100%)]" />

                    <div className="grid grid-cols-12 gap-5 relative">
                      {/* Left: submenu (closest to sidebar) */}
                      <div className="col-span-12">
                        <ul className="space-y-1">
                          {effectiveSubmenu.map(item => {
                            const { allowed, blockedReason } =
                              getSubmenuAccess(item);
                            return (
                              <li key={`flyout-campaigns-${item.path}`}>
                                <NavLink
                                    to={item.path}
                                    onClick={e => {
                                      if (!allowed) {
                                        e.preventDefault();
                                        triggerSubmenuUpgrade({
                                          blockedReason,
                                          item,
                                          source: "sidebar.flyout.campaigns",
                                        });
                                        return;
                                      }
                                      closeFlyout();
                                    }}
                                    className={({ isActive }) =>
                                      `group flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors transition-shadow
                                    focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset
                                    ${
                                      isActive
                                        ? "relative bg-[#0a322b]/[0.10] text-slate-900 shadow-sm ring-1 ring-[#0a322b]/[0.18] before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#0a322b] before:rounded-full"
                                        : "bg-transparent text-slate-900"
                                    } ${
                                        allowed
                                          ? "hover:bg-[#0a322b]/[0.10] hover:shadow-sm hover:ring-1 hover:ring-[#0a322b]/[0.18]"
                                          : "hover:bg-amber-50/50 hover:shadow-sm hover:ring-1 hover:ring-amber-200/60"
                                      }`
                                    }
                                    aria-disabled={!allowed}
                                  >
                                    <span
                                      className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors transition-shadow ${
                                        allowed
                                          ? "bg-white border-slate-200 group-hover:bg-[#0a322b]/[0.10] group-hover:border-[#0a322b]/[0.18] group-hover:shadow-sm"
                                          : "bg-amber-50 border-amber-200"
                                      }`}
                                    >
                                      <span
                                        className={`transition-colors ${
                                          allowed
                                            ? "text-slate-700 group-hover:text-[#0a322b]"
                                            : "text-amber-700"
                                        }`}
                                      >
                                        {item.icon}
                                      </span>
                                    </span>

                                    <span className="min-w-0 flex-1 flex items-center gap-2 truncate">
                                      <span
                                        className={`truncate text-[14px] font-medium tracking-tight ${
                                          allowed
                                            ? "text-slate-900"
                                            : "text-slate-600"
                                        }`}
                                      >
                                        {item.label}
                                      </span>
                                      {!allowed && (
                                        <span className="inline-flex items-center text-amber-700">
                                          <Lock size={14} />
                                        </span>
                                      )}
                                    </span>

                                    {!allowed && (
                                      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                        Upgrade
                                      </span>
                                    )}
                                  </NavLink>
                                </li>
                              );
                          })}
                        </ul>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ) : isMessagingFlyout ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                  <div className="px-6 py-4 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                          <MessageSquare size={20} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[18px] font-extrabold text-slate-900 leading-tight truncate">
                            Messaging Workspace
                          </div>
                          <div className="text-[12px] font-semibold text-slate-500 truncate">
                            Send messages and view reports
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeFlyout();
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset"
                      aria-label="Hide submenu"
                      title="Hide"
                    >
                      <ArrowLeftToLine size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  <div className="p-6 relative">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,_#ffffff_0%,_#ffffff_86%,_#ecfdf5_100%)]" />

                    <div className="grid grid-cols-12 gap-5 relative">
                      {/* Left: submenu (closest to sidebar) */}
                      <div className="col-span-12">
                        <ul className="space-y-1">
                          {effectiveSubmenu.map(item => {
                            const { allowed, blockedReason } =
                              getSubmenuAccess(item);
                            return (
                              <li key={`flyout-messaging-${item.path}`}>
                                <NavLink
                                  to={item.path}
                                  onClick={e => {
                                    if (!allowed) {
                                      e.preventDefault();
                                      triggerSubmenuUpgrade({
                                        blockedReason,
                                        item,
                                        source: "sidebar.flyout.messaging",
                                      });
                                      return;
                                    }
                                    closeFlyout();
                                  }}
                                   className={({ isActive }) =>
                                     `group flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors transition-shadow
                                    focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset
                                     ${
                                       isActive
                                        ? "relative bg-[#0a322b]/[0.10] text-slate-900 shadow-sm ring-1 ring-[#0a322b]/[0.18] before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#0a322b] before:rounded-full"
                                        : "bg-transparent text-slate-900"
                                     } ${
                                        allowed
                                         ? "hover:bg-[#0a322b]/[0.10] hover:shadow-sm hover:ring-1 hover:ring-[#0a322b]/[0.18]"
                                         : "hover:bg-amber-50/50 hover:shadow-sm hover:ring-1 hover:ring-amber-200/60"
                                      }`
                                    }
                                    aria-disabled={!allowed}
                                  >
                                    <span
                                      className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors transition-shadow ${
                                        allowed
                                        ? "bg-white border-slate-200 group-hover:bg-[#0a322b]/[0.10] group-hover:border-[#0a322b]/[0.18] group-hover:shadow-sm"
                                        : "bg-amber-50 border-amber-200"
                                      }`}
                                    >
                                      <span
                                        className={`transition-colors ${
                                          allowed
                                          ? "text-slate-700 group-hover:text-[#0a322b]"
                                          : "text-amber-700"
                                        }`}
                                      >
                                        {item.icon}
                                    </span>
                                  </span>

                                  <span className="min-w-0 flex-1 flex items-center gap-2 truncate">
                                    <span
                                      className={`truncate text-[14px] font-medium tracking-tight ${
                                        allowed
                                          ? "text-slate-900"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {item.label}
                                    </span>
                                    {!allowed && (
                                      <span className="inline-flex items-center text-amber-700">
                                        <Lock size={14} />
                                      </span>
                                    )}
                                  </span>

                                  {!allowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Upgrade
                                    </span>
                                  )}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isAutomationFlyout ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                  <div className="px-6 py-4 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                          <Zap size={20} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[18px] font-extrabold text-slate-900 leading-tight truncate">
                            Automation Workspace
                          </div>
                          <div className="text-[12px] font-semibold text-slate-500 truncate">
                            Build bots and manage flows
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeFlyout();
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset"
                      aria-label="Hide submenu"
                      title="Hide"
                    >
                      <ArrowLeftToLine size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  <div className="p-6 relative">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,_#ffffff_0%,_#ffffff_86%,_#ecfdf5_100%)]" />

                    <div className="grid grid-cols-12 gap-5 relative">
                      {/* Left: submenu (closest to sidebar) */}
                      <div className="col-span-12">
                        <ul className="space-y-1">
                          {effectiveSubmenu.map(item => {
                            const { allowed, blockedReason } =
                              getSubmenuAccess(item);
                            return (
                              <li key={`flyout-automation-${item.path}`}>
                                <NavLink
                                  to={item.path}
                                  onClick={e => {
                                    if (!allowed) {
                                      e.preventDefault();
                                      triggerSubmenuUpgrade({
                                        blockedReason,
                                        item,
                                        source: "sidebar.flyout.automation",
                                      });
                                      return;
                                    }
                                    closeFlyout();
                                  }}
                                   className={({ isActive }) =>
                                     `group flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors transition-shadow
                                    focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset
                                      ${
                                        isActive
                                        ? "relative bg-[#0a322b]/[0.10] text-slate-900 shadow-sm ring-1 ring-[#0a322b]/[0.18] before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#0a322b] before:rounded-full"
                                        : "bg-transparent text-slate-900"
                                      } ${
                                         allowed
                                         ? "hover:bg-[#0a322b]/[0.10] hover:shadow-sm hover:ring-1 hover:ring-[#0a322b]/[0.18]"
                                         : "hover:bg-amber-50/50 hover:shadow-sm hover:ring-1 hover:ring-amber-200/60"
                                       }`
                                    }
                                    aria-disabled={!allowed}
                                  >
                                    <span
                                      className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors transition-shadow ${
                                        allowed
                                        ? "bg-white border-slate-200 group-hover:bg-[#0a322b]/[0.10] group-hover:border-[#0a322b]/[0.18] group-hover:shadow-sm"
                                        : "bg-amber-50 border-amber-200"
                                      }`}
                                    >
                                      <span
                                        className={`transition-colors ${
                                          allowed
                                          ? "text-slate-700 group-hover:text-[#0a322b]"
                                          : "text-amber-700"
                                        }`}
                                      >
                                        {item.icon}
                                    </span>
                                  </span>

                                  <span className="min-w-0 flex-1 flex items-center gap-2 truncate">
                                    <span
                                      className={`truncate text-[14px] font-medium tracking-tight ${
                                        allowed
                                          ? "text-slate-900"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {item.label}
                                    </span>
                                    {!allowed && (
                                      <span className="inline-flex items-center text-amber-700">
                                        <Lock size={14} />
                                      </span>
                                    )}
                                  </span>

                                  {!allowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Upgrade
                                    </span>
                                  )}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isInboxFlyout ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                  <div className="px-6 py-4 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                          <Inbox size={20} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[18px] font-extrabold text-slate-900 leading-tight truncate">
                            Inbox Workspace
                          </div>
                          <div className="text-[12px] font-semibold text-slate-500 truncate">
                            Manage conversations in one place
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeFlyout();
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset"
                      aria-label="Hide submenu"
                      title="Hide"
                    >
                      <ArrowLeftToLine size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  <div className="p-6 relative">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,_#ffffff_0%,_#ffffff_86%,_#ecfdf5_100%)]" />

                    <div className="grid grid-cols-12 gap-5 relative">
                      {/* Left: submenu (closest to sidebar) */}
                      <div className="col-span-12">
                        <ul className="space-y-1">
                          {effectiveSubmenu.map(item => {
                            const { allowed, blockedReason } =
                              getSubmenuAccess(item);
                            return (
                              <li key={`flyout-inbox-${item.path}`}>
                                <NavLink
                                  to={item.path}
                                  onClick={e => {
                                    if (!allowed) {
                                      e.preventDefault();
                                      triggerSubmenuUpgrade({
                                        blockedReason,
                                        item,
                                        source: "sidebar.flyout.inbox",
                                      });
                                      return;
                                    }
                                    closeFlyout();
                                  }}
                                   className={({ isActive }) =>
                                     `group flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors transition-shadow
                                    focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset
                                      ${
                                        isActive
                                        ? "relative bg-[#0a322b]/[0.10] text-slate-900 shadow-sm ring-1 ring-[#0a322b]/[0.18] before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#0a322b] before:rounded-full"
                                        : "bg-transparent text-slate-900"
                                      } ${
                                         allowed
                                         ? "hover:bg-[#0a322b]/[0.10] hover:shadow-sm hover:ring-1 hover:ring-[#0a322b]/[0.18]"
                                         : "hover:bg-amber-50/50 hover:shadow-sm hover:ring-1 hover:ring-amber-200/60"
                                       }`
                                    }
                                    aria-disabled={!allowed}
                                  >
                                    <span
                                      className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors transition-shadow ${
                                        allowed
                                        ? "bg-white border-slate-200 group-hover:bg-[#0a322b]/[0.10] group-hover:border-[#0a322b]/[0.18] group-hover:shadow-sm"
                                        : "bg-amber-50 border-amber-200"
                                      }`}
                                    >
                                      <span
                                        className={`transition-colors ${
                                          allowed
                                          ? "text-slate-700 group-hover:text-[#0a322b]"
                                          : "text-amber-700"
                                        }`}
                                      >
                                        {item.icon}
                                    </span>
                                  </span>

                                  <span className="min-w-0 flex-1 flex items-center gap-2 truncate">
                                    <span
                                      className={`truncate text-[14px] font-medium tracking-tight ${
                                        allowed
                                          ? "text-slate-900"
                                          : "text-slate-600"
                                      }`}
                                    >
                                      {item.label}
                                    </span>
                                    {!allowed && (
                                      <span className="inline-flex items-center text-amber-700">
                                        <Lock size={14} />
                                      </span>
                                    )}
                                  </span>

                                  {!allowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Upgrade
                                    </span>
                                  )}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isSettingsFlyout ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                  <div className="px-6 py-4 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                          <Settings2 size={20} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[18px] font-extrabold text-slate-900 leading-tight truncate">
                            Settings Workspace
                          </div>
                          <div className="text-[12px] font-semibold text-slate-500 truncate">
                            Manage account, billing and integrations
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeFlyout();
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset"
                      aria-label="Hide submenu"
                      title="Hide"
                    >
                      <ArrowLeftToLine size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  <div className="p-6 relative">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,_#ffffff_0%,_#ffffff_86%,_#ecfdf5_100%)]" />

                    <div className="grid grid-cols-12 gap-5 relative">
                      {/* Left: submenu (closest to sidebar) */}
                      <div className="col-span-12">
                        <ul className="space-y-1">
                          {effectiveSubmenu.map(item => {
                            const { allowed, blockedReason } =
                              getSubmenuAccess(item);
                            return (
                              <li key={`flyout-settings-${item.path}`}>
                                <NavLink
                                  to={item.path}
                                  onClick={e => {
                                    if (!allowed) {
                                      e.preventDefault();
                                      triggerSubmenuUpgrade({
                                        blockedReason,
                                        item,
                                        source: "sidebar.flyout.settings",
                                      });
                                      return;
                                    }
                                    closeFlyout();
                                  }}
                                   className={({ isActive }) =>
                                     `group flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors transition-shadow
                                    focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset
                                     ${
                                       isActive
                                        ? "relative bg-[#0a322b]/[0.10] text-slate-900 shadow-sm ring-1 ring-[#0a322b]/[0.18] before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#0a322b] before:rounded-full"
                                        : "bg-transparent text-slate-900"
                                     } ${
                                        allowed
                                         ? "hover:bg-[#0a322b]/[0.10] hover:shadow-sm hover:ring-1 hover:ring-[#0a322b]/[0.18]"
                                         : "hover:bg-amber-50/50 hover:shadow-sm hover:ring-1 hover:ring-amber-200/60"
                                      }`
                                    }
                                    aria-disabled={!allowed}
                                  >
                                    <span
                                      className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors transition-shadow ${
                                        allowed
                                          ? "bg-white border-slate-200 group-hover:bg-[#0a322b]/[0.10] group-hover:border-[#0a322b]/[0.18] group-hover:shadow-sm"
                                          : "bg-amber-50 border-amber-200"
                                      }`}
                                    >
                                      <span
                                        className={`transition-colors ${
                                          allowed
                                            ? "text-slate-700 group-hover:text-[#0a322b]"
                                            : "text-amber-700"
                                        }`}
                                      >
                                        {item.icon}
                                      </span>
                                    </span>

                                  <span className="min-w-0 flex-1 flex items-center gap-2 truncate">
                                    <span
                                      className={`truncate text-[14px] font-medium tracking-tight ${
                                        allowed ? "text-slate-900" : "text-slate-600"
                                      }`}
                                    >
                                      {item.label}
                                    </span>
                                    {!allowed && (
                                      <span className="inline-flex items-center text-amber-700">
                                        <Lock size={14} />
                                      </span>
                                    )}
                                  </span>

                                  {!allowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Upgrade
                                    </span>
                                  )}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isAdminFlyout ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                  <div className="px-6 py-4 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                          <ShieldCheck size={20} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[18px] font-extrabold text-slate-900 leading-tight truncate">
                            Admin Workspace
                          </div>
                          <div className="text-[12px] font-semibold text-slate-500 truncate">
                            Manage access, plans and platform tools
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeFlyout();
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset"
                      aria-label="Hide submenu"
                      title="Hide"
                    >
                      <ArrowLeftToLine size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  <div className="p-6 relative">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,_#ffffff_0%,_#ffffff_86%,_#ecfdf5_100%)]" />

                    <div className="grid grid-cols-12 gap-5 relative">
                      {/* Left: submenu (closest to sidebar) */}
                      <div className="col-span-12">
                        <ul className="space-y-1">
                          {effectiveSubmenu.map(item => {
                            const { allowed, blockedReason } =
                              getSubmenuAccess(item);
                            return (
                              <li key={`flyout-admin-${item.path}`}>
                                <NavLink
                                  to={item.path}
                                  onClick={e => {
                                    if (!allowed) {
                                      e.preventDefault();
                                      triggerSubmenuUpgrade({
                                        blockedReason,
                                        item,
                                        source: "sidebar.flyout.admin",
                                      });
                                      return;
                                    }
                                    closeFlyout();
                                  }}
                                   className={({ isActive }) =>
                                     `group flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors transition-shadow
                                    focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset
                                     ${
                                       isActive
                                        ? "relative bg-[#0a322b]/[0.10] text-slate-900 shadow-sm ring-1 ring-[#0a322b]/[0.18] before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#0a322b] before:rounded-full"
                                        : "bg-transparent text-slate-900"
                                     } ${
                                        allowed
                                         ? "hover:bg-[#0a322b]/[0.10] hover:shadow-sm hover:ring-1 hover:ring-[#0a322b]/[0.18]"
                                         : "hover:bg-amber-50/50 hover:shadow-sm hover:ring-1 hover:ring-amber-200/60"
                                      }`
                                    }
                                    aria-disabled={!allowed}
                                  >
                                    <span
                                      className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors transition-shadow ${
                                        allowed
                                          ? "bg-white border-slate-200 group-hover:bg-[#0a322b]/[0.10] group-hover:border-[#0a322b]/[0.18] group-hover:shadow-sm"
                                          : "bg-amber-50 border-amber-200"
                                      }`}
                                    >
                                      <span
                                        className={`transition-colors ${
                                          allowed
                                            ? "text-slate-700 group-hover:text-[#0a322b]"
                                            : "text-amber-700"
                                        }`}
                                      >
                                        {item.icon}
                                      </span>
                                    </span>

                                  <span className="min-w-0 flex-1 flex items-center gap-2 truncate">
                                    <span
                                      className={`truncate text-[14px] font-medium tracking-tight ${
                                        allowed ? "text-slate-900" : "text-slate-600"
                                      }`}
                                    >
                                      {item.label}
                                    </span>
                                    {!allowed && (
                                      <span className="inline-flex items-center text-amber-700">
                                        <Lock size={14} />
                                      </span>
                                    )}
                                  </span>

                                  {!allowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Upgrade
                                    </span>
                                  )}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isCatalogFlyout ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                  <div className="px-6 py-4 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                          <Package size={20} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[18px] font-extrabold text-slate-900 leading-tight truncate">
                            Catalog Workspace
                          </div>
                          <div className="text-[12px] font-semibold text-slate-500 truncate">
                            Manage products and catalogs at scale
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeFlyout();
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset"
                      aria-label="Hide submenu"
                      title="Hide"
                    >
                      <ArrowLeftToLine size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  <div className="p-6 relative">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,_#ffffff_0%,_#ffffff_86%,_#ecfdf5_100%)]" />

                    <div className="grid grid-cols-12 gap-5 relative">
                      {/* Left: submenu (closest to sidebar) */}
                      <div className="col-span-12">
                        <ul className="space-y-1">
                          {effectiveSubmenu.map(item => {
                            const { allowed, blockedReason } =
                              getSubmenuAccess(item);
                            return (
                              <li key={`flyout-catalog-${item.path}`}>
                                <NavLink
                                  to={item.path}
                                  onClick={e => {
                                    if (!allowed) {
                                      e.preventDefault();
                                      triggerSubmenuUpgrade({
                                        blockedReason,
                                        item,
                                        source: "sidebar.flyout.catalog",
                                      });
                                      return;
                                    }
                                    closeFlyout();
                                  }}
                                   className={({ isActive }) =>
                                     `group flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors transition-shadow
                                    focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset
                                     ${
                                       isActive
                                        ? "relative bg-[#0a322b]/[0.10] text-slate-900 shadow-sm ring-1 ring-[#0a322b]/[0.18] before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#0a322b] before:rounded-full"
                                        : "bg-transparent text-slate-900"
                                     } ${
                                        allowed
                                         ? "hover:bg-[#0a322b]/[0.10] hover:shadow-sm hover:ring-1 hover:ring-[#0a322b]/[0.18]"
                                         : "hover:bg-amber-50/50 hover:shadow-sm hover:ring-1 hover:ring-amber-200/60"
                                      }`
                                    }
                                    aria-disabled={!allowed}
                                  >
                                    <span
                                      className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors transition-shadow ${
                                        allowed
                                          ? "bg-white border-slate-200 group-hover:bg-[#0a322b]/[0.10] group-hover:border-[#0a322b]/[0.18] group-hover:shadow-sm"
                                          : "bg-amber-50 border-amber-200"
                                      }`}
                                    >
                                      <span
                                        className={`transition-colors ${
                                          allowed
                                            ? "text-slate-700 group-hover:text-[#0a322b]"
                                            : "text-amber-700"
                                        }`}
                                      >
                                        {item.icon}
                                      </span>
                                    </span>

                                  <span className="min-w-0 flex-1 flex items-center gap-2 truncate">
                                    <span
                                      className={`truncate text-[14px] font-medium tracking-tight ${
                                        allowed ? "text-slate-900" : "text-slate-600"
                                      }`}
                                    >
                                      {item.label}
                                    </span>
                                    {!allowed && (
                                      <span className="inline-flex items-center text-amber-700">
                                        <Lock size={14} />
                                      </span>
                                    )}
                                  </span>

                                  {!allowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Upgrade
                                    </span>
                                  )}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : isTemplateBuilderFlyout ? (
              <div className="h-full flex flex-col">
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
                  <div className="px-6 py-4 flex items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700">
                          <Bot size={20} />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[18px] font-extrabold text-slate-900 leading-tight truncate">
                            Template Builder
                          </div>
                          <div className="text-[12px] font-semibold text-slate-500 truncate">
                            Create and manage WhatsApp templates
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        closeFlyout();
                      }}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset"
                      aria-label="Hide submenu"
                      title="Hide"
                    >
                      <ArrowLeftToLine size={18} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar">
                  <div className="p-6 relative">
                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,_#ffffff_0%,_#ffffff_86%,_#ecfdf5_100%)]" />

                    <div className="grid grid-cols-12 gap-5 relative">
                      {/* Left: submenu (closest to sidebar) */}
                      <div className="col-span-12">
                        <ul className="space-y-1">
                          {effectiveSubmenu.map(item => {
                            const { allowed, blockedReason } =
                              getSubmenuAccess(item);
                            return (
                              <li key={`flyout-templatebuilder-${item.path}`}>
                                <NavLink
                                  to={item.path}
                                  onClick={e => {
                                    if (!allowed) {
                                      e.preventDefault();
                                      triggerSubmenuUpgrade({
                                        blockedReason,
                                        item,
                                        source: "sidebar.flyout.templatebuilder",
                                      });
                                      return;
                                    }
                                    closeFlyout();
                                  }}
                                   className={({ isActive }) =>
                                     `group flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-colors transition-shadow
                                    focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset
                                     ${
                                       isActive
                                        ? "relative bg-[#0a322b]/[0.10] text-slate-900 shadow-sm ring-1 ring-[#0a322b]/[0.18] before:content-[''] before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[#0a322b] before:rounded-full"
                                        : "bg-transparent text-slate-900"
                                     } ${
                                        allowed
                                         ? "hover:bg-[#0a322b]/[0.10] hover:shadow-sm hover:ring-1 hover:ring-[#0a322b]/[0.18]"
                                         : "hover:bg-amber-50/50 hover:shadow-sm hover:ring-1 hover:ring-amber-200/60"
                                      }`
                                    }
                                    aria-disabled={!allowed}
                                  >
                                    <span
                                      className={`flex items-center justify-center w-8 h-8 rounded-md border transition-colors transition-shadow ${
                                        allowed
                                          ? "bg-white border-slate-200 group-hover:bg-[#0a322b]/[0.10] group-hover:border-[#0a322b]/[0.18] group-hover:shadow-sm"
                                          : "bg-amber-50 border-amber-200"
                                      }`}
                                    >
                                      <span
                                        className={`transition-colors ${
                                          allowed
                                            ? "text-slate-700 group-hover:text-[#0a322b]"
                                            : "text-amber-700"
                                        }`}
                                      >
                                        {item.icon}
                                      </span>
                                    </span>

                                  <span className="min-w-0 flex-1 flex items-center gap-2 truncate">
                                    <span
                                      className={`truncate text-[14px] font-medium tracking-tight ${
                                        allowed ? "text-slate-900" : "text-slate-600"
                                      }`}
                                    >
                                      {item.label}
                                    </span>
                                    {!allowed && (
                                      <span className="inline-flex items-center text-amber-700">
                                        <Lock size={14} />
                                      </span>
                                    )}
                                  </span>

                                  {!allowed && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                                      Upgrade
                                    </span>
                                  )}
                                </NavLink>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 overflow-y-auto overflow-x-hidden no-scrollbar h-full">
                <div className="px-4">
                  <ul className="space-y-1">
                    {effectiveSubmenu.map(item => {
                      const { allowed, blockedReason } = getSubmenuAccess(item);
                      return (
                        <li key={`flyout-${item.path}`}>
                          <NavLink
                            to={item.path}
                            onClick={e => {
                              if (!allowed) {
                                e.preventDefault();
                                triggerSubmenuUpgrade({
                                  blockedReason,
                                  item,
                                  source: "sidebar.flyout",
                                });
                                return;
                              }
                              closeFlyout();
                            }}
                            className={({ isActive }) =>
                              `group flex items-center gap-3 min-h-12 px-3 py-2 rounded-md transition-colors transition-shadow outline-none
                             focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-inset
                              ${
                                isActive
                                  ? "is-active bg-[#0a322b]/[0.10] ring-1 ring-[#0a322b]/[0.18] shadow-sm"
                                  : "bg-transparent"
                              } ${
                                  allowed
                                   ? "border border-transparent hover:bg-[#0a322b]/[0.10] hover:shadow-sm hover:ring-1 hover:ring-[#0a322b]/[0.18]"
                                   : "border border-dashed border-amber-300 bg-amber-50/30 hover:bg-amber-50/50 hover:shadow-sm hover:ring-1 hover:ring-amber-200/50"
                                }`
                             }
                             aria-disabled={!allowed}
                           >
                            <span
                              className={`flex items-center justify-center w-9 h-9 rounded-md transition-colors transition-shadow
                              ${
                                allowed
                                  ? "bg-slate-50 border border-slate-200 group-hover:bg-[#0a322b]/[0.10] group-hover:border-[#0a322b]/[0.18] group-hover:shadow-sm group-[.is-active]:bg-[#0a322b]/[0.16] group-[.is-active]:border-[#0a322b]/[0.22]"
                                  : "bg-amber-50 border border-amber-200 group-hover:bg-amber-50/60 group-hover:border-amber-200"
                              }`}
                            >
                              <span
                                className={`transition-colors ${
                                  allowed
                                    ? "text-slate-500 group-hover:text-[#0a322b] group-[.is-active]:text-[#0a322b]"
                                    : "text-amber-700"
                                }`}
                              >
                                {item.icon}
                              </span>
                            </span>

                            <span className="flex-1 text-[13px] font-semibold text-slate-800 group-[.is-active]:text-slate-900 whitespace-normal leading-snug">
                              {item.label}
                            </span>

                            {!allowed && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber-500 bg-amber-50 px-2 py-0.5
                                         text-[11px] font-semibold text-amber-700"
                                title="Upgrade to unlock"
                              >
                                <Lock size={14} />
                                Upgrade
                              </span>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="px-4 mt-6 text-center text-xs text-slate-500">
                  Powered by XploreByte
                </div>
              </div>
            )}
          </div>
        </>
      )}
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

// /**
//  * SidebarMenu — Enterprise green theme
//  * Enhancements:
//  * - Stronger active state (pill + glow + shadow)
//  * - Better section headers (aligned divider)
//  * - Collapsed hover tooltip
//  * - Badge support (count / dot)
//  * - Minimise button integrated in footer area
//  */
// export default function SidebarMenu({ collapsed, setCollapsed }) {
//   const {
//     role,
//     isLoading,
//     availableFeatures = {}, // legacy flags (optional)
//     can, // (permCode) => boolean ✅ entitlements-aware
//     hasAllAccess, // true if "*" or super on server
//     entLoading, // ✅ loading state for entitlements snapshot
//   } = useAuth();

//   if (isLoading) return null;

//   const safeRole = String(role || "").toLowerCase();
//   const isSuper = safeRole === "superadmin";
//   const superAccess = isSuper || !!hasAllAccess;

//   const iconSize = collapsed ? 22 : 18;

//   // ---------- helpers ----------
//   const anyPerm = (codes = []) =>
//     superAccess
//       ? true
//       : codes.some(c => (typeof can === "function" ? can(c) : false));

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

//   // ✅ Badge support (wire real count later)
//   // For now: if you set localStorage.setItem("xb_inbox_unread","5"), it will show.
//   const inboxUnreadCount = (() => {
//     try {
//       const raw = window.localStorage.getItem("xb_inbox_unread");
//       const n = Number(raw);
//       return Number.isFinite(n) && n > 0 ? Math.min(n, 99) : 0;
//     } catch {
//       return 0;
//     }
//   })();

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
//           label: "CRM",
//           short: "CRM",
//           path: "/app/crm",
//           icon: <UsersRound size={iconSize} />,
//           show: showCRM,
//         },
//         {
//           label: "Campaigns",
//           short: "Camp",
//           path: "/app/campaigns",
//           icon: <Megaphone size={iconSize} />,
//           show: showCampaigns,
//         },
//         {
//           label: "Catalog",
//           short: "Cat",
//           path: "/app/catalog",
//           icon: <Package size={iconSize} />,
//           show: showCatalog,
//         },
//         {
//           label: "Message",
//           short: "Msg",
//           path: "/app/messaging",
//           icon: <MessageSquare size={iconSize} />,
//           show: showMessaging,
//         },
//         {
//           label: "Template Builder",
//           short: "Temp",
//           path: "/app/templatebuilder",
//           icon: <Bot size={iconSize} />,
//           show: showTemplateBuilder,
//         },
//         {
//           label: "Automation",
//           short: "Auto",
//           path: "/app/automation",
//           icon: <Bot size={iconSize} />,
//           show: showAutomation,
//         },
//         {
//           label: "Inbox",
//           short: "Inbox",
//           path: "/app/inbox",
//           icon: <Inbox size={iconSize} />,
//           show: showInbox,
//           badgeCount: inboxUnreadCount, // ✅ count badge (0 hides)
//         },
//         {
//           label: "Admin",
//           short: "Admin",
//           path: "/app/admin",
//           icon: <ShieldCheck size={iconSize} />,
//           show: showSuperAdmin,
//         },
//       ],
//     },
//     {
//       title: "My Account",
//       items: [
//         {
//           label: "Settings",
//           short: "Set",
//           path: "/app/settings",
//           icon: <Settings2 size={iconSize} />,
//           show: showSettings,
//         },
//       ],
//     },
//   ];

//   const SidebarTooltip = ({ text }) => {
//     if (!collapsed) return null;
//     return (
//       <span className="pointer-events-none absolute left-[76px] top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900/95 px-2 py-1 text-xs font-semibold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
//         {text}
//       </span>
//     );
//   };

//   const Badge = ({ count }) => {
//     if (!count || count <= 0) return null;
//     return (
//       <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold bg-emerald-300/20 text-emerald-100 ring-1 ring-emerald-200/30">
//         {count >= 99 ? "99+" : count}
//       </span>
//     );
//   };

//   return (
//     <aside
//       className={`${
//         collapsed ? "w-20" : "w-64"
//       } relative overflow-hidden bg-gradient-to-b from-[#064E3B] via-[#065F46] to-[#064E3B] shadow-lg border-r border-[rgba(255,255,255,0.08)] flex flex-col transition-all duration-300 h-screen`}
//     >
//       {/* Subtle pattern overlay (reduced noise) */}
//       <div className="absolute inset-0 pointer-events-none opacity-[0.045]">
//         <svg
//           className="w-full h-full"
//           viewBox="0 0 320 900"
//           preserveAspectRatio="none"
//           aria-hidden="true"
//         >
//           <defs>
//             <pattern
//               id="xb-mesh"
//               width="120"
//               height="120"
//               patternUnits="userSpaceOnUse"
//             >
//               <path
//                 d="M12 24 L48 12 L78 34 L108 18"
//                 stroke="rgba(236,253,245,0.35)"
//                 strokeWidth="1"
//                 fill="none"
//               />
//               <path
//                 d="M18 86 L52 64 L88 88 L112 70"
//                 stroke="rgba(236,253,245,0.28)"
//                 strokeWidth="1"
//                 fill="none"
//               />
//               <circle cx="12" cy="24" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="48" cy="12" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="78" cy="34" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="108" cy="18" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="18" cy="86" r="2" fill="rgba(236,253,245,0.45)" />
//               <circle cx="52" cy="64" r="2" fill="rgba(236,253,245,0.45)" />
//               <circle cx="88" cy="88" r="2" fill="rgba(236,253,245,0.45)" />
//               <circle cx="112" cy="70" r="2" fill="rgba(236,253,245,0.45)" />
//               {/* tiny "message bubble" hint */}
//               <path
//                 d="M66 54c0-6 7-10 14-10s14 4 14 10-7 10-14 10c-2 0-4-0.3-6-1l-5 3 2-5c-3-2-5-4-5-7z"
//                 fill="rgba(236,253,245,0.18)"
//               />
//             </pattern>
//           </defs>
//           <rect width="100%" height="100%" fill="url(#xb-mesh)" />
//         </svg>
//       </div>

//       <div className="relative z-10 flex flex-col h-full">
//         {/* Logo */}
//         <div
//           className={`h-20 flex items-center ${
//             collapsed ? "justify-center" : "px-5"
//           } border-b border-[rgba(255,255,255,0.10)]`}
//         >
//           <div className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
//             <img
//               src="/logo/logo.svg"
//               alt="XploreByte Logo"
//               className={`${
//                 collapsed ? "h-10 w-10" : "h-9 w-9"
//               } drop-shadow-sm`}
//             />
//             {!collapsed && (
//               <div className="leading-tight">
//                 <h1 className="text-[15px] font-bold text-white/95 tracking-tight">
//                   XploreByte
//                 </h1>
//                 <p className="text-[11px] font-semibold text-white/70">
//                   WhatsApp Platform
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Nav */}
//         <div className="flex-1 overflow-y-auto py-4">
//           <nav className="space-y-5">
//             {sections.map(section => {
//               const visibleItems = section.items.filter(i => i.show);
//               if (visibleItems.length === 0) return null;

//               return (
//                 <div key={section.title}>
//                   {/* Section Header */}
//                   {!collapsed ? (
//                     <div className="px-5 mb-2 flex items-center gap-3">
//                       <span className="text-[10px] font-extrabold tracking-[0.18em] uppercase text-white/65">
//                         {section.title}
//                       </span>
//                       <span className="h-px flex-1 bg-white/10" />
//                     </div>
//                   ) : (
//                     <div className="w-10 mx-auto h-px bg-white/10 mb-3" />
//                   )}

//                   <ul className={`space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
//                     {visibleItems.map(item => (
//                       <li key={item.path}>
//                         <NavLink
//                           to={item.path}
//                           className={({ isActive }) => {
//                             const base =
//                               "group relative flex items-center transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#064E3B]";
//                             const layout = collapsed
//                               ? "justify-center h-12 w-16 mx-auto rounded-xl"
//                               : "gap-3 px-4 h-10 rounded-xl";

//                             if (isActive) {
//                               return `${base} ${layout} bg-white/12 text-white shadow-[0_10px_28px_rgba(0,0,0,0.28)] ring-1 ring-emerald-200/20 before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-[4px] before:bg-emerald-300`;
//                             }

//                             return `${base} ${layout} text-white/85 hover:bg-white/7 hover:text-white`;
//                           }}
//                         >
//                           {/* Icon */}
//                           <span className="relative flex items-center justify-center">
//                             <span className="text-white/85 group-hover:text-white">
//                               {item.icon}
//                             </span>
//                             <SidebarTooltip text={item.label} />
//                           </span>

//                           {/* Label + Badge (expanded only) */}
//                           {!collapsed && (
//                             <span className="flex items-center w-full gap-2">
//                               <span className="text-sm font-semibold text-white/90 group-hover:text-white">
//                                 {item.label}
//                               </span>
//                               <Badge count={item.badgeCount} />
//                             </span>
//                           )}
//                         </NavLink>

//                         {/* Badge (collapsed): tiny dot/count in corner */}
//                         {collapsed && item.badgeCount > 0 && (
//                           <span className="pointer-events-none absolute translate-x-[46px] -translate-y-[34px] inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold bg-emerald-300/20 text-emerald-100 ring-1 ring-emerald-200/30">
//                             {item.badgeCount >= 99 ? "99+" : item.badgeCount}
//                           </span>
//                         )}
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               );
//             })}
//           </nav>
//         </div>

//         {/* Footer Controls */}
//         <div className="border-t border-white/10 p-3 space-y-2">
//           <button
//             onClick={() => setCollapsed(!collapsed)}
//             className={`w-full flex items-center justify-center gap-2 rounded-xl ${
//               collapsed ? "h-11" : "h-10"
//             } text-white/80 hover:text-white hover:bg-white/7 text-sm font-semibold transition-all duration-200 focus-visible:ring-2 focus-visible:ring-emerald-200 focus-visible:ring-offset-2 focus-visible:ring-offset-[#064E3B]`}
//             aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
//           >
//             {collapsed ? (
//               <ChevronRight size={18} className="text-white/90" />
//             ) : (
//               <>
//                 <ChevronLeft size={18} className="text-white/90" />
//                 <span className="text-sm">Minimise</span>
//               </>
//             )}
//           </button>

//           <div className="text-center text-xs text-white/70">
//             {!collapsed && "Powered by XploreByte"}
//           </div>
//         </div>
//       </div>
//     </aside>
//   );
// }

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
//   const iconSize = collapsed ? 22 : 18;

//   // ---------- helpers ----------
//   const anyPerm = (codes = []) =>
//     superAccess
//       ? true
//       : codes.some(c => (typeof can === "function" ? can(c) : false));

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
//           short: "Dashboard",
//           path: "/app/welcomepage",
//           icon: <ChartArea size={iconSize} />,
//           show: showDashboard,
//         },
//         {
//           label: "CRM",
//           short: "CRM",
//           path: "/app/crm",
//           icon: <UsersRound size={iconSize} />,
//           show: showCRM,
//         },
//         {
//           label: "Campaigns",
//           short: "Campaigns",
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
//           label: "Message",
//           short: "Messaging",
//           path: "/app/messaging",
//           icon: <MessageSquare size={iconSize} />,
//           show: showMessaging,
//         },
//         {
//           label: "Template Builder",
//           short: "Template",
//           path: "/app/templatebuilder",
//           icon: <Bot size={iconSize} />,
//           show: showTemplateBuilder,
//         },
//         {
//           label: "Automation",
//           short: "Automation",
//           path: "/app/automation",
//           icon: <Bot size={iconSize} />,
//           show: showAutomation,
//         },
//         {
//           label: "Inbox",
//           short: "Inbox",
//           path: "/app/inbox",
//           icon: <Inbox size={iconSize} />,
//           show: showInbox,
//         },
//         {
//           label: "Admin",
//           short: "Admin",
//           path: "/app/admin",
//           icon: <ShieldCheck size={iconSize} />,
//           show: showSuperAdmin,
//         },
//       ],
//     },
//     {
//       title: "My Account",
//       items: [
//         {
//           label: "Settings",
//           short: "Settings",
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
//         collapsed ? "w-20" : "w-64"
//       } relative overflow-hidden bg-gradient-to-b from-[#064E3B] to-[#065F46]
//          shadow-lg border-r border-[rgba(255,255,255,0.08)] flex flex-col transition-all duration-300 h-screen`}
//     >
//       {/* Subtle messaging/automation pattern overlay */}
//       <div className="absolute inset-0 pointer-events-none opacity-[0.06]">
//         <svg
//           className="w-full h-full"
//           viewBox="0 0 320 900"
//           preserveAspectRatio="none"
//           aria-hidden="true"
//         >
//           <defs>
//             <pattern
//               id="xb-mesh"
//               width="120"
//               height="120"
//               patternUnits="userSpaceOnUse"
//             >
//               <path
//                 d="M12 24 L48 12 L78 34 L108 18"
//                 stroke="rgba(236,253,245,0.35)"
//                 strokeWidth="1"
//                 fill="none"
//               />
//               <path
//                 d="M18 86 L52 64 L88 88 L112 70"
//                 stroke="rgba(236,253,245,0.28)"
//                 strokeWidth="1"
//                 fill="none"
//               />
//               <circle cx="12" cy="24" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="48" cy="12" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="78" cy="34" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="108" cy="18" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="18" cy="86" r="2" fill="rgba(236,253,245,0.45)" />
//               <circle cx="52" cy="64" r="2" fill="rgba(236,253,245,0.45)" />
//               <circle cx="88" cy="88" r="2" fill="rgba(236,253,245,0.45)" />
//               <circle cx="112" cy="70" r="2" fill="rgba(236,253,245,0.45)" />
//               <path
//                 d="M66 54c0-6 7-10 14-10s14 4 14 10-7 10-14 10c-2 0-4-0.3-6-1l-5 3 2-5c-3-2-5-4-5-7z"
//                 fill="rgba(236,253,245,0.18)"
//               />
//             </pattern>
//             <linearGradient id="xb-vignette" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="0" stopColor="rgba(0,0,0,0.22)" />
//               <stop offset="1" stopColor="rgba(0,0,0,0.06)" />
//             </linearGradient>
//           </defs>
//           <rect width="100%" height="100%" fill="url(#xb-mesh)" />
//           {/* Diagonal corner accents (agenda-template inspired) */}
//           <polygon
//             points="320,0 320,120 230,0"
//             fill="rgba(52,211,153,0.20)"
//           />
//           <polygon
//             points="0,900 0,770 110,900"
//             fill="rgba(52,211,153,0.16)"
//           />
//           <rect width="100%" height="100%" fill="url(#xb-vignette)" />
//         </svg>
//       </div>

//       <div className="relative z-10 flex flex-col h-full">
//         {/* Logo */}
//         <div
//           className={`h-20 flex items-center ${
//             collapsed ? "justify-center" : "px-5"
//           } border-b border-[rgba(255,255,255,0.08)]`}
//         >
//           <div className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
//             <img
//               src="/logo/logo.svg"
//               alt="XploreByte Logo"
//               className={`${
//                 collapsed ? "h-10 w-10" : "h-9 w-9"
//               } drop-shadow-sm`}
//             />
//             {!collapsed && (
//               <div className="leading-tight">
//                 <h1 className="text-[15px] font-bold text-[rgba(255,255,255,0.92)] tracking-tight">
//                   XploreByte
//                 </h1>
//                 <p className="text-[11px] font-medium text-[rgba(255,255,255,0.62)]">
//                   WhatsApp Platform
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto py-4">
//           <nav className="space-y-5">
//             {sections.map(section => {
//               const visibleItems = section.items.filter(i => i.show);
//               if (visibleItems.length === 0) return null;

//               return (
//                 <div key={section.title}>
//                   {!collapsed ? (
//                     <div className="px-5 mb-2 flex items-center gap-3">
//                       <span className="text-[11px] font-bold tracking-wider uppercase text-[rgba(255,255,255,0.65)]">
//                         {section.title}
//                       </span>
//                       <span className="h-px flex-1 bg-[rgba(255,255,255,0.08)]" />
//                     </div>
//                   ) : (
//                     <div className="w-10 mx-auto h-px bg-[rgba(255,255,255,0.08)] mb-3" />
//                   )}

//                   <ul className={`space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
//                     {visibleItems.map(item => (
//                       <li key={item.path}>
//                         <NavLink
//                           to={item.path}
//                           className={({ isActive }) => {
//                             const base =
//                               "group relative flex transition-all duration-200 outline-none " +
//                               "focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 " +
//                               "focus-visible:ring-offset-[#064E3B]";

//                             const layout = collapsed
//                               ? "flex-col items-center justify-center h-12 w-16 mx-auto rounded-md"
//                               : "items-center gap-3 px-4 h-12 rounded-md";

//                             // ✅ Enterprise tweak:
//                             // - Active: subtle surface + strong left indicator (not a heavy filled block)
//                             // - Inactive: slightly dimmed for hierarchy
//                             // - Hover: gentle lift
//                             if (isActive) {
//                               return (
//                                 `${base} ${layout} ` +
//                                 "bg-[rgba(255,255,255,0.10)] " +
//                                 "before:content-[''] before:absolute before:left-0 before:top-[8px] before:bottom-[8px] " +
//                                 "before:w-[3px] before:bg-[#34D399]"
//                               );
//                             }

//                             return (
//                               `${base} ${layout} ` +
//                               "text-[rgba(255,255,255,0.86)] " +
//                               "hover:bg-[rgba(255,255,255,0.06)] hover:text-white " +
//                               "active:scale-[0.99]"
//                             );
//                           }}
//                         >
//                           {/* icon + collapsed label */}
//                           <span
//                             className={`flex ${collapsed ? "flex-col items-center" : "items-center"}`}
//                             title={collapsed ? item.label : undefined}
//                           >
//                             <span
//                               className="xb-iconbox flex items-center justify-center w-9 h-9 rounded-md
//                                          bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)]
//                                          group-hover:bg-[rgba(255,255,255,0.10)]
//                                          aria-[current=page]:bg-[rgba(255,255,255,0.12)]"
//                             >
//                               <span className="text-[rgba(255,255,255,0.85)]">
//                                 {item.icon}
//                               </span>
//                             </span>

//                             {collapsed && (
//                               <span className="text-[10px] font-semibold text-[rgba(255,255,255,0.70)] group-hover:text-white mt-0.5 leading-tight">
//                                 {item.short}
//                               </span>
//                             )}
//                           </span>

//                           {!collapsed && (
//                             <span className="text-sm font-semibold text-[rgba(255,255,255,0.90)] group-hover:text-white">
//                               {item.label}
//                             </span>
//                           )}
//                         </NavLink>
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               );
//             })}
//           </nav>
//         </div>

//         <button
//           onClick={() => setCollapsed(!collapsed)}
//           className="mx-3 mb-2 mt-auto flex items-center justify-center gap-2
//                      text-[rgba(255,255,255,0.72)] hover:text-white hover:bg-[rgba(255,255,255,0.06)]
//                      text-sm font-semibold transition-all duration-200 rounded-md py-2
//                      focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2
//                      focus-visible:ring-offset-[#064E3B]"
//           aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
//         >
//           {collapsed ? (
//             <ChevronRight size={18} className="text-[rgba(255,255,255,0.85)]" />
//           ) : (
//             <>
//               <ChevronLeft
//                 size={18}
//                 className="text-[rgba(255,255,255,0.85)]"
//               />
//               <span className="text-sm">Minimise</span>
//             </>
//           )}
//         </button>

//         <div className="text-center text-xs text-[rgba(255,255,255,0.62)] border-t border-[rgba(255,255,255,0.08)] p-3">
//           {!collapsed && "Powered by XploreByte"}
//         </div>
//       </div>
//     </aside>
//   );
// }

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
//     availableFeatures = {}, // { Dashboard:true, Messaging:true, ... } (legacy flags)
//     can, // (permCode) => boolean  ✅ entitlements-aware
//     hasAllAccess, // true if "*" or super on server
//     entLoading, // ✅ loading state for entitlements snapshot
//   } = useAuth();

//   if (isLoading) return null;

//   const safeRole = String(role || "").toLowerCase();
//   const isSuper = safeRole === "superadmin";
//   const superAccess = isSuper || !!hasAllAccess;
//   const iconSize = collapsed ? 22 : 18;

//   // ---------- helpers ----------
//   const hasFeature = key => !!availableFeatures[key];

//   const anyPerm = (codes = []) =>
//     superAccess
//       ? true
//       : codes.some(c => (typeof can === "function" ? can(c) : false));

//   // Workspaces – make superAccess always show
//   // const showDashboard = superAccess || hasFeature("Dashboard");
//   const showDashboard = true;

//   const showSuperAdmin =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.superadmin || []));

//   // ✅ Messaging workspace – now using shared WORKSPACE_PERMS
//   const showMessaging =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.messaging || []));

//   // ✅ Campaigns workspace – same shared source
//   const showCampaigns =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.campaigns || []));

//   // ✅ Automation workspace – same shared source
//   const showAutomation =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.automation || []));

//   // ✅ TemplateBuilder workspace – same shared source
//   const showTemplateBuilder =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.templates || []));

//   // ✅ catalog workspace – same shared source
//   const showCatalog =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.catalog || []));

//   // ✅ catalog workspace – same shared source
//   const showCRM =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.crm || []));

//   // ✅ catalog workspace – same shared source
//   const showInbox =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.inbox || []));

//   const showSettings =
//     superAccess || (!entLoading && anyPerm(WORKSPACE_PERMS.settings || []));

//   // ✅ Settings workspace: show if user has settings.* or whatsappsettings, or a Settings feature flag

//   const sections = [
//     {
//       title: "Workspaces",
//       items: [
//         {
//           label: "Dashboard",
//           short: "Dashboard",
//           path: "/app/welcomepage",
//           icon: <ChartArea size={iconSize} />,
//           show: showDashboard,
//         },
//         {
//           label: "CRM",
//           short: "CRM",
//           path: "/app/crm",
//           icon: <UsersRound size={iconSize} />,
//           show: showCRM,
//         },
//         {
//           label: "Campaigns",
//           short: "Campaigns",
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
//           label: "Message",
//           short: "Messaging",
//           path: "/app/messaging",
//           icon: <MessageSquare size={iconSize} />,
//           show: showMessaging, // ✅ now truly tied to plan grants
//         },
//         {
//           label: "Template Builder",
//           short: "Template",
//           path: "/app/templatebuilder",
//           icon: <Bot size={iconSize} />,
//           show: showTemplateBuilder,
//         },
//         {
//           label: "Automation",
//           short: "Automation",
//           path: "/app/automation",
//           icon: <Bot size={iconSize} />,
//           show: showAutomation,
//         },
//         {
//           label: "Inbox",
//           short: "Inbox",
//           path: "/app/inbox",
//           icon: <Inbox size={iconSize} />,
//           show: showInbox,
//         },
//         {
//           label: "Admin",
//           short: "Admin",
//           path: "/app/admin",
//           icon: <ShieldCheck size={iconSize} />,
//           show: showSuperAdmin,
//         },
//       ],
//     },

//     {
//       title: "My Account",
//       items: [
//         {
//           label: "Settings",
//           short: "Settings",
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
//         collapsed ? "w-20" : "w-64"
//       } relative overflow-hidden bg-gradient-to-b from-[#064E3B] to-[#065F46] shadow-lg border-r border-[rgba(255,255,255,0.08)] flex flex-col transition-all duration-300 h-screen`}
//     >
//       {/* Subtle messaging/automation pattern overlay */}
//       <div className="absolute inset-0 pointer-events-none opacity-[0.05]">
//         <svg
//           className="w-full h-full"
//           viewBox="0 0 320 900"
//           preserveAspectRatio="none"
//           aria-hidden="true"
//         >
//           <defs>
//             <pattern
//               id="xb-mesh"
//               width="120"
//               height="120"
//               patternUnits="userSpaceOnUse"
//             >
//               <path
//                 d="M12 24 L48 12 L78 34 L108 18"
//                 stroke="rgba(236,253,245,0.35)"
//                 strokeWidth="1"
//                 fill="none"
//               />
//               <path
//                 d="M18 86 L52 64 L88 88 L112 70"
//                 stroke="rgba(236,253,245,0.28)"
//                 strokeWidth="1"
//                 fill="none"
//               />
//               <circle cx="12" cy="24" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="48" cy="12" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="78" cy="34" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="108" cy="18" r="2" fill="rgba(236,253,245,0.55)" />
//               <circle cx="18" cy="86" r="2" fill="rgba(236,253,245,0.45)" />
//               <circle cx="52" cy="64" r="2" fill="rgba(236,253,245,0.45)" />
//               <circle cx="88" cy="88" r="2" fill="rgba(236,253,245,0.45)" />
//               <circle cx="112" cy="70" r="2" fill="rgba(236,253,245,0.45)" />
//               {/* tiny "message bubble" hint */}
//               <path
//                 d="M66 54c0-6 7-10 14-10s14 4 14 10-7 10-14 10c-2 0-4-0.3-6-1l-5 3 2-5c-3-2-5-4-5-7z"
//                 fill="rgba(236,253,245,0.18)"
//               />
//             </pattern>
//             <linearGradient id="xb-vignette" x1="0" y1="0" x2="0" y2="1">
//               <stop offset="0" stopColor="rgba(0,0,0,0.25)" />
//               <stop offset="1" stopColor="rgba(0,0,0,0.05)" />
//             </linearGradient>
//           </defs>
//           <rect width="100%" height="100%" fill="url(#xb-mesh)" />
//           <rect width="100%" height="100%" fill="url(#xb-vignette)" />
//         </svg>
//       </div>

//       <div className="relative z-10 flex flex-col h-full">
//         {/* Logo */}
//         <div
//           className={`h-20 flex items-center ${
//             collapsed ? "justify-center" : "px-5"
//           } border-b border-[rgba(255,255,255,0.08)]`}
//         >
//           <div className={`flex items-center ${collapsed ? "" : "gap-3"}`}>
//             <img
//               src="/logo/logo.svg"
//               alt="XploreByte Logo"
//               className={`${
//                 collapsed ? "h-10 w-10" : "h-9 w-9"
//               } drop-shadow-sm`}
//             />
//             {!collapsed && (
//               <div className="leading-tight">
//                 <h1 className="text-[15px] font-bold text-[rgba(255,255,255,0.92)] tracking-tight">
//                   XploreByte
//                 </h1>
//                 <p className="text-[11px] font-semibold text-[rgba(255,255,255,0.65)]">
//                   WhatsApp Platform
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>

//         <div className="flex-1 overflow-y-auto py-4">
//           <nav className="space-y-5">
//             {sections.map(section => {
//               const visibleItems = section.items.filter(i => i.show);
//               if (visibleItems.length === 0) return null;

//               return (
//                 <div key={section.title}>
//                   {!collapsed ? (
//                     <div className="px-5 mb-2 flex items-center gap-3">
//                       <span className="text-[11px] font-bold tracking-wider uppercase text-[rgba(255,255,255,0.65)]">
//                         {section.title}
//                       </span>
//                       <span className="h-px flex-1 bg-[rgba(255,255,255,0.08)]" />
//                     </div>
//                   ) : (
//                     <div className="w-10 mx-auto h-px bg-[rgba(255,255,255,0.08)] mb-3" />
//                   )}

//                   <ul className={`space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
//                     {visibleItems.map(item => (
//                       <li key={item.path}>
//                         <NavLink
//                           to={item.path}
//                           className={({ isActive }) => {
//                             const base =
//                               "group relative flex transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#064E3B]";

//                             const layout = collapsed
//                               ? "flex-col items-center justify-center h-11 w-16 mx-auto rounded-md"
//                               : "items-center gap-3 px-4 h-11 rounded-md";

//                             if (isActive) {
//                               return `${base} ${layout} bg-[rgba(255,255,255,0.10)] text-white [&_*]:text-white before:content-[''] before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-[#34D399]`;
//                             }

//                             return `${base} ${layout} text-[rgba(255,255,255,0.92)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white hover:[&_*]:text-white`;
//                           }}
//                         >
//                           <span
//                             className="flex flex-col items-center"
//                             title={collapsed ? item.label : undefined}
//                           >
//                             <span className="text-[rgba(255,255,255,0.85)]">
//                               {item.icon}
//                             </span>
//                             {collapsed && (
//                               <span className="text-[10px] font-semibold text-[rgba(255,255,255,0.75)] mt-0.5 leading-tight">
//                                 {item.short}
//                               </span>
//                             )}
//                           </span>

//                           {!collapsed && (
//                             <span className="text-sm font-semibold text-[rgba(255,255,255,0.92)]">
//                               {item.label}
//                             </span>
//                           )}
//                         </NavLink>
//                       </li>
//                     ))}
//                   </ul>
//                 </div>
//               );
//             })}
//           </nav>
//         </div>

//         <button
//           onClick={() => setCollapsed(!collapsed)}
//           className="mx-3 mb-2 mt-auto flex items-center justify-center gap-2 text-[rgba(255,255,255,0.75)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] text-sm font-semibold transition-all duration-200 rounded-md py-2 focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#064E3B]"
//           aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
//         >
//           {collapsed ? (
//             <ChevronRight size={18} className="text-[rgba(255,255,255,0.85)]" />
//           ) : (
//             <>
//               <ChevronLeft size={18} className="text-[rgba(255,255,255,0.85)]" />
//               <span className="text-sm">Minimise</span>
//             </>
//           )}
//         </button>

//         <div className="text-center text-xs text-[rgba(255,255,255,0.65)] border-t border-[rgba(255,255,255,0.08)] p-3">
//           {!collapsed && "Powered by XploreByte"}
//         </div>
//       </div>
//     </aside>
//   );
// }

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
