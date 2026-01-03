// 📄 File: src/pages/Contacts/components/checkbox.jsx

import React from "react";

export const Checkbox = React.forwardRef(
  ({ className = "", checked, onCheckedChange, ...props }, ref) => {
    return (
      <input
        type="checkbox"
        ref={ref}
        checked={checked}
        className={`w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 ${className}`}
        {...props}
        onChange={e => onCheckedChange?.(e.target.checked)}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";
