// 📄 File: TemplatePickerModal.jsx
import React, { useEffect, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

export default function TemplatePickerModal({ open, onClose, onSelect }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;

    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const res = await axiosClient.get(
          "/WhatsAppTemplateFetcher/get-template-all"
        );
        if (res.data.success) {
          const validTemplates = (res.data.templates || []).filter(
            t => !!t.name
          );
          setTemplates(validTemplates);
          if (validTemplates.length === 0)
            toast.warn("⚠️ No valid templates found");
        } else {
          toast.error("❌ Failed to load templates");
        }
      } catch (err) {
        console.error("❌ Error fetching templates:", err);
        toast.error("❌ Error fetching templates");
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-xl rounded-xl shadow-lg p-6 overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-semibold text-emerald-700 mb-4">
          📦 Select WhatsApp Template
        </h2>

        {loading ? (
          <p>Loading templates...</p>
        ) : templates.length === 0 ? (
          <p className="text-gray-500">No templates available</p>
        ) : (
          <div className="space-y-4">
            {templates.map((tpl, idx) => {
              const hasImageHeader =
                Array.isArray(tpl.components) &&
                tpl.components.some(
                  c => c.type === "HEADER" && c.format === "IMAGE"
                );

              const templateType = hasImageHeader
                ? "image_template"
                : "text_template";

              return (
                <div
                  key={idx}
                  className="border p-4 rounded cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    onSelect({
                      name: tpl.name,
                      type: templateType,
                      body: tpl.body,
                      buttons: tpl.buttonParams || [],
                    })
                  }
                >
                  <div className="font-bold text-emerald-600">{tpl.name}</div>
                  <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                    {tpl.body}
                  </div>
                  {tpl.buttonParams?.length > 0 && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {tpl.buttonParams.map((btn, i) => (
                        <span
                          key={i}
                          className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full"
                        >
                          {btn.text}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="text-sm px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
