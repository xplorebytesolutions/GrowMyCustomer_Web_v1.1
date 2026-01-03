// 📄 src/pages/CRM/Tags/TagForm.jsx

import { useEffect, useState } from "react";
import { Tag as TagIcon } from "lucide-react";
import { toast } from "react-toastify";
import axiosClient from "../../../api/axiosClient";

export default function TagForm({ selectedTag, onSaveComplete, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [tag, setTag] = useState({
    id: null,
    name: "",
    colorHex: "",
    category: "",
    notes: "",
    isSystemTag: false,
    isActive: true,
  });

  const isEdit = !!selectedTag;

  useEffect(() => {
    if (selectedTag) {
      setTag({
        id: selectedTag.id,
        name: selectedTag.name || "",
        colorHex: selectedTag.colorHex || "",
        category: selectedTag.category || "",
        notes: selectedTag.notes || "",
        isSystemTag: !!selectedTag.isSystemTag,
        isActive: selectedTag.isActive !== false,
      });
    } else {
      setTag({
        id: null,
        name: "",
        colorHex: "",
        category: "",
        notes: "",
        isSystemTag: false,
        isActive: true,
      });
    }
  }, [selectedTag]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setTag(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!tag.name.trim()) {
      toast.warn("Tag name is required.");
      return;
    }

    const payload = {
      name: tag.name.trim(),
      colorHex: tag.colorHex || null,
      category: tag.category || null,
      notes: tag.notes || null,
      isSystemTag: tag.isSystemTag,
      isActive: tag.isActive,
    };

    try {
      setSaving(true);

      if (tag.id) {
        await axiosClient.put(`/tags/${tag.id}`, payload); // ✅ no /api
        onSaveComplete?.(true, "Tag updated successfully.");
      } else {
        await axiosClient.post("/tags", payload); // ✅ no /api
        onSaveComplete?.(true, "Tag created successfully.");
      }
    } catch (error) {
      console.error("❌ Failed to save tag", error);
      toast.error("Failed to save tag. Please try again.");
      onSaveComplete?.(false, "Failed to save tag.");
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = tag.name.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-1">
        <div className="bg-emerald-50 text-emerald-700 rounded-xl p-2">
          <TagIcon size={20} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-emerald-900">
            {isEdit ? "Edit tag" : "Create new tag"}
          </h2>
          <p className="text-xs text-gray-500">
            Tags help you group contacts for campaigns, CRM, and inbox filters.
          </p>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Tag name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={tag.name}
            onChange={handleChange}
            placeholder='e.g. "Promotional", "Hot Lead", "College"'
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Tag colour (hex)
            </label>
            <input
              type="text"
              name="colorHex"
              value={tag.colorHex}
              onChange={handleChange}
              placeholder="#22C55E"
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">
              Category
            </label>
            <input
              type="text"
              name="category"
              value={tag.category}
              onChange={handleChange}
              placeholder='e.g. "Journey", "Priority"'
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-700 mb-1 block">
            Notes (internal)
          </label>
          <textarea
            name="notes"
            value={tag.notes}
            onChange={handleChange}
            rows={3}
            placeholder="Short note for your team..."
            className="w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        </div>

        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isSystemTag"
              checked={tag.isSystemTag}
              onChange={handleChange}
            />
            System tag
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="isActive"
              checked={tag.isActive}
              onChange={handleChange}
            />
            Active
          </label>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-1 border-t border-gray-100 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isFormValid || saving}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold text-white inline-flex items-center justify-center ${
            isFormValid && !saving
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-emerald-300 cursor-not-allowed"
          }`}
        >
          {saving ? "Saving..." : isEdit ? "Save changes" : "Create tag"}
        </button>
      </div>
    </form>
  );
}

// import { useState, useEffect } from "react";
// import { Tag, PlusCircle } from "lucide-react";
// import { toast } from "react-toastify";

// export default function TagForm({ selectedTag, onSaveComplete }) {
//   const [tag, setTag] = useState({
//     name: "",
//     colorHex: "",
//     category: "",
//     notes: "",
//     isSystemTag: false,
//     isActive: true,
//   });

//   useEffect(() => {
//     if (selectedTag) {
//       setTag(selectedTag);
//     }
//   }, [selectedTag]);

//   const handleChange = e => {
//     const { name, value, type, checked } = e.target;
//     setTag(prev => ({
//       ...prev,
//       [name]: type === "checkbox" ? checked : value,
//     }));
//   };

//   const handleSubmit = async e => {
//     e.preventDefault();

//     if (!tag.name.trim()) return;

//     try {
//       const method = selectedTag ? "PUT" : "POST";
//       const url = selectedTag ? `/api/tags/${selectedTag.id}` : "/api/tags";

//       const res = await fetch(url, {
//         method,
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(tag),
//       });

//       if (!res.ok) throw new Error("Failed to save tag");

//       toast.success(
//         `✅ Tag ${selectedTag ? "updated" : "added"} successfully!`
//       );
//       onSaveComplete();
//     } catch (err) {
//       console.error("❌ Failed to save tag:", err);
//       toast.error("❌ Failed to save tag");
//     }
//   };

//   const isFormValid = tag.name.trim().length > 0;

//   return (
//     <div className="bg-white rounded-md border shadow-sm p-6 w-full transition hover:shadow-md">
//       {/* 🏷️ Form Header */}
//       <div className="flex items-center gap-3 mb-5">
//         <div className="bg-purple-100 text-purple-700 rounded-xl p-2">
//           <Tag size={22} />
//         </div>
//         <div>
//           <h2 className="text-lg font-bold text-gray-800">
//             {selectedTag ? "Edit Tag" : "Add New Tag"}
//           </h2>
//           <p className="text-sm text-gray-600">
//             Create custom tags with color, category, and notes.
//           </p>
//         </div>
//       </div>

//       {/* 📝 Form Fields */}
//       <form onSubmit={handleSubmit} className="space-y-5">
//         <div>
//           <label className="text-xs font-medium text-gray-600 mb-1 block">
//             Tag Name <span className="text-red-500">*</span>
//           </label>
//           <input
//             type="text"
//             name="name"
//             value={tag.name}
//             onChange={handleChange}
//             placeholder="e.g. High Priority"
//             className="w-full px-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
//           />
//         </div>

//         <div>
//           <label className="text-xs font-medium text-gray-600 mb-1 block">
//             Tag Color (Hex)
//           </label>
//           <input
//             type="text"
//             name="colorHex"
//             value={tag.colorHex}
//             onChange={handleChange}
//             placeholder="#FF5733"
//             className="w-full px-4 py-2 border rounded-md text-sm"
//           />
//         </div>

//         <div>
//           <label className="text-xs font-medium text-gray-600 mb-1 block">
//             Category
//           </label>
//           <input
//             type="text"
//             name="category"
//             value={tag.category}
//             onChange={handleChange}
//             placeholder="e.g. Priority"
//             className="w-full px-4 py-2 border rounded-md text-sm"
//           />
//         </div>

//         <div>
//           <label className="text-xs font-medium text-gray-600 mb-1 block">
//             Notes
//           </label>
//           <textarea
//             name="notes"
//             value={tag.notes}
//             onChange={handleChange}
//             placeholder="Optional description..."
//             rows={3}
//             className="w-full px-4 py-2 border rounded-md text-sm resize-none"
//           />
//         </div>

//         <div className="flex items-center gap-6 mt-1">
//           <label className="flex items-center text-sm gap-2">
//             <input
//               type="checkbox"
//               name="isSystemTag"
//               checked={tag.isSystemTag}
//               onChange={handleChange}
//             />
//             System Tag
//           </label>

//           <label className="flex items-center text-sm gap-2">
//             <input
//               type="checkbox"
//               name="isActive"
//               checked={tag.isActive}
//               onChange={handleChange}
//             />
//             Active
//           </label>
//         </div>

//         {/* Submit Button */}
//         <div className="pt-4 border-t flex justify-end">
//           <button
//             type="submit"
//             disabled={!isFormValid}
//             className={`inline-flex items-center gap-2 px-5 py-2 rounded-md text-white text-sm font-medium transition ${
//               isFormValid
//                 ? "bg-purple-600 hover:bg-purple-700"
//                 : "bg-gray-300 cursor-not-allowed"
//             }`}
//           >
//             <PlusCircle size={18} />
//             {selectedTag ? "Update Tag" : "Add Tag"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }
