// 📦 src/components/MultiSelect.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * MultiSelect
 * - options: Array<{ label: string, value: string }>
 * - value:   Array<string>
 * - onChange(next: string[]): void
 * - label?:  string
 * - placeholder?: string ("All")
 * - className?: string
 */
export default function MultiSelect({
  options,
  value,
  onChange,
  label = "",
  placeholder = "All",
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [buffer, setBuffer] = useState(() => new Set(value || []));
  const rootRef = useRef(null);
  const triggerRef = useRef(null);

  // keep buffer in sync if external value changes
  useEffect(() => setBuffer(new Set(value || [])), [value]);

  // close on outside click / ESC
  useEffect(() => {
    const onDoc = e => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onEsc = e => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  const selectedLabels = useMemo(() => {
    if (!value || value.length === 0) return placeholder;
    if (value.length === options.length) return "All";
    if (value.length <= 2) {
      const map = new Map(options.map(o => [o.value, o.label]));
      return value.map(v => map.get(v) ?? v).join(", ");
    }
    return `${value.length} selected`;
  }, [value, options, placeholder]);

  const toggle = v => {
    const next = new Set(buffer);
    next.has(v) ? next.delete(v) : next.add(v);
    setBuffer(next);
  };

  const doClear = () => setBuffer(new Set());
  const doSelectAll = () => setBuffer(new Set(options.map(o => o.value)));
  const doDone = () => {
    onChange(Array.from(buffer));
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative inline-block w-full ${className}`}>
      {label ? (
        <label className="text-sm text-gray-600 mb-1 block">{label}</label>
      ) : null}

      {/* trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full border px-3 py-2 rounded text-left flex items-center justify-between hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedLabels}</span>
        <span className="ml-2 text-gray-500">▾</span>
      </button>

      {/* dropdown — compact, snaps just under, same width as trigger */}
      {open && (
        <div
          className="absolute left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-30"
          role="listbox"
        >
          <div className="max-h-56 overflow-auto p-2">
            {options.length === 0 && (
              <div className="text-sm text-gray-500 py-1 px-1">No options</div>
            )}
            {options.map(opt => {
              const checked = buffer.has(opt.value);
              return (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer px-1 py-1"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    checked={checked}
                    onChange={() => toggle(opt.value)}
                  />
                  <span className="text-gray-800 text-sm">{opt.label}</span>
                </label>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t px-2 py-2 bg-gray-50 rounded-b-md">
            <button
              type="button"
              className="text-sm text-gray-600 hover:text-gray-800"
              onClick={doClear}
            >
              Clear
            </button>
            <div className="space-x-2">
              <button
                type="button"
                className="text-sm text-gray-600 hover:text-gray-800"
                onClick={doSelectAll}
              >
                Select all
              </button>
              <button
                type="button"
                className="bg-gray-900 text-white text-sm px-3 py-1 rounded hover:bg-black"
                onClick={doDone}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
