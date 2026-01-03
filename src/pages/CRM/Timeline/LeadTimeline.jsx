import React, { useState, useEffect, useCallback } from "react";
import axiosClient from "../../../api/axiosClient";
import TimelineEventCard from "./TimelineEventCard";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

function LeadTimeline() {
  const { contactId } = useParams();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState(null);

  // ✅ Fetch Contact Info (wrapped in useCallback)
  const fetchContactInfo = useCallback(async () => {
    try {
      const res = await axiosClient.get(`/contacts/${contactId}`);
      setContact(res.data);
    } catch (error) {
      console.error("Failed to fetch contact info", error);
      toast.error("❌ Failed to load contact info");
    }
  }, [contactId]);

  // ✅ Fetch Timeline Events (wrapped in useCallback)
  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosClient.get(`/leadtimeline/contact/${contactId}`);
      setTimeline(res.data || []);
    } catch (error) {
      console.error("Failed to fetch timeline", error);
      toast.error("❌ Failed to load timeline events");
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    if (contactId) {
      fetchContactInfo();
      fetchTimeline();
    }
  }, [contactId, fetchContactInfo, fetchTimeline]);

  return (
    <div className="p-6 max-w-5xl mx-auto bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🕓 Lead Timeline</h2>
          {contact && (
            <p className="text-gray-600 text-sm mt-1">
              <span className="font-semibold">{contact.name || "Unknown"}</span>{" "}
              • {contact.phoneNumber}
            </p>
          )}
        </div>
        <button
          onClick={() => fetchTimeline()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow text-sm"
        >
          🔄 Refresh
        </button>
      </div>

      {/* Timeline Section */}
      <div className="relative pl-10 border-l-2 border-gray-200 space-y-8">
        {loading ? (
          <p className="text-gray-500">⏳ Loading timeline...</p>
        ) : timeline.length === 0 ? (
          <p className="text-gray-400 italic">
            No timeline activities found for this contact.
          </p>
        ) : (
          timeline.map(entry => (
            <TimelineEventCard key={entry.id} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}

export default LeadTimeline;

// import React, { useState, useEffect } from "react";
// import axiosClient from "../../api/axiosClient";
// import TimelineEventCard from "./TimelineEventCard";
// import { useParams } from "react-router-dom";
// import { toast } from "react-toastify";

// function LeadTimeline() {
//   const { contactId } = useParams();
//   const [timeline, setTimeline] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [contact, setContact] = useState(null);

//   // ✅ Fetch Contact Info
//   const fetchContactInfo = async () => {
//     try {
//       const res = await axiosClient.get(`/contacts/${contactId}`);
//       setContact(res.data);
//     } catch (error) {
//       console.error("Failed to fetch contact info", error);
//       toast.error("❌ Failed to load contact info");
//     }
//   };

//   // ✅ Fetch Timeline Events
//   const fetchTimeline = async () => {
//     try {
//       setLoading(true);
//       const res = await axiosClient.get(`/leadtimeline/contact/${contactId}`);
//       setTimeline(res.data || []);
//     } catch (error) {
//       console.error("Failed to fetch timeline", error);
//       toast.error("❌ Failed to load timeline events");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (contactId) {
//       fetchContactInfo();
//       fetchTimeline();
//     }
//   }, [contactId]);

//   return (
//     <div className="p-6 max-w-5xl mx-auto">
//       {/* Top Bar */}
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <h2 className="text-2xl font-bold text-gray-800">🕓 Lead Timeline</h2>
//           {contact && (
//             <p className="text-gray-600 text-sm mt-1">
//               <span className="font-semibold">{contact.name || "Unknown"}</span>{" "}
//               • {contact.phoneNumber}
//             </p>
//           )}
//         </div>
//         <button
//           onClick={() => fetchTimeline()}
//           className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow text-sm"
//         >
//           🔄 Refresh
//         </button>
//       </div>

//       {/* Timeline Section */}
//       <div className="relative pl-10 border-l-2 border-gray-200 space-y-8">
//         {loading ? (
//           <p className="text-gray-500">⏳ Loading timeline...</p>
//         ) : timeline.length === 0 ? (
//           <p className="text-gray-400 italic">
//             No timeline activities found for this contact.
//           </p>
//         ) : (
//           timeline.map(entry => (
//             <TimelineEventCard key={entry.id} entry={entry} />
//           ))
//         )}
//       </div>
//     </div>
//   );
// }

// export default LeadTimeline;
