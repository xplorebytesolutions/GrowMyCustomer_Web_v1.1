import React, { useState } from "react";
import { Plus, X } from "lucide-react";

const MAX_OPTIONS = 50;

export default function OptionsEditor({ value = [], onChange }) {
  const [optionInput, setOptionInput] = useState("");

  const normalized = Array.isArray(value) ? value : [];
  const canAddMore = normalized.length < MAX_OPTIONS;

  const handleAdd = () => {
    const next = optionInput.trim();
    if (!next || !canAddMore) return;
    if (normalized.includes(next)) return;
    onChange?.([...normalized, next]);
    setOptionInput("");
  };

  const handleRemove = option => {
    onChange?.(normalized.filter(item => item !== option));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={optionInput}
          onChange={e => setOptionInput(e.target.value)}
          placeholder="Add option"
          className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAddMore}
          className={`inline-flex items-center gap-1 rounded-md px-3 py-2 text-xs font-semibold ${
            canAddMore
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          <Plus size={14} />
          Add
        </button>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>
          {normalized.length}/{MAX_OPTIONS} options
        </span>
        {!canAddMore && <span>Max options reached.</span>}
      </div>

      {normalized.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {normalized.map(option => (
            <span
              key={option}
              className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700"
            >
              {option}
              <button
                type="button"
                onClick={() => handleRemove(option)}
                className="text-purple-400 hover:text-purple-700"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-400">
          No options yet. Add at least one option.
        </p>
      )}
    </div>
  );
}

