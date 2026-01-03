// 📄 src/pages/CRM/Tags/TagSelector.jsx

import React, { useEffect, useState } from "react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

/**
 * TagSelector - Chip-based selector for one or more tags.
 *
 * Props:
 * - selected: array of selected tag IDs
 * - onChange: (ids: Guid[]) => void
 * - multi: boolean (allow multiple selection or not)
 * - tags?: optional preloaded tags to avoid refetching
 */
export default function TagSelector({
  selected = [],
  onChange,
  multi = true,
  tags: tagsProp,
}) {
  const [tagsState, setTagsState] = useState([]);

  useEffect(() => {
    if (Array.isArray(tagsProp)) return;
    fetchTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagsProp]);

  const fetchTags = async () => {
    try {
      const res = await axiosClient.get("/tags");

      let list = [];
      if (Array.isArray(res.data)) {
        list = res.data;
      } else if (Array.isArray(res.data?.data)) {
        list = res.data.data;
      }

      setTagsState(list);
    } catch (err) {
      console.error("❌ Failed to load tags", err);
      toast.error("Failed to load tags");
      setTagsState([]);
    }
  };

  const handleToggle = tagId => {
    if (!onChange) return;

    if (multi) {
      const isSelected = selected.includes(tagId);
      const updated = isSelected
        ? selected.filter(id => id !== tagId)
        : [...selected, tagId];
      onChange(updated);
    } else {
      onChange([tagId]);
    }
  };

  const safeTags = Array.isArray(tagsProp) ? tagsProp : tagsState;

  if (!safeTags.length) {
    return (
      <p className="text-xs text-gray-500">
        No tags yet. Create tags in the Tags workspace.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {safeTags.map(tag => {
        const isSelected = selected.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => handleToggle(tag.id)}
            className={`px-3 py-1 rounded-full text-xs border transition-all duration-150 flex items-center ${
              isSelected
                ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800"
            }`}
            title={tag.notes || tag.name}
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: tag.colorHex || "#22C55E" }}
            ></span>
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}

// import React, { useEffect, useState } from "react";
// import axios from "axios";

// /**
//  * TagSelector - A dropdown/select box to choose one or more tags.
//  * Props:
//  * - selected: array of selected tag IDs
//  * - onChange: callback with updated tag array
//  * - multi: boolean (allow multi-select or not)
//  */
// export default function TagSelector({ selected = [], onChange, multi = true }) {
//   const [tags, setTags] = useState([]);

//   useEffect(() => {
//     fetchTags();
//   }, []);

//   const fetchTags = async () => {
//     try {
//       const res = await axios.get("/api/tags");
//       setTags(Array.isArray(res.data) ? res.data : []);
//     } catch (err) {
//       console.error("❌ Failed to load tags", err);
//       setTags([]); // fallback to empty
//     }
//   };

//   const handleToggle = tagId => {
//     if (multi) {
//       const isSelected = selected.includes(tagId);
//       const updated = isSelected
//         ? selected.filter(id => id !== tagId)
//         : [...selected, tagId];
//       onChange(updated);
//     } else {
//       onChange([tagId]);
//     }
//   };

//   return (
//     <div className="flex flex-wrap gap-2">
//       {(Array.isArray(tags) ? tags : []).map(tag => {
//         const isSelected = selected.includes(tag.id);
//         return (
//           <button
//             key={tag.id}
//             onClick={() => handleToggle(tag.id)}
//             className={`px-3 py-1 rounded-full text-sm border transition-all duration-150 ${
//               isSelected
//                 ? "bg-purple-600 text-white border-purple-600"
//                 : "bg-gray-100 text-gray-700 border-gray-300"
//             }`}
//             title={tag.notes || tag.name}
//           >
//             <span
//               className="inline-block w-2 h-2 rounded-full mr-2"
//               style={{ backgroundColor: tag.colorHex || "#999" }}
//             ></span>
//             {tag.name}
//           </button>
//         );
//       })}
//     </div>
//   );
// }
