import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import React, { Suspense, lazy } from "react";
import Loader2 from "lucide-react/dist/esm/icons/loader-2"; // Lean import for initial load

// Auth provider (server-authoritative session/claims)
// import { AuthProvider } from "./app/providers/AuthProvider";
import AuthProvider from "./app/providers/AuthProvider";
import ProtectedRoute from "./app/routes/guards/ProtectedRoute";
import AdminRouteGuard from "./app/routes/guards/AdminRouteGuard";
import FeatureGuard from "./capabilities/FeatureGuard";

import { FK } from "./capabilities/featureKeys";

// Public Pages
import Login from "./pages/auth/Login";
import BusinessSignup from "./pages/auth/BusinessSignup";
import SignupForTrial from "./pages/auth/SignupForTrial";
import PendingApproval from "./pages/auth/PendingApproval";
import NoAccess from "./pages/NoAccess";

// Layout
import AppLayout from "./components/layout/AppLayout";
import WelcomeCenter from "./components/WelcomeCenter";
import AppHomeRoute from "./app/routes/AppHomeRoute";

// Campaigns
import CTAManagement from "./pages/CTAManagement/CTAManagement";
import ImageCampaignDetailPage from "./pages/Campaigns/ImageCampaignDetailPage";
import ImageCampaignEditPage from "./pages/Campaigns/ImageCampaignEditPage";
import AssignContactsPage from "./pages/Campaigns/AssignContactsPage";
import RecipientsListPage from "./pages/Campaigns/components/RecipientsListPage";
import CampaignProgressPage from "./pages/Monitoring/CampaignProgressPage";
import FlowAnalyticsDashboard from "./pages/FlowAnalytics/FlowAnalyticsDashboard";
import CampaignLogReportPage from "./pages/CampaignReports/CampaignLogReportPage";
import CampaignBucketContactsPage from "./pages/CampaignReports/CampaignBucketContactsPage";
import CampaignRetargetWizardPage from "./pages/CampaignReports/CampaignRetargetWizardPage";
// Messaging
import SendTextMessagePage from "./pages/WhatsAppMessageEngine/SendContentFreeTextMessage";
import TemplateMessagingComingSoon from "./pages/Messaging/TemplateMessagingComingSoon";
import MessagingReportsComingSoon from "./pages/Messaging/MessagingReportsComingSoon";

// Inbox & Automation
import AutoReplyBuilder from "./pages/AutoReplyBuilder/AutoReplyBuilder";
import CTAFlowVisualBuilder from "./pages/CTAFlowVisualBuilder/CTAFlowVisualBuilder";
import CTAFlowManager from "./pages/CTAFlowVisualBuilder/CTAFlowManager";

// Admin Tools / Access Control
import UserPermissionOverrides from "./pages/admin/FeatureAccess/UserPermissionOverrides";
import PermissionsPage from "./pages/admin/AccessControl/PermissionsPage";
import PermissionCatalog from "./pages/admin/PermissionCatalog/PermissionCatalog";

// Tracking / Webhooks
import FailedWebhookLogs from "./pages/Tracking/FailedWebhookLogs";

// Template Builder
import LibraryBrowsePage from "./pages/TemplateBuilder/LibraryBrowsePage";
import DraftEditorPage from "./pages/TemplateBuilder/DraftEditorPage";
import ApprovedTemplatesPage from "./pages/TemplateBuilder/ApprovedTemplatesPage";
import TemplateBuilderLayout from "./pages/TemplateBuilder/TemplateBuilderLayout";
import DraftsListPage from "./pages/TemplateBuilder/DraftsListPage";

// Payment / Billing
import BillingPage from "./pages/Payment/BillingPage";

import Checkout from "./pages/Payment/CheckoutPage";
import PaymentStatusPage from "./pages/Payment/PaymentStatusPage";

// WhatsApp / Meta Settings
import WhatsAppSettings from "./pages/WhatsAppSettings/WhatsAppSettings";
import MetaAccountManagement from "./pages/MetaAccount/MetaAccountManagement";
import EsuProcessingPage from "./pages/ESU/EsuProcessingPage";

// Account Insights (Admin analytics for accounts)
import AccountDashboard from "./pages/AccountInsights/AccountDashboard";
import AccountFunnels from "./pages/AccountInsights/AccountFunnels";
import AccountAlerts from "./pages/AccountInsights/AccountAlerts";
import AccountsMasterReport from "./pages/AccountInsights/AccountReports/AccountsMasterReport";
import LifecycleStageReport from "./pages/AccountInsights/AccountReports/LifecycleStageReport";
import TrialPerformanceReport from "./pages/AccountInsights/AccountReports/TrialPerformanceReport";
import RiskRecoveryReport from "./pages/AccountInsights/AccountReports/RiskRecoveryReport";
import ReportsIndex from "./pages/AccountInsights/AccountReports/ReportsIndex";

// Misc
import ProfileCompletion from "./pages/Businesses/ProfileCompletion";
import UpgradePlanPage from "./pages/Plans/UpgradePlanPage";
import PreviewTest from "./pages/PreviewTest";
import Forbidden403 from "./pages/errors/Forbidden403";
import EsuDebugPage from "./pages/DevTools/EsuDebugPage";
import MessageLogsReport from "./pages/reports/MessageLogsReport";

// Global upgrade modal & helpers
import UpgradeModal from "./components/UpgradeModal";
import { EntitlementsProvider } from "./app/providers/EntitlementsProvider";
import { WORKSPACE_PERMS } from "./capabilities/workspacePerms";
import AccessDebugger from "./dev/AccessDebugger";
import MyAccountWorkspace from "./pages/Workspaces/MyAccountWorkspace";
import WelcomePage from "./pages/WelcomePages/WelcomePage";

// Audit / Logs
import FlowExecutionExplorer from "./pages/Auditing/FlowExecutionsExplorer";
import DeveloperNotesPage from "./pages/DeveloperNotes/DeveloperNotesPage";

// import { Tag } from "lucide-react";
import TeamStaffPage from "./pages/TeamStaff/TeamStaffPage";
import AccessControlPage from "./pages/Settings/AccessControl/RolePermissionMapping";
import ChangePasswordPage from "./pages/Settings/Password/ChangePasswordPage";

const isDev = process.env.NODE_ENV === "development";

// --- Lazy loaded components ---
const CrmWorkspacePage = lazy(() => import("./pages/Workspaces/CrmWorkspacePage"));
const CatalogWorkspacePage = lazy(() => import("./pages/Workspaces/CatalogWorkspacePage"));
const CampaignWorkspacePage = lazy(() => import("./pages/Workspaces/CampaignWorkspacePage"));
const AdminWorkspacePage = lazy(() => import("./pages/Workspaces/AdminWorkspacePage"));
const MessagingWorkspacePage = lazy(() => import("./pages/Workspaces/MessagingWorkspacePage"));
const AutomationWorkspace = lazy(() => import("./pages/Workspaces/AutomationWorkspace"));
const InboxWorkspace = lazy(() => import("./pages/Workspaces/InboxWorkspace"));
const TemplateBuilderWorkspacePage = lazy(() => import("./pages/Workspaces/TemplateBuilderWorkspacePage"));

const Contacts = lazy(() => import("./pages/CRM/Contacts/Contacts"));
const AttributesPage = lazy(() => import("./pages/CustomFields/AttributesPage"));
const Reminders = lazy(() => import("./pages/CRM/Reminders/Reminders"));
const NotesWrapper = lazy(() => import("./pages/CRM/Notes/NotesWrapper"));
const LeadTimeline = lazy(() => import("./pages/CRM/Timeline/LeadTimeline"));
const Tags = lazy(() => import("./pages/CRM/Tags/Tags"));
const Contact360 = lazy(() => import("./pages/CRM/Contact360/Contact360"));

const ProductCatalog = lazy(() => import("./pages/Businesses/ProductCatalog"));
const ProductForm = lazy(() => import("./pages/Businesses/ProductForm"));
const BusinessApprovals = lazy(() => import("./pages/Businesses/BusinessApprovals"));

const CampaignBuilderPage = lazy(() => import("./pages/Campaigns/CampaignBuilderPage"));
const CampaignSendLogs = lazy(() => import("./pages/Campaigns/CampaignSendLogs"));
const TemplateCampaignList = lazy(() => import("./pages/Campaigns/TemplateCampaignList"));

const ChatInbox = lazy(() => import("./pages/ChatInbox/ChatInbox"));
const InboxWrapper = lazy(() => import("./pages/Inbox/InboxWrapper"));

const WebhookSettings = lazy(() => import("./pages/Tracking/WebhookSettings"));
const PlanManagementPage = lazy(() => import("./pages/admin/FeatureAccess/PlanManagement"));

// Helper for root suspense
const RootLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50/50">
    <Loader2 className="animate-spin text-emerald-600" size={32} />
  </div>
);

// --- Helper Components ---
function DashboardRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/app/welcomepage${search}`} replace />;
}

function App() {
  return (
    <AuthProvider>
      {/* Wrap entire app tree with EntitlementsProvider */}
      <EntitlementsProvider>
        <Suspense fallback={<RootLoader />}>
          <Routes>
          {/* ---------- Public Routes ---------- */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<BusinessSignup />} />
          <Route path="/signup-for-trial" element={<SignupForTrial />} />
          <Route path="/pending-approval" element={<PendingApproval />} />
          <Route path="/no-access" element={<NoAccess />} />

          {/* ---------- Protected App Routes (Layout + Workspaces) ---------- */}
          <Route
            path="/app/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Home / errors */}
            <Route index element={<AppHomeRoute />} />
            <Route path="403" element={<Forbidden403 />} />
            <Route path="payment/status" element={<PaymentStatusPage />} />
            <Route path="billing/checkout" element={<Checkout />} />
            <Route path="upgrade" element={<UpgradePlanPage />} />

            <Route path="settings/billing" element={<BillingPage />} />
            <Route path="preview-test" element={<PreviewTest />} />

            {/* ===== Core Workspaces ===== */}

            {/* Welcome + Dashboard */}
            <Route
              path="dashboard"
              element={<DashboardRedirect />}
            />
            <Route path="welcome" element={<WelcomeCenter />} />
            <Route path="welcomepage" element={<WelcomePage />} />
            <Route path="esu-processing" element={<EsuProcessingPage />} />

            {/* ----- CRM Workspace + child routes ----- */}
            <Route
              path="crm"
              element={
                <FeatureGuard codes={WORKSPACE_PERMS.crm}>
                  <CrmWorkspacePage />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/contacts"
              element={
                <FeatureGuard code={FK.CRM_CONTACT_VIEW}>
                  <Contacts />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/attributes"
              element={
                <FeatureGuard codes={FK.CRM_ATTRIBUTE_VIEW}>
                  <AttributesPage />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/contacts/:contactId"
              element={
                <FeatureGuard code={FK.CRM_CONTACT_VIEW}>
                  <Contact360 />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/tags"
              element={
                <FeatureGuard code={FK.CRM_TAGS_VIEW}>
                  <Tags />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/reminders"
              element={
                <FeatureGuard code={FK.CRM_REMINDERS_VIEW}>
                  <Reminders />
                </FeatureGuard>
              }
            />

            <Route
              path="crm/timeline"
              element={
                <FeatureGuard code={FK.CRM_TIMELINE_VIEW}>
                  <LeadTimeline />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/notes"
              element={
                <FeatureGuard code={FK.CRM_NOTES_VIEW}>
                  <NotesWrapper />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/contacts/:contactId/notes"
              element={
                <FeatureGuard code={FK.CRM_NOTES_VIEW}>
                  <NotesWrapper />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/contacts/:contactId/timeline"
              element={
                <FeatureGuard code={FK.CRM_TIMELINE_VIEW}>
                  <LeadTimeline />
                </FeatureGuard>
              }
            />

            {/* ----- Catalog Workspace + child routes ----- */}
            <Route
              path="catalog"
              element={
                <FeatureGuard codes={WORKSPACE_PERMS.catalog}>
                  <CatalogWorkspacePage />
                </FeatureGuard>
              }
            />
            <Route
              path="catalog/products"
              element={
                <FeatureGuard code={FK.CATALOG_VIEW}>
                  <ProductCatalog />
                </FeatureGuard>
              }
            />
            <Route
              path="catalog/form"
              element={
                <FeatureGuard code={FK.CATALOG_CREATE}>
                  <ProductForm />
                </FeatureGuard>
              }
            />
            <Route
              path="catalog/form/:productId"
              element={
                <FeatureGuard code={FK.CATALOG_CREATE}>
                  <ProductForm />
                </FeatureGuard>
              }
            />

            {/* ----- Messaging Workspace + child routes ----- */}
            {/* ----- Messaging Workspace + child routes ----- */}
            <Route
              path="messaging"
              element={
                <FeatureGuard codes={WORKSPACE_PERMS.messaging}>
                  {/* fallback={<Navigate to="/no-access" replace />}
                > */}
                  <MessagingWorkspacePage />
                </FeatureGuard>
              }
            />
            <Route
              path="messaging/send-direct-text"
              element={
                <FeatureGuard code={FK.MESSAGING_SEND_TEXT}>
                  <SendTextMessagePage />
                </FeatureGuard>
              }
            />
            <Route
              path="messaging/send-template-message"
              element={
                <FeatureGuard code={FK.MESSAGING_SEND_TEMPLATE}>
                  <TemplateMessagingComingSoon />
                </FeatureGuard>
              }
            />
            <Route
              path="messaging/reports"
              element={
                <FeatureGuard code={FK.MESSAGING_REPORT_VIEW}>
                  <MessagingReportsComingSoon />
                </FeatureGuard>
              }
            />

            {/* ----- Campaigns Workspace + child routes ----- */}
            <Route
              path="campaigns"
              element={
                <FeatureGuard codes={WORKSPACE_PERMS.campaigns}>
                  <CampaignWorkspacePage />
                </FeatureGuard>
              }
            />

            {/* Campaigns subroutes */}
            <Route
              path="campaigns/cta-management"
              element={
                <FeatureGuard code={FK.CAMPAIGN_CTA_MANAGEMENT}>
                  <CTAManagement />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/image-campaigns/:id"
              element={
                <FeatureGuard code={FK.CAMPAIGN_LIST_VIEW}>
                  <ImageCampaignDetailPage />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/image-campaigns/:id/edit"
              element={
                <FeatureGuard code={FK.CAMPAIGN_BUILDER}>
                  <ImageCampaignEditPage />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/image-campaigns/assign-contacts/:id"
              element={
                <FeatureGuard code={FK.CAMPAIGN_BUILDER}>
                  <AssignContactsPage />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/image-campaigns/assigned-contacts/:id"
              element={
                <FeatureGuard code={FK.CAMPAIGN_LIST_VIEW}>
                  <RecipientsListPage />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/template-campaign-builder"
              element={
                <FeatureGuard code={FK.CAMPAIGN_BUILDER}>
                  <CampaignBuilderPage />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/template-campaigns-list"
              element={
                <FeatureGuard code={FK.CAMPAIGN_LIST_VIEW}>
                  <TemplateCampaignList />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/logs/:campaignId"
              element={
                <FeatureGuard code={FK.CAMPAIGN_STATUS_VIEW}>
                  <CampaignSendLogs />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/messagelogs"
              element={
                <FeatureGuard code={FK.CAMPAIGN_STATUS_VIEW}>
                  <MessageLogsReport />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/:campaignId/progress"
              element={<CampaignProgressPage />}
            />

            <Route
              path="campaigns/:campaignId/reports/logs"
              element={<CampaignLogReportPage />}
            />

            <Route
              path="campaigns/:campaignId/reports/:bucket"
              element={<CampaignBucketContactsPage />}
            />

            <Route
              path="campaigns/:campaignId/reports/retarget"
              element={<CampaignRetargetWizardPage />}
            />
            <Route
              path="campaigns/:campaignId/reports/logs"
              element={<CampaignLogReportPage />}
            />

            <Route
              path="campaigns/:campaignId/reports/:bucket"
              element={<CampaignBucketContactsPage />}
            />

            <Route
              path="campaigns/:campaignId/reports/retarget"
              element={<CampaignRetargetWizardPage />}
            />

            {/* ----- Inbox Workspace + child routes ----- */}
            <Route
              path="inbox"
              element={
                <FeatureGuard codes={WORKSPACE_PERMS.inbox}>
                  <InboxWorkspace />
                </FeatureGuard>
              }
            />
            <Route
              path="inbox/livechat"
              element={
                <FeatureGuard code={FK.INBOX_VIEW}>
                  <InboxWrapper />
                </FeatureGuard>
              }
            />
            <Route
              path="inbox/chatinbox"
              element={
                <FeatureGuard code={FK.INBOX_CHAT_VIEW}>
                  <ChatInbox />
                </FeatureGuard>
              }
            />

            {/* ----- Automation Workspace + flows ----- */}
            <Route
              path="automation"
              element={
                <FeatureGuard codes={WORKSPACE_PERMS.automation}>
                  <AutomationWorkspace />
                </FeatureGuard>
              }
            />
            <Route
              path="automation/auto-reply-builder"
              element={
                <FeatureGuard code={FK.AUTOMATION_CREATE_BOT}>
                  <AutoReplyBuilder />
                </FeatureGuard>
              }
            />
            {/* Flow Builder direct routes */}
            <Route
              path="cta-flow/visual-builder"
              element={
                <FeatureGuard code={FK.AUTOMATION_CREATE_TEMPLATE_FLOW}>
                  <CTAFlowVisualBuilder />
                </FeatureGuard>
              }
            />

            <Route
              path="cta-flow/flow-manager"
              element={
                <FeatureGuard code={FK.AUTOMATION_VIEW_FLOW_MANAGE}>
                  <CTAFlowManager />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/FlowAnalyticsDashboard"
              element={
                <FeatureGuard code={FK.AUTOMATION_VIEW_FLOW_ANALYTICS}>
                  <FlowAnalyticsDashboard />
                </FeatureGuard>
              }
            />

            {/* ----- Template Builder Workspace + routes (under /app) ----- */}

            <Route
              path="templatebuilder"
              element={
                <FeatureGuard codes={WORKSPACE_PERMS.templates}>
                  <TemplateBuilderWorkspacePage />
                </FeatureGuard>
              }
            />

            {/* Unified Template Builder Layout */}
            <Route path="template-builder" element={<TemplateBuilderLayout />}>
              <Route index element={<Navigate to="library" replace />} />

              <Route
                path="library"
                element={
                  <FeatureGuard code={FK.TEMPLATE_BUILDER_LIBRARY_BROWSE}>
                    <LibraryBrowsePage />
                  </FeatureGuard>
                }
              />
              <Route
                path="drafts"
                element={
                  <FeatureGuard code={FK.TEMPLATE_BUILDER_CREATE_DRAFT}>
                    <DraftsListPage />
                  </FeatureGuard>
                }
              />
              <Route
                path="pending"
                element={
                  <FeatureGuard
                    code={FK.TEMPLATE_BUILDER_APPROVED_TEMPLATES_VIEW}
                  >
                    <ApprovedTemplatesPage forcedStatus="PENDING" />
                  </FeatureGuard>
                }
              />
              <Route
                path="approved"
                element={
                  <FeatureGuard
                    code={FK.TEMPLATE_BUILDER_APPROVED_TEMPLATES_VIEW}
                  >
                    <ApprovedTemplatesPage />
                  </FeatureGuard>
                }
              />
            </Route>

            <Route
              path="template-builder/drafts/:draftId"
              element={
                <FeatureGuard code={FK.TEMPLATE_BUILDER_CREATE_DRAFT}>
                  <DraftEditorPage />
                </FeatureGuard>
              }
            />
            <Route
              path="template-builder/drafts/:draftId"
              element={
                <FeatureGuard code={FK.TEMPLATE_BUILDER_CREATE_DRAFT}>
                  <DraftEditorPage />
                </FeatureGuard>
              }
            />
            {/* ----- Settings Workspace + child routes ----- */}
            <Route
              path="settings"
              element={
                <FeatureGuard codes={WORKSPACE_PERMS.settings}>
                  <MyAccountWorkspace />
                </FeatureGuard>
              }
            />
            <Route
              path="settings/whatsapp"
              element={
                <FeatureGuard code={FK.SETTINGS_WHATSAPP_SETTINGS_VIEW}>
                  <WhatsAppSettings />
                </FeatureGuard>
              }
            />
            <Route
              path="settings/meta-account"
              element={
                <FeatureGuard code={FK.SETTINGS_META_ACCOUNT_MANAGEMENT}>
                  <MetaAccountManagement />
                </FeatureGuard>
              }
            />

            <Route
              path="settings/team-management"
              element={
                <FeatureGuard code={FK.SETTINGS_STAFF_MANAGEMENT}>
                  <TeamStaffPage />
                </FeatureGuard>
              }
            />

            <Route
              path="settings/role-permission-mapping"
              element={
                <FeatureGuard code={FK.SETTINGS_ROLE_PERMISSIONS_MAPPING}>
                  <AccessControlPage />
                </FeatureGuard>
              }
            />

            {/* <Route
              path="settings/billing"
              element={
                <FeatureGuard featureKey={FK.SETTINGS_BILLING_VIEW}>
                  <BillingPage />
                </FeatureGuard>
              }
            /> */}

            <Route
              path="settings/checkout"
              element={
                <FeatureGuard code={FK.SETTINGS_BILLING_VIEW}>
                  <Checkout />
                </FeatureGuard>
              }
            />
            <Route
              path="settings/profile-completion"
              element={
                <FeatureGuard code={FK.SETTINGS_PROFILE_UPDATE}>
                  <ProfileCompletion />
                </FeatureGuard>
              }
            />
            <Route
              path="settings/password"
              element={
                <FeatureGuard codes={WORKSPACE_PERMS.settings}>
                  <ChangePasswordPage />
                </FeatureGuard>
              }
            />
            {/* ----- Admin Workspace + tools ----- */}
            {/* ----- Admin Workspace + tools ----- */}
            <Route
              path="admin"
              element={
                <AdminRouteGuard>
                  <FeatureGuard codes={WORKSPACE_PERMS.superadmin}>
                    <AdminWorkspacePage />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/approvals"
              element={
                <FeatureGuard code={FK.SUPER_ADMIN_NEW_BUSINESS_APPROVAL}>
                  <BusinessApprovals />
                </FeatureGuard>
              }
            />
            {/* NEW: User Permission Overrides (Admin-only) */}
            <Route
              path="admin/user-permissions"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_USER_MANAGEMENT_VIEW}>
                    <UserPermissionOverrides />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/plan-management"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_PLAN_MANAGER_VIEW}>
                    <PlanManagementPage />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />

            {/* NEW: Permissions admin UI */}
            <Route
              path="admin/permissions"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_PLAN_PERMISSIONS_LIST}>
                    <PermissionsPage />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            {/* (Unused here but imported) */}
            <Route
              path="admin/permission-catalog"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_PLAN_PERMISSIONS_LIST}>
                    <PermissionCatalog />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />

            {/* ----- Account Insights (Admin-only cross-account intelligence) ----- */}
            <Route
              path="admin/account-insights"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_SIGNUP_REPORT_VIEW}>
                    <AccountDashboard />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/funnels"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_SIGNUP_REPORT_VIEW}>
                    <AccountFunnels />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/alerts"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_SIGNUP_REPORT_VIEW}>
                    <AccountAlerts />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/esu-debug"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_ESU_DEBUG}>
                    <EsuDebugPage />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            {/* Account Insights - Detailed Reports */}
            <Route
              path="admin/account-insights/account-reports"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_BUSINESS_OVERVIEW}>
                    <ReportsIndex />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/account-reports/accounts-master"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_BUSINESS_OVERVIEW}>
                    <AccountsMasterReport />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/account-reports/lifecycle"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_BUSINESS_OVERVIEW}>
                    <LifecycleStageReport />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/account-reports/trials"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_BUSINESS_OVERVIEW}>
                    <TrialPerformanceReport />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/account-reports/risk"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_BUSINESS_OVERVIEW}>
                    <RiskRecoveryReport />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/webhooks/monitor"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_WEBHOOK_MONITOR}>
                    <WebhookSettings />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/webhooks/failedlog"
              element={
                <AdminRouteGuard>
                  <FeatureGuard code={FK.SUPER_ADMIN_WEBHOOK_MONITOR}>
                    <FailedWebhookLogs />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />

            <Route
              path="admin/audit/execution-explorer"
              element={
                <AdminRouteGuard>
                  <FeatureGuard
                    code={FK.SUPER_ADMIN_FLOW_EXECUTION_EXPLORER_VIEW}
                  >
                    <FlowExecutionExplorer />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />

            <Route
              path="admin/developer-notes"
              element={
                <AdminRouteGuard>
                  <FeatureGuard codes={WORKSPACE_PERMS.superadmin}>
                    <DeveloperNotesPage />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
          </Route>
        </Routes>

        {/* Toasts */}
        <ToastContainer
          position="top-right"
          autoClose={2000}
          hideProgressBar={true}
          newestOnTop
          closeOnClick
          pauseOnHover={false}
          pauseOnFocusLoss={false}
          draggable
          closeButton={false}
          theme="colored"
        />

        {/* Global upgrade modal for feature/quota denials */}
        <UpgradeModal />
        {isDev && <AccessDebugger />}
        </Suspense>
      </EntitlementsProvider>
    </AuthProvider>
  );
}

export default App;
