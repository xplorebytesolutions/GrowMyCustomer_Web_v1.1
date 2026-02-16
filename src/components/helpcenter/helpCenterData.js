export const SUPPORT_WHATSAPP_URL =
  process.env.REACT_APP_SUPPORT_WHATSAPP_URL || "https://wa.me/919999999999";

export const helpCenterCategories = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "Create your account context and complete first-time setup.",
    icon: "Rocket",
  },
  {
    id: "inbox",
    title: "Inbox",
    description: "Handle conversations in Chat Inbox with clear ownership.",
    icon: "Inbox",
  },
  {
    id: "contacts",
    title: "Contacts",
    description: "Build clean contact data for messaging and segmentation.",
    icon: "Users",
  },
  {
    id: "message-templates",
    title: "Templates",
    description: "Create, approve, and manage template messages.",
    icon: "FileText",
  },
  {
    id: "broadcasts",
    title: "Campaigns",
    description: "Build campaigns and monitor Message Send Logs.",
    icon: "Megaphone",
  },
  {
    id: "automation-ai",
    title: "Automation",
    description: "Manage Create Template Flow, Auto Reply Bot, and analytics.",
    icon: "Bot",
  },
  {
    id: "team-management",
    title: "Settings",
    description: "Use User & Staff Management and Role Permission Mapping.",
    icon: "ShieldCheck",
  },
  {
    id: "faq",
    title: "Frequently Asked Questions",
    description: "Find quick troubleshooting and policy-aware answers.",
    icon: "CircleHelp",
  },
];

export const helpCenterArticles = [
  {
    id: "quick-setup-connect-cloud-api",
    categoryId: "getting-started",
    title: "Quick Setup: Connect WhatsApp Cloud API",
    description:
      "Connect your WhatsApp Business Account from Settings using Embedded Signup.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Settings", "WhatsApp Api Integration"],
    bodyMarkdown: `# Quick Setup: Connect WhatsApp Cloud API
This is the fastest way to activate official WhatsApp messaging in XploreByte.

## What you will complete
- Link your Meta business account to XploreByte
- Attach the correct WABA and phone number
- Confirm account status from ` + "`Settings -> WhatsApp Api Integration`" + `

## Steps
1. Open ` + "`Settings -> WhatsApp Api Integration`" + `.
2. Click **Connect with Meta** to start Embedded Signup.
3. Select the correct business and WABA in Meta.
4. Choose the phone number you want to use for messaging.
5. Finish consent and return to XploreByte.
6. Verify connection state shows **Connected**.

## If setup appears stuck
- Wait 2-5 minutes and refresh the page.
- Ensure the same Meta business owns the selected number.
- Reconnect if status shows disconnected or invalid.`,
  },
  {
    id: "create-your-first-contact",
    categoryId: "getting-started",
    title: "Create Your First Contact",
    description: "Add your first contact record from CRM with the right number format.",
    lastUpdated: "2026-02-12",
    appliesTo: ["CRM", "Contacts"],
    bodyMarkdown: `# Create Your First Contact
A clean contact record is required before reliable outreach.

## Steps
1. Open ` + "`CRM -> Contacts`" + `.
2. Click **Add Contact**.
3. Enter a clear display name.
4. Enter phone number in E.164 format (example: +9198xxxxxxx).
5. Save and confirm the contact appears in the list.

## Best practices
- Use consistent country code format.
- Avoid duplicate numbers with different spacing.
- Add tags at creation time for easier segmentation.`,
  },
  {
    id: "send-your-first-message",
    categoryId: "getting-started",
    title: "Send Your First Message",
    description: "Send your first direct message and validate status in logs.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Messaging", "Send Non-Template Message"],
    bodyMarkdown: `# Send Your First Message
Use direct messaging for customer replies inside the care window.

## Steps
1. Open ` + "`Messaging -> Send Non-Template Message`" + `.
2. Select a contact or enter a destination number.
3. Type a short test message.
4. Click **Send**.

## Verify outcome
- Open ` + "`Campaigns -> Message Send Logs`" + `.
- Confirm progression: Sent -> Delivered -> Read.
- If failed, review error reason before retrying.`,
  },
  {
    id: "understanding-plans-limits",
    categoryId: "getting-started",
    title: "Understanding Plans & Limits",
    description: "Understand how plan tier and WhatsApp quality affect sending.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Settings", "Billing & Subscription"],
    bodyMarkdown: `# Understanding Plans & Limits
Two systems impact your sending capacity: XploreByte plan and WhatsApp quality.

## What your plan controls
- Team seats and workspace capabilities
- Advanced modules (automation depth, reporting scope)
- Access to premium workflow features

## What Meta controls
- Messaging limits based on quality and trust
- Template policy compliance acceptance
- Enforcement actions on repeated violations

## Operational recommendation
Review ` + "`Campaigns -> Message Send Logs`" + ` and ` + "`Messaging -> Messaging Reports & Analytics`" + ` before scaling volume.`,
  },
  {
    id: "team-inbox-basics",
    categoryId: "inbox",
    title: "Team Inbox Basics",
    description: "Learn the standard process for handling conversations in Chat Inbox.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Inbox", "Chat Inbox"],
    bodyMarkdown: `# Team Inbox Basics
` + "`Inbox -> Chat Inbox`" + ` is your core agent workspace.

## Standard handling flow
1. Pick a conversation from the left list.
2. Review recent customer messages and context.
3. Assign owner if needed.
4. Reply with text or approved template.
5. Update status before leaving the thread.

## Team discipline
- Keep one owner per active conversation.
- Use internal notes for handoff context.
- Resolve only when customer intent is completed.`,
  },
  {
    id: "assign-conversations-team-members",
    categoryId: "inbox",
    title: "Assign Conversations to Team Members",
    description: "Route conversations to avoid duplicate replies and SLA misses.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Inbox", "User & Staff Management"],
    bodyMarkdown: `# Assign Conversations to Team Members
Clear ownership reduces response conflicts and improves accountability.

## Steps
1. Open a thread in ` + "`Inbox -> Chat Inbox`" + `.
2. Click assignee control.
3. Select the responsible team member.
4. Add a short handoff note.

## Suggested routing logic
- Language-based routing
- Product line routing
- Shift-based routing
- Priority customer routing`,
  },
  {
    id: "inbox-statuses-open-pending-resolved",
    categoryId: "inbox",
    title: "Inbox Statuses: Open, Pending, Resolved",
    description: "Use status transitions consistently for clean queue management.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Inbox", "Chat Inbox"],
    bodyMarkdown: `# Inbox Statuses: Open, Pending, Resolved
Status consistency keeps the queue trustworthy.

## Meaning of each status
- **Open**: requires immediate agent action.
- **Pending**: waiting for customer response.
- **Resolved**: interaction closed successfully.

## Team policy recommendation
- Move to pending only with a clear next customer action.
- Reopen if customer replies with unresolved intent.
- Audit stale pending threads daily.`,
  },
  {
    id: "common-inbox-issues-no-new-messages",
    categoryId: "inbox",
    title: "Common Inbox Issues (No New Messages)",
    description: "Troubleshoot missing incoming messages with a quick checklist.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Inbox", "Settings", "WhatsApp Api Integration"],
    bodyMarkdown: `# Common Inbox Issues (No New Messages)
Use this sequence before escalating.

## Quick checks
1. Confirm number is connected from ` + "`Settings -> WhatsApp Api Integration`" + `.
2. Verify business selection in top bar, then reopen ` + "`Inbox -> Chat Inbox`" + `.
3. Remove active filters in ` + "`Inbox -> Chat Inbox`" + `.
4. Refresh page and reload conversation list.
5. If admin access exists, open ` + "`Admin -> Webhook Reliability & Cleanup`" + `.

## Escalation packet
Include sample number, timestamp, and expected message direction (inbound/outbound).`,
  },
  {
    id: "import-contacts-csv",
    categoryId: "contacts",
    title: "Import Contacts (CSV)",
    description: "Import contacts safely and preserve list quality for campaigns.",
    lastUpdated: "2026-02-12",
    appliesTo: ["CRM", "Contacts"],
    bodyMarkdown: `# Import Contacts (CSV)
Bulk import is fast, but data hygiene is critical.

## Prepare CSV
- One contact per row
- Valid phone in E.164 format
- No duplicate number rows
- Keep required columns consistent

## Import process
1. Open ` + "`CRM -> Contacts`" + `.
2. Click **Import CSV**.
3. Map columns correctly.
4. Validate preview for malformed rows.
5. Start import and confirm completion summary.`,
  },
  {
    id: "opt-in-opt-out-states-explained",
    categoryId: "contacts",
    title: "Opt-in / Opt-out States Explained",
    description: "Understand consent states before any outbound messaging action.",
    lastUpdated: "2026-02-12",
    appliesTo: ["CRM", "Messaging", "Campaigns"],
    bodyMarkdown: `# Opt-in / Opt-out States Explained
Consent state is a hard gate for compliant outbound communication.

## Consent states
- **Opted In**: outbound eligible under policy conditions.
- **Opted Out**: block promotional outreach immediately.
- **Unknown**: collect explicit permission first.

## Operational rule
Keep consent timestamps and source details in your records.
Do not manually override STOP behavior without policy review.`,
  },
  {
    id: "tags-segments-basics",
    categoryId: "contacts",
    title: "Tags & Segments (Basics)",
    description: "Use tags and segmentation to improve message relevance.",
    lastUpdated: "2026-02-12",
    appliesTo: ["CRM", "Campaigns"],
    bodyMarkdown: `# Tags & Segments (Basics)
Good segmentation improves delivery quality and response rate.

## Suggested starter tags
- New Lead
- Repeat Buyer
- High Value
- Needs Follow-up

## How to use
1. Tag contacts in ` + "`CRM -> Contacts`" + `.
2. Build audience in ` + "`Campaigns -> Campaign Builder`" + `.
3. Review outcomes in ` + "`Campaigns -> Message Send Logs`" + `.

Keep naming standardized to avoid fragmented audience lists.`,
  },
  {
    id: "create-template-utility-marketing-authentication",
    categoryId: "message-templates",
    title: "Create a Template (Utility / Marketing / Authentication)",
    description: "Choose the right template category to improve approval rate.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Templates", "Manage Templates"],
    bodyMarkdown: `# Create a Template (Utility / Marketing / Authentication)
Category choice and wording quality directly impact approval.

## Steps
1. Open ` + "`Templates -> Manage Templates`" + `.
2. Click **Create Template**.
3. Select category and language.
4. Write body with clear placeholders.
5. Provide example values for variables.
6. Submit and monitor status.

## Approval tips
- Keep copy factual and specific.
- Avoid misleading urgency and spam-like wording.
- Match template intent to use case.`,
  },
  {
    id: "template-status-submitted-approved-rejected",
    categoryId: "message-templates",
    title: "Template Status: Submitted, Approved, Rejected",
    description: "Track template lifecycle and take the right next action.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Templates", "Messaging"],
    bodyMarkdown: `# Template Status: Submitted, Approved, Rejected
Status tells you whether a template can be used in production sends.

## Status meaning
- **Submitted**: waiting for review decision.
- **Approved**: available for outbound usage.
- **Rejected**: requires content changes and resubmission.

## If rejected
Review reason notes in ` + "`Templates -> Manage Templates`" + `, correct wording/placeholders, and resubmit.`,
  },
  {
    id: "send-template-without-campaign",
    categoryId: "message-templates",
    title: "Send a Template Message (Without Creating a Campaign)",
    description: "Send one-off outbound template messages from Messaging workspace.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Messaging", "Send Template Message"],
    bodyMarkdown: `# Send a Template Message (Without Creating a Campaign)
Use this flow for direct one-to-one outreach outside campaign builder.

## Steps
1. Open ` + "`Messaging -> Send Template Message`" + `.
2. Select an approved template.
3. Fill required placeholder values.
4. Choose recipient and click send.

## Validate result
Check delivery status in logs and investigate failures before retrying.`,
  },
  {
    id: "create-a-broadcast",
    categoryId: "broadcasts",
    title: "Create a Broadcast",
    description: "Build and launch a template campaign using audience targeting.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Campaigns", "Campaign Builder", "Manage Campaigns"],
    bodyMarkdown: `# Create a Broadcast
Campaign broadcasts are designed for controlled, auditable outbound communication.

## Steps
1. Open ` + "`Campaigns -> Campaign Builder`" + `.
2. Select audience source and filters.
3. Choose approved template and language.
4. Review estimated recipients.
5. Launch now or schedule send time.

## After launch
Track performance from ` + "`Campaigns -> Message Send Logs`" + `.`,
  },
  {
    id: "broadcast-compliance-opt-in-templates",
    categoryId: "broadcasts",
    title: "Campaign Builder Opt-in and Template Checks",
    description: "Run broadcasts with consent and quality safeguards.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Campaigns", "Campaign Builder", "Message Send Logs"],
    bodyMarkdown: `# Campaign Builder Opt-in and Template Checks
Use these checks before launch to protect delivery quality and reduce failures.

## Required controls
- Use approved templates only.
- Target only opted-in contacts.
- Exclude opted-out and blocked recipients.
- Respect STOP and START state changes.

## Quality protection
Monitor complaints and failures after each campaign and refine segment rules.`,
  },
  {
    id: "automation-basics-triggers-actions",
    categoryId: "automation-ai",
    title: "Automation Basics: Triggers and Actions",
    description: "Build reliable automation flows with clear triggers and outcomes.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Automation", "Create Template Flow", "Flow Manager"],
    bodyMarkdown: `# Automation Basics: Triggers and Actions
Automation should start simple and remain observable.

## Core model
- Trigger: event that starts flow
- Condition: branch logic for route decisions
- Action: send, assign, tag, or notify

## Practical setup
1. Build first version in ` + "`Automation -> Create Template Flow`" + `.
2. Test with sample inputs.
3. Publish and monitor in ` + "`Automation -> Flow Manager`" + `.
4. Iterate with small changes to reduce regressions.`,
  },
  {
    id: "auto-replies-and-routing",
    categoryId: "automation-ai",
    title: "Auto Replies and Routing",
    description: "Reduce first response time with controlled routing logic.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Automation", "Create Auto Reply Bot", "Inbox"],
    bodyMarkdown: `# Auto Replies and Routing
Auto replies improve response speed when configured with strict boundaries.

## Setup approach
1. Configure welcome acknowledgement.
2. Route by keyword or intent.
3. Hand off non-matching requests to human queue.
4. Add fallback for unknown input.

## Governance
Review routed conversation quality weekly and update rules based on actual patterns.`,
  },
  {
    id: "ai-assist-suggested-replies",
    categoryId: "automation-ai",
    title: "Messaging Reports & Analytics: How to Use It",
    description: "Use Messaging Reports & Analytics to inspect send performance.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Messaging", "Messaging Reports & Analytics"],
    bodyMarkdown: `# Messaging Reports & Analytics: How to Use It
Use this page to evaluate delivery quality and sending outcomes.

## Where to open
Go to ` + "`Messaging -> Messaging Reports & Analytics`" + `.

## What to check
- Total sent volume
- Delivery and read trend
- Failure counts by period
- Message behavior after new campaign launches

## Recommended cadence
Review ` + "`Messaging -> Messaging Reports & Analytics`" + ` daily during active sends and weekly for baseline checks.`,
  },
  {
    id: "invite-team-members",
    categoryId: "team-management",
    title: "Invite Team Members",
    description: "Invite staff and onboard them into the right workspaces.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Settings", "User & Staff Management"],
    bodyMarkdown: `# Invite Team Members
Use structured onboarding to avoid permission drift.

## Steps
1. Open ` + "`Settings -> User & Staff Management`" + `.
2. Click **Invite Member**.
3. Enter business email.
4. Assign role based on responsibility.
5. Confirm invite acceptance.

## After onboarding
Test access to ` + "`Inbox -> Chat Inbox`" + `, ` + "`Messaging -> Send Template Message`" + `, and ` + "`Campaigns -> Campaign Builder`" + `.`,
  },
  {
    id: "roles-and-permissions-overview",
    categoryId: "team-management",
    title: "Roles & Permissions Overview",
    description: "Define least-privilege access using role mapping and review cycles.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Settings", "Role Permission Mapping"],
    bodyMarkdown: `# Roles & Permissions Overview
Permission design should follow least privilege with operational clarity.

## Recommended structure
- Admin: uses ` + "`Settings -> Role Permission Mapping`" + ` and ` + "`Settings -> User & Staff Management`" + `.
- Manager: uses ` + "`Campaigns -> Campaign Builder`" + ` and ` + "`Inbox -> Chat Inbox`" + `.
- Agent: uses ` + "`Inbox -> Chat Inbox`" + ` and ` + "`Messaging -> Send Non-Template Message`" + `.

## Control points
- Use ` + "`Settings -> Role Permission Mapping`" + ` for updates.
- Review role permissions after org changes.
- Remove stale access for inactive users promptly.`,
  },
  {
    id: "why-did-message-fail",
    categoryId: "faq",
    title: "Why did my message fail?",
    description: "Identify common failure causes and resolve quickly.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Messaging", "Campaigns", "Message Send Logs"],
    bodyMarkdown: `# Why did my message fail?
Most failures are caused by formatting, consent, or template-state issues.

## Checklist
1. Validate recipient number format.
2. Confirm template is approved and active.
3. Verify contact consent eligibility.
4. Check provider response/error code.

## Next step
Use ` + "`Campaigns -> Message Send Logs`" + ` and ` + "`Messaging -> Messaging Reports & Analytics`" + ` to isolate root cause.`,
  },
  {
    id: "improve-delivery-quality-rating",
    categoryId: "faq",
    title: "How do I improve delivery and quality rating?",
    description: "Use targeting and message discipline to protect quality score.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Campaigns", "Messaging", "Message Send Logs"],
    bodyMarkdown: `# How do I improve delivery and quality rating?
Quality improves when users expect and value your messages.

## Actions that help
- Message only opted-in recipients.
- Keep frequency controlled by segment.
- Use clear, relevant copy.
- Honor opt-out instructions immediately.

## Review loop
Evaluate trends in ` + "`Campaigns -> Message Send Logs`" + ` after each send and adjust audience in ` + "`Campaigns -> Campaign Builder`" + `.`,
  },
  {
    id: "what-is-24-hour-window",
    categoryId: "faq",
    title: "What is the 24-hour customer care window?",
    description: "Know when free-form replies are allowed versus template usage.",
    lastUpdated: "2026-02-12",
    appliesTo: ["Inbox", "Messaging"],
    bodyMarkdown: `# What is the 24-hour customer care window?
This window starts when the customer messages your business.

## Inside the window
- Use ` + "`Messaging -> Send Non-Template Message`" + `.
- Fast human response is recommended.

## Outside the window
- Use ` + "`Messaging -> Send Template Message`" + `.
- Avoid sending unsupported free-form messages.`,
  },
  {
    id: "handle-stop-start-optout-optin",
    categoryId: "faq",
    title: "How do I handle STOP/START (opt-out/opt-in)?",
    description: "Apply consent transitions safely across outbound workflows.",
    lastUpdated: "2026-02-12",
    appliesTo: ["CRM", "Messaging", "Campaigns"],
    bodyMarkdown: `# How do I handle STOP/START (opt-out/opt-in)?
Consent changes must be enforced quickly and consistently.

## Required behavior
- On **STOP**: mark contact opted out and block promotional outbound.
- On **START**: restore opted-in eligibility after validation.
- Keep timestamp and source of change.

## Team rule
Never force outbound messages to opted-out contacts without approved compliance process.`,
  },
];
