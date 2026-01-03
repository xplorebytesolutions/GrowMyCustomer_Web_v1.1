// 📄 File: src/pages/CTAFlowVisualBuilder/CTAFlowManager.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

export default function CTAFlowManager() {
  const [flows, setFlows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("confirm"); // confirm | attached
  const [modalCampaigns, setModalCampaigns] = useState([]);
  const [targetFlow, setTargetFlow] = useState(null);

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("updated");
  const closeBtnRef = useRef(null);
  const navigate = useNavigate();

  // NEW: read ?tab= from URL (published | draft). Default to 'published'
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl =
    searchParams.get("tab") === "draft" ? "draft" : "published";
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  const formatDate = date =>
    date
      ? new Date(date).toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const statusPill = isPublished =>
    isPublished ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
        <span>●</span> Published
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <span>●</span> Draft
      </span>
    );

  const fetchFlows = async (tab = "published") => {
    setLoading(true);
    try {
      const endpoint =
        tab === "published" ? "/cta-flow/all-published" : "/cta-flow/all-draft";
      const res = await axiosClient.get(endpoint);
      setFlows(Array.isArray(res.data) ? res.data : [res.data]);
    } catch (err) {
      setFlows([]);
      toast.error("❌ Failed to load flows.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // NEW: whenever ?tab changes (or on first render), sync state and fetch
  useEffect(() => {
    const tab = searchParams.get("tab") === "draft" ? "draft" : "published";
    setActiveTab(tab);
    fetchFlows(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = flows;
    if (q) {
      out = out.filter(f =>
        [f.flowName, f.createdBy]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q))
      );
    }
    switch (sortKey) {
      case "name":
        return [...out].sort((a, b) => a.flowName.localeCompare(b.flowName));
      case "created":
        return [...out].sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      default:
        return [...out].sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt) -
            new Date(a.updatedAt || a.createdAt)
        );
    }
  }, [flows, query, sortKey]);

  // ---- delete UX (checks usage) ----
  const openDeleteModal = async flow => {
    if (loading) return; // guard
    setTargetFlow(flow);
    setLoading(true);
    try {
      const { data } = await axiosClient.get(`/cta-flow/${flow.id}/usage`);
      if (data?.canDelete) {
        setModalMode("confirm");
        setModalCampaigns([]);
      } else {
        setModalMode("attached");
        setModalCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
      }
      setModalOpen(true);
      setTimeout(() => closeBtnRef.current?.focus(), 0);
    } catch (err) {
      toast.error("❌ Could not check usage for this flow.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!targetFlow) return;
    setLoading(true);
    try {
      const res = await axiosClient.delete(`/cta-flow/${targetFlow.id}`);
      if (res.status === 204 || res.status === 200) {
        toast.success("✅ Flow deleted permanently.");
        setModalOpen(false);
        setTargetFlow(null);
        await fetchFlows(activeTab);
      } else {
        toast.info("ℹ️ Unexpected response while deleting the flow.");
      }
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        const campaigns = err.response?.data?.campaigns ?? [];
        setModalMode("attached");
        setModalCampaigns(campaigns);
      } else if (status === 404) {
        toast.error("❌ Flow not found.");
        setModalOpen(false);
      } else {
        toast.error("❌ Failed to delete flow.");
        setModalOpen(false);
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ---- publish from draft tab ----
  const publishFlow = async flow => {
    if (loading) return;
    try {
      setLoading(true);
      await axiosClient.post(`/cta-flow/${flow.id}/publish`);
      toast.success("✅ Flow published.");
      // NEW: when publishing, move to Published tab (and reflect in URL)
      setSearchParams({ tab: "published" });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 409) {
        toast.error(
          err?.response?.data?.message || "❌ Cannot publish right now."
        );
      } else if (status === 404) {
        toast.error("❌ Flow not found.");
      } else {
        toast.error("❌ Failed to publish flow.");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const goView = flow => {
    if (loading) return;
    navigate(`/app/cta-flow/visual-builder?id=${flow.id}&mode=view`);
  };

  return (
    <div className="bg-[#f5f6f7] min-h-[calc(100vh-80px)] relative">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Loading overlay */}
        {loading && (
          <>
            <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
              <div className="flex items-center gap-3 text-gray-700">
                <svg
                  className="xafb-spin h-6 w-6 text-emerald-600"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    opacity="0.25"
                  />
                  <path
                    d="M4 12a8 8 0 018-8"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.85"
                  />
                </svg>
                <span className="text-sm">Loading…</span>
              </div>
            </div>
            <style>{`@keyframes xafb-spin{to{transform:rotate(360deg)}}.xafb-spin{animation:xafb-spin 1s linear infinite}`}</style>
          </>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 border border-gray-300 bg-gray-50 rounded-lg flex items-center justify-center">
                  <span className="text-gray-600 text-xl">🧩</span>
                </div>
                <div>
                  <h1
                    className="text-2xl font-bold text-gray-900 flex items-center gap-2"
                    style={{ fontFamily: "Plus Jakarta Sans, sans-serif" }}
                  >
                    <span className="text-blue-600">🧩</span>
                    CTA Flow Manager
                  </h1>
                  <p className="text-sm text-gray-600">
                    Create, publish, and manage your visual flows.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/app/cta-flow/visual-builder")}
                className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-4 py-2 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center gap-1.5 text-sm"
                disabled={loading}
              >
                <span className="text-sm text-gray-600">➕</span>
                New Flow
              </button>
            </div>
          </div>
        </div>

        {/* Sticky controls */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 rounded-lg border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Tabs */}
            <div className="flex gap-2">
              {[
                { key: "published", label: "Published Flows", icon: "✅" },
                { key: "draft", label: "Draft Flows", icon: "📝" },
              ].map(t => (
                <button
                  key={t.key}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                    activeTab === t.key
                      ? "bg-emerald-600 text-white shadow-lg"
                      : "border border-gray-300 text-gray-600 hover:border-emerald-600 hover:text-emerald-600 hover:bg-emerald-50"
                  }`}
                  onClick={() => {
                    if (loading) return;
                    setSearchParams({ tab: t.key });
                  }}
                  disabled={loading}
                >
                  <span>{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Search + sort */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  className="w-64 max-w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500 text-sm pl-10 pr-4 py-2.5"
                  placeholder="Search by name or creator…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
                <div className="absolute inset-y-0 left-3 grid place-items-center pointer-events-none text-gray-400">
                  🔎
                </div>
              </div>
              <select
                className="rounded-lg border-gray-300 text-sm focus:ring-blue-500 focus:border-blue-500 px-4 py-2.5"
                value={sortKey}
                onChange={e => setSortKey(e.target.value)}
              >
                <option value="updated">Sort: Last updated</option>
                <option value="name">Sort: Name (A–Z)</option>
                <option value="created">Sort: Created (newest)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-gray-400">🧩</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {query
                ? "No flows match your search"
                : activeTab === "published"
                ? "No published flows yet"
                : "No draft flows yet"}
            </h3>
            <p className="text-gray-500 mb-6">
              {query
                ? "Try adjusting your search terms"
                : activeTab === "published"
                ? "Publish a draft to see it here"
                : "Create a new flow to get started"}
            </p>
            {!query && (
              <button
                onClick={() => navigate("/app/cta-flow/visual-builder")}
                className="border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-600 hover:text-white px-6 py-3 rounded-lg shadow-sm hover:shadow-lg transition-all duration-200 flex items-center gap-2 mx-auto"
              >
                <span className="text-lg">➕</span>
                Create Your First Flow
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(flow => (
              <div
                key={flow.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {flow.flowName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Created {formatDate(flow.createdAt)}
                      </p>
                    </div>
                    <div className="ml-3">{statusPill(flow.isPublished)}</div>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">📅</span>
                      <span>
                        Last modified:{" "}
                        {formatDate(flow.updatedAt || flow.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => goView(flow)}
                      className="flex-1 border-2 border-gray-300 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                      disabled={loading}
                    >
                      👁️ View
                    </button>

                    {/* PUBLISH (only for drafts) */}
                    {!flow.isPublished && (
                      <button
                        onClick={() => publishFlow(flow)}
                        className="flex-1 border-2 border-transparent bg-gradient-to-r from-emerald-200 to-emerald-300 hover:from-emerald-300 hover:to-emerald-400 text-emerald-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                        disabled={loading}
                        title="Publish this draft"
                      >
                        🚀 Publish
                      </button>
                    )}

                    <button
                      onClick={() => openDeleteModal(flow)}
                      className="border-2 border-transparent bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                      disabled={loading}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative bg-white rounded-lg shadow-2xl w-full max-w-xl p-8"
          >
            {modalMode === "attached" ? (
              <>
                <div className="flex items-start gap-4 mb-6">
                  <div className="shrink-0 mt-1 h-10 w-10 rounded-full bg-rose-100 text-rose-600 grid place-items-center">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Cannot delete this flow
                    </h3>
                    <p className="text-gray-600">
                      <span className="font-semibold text-gray-900">
                        {targetFlow?.flowName}
                      </span>{" "}
                      is attached to the following campaign
                      {modalCampaigns.length > 1 ? "s" : ""}. Delete those
                      first.
                    </p>
                  </div>
                </div>
                <div className="max-h-72 overflow-auto rounded-lg border divide-y">
                  {modalCampaigns.map(c => (
                    <div key={c.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-900">
                          {c.name}
                        </div>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
                          {c.status || "—"}
                        </span>
                      </div>
                      <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                        <div>
                          Created:{" "}
                          <span className="font-medium text-gray-800">
                            {formatDate(c.createdAt)}
                          </span>
                        </div>
                        <div>
                          Created by:{" "}
                          <span className="font-medium text-gray-800">
                            {c.createdBy || "—"}
                          </span>
                        </div>
                        <div>
                          Scheduled:{" "}
                          <span className="font-medium text-gray-800">
                            {formatDate(c.scheduledAt)}
                          </span>
                        </div>
                        <div>
                          First sent:{" "}
                          <span className="font-medium text-gray-800">
                            {formatDate(c.firstSentAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {modalCampaigns.length === 0 && (
                    <div className="p-3 text-sm text-gray-600">
                      Could not load campaigns.
                    </div>
                  )}
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    ref={closeBtnRef}
                    className="px-6 py-3 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    onClick={() => setModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-4 mb-6">
                  <div className="shrink-0 mt-1 h-10 w-10 rounded-full bg-rose-100 text-rose-600 grid place-items-center">
                    🗑️
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      Delete this flow permanently?
                    </h3>
                    <p className="text-gray-600">
                      This will remove{" "}
                      <span className="font-semibold text-gray-900">
                        {targetFlow?.flowName}
                      </span>{" "}
                      and all of its steps and button links. This action cannot
                      be undone.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-rose-200 p-4 bg-rose-50 text-rose-700 text-sm mb-6">
                  <span className="font-semibold">Warning:</span> Permanent
                  deletion cannot be recovered.
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    className="px-6 py-3 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    onClick={() => setModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-6 py-3 text-sm font-medium rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors"
                  >
                    Permanently delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// // 📄 File: xbytechat-ui/src/pages/CTAFlowVisualBuilder/CTAFlowManager.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// export default function CTAFlowManager() {
//   const [flows, setFlows] = useState([]);
//   const [activeTab, setActiveTab] = useState("published"); // default Published
//   const [loading, setLoading] = useState(true);

//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalMode, setModalMode] = useState("confirm"); // confirm | attached
//   const [modalCampaigns, setModalCampaigns] = useState([]);
//   const [targetFlow, setTargetFlow] = useState(null);

//   const [query, setQuery] = useState("");
//   const [sortKey, setSortKey] = useState("updated");
//   const closeBtnRef = useRef(null);
//   const navigate = useNavigate();

//   const formatDate = date =>
//     date
//       ? new Date(date).toLocaleString("en-IN", {
//           day: "2-digit",
//           month: "short",
//           year: "numeric",
//           hour: "2-digit",
//           minute: "2-digit",
//         })
//       : "—";

//   const statusPill = isPublished =>
//     isPublished ? (
//       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
//         <span>●</span> Published
//       </span>
//     ) : (
//       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
//         <span>●</span> Draft
//       </span>
//     );

//   const fetchFlows = async (tab = "published") => {
//     setLoading(true);
//     try {
//       const endpoint =
//         tab === "published" ? "/cta-flow/all-published" : "/cta-flow/all-draft";
//       const res = await axiosClient.get(endpoint);
//       setFlows(Array.isArray(res.data) ? res.data : [res.data]);
//     } catch (err) {
//       setFlows([]);
//       toast.error("❌ Failed to load flows.");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchFlows("published");
//   }, []);

//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     let out = flows;
//     if (q) {
//       out = out.filter(f =>
//         [f.flowName, f.createdBy]
//           .filter(Boolean)
//           .some(v => String(v).toLowerCase().includes(q))
//       );
//     }
//     switch (sortKey) {
//       case "name":
//         return [...out].sort((a, b) => a.flowName.localeCompare(b.flowName));
//       case "created":
//         return [...out].sort(
//           (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//         );
//       default:
//         return [...out].sort(
//           (a, b) =>
//             new Date(b.updatedAt || b.createdAt) -
//             new Date(a.updatedAt || a.createdAt)
//         );
//     }
//   }, [flows, query, sortKey]);

//   // ---- delete UX (checks usage) ----
//   const openDeleteModal = async flow => {
//     if (loading) return; // guard
//     setTargetFlow(flow);
//     setLoading(true);
//     try {
//       const { data } = await axiosClient.get(`/cta-flow/${flow.id}/usage`);
//       if (data?.canDelete) {
//         setModalMode("confirm");
//         setModalCampaigns([]);
//       } else {
//         setModalMode("attached");
//         setModalCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
//       }
//       setModalOpen(true);
//       setTimeout(() => closeBtnRef.current?.focus(), 0);
//     } catch (err) {
//       toast.error("❌ Could not check usage for this flow.");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const confirmDelete = async () => {
//     if (!targetFlow) return;
//     setLoading(true);
//     try {
//       const res = await axiosClient.delete(`/cta-flow/${targetFlow.id}`);
//       if (res.status === 204 || res.status === 200) {
//         toast.success("✅ Flow deleted permanently.");
//         setModalOpen(false);
//         setTargetFlow(null);
//         await fetchFlows(activeTab);
//       } else {
//         toast.info("ℹ️ Unexpected response while deleting the flow.");
//       }
//     } catch (err) {
//       const status = err?.response?.status;
//       if (status === 409) {
//         const campaigns = err.response?.data?.campaigns ?? [];
//         setModalMode("attached");
//         setModalCampaigns(campaigns);
//       } else if (status === 404) {
//         toast.error("❌ Flow not found.");
//         setModalOpen(false);
//       } else {
//         toast.error("❌ Failed to delete flow.");
//         setModalOpen(false);
//       }
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ---- publish from draft tab ----
//   const publishFlow = async flow => {
//     if (loading) return; // guard against spam clicks
//     try {
//       setLoading(true);
//       await axiosClient.post(`/cta-flow/${flow.id}/publish`);
//       toast.success("✅ Flow published.");
//       // After publish, jump user to Published tab
//       setActiveTab("published");
//       await fetchFlows("published");
//     } catch (err) {
//       const status = err?.response?.status;
//       if (status === 409) {
//         // If backend blocks due to attachments (unlikely for drafts), surface message
//         toast.error(
//           err?.response?.data?.message || "❌ Cannot publish right now."
//         );
//       } else if (status === 404) {
//         toast.error("❌ Flow not found.");
//       } else {
//         toast.error("❌ Failed to publish flow.");
//       }
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ---- edit navigation (fix: ignore click while loading) ----
//   const goEdit = flow => {
//     if (loading) return;
//     // Always open builder in edit mode; builder enforces policies (fork/republish etc.)
//     navigate(`/app/cta-flow/visual-builder?id=${flow.id}&mode=edit`);
//   };

//   const goView = flow => {
//     if (loading) return;
//     navigate(`/app/cta-flow/visual-builder?id=${flow.id}&mode=view`);
//   };

//   return (
//     <div className="p-6 relative">
//       {/* Loading overlay */}
//       {loading && (
//         <>
//           <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
//             <div className="flex items-center gap-3 text-gray-700">
//               <svg
//                 className="xafb-spin h-6 w-6 text-purple-600"
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 24 24"
//                 fill="none"
//               >
//                 <circle
//                   cx="12"
//                   cy="12"
//                   r="10"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                   opacity="0.25"
//                 />
//                 <path
//                   d="M4 12a8 8 0 018-8"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                   strokeLinecap="round"
//                   opacity="0.85"
//                 />
//               </svg>
//               <span className="text-sm">Loading…</span>
//             </div>
//           </div>
//           <style>{`@keyframes xafb-spin{to{transform:rotate(360deg)}}.xafb-spin{animation:xafb-spin 1s linear infinite}`}</style>
//         </>
//       )}

//       {/* Header */}
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">
//             🧩 CTA Flow Manager
//           </h1>
//           <p className="text-sm text-gray-500">
//             Create, publish, and manage your visual flows.
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => navigate("/app/cta-flow/visual-builder")}
//             className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow disabled:opacity-50"
//             disabled={loading}
//           >
//             ➕ New Flow
//           </button>
//         </div>
//       </div>

//       {/* Sticky controls */}
//       <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 rounded-xl border p-3 mb-4">
//         <div className="flex flex-col sm:flex-row sm:items-center gap-3">
//           <div className="flex gap-3">
//             {[
//               { key: "published", label: "✅ Published Flows" },
//               { key: "draft", label: "📝 Draft Flows" },
//             ].map(t => (
//               <button
//                 key={t.key}
//                 className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
//                   activeTab === t.key
//                     ? "bg-purple-600 text-white shadow"
//                     : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
//                 }`}
//                 onClick={() => {
//                   if (loading) return;
//                   setActiveTab(t.key);
//                   fetchFlows(t.key);
//                 }}
//                 disabled={loading}
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>

//           <div className="flex-1" />

//           {/* Search + sort */}
//           <div className="flex items-center gap-2">
//             <div className="relative">
//               <input
//                 type="text"
//                 className="w-64 max-w-full rounded-md border-gray-300 focus:ring-purple-500 focus:border-purple-500 text-sm"
//                 placeholder="Search by name or creator…"
//                 value={query}
//                 onChange={e => setQuery(e.target.value)}
//               />
//               <div className="absolute inset-y-0 right-2 grid place-items-center pointer-events-none text-gray-400">
//                 🔎
//               </div>
//             </div>
//             <select
//               className="rounded-md border-gray-300 text-sm focus:ring-purple-500 focus:border-purple-500"
//               value={sortKey}
//               onChange={e => setSortKey(e.target.value)}
//             >
//               <option value="updated">Sort: Last updated</option>
//               <option value="name">Sort: Name (A–Z)</option>
//               <option value="created">Sort: Created (newest)</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Table */}
//       {filtered.length === 0 ? (
//         <div className="text-gray-500 text-center py-16">
//           {query
//             ? "No flows match your search."
//             : activeTab === "published"
//             ? "No published flows yet. Publish a draft to see it here."
//             : "No draft flows yet. Create a new flow to get started."}
//         </div>
//       ) : (
//         <div className="bg-white rounded-xl shadow overflow-hidden">
//           <table className="w-full text-sm">
//             <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs tracking-wide">
//               <tr>
//                 <th className="px-4 py-3 text-left">Flow Name</th>
//                 <th className="px-4 py-3 text-left">Status</th>
//                 <th className="px-4 py-3 text-left">Last Modified</th>
//                 <th className="px-4 py-3 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-100">
//               {filtered.map(flow => (
//                 <tr key={flow.id} className="hover:bg-gray-50">
//                   <td className="px-4 py-3">
//                     <div className="font-medium text-gray-900">
//                       {flow.flowName}
//                     </div>
//                     <div className="text-xs text-gray-500">
//                       Created {formatDate(flow.createdAt)}
//                     </div>
//                   </td>
//                   <td className="px-4 py-3">{statusPill(flow.isPublished)}</td>
//                   <td className="px-4 py-3 text-gray-700">
//                     {formatDate(flow.updatedAt || flow.createdAt)}
//                   </td>
//                   <td className="px-4 py-3">
//                     <div className="flex justify-end gap-3">
//                       <button
//                         onClick={() => goView(flow)}
//                         className="text-blue-600 hover:underline text-xs disabled:opacity-50"
//                         disabled={loading}
//                       >
//                         👁️ View
//                       </button>

//                       {/* EDIT */}
//                       {/* <button
//                         onClick={() => goEdit(flow)}
//                         className="text-amber-600 hover:underline text-xs disabled:opacity-50"
//                         disabled={loading}
//                       >
//                         ✏️ {flow.isPublished ? "Edit" : "Edit Draft"}
//                       </button> */}

//                       {/* PUBLISH (only show for drafts) */}
//                       {!flow.isPublished && (
//                         <button
//                           onClick={() => publishFlow(flow)}
//                           className="text-emerald-600 hover:underline text-xs disabled:opacity-50"
//                           disabled={loading}
//                           title="Publish this draft"
//                         >
//                           🚀 Publish
//                         </button>
//                       )}

//                       {/* DELETE */}
//                       <button
//                         onClick={() => openDeleteModal(flow)}
//                         className="text-rose-600 hover:underline text-xs disabled:opacity-50"
//                         disabled={loading}
//                       >
//                         🗑️ Delete
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Modal */}
//       {modalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center">
//           <div
//             className="absolute inset-0 bg-black/40"
//             onClick={() => setModalOpen(false)}
//           />
//           <div
//             role="dialog"
//             aria-modal="true"
//             className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6"
//           >
//             {modalMode === "attached" ? (
//               <>
//                 <div className="flex items-start gap-3 mb-4">
//                   <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-rose-50 text-rose-600 grid place-items-center">
//                     ⚠️
//                   </div>
//                   <div>
//                     <h3 className="text-lg font-semibold text-gray-900">
//                       Cannot delete this flow
//                     </h3>
//                     <p className="text-sm text-gray-600">
//                       <span className="font-medium">
//                         {targetFlow?.flowName}
//                       </span>{" "}
//                       is attached to the following campaign
//                       {modalCampaigns.length > 1 ? "s" : ""}. Delete those
//                       first.
//                     </p>
//                   </div>
//                 </div>
//                 <div className="max-h-72 overflow-auto rounded-lg border divide-y">
//                   {modalCampaigns.map(c => (
//                     <div key={c.id} className="p-3 text-sm">
//                       <div className="flex items-center justify-between">
//                         <div className="font-semibold text-gray-900">
//                           {c.name}
//                         </div>
//                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
//                           {c.status || "—"}
//                         </span>
//                       </div>
//                       <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
//                         <div>
//                           Created:{" "}
//                           <span className="font-medium text-gray-800">
//                             {formatDate(c.createdAt)}
//                           </span>
//                         </div>
//                         <div>
//                           Created by:{" "}
//                           <span className="font-medium text-gray-800">
//                             {c.createdBy || "—"}
//                           </span>
//                         </div>
//                         <div>
//                           Scheduled:{" "}
//                           <span className="font-medium text-gray-800">
//                             {formatDate(c.scheduledAt)}
//                           </span>
//                         </div>
//                         <div>
//                           First sent:{" "}
//                           <span className="font-medium text-gray-800">
//                             {formatDate(c.firstSentAt)}
//                           </span>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                   {modalCampaigns.length === 0 && (
//                     <div className="p-3 text-sm text-gray-600">
//                       Could not load campaigns.
//                     </div>
//                   )}
//                 </div>
//                 <div className="mt-5 flex justify-end">
//                   <button
//                     ref={closeBtnRef}
//                     className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
//                     onClick={() => setModalOpen(false)}
//                   >
//                     Close
//                   </button>
//                 </div>
//               </>
//             ) : (
//               <>
//                 <div className="flex items-start gap-3 mb-4">
//                   <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-rose-50 text-rose-600 grid place-items-center">
//                     🗑️
//                   </div>
//                   <div>
//                     <h3 className="text-lg font-semibold text-gray-900">
//                       Delete this flow permanently?
//                     </h3>
//                     <p className="text-sm text-gray-600">
//                       This will remove{" "}
//                       <span className="font-medium">
//                         {targetFlow?.flowName}
//                       </span>{" "}
//                       and all of its steps and button links. This action cannot
//                       be undone.
//                     </p>
//                   </div>
//                 </div>
//                 <div className="rounded-lg border p-3 bg-rose-50 text-rose-700 text-sm">
//                   <span className="font-semibold">Warning:</span> Permanent
//                   deletion cannot be recovered.
//                 </div>
//                 <div className="mt-5 flex justify-end gap-2">
//                   <button
//                     className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
//                     onClick={() => setModalOpen(false)}
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     onClick={confirmDelete}
//                     className="px-3 py-2 text-sm rounded bg-rose-600 text-white hover:bg-rose-700"
//                   >
//                     Permanently delete
//                   </button>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// // 📄 File: xbytechat-ui/src/pages/CTAFlowVisualBuilder/CTAFlowManager.jsx
// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// export default function CTAFlowManager() {
//   const [flows, setFlows] = useState([]);
//   const [activeTab, setActiveTab] = useState("published"); // default Published
//   const [loading, setLoading] = useState(true);

//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalMode, setModalMode] = useState("confirm"); // confirm | attached
//   const [modalCampaigns, setModalCampaigns] = useState([]);
//   const [targetFlow, setTargetFlow] = useState(null);

//   const [query, setQuery] = useState("");
//   const [sortKey, setSortKey] = useState("updated");
//   const closeBtnRef = useRef(null);
//   const navigate = useNavigate();

//   const formatDate = date =>
//     date
//       ? new Date(date).toLocaleString("en-IN", {
//           day: "2-digit",
//           month: "short",
//           year: "numeric",
//           hour: "2-digit",
//           minute: "2-digit",
//         })
//       : "—";

//   const statusPill = isPublished =>
//     isPublished ? (
//       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
//         <span>●</span> Published
//       </span>
//     ) : (
//       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
//         <span>●</span> Draft
//       </span>
//     );

//   const fetchFlows = async (tab = "published") => {
//     setLoading(true);
//     try {
//       const endpoint =
//         tab === "published" ? "/cta-flow/all-published" : "/cta-flow/all-draft";
//       const res = await axiosClient.get(endpoint);
//       setFlows(Array.isArray(res.data) ? res.data : [res.data]);
//     } catch (err) {
//       setFlows([]);
//       toast.error("❌ Failed to load flows");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchFlows("published");
//   }, []);

//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     let out = flows;
//     if (q) {
//       out = out.filter(f =>
//         [f.flowName, f.createdBy]
//           .filter(Boolean)
//           .some(v => String(v).toLowerCase().includes(q))
//       );
//     }
//     switch (sortKey) {
//       case "name":
//         return [...out].sort((a, b) => a.flowName.localeCompare(b.flowName));
//       case "created":
//         return [...out].sort(
//           (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//         );
//       default:
//         return [...out].sort(
//           (a, b) =>
//             new Date(b.updatedAt || b.createdAt) -
//             new Date(a.updatedAt || a.createdAt)
//         );
//     }
//   }, [flows, query, sortKey]);

//   // ---- delete UX (checks usage) ----
//   const openDeleteModal = async flow => {
//     setTargetFlow(flow);
//     setLoading(true);
//     try {
//       const { data } = await axiosClient.get(`/cta-flow/${flow.id}/usage`);
//       if (data?.canDelete) {
//         setModalMode("confirm");
//         setModalCampaigns([]);
//       } else {
//         setModalMode("attached");
//         setModalCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
//       }
//       setModalOpen(true);
//       setTimeout(() => closeBtnRef.current?.focus(), 0);
//     } catch (err) {
//       toast.error("❌ Could not check usage for this flow.");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const confirmDelete = async () => {
//     if (!targetFlow) return;
//     setLoading(true);
//     try {
//       const res = await axiosClient.delete(`/cta-flow/${targetFlow.id}`);
//       if (res.status === 204 || res.status === 200) {
//         toast.success("✅ Flow deleted permanently.");
//         setModalOpen(false);
//         setTargetFlow(null);
//         await fetchFlows(activeTab);
//       } else {
//         toast.info("Unexpected response while deleting the flow.");
//       }
//     } catch (err) {
//       const status = err?.response?.status;
//       if (status === 409) {
//         const campaigns = err.response?.data?.campaigns ?? [];
//         setModalMode("attached");
//         setModalCampaigns(campaigns);
//       } else if (status === 404) {
//         toast.error("❌ Flow not found.");
//         setModalOpen(false);
//       } else {
//         toast.error("❌ Failed to delete flow.");
//         setModalOpen(false);
//       }
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="p-6 relative">
//       {/* Loading overlay */}
//       {loading && (
//         <>
//           <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
//             <div className="flex items-center gap-3 text-gray-700">
//               <svg
//                 className="xafb-spin h-6 w-6 text-purple-600"
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 24 24"
//                 fill="none"
//               >
//                 <circle
//                   cx="12"
//                   cy="12"
//                   r="10"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                   opacity="0.25"
//                 />
//                 <path
//                   d="M4 12a8 8 0 018-8"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                   strokeLinecap="round"
//                   opacity="0.85"
//                 />
//               </svg>
//               <span className="text-sm">Loading…</span>
//             </div>
//           </div>
//           <style>{`@keyframes xafb-spin{to{transform:rotate(360deg)}}.xafb-spin{animation:xafb-spin 1s linear infinite}`}</style>
//         </>
//       )}

//       {/* Header */}
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">
//             🧩 CTA Flow Manager
//           </h1>
//           <p className="text-sm text-gray-500">
//             Create, publish, and manage your visual flows.
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => navigate("/app/cta-flow/visual-builder")}
//             className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow disabled:opacity-50"
//             disabled={loading}
//           >
//             ➕ New Flow
//           </button>
//         </div>
//       </div>

//       {/* Sticky controls */}
//       <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 rounded-xl border p-3 mb-4">
//         <div className="flex flex-col sm:flex-row sm:items-center gap-3">
//           <div className="flex gap-3">
//             {[
//               { key: "published", label: "✅ Published Flows" },
//               { key: "draft", label: "📝 Draft Flows" },
//             ].map(t => (
//               <button
//                 key={t.key}
//                 className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
//                   activeTab === t.key
//                     ? "bg-purple-600 text-white shadow"
//                     : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
//                 }`}
//                 onClick={() => {
//                   setActiveTab(t.key);
//                   fetchFlows(t.key);
//                 }}
//                 disabled={loading}
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>

//           <div className="flex-1" />

//           {/* Search + sort */}
//           <div className="flex items-center gap-2">
//             <div className="relative">
//               <input
//                 type="text"
//                 className="w-64 max-w-full rounded-md border-gray-300 focus:ring-purple-500 focus:border-purple-500 text-sm"
//                 placeholder="Search by name or creator…"
//                 value={query}
//                 onChange={e => setQuery(e.target.value)}
//               />
//               <div className="absolute inset-y-0 right-2 grid place-items-center pointer-events-none text-gray-400">
//                 🔎
//               </div>
//             </div>
//             <select
//               className="rounded-md border-gray-300 text-sm focus:ring-purple-500 focus:border-purple-500"
//               value={sortKey}
//               onChange={e => setSortKey(e.target.value)}
//             >
//               <option value="updated">Sort: Last updated</option>
//               <option value="name">Sort: Name (A–Z)</option>
//               <option value="created">Sort: Created (newest)</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Table */}
//       {filtered.length === 0 ? (
//         <div className="text-gray-500 text-center py-16">
//           {query
//             ? "No flows match your search."
//             : activeTab === "published"
//             ? "No published flows yet. Publish a draft to see it here."
//             : "No draft flows yet. Create a new flow to get started."}
//         </div>
//       ) : (
//         <div className="bg-white rounded-xl shadow overflow-hidden">
//           <table className="w-full text-sm">
//             <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs tracking-wide">
//               <tr>
//                 <th className="px-4 py-3 text-left">Flow Name</th>
//                 <th className="px-4 py-3 text-left">Status</th>
//                 <th className="px-4 py-3 text-left">Last Modified</th>
//                 <th className="px-4 py-3 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-100">
//               {filtered.map(flow => (
//                 <tr key={flow.id} className="hover:bg-gray-50">
//                   <td className="px-4 py-3">
//                     <div className="font-medium text-gray-900">
//                       {flow.flowName}
//                     </div>
//                     <div className="text-xs text-gray-500">
//                       Created {formatDate(flow.createdAt)}
//                     </div>
//                   </td>
//                   <td className="px-4 py-3">{statusPill(flow.isPublished)}</td>
//                   <td className="px-4 py-3 text-gray-700">
//                     {formatDate(flow.updatedAt || flow.createdAt)}
//                   </td>
//                   <td className="px-4 py-3">
//                     <div className="flex justify-end gap-3">
//                       <button
//                         onClick={() =>
//                           navigate(
//                             `/app/cta-flow/visual-builder?id=${flow.id}&mode=view`
//                           )
//                         }
//                         className="text-blue-600 hover:underline text-xs disabled:opacity-50"
//                         disabled={loading}
//                       >
//                         👁️ View
//                       </button>

//                       {/* EDIT gate: if published, we'll decide in the builder whether republish is needed or fork */}
//                       <button
//                         onClick={() =>
//                           navigate(
//                             `/app/cta-flow/visual-builder?id=${flow.id}&mode=edit`
//                           )
//                         }
//                         className="text-amber-600 hover:underline text-xs disabled:opacity-50"
//                         disabled={loading}
//                       >
//                         ✏️ Edit
//                       </button>

//                       <button
//                         onClick={() => openDeleteModal(flow)}
//                         className="text-rose-600 hover:underline text-xs disabled:opacity-50"
//                         disabled={loading}
//                       >
//                         🗑️ Delete
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Modal */}
//       {modalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center">
//           <div
//             className="absolute inset-0 bg-black/40"
//             onClick={() => setModalOpen(false)}
//           />
//           <div
//             role="dialog"
//             aria-modal="true"
//             className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6"
//           >
//             {modalMode === "attached" ? (
//               <>
//                 <div className="flex items-start gap-3 mb-4">
//                   <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-rose-50 text-rose-600 grid place-items-center">
//                     ⚠️
//                   </div>
//                   <div>
//                     <h3 className="text-lg font-semibold text-gray-900">
//                       Cannot delete this flow
//                     </h3>
//                     <p className="text-sm text-gray-600">
//                       <span className="font-medium">
//                         {targetFlow?.flowName}
//                       </span>{" "}
//                       is attached to the following campaign
//                       {modalCampaigns.length > 1 ? "s" : ""}. Delete those
//                       first.
//                     </p>
//                   </div>
//                 </div>
//                 <div className="max-h-72 overflow-auto rounded-lg border divide-y">
//                   {modalCampaigns.map(c => (
//                     <div key={c.id} className="p-3 text-sm">
//                       <div className="flex items-center justify-between">
//                         <div className="font-semibold text-gray-900">
//                           {c.name}
//                         </div>
//                         <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700">
//                           {c.status || "—"}
//                         </span>
//                       </div>
//                       <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
//                         <div>
//                           Created:{" "}
//                           <span className="font-medium text-gray-800">
//                             {formatDate(c.createdAt)}
//                           </span>
//                         </div>
//                         <div>
//                           Created by:{" "}
//                           <span className="font-medium text-gray-800">
//                             {c.createdBy || "—"}
//                           </span>
//                         </div>
//                         <div>
//                           Scheduled:{" "}
//                           <span className="font-medium text-gray-800">
//                             {formatDate(c.scheduledAt)}
//                           </span>
//                         </div>
//                         <div>
//                           First sent:{" "}
//                           <span className="font-medium text-gray-800">
//                             {formatDate(c.firstSentAt)}
//                           </span>
//                         </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//                 <div className="mt-5 flex justify-end">
//                   <button
//                     ref={closeBtnRef}
//                     className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
//                     onClick={() => setModalOpen(false)}
//                   >
//                     Close
//                   </button>
//                 </div>
//               </>
//             ) : (
//               <>
//                 <div className="flex items-start gap-3 mb-4">
//                   <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-rose-50 text-rose-600 grid place-items-center">
//                     🗑️
//                   </div>
//                   <div>
//                     <h3 className="text-lg font-semibold text-gray-900">
//                       Delete this flow permanently?
//                     </h3>
//                     <p className="text-sm text-gray-600">
//                       This will remove{" "}
//                       <span className="font-medium">
//                         {targetFlow?.flowName}
//                       </span>{" "}
//                       and all of its steps and button links. This action cannot
//                       be undone.
//                     </p>
//                   </div>
//                 </div>
//                 <div className="rounded-lg border p-3 bg-rose-50 text-rose-700 text-sm">
//                   <span className="font-semibold">Warning:</span> Permanent
//                   deletion cannot be recovered.
//                 </div>
//                 <div className="mt-5 flex justify-end gap-2">
//                   <button
//                     className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
//                     onClick={() => setModalOpen(false)}
//                   >
//                     Cancel
//                   </button>
//                   <button
//                     onClick={confirmDelete}
//                     className="px-3 py-2 text-sm rounded bg-rose-600 text-white hover:bg-rose-700"
//                   >
//                     Permanently delete
//                   </button>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useNavigate } from "react-router-dom";
// import axiosClient from "../../api/axiosClient";
// import { toast } from "react-toastify";

// export default function CTAFlowManager() {
//   // ---------- state ----------
//   const [flows, setFlows] = useState([]);
//   const [activeTab, setActiveTab] = useState("published"); // ✅ default to published
//   const [loading, setLoading] = useState(true);

//   // Search + sort (client-side)
//   const [query, setQuery] = useState("");
//   const [sortKey, setSortKey] = useState("updated"); // updated | name | created

//   // Modal
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalMode, setModalMode] = useState("confirm"); // confirm | attached
//   const [modalCampaigns, setModalCampaigns] = useState([]);
//   const [targetFlow, setTargetFlow] = useState(null);

//   const navigate = useNavigate();
//   const closeBtnRef = useRef(null);

//   // ---------- helpers ----------
//   const formatDate = date => {
//     if (!date) return "—";
//     const d = new Date(date);
//     return d.toLocaleString("en-IN", {
//       day: "2-digit",
//       month: "short",
//       year: "numeric",
//       hour: "2-digit",
//       minute: "2-digit",
//     });
//   };

//   const statusPill = isPublished =>
//     isPublished ? (
//       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
//         <span>●</span> Published
//       </span>
//     ) : (
//       <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
//         <span>●</span> Draft
//       </span>
//     );

//   const renderStatusBadge = status => {
//     const s = (status || "").toLowerCase();
//     const map = {
//       draft: "bg-amber-100 text-amber-700",
//       scheduled: "bg-sky-100 text-sky-700",
//       running: "bg-blue-100 text-blue-700",
//       sent: "bg-emerald-100 text-emerald-700",
//       completed: "bg-emerald-100 text-emerald-700",
//       failed: "bg-rose-100 text-rose-700",
//     };
//     const cls = map[s] || "bg-gray-100 text-gray-700";
//     return (
//       <span
//         className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}
//       >
//         {status || "—"}
//       </span>
//     );
//   };

//   // ---------- data ----------
//   const fetchFlows = async (tab = "published") => {
//     setLoading(true);
//     try {
//       const endpoint =
//         tab === "published" ? "/cta-flow/all-published" : "/cta-flow/all-draft";
//       const res = await axiosClient.get(endpoint);
//       const list = Array.isArray(res.data) ? res.data : [res.data];
//       setFlows(list);
//     } catch (err) {
//       setFlows([]);
//       toast.error("❌ Failed to load flows");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchFlows("published"); // ✅ first load = published
//   }, []);

//   // ---------- search + sort (client-side) ----------
//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     let out = flows;
//     if (q) {
//       out = out.filter(f =>
//         [f.flowName, f.createdBy]
//           .filter(Boolean)
//           .some(v => String(v).toLowerCase().includes(q))
//       );
//     }
//     switch (sortKey) {
//       case "name":
//         out = [...out].sort((a, b) => a.flowName.localeCompare(b.flowName));
//         break;
//       case "created":
//         out = [...out].sort(
//           (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
//         );
//         break;
//       default:
//         out = [...out].sort(
//           (a, b) =>
//             new Date(b.updatedAt || b.createdAt) -
//             new Date(a.updatedAt || a.createdAt)
//         );
//     }
//     return out;
//   }, [flows, query, sortKey]);

//   // ---------- delete flow UX ----------
//   const openDeleteModal = async flow => {
//     setTargetFlow(flow);
//     setLoading(true);
//     try {
//       const { data } = await axiosClient.get(`/cta-flow/${flow.id}/usage`);
//       if (data?.canDelete) {
//         setModalMode("confirm");
//         setModalCampaigns([]);
//       } else {
//         setModalMode("attached");
//         setModalCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
//       }
//       setModalOpen(true);
//       setTimeout(() => closeBtnRef.current?.focus(), 0);
//     } catch (err) {
//       toast.error("❌ Could not check usage for this flow.");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const confirmDelete = async () => {
//     if (!targetFlow) return;
//     setLoading(true);
//     try {
//       const res = await axiosClient.delete(`/cta-flow/${targetFlow.id}`);
//       if (res.status === 204 || res.status === 200) {
//         toast.success("✅ Flow deleted permanently.");
//         setModalOpen(false);
//         setTargetFlow(null);
//         await fetchFlows(activeTab);
//       } else {
//         toast.info("Unexpected response while deleting the flow.");
//       }
//     } catch (err) {
//       const status = err?.response?.status;
//       if (status === 409) {
//         const campaigns = err.response?.data?.campaigns ?? [];
//         setModalMode("attached");
//         setModalCampaigns(campaigns);
//       } else if (status === 404) {
//         toast.error("❌ Flow not found.");
//         setModalOpen(false);
//       } else {
//         toast.error("❌ Failed to delete flow.");
//         setModalOpen(false);
//       }
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ---------- UI ----------
//   return (
//     <div className="p-6 relative">
//       {/* Loading overlay */}
//       {loading && (
//         <>
//           <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
//             <div className="flex items-center gap-3 text-gray-700">
//               <svg
//                 className="xafb-spin h-6 w-6 text-purple-600"
//                 xmlns="http://www.w3.org/2000/svg"
//                 viewBox="0 0 24 24"
//                 fill="none"
//               >
//                 <circle
//                   cx="12"
//                   cy="12"
//                   r="10"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                   opacity="0.25"
//                 />
//                 <path
//                   d="M4 12a8 8 0 018-8"
//                   stroke="currentColor"
//                   strokeWidth="4"
//                   strokeLinecap="round"
//                   opacity="0.85"
//                 />
//               </svg>
//               <span className="text-sm">Loading…</span>
//             </div>
//           </div>
//           <style>{`@keyframes xafb-spin{to{transform:rotate(360deg)}}.xafb-spin{animation:xafb-spin 1s linear infinite}`}</style>
//         </>
//       )}

//       {/* Page header */}
//       <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-6">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">
//             🧩 CTA Flow Manager
//           </h1>
//           <p className="text-sm text-gray-500">
//             Create, publish, and manage your visual flows.
//           </p>
//         </div>
//         <div className="flex items-center gap-2">
//           <button
//             onClick={() => navigate("/app/cta-flow/visual-builder")}
//             className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md shadow disabled:opacity-50"
//             disabled={loading}
//           >
//             ➕ New Flow
//           </button>
//         </div>
//       </div>

//       {/* Sticky controls */}
//       <div className="sticky top-0 z-10 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70 rounded-xl border p-3 mb-4">
//         <div className="flex flex-col sm:flex-row sm:items-center gap-3">
//           {/* Tabs */}
//           <div className="flex gap-3">
//             {[
//               { key: "published", label: "✅ Published Flows" },
//               { key: "draft", label: "📝 Draft Flows" },
//             ].map(t => (
//               <button
//                 key={t.key}
//                 className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
//                   activeTab === t.key
//                     ? "bg-purple-600 text-white shadow"
//                     : "text-gray-600 hover:text-purple-700 hover:bg-purple-50"
//                 }`}
//                 onClick={() => {
//                   setActiveTab(t.key);
//                   fetchFlows(t.key);
//                 }}
//                 disabled={loading}
//               >
//                 {t.label}
//               </button>
//             ))}
//           </div>

//           {/* Spacer */}
//           <div className="flex-1" />

//           {/* Search */}
//           <div className="flex items-center gap-2">
//             <div className="relative">
//               <input
//                 type="text"
//                 className="w-64 max-w-full rounded-md border-gray-300 focus:ring-purple-500 focus:border-purple-500 text-sm"
//                 placeholder="Search by name or creator…"
//                 value={query}
//                 onChange={e => setQuery(e.target.value)}
//               />
//               <div className="absolute inset-y-0 right-2 grid place-items-center pointer-events-none text-gray-400">
//                 🔎
//               </div>
//             </div>

//             {/* Sort */}
//             <select
//               className="rounded-md border-gray-300 text-sm focus:ring-purple-500 focus:border-purple-500"
//               value={sortKey}
//               onChange={e => setSortKey(e.target.value)}
//             >
//               <option value="updated">Sort: Last updated</option>
//               <option value="name">Sort: Name (A–Z)</option>
//               <option value="created">Sort: Created (newest)</option>
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Content */}
//       {filtered.length === 0 ? (
//         <div className="text-gray-500 text-center py-16">
//           {query
//             ? "No flows match your search."
//             : activeTab === "published"
//             ? "No published flows yet. Publish a draft to see it here."
//             : "No draft flows yet. Create a new flow to get started."}
//         </div>
//       ) : (
//         <div className="bg-white rounded-xl shadow overflow-hidden">
//           <table className="w-full text-sm">
//             <thead className="bg-gray-50 border-b text-gray-500 uppercase text-xs tracking-wide">
//               <tr>
//                 <th className="px-4 py-3 text-left">Flow Name</th>
//                 <th className="px-4 py-3 text-left">Status</th>
//                 <th className="px-4 py-3 text-left">Last Modified</th>
//                 <th className="px-4 py-3 text-right">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-100">
//               {filtered.map(flow => (
//                 <tr key={flow.id} className="hover:bg-gray-50">
//                   <td className="px-4 py-3">
//                     <div className="font-medium text-gray-900">
//                       {flow.flowName}
//                     </div>
//                     <div className="text-xs text-gray-500">
//                       Created {formatDate(flow.createdAt)}
//                     </div>
//                   </td>
//                   <td className="px-4 py-3">{statusPill(flow.isPublished)}</td>
//                   <td className="px-4 py-3 text-gray-700">
//                     {formatDate(flow.updatedAt || flow.createdAt)}
//                   </td>
//                   <td className="px-4 py-3">
//                     <div className="flex justify-end gap-3">
//                       <button
//                         onClick={() =>
//                           navigate(
//                             `/app/cta-flow/visual-builder?id=${flow.id}&mode=view`
//                           )
//                         }
//                         className="text-blue-600 hover:underline text-xs disabled:opacity-50"
//                         disabled={loading}
//                       >
//                         👁️ View
//                       </button>
//                       {!flow.isPublished && (
//                         <button
//                           onClick={() =>
//                             navigate(
//                               `/app/cta-flow/visual-builder?id=${flow.id}&mode=edit`
//                             )
//                           }
//                           className="text-amber-600 hover:underline text-xs disabled:opacity-50"
//                           disabled={loading}
//                         >
//                           ✏️ Edit
//                         </button>
//                       )}
//                       <button
//                         onClick={() => openDeleteModal(flow)}
//                         className="text-rose-600 hover:underline text-xs disabled:opacity-50"
//                         disabled={loading}
//                       >
//                         🗑️ Delete
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Modal */}
//       {modalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center">
//           <div
//             className="absolute inset-0 bg-black/40"
//             onClick={() => setModalOpen(false)}
//           />
//           <div
//             role="dialog"
//             aria-modal="true"
//             className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6"
//           >
//             {/* Header */}
//             {modalMode === "attached" ? (
//               <div className="flex items-start gap-3 mb-4">
//                 <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-rose-50 text-rose-600 grid place-items-center">
//                   ⚠️
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-semibold text-gray-900">
//                     Cannot delete this flow
//                   </h3>
//                   <p className="text-sm text-gray-600">
//                     <span className="font-medium">{targetFlow?.flowName}</span>{" "}
//                     is attached to the campaign
//                     {modalCampaigns.length > 1 ? "s" : ""} below. Delete those
//                     campaign
//                     {modalCampaigns.length > 1 ? "s" : ""} first.
//                   </p>
//                 </div>
//               </div>
//             ) : (
//               <div className="flex items-start gap-3 mb-4">
//                 <div className="shrink-0 mt-0.5 h-8 w-8 rounded-full bg-rose-50 text-rose-600 grid place-items-center">
//                   🗑️
//                 </div>
//                 <div>
//                   <h3 className="text-lg font-semibold text-gray-900">
//                     Delete this flow permanently?
//                   </h3>
//                   <p className="text-sm text-gray-600">
//                     This will remove{" "}
//                     <span className="font-medium">{targetFlow?.flowName}</span>{" "}
//                     and all of its steps and button links. This action cannot be
//                     undone.
//                   </p>
//                 </div>
//               </div>
//             )}

//             {/* Body */}
//             {modalMode === "attached" ? (
//               <div className="max-h-72 overflow-auto rounded-lg border divide-y">
//                 {modalCampaigns.map(c => (
//                   <div key={c.id} className="p-3 text-sm">
//                     <div className="flex items-center justify-between">
//                       <div className="font-semibold text-gray-900">
//                         {c.name}
//                       </div>
//                       {renderStatusBadge(c.status)}
//                     </div>
//                     <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
//                       <div>
//                         Created:{" "}
//                         <span className="font-medium text-gray-800">
//                           {formatDate(c.createdAt)}
//                         </span>
//                       </div>
//                       <div>
//                         Created by:{" "}
//                         <span className="font-medium text-gray-800">
//                           {c.createdBy || "—"}
//                         </span>
//                       </div>
//                       <div>
//                         Scheduled:{" "}
//                         <span className="font-medium text-gray-800">
//                           {formatDate(c.scheduledAt)}
//                         </span>
//                       </div>
//                       <div>
//                         First sent:{" "}
//                         <span className="font-medium text-gray-800">
//                           {formatDate(c.firstSentAt)}
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             ) : (
//               <div className="rounded-lg border p-3 bg-rose-50 text-rose-700 text-sm">
//                 <span className="font-semibold">Warning:</span> This will
//                 permanently delete the flow and its data.
//               </div>
//             )}

//             {/* Footer */}
//             <div className="mt-5 flex justify-end gap-2">
//               <button
//                 ref={closeBtnRef}
//                 className="px-3 py-2 text-sm rounded border hover:bg-gray-50"
//                 onClick={() => setModalOpen(false)}
//               >
//                 Close
//               </button>
//               {modalMode === "confirm" && (
//                 <button
//                   onClick={confirmDelete}
//                   className="px-3 py-2 text-sm rounded bg-rose-600 text-white hover:bg-rose-700"
//                 >
//                   Permanently delete
//                 </button>
//               )}
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
