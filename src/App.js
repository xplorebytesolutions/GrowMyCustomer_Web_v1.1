// 📄 File: src/App.jsx

import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Auth provider (server-authoritative session/claims)
// import { AuthProvider } from "./app/providers/AuthProvider";
import AuthProvider from "./app/providers/AuthProvider";
// 🔐 Guards
import ProtectedRoute from "./app/routes/guards/ProtectedRoute";
import AdminRouteGuard from "./app/routes/guards/AdminRouteGuard";
import FeatureGuard from "./capabilities/FeatureGuard";

// 🔑 Permission Keys (codes)
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

// Workspaces
import CrmWorkspacePage from "./pages/Workspaces/CrmWorkspacePage";
import CatalogWorkspacePage from "./pages/Workspaces/CatalogWorkspacePage";
import CampaignWorkspacePage from "./pages/Workspaces/CampaignWorkspacePage";
import AdminWorkspacePage from "./pages/Workspaces/AdminWorkspacePage";
import InsightsWorkspacePage from "./pages/Workspaces/InsightsWorkspacePage";
import MessagingWorkspacePage from "./pages/Workspaces/MessagingWorkspacePage";
import AutomationWorkspace from "./pages/Workspaces/AutomationWorkspace";
import InboxWorkspace from "./pages/Workspaces/InboxWorkspace";
import TemplateBuilderWorkspacePage from "./pages/Workspaces/TemplateBuilderWorkspacePage";

// CRM
import Contacts from "./pages/CRM/Contacts/Contacts";

import Reminders from "./pages/CRM/Reminders/Reminders";
import NotesWrapper from "./pages/CRM/Notes/NotesWrapper";
import LeadTimeline from "./pages/CRM/Timeline/LeadTimeline";
import TagList from "./pages/CRM/Tags/TagList";

import Contact360 from "./pages/CRM/Contact360/Contact360";
// Catalog
import ProductCatalog from "./pages/Businesses/ProductCatalog";
import ProductForm from "./pages/Businesses/ProductForm";
import CatalogDashboard from "./pages/Businesses/CatalogDashboard";
import BusinessApprovals from "./pages/Businesses/BusinessApprovals";

// Campaigns
import CampaignSendLogs from "./pages/Campaigns/CampaignSendLogs";
import CTAManagement from "./pages/CTAManagement/CTAManagement";
import ImageCampaignDetailPage from "./pages/Campaigns/ImageCampaignDetailPage";
import ImageCampaignEditPage from "./pages/Campaigns/ImageCampaignEditPage";
import AssignContactsPage from "./pages/Campaigns/AssignContactsPage";
import RecipientsListPage from "./pages/Campaigns/components/RecipientsListPage";
import CampaignBuilderPage from "./pages/Campaigns/CampaignBuilderPage";
import TemplateCampaignList from "./pages/Campaigns/TemplateCampaignList";
import CampaignProgressPage from "./pages/Monitoring/CampaignProgressPage";
import FlowAnalyticsDashboard from "./pages/FlowAnalytics/FlowAnalyticsDashboard";

// Messaging
import SendTextMessagePage from "./pages/WhatsAppMessageEngine/SendContentFreeTextMessage";
import TemplateMessagingComingSoon from "./pages/Messaging/TemplateMessagingComingSoon";
import MessagingReportsComingSoon from "./pages/Messaging/MessagingReportsComingSoon";

// Inbox & Automation
import InboxWrapper from "./pages/Inbox/InboxWrapper";
import ChatInbox from "./pages/ChatInbox/ChatInbox";
import AutoReplyBuilder from "./pages/AutoReplyBuilder/AutoReplyBuilder";
import CTAFlowVisualBuilder from "./pages/CTAFlowVisualBuilder/CTAFlowVisualBuilder";
import CTAFlowManager from "./pages/CTAFlowVisualBuilder/CTAFlowManager";

// Admin Tools / Access Control
import PlanManagementPage from "./pages/admin/FeatureAccess/PlanManagement";
import UserPermissionOverrides from "./pages/admin/FeatureAccess/UserPermissionOverrides";
import PermissionsPage from "./pages/admin/AccessControl/PermissionsPage";
import PermissionCatalog from "./pages/admin/PermissionCatalog/PermissionCatalog";

// Tracking / Webhooks
import FailedWebhookLogs from "./pages/Tracking/FailedWebhookLogs";
import WebhookSettings from "./pages/Tracking/WebhookSettings";

// Template Builder
import LibraryBrowsePage from "./pages/TemplateBuilder/LibraryBrowsePage";
import DraftEditorPage from "./pages/TemplateBuilder/DraftEditorPage";
import ApprovedTemplatesPage from "./pages/TemplateBuilder/ApprovedTemplatesPage";

// Payment / Billing
import BillingPage from "./pages/Payment/BillingPage";

import Checkout from "./pages/Payment/CheckoutPage";
import PaymentStatusPage from "./pages/Payment/PaymentStatusPage";

// WhatsApp / Meta Settings
import WhatsAppSettings from "./pages/WhatsAppSettings/WhatsAppSettings";
import MetaAccountManagement from "./pages/MetaAccount/MetaAccountManagement";

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

// import { Tag } from "lucide-react";

const isDev = process.env.NODE_ENV === "development";

function App() {
  return (
    <AuthProvider>
      {/* 🔐 Wrap entire app tree with EntitlementsProvider */}
      <EntitlementsProvider>
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

            <Route path="billing" element={<BillingPage />} />
            <Route path="preview-test" element={<PreviewTest />} />

            {/* ===== Core Workspaces ===== */}

            {/* Welcome + Dashboard */}
            <Route path="welcome" element={<WelcomeCenter />} />
            <Route path="welcomepage" element={<WelcomePage />} />

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
                <FeatureGuard featureKey={FK.CRM_CONTACT_VIEW}>
                  <Contacts />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/contacts/:contactId"
              element={
                <ProtectedRoute>
                  <FeatureGuard featureKey={FK.CrmWorkspace}>
                    <Contact360 />
                  </FeatureGuard>
                </ProtectedRoute>
              }
            />
            <Route
              path="crm/tags"
              element={
                <FeatureGuard featureKey={FK.CRM_TAGS_VIEW}>
                  <TagList />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/reminders"
              element={
                <FeatureGuard featureKey={FK.CRM_REMINDERS_VIEW}>
                  <Reminders />
                </FeatureGuard>
              }
            />

            <Route
              path="crm/timeline"
              element={
                <FeatureGuard featureKey={FK.CRM_TIMELINE_VIEW}>
                  <LeadTimeline />
                </FeatureGuard>
              }
            />
            <Route
              path="crm/contacts/:contactId/notes"
              element={<NotesWrapper />}
            />
            <Route
              path="crm/contacts/:contactId/timeline"
              element={<LeadTimeline />}
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
                <FeatureGuard featureKey={FK.CATALOG_VIEW}>
                  <ProductCatalog />
                </FeatureGuard>
              }
            />
            <Route
              path="catalog/form"
              element={
                <FeatureGuard featureKey={FK.CATALOG_CREATE}>
                  <ProductForm />
                </FeatureGuard>
              }
            />
            <Route
              path="catalog/insights"
              element={
                <FeatureGuard featureKey={FK.CatalogDashboard}>
                  <CatalogDashboard />
                </FeatureGuard>
              }
            />

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
                <FeatureGuard featureKey={FK.MESSAGING_SEND_TEXT}>
                  <SendTextMessagePage />
                </FeatureGuard>
              }
            />
            <Route
              path="messaging/send-template-message"
              element={
                <FeatureGuard featureKey={FK.MESSAGING_SEND_TEMPLATE}>
                  <TemplateMessagingComingSoon />
                </FeatureGuard>
              }
            />
            <Route
              path="messaging/reports"
              element={
                <FeatureGuard featureKey={FK.MESSAGING_REPORT_VIEW}>
                  <MessagingReportsComingSoon />
                </FeatureGuard>
              }
            />

            {/* ----- Campaigns Workspace + child routes ----- */}
            <Route
              path="campaigns"
              element={
                <FeatureGuard codes={WORKSPACE_PERMS.campaigns}>
                  {/* fallback={<Navigate to="/no-access" replace />}
                > */}
                  <CampaignWorkspacePage />
                </FeatureGuard>
              }
            />

            {/* Campaigns subroutes */}
            <Route
              path="campaigns/cta-management"
              element={
                <FeatureGuard featureKey={FK.CAMPAIGN_CTA_MANAGEMENT}>
                  <CTAManagement />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/image-campaigns/:id"
              element={
                <FeatureGuard featureKey={FK.CAMPAIGN_LIST_VIEW}>
                  <ImageCampaignDetailPage />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/image-campaigns/:id/edit"
              element={
                <FeatureGuard featureKey={FK.CAMPAIGN_BUILDER}>
                  <ImageCampaignEditPage />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/image-campaigns/assign-contacts/:id"
              element={
                <FeatureGuard featureKey={FK.CAMPAIGN_BUILDER}>
                  <AssignContactsPage />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/image-campaigns/assigned-contacts/:id"
              element={
                <FeatureGuard featureKey={FK.CAMPAIGN_LIST_VIEW}>
                  <RecipientsListPage />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/template-campaign-builder"
              element={
                <FeatureGuard featureKey={FK.CAMPAIGN_BUILDER}>
                  <CampaignBuilderPage />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/template-campaigns-list"
              element={
                <FeatureGuard featureKey={FK.CAMPAIGN_LIST_VIEW}>
                  <TemplateCampaignList />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/logs/:campaignId"
              element={
                <FeatureGuard featureKey={FK.CAMPAIGN_STATUS_VIEW}>
                  <CampaignSendLogs />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/messagelogs/"
              element={
                <FeatureGuard featureKey={FK.CAMPAIGN_STATUS_VIEW}>
                  <MessageLogsReport />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/:campaignId/progress"
              element={<CampaignProgressPage />}
            />
            <Route
              path="campaigns/FlowAnalyticsDashboard"
              element={
                <FeatureGuard featureKey={FK.FLOW_INSIGHTS_VIEW}>
                  <FlowAnalyticsDashboard />
                </FeatureGuard>
              }
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
                <FeatureGuard featureKey={FK.INBOX_VIEW}>
                  <InboxWrapper />
                </FeatureGuard>
              }
            />
            <Route
              path="inbox/chatinbox"
              element={
                <FeatureGuard featureKey={FK.INBOX_CHAT_VIEW}>
                  <ChatInbox />
                </FeatureGuard>
              }
            />

            {/* ----- Automation Workspace + flows ----- */}
            <Route
              path="automation"
              element={
                <FeatureGuard code={WORKSPACE_PERMS.automation}>
                  <AutomationWorkspace />
                </FeatureGuard>
              }
            />
            <Route
              path="automation/auto-reply-builder"
              element={
                <FeatureGuard featureKey={FK.AUTOMATION_CREATE_BOT}>
                  <AutoReplyBuilder />
                </FeatureGuard>
              }
            />
            {/* Flow Builder direct routes */}
            <Route
              path="cta-flow/visual-builder"
              element={
                <FeatureGuard featureKey={FK.AUTOMATION_CREATE_TEMPLATE_FLOW}>
                  <CTAFlowVisualBuilder />
                </FeatureGuard>
              }
            />

            <Route
              path="cta-flow/flow-manager"
              element={
                <FeatureGuard featureKey={FK.AUTOMATION_VIEW_FLOW_MANAGE}>
                  <CTAFlowManager />
                </FeatureGuard>
              }
            />
            <Route
              path="campaigns/FlowAnalyticsDashboard"
              element={
                <FeatureGuard featureKey={FK.AUTOMATION_VIEW_FLOW_ANALYTICS}>
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
            <Route
              path="template-builder/library"
              element={
                <FeatureGuard featureKey={FK.TEMPLATE_BUILDER_LIBRARY_BROWSE}>
                  <LibraryBrowsePage />
                </FeatureGuard>
              }
            />

            <Route
              path="template-builder/approved"
              element={
                <FeatureGuard
                  featureKey={FK.TEMPLATE_BUILDER_APPROVED_TEMPLATES_VIEW}
                >
                  <ApprovedTemplatesPage />
                </FeatureGuard>
              }
            />
            <Route
              path="template-builder/drafts"
              element={
                <FeatureGuard featureKey={FK.TEMPLATE_BUILDER_CREATE_DRAFT}>
                  <DraftEditorPage />
                </FeatureGuard>
              }
            />
            {/* ----- Settings Workspace + child routes ----- */}
            <Route
              path="settings"
              element={
                <FeatureGuard featureKey={WORKSPACE_PERMS.settings}>
                  <MyAccountWorkspace />
                </FeatureGuard>
              }
            />
            <Route
              path="settings/whatsapp"
              element={
                <FeatureGuard featureKey={FK.SETTINGS_WHATSAPP_SETTINGS_VIEW}>
                  <WhatsAppSettings />
                </FeatureGuard>
              }
            />
            <Route
              path="settings/meta-account"
              element={
                <FeatureGuard featureKey={FK.SETTINGS_META_ACCOUNT_MANAGEMENT}>
                  <MetaAccountManagement />
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
                <FeatureGuard featureKey={FK.SETTINGS_BILLING_VIEW}>
                  <Checkout />
                </FeatureGuard>
              }
            />
            <Route
              path="settings/profile-completion"
              element={
                <FeatureGuard featureKey={FK.SETTINGS_PROFILE_UPDATE}>
                  <ProfileCompletion />
                </FeatureGuard>
              }
            />
            <Route
              path="settings/theme"
              element={<div className="p-6">Theme settings (stub)</div>}
            />
            <Route
              path="settings/password"
              element={<div className="p-6">Password settings (stub)</div>}
            />
            {/* ----- Admin Workspace + tools ----- */}
            <Route
              path="admin"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={WORKSPACE_PERMS.superadmin}>
                    <AdminWorkspacePage />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/approvals"
              element={
                <FeatureGuard featureKey={FK.SUPER_ADMIN_NEW_BUSINESS_APPROVAL}>
                  <BusinessApprovals />
                </FeatureGuard>
              }
            />
            {/* NEW: User Permission Overrides (Admin-only) */}
            <Route
              path="admin/user-permissions"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.settings_USER_MANAGEMENT_VIEW}>
                    <UserPermissionOverrides />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/plan-management"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_PLAN_MANAGER_VIEW}>
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
                  <FeatureGuard
                    featureKey={FK.SUPER_ADMIN_PLAN_PERMISSIONS_LIST}
                  >
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
                  <FeatureGuard
                    featureKey={FK.SUPER_ADMIN_PLAN_PERMISSIONS_LIST}
                  >
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
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_SINGNUP_REPORT_VIEW}>
                    <AccountDashboard />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/funnels"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_SINGNUP_REPORT_VIEW}>
                    <AccountFunnels />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/alerts"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_SINGNUP_REPORT_VIEW}>
                    <AccountAlerts />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/esu-debug"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_ESU_DEBUG}>
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
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_BUSINESS_OVERVIEW}>
                    <ReportsIndex />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/account-reports/accounts-master"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_BUSINESS_OVERVIEW}>
                    <AccountsMasterReport />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/account-reports/lifecycle"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_BUSINESS_OVERVIEW}>
                    <LifecycleStageReport />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/account-reports/trials"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_BUSINESS_OVERVIEW}>
                    <TrialPerformanceReport />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/account-insights/account-reports/risk"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_BUSINESS_OVERVIEW}>
                    <RiskRecoveryReport />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/webhooks/monitor"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_WEBHOOK_MONITOR}>
                    <WebhookSettings />
                  </FeatureGuard>
                </AdminRouteGuard>
              }
            />
            <Route
              path="admin/webhooks/failedlog"
              element={
                <AdminRouteGuard>
                  <FeatureGuard featureKey={FK.SUPER_ADMIN_WEBHOOK_MONITOR}>
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
                    featureKey={FK.SUPER_ADMIN_FLOW_EXECUTION_EXPLORER_VIEW}
                  >
                    <FlowExecutionExplorer />
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
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="colored"
          toastStyle={{
            borderRadius: "12px",
            padding: "10px 16px",
            fontSize: "14px",
          }}
        />

        {/* Global upgrade modal for feature/quota denials */}
        <UpgradeModal />
        {isDev && <AccessDebugger />}
      </EntitlementsProvider>
    </AuthProvider>
  );
}

export default App;

// // 📄 File: src/App.jsx

// import { Routes, Route, Navigate } from "react-router-dom";
// import { ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Auth provider (server-authoritative session/claims)
// // import { AuthProvider } from "./app/providers/AuthProvider";
// import AuthProvider from "./app/providers/AuthProvider";
// // 🔐 Guards
// import ProtectedRoute from "./app/routes/guards/ProtectedRoute";
// import AdminRouteGuard from "./app/routes/guards/AdminRouteGuard";
// import FeatureGuard from "./capabilities/FeatureGuard";

// // 🔑 Permission Keys (codes)
// import { FK } from "./capabilities/featureKeys";

// // Public Pages
// import Login from "./pages/auth/Login";
// import BusinessSignup from "./pages/auth/BusinessSignup";
// import SignupForTrial from "./pages/auth/SignupForTrial";
// import PendingApproval from "./pages/auth/PendingApproval";
// import NoAccess from "./pages/NoAccess";

// // Layout
// import AppLayout from "./components/layout/AppLayout";

// // Workspaces
// import CrmWorkspacePage from "./pages/Workspaces/CrmWorkspacePage";
// import CatalogWorkspacePage from "./pages/Workspaces/CatalogWorkspacePage";
// import CampaignWorkspacePage from "./pages/Workspaces/CampaignWorkspacePage";
// import AdminWorkspacePage from "./pages/Workspaces/AdminWorkspacePage";
// import InsightsWorkspacePage from "./pages/Workspaces/InsightsWorkspacePage";
// import MessagingWorkspacePage from "./pages/Workspaces/MessagingWorkspacePage";
// import AutomationWorkspace from "./pages/Workspaces/AutomationWorkspace";
// import InboxWorkspace from "./pages/Workspaces/InboxWorkspace";
// import WelcomeCenter from "./components/WelcomeCenter";

// // CRM
// import Contacts from "./pages/Contacts/Contacts";
// import Tags from "./pages/Tags/Tags";
// import Reminders from "./pages/Reminders/Reminders";
// import NotesWrapper from "./pages/Notes/NotesWrapper";
// import LeadTimeline from "./pages/CTATimeline/LeadTimeline";

// // Catalog
// import ProductCatalog from "./pages/Businesses/ProductCatalog";
// import ProductForm from "./pages/Businesses/ProductForm";
// import CatalogDashboard from "./pages/Businesses/CatalogDashboard";
// import BusinessApprovals from "./pages/Businesses/BusinessApprovals";

// // Campaigns

// import CampaignSendLogs from "./pages/Campaigns/CampaignSendLogs";

// import CTAManagement from "./pages/CTAManagement/CTAManagement";

// import ImageCampaignDetailPage from "./pages/Campaigns/ImageCampaignDetailPage";
// import ImageCampaignEditPage from "./pages/Campaigns/ImageCampaignEditPage";
// import AssignContactsPage from "./pages/Campaigns/AssignContactsPage";
// import RecipientsListPage from "./pages/Campaigns/components/RecipientsListPage";
// import CampaignBuilderPage from "./pages/Campaigns/CampaignBuilderPage";
// import TemplateCampaignList from "./pages/Campaigns/TemplateCampaignList";

// // Messaging

// import SendTextMessagePage from "./pages/WhatsAppMessageEngine/SendContentFreeTextMessage";

// import TemplateMessagingComingSoon from "./pages/Messaging/TemplateMessagingComingSoon";
// import MessagingReportsComingSoon from "./pages/Messaging/MessagingReportsComingSoon";
// // Admin Tools

// import PlanManagement from "./pages/admin/FeatureAccess/PlanManagement";
// import UserPermissionOverrides from "./pages/admin/FeatureAccess/UserPermissionOverrides";
// // Dev Tools / Tracking

// import FailedWebhookLogs from "./pages/Tracking/FailedWebhookLogs";
// import WebhookSettings from "./pages/Tracking/WebhookSettings";

// // Flow Builder
// import CTAFlowVisualBuilder from "./pages/CTAFlowVisualBuilder/CTAFlowVisualBuilder";

// import CTAFlowManager from "./pages/CTAFlowVisualBuilder/CTAFlowManager";
// import FlowAnalyticsDashboard from "./pages/FlowAnalytics/FlowAnalyticsDashboard";

// // Inbox & Automation
// import InboxWrapper from "./pages/Inbox/InboxWrapper";
// import AutoReplyBuilder from "./pages/AutoReplyBuilder/AutoReplyBuilder";

// // Misc
// import ProfileCompletion from "./pages/Businesses/ProfileCompletion";
// import UpgradePlanPage from "./pages/Plans/UpgradePlanPage";
// import WhatsAppSettings from "./pages/WhatsAppSettings/WhatsAppSettings";

// import PreviewTest from "./pages/PreviewTest";
// import DashboardWorkspace from "./pages/Workspaces/DashboardWorkspace";
// import AppHomeRoute from "./app/routes/AppHomeRoute";
// import Forbidden403 from "./pages/errors/Forbidden403";
// import AccessDebugger from "./dev/AccessDebugger";

// // Settings
// import SettingsWorkspacePage from "./pages/Workspaces/SettingsWorkspacePage";
// import TagList from "./pages/Tags/TagList";
// import MessageLogsReport from "./pages/reports/MessageLogsReport";
// import CampaignProgressPage from "./pages/Monitoring/CampaignProgressPage";
// import LibraryBrowsePage from "./pages/TemplateBuilder/LibraryBrowsePage";
// import TemplateBuilderWorkspacePage from "./pages/Workspaces/TemplateBuilderWorkspacePage";
// import BillingPage from "./pages/Payment/BillingPage";
// import PaymentStatusPage from "./pages/Payment/PaymentStatusPage";
// import DraftEditorPage from "./pages/TemplateBuilder/DraftEditorPage";
// import ApprovedTemplatesPage from "./pages/TemplateBuilder/ApprovedTemplatesPage";
// import MetaAccountManagement from "./pages/MetaAccount/MetaAccountManagement";
// import EsuDebugPage from "./pages/DevTools/EsuDebugPage";

// //
// // Account Insights (Admin analytics for accounts)
// import AccountDashboard from "./pages/AccountInsights/AccountDashboard";
// import AccountFunnels from "./pages/AccountInsights/AccountFunnels";
// import AccountAlerts from "./pages/AccountInsights/AccountAlerts";

// // Account Insights - Detailed Reports
// import AccountsMasterReport from "./pages/AccountInsights/AccountReports/AccountsMasterReport";
// import LifecycleStageReport from "./pages/AccountInsights/AccountReports/LifecycleStageReport";
// import TrialPerformanceReport from "./pages/AccountInsights/AccountReports/TrialPerformanceReport";
// import RiskRecoveryReport from "./pages/AccountInsights/AccountReports/RiskRecoveryReport";
// import ReportsIndex from "./pages/AccountInsights/AccountReports/ReportsIndex";

// //feature gaurd
// import PermissionCatalog from "./pages/admin/PermissionCatalog/PermissionCatalog";
// import UpgradeModal from "./components/UpgradeModal";

// import PermissionsPage from "./pages/admin/AccessControl/PermissionsPage";

// import { EntitlementsProvider } from "./app/providers/EntitlementsProvider";
// import { WORKSPACE_PERMS } from "./capabilities/workspacePerms";

// const isDev = process.env.NODE_ENV === "development";

// function App() {
//   return (
//     <AuthProvider>
//       {/* 🔐 Wrap entire app tree with EntitlementsProvider */}
//       <EntitlementsProvider>
//         <Routes>
//           {/* Public Routes */}
//           <Route path="/" element={<Navigate to="/login" replace />} />
//           <Route path="/login" element={<Login />} />
//           <Route path="/signup" element={<BusinessSignup />} />
//           <Route path="/signup-for-trial" element={<SignupForTrial />} />
//           <Route path="/pending-approval" element={<PendingApproval />} />
//           <Route path="/no-access" element={<NoAccess />} />
//           {/* Protected App Routes */}
//           <Route
//             path="/app/*"
//             element={
//               <ProtectedRoute>
//                 <AppLayout />
//               </ProtectedRoute>
//             }
//           >
//             <Route index element={<AppHomeRoute />} />
//             <Route path="403" element={<Forbidden403 />} />

//             {/* Feature-Gated Workspaces */}
//             <Route path="welcome" element={<WelcomeCenter />} />
//             <Route path="dashboard" element={<DashboardWorkspace />} />

//             <Route
//               path="crm"
//               element={
//                 <FeatureGuard featureKey={FK.CRM_CONTACTS /* or FK.CRM_TAGS */}>
//                   <CrmWorkspacePage />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="catalog"
//               element={
//                 <FeatureGuard featureKey={FK.PRODUCT_VIEW}>
//                   <CatalogWorkspacePage />
//                 </FeatureGuard>
//               }
//             />
//             {/* <Route
//               path="campaigns"
//               element={
//                 <ProtectedRoute>
//                   <FeatureGuard featureKey={FK.CAMPAIGN_LIST_VIEW}>
//                     <CampaignWorkspacePage />
//                   </FeatureGuard>
//                 </ProtectedRoute>
//               }
//             /> */}
//             <Route
//               path="inbox"
//               element={
//                 <FeatureGuard featureKey={FK.INBOX_VIEW}>
//                   <InboxWorkspace />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="inbox/inboxwarpper"
//               element={
//                 <FeatureGuard featureKey={FK.INBOX_VIEW}>
//                   <InboxWrapper />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="insights"
//               element={
//                 <FeatureGuard featureKey={FK.CRM_INSIGHTS_VIEW}>
//                   <InsightsWorkspacePage />
//                 </FeatureGuard>
//               }
//             />
//             {/* <Route path="messaging" element={<MessagingWorkspacePage />} /> */}
//             <Route
//               path="messaging"
//               element={
//                 <FeatureGuard
//                   codes={WORKSPACE_PERMS.messaging}
//                   fallback={<Navigate to="/no-access" replace />}
//                 >
//                   <MessagingWorkspacePage />
//                 </FeatureGuard>
//               }
//             />
//             {/* <Route path="campaigns" element={<CampaignWorkspacePage />} /> */}
//             <Route
//               path="campaigns"
//               element={
//                 <FeatureGuard
//                   codes={WORKSPACE_PERMS.campaigns}
//                   fallback={<Navigate to="/no-access" replace />}
//                 ></FeatureGuard>
//               }
//             />
//             <Route
//               path="automation"
//               element={
//                 <FeatureGuard featureKey={FK.AUTOMATION_VIEW}>
//                   <AutomationWorkspace />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="templatebuilder"
//               element={
//                 <FeatureGuard featureKey={FK.TEMPLATE_BUILDER_VIEW}>
//                   <TemplateBuilderWorkspacePage />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="settings"
//               element={
//                 <FeatureGuard featureKey={FK.SETTINGS_WHATSAPP_VIEW}>
//                   <SettingsWorkspacePage />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="settings/whatsapp"
//               element={
//                 <FeatureGuard featureKey={FK.SETTINGS_WHATSAPP_VIEW}>
//                   <WhatsAppSettings />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="settings/meta-account"
//               element={
//                 <FeatureGuard featureKey={FK.SETTINGS_WHATSAPP_VIEW}>
//                   <MetaAccountManagement />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="settings/theme"
//               element={<div className="p-6">Theme settings (stub)</div>}
//             />
//             <Route
//               path="settings/password"
//               element={<div className="p-6">Password settings (stub)</div>}
//             />
//             <Route
//               path="settings/billing"
//               element={
//                 // You can wrap this later with a FeatureGuard if you add FK.BILLING_VIEW
//                 <BillingPage />
//               }
//             />
//             <Route path="payment/status" element={<PaymentStatusPage />} />

//             {/* Admin (role/guard controlled) */}
//             <Route
//               path="admin"
//               element={
//                 <AdminRouteGuard>
//                   <AdminWorkspacePage />
//                 </AdminRouteGuard>
//               }
//             />

//             {/* crm subroutes */}
//             <Route
//               path="crm/tags"
//               element={
//                 <FeatureGuard featureKey={FK.CRM_TAGS}>
//                   <TagList />
//                 </FeatureGuard>
//               }
//             />

//             {/* Catalog subroutes */}
//             <Route
//               path="catalog/products"
//               element={
//                 <FeatureGuard featureKey={FK.PRODUCT_VIEW}>
//                   <ProductCatalog />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="catalog/form"
//               element={
//                 <FeatureGuard featureKey={FK.PRODUCT_CREATE}>
//                   <ProductForm />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="catalog/insights"
//               element={
//                 <FeatureGuard featureKey={FK.CATALOG_INSIGHTS_VIEW}>
//                   <CatalogDashboard />
//                 </FeatureGuard>
//               }
//             />

//             {/* Campaigns subroutes */}

//             <Route
//               path="campaigns/cta-management"
//               element={
//                 <FeatureGuard featureKey={FK.CAMPAIGN_CTA_MANAGEMENT}>
//                   <CTAManagement />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="campaigns/image-campaigns/:id"
//               element={
//                 <FeatureGuard featureKey={FK.CAMPAIGN_LIST_VIEW}>
//                   <ImageCampaignDetailPage />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="campaigns/image-campaigns/:id/edit"
//               element={
//                 <FeatureGuard featureKey={FK.CAMPAIGN_BUILDER}>
//                   <ImageCampaignEditPage />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="campaigns/image-campaigns/assign-contacts/:id"
//               element={
//                 <FeatureGuard featureKey={FK.CAMPAIGN_BUILDER}>
//                   <AssignContactsPage />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="campaigns/image-campaigns/assigned-contacts/:id"
//               element={
//                 <FeatureGuard featureKey={FK.CAMPAIGN_LIST_VIEW}>
//                   <RecipientsListPage />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="campaigns/template-campaign-builder"
//               element={
//                 <FeatureGuard featureKey={FK.CAMPAIGN_BUILDER}>
//                   <CampaignBuilderPage />
//                 </FeatureGuard>
//               }
//             />
//             {/* Display Only Template based list of campaign */}
//             <Route
//               path="campaigns/template-campaigns-list"
//               element={
//                 <FeatureGuard featureKey={FK.CAMPAIGN_LIST_VIEW}>
//                   <TemplateCampaignList />
//                 </FeatureGuard>
//               }
//             />

//             <Route
//               path="campaigns/logs/:campaignId"
//               element={
//                 <FeatureGuard featureKey={FK.CAMPAIGN_STATUS_VIEW}>
//                   <CampaignSendLogs />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="campaigns/messagelogs/"
//               element={
//                 <FeatureGuard featureKey={FK.CAMPAIGN_STATUS_VIEW}>
//                   <MessageLogsReport />
//                 </FeatureGuard>
//               }
//             />

//             {/* Messaging Inbox & Automation */}
//             <Route
//               path="messaging/send-direct-text"
//               element={
//                 <ProtectedRoute>
//                   <FeatureGuard featureKey={FK.MESSAGING_SEND_TEXT}>
//                     <SendTextMessagePage />
//                   </FeatureGuard>
//                 </ProtectedRoute>
//               }
//             />
//             <Route
//               path="messaging/send-template-message"
//               element={
//                 <ProtectedRoute>
//                   <FeatureGuard featureKey={FK.MESSAGING_SEND_TEMPLATE}>
//                     <TemplateMessagingComingSoon />
//                   </FeatureGuard>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="messaging/reports"
//               element={
//                 <ProtectedRoute>
//                   <FeatureGuard featureKey={FK.MESSAGING_REPORT_VIEW}>
//                     <MessagingReportsComingSoon />
//                   </FeatureGuard>
//                 </ProtectedRoute>
//               }
//             />
//             <Route
//               path="campaigns/:campaignId/progress"
//               element={<CampaignProgressPage />}
//             />

//             {/* CRM subroutes without guards (pages can still check internally) */}
//             <Route path="crm/contacts" element={<Contacts />} />
//             <Route path="crm/tags" element={<Tags />} />
//             <Route path="crm/reminders" element={<Reminders />} />
//             <Route
//               path="crm/contacts/:contactId/notes"
//               element={<NotesWrapper />}
//             />
//             <Route
//               path="crm/contacts/:contactId/timeline"
//               element={<LeadTimeline />}
//             />
//             <Route path="crm/timeline" element={<LeadTimeline />} />

//             {/* Admin (tools) */}
//             <Route
//               path="admin/approvals"
//               element={
//                 <FeatureGuard featureKey={FK.ADMIN_BUSINESS_APPROVE}>
//                   <BusinessApprovals />
//                 </FeatureGuard>
//               }
//             />
//             {/* NEW: User Permission Overrides (Admin-only) */}
//             <Route
//               path="admin/user-permissions"
//               element={
//                 <AdminRouteGuard>
//                   <UserPermissionOverrides />
//                 </AdminRouteGuard>
//               }
//             />
//             {/* NEW: Permissions admin UI */}
//             <Route
//               path="admin/permissions"
//               element={
//                 <AdminRouteGuard>
//                   <PermissionsPage />
//                 </AdminRouteGuard>
//               }
//             />

//             {/* Account Insights (Admin-only cross-account intelligence) */}
//             <Route
//               path="admin/account-insights"
//               element={
//                 <AdminRouteGuard>
//                   <FeatureGuard featureKey={FK.ADMIN_ACCOUNT_INSIGHTS_VIEW}>
//                     <AccountDashboard />
//                   </FeatureGuard>
//                 </AdminRouteGuard>
//               }
//             />
//             <Route
//               path="admin/account-insights/funnels"
//               element={
//                 <AdminRouteGuard>
//                   <FeatureGuard
//                     featureKey={FK.ADMIN_ACCOUNT_INSIGHT_FUNNEL_VIEW}
//                   >
//                     <AccountFunnels />
//                   </FeatureGuard>
//                 </AdminRouteGuard>
//               }
//             />
//             <Route
//               path="admin/account-insights/alerts"
//               element={
//                 <AdminRouteGuard>
//                   <FeatureGuard
//                     featureKey={FK.ADMIN_ACCOUNT_INSIGHT_ALERT_VIEW}
//                   >
//                     <AccountAlerts />
//                   </FeatureGuard>
//                 </AdminRouteGuard>
//               }
//             />

//             {/* Account Insights - Detailed Reports */}
//             <Route
//               path="admin/account-insights/account-reports"
//               element={
//                 <AdminRouteGuard>
//                   <FeatureGuard featureKey={FK.ADMIN_ACCOUNT_INSIGHTS_VIEW}>
//                     <ReportsIndex />
//                   </FeatureGuard>
//                 </AdminRouteGuard>
//               }
//             />

//             <Route
//               path="admin/account-insights/account-reports/accounts-master"
//               element={
//                 <AdminRouteGuard>
//                   <FeatureGuard featureKey={FK.ADMIN_ACCOUNT_INSIGHTS_VIEW}>
//                     <AccountsMasterReport />
//                   </FeatureGuard>
//                 </AdminRouteGuard>
//               }
//             />
//             <Route
//               path="admin/account-insights/account-reports/lifecycle"
//               element={
//                 <AdminRouteGuard>
//                   <FeatureGuard featureKey={FK.ADMIN_ACCOUNT_INSIGHTS_VIEW}>
//                     <LifecycleStageReport />
//                   </FeatureGuard>
//                 </AdminRouteGuard>
//               }
//             />
//             <Route
//               path="admin/account-insights/account-reports/trials"
//               element={
//                 <AdminRouteGuard>
//                   <FeatureGuard featureKey={FK.ADMIN_ACCOUNT_INSIGHTS_VIEW}>
//                     <TrialPerformanceReport />
//                   </FeatureGuard>
//                 </AdminRouteGuard>
//               }
//             />
//             <Route
//               path="admin/account-insights/account-reports/risk"
//               element={
//                 <AdminRouteGuard>
//                   <FeatureGuard featureKey={FK.ADMIN_ACCOUNT_INSIGHTS_VIEW}>
//                     <RiskRecoveryReport />
//                   </FeatureGuard>
//                 </AdminRouteGuard>
//               }
//             />

//             <Route path="admin/plans" element={<PlanManagement />} />

//             {/* Misc */}
//             <Route path="devtools/esu-debug" element={<EsuDebugPage />} />

//             <Route path="webhooks/failed" element={<FailedWebhookLogs />} />
//             <Route path="webhooks/settings" element={<WebhookSettings />} />
//             <Route path="upgrade" element={<UpgradePlanPage />} />

//             <Route path="profile-completion" element={<ProfileCompletion />} />
//             <Route path="preview-test" element={<PreviewTest />} />

//             {/* Flow Builder direct routes */}
//             <Route
//               path="cta-flow/visual-builder"
//               element={<CTAFlowVisualBuilder />}
//             />
//             <Route
//               path="cta-flow/flow-manager"
//               element={
//                 <FeatureGuard
//                   featureKey={
//                     FK.AUTOMATION_VIEW_TEMPLATE_FLOW_TEMPLATEP_ANALYTICS
//                   }
//                 >
//                   <CTAFlowManager />
//                 </FeatureGuard>
//               }
//             />
//             <Route
//               path="campaigns/FlowAnalyticsDashboard"
//               element={
//                 <FeatureGuard featureKey={FK.FLOW_INSIGHTS_VIEW}>
//                   <FlowAnalyticsDashboard />
//                 </FeatureGuard>
//               }
//             />

//             <Route
//               path="automation/auto-reply-builder"
//               element={
//                 <FeatureGuard
//                   featureKey={FK.AUTOMATION_CREATE_TEMPLATE_PLUS_FREE_TEXT_FLOW}
//                 >
//                   <AutoReplyBuilder />
//                 </FeatureGuard>
//               }
//             />
//           </Route>
//           {/* // Template Builder (Library browse now; editor in Step 30) */}
//           <Route
//             path="template-builder/library"
//             element={
//               <FeatureGuard
//               // featureKey={
//               //   FK.CAMPAIGN_CREATE /* reuse or add a specific FK later */
//               // }
//               >
//                 <LibraryBrowsePage />
//               </FeatureGuard>
//             }
//           />
//           <Route
//             path="template-builder/drafts/:draftId"
//             // element={
//             //   <FeatureGuard featureKey={FK.CAMPAIGN_CREATE}>
//             //     <div className="p-6">Draft Editor (Step 30)</div>
//             //   </FeatureGuard>
//             // }
//           />
//           <Route
//             path="template-builder"
//             element={<TemplateBuilderWorkspacePage />}
//           />
//           <Route
//             path="template-builder/library"
//             element={<LibraryBrowsePage />}
//           />
//           <Route
//             path="template-builder/drafts"
//             element={<div className="p-6">Drafts List (coming soon)</div>}
//           />
//           <Route
//             path="template-builder/approved"
//             element={
//               <div className="p-6">Approved Templates (coming soon)</div>
//             }
//           />
//           <Route
//             path="template-builder/drafts/:draftId"
//             element={<div className="p-6">Draft Editor (Step 30)</div>}
//           />
//           <Route
//             path="/app/template-builder/library"
//             element={<LibraryBrowsePage />}
//           />

//           <Route
//             path="/app/template-builder/drafts/:draftId"
//             element={<DraftEditorPage />}
//           />

//           <Route
//             path="/app/template-builder/approved"
//             element={<ApprovedTemplatesPage />}
//           />
//         </Routes>

//         {/* Toasts */}
//         <ToastContainer
//           position="top-right"
//           autoClose={4000}
//           hideProgressBar={false}
//           newestOnTop
//           closeOnClick
//           pauseOnHover
//           draggable
//           theme="colored"
//           toastStyle={{
//             borderRadius: "12px",
//             padding: "10px 16px",
//             fontSize: "14px",
//           }}
//         />

//         {/* Global upgrade modal for feature/quota denials */}
//         <UpgradeModal />
//         {isDev && <AccessDebugger />}
//       </EntitlementsProvider>
//     </AuthProvider>
//   );
// }

// export default App;
