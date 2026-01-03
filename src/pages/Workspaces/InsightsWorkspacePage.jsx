import { Card } from "../../components/ui/card";
import { useNavigate } from "react-router-dom";
// Keep using your current auth hook location

import { useAuth } from "../../app/providers/AuthProvider";
export default function InsightsWorkspacePage() {
  const navigate = useNavigate();

  // supports both legacy (availableFeatures) and new (hasAllAccess)
  const {
    availableFeatures = {},
    isLoading,
    role = "",
    hasAllAccess = false,
  } = useAuth?.() || {};

  const isSuperAdmin =
    hasAllAccess || String(role).toLowerCase() === "superadmin";

  // 🚩 Feature-based cards
  const insightCards = [
    {
      key: "CatalogInsights",
      label: "🛍️ Catalog Dashboard",
      desc: "Track catalog performance — clicks, shares, and product views.",
      onClick: () => navigate("/app/catalog/insights"),
    },
    {
      key: "CRMInsights",
      label: "🤝 CRM Insights",
      desc: "Understand lead behavior, contact activity, and follow-up stats.",
      onClick: () => navigate("/app/insights/crm"),
    },
    {
      key: "FlowInsights",
      label: "🔁 Flow Analytics",
      desc: "Analyze CTA performance, click-through rates, and automation flows.",
      onClick: () => navigate("/app/campaigns/FlowAnalyticsDashboard"),
    },
  ];

  const visibleCards = isSuperAdmin
    ? insightCards
    : insightCards.filter(card => availableFeatures[card.key]);

  if (isLoading) {
    return (
      <div className="p-10 text-center text-lg text-gray-500">
        Loading features…
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <h2 className="text-2xl font-bold text-emerald-800 mb-6">
        📊 Insights & Analytics Workspace
      </h2>

      {visibleCards.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md p-4">
          No insights available for your plan. If this seems wrong, check your
          feature toggles or contact an admin.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleCards.map(card => (
            <Card
              key={card.key}
              className="hover:shadow-lg transition cursor-pointer"
              onClick={card.onClick}
            >
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">
                  {card.label}
                </h3>
                <p className="text-gray-600 text-sm">{card.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
