// 📄 src/app/routes/routeConfig.js
import { FK } from "../../capabilities/featureKeys";

/**
 * anyOf: the workspace shows if the user has ANY of these permission codes
 * feature (on children): the child link shows if the user has THAT single permission
 */
export const WORKSPACES = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/app/dashboard",
    anyOf: [FK.DASHBOARD_VIEW],
    children: [],
  },

  {
    key: "crm",
    label: "CRM",
    path: "/app/crm",
    anyOf: [FK.CRM_CONTACTS, FK.CRM_TAGS],
    children: [
      {
        label: "Contacts",
        path: "/app/crm/contacts",
        feature: FK.CRM_CONTACTS,
      },
      {
        label: "Attribute",
        path: "/app/crm/attributes",
        feature: FK.CRM_ATTRIBUTE_VIEW,
      },
      { label: "Tags", path: "/app/crm/tags", feature: FK.CRM_TAGS },
      // Add more when you seed them:
      // { label: "Reminders", path: "/app/crm/reminders", feature: FK.CRM_REMINDERS },
      // { label: "Timeline",  path: "/app/crm/timeline",  feature: FK.CRM_TIMELINE  },
    ],
  },

  {
    key: "campaigns",
    label: "Campaigns",
    path: "/app/campaigns",
    anyOf: [FK.CAMPAIGN_VIEW, FK.CAMPAIGN_CREATE],
    children: [
      {
        label: "Campaign List",
        path: "/app/campaigns/list",
        feature: FK.CAMPAIGN_VIEW,
      },
      {
        label: "Create Campaign",
        path: "/app/campaigns/template-single",
        feature: FK.CAMPAIGN_CREATE,
      },
    ],
  },

  {
    key: "catalog",
    label: "Catalog",
    path: "/app/catalog",
    anyOf: [FK.PRODUCT_VIEW, FK.PRODUCT_CREATE],
    children: [
      {
        label: "Products",
        path: "/app/catalog/products",
        feature: FK.PRODUCT_VIEW,
      },
      {
        label: "Add Product",
        path: "/app/catalog/form",
        feature: FK.PRODUCT_CREATE,
      },
    ],
  },

  {
    key: "messaging",
    label: "Bulk Message",
    path: "/app/messaging",
    // show workspace if user can view inbox, send, or view reports/status
    anyOf: [
      FK.MESSAGING_SEND,
      FK.MESSAGING_SEND_TEXT,
      FK.MESSAGING_SEND_TEMPLATE,
      FK.MESSAGING_REPORT_VIEW,
      FK.MESSAGING_STATUS_VIEW,
    ],
    children: [
      // Optional child links you can surface in menus built from this config:
      // { label: "Inbox", path: "/app/messaging/inboxwrapper", feature: FK.MESSAGING_INBOX_VIEW },
      // { label: "Send Text", path: "/app/messaging/send-direct-text", feature: FK.MESSAGING_SEND_TEXT },
      // { label: "Send Template", path: "/app/messaging/send-template-simple", feature: FK.MESSAGING_SEND_TEMPLATE },
      // { label: "Message History", path: "/app/messaging/reporting/direct-message-history", feature: FK.MESSAGING_REPORT_VIEW },
      // WhatsApp settings lives under messaging as well:
      // { label: "WhatsApp Settings", path: "/app/messaging/whatsapp-settings", feature: FK.WHATSAPP_SETTINGS_VIEW },
    ],
  },
  {
    key: "inbox",
    label: "Inbox",
    path: "/app/inbox",
    anyOf: [FK.INBOX_VIEW],
    children: [],
  },

  {
    key: "automation",
    label: "Automation",
    path: "/app/automation",
    anyOf: [FK.AUTOMATION_VIEW],
    children: [],
  },

  // “Admin” workspace appears if the user has ANY admin capability
  {
    key: "admin",
    label: "Admin",
    path: "/app/admin",
    anyOf: [
      FK.ADMIN_PLANS_VIEW,
      FK.PLAN_MANAGER_VIEW,
      FK.USER_PERMISSIONS_VIEW,
      FK.ADMIN_BUSINESS_APPROVE,
      FK.ADMIN_LOGS_VIEW,
    ],
    children: [
      // Optional child links (match your routes if you want to render from this config):
      // { label: "Plan Manager", path: "/app/admin/plans", feature: FK.ADMIN_PLANS_VIEW },
      // { label: "User Permissions", path: "/app/admin/user-permissions", feature: FK.USER_PERMISSIONS_VIEW },
      // { label: "Feature Toggles", path: "/app/admin/features", feature: FK.ADMIN_PLANS_VIEW },
    ],
  },
];

// // src/app/routes/routeConfig.js
// import { FK } from "../../capabilities/featureKeys";

// export const WORKSPACES = [
//   {
//     key: "dashboard",
//     label: "Dashboard",
//     path: "/app/dashboard",
//     anyOf: [FK.DASHBOARD_VIEW],
//     children: [],
//   },
//   {
//     key: "crm",
//     label: "CRM",
//     path: "/app/crm",
//     anyOf: [FK.CRM_CONTACTS, FK.CRM_TAGS], // add more when seeded
//     children: [
//       {
//         label: "Contacts",
//         path: "/app/crm/contacts",
//         feature: FK.CRM_CONTACTS,
//       },
//       { label: "Tags", path: "/app/crm/tags", feature: FK.CRM_TAGS },
//       // { label: "Reminders", path: "/app/crm/reminders", feature: FK.CRM_REMINDERS },
//       // { label: "Timeline",  path: "/app/crm/timeline",  feature: FK.CRM_TIMELINE },
//     ],
//   },
//   {
//     key: "campaigns",
//     label: "Campaigns",
//     path: "/app/campaigns",
//     anyOf: [FK.CAMPAIGN_VIEW, FK.CAMPAIGN_CREATE],
//     children: [
//       {
//         label: "Campaign List",
//         path: "/app/campaigns/list",
//         feature: FK.CAMPAIGN_VIEW,
//       },
//       {
//         label: "Create Campaign",
//         path: "/app/campaigns/template-single",
//         feature: FK.CAMPAIGN_CREATE,
//       },
//     ],
//   },
//   {
//     key: "catalog",
//     label: "Catalog",
//     path: "/app/catalog",
//     anyOf: [FK.PRODUCT_VIEW, FK.PRODUCT_CREATE],
//     children: [
//       {
//         label: "Products",
//         path: "/app/catalog/products",
//         feature: FK.PRODUCT_VIEW,
//       },
//       {
//         label: "Add Product",
//         path: "/app/catalog/form",
//         feature: FK.PRODUCT_CREATE,
//       },
//     ],
//   },
//   {
//     key: "messaging",
//     label: "Bulk Message",
//     path: "/app/messaging",
//     anyOf: [FK.CAMPAIGN_VIEW], // adjust to your messaging permission if you have one
//     children: [],
//   },
//   {
//     key: "automation",
//     label: "Automation",
//     path: "/app/automation",
//     anyOf: [], // add when you define permissions
//     children: [],
//   },
//   {
//     key: "admin",
//     label: "Admin",
//     path: "/app/admin",
//     anyOf: [], // add when you define permissions
//     children: [],
//   },
//   // Admin is partly role-based; keep your AdminRouteGuard for now
// ];
