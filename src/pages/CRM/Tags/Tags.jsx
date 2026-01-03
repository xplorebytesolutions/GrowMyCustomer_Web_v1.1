import React, { useEffect, useMemo, useState } from "react";
import { Tag as TagIcon, X } from "lucide-react";
import { toast } from "react-toastify";

import axiosClient from "../../../api/axiosClient";
import TagForm from "./TagForm";
import TagList from "./TagList";

function safeList(res) {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
}

export default function Tags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [typeTab, setTypeTab] = useState("all"); // all | system | custom
  const [categoryFilter, setCategoryFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const res = await axiosClient.get("/tags");
      setTags(safeList(res));
    } catch (e) {
      console.error(e);
      toast.error("Failed to load tags");
      setTags([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const categories = useMemo(() => {
    const set = new Set();
    tags.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [tags]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return tags.filter(t => {
      if (typeTab === "system" && !t.isSystemTag) return false;
      if (typeTab === "custom" && t.isSystemTag) return false;
      if (categoryFilter && (t.category || "") !== categoryFilter) return false;

      const name = (t.name || "").toLowerCase();
      const cat = (t.category || "").toLowerCase();
      if (!term) return true;
      return name.includes(term) || cat.includes(term);
    });
  }, [tags, q, typeTab, categoryFilter]);

  const openCreate = () => {
    setSelectedTag(null);
    setShowModal(true);
  };

  const openEdit = tag => {
    setSelectedTag(tag);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedTag(null);
  };

  const onSaved = (ok, msg) => {
    if (ok) {
      fetchTags();
      toast.success(msg || (selectedTag ? "Tag updated" : "Tag created"));
    } else {
      toast.error(msg || "Failed to save");
    }
    closeModal();
  };

  const onDelete = async tag => {
    if (!window.confirm(`Delete tag "${tag?.name}"?`)) return;
    try {
      await axiosClient.delete(`/tags/${tag.id}`);
      toast.success("Tag deleted");
      fetchTags();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7]">
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-8">
        {/* Page header */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <TagIcon size={17} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Tags</h1>
              <p className="text-xs text-slate-600 mt-0.5">
                Create reusable labels to segment contacts and automate WhatsApp
                journeys.
              </p>
            </div>
          </div>
        </div>

        {/* Pro tip card (same style as Reminders) */}
        <div className="mb-5 bg-emerald-50/70 border border-emerald-100 rounded-md px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-slate-800">
            <div className="font-semibold text-emerald-900">
              Pro tip: keep tags simple and reusable
            </div>
            <div className="mt-1 text-xs text-slate-700 space-y-0.5">
              <div>
                Use tags to capture intent and journeys (e.g. “High‑intent”,
                “Payment pending”, “VIP”).
              </div>
              <div>
                Short names work best across Contacts, Inbox CRM, Campaigns and
                automations.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center px-4 py-2 rounded-md text-xs font-semibold bg-emerald-700 text-white border border-emerald-700 hover:bg-emerald-800 whitespace-nowrap"
          >
            Create a tag
          </button>
        </div>

        {/* List + filters */}
        <div className="bg-white rounded-md border border-slate-100 shadow-sm px-6 py-5">
          <div className="mb-3 flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              {["all", "system", "custom"].map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setTypeTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
                    typeTab === tab
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {tab === "all"
                    ? "All"
                    : tab === "system"
                    ? "System"
                    : "Custom"}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1">
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Search by name or category"
                  className="w-full px-4 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {categories.length > 0 && (
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="">All categories</option>
                  {categories.map(c => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}

              <div className="text-xs text-slate-500 whitespace-nowrap">
                {loading ? "Loading…" : `${filtered.length} tag(s)`}
              </div>
            </div>
          </div>

          <TagList
            tags={filtered}
            loading={loading}
            onCreate={openCreate}
            onEdit={openEdit}
            onDelete={onDelete}
            showHeader={false}
            noContainer
            containerClassName=""
          />
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-md shadow-xl w-full max-w-md mx-4 relative">
            <button
              type="button"
              onClick={closeModal}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="p-5">
              <TagForm
                selectedTag={selectedTag}
                onSaveComplete={onSaved}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

