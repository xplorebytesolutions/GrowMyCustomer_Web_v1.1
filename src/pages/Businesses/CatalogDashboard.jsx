import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom"; // ✅ For redirect
import { usePlan } from "../auth/hooks/usePlan"; // ✅ Plan protection
import StatCard from "../../components/StatCard";

function CatalogDashboard() {
  const navigate = useNavigate();
  const { plan, hasPlan } = usePlan(); // ✅ Check user plan

  const [summary, setSummary] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [ctaStats, setCtaStats] = useState([]);
  const [productCtaStats, setProductCtaStats] = useState([]);

  const businessId = "11111111-1111-1111-1111-111111111111"; // Temp

  // ✅ Step 1: Redirect if user is on basic plan
  useEffect(() => {
    if (plan === "basic") {
      navigate("/plans/upgrade");
    }
  }, [plan, navigate]);

  useEffect(() => {
    if (!hasPlan("smart")) return; // Stop if plan is not eligible

    const fetchDashboardData = async () => {
      try {
        const summaryRes = await axios.get(
          `https://localhost:7113/api/catalog-dashboard/summary?businessId=${businessId}`
        );
        setSummary(summaryRes.data);

        const topRes = await axios.get(
          `https://localhost:7113/api/catalog-dashboard/top-products?businessId=${businessId}`
        );
        setTopProducts(topRes.data);

        const ctaRes = await axios.get(
          `https://localhost:7113/api/catalog-dashboard/cta-summary?businessId=${businessId}`
        );
        setCtaStats(ctaRes.data);

        const heatmapRes = await axios.get(
          `https://localhost:7113/api/catalog-dashboard/product-cta-breakdown?businessId=${businessId}`
        );
        setProductCtaStats(heatmapRes.data);
      } catch (err) {
        console.error("❌ Failed to load dashboard data:", err);
      }
    };

    if (businessId) {
      fetchDashboardData();
    }
  }, [businessId, hasPlan]);

  // ✅ Step 2: Optional fallback while redirecting
  if (plan === "basic") {
    return (
      <div className="p-6 text-center text-red-600 font-semibold">
        🚫 This feature is only available on the Smart or Advanced plan.
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      <h2 className="text-xl font-semibold text-purple-700 mb-4">
        📊 Catalog Dashboard
      </h2>

      {!summary ? (
        <p>Loading insights...</p>
      ) : (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              title="📤 Messages Sent"
              value={summary.totalMessagesSent}
            />
            <StatCard
              title="👥 Unique Customers"
              value={summary.uniqueCustomersMessaged}
            />
            <StatCard title="🛍️ Product Clicks" value={summary.productClicks} />
            <StatCard
              title="📦 Active Products"
              value={summary.activeProducts}
            />
            <StatCard
              title="📲 Products Shared"
              value={summary.productsSharedViaWhatsApp}
            />
            <StatCard
              title="🔁 Repeat Clickers"
              value={summary.repeatClickers}
            />
            <StatCard
              title="🆕 New Clickers Today"
              value={summary.newClickersToday}
            />
            <StatCard
              title="🕒 Last Catalog Click"
              value={
                summary.lastCatalogClickAt
                  ? new Date(summary.lastCatalogClickAt).toLocaleString()
                  : "—"
              }
            />
            <StatCard
              title="🕒 Last Message Sent"
              value={
                summary.lastMessageSentAt
                  ? new Date(summary.lastMessageSentAt).toLocaleString()
                  : "—"
              }
            />
          </div>

          {/* Top Products */}
          <h3 className="text-lg font-semibold text-purple-700 mt-10 mb-4">
            🔝 Top Clicked Products
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-gray-500">No product clicks recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {topProducts.map((product, index) => (
                <li
                  key={product.productId}
                  className="p-3 bg-white border rounded-xl shadow-sm flex justify-between"
                >
                  <span>
                    #{index + 1} - <strong>{product.productName}</strong>
                  </span>
                  <span className="text-purple-600 font-bold">
                    {product.clickCount} clicks
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* CTA Journey */}
          <h3 className="text-lg font-semibold text-purple-700 mt-10 mb-4">
            🧭 CTA Journey Breakdown
          </h3>
          {ctaStats.length === 0 ? (
            <p className="text-gray-500">No CTA interactions recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {ctaStats.map((cta, index) => (
                <li
                  key={index}
                  className="p-3 bg-white border rounded-xl shadow-sm flex justify-between"
                >
                  <span>
                    <strong>{cta.ctaJourney}</strong>
                  </span>
                  <span className="text-purple-600 font-bold">
                    {cta.clickCount} clicks
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Product CTA Heatmap */}
          <h3 className="text-lg font-semibold text-purple-700 mt-10 mb-4">
            🔥 Product-wise CTA Click Heatmap
          </h3>
          {productCtaStats.length === 0 ? (
            <p className="text-gray-500">No product-specific CTA data found.</p>
          ) : (
            <table className="w-full text-sm bg-white rounded-xl shadow border">
              <thead className="bg-purple-50 text-purple-800 font-semibold">
                <tr>
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">CTA Type</th>
                  <th className="px-4 py-2">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {productCtaStats.map((entry, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2">{entry.productName}</td>
                    <td className="px-4 py-2">{entry.ctaJourney}</td>
                    <td className="px-4 py-2 font-bold text-purple-700">
                      {entry.clickCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default CatalogDashboard;
