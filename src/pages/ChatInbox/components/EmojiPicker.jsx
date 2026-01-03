import React, { useEffect, useMemo, useRef, useState } from "react";

const EMOJIS = [
  { char: "😀", name: "grinning" },
  { char: "😁", name: "beaming" },
  { char: "😂", name: "joy" },
  { char: "🤣", name: "rofl" },
  { char: "😊", name: "smile" },
  { char: "🙂", name: "slight_smile" },
  { char: "😉", name: "wink" },
  { char: "😍", name: "heart_eyes" },
  { char: "😘", name: "kiss" },
  { char: "😋", name: "yum" },
  { char: "😎", name: "cool" },
  { char: "🤩", name: "star_struck" },
  { char: "🥳", name: "partying" },
  { char: "😇", name: "innocent" },
  { char: "🤗", name: "hug" },
  { char: "😅", name: "sweat_smile" },
  { char: "😌", name: "relieved" },
  { char: "😴", name: "sleep" },
  { char: "🤔", name: "think" },
  { char: "🙄", name: "doubt" },
  { char: "😐", name: "neutral" },
  { char: "😮", name: "open_mouth" },
  { char: "😢", name: "cry" },
  { char: "😭", name: "sob" },
  { char: "😡", name: "angry" },
  { char: "😱", name: "scream" },
  { char: "🤯", name: "mind_blown" },
  { char: "🤒", name: "sick" },
  { char: "🤕", name: "injured" },
  { char: "🤧", name: "sneeze" },
  { char: "🥶", name: "cold" },
  { char: "🥵", name: "hot" },
  { char: "👍", name: "thumbs_up" },
  { char: "👎", name: "thumbs_down" },
  { char: "🙏", name: "pray" },
  { char: "👏", name: "clap" },
  { char: "🙌", name: "raised_hands" },
  { char: "🤝", name: "handshake" },
  { char: "💪", name: "muscle" },
  { char: "🫶", name: "heart_hands" },
  { char: "❤️", name: "red_heart" },
  { char: "💛", name: "yellow_heart" },
  { char: "💚", name: "green_heart" },
  { char: "💙", name: "blue_heart" },
  { char: "💜", name: "purple_heart" },
  { char: "🖤", name: "black_heart" },
  { char: "💔", name: "broken_heart" },
  { char: "✨", name: "sparkles" },
  { char: "🔥", name: "fire" },
  { char: "⭐", name: "star" },
  { char: "✅", name: "check" },
  { char: "❌", name: "cross" },
  { char: "⚠️", name: "warning" },
  { char: "⏳", name: "hourglass" },
  { char: "📌", name: "pin" },
  { char: "📍", name: "round_pushpin" },
  { char: "📅", name: "calendar" },
  { char: "🛒", name: "shopping" },
  { char: "💰", name: "money" },
  { char: "🎉", name: "tada" },
  { char: "🎊", name: "confetti" },
  { char: "💬", name: "speech" },
  { char: "✉️", name: "envelope" },
  { char: "📞", name: "telephone" },
  { char: "⏰", name: "alarm" },
  { char: "⏲️", name: "timer" },
  { char: "🧾", name: "receipt" },
  { char: "🛠️", name: "tools" },
  { char: "🧠", name: "brain" },
];

export default function EmojiPicker({ onPick, onClose }) {
  const ref = useRef(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onDocClick = e => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) onClose?.();
    };
    document.addEventListener("mousedown", onDocClick, { capture: true });
    return () =>
      document.removeEventListener("mousedown", onDocClick, { capture: true });
  }, [onClose]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return EMOJIS;
    return EMOJIS.filter(e => e.name.includes(s));
  }, [q]);

  return (
    <div
      ref={ref}
      className="w-80 rounded-xl border border-slate-200 bg-white shadow-lg p-2"
      role="dialog"
      aria-label="Emoji picker"
    >
      <div className="flex items-center gap-2 mb-2">
        <input
          autoFocus
          className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[12px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400"
          placeholder="Search emoji..."
          value={q}
          onChange={e => setQ(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onClose?.();
            }
          }}
        />
        <button
          className="text-[11px] text-slate-500 hover:text-slate-700 px-2 py-1.5"
          onClick={() => onClose?.()}
          type="button"
        >
          Close
        </button>
      </div>

      <div className="grid grid-cols-10 gap-1 overflow-y-hidden">
        {filtered.map(e => (
          <button
            key={e.char + e.name}
            type="button"
            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-slate-100"
            title={e.name.replace(/_/g, " ")}
            onClick={() => onPick?.(e.char)}
          >
            <span className="text-lg">{e.char}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

