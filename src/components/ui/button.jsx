// ✅ src/components/ui/button.jsx
import React from "react";

export const Button = ({ children, className = "", ...props }) => (
  <button
    className={`px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 shadow ${className}`}
    {...props}
  >
    {children}
  </button>
);
