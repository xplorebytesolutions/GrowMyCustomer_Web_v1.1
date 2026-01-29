import React, { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import NoteCard from "./components/NoteCard";
import { NOTES } from "./notesData";
import { useAuth } from "../../app/providers/AuthProvider";
import ServerTroubleshootingContent from "./components/ServerTroubleshootingContent"; // Import the new component

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function normalizeText(x) {
  return String(x || "").toLowerCase();
}

function noteSearchHaystack(note) {
  const tags = Array.isArray(note?.tags) ? note.tags.join(" ") : "";
  return normalizeText(
    [
      note?.title,
      note?.whenToUse,
      note?.appliesTo,
      tags,
      note?.content,
      Array.isArray(note?.relatedTables) ? note.relatedTables.join(" ") : "",
    ]
      .filter(Boolean)
      .join("\n")
  );
}

export default function DeveloperNotesPage() {
  const navigate = useNavigate();
  const { role, hasAllAccess, isLoading, entLoading } = useAuth() || {};
  const safeRole = String(role || "").toLowerCase();
  const isSuperAdmin = hasAllAccess || safeRole === "superadmin";

  const [q, setQ] = useState("");
  const [activeTags, setActiveTags] = useState([]);
  const [activeTab, setActiveTab] = useState("developerNotes"); // New state for active tab

  const allTags = useMemo(() => {
    const set = new Set();
    for (const n of NOTES) {
      for (const t of n.tags || []) set.add(t);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  const filtered = useMemo(() => {
    const query = normalizeText(q).trim();
    const tags = new Set(activeTags);

    return NOTES.filter(note => {
      if (tags.size) {
        const noteTags = Array.isArray(note.tags) ? note.tags : [];
        const hasAny = noteTags.some(t => tags.has(t));
        if (!hasAny) return false;
      }

      if (!query) return true;
      const hay = noteSearchHaystack(note);
      return hay.includes(query);
    });
  }, [activeTags, q]);

  if (isLoading || entLoading) return null;
  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8">
            <h1 className="text-xl font-bold text-slate-900">Access denied</h1>
            <p className="mt-2 text-sm text-slate-600">
              Developer Notes is only available to superadmin users.
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => navigate("/app/dashboard")}
                className="inline-flex items-center rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-purple-700"
              >
                Back to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const toggleTag = tag => {
    setActiveTags(prev => {
      if (prev.includes(tag)) return prev.filter(x => x !== tag);
      return [...prev, tag];
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Developer Notes
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Internal sanity checks, SQL snippets, and engineering decisions
              </p>
            </div>

            <div className="text-xs font-semibold text-slate-500">
              {filtered.length} / {NOTES.length} notes
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="mt-5">
            <nav className="flex space-x-4 border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab("developerNotes")}
                className={cx(
                  "py-2 px-4 text-sm font-medium rounded-t-lg border-b-2",
                  activeTab === "developerNotes"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                Developer Notes
              </button>
              <button
                onClick={() => setActiveTab("serverTroubleshooting")}
                className={cx(
                  "py-2 px-4 text-sm font-medium rounded-t-lg border-b-2",
                  activeTab === "serverTroubleshooting"
                    ? "border-emerald-500 text-emerald-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                Server Troubleshooting
              </button>
            </nav>
          </div>

          {/* Content based on active tab */}
          {activeTab === "developerNotes" && (
            <>
              <div className="mt-5 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                      <Search className="h-4 w-4 text-slate-400" />
                      <input
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        placeholder="Search title, description, tags, or query text..."
                        className="w-full outline-none text-sm text-slate-900"
                      />
                      {q ? (
                        <button
                          type="button"
                          onClick={() => setQ("")}
                          className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
                          title="Clear search"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {activeTags.length ? (
                    <button
                      type="button"
                      onClick={() => setActiveTags([])}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      <X className="h-4 w-4" />
                      Clear filters
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {allTags.map(tag => {
                    const active = activeTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cx(
                          "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold border transition-colors",
                          active
                            ? "bg-purple-600 text-white border-purple-600"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-10 text-center">
                  <div className="text-lg font-bold text-slate-900">
                    No notes found
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    Try a different search term or clear filters.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5">
                  {filtered.map(note => (
                    <NoteCard key={note.id} note={note} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "serverTroubleshooting" && (
            <div className="mt-5">
              <ServerTroubleshootingContent />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}