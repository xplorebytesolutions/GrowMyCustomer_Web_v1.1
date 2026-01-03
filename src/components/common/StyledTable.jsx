import React from "react";

export default function StyledTable({
  columns = [],
  rows = [],
  loading = false,
  emptyText = "No records found.",
  rowKey = row => row?.id,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] text-slate-500">
            {columns.map(col => (
              <th
                key={col.key}
                className={`py-1.5 px-3 text-left font-medium ${
                  col.headerClassName || ""
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                className="py-6 px-3 text-slate-400"
                colSpan={columns.length || 1}
              >
                Loading…
              </td>
            </tr>
          ) : !rows || rows.length === 0 ? (
            <tr>
              <td
                className="py-6 px-3 text-slate-400"
                colSpan={columns.length || 1}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={rowKey(row) ?? idx}
                className="border-b border-slate-50 hover:bg-slate-50/60"
              >
                {columns.map(col => (
                  <td
                    key={col.key}
                    className={`py-1.5 px-3 align-top ${col.className || ""}`}
                  >
                    {typeof col.render === "function" ? col.render(row) : null}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

