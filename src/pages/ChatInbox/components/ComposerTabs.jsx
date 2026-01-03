import React from "react";
import { X, Zap, StickyNote, LayoutTemplate } from "lucide-react";
import QuickReplyPicker from "./QuickReplyPicker";

const TABS = [
  { id: "quickReply", label: "Quick replies", Icon: Zap },
  { id: "notes", label: "Notes", Icon: StickyNote },
  { id: "template", label: "Templates", Icon: LayoutTemplate },
];

const PLACEHOLDERS = {
  quickReply: "Quick replies UI goes here",
  notes: "Notes UI goes here",
  tag: "Tag UI goes here",
  template: "Template UI goes here",
};

export function ComposerTabs({
  openTab,
  setOpenTab,
  composerRef,
  onQuickReplyInsert,
}) {
  const isOpen = openTab !== null;
  const active = TABS.find(t => t.id === openTab) || null;
  const notesTab = TABS.find(t => t.id === "notes") || null;
  const leftTabs = TABS.filter(t => t.id !== "notes");
  const close = React.useCallback(() => {
    if (typeof setOpenTab === "function") setOpenTab(null);
  }, [setOpenTab]);

  React.useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = e => {
      const target = e.target;
      if (!(target instanceof Node)) return;

      const root = composerRef?.current;
      if (!root) return;
      if (root.contains(target)) return;
      close();
    };

    const onKeyDown = e => {
      if (e.key === "Escape") close();
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, [isOpen, close, composerRef]);

  const panelId = "chatinbox-composer-panel";

  return (
    <div className="relative w-full">
      {/* Sliding panel (anchored to composer, expands upward) */}
      <div
        id={panelId}
        aria-hidden={!isOpen}
        className={`absolute left-0 right-0 bottom-full mb-1 overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-sm transform-gpu transition-[transform,opacity] duration-150 ease-out flex flex-col max-h-[240px] ${
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        {/* Compact inline header row: tabs + close */}
        <div className="shrink-0 flex items-center gap-2 px-2 pt-2 pb-1.5 border-b border-slate-200/70">
          <div
            className="flex items-center gap-3 min-w-0 flex-1"
            role="tablist"
            aria-label="Composer tools"
          >
            {leftTabs.map(t => {
              const isActive = openTab === t.id;
              const Icon = t.Icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`inline-flex items-center gap-1.5 text-[13px] leading-none px-0.5 pb-1 border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 rounded-sm ${
                    isActive
                      ? "border-emerald-600 text-slate-900 font-semibold"
                      : "border-transparent text-slate-600 hover:text-slate-800"
                  }`}
                  onClick={() => setOpenTab?.(t.id)}
                >
                  {Icon ? (
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? "text-emerald-600" : "text-slate-400"
                      }`}
                    />
                  ) : null}
                  {t.label}
                </button>
              );
            })}

            {notesTab ? (() => {
              const isActive = openTab === notesTab.id;
              const Icon = notesTab.Icon;
              return (
                <button
                  key={notesTab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`ml-auto inline-flex items-center gap-1.5 text-[13px] leading-none px-0.5 pb-1 border-b-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 rounded-sm ${
                    isActive
                      ? "border-emerald-600 text-slate-900 font-semibold"
                      : "border-transparent text-slate-600 hover:text-slate-800"
                  }`}
                  onClick={() => setOpenTab?.(notesTab.id)}
                >
                  {Icon ? (
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? "text-emerald-600" : "text-slate-400"
                      }`}
                    />
                  ) : null}
                  {notesTab.label}
                </button>
              );
            })() : null}
          </div>

          <button
            type="button"
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            onClick={close}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-h-0 p-2.5 overflow-hidden flex flex-col">
          {openTab === "quickReply" ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <QuickReplyPicker
                onInsert={text => onQuickReplyInsert?.(text)}
                onClose={close}
                scope="All"
              />
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="rounded-md border border-slate-200 bg-white p-3 text-[12px] text-slate-700">
                <div className="font-medium text-slate-800">
                  {active?.label || "Tools"}
                </div>
                <div className="mt-1 text-[11px] text-slate-500">
                  {active ? PLACEHOLDERS[active.id] : "Coming soon"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
