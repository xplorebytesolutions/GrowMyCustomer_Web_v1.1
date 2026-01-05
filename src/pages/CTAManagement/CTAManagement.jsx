import React, { useEffect, useState } from "react";
import axiosClient from "../../api/axiosClient";
import { toast } from "react-toastify";

function CTAManagement() {
  const [ctas, setCtas] = useState([]);
  const [newCta, setNewCta] = useState({
    title: "",
    buttonText: "",
    buttonType: "url",
    targetUrl: "",
    description: "",
  });

  const loadCTAs = async () => {
    try {
      const res = await axiosClient.get("/ctamanagement/get-all");
      setCtas(res.data);
    } catch {
      toast.error("Failed to load CTA definitions");
    }
  };

  const saveCTA = async () => {
    try {
      const res = await axiosClient.post("/ctamanagement/create", {
        title: newCta.title,
        buttonText: newCta.buttonText,
        buttonType: newCta.buttonType,
        targetUrl: newCta.targetUrl,
        description: newCta.description,
      });

      toast.success(res?.data?.message || "CTA saved");
      setNewCta({
        title: "",
        buttonText: "",
        buttonType: "url",
        targetUrl: "",
        description: "",
      });
      loadCTAs();
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to save CTA";
      toast.error(message);
    }
  };

  useEffect(() => {
    loadCTAs();
  }, []);

  const inputClass =
    "w-full border border-gray-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400";

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f6f7]">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <h2 className="text-xl font-bold text-emerald-800">CTA Management</h2>

        <div className="bg-white p-4 rounded-xl shadow space-y-3">
          <input
            type="text"
            value={newCta.title}
            onChange={e => setNewCta({ ...newCta, title: e.target.value })}
            placeholder="CTA Title (e.g. Buy Now)"
            className={inputClass}
          />
          <input
            type="text"
            value={newCta.buttonText}
            onChange={e =>
              setNewCta({ ...newCta, buttonText: e.target.value })
            }
            placeholder="Button Text (e.g. Buy Now)"
            className={inputClass}
          />
          <select
            value={newCta.buttonType}
            onChange={e => setNewCta({ ...newCta, buttonType: e.target.value })}
            className={inputClass}
          >
            <option value="url">URL</option>
            <option value="quick_reply">Quick Reply</option>
          </select>
          <input
            type="text"
            value={newCta.targetUrl}
            onChange={e =>
              setNewCta({ ...newCta, targetUrl: e.target.value })
            }
            placeholder="Target URL or value"
            className={inputClass}
          />
          <textarea
            value={newCta.description}
            onChange={e =>
              setNewCta({ ...newCta, description: e.target.value })
            }
            placeholder="Optional description"
            className={inputClass}
          />
          <button
            type="button"
            onClick={saveCTA}
            className="bg-emerald-600 text-white font-semibold px-4 py-2 rounded-xl hover:bg-emerald-700 transition"
          >
            Add CTA
          </button>
        </div>

        <div className="bg-white p-4 rounded-xl shadow space-y-3">
          <h3 className="font-semibold text-emerald-800">Saved CTAs</h3>
          {ctas.map(cta => (
            <div
              key={cta.id}
              className="border border-gray-200 p-3 rounded-xl text-sm space-y-1 bg-slate-50"
            >
              <div>
                <strong className="text-slate-900">{cta.title}</strong>
              </div>
              <div className="text-slate-700">Type: {cta.buttonType}</div>
              <div className="text-slate-700">Text: {cta.buttonText}</div>
              <div className="text-slate-700">Value: {cta.targetUrl}</div>
              <div className="text-gray-500 text-xs">{cta.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CTAManagement;
