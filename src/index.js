import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

import App from "./App";
import "./index.css";
import "./styles/toastify-theme.css";
import "./utils/toastifyPatch";

// Dev-only: ReactFlow/ResizeObserver can trigger a benign "ResizeObserver loop..." error overlay in Chromium.
if (process.env.NODE_ENV === "development") {
  const roRe =
    /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i;
  window.addEventListener("error", e => {
    const msg = String(e?.message || e?.error?.message || "");
    if (roRe.test(msg)) {
      e.preventDefault?.();
      e.stopImmediatePropagation?.();
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
