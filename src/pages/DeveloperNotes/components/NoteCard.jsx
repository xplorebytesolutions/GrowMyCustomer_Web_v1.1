// 📄 src/pages/DeveloperNotes/components/NoteCard.jsx
import React from "react";
import { Card } from "../../../components/ui/card";
import TagPills from "./TagPills";
import QueryBlock from "./QueryBlock";

function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function NoteCard({ note }) {
  if (!note) return null;

  return (
    <Card className="p-5 rounded-3xl border border-slate-200 shadow-sm bg-white">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-slate-900 truncate">
            {note.title}
          </h3>
          {note.appliesTo ? (
            <p className="mt-1 text-xs font-semibold text-slate-500">
              Applies to:{" "}
              <span className="text-slate-700 font-semibold">
                {note.appliesTo}
              </span>
            </p>
          ) : null}
        </div>

        <div className="shrink-0">
          <span
            className={cx(
              "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide border",
              note.type === "sql"
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-slate-50 text-slate-700 border-slate-200"
            )}
          >
            {String(note.type || "text").toUpperCase()}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
          When to use
        </div>
        <p className="mt-1 text-sm text-slate-700 leading-relaxed">
          {note.whenToUse || "-"}
        </p>
      </div>

      <TagPills tags={note.tags} className="mt-4" />

      {note.type === "sql" ? (
        <div className="mt-4">
          <QueryBlock content={note.content} formatLabel="SQL" />
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Note
          </div>
          <p className="mt-2 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {note.content}
          </p>
        </div>
      )}
    </Card>
  );
}

