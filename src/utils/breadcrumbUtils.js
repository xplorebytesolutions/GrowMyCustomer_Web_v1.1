// Breadcrumb utility for dynamic navigation
export const getBreadcrumbs = pathname => {
  const pathSegments = pathname.split("/").filter(segment => segment !== "");

  // Remove 'app' from the beginning if it exists
  if (pathSegments[0] === "app") {
    pathSegments.shift();
  }

  const breadcrumbs = [
    { label: "Home", path: "/app/welcomepage", isActive: false },
  ];

  // If we're on the app root, return just the home breadcrumb
  if (pathSegments.length === 0) {
    breadcrumbs[0].isActive = true;
    return breadcrumbs;
  }

  const toTitleCase = value =>
    value
      .split(/[-_]+/g)
      .filter(Boolean)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  // Map path segments to readable labels
  const segmentLabels = {
    dashboard: "Dashboard",
    welcomepage: "Dashboard",
    campaigns: "Campaigns",
    "template-campaigns-list": "Template Campaigns",
    "template-single": "New Campaign",
    "image-campaigns": "Image Campaigns",
    "assign-contacts": "Assign Contacts",
    "assigned-contacts": "Assigned Contacts",
    messaging: "Messaging",
    "send-direct-text": "Send Direct Message",
    "send-template-message": "Send Template Message",
    reporting: "Reporting",
    "direct-message-history": "Message History",
    conversations: "Conversations",
    contacts: "Contacts",
    settings: "Settings",
    whatsapp: "Manual WhatsApp Business Api Setup",
    password: "Password Settings",
    automation: "Automation",
    templatebuilder: "Template Builder",
    crm: "CRM",
    catalog: "Catalog",
    inbox: "Inbox",
    admin: "Admin",
    insights: "Insights",
    "catalog-insights": "Catalog Insights",
    "crm-insights": "CRM Insights",
    "flow-insights": "Flow Insights",
    devtools: "Developer Tools",
    "cta-tester": "CTA Tester",
    webhooks: "Webhooks",
    failed: "Failed Webhooks",
    plans: "Plan Manager",
    "profile-update": "Profile Update",
    "cta-flow": "CTA Flow",
    "visual-builder": "Visual Builder",
    "flow-manager": "Flow Manager",
    messagelogs: "Message Logs",
    "cta-management": "CTA Management",
    "campaign-wizard": "Campaign Wizard",
    tracking: "Tracking",
    logs: "Logs",
    "template-campaigns": "Template Campaigns",
    "image-campaign": "Image Campaign",
    "flow-analytics": "Flow Analytics",
    "auto-reply-builder": "Auto Reply Builder",
    "webhook-settings": "Webhook Settings",
    "plan-manager": "Plan Manager",
    businesses: "Businesses",
    "message-history": "Message History",
    "campaign-send-logs": "Campaign Send Logs",
    list: "Campaign List",
    products: "Products",
    form: "Add Product",
    tags: "Tags",
    reminders: "Reminders",
    timeline: "Timeline",
    notes: "Notes",
    attributes: "Attribute",
    approvals: "Business Approvals",
    features: "Feature Toggles",
    "user-permissions": "User Permissions",
    inboxwrapper: "Inbox",
    "send-template-simple": "Send Template",
    "whatsapp-settings": "Manual WhatsApp Business Api Setup",
    "profile-completion": "Profile Completion",
    welcome: "Welcome Center",
    403: "Access Denied",
    progress: "Campaign Progress",
    "team-staff": "Team Staff",
    "manage-staff": "Manage Staff",
    "access-control": "Access Control",
    "meta-account": "Meta Account",
  };

  let currentPath = "/app";

  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    const isLast = index === pathSegments.length - 1;

    // Handle dynamic routes (UUIDs, IDs, etc.)
    let label = segmentLabels[segment];
    if (!label) {
      // Check if it's a UUID or ID (starts with number or contains hyphens in UUID format)
      if (
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          segment
        ) ||
        /^\d+$/.test(segment)
      ) {
        label = "Details";
      } else {
        label = toTitleCase(segment);
      }
    }

    breadcrumbs.push({
      label,
      path: currentPath,
      isActive: isLast,
    });
  });

  return breadcrumbs;
};
