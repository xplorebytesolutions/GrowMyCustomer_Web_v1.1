import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CircleHelp, Plus, Search, Trash2 } from "lucide-react";
import axiosClient from "../api/chatInboxApi";

/**
 * QuickReplyPicker (ported from old Inbox module)
 * Props:
 *  - onInsert(text: string): required
 *  - onClose(): optional
 *  - scope?: "Business" | "Personal" | "All"  // initial view; default "All"
 */
export default function QuickReplyPicker({ onInsert, onClose, scope = "All" }) {
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const rowRefs = useRef([]);

  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [viewScope, setViewScope] = useState(() => scope || "All");
  const viewScopeParam = useMemo(() => {
    const s = String(viewScope || "All").toLowerCase();
    return s === "business" || s === "personal" ? s : "all";
  }, [viewScope]);

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tagsCsv, setTagsCsv] = useState("");
  const [createScope, setCreateScope] = useState("Personal");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [deletingId, setDeletingId] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchList = useCallback(async () => {
    const params = {};
    if (q) params.q = q;
    if (viewScopeParam) params.scope = viewScopeParam;
    const res = await axiosClient.get("/quick-replies", { params });
    return Array.isArray(res.data) ? res.data : [];
  }, [q, viewScopeParam]);

  useEffect(() => {
    if (creating) return;
    let ignore = false;
    setLoading(true);

    const t = setTimeout(() => {
      fetchList()
        .then(list => {
          if (ignore) return;
          setItems(list);
          setActiveIndex(list.length > 0 ? 0 : -1);
        })
        .catch(() => {
          if (ignore) return;
          setItems([]);
          setActiveIndex(-1);
        })
        .finally(() => {
          if (ignore) return;
          setLoading(false);
        });
    }, 200);

    return () => {
      clearTimeout(t);
      ignore = true;
    };
  }, [q, viewScopeParam, creating, fetchList]);

  useEffect(() => {
    if (!searchOpen) return;
    searchRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (creating) return;
    if (searchOpen) return;
    if (loading) return;
    if (!listRef.current) return;
    requestAnimationFrame(() => listRef.current?.focus());
  }, [creating, searchOpen, loading]);

  useEffect(() => {
    const el = rowRefs.current[activeIndex];
    if (!el) return;
    if (typeof el.scrollIntoView !== "function") return;
    el.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const handleInsert = useCallback(
    text => {
      if (!text) return;
      if (typeof onInsert === "function") onInsert(text);
    },
    [onInsert]
  );

  const handleKeyDown = e => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setCreating(false);
      onClose?.();
      return;
    }
    if (creating) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, Math.max(0, items.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
      return;
    }
    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault();
        handleInsert(items[activeIndex]?.body);
        onClose?.();
      }
    }
  };

  const handleListKeyDown = e => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
      return;
    }
    if (creating) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, Math.max(0, items.length - 1)));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault();
        handleInsert(items[activeIndex]?.body);
        onClose?.();
      }
    }
  };

  const handleCreate = async () => {
    setSaveMsg("");
    if (!title.trim() || !body.trim()) {
      setSaveMsg("Title and message are required.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        body,
        tagsCsv: tagsCsv.trim() || null,
        scope: createScope === "Business" ? 2 : 0,
      };

      const res = await axiosClient.post("/quick-replies", payload);
      const ok = res?.data?.success === true;
      setSaveMsg(ok ? "Saved." : res?.data?.message || "Failed to save.");
      if (ok) {
        setTitle("");
        setBody("");
        setTagsCsv("");
        setCreating(false);
        setViewScope(createScope);
        setQ("");
      }
    } catch {
      setSaveMsg("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async item => {
    if (!item?.id || deletingId) return;
    const ok = window.confirm("Delete this quick reply?");
    if (!ok) return;

    setDeletingId(item.id);
    try {
      const res = await axiosClient.delete(`/quick-replies/${item.id}`);
      const success = res?.data?.success === true;
      if (!success) {
        setSaveMsg(res?.data?.message || "Failed to delete.");
        return;
      }
      setItems(prev => prev.filter(x => x.id !== item.id));
    } catch {
      setSaveMsg("Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {!creating ? (
        <>
          {/* Controls */}
          <div className="shrink-0">
            <div className="flex items-center gap-2">
              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-1 py-0.5">
                {["All", "Business", "Personal"].map(s => {
                  const isActive = viewScope === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setViewScope(s)}
                      className={`px-2.5 py-1 text-[11px] rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400/30 ${
                        isActive
                          ? "bg-emerald-600 text-white"
                          : "text-slate-700 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>

              <button
                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                onClick={() => setCreating(true)}
                type="button"
                title="New quick reply"
                aria-label="New quick reply"
              >
                <Plus className="w-4 h-4" />
              </button>

              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  className={`h-7 w-7 inline-flex items-center justify-center rounded-md border ${
                    searchOpen
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                  onClick={() => setSearchOpen(v => !v)}
                  title="Search"
                  aria-label="Search quick replies"
                >
                  <Search className="w-4 h-4" />
                </button>
              </div>
            </div>

                {searchOpen ? (
                  <div className="mt-2">
                    <input
                      ref={searchRef}
                      className="w-full border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 bg-white"
                      placeholder="Search saved replies..."
                      value={q}
                      onChange={e => setQ(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                  </div>
                ) : null}

            <div className="mt-2 h-px bg-slate-200/70" />

            {saveMsg ? (
              <div className="mt-2 text-[11px] px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-700">
                {saveMsg}
              </div>
            ) : null}
          </div>

          {/* List + footer */}
          <div className="flex-1 min-h-0 flex flex-col mt-2 overflow-hidden">
            <div
              ref={listRef}
              tabIndex={0}
              onKeyDown={handleListKeyDown}
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 focus:outline-none"
            >
              {loading ? (
                <div className="text-[11px] text-slate-500 p-2">
                  Loading...
                </div>
              ) : items.length === 0 ? (
                <div className="py-6 text-center">
                  <div className="text-[13px] font-semibold text-slate-800">
                    Create your first quick reply
                  </div>
                  <div className="mt-1 text-[12px] text-slate-600">
                    Click + to add one.
                  </div>
                </div>
              ) : (
                <div className="bg-white">
                  <div className="divide-y divide-slate-100">
                    {items.map((x, idx) => {
                      const isActive = idx === activeIndex;
                      const isDeleting = deletingId === x.id;
                      return (
                        <div
                          key={x.id}
                          ref={el => {
                            rowRefs.current[idx] = el;
                          }}
                          className={`group flex items-start gap-2 px-2 py-2 transition-colors cursor-pointer ${
                            isActive
                              ? "bg-emerald-50 active:bg-emerald-100"
                              : "bg-white hover:bg-slate-50 active:bg-slate-100"
                          }`}
                          onMouseEnter={() => setActiveIndex(idx)}
                        >
                          <button
                            type="button"
                            className="flex-1 text-left min-w-0 focus:outline-none"
                            onClick={() => {
                              handleInsert(x.body);
                              onClose?.();
                            }}
                            title={x.tagsCsv || ""}
                          >
                            <div className="text-[13px] font-semibold text-slate-900 truncate leading-snug">
                              {x.title}
                            </div>
                            <div className="mt-0.5 text-[12px] text-slate-600 truncate leading-snug">
                              {x.body}
                            </div>
                          </button>

                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[11px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                              Enter ↵
                            </span>
                            <button
                              type="button"
                              className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-all ${
                                isDeleting
                                  ? "opacity-100 bg-slate-50 text-slate-400 border-slate-200 cursor-wait"
                                  : "opacity-0 group-hover:opacity-100 bg-white text-slate-400 border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200"
                              }`}
                              title="Delete"
                              disabled={isDeleting}
                              onClick={() => handleDelete(x)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="shrink-0 pt-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <div>
                Scope: <span className="uppercase">{viewScopeParam}</span>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                title="↑↓ navigate • Enter insert • Esc close"
                aria-label="Keyboard shortcuts"
                onClick={() => {}}
              >
                <CircleHelp className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col h-full min-h-0">
          <div className="shrink-0 flex items-center gap-2">
            <div className="text-[12px] font-semibold text-slate-800">
              New quick reply
            </div>
            <div className="flex-1" />
            <button
              className="text-[11px] px-3 py-1.5 rounded-md text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300"
              onClick={handleCreate}
              type="button"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1.5"
              onClick={() => setCreating(false)}
              type="button"
              disabled={saving}
            >
              Cancel
            </button>
          </div>

          <div className="mt-2 flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-600 w-16">Scope</label>
              <div className="flex items-center gap-3">
                {["Personal", "Business"].map(s => (
                  <label key={s} className="text-[11px] flex items-center gap-1">
                    <input
                      type="radio"
                      name="qr-scope"
                      value={s}
                      checked={createScope === s}
                      onChange={() => setCreateScope(s)}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-600 w-16">Title</label>
              <input
                className="flex-1 border border-slate-200 rounded-xl px-2.5 py-2 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., Greeting (EN)"
              />
            </div>

            <div className="flex items-start gap-2">
              <label className="text-[11px] text-slate-600 w-16 mt-2">
                Body
              </label>
              <textarea
                className="flex-1 border border-slate-200 rounded-xl px-2.5 py-2 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 h-24 resize-none"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Type the message..."
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-[11px] text-slate-600 w-16">Tags</label>
              <input
                className="flex-1 border border-slate-200 rounded-xl px-2.5 py-2 text-[12px] text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
                value={tagsCsv}
                onChange={e => setTagsCsv(e.target.value)}
                placeholder="e.g., greeting,eng"
              />
            </div>

            {saveMsg && (
              <div className="text-[11px] px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
                {saveMsg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
