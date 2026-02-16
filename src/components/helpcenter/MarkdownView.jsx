import React from "react";

function renderInline(text) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

export default function MarkdownView({ markdown = "", skipFirstH1 = false }) {
  const lines = String(markdown).split("\n");
  const nodes = [];
  let ulBuffer = [];
  let olBuffer = [];
  let firstH1Skipped = false;

  const flushLists = () => {
    if (ulBuffer.length) {
      nodes.push(
        <ul key={`ul-${nodes.length}`} className="list-disc pl-6 space-y-2 marker:text-slate-400">
          {ulBuffer.map((item, index) => (
            <li key={`ul-item-${index}`} className="text-[16px] leading-7 text-slate-700">
              {renderInline(item)}
            </li>
          ))}
        </ul>,
      );
      ulBuffer = [];
    }
    if (olBuffer.length) {
      nodes.push(
        <ol key={`ol-${nodes.length}`} className="list-decimal pl-6 space-y-2 marker:text-slate-400">
          {olBuffer.map((item, index) => (
            <li key={`ol-item-${index}`} className="text-[16px] leading-7 text-slate-700">
              {renderInline(item)}
            </li>
          ))}
        </ol>,
      );
      olBuffer = [];
    }
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushLists();
      return;
    }

    const h1 = line.match(/^#\s+(.+)$/);
    if (h1) {
      if (skipFirstH1 && !firstH1Skipped) {
        firstH1Skipped = true;
        return;
      }
      flushLists();
      nodes.push(
        <h1 key={`h1-${index}`} className="text-[34px] leading-[1.2] tracking-tight font-bold text-slate-900">
          {renderInline(h1[1])}
        </h1>,
      );
      return;
    }

    const h2 = line.match(/^##\s+(.+)$/);
    if (h2) {
      flushLists();
      nodes.push(
        <h2 key={`h2-${index}`} className="text-[24px] leading-8 tracking-tight font-semibold text-slate-900 mt-4">
          {renderInline(h2[1])}
        </h2>,
      );
      return;
    }

    const h3 = line.match(/^###\s+(.+)$/);
    if (h3) {
      flushLists();
      nodes.push(
        <h3 key={`h3-${index}`} className="text-[19px] leading-7 font-semibold text-slate-800 mt-3">
          {renderInline(h3[1])}
        </h3>,
      );
      return;
    }

    if (line === "---") {
      flushLists();
      nodes.push(<hr key={`hr-${index}`} className="border-slate-200 my-2" />);
      return;
    }

    const ul = line.match(/^-\s+(.+)$/);
    if (ul) {
      olBuffer = [];
      ulBuffer.push(ul[1]);
      return;
    }

    const ol = line.match(/^\d+\.\s+(.+)$/);
    if (ol) {
      ulBuffer = [];
      olBuffer.push(ol[1]);
      return;
    }

    flushLists();
    nodes.push(
      <p key={`p-${index}`} className="text-[16px] leading-7 text-slate-700">
        {renderInline(line)}
      </p>,
    );
  });

  flushLists();

  return <div className="space-y-4">{nodes}</div>;
}
