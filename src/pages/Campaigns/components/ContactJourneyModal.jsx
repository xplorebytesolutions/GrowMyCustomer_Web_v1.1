// import React, { useEffect, useState, Fragment } from "react";
// import { Dialog, Transition } from "@headlessui/react";
// import axiosClient from "../../../api/axiosClient";
// import { Send, MousePointerClick, Hourglass } from "lucide-react";

// // Helper function to format dates
// const formatDate = dt => (dt ? new Date(dt).toLocaleString() : "N/A");

// // The main modal component
// function ContactJourneyModal({ isOpen, onClose, log }) {
//   const [journey, setJourney] = useState([]);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (isOpen && log?.id) {
//       const fetchJourney = async () => {
//         setLoading(true);
//         try {
//           const res = await axiosClient.get(`/tracking/journeys/${log.id}`);
//           setJourney(res.data || []);
//         } catch (error) {
//           console.error("Failed to fetch contact journey", error);
//         } finally {
//           setLoading(false);
//         }
//       };
//       fetchJourney();
//     }
//   }, [isOpen, log]);

//   if (!log) return null;

//   return (
//     <Transition appear show={isOpen} as={Fragment}>
//       <Dialog as="div" className="relative z-50" onClose={onClose}>
//         <Transition.Child
//           as={Fragment}
//           enter="ease-out duration-300"
//           enterFrom="opacity-0"
//           enterTo="opacity-100"
//           leave="ease-in duration-200"
//           leaveFrom="opacity-100"
//           leaveTo="opacity-0"
//         >
//           <div className="fixed inset-0 bg-black bg-opacity-40" />
//         </Transition.Child>

//         <div className="fixed inset-0 overflow-y-hidden">
//           <div className="flex items-center justify-center min-h-full p-4">
//             <Transition.Child
//               as={Fragment}
//               enter="ease-out duration-300"
//               enterFrom="opacity-0 scale-95"
//               enterTo="opacity-100 scale-100"
//               leave="ease-in duration-200"
//               leaveFrom="opacity-100 scale-100"
//               leaveTo="opacity-0 scale-95"
//             >
//               {/* FIX: Panel is now a flex column with a max height */}
//               <Dialog.Panel className="w-full max-w-2xl flex flex-col max-h-[85vh] transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
//                 {/* Header: Now a static flex item */}
//                 <Dialog.Title className="flex-shrink-0 px-6 pt-6 pb-4 text-xl font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200">
//                   <span className="text-purple-600">🧭</span> Contact Journey
//                   for {log.contactName}
//                 </Dialog.Title>

//                 {/* Content: This area is now scrollable */}
//                 <div className="flex-grow overflow-y-auto px-6">
//                   {loading ? (
//                     <p className="text-center text-gray-500 py-8">
//                       Loading journey...
//                     </p>
//                   ) : journey.length > 0 ? (
//                     <div className="border-l-2 border-slate-200 ml-3 py-8 space-y-8">
//                       {journey.map((event, idx) => (
//                         <JourneyEvent key={idx} event={event} />
//                       ))}
//                     </div>
//                   ) : (
//                     <p className="text-center text-gray-500 py-8">
//                       No journey events found for this message.
//                     </p>
//                   )}
//                 </div>

//                 {/* Footer: Now a static flex item */}
//                 <div className="flex-shrink-0 px-6 pt-4 pb-6 flex justify-end gap-3 border-t border-gray-200">
//                   <button
//                     onClick={onClose}
//                     className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-semibold"
//                   >
//                     Close
//                   </button>
//                 </div>
//               </Dialog.Panel>
//             </Transition.Child>
//           </div>
//         </div>
//       </Dialog>
//     </Transition>
//   );
// }

// // A sub-component to render each event in the timeline (no changes needed here)
// const JourneyEvent = ({ event }) => {
//   const ICONS = {
//     MessageSent: <Send size={16} className="text-white" />,
//     ButtonClicked: <MousePointerClick size={16} className="text-white" />,
//   };

//   const COLORS = {
//     MessageSent: "bg-blue-500",
//     ButtonClicked: "bg-green-500",
//   };

//   return (
//     <div className="relative pl-10">
//       <div
//         className={`absolute -left-4 top-0.5 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white ${
//           COLORS[event.eventType] || "bg-gray-400"
//         }`}
//       >
//         {ICONS[event.eventType] || (
//           <Hourglass size={16} className="text-white" />
//         )}
//       </div>
//       <p className="font-semibold text-gray-800">{event.title}</p>
//       <p className="text-sm text-gray-500 truncate">{event.details}</p>
//       <p className="text-xs text-gray-400 mt-1">
//         {formatDate(event.timestamp)}
//       </p>
//     </div>
//   );
// };

// export default ContactJourneyModal;

// import React, { useEffect, useState, Fragment } from "react";
// import { Dialog, Transition } from "@headlessui/react";
// import axiosClient from "../../../api/axiosClient";
// import {
//   Send,
//   MousePointerClick,
//   Hourglass,
//   CheckCircle2,
//   Eye,
//   Share2,
// } from "lucide-react";

// const formatDate = dt => (dt ? new Date(dt).toLocaleString() : "N/A");

// function ContactJourneyModal({ isOpen, onClose, log }) {
//   const [journey, setJourney] = useState({ events: [] });
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     if (isOpen && log?.id) {
//       (async () => {
//         setLoading(true);
//         try {
//           const res = await axiosClient.get(`/tracking/journeys/${log.id}`);
//           const data = res.data;
//           // Back-compat: if server returns an array, wrap it
//           if (Array.isArray(data)) setJourney({ events: data });
//           else setJourney(data || { events: [] });
//         } catch (e) {
//           console.error("Failed to fetch contact journey", e);
//           setJourney({ events: [] });
//         } finally {
//           setLoading(false);
//         }
//       })();
//     }
//   }, [isOpen, log]);

//   if (!log) return null;

//   const typeBadge =
//     journey.campaignType === "flow" ? (
//       <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold">
//         Flow
//       </span>
//     ) : (
//       <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
//         Dynamic URL
//       </span>
//     );

//   return (
//     <Transition appear show={isOpen} as={Fragment}>
//       <Dialog as="div" className="relative z-50" onClose={onClose}>
//         <Transition.Child
//           as={Fragment}
//           enter="ease-out duration-300"
//           enterFrom="opacity-0"
//           enterTo="opacity-100"
//           leave="ease-in duration-200"
//           leaveFrom="opacity-100"
//           leaveTo="opacity-0"
//         >
//           <div className="fixed inset-0 bg-black/40" />
//         </Transition.Child>

//         <div className="fixed inset-0 overflow-y-hidden">
//           <div className="flex items-center justify-center min-h-full p-4">
//             <Transition.Child
//               as={Fragment}
//               enter="ease-out duration-300"
//               enterFrom="opacity-0 scale-95"
//               enterTo="opacity-100 scale-100"
//               leave="ease-in duration-200"
//               leaveFrom="opacity-100 scale-100"
//               leaveTo="opacity-0 scale-95"
//             >
//               <Dialog.Panel className="w-full max-w-2xl flex flex-col max-h-[85vh] transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
//                 <Dialog.Title className="flex-shrink-0 px-6 pt-6 pb-4 text-xl font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200">
//                   <span className="text-purple-600">🧭</span>
//                   Contact Journey for {log.contactName}
//                   {typeBadge}
//                 </Dialog.Title>

//                 <div className="flex-grow overflow-y-auto px-6">
//                   {loading ? (
//                     <p className="text-center text-gray-500 py-8">
//                       Loading journey...
//                     </p>
//                   ) : (journey?.events?.length || 0) > 0 ? (
//                     <>
//                       {journey?.leftOffAt && (
//                         <div className="mt-4 mb-2 text-xs text-gray-500">
//                           Left off at:{" "}
//                           <span className="font-semibold">
//                             {journey.leftOffAt}
//                           </span>
//                           {journey.flowName ? (
//                             <span>
//                               {" "}
//                               in{" "}
//                               <span className="font-semibold">
//                                 {journey.flowName}
//                               </span>
//                             </span>
//                           ) : null}
//                         </div>
//                       )}
//                       <div className="border-l-2 border-slate-200 ml-3 py-8 space-y-8">
//                         {journey.events.map((event, idx) => (
//                           <JourneyEvent key={idx} event={event} />
//                         ))}
//                       </div>
//                     </>
//                   ) : (
//                     <p className="text-center text-gray-500 py-8">
//                       No journey events found for this message.
//                     </p>
//                   )}
//                 </div>

//                 <div className="flex-shrink-0 px-6 pt-4 pb-6 flex justify-end gap-3 border-t border-gray-200">
//                   <button
//                     onClick={onClose}
//                     className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-semibold"
//                   >
//                     Close
//                   </button>
//                 </div>
//               </Dialog.Panel>
//             </Transition.Child>
//           </div>
//         </div>
//       </Dialog>
//     </Transition>
//   );
// }

// const ICONS = {
//   MessageSent: <Send size={16} className="text-white" />,
//   Delivered: <CheckCircle2 size={16} className="text-white" />,
//   Read: <Eye size={16} className="text-white" />,
//   ButtonClicked: <MousePointerClick size={16} className="text-white" />,
//   FlowSend: <Send size={16} className="text-white" />,
//   Redirect: <Share2 size={16} className="text-white" />,
// };

// const COLORS = {
//   MessageSent: "bg-blue-500",
//   Delivered: "bg-emerald-500",
//   Read: "bg-cyan-500",
//   ButtonClicked: "bg-green-500",
//   FlowSend: "bg-indigo-500",
//   Redirect: "bg-amber-500",
// };

// const JourneyEvent = ({ event }) => {
//   const icon = ICONS[event.eventType] || (
//     <Hourglass size={16} className="text-white" />
//   );
//   const color = COLORS[event.eventType] || "bg-gray-400";

//   return (
//     <div className="relative pl-10">
//       <div
//         className={`absolute -left-4 top-0.5 w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white ${color}`}
//       >
//         {icon}
//       </div>
//       <p className="font-semibold text-gray-800">{event.title}</p>
//       <p className="text-sm text-gray-500 break-words">
//         {event.details}
//         {event.url ? (
//           <>
//             <br />
//             <a
//               className="text-blue-600 underline"
//               href={event.url}
//               target="_blank"
//               rel="noreferrer"
//             >
//               {event.url}
//             </a>
//           </>
//         ) : null}
//       </p>
//       <p className="text-xs text-gray-400 mt-1">
//         {formatDate(event.timestamp)}
//       </p>
//     </div>
//   );
// };

// export default ContactJourneyModal;
// 📄 src/pages/campaigns/components/ContactJourneyModal.jsx
// import React, { useEffect, useMemo, useState, Fragment } from "react";
// import { Dialog, Transition } from "@headlessui/react";
// import axiosClient from "../../../api/axiosClient";
// import {
//   Send,
//   MousePointerClick,
//   Hourglass,
//   CheckCircle2,
//   Eye,
//   Share2,
//   Link2,
//   Copy,
//   Filter,
//   X,
// } from "lucide-react";

// const formatDate = dt => (dt ? new Date(dt).toLocaleString() : "N/A");

// // ---- helpers ----
// const relTime = iso => {
//   if (!iso) return "";
//   const diff = Date.now() - new Date(iso).getTime();
//   const abs = Math.abs(diff);
//   const mins = Math.floor(abs / (60 * 1000));
//   if (mins < 1) return "just now";
//   if (mins < 60) return `${mins}m ${diff < 0 ? "from now" : "ago"}`;
//   const hrs = Math.floor(mins / 60);
//   if (hrs < 24) return `${hrs}h ${diff < 0 ? "from now" : "ago"}`;
//   const days = Math.floor(hrs / 24);
//   return `${days}d ${diff < 0 ? "from now" : "ago"}`;
// };

// const displayUrl = raw => {
//   try {
//     const u = new URL(raw);
//     const tail =
//       u.pathname.length > 1 ? u.pathname.split("/").slice(-1)[0] : "";
//     return `${u.hostname}${tail ? `/${tail}` : ""}`;
//   } catch {
//     return raw?.slice(0, 60) || "";
//   }
// };

// const ICONS = {
//   MessageSent: <Send size={16} className="text-white" />,
//   Delivered: <CheckCircle2 size={16} className="text-white" />,
//   Read: <Eye size={16} className="text-white" />,
//   ButtonClicked: <MousePointerClick size={16} className="text-white" />,
//   FlowSend: <Send size={16} className="text-white" />,
//   Redirect: <Share2 size={16} className="text-white" />,
// };

// const COLORS = {
//   MessageSent: "bg-blue-500",
//   Delivered: "bg-emerald-500",
//   Read: "bg-cyan-500",
//   ButtonClicked: "bg-green-500",
//   FlowSend: "bg-indigo-500",
//   Redirect: "bg-amber-500",
// };

// const isClickEvent = t => t === "ButtonClicked" || t === "Redirect";
// const isMessageEvent = t =>
//   t === "MessageSent" || t === "Delivered" || t === "Read" || t === "FlowSend";

// function ContactJourneyModal({ isOpen, onClose, log }) {
//   const [journey, setJourney] = useState({ events: [] });
//   const [loading, setLoading] = useState(false);
//   const [filter, setFilter] = useState("all"); // all | messages | clicks
//   const [expanded, setExpanded] = useState(false);

//   // ✅ safe fallback to avoid conditional return before hooks
//   const safeLog = log || { contactName: "Unknown" };

//   useEffect(() => {
//     if (isOpen && log?.id) {
//       (async () => {
//         setLoading(true);
//         try {
//           const res = await axiosClient.get(`/tracking/journeys/${log.id}`);
//           const data = res.data;
//           if (Array.isArray(data)) setJourney({ events: data });
//           else setJourney(data || { events: [] });
//         } catch (e) {
//           console.error("Failed to fetch contact journey", e);
//           setJourney({ events: [] });
//         } finally {
//           setLoading(false);
//         }
//       })();
//     }
//   }, [isOpen, log]);

//   useEffect(() => {
//     if (isOpen) setExpanded(false);
//   }, [isOpen]);

//   const typeBadge =
//     journey.campaignType === "flow" ? (
//       <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold">
//         Flow
//       </span>
//     ) : (
//       <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
//         Dynamic URL
//       </span>
//     );

//   // filter view
//   const eventsFiltered = useMemo(() => {
//     const all = journey?.events || [];
//     if (filter === "messages")
//       return all.filter(e => isMessageEvent(e.eventType));
//     if (filter === "clicks") return all.filter(e => isClickEvent(e.eventType));
//     return all;
//   }, [journey, filter]);

//   // collapse logic
//   const COLLAPSE_AFTER = 6;
//   const eventsVisible =
//     expanded || eventsFiltered.length <= COLLAPSE_AFTER
//       ? eventsFiltered
//       : eventsFiltered.slice(0, COLLAPSE_AFTER);

//   const leftOff = journey?.leftOffAt;

//   return (
//     <Transition appear show={isOpen} as={Fragment}>
//       <Dialog as="div" className="relative z-50" onClose={onClose}>
//         <Transition.Child
//           as={Fragment}
//           enter="ease-out duration-300"
//           enterFrom="opacity-0"
//           enterTo="opacity-100"
//           leave="ease-in duration-200"
//           leaveFrom="opacity-100"
//           leaveTo="opacity-0"
//         >
//           <div className="fixed inset-0 bg-black/40" />
//         </Transition.Child>

//         <div className="fixed inset-0 overflow-y-hidden">
//           <div className="flex items-center justify-center min-h-full p-4">
//             <Transition.Child
//               as={Fragment}
//               enter="ease-out duration-300"
//               enterFrom="opacity-0 scale-95"
//               enterTo="opacity-100 scale-100"
//               leave="ease-in duration-200"
//               leaveFrom="opacity-100 scale-100"
//               leaveTo="opacity-0 scale-95"
//             >
//               <Dialog.Panel className="w-full max-w-2xl flex flex-col max-h-[85vh] transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
//                 {/* Header */}
//                 <Dialog.Title className="sticky top-0 z-10 bg-white/70 backdrop-blur px-6 pt-6 pb-3 text-xl font-bold text-gray-800 flex items-center gap-2 border-b border-gray-200">
//                   <span className="text-purple-600">🧭</span>
//                   Contact Journey for {safeLog.contactName}
//                   {typeBadge}
//                   <div className="ml-auto flex items-center gap-2">
//                     <Filter size={16} className="text-gray-400" />
//                     <div className="inline-flex rounded-lg border overflow-hidden">
//                       <button
//                         className={`px-2 py-1 text-xs ${
//                           filter === "all"
//                             ? "bg-gray-900 text-white"
//                             : "bg-white"
//                         }`}
//                         onClick={() => setFilter("all")}
//                       >
//                         All
//                       </button>
//                       <button
//                         className={`px-2 py-1 text-xs border-l ${
//                           filter === "messages"
//                             ? "bg-gray-900 text-white"
//                             : "bg-white"
//                         }`}
//                         onClick={() => setFilter("messages")}
//                       >
//                         Messages
//                       </button>
//                       <button
//                         className={`px-2 py-1 text-xs border-l ${
//                           filter === "clicks"
//                             ? "bg-gray-900 text-white"
//                             : "bg-white"
//                         }`}
//                         onClick={() => setFilter("clicks")}
//                       >
//                         Clicks
//                       </button>
//                     </div>
//                     <button
//                       onClick={onClose}
//                       className="ml-2 inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100"
//                       aria-label="Close"
//                     >
//                       <X size={16} />
//                     </button>
//                   </div>
//                 </Dialog.Title>

//                 {/* Body */}
//                 <div className="flex-grow overflow-y-auto px-6">
//                   {loading ? (
//                     <p className="text-center text-gray-500 py-8">
//                       Loading journey...
//                     </p>
//                   ) : (eventsFiltered.length || 0) > 0 ? (
//                     <>
//                       {leftOff && (
//                         <div className="mt-4 mb-2 text-xs text-gray-600">
//                           <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-1 font-semibold">
//                             Left off at:
//                             <span className="text-amber-900">{leftOff}</span>
//                             {journey.flowName ? (
//                               <span className="text-amber-700">
//                                 &nbsp;in{" "}
//                                 <span className="font-bold">
//                                   {journey.flowName}
//                                 </span>
//                               </span>
//                             ) : null}
//                           </span>
//                         </div>
//                       )}

//                       <div className="relative ml-4 py-6">
//                         {/* vertical line */}
//                         <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
//                         <div className="space-y-6">
//                           {eventsVisible.map((event, idx) => (
//                             <JourneyEvent
//                               key={idx}
//                               isCurrent={
//                                 leftOff && event?.title?.includes(leftOff)
//                               }
//                               event={event}
//                             />
//                           ))}
//                         </div>
//                       </div>

//                       {eventsFiltered.length > COLLAPSE_AFTER && (
//                         <div className="flex justify-center pt-2 pb-6">
//                           <button
//                             onClick={() => setExpanded(v => !v)}
//                             className="text-sm font-semibold text-purple-700 hover:text-purple-800"
//                           >
//                             {expanded
//                               ? "Show less"
//                               : `Show ${
//                                   eventsFiltered.length - COLLAPSE_AFTER
//                                 } more events`}
//                           </button>
//                         </div>
//                       )}
//                     </>
//                   ) : (
//                     <p className="text-center text-gray-500 py-8">
//                       No journey events found for this message.
//                     </p>
//                   )}
//                 </div>

//                 {/* Footer */}
//                 <div className="flex-shrink-0 px-6 pt-3 pb-5 flex justify-end gap-3 border-t border-gray-200">
//                   <button
//                     onClick={onClose}
//                     className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-semibold"
//                   >
//                     Close
//                   </button>
//                 </div>
//               </Dialog.Panel>
//             </Transition.Child>
//           </div>
//         </div>
//       </Dialog>
//     </Transition>
//   );
// }

// // const JourneyEvent = ({ event, isCurrent }) => {
// //   const icon = ICONS[event.eventType] || (
// //     <Hourglass size={16} className="text-white" />
// //   );
// //   const color = COLORS[event.eventType] || "bg-gray-400";

// //   const handleCopy = () => {
// //     if (event.url) {
// //       navigator.clipboard?.writeText(event.url);
// //     }
// //   };

// //   const isClickable = Boolean(event.url);

// //   return (
// //     <div className="relative pl-8">
// //       {/* node */}
// //       <div
// //         className={`absolute -left-3 top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${color} ${
// //           isCurrent ? "scale-110 shadow-lg" : ""
// //         }`}
// //       >
// //         {icon}
// //       </div>

// //       <div
// //         className={`rounded-lg p-3 ${
// //           isCurrent ? "bg-amber-50 border border-amber-200" : "bg-white"
// //         }`}
// //       >
// //         <p className="font-semibold text-gray-800">{event.title}</p>

// //         <p className="text-sm text-gray-600 break-words">
// //           {event.details}
// //           {isClickable && (
// //             <>
// //               <br />
// //               <a
// //                 className="inline-flex items-center gap-1 text-blue-700 underline underline-offset-2"
// //                 href={event.url}
// //                 target="_blank"
// //                 rel="noreferrer"
// //                 title={event.url}
// //               >
// //                 <Link2 size={14} />
// //                 {displayUrl(event.url)}
// //               </a>
// //               <button
// //                 onClick={handleCopy}
// //                 className="ml-2 inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
// //                 title="Copy URL"
// //               >
// //                 <Copy size={14} />
// //                 <span className="text-xs">Copy</span>
// //               </button>
// //             </>
// //           )}
// //         </p>

// //         <p className="text-xs text-gray-400 mt-2">
// //           {formatDate(event.timestamp)} • {relTime(event.timestamp)}
// //         </p>
// //       </div>
// //     </div>
// //   );
// // };
// const JourneyEvent = ({ event, isCurrent }) => {
//   const icon = ICONS[event.eventType] || (
//     <Hourglass size={16} className="text-white" />
//   );
//   const color = COLORS[event.eventType] || "bg-gray-400";

//   const handleCopy = () => {
//     if (event.url) {
//       navigator.clipboard?.writeText(event.url);
//     }
//   };

//   const isClickable = Boolean(event.url);

//   // ✅ hide "details" for click-type events (Quick Reply / URL button)
//   const shouldShowDetails = !(
//     event.eventType === "ButtonClicked" || event.eventType === "Redirect"
//   );

//   return (
//     <div className="relative pl-8">
//       {/* node */}
//       <div
//         className={`absolute -left-3 top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${color} ${
//           isCurrent ? "scale-110 shadow-lg" : ""
//         }`}
//       >
//         {icon}
//       </div>

//       <div
//         className={`rounded-lg p-3 ${
//           isCurrent ? "bg-amber-50 border border-amber-200" : "bg-white"
//         }`}
//       >
//         <p className="font-semibold text-gray-800">{event.title}</p>

//         {shouldShowDetails && event.details && (
//           <p className="text-sm text-gray-600 break-words">{event.details}</p>
//         )}

//         {isClickable && (
//           <p className="mt-1">
//             <a
//               className="inline-flex items-center gap-1 text-blue-700 underline underline-offset-2"
//               href={event.url}
//               target="_blank"
//               rel="noreferrer"
//               title={event.url}
//             >
//               <Link2 size={14} />
//               {displayUrl(event.url)}
//             </a>
//             <button
//               onClick={handleCopy}
//               className="ml-2 inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
//               title="Copy URL"
//             >
//               <Copy size={14} />
//               <span className="text-xs">Copy</span>
//             </button>
//           </p>
//         )}

//         <p className="text-xs text-gray-400 mt-2">
//           {formatDate(event.timestamp)} • {relTime(event.timestamp)}
//         </p>
//       </div>
//     </div>
//   );
// };

// export default ContactJourneyModal;
// 📄 src/pages/campaigns/components/ContactJourneyModal.jsx
// import React, { useEffect, useMemo, useState, Fragment } from "react";
// import { Dialog, Transition } from "@headlessui/react";
// import axiosClient from "../../../api/axiosClient";
// import {
//   Send,
//   MousePointerClick,
//   Hourglass,
//   CheckCircle2,
//   Eye,
//   Share2,
//   Link2,
//   Copy,
//   Filter,
//   X,
// } from "lucide-react";

// const formatDate = dt => (dt ? new Date(dt).toLocaleString() : "N/A");

// // ---- helpers ----
// const relTime = iso => {
//   if (!iso) return "";
//   const diff = Date.now() - new Date(iso).getTime();
//   const abs = Math.abs(diff);
//   const mins = Math.floor(abs / (60 * 1000));
//   if (mins < 1) return "just now";
//   if (mins < 60) return `${mins}m ${diff < 0 ? "from now" : "ago"}`;
//   const hrs = Math.floor(mins / 60);
//   if (hrs < 24) return `${hrs}h ${diff < 0 ? "from now" : "ago"}`;
//   const days = Math.floor(hrs / 24);
//   return `${days}d ${diff < 0 ? "from now" : "ago"}`;
// };

// const displayUrl = raw => {
//   try {
//     const u = new URL(raw);
//     const tail =
//       u.pathname.length > 1 ? u.pathname.split("/").slice(-1)[0] : "";
//     return `${u.hostname}${tail ? `/${tail}` : ""}`;
//   } catch {
//     return raw?.slice(0, 60) || "";
//   }
// };

// // 👉 extract a phone number from any string like "WhatsApp User (+91897…)"
// const extractNumber = val => {
//   if (!val) return null;
//   const m = String(val).match(/(\+?\d[\d\s-]{5,}\d)/);
//   return m ? m[1].replace(/[\s-]/g, "") : null;
// };

// const ICONS = {
//   MessageSent: <Send size={16} className="text-white" />,
//   Delivered: <CheckCircle2 size={16} className="text-white" />,
//   Read: <Eye size={16} className="text-white" />,
//   ButtonClicked: <MousePointerClick size={16} className="text-white" />,
//   FlowSend: <Send size={16} className="text-white" />,
//   Redirect: <Share2 size={16} className="text-white" />,
// };

// const COLORS = {
//   MessageSent: "bg-blue-500",
//   Delivered: "bg-emerald-500",
//   Read: "bg-cyan-500",
//   ButtonClicked: "bg-green-500",
//   FlowSend: "bg-indigo-500",
//   Redirect: "bg-amber-500",
// };

// const isClickEvent = t => t === "ButtonClicked" || t === "Redirect";
// const isMessageEvent = t =>
//   t === "MessageSent" || t === "Delivered" || t === "Read" || t === "FlowSend";

// function ContactJourneyModal({ isOpen, onClose, log }) {
//   const [journey, setJourney] = useState({ events: [] });
//   const [loading, setLoading] = useState(false);
//   const [filter, setFilter] = useState("all"); // all | messages | clicks
//   const [expanded, setExpanded] = useState(false);

//   // ✅ safe fallback to avoid conditional return before hooks
//   const safeLog = log || { contactName: "Unknown" };

//   // Prefer explicit phone fields, then try to pull from contactName like "WhatsApp User (+91…)"
//   const displayPhone =
//     log?.recipientNumber ||
//     log?.contactPhone ||
//     log?.to ||
//     extractNumber(log?.contactName) ||
//     "Unknown";

//   useEffect(() => {
//     if (isOpen && log?.id) {
//       (async () => {
//         setLoading(true);
//         try {
//           const res = await axiosClient.get(`/tracking/journeys/${log.id}`);
//           const data = res.data;
//           if (Array.isArray(data)) setJourney({ events: data });
//           else setJourney(data || { events: [] });
//         } catch (e) {
//           console.error("Failed to fetch contact journey", e);
//           setJourney({ events: [] });
//         } finally {
//           setLoading(false);
//         }
//       })();
//     }
//   }, [isOpen, log]);

//   useEffect(() => {
//     if (isOpen) setExpanded(false);
//   }, [isOpen]);

//   const typeBadge =
//     journey.campaignType === "flow" ? (
//       <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold">
//         Flow
//       </span>
//     ) : (
//       <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
//         Dynamic URL
//       </span>
//     );

//   // filter view
//   const eventsFiltered = useMemo(() => {
//     const all = journey?.events || [];
//     if (filter === "messages")
//       return all.filter(e => isMessageEvent(e.eventType));
//     if (filter === "clicks") return all.filter(e => isClickEvent(e.eventType));
//     return all;
//   }, [journey, filter]);

//   // collapse logic
//   const COLLAPSE_AFTER = 6;
//   const eventsVisible =
//     expanded || eventsFiltered.length <= COLLAPSE_AFTER
//       ? eventsFiltered
//       : eventsFiltered.slice(0, COLLAPSE_AFTER);

//   const leftOff = journey?.leftOffAt;

//   return (
//     <Transition appear show={isOpen} as={Fragment}>
//       <Dialog as="div" className="relative z-50" onClose={onClose}>
//         <Transition.Child
//           as={Fragment}
//           enter="ease-out duration-300"
//           enterFrom="opacity-0"
//           enterTo="opacity-100"
//           leave="ease-in duration-200"
//           leaveFrom="opacity-100"
//           leaveTo="opacity-0"
//         >
//           <div className="fixed inset-0 bg-black/40" />
//         </Transition.Child>

//         <div className="fixed inset-0 overflow-y-hidden">
//           <div className="flex items-center justify-center min-h-full p-4">
//             <Transition.Child
//               as={Fragment}
//               enter="ease-out duration-300"
//               enterFrom="opacity-0 scale-95"
//               enterTo="opacity-100 scale-100"
//               leave="ease-in duration-200"
//               leaveFrom="opacity-100 scale-100"
//               leaveTo="opacity-0 scale-95"
//             >
//               <Dialog.Panel className="w-full max-w-2xl flex flex-col max-h-[85vh] transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
//                 {/* Header */}
//                 <Dialog.Title className="sticky top-0 z-10 bg-white/70 backdrop-blur px-6 pt-6 pb-3 text-lg font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-200">
//                   <span className="text-purple-600">🧭</span>
//                   {/* 🔁 Show only the phone number here */}
//                   Contact Journey for {displayPhone}
//                   {typeBadge}
//                   <div className="ml-auto flex items-center gap-2">
//                     <Filter size={16} className="text-gray-400" />
//                     <div className="inline-flex rounded-lg border overflow-hidden">
//                       <button
//                         className={`px-2 py-1 text-xs ${
//                           filter === "all"
//                             ? "bg-gray-900 text-white"
//                             : "bg-white"
//                         }`}
//                         onClick={() => setFilter("all")}
//                       >
//                         All
//                       </button>
//                       <button
//                         className={`px-2 py-1 text-xs border-l ${
//                           filter === "messages"
//                             ? "bg-gray-900 text-white"
//                             : "bg-white"
//                         }`}
//                         onClick={() => setFilter("messages")}
//                       >
//                         Messages
//                       </button>
//                       <button
//                         className={`px-2 py-1 text-xs border-l ${
//                           filter === "clicks"
//                             ? "bg-gray-900 text-white"
//                             : "bg-white"
//                         }`}
//                         onClick={() => setFilter("clicks")}
//                       >
//                         Clicks
//                       </button>
//                     </div>
//                     <button
//                       onClick={onClose}
//                       className="ml-2 inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100"
//                       aria-label="Close"
//                     >
//                       <X size={16} />
//                     </button>
//                   </div>
//                 </Dialog.Title>

//                 {/* Body */}
//                 <div className="flex-grow overflow-y-auto px-6">
//                   {loading ? (
//                     <p className="text-center text-gray-500 py-8">
//                       Loading journey...
//                     </p>
//                   ) : (eventsFiltered.length || 0) > 0 ? (
//                     <>
//                       {leftOff && (
//                         <div className="mt-4 mb-2 text-xs text-gray-600">
//                           <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-1 font-semibold">
//                             Left off at:
//                             <span className="text-amber-900">{leftOff}</span>
//                             {journey.flowName ? (
//                               <span className="text-amber-700">
//                                 &nbsp;in{" "}
//                                 <span className="font-bold">
//                                   {journey.flowName}
//                                 </span>
//                               </span>
//                             ) : null}
//                           </span>
//                         </div>
//                       )}

//                       <div className="relative ml-4 py-6">
//                         <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
//                         <div className="space-y-6">
//                           {eventsVisible.map((event, idx) => (
//                             <JourneyEvent
//                               key={idx}
//                               isCurrent={
//                                 leftOff && event?.title?.includes(leftOff)
//                               }
//                               event={event}
//                             />
//                           ))}
//                         </div>
//                       </div>

//                       {eventsFiltered.length > COLLAPSE_AFTER && (
//                         <div className="flex justify-center pt-2 pb-6">
//                           <button
//                             onClick={() => setExpanded(v => !v)}
//                             className="text-sm font-semibold text-purple-700 hover:text-purple-800"
//                           >
//                             {expanded
//                               ? "Show less"
//                               : `Show ${
//                                   eventsFiltered.length - COLLAPSE_AFTER
//                                 } more events`}
//                           </button>
//                         </div>
//                       )}
//                     </>
//                   ) : (
//                     <p className="text-center text-gray-500 py-8">
//                       No journey events found for this message.
//                     </p>
//                   )}
//                 </div>

//                 {/* Footer */}
//                 <div className="flex-shrink-0 px-6 pt-3 pb-5 flex justify-end gap-3 border-t border-gray-200">
//                   <button
//                     onClick={onClose}
//                     className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-semibold"
//                   >
//                     Close
//                   </button>
//                 </div>
//               </Dialog.Panel>
//             </Transition.Child>
//           </div>
//         </div>
//       </Dialog>
//     </Transition>
//   );
// }

// const JourneyEvent = ({ event, isCurrent }) => {
//   const icon = ICONS[event.eventType] || (
//     <Hourglass size={16} className="text-white" />
//   );
//   const color = COLORS[event.eventType] || "bg-gray-400";

//   const handleCopy = () => {
//     if (event.url) {
//       navigator.clipboard?.writeText(event.url);
//     }
//   };

//   const isClickable = Boolean(event.url);

//   // Hide details for click-type events; keep for statuses/errors
//   const shouldShowDetails = !(
//     event.eventType === "ButtonClicked" || event.eventType === "Redirect"
//   );

//   return (
//     <div className="relative pl-8">
//       <div
//         className={`absolute -left-3 top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${color} ${
//           isCurrent ? "scale-110 shadow-lg" : ""
//         }`}
//       >
//         {icon}
//       </div>

//       <div
//         className={`rounded-lg p-2 ${
//           isCurrent ? "bg-amber-50 border border-amber-200" : "bg-white"
//         }`}
//       >
//         <p className="font-semibold text-gray-800">{event.title}</p>

//         {shouldShowDetails && event.details && (
//           <p className="text-sm text-gray-600 break-words">{event.details}</p>
//         )}

//         {isClickable && (
//           <p className="mt-1">
//             <a
//               className="inline-flex items-center gap-1 text-blue-700 underline underline-offset-2"
//               href={event.url}
//               target="_blank"
//               rel="noreferrer"
//               title={event.url}
//             >
//               <Link2 size={14} />
//               {displayUrl(event.url)}
//             </a>
//             <button
//               onClick={handleCopy}
//               className="ml-2 inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
//               title="Copy URL"
//             >
//               <Copy size={14} />
//               <span className="text-xs">Copy</span>
//             </button>
//           </p>
//         )}

//         <p className="text-xs text-gray-400 mt-2">
//           {formatDate(event.timestamp)} • {relTime(event.timestamp)}
//         </p>
//       </div>
//     </div>
//   );
// };

// export default ContactJourneyModal;

// import React, { useEffect, useMemo, useState, Fragment } from "react";
// import { Dialog, Transition } from "@headlessui/react";
// import axiosClient from "../../../api/axiosClient";
// import {
//   Send,
//   MousePointerClick,
//   Hourglass,
//   CheckCircle2,
//   Eye,
//   Share2,
//   Link2,
//   Copy,
//   Filter,
//   X,
// } from "lucide-react";

// const formatDate = dt => (dt ? new Date(dt).toLocaleString() : "N/A");

// const relTime = iso => {
//   if (!iso) return "";
//   const diff = Date.now() - new Date(iso).getTime();
//   const abs = Math.abs(diff);
//   const mins = Math.floor(abs / (60 * 1000));
//   if (mins < 1) return "just now";
//   if (mins < 60) return `${mins}m ${diff < 0 ? "from now" : "ago"}`;
//   const hrs = Math.floor(mins / 60);
//   if (hrs < 24) return `${hrs}h ${diff < 0 ? "from now" : "ago"}`;
//   const days = Math.floor(hrs / 24);
//   return `${days}d ${diff < 0 ? "from now" : "ago"}`;
// };

// const displayUrl = raw => {
//   try {
//     const u = new URL(raw);
//     const tail =
//       u.pathname.length > 1 ? u.pathname.split("/").slice(-1)[0] : "";
//     return `${u.hostname}${tail ? `/${tail}` : ""}`;
//   } catch {
//     return raw?.slice(0, 60) || "";
//   }
// };

// const extractNumber = val => {
//   if (!val) return null;
//   const m = String(val).match(/(\+?\d[\d\s-]{5,}\d)/);
//   return m ? m[1].replace(/[\s-]/g, "") : null;
// };

// const ICONS = {
//   MessageSent: <Send size={16} className="text-white" />,
//   Delivered: <CheckCircle2 size={16} className="text-white" />,
//   Read: <Eye size={16} className="text-white" />,
//   ButtonClicked: <MousePointerClick size={16} className="text-white" />,
//   FlowSend: <Send size={16} className="text-white" />,
//   Redirect: <Share2 size={16} className="text-white" />,
// };

// const COLORS = {
//   MessageSent: "bg-blue-500",
//   Delivered: "bg-emerald-500",
//   Read: "bg-cyan-500",
//   ButtonClicked: "bg-green-500",
//   FlowSend: "bg-indigo-500",
//   Redirect: "bg-amber-500",
// };

// const isClickEvent = t => t === "ButtonClicked" || t === "Redirect";
// const isMessageEvent = t =>
//   t === "MessageSent" || t === "Delivered" || t === "Read" || t === "FlowSend";

// function ContactJourneyModal({ isOpen, onClose, log }) {
//   const [journey, setJourney] = useState({ events: [] });
//   const [loading, setLoading] = useState(false);
//   const [filter, setFilter] = useState("all");
//   const [expanded, setExpanded] = useState(false);

//   const displayPhone =
//     log?.recipientNumber ||
//     log?.contactPhone ||
//     log?.to ||
//     extractNumber(log?.contactName) ||
//     "Unknown";

//   useEffect(() => {
//     if (isOpen && log?.id) {
//       (async () => {
//         setLoading(true);
//         try {
//           const res = await axiosClient.get(`/tracking/journeys/${log.id}`);
//           const data = res.data;
//           if (Array.isArray(data)) setJourney({ events: data });
//           else setJourney(data || { events: [] });
//         } catch (e) {
//           console.error("Failed to fetch contact journey", e);
//           setJourney({ events: [] });
//         } finally {
//           setLoading(false);
//         }
//       })();
//     }
//   }, [isOpen, log]);

//   useEffect(() => {
//     if (isOpen) setExpanded(false);
//   }, [isOpen]);

//   const typeBadge =
//     journey.campaignType === "flow" ? (
//       <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold">
//         Flow
//       </span>
//     ) : (
//       <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
//         Dynamic URL
//       </span>
//     );

//   const eventsFiltered = useMemo(() => {
//     const all = journey?.events || [];
//     if (filter === "messages")
//       return all.filter(e => isMessageEvent(e.eventType));
//     if (filter === "clicks") return all.filter(e => isClickEvent(e.eventType));
//     return all;
//   }, [journey, filter]);

//   const COLLAPSE_AFTER = 6;
//   const eventsVisible =
//     expanded || eventsFiltered.length <= COLLAPSE_AFTER
//       ? eventsFiltered
//       : eventsFiltered.slice(0, COLLAPSE_AFTER);

//   const leftOff = journey?.leftOffAt;

//   return (
//     <Transition appear show={isOpen} as={Fragment}>
//       <Dialog as="div" className="relative z-50" onClose={onClose}>
//         <Transition.Child
//           as={Fragment}
//           enter="ease-out duration-300"
//           enterFrom="opacity-0"
//           enterTo="opacity-100"
//           leave="ease-in duration-200"
//           leaveFrom="opacity-100"
//           leaveTo="opacity-0"
//         >
//           <div className="fixed inset-0 bg-black/40" />
//         </Transition.Child>

//         <div className="fixed inset-0 overflow-y-hidden">
//           <div className="flex items-center justify-center min-h-full p-4">
//             <Transition.Child
//               as={Fragment}
//               enter="ease-out duration-300"
//               enterFrom="opacity-0 scale-95"
//               enterTo="opacity-100 scale-100"
//               leave="ease-in duration-200"
//               leaveFrom="opacity-100 scale-100"
//               leaveTo="opacity-0 scale-95"
//             >
//               <Dialog.Panel className="w-full max-w-2xl flex flex-col max-h-[85vh] transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
//                 {/* Header */}
//                 <Dialog.Title className="sticky top-0 z-10 bg-white/70 backdrop-blur px-6 pt-6 pb-2 text-base font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-200">
//                   <span className="text-purple-600">🧭</span>
//                   Contact Journey for {displayPhone}
//                   {typeBadge}
//                   <div className="ml-auto flex items-center gap-2">
//                     <Filter size={16} className="text-gray-400" />
//                     <div className="inline-flex rounded-lg border overflow-hidden">
//                       <button
//                         className={`px-2 py-1 text-xs ${
//                           filter === "all"
//                             ? "bg-gray-900 text-white"
//                             : "bg-white"
//                         }`}
//                         onClick={() => setFilter("all")}
//                       >
//                         All
//                       </button>
//                       <button
//                         className={`px-2 py-1 text-xs border-l ${
//                           filter === "messages"
//                             ? "bg-gray-900 text-white"
//                             : "bg-white"
//                         }`}
//                         onClick={() => setFilter("messages")}
//                       >
//                         Messages
//                       </button>
//                       <button
//                         className={`px-2 py-1 text-xs border-l ${
//                           filter === "clicks"
//                             ? "bg-gray-900 text-white"
//                             : "bg-white"
//                         }`}
//                         onClick={() => setFilter("clicks")}
//                       >
//                         Clicks
//                       </button>
//                     </div>
//                     <button
//                       onClick={onClose}
//                       className="ml-2 inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100"
//                       aria-label="Close"
//                     >
//                       <X size={16} />
//                     </button>
//                   </div>
//                 </Dialog.Title>

//                 {/* Body */}
//                 <div className="flex-grow overflow-y-auto px-6">
//                   {loading ? (
//                     <p className="text-center text-gray-500 py-8">
//                       Loading journey...
//                     </p>
//                   ) : (eventsFiltered.length || 0) > 0 ? (
//                     <>
//                       {leftOff && (
//                         <div className="mt-3 mb-2 text-xs text-gray-600">
//                           <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-1 font-semibold">
//                             Left off at:
//                             <span className="text-amber-900">{leftOff}</span>
//                             {journey.flowName ? (
//                               <span className="text-amber-700">
//                                 &nbsp;in{" "}
//                                 <span className="font-bold">
//                                   {journey.flowName}
//                                 </span>
//                               </span>
//                             ) : null}
//                           </span>
//                         </div>
//                       )}

//                       <div className="relative ml-3 py-3">
//                         <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
//                         <div className="space-y-3">
//                           {eventsVisible.map((event, idx) => (
//                             <JourneyEvent
//                               key={idx}
//                               isCurrent={
//                                 leftOff && event?.title?.includes(leftOff)
//                               }
//                               event={event}
//                             />
//                           ))}
//                         </div>
//                       </div>

//                       {eventsFiltered.length > COLLAPSE_AFTER && (
//                         <div className="flex justify-center pt-2 pb-4">
//                           <button
//                             onClick={() => setExpanded(v => !v)}
//                             className="text-sm font-semibold text-purple-700 hover:text-purple-800"
//                           >
//                             {expanded
//                               ? "Show less"
//                               : `Show ${
//                                   eventsFiltered.length - COLLAPSE_AFTER
//                                 } more events`}
//                           </button>
//                         </div>
//                       )}
//                     </>
//                   ) : (
//                     <p className="text-center text-gray-500 py-8">
//                       No journey events found for this message.
//                     </p>
//                   )}
//                 </div>

//                 {/* Footer */}
//                 <div className="flex-shrink-0 px-6 pt-2 pb-4 flex justify-end gap-3 border-t border-gray-200">
//                   <button
//                     onClick={onClose}
//                     className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm font-semibold"
//                   >
//                     Close
//                   </button>
//                 </div>
//               </Dialog.Panel>
//             </Transition.Child>
//           </div>
//         </div>
//       </Dialog>
//     </Transition>
//   );
// }

// const JourneyEvent = ({ event, isCurrent }) => {
//   const icon = ICONS[event.eventType] || (
//     <Hourglass size={16} className="text-white" />
//   );
//   const color = COLORS[event.eventType] || "bg-gray-400";

//   const handleCopy = () => {
//     if (event.url) {
//       navigator.clipboard?.writeText(event.url);
//     }
//   };

//   const isClickable = Boolean(event.url);
//   const shouldShowDetails = !(
//     event.eventType === "ButtonClicked" || event.eventType === "Redirect"
//   );

//   return (
//     <div className="relative pl-6">
//       <div
//         className={`absolute -left-3 top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${color} ${
//           isCurrent ? "scale-110 shadow-lg" : ""
//         }`}
//       >
//         {icon}
//       </div>

//       <div
//         className={`rounded-lg p-1.5 ${
//           isCurrent ? "bg-amber-50 border border-amber-200" : "bg-white"
//         }`}
//       >
//         <p className="font-semibold text-gray-800">{event.title}</p>

//         {shouldShowDetails && event.details && (
//           <p className="text-sm text-gray-600 break-words">{event.details}</p>
//         )}

//         {isClickable && (
//           <p className="mt-1">
//             <a
//               className="inline-flex items-center gap-1 text-blue-700 underline underline-offset-2"
//               href={event.url}
//               target="_blank"
//               rel="noreferrer"
//               title={event.url}
//             >
//               <Link2 size={14} />
//               {displayUrl(event.url)}
//             </a>
//             <button
//               onClick={handleCopy}
//               className="ml-2 inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
//               title="Copy URL"
//             >
//               <Copy size={14} />
//               <span className="text-xs">Copy</span>
//             </button>
//           </p>
//         )}

//         <p className="text-xs text-gray-400 mt-1">
//           {formatDate(event.timestamp)} • {relTime(event.timestamp)}
//         </p>
//       </div>
//     </div>
//   );
// };

// export default ContactJourneyModal;
// 📄 src/pages/campaigns/components/ContactJourneyModal.jsx
import React, { useEffect, useMemo, useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";
import {
  Send,
  MousePointerClick,
  Hourglass,
  CheckCircle2,
  Eye,
  Share2,
  Link2,
  Copy,
  Filter,
  X,
  Compass,
} from "lucide-react";

const formatDate = dt => (dt ? new Date(dt).toLocaleString() : "N/A");

const relTime = iso => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / (60 * 1000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ${diff < 0 ? "from now" : "ago"}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${diff < 0 ? "from now" : "ago"}`;
  const days = Math.floor(hrs / 24);
  return `${days}d ${diff < 0 ? "from now" : "ago"}`;
};

const displayUrl = raw => {
  try {
    const u = new URL(raw);
    const tail =
      u.pathname.length > 1 ? u.pathname.split("/").slice(-1)[0] : "";
    return `${u.hostname}${tail ? `/${tail}` : ""}`;
  } catch {
    return raw?.slice(0, 60) || "";
  }
};

/** Pull a phone-like token out of free text (e.g. "WhatsApp User (+91 987...)"). */
const extractNumberLoose = val => {
  if (!val) return null;
  const m = String(val).match(/(\+?\d[\d\s\-()]{5,}\d)/);
  return m ? m[1] : null;
};

/** Normalize for display as E.164-like: keep leading "+", strip other non-digits; if no "+", prepend it. */
const normalizeE164 = raw => {
  if (!raw) return "";
  let s = String(raw).trim();
  const hasPlus = s.startsWith("+");
  s = (hasPlus ? "+" : "") + s.replace(/[^\d]/g, "");
  if (!s.startsWith("+")) s = "+" + s;
  return s;
};

const ICONS = {
  MessageSent: <Send size={16} className="text-white" />,
  Delivered: <CheckCircle2 size={16} className="text-white" />,
  Read: <Eye size={16} className="text-white" />,
  ButtonClicked: <MousePointerClick size={16} className="text-white" />,
  FlowSend: <Send size={16} className="text-white" />,
  Redirect: <Share2 size={16} className="text-white" />,
};

const COLORS = {
  MessageSent: "bg-blue-500",
  Delivered: "bg-emerald-500",
  Read: "bg-cyan-500",
  ButtonClicked: "bg-green-500",
  FlowSend: "bg-indigo-500",
  Redirect: "bg-amber-500",
};

const isClickEvent = t => t === "ButtonClicked" || t === "Redirect";
const isMessageEvent = t =>
  t === "MessageSent" || t === "Delivered" || t === "Read" || t === "FlowSend";

function ContactJourneyModal({ isOpen, onClose, log }) {
  const [journey, setJourney] = useState({ events: [] });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const [errorText, setErrorText] = useState("");

  // Prefer backend-resolved phone, then log fields, then loose extraction; finally normalize to +E.164 for display.
  const rawPhoneCandidate =
    journey?.contactPhone ||
    log?.recipientNumber ||
    log?.contactPhone ||
    log?.to ||
    extractNumberLoose(log?.contactName) ||
    "";
  const displayPhone = normalizeE164(rawPhoneCandidate) || "Unknown";

  useEffect(() => {
    if (!isOpen || !log) return;

    // Prefer CampaignSendLogId (audience uploads), fall back to id
    const cslId = log.campaignSendLogId || log.id;
    if (!cslId) return;

    (async () => {
      setLoading(true);
      setErrorText("");
      try {
        const res = await axiosClient.get(`/tracking/journeys/${cslId}`);
        const data = res.data;
        setJourney(
          Array.isArray(data) ? { events: data } : data || { events: [] }
        );
      } catch (err) {
        const raw =
          err?.response?.data?.message ||
          err?.response?.data?.title ||
          err?.message ||
          "";
        const isEmptyProjection =
          typeof raw === "string" &&
          raw.toLowerCase().includes("emptyprojectionmember");

        if (isEmptyProjection) {
          console.warn("[Journey] Backend EF error:", raw);
          setErrorText(
            "Journey data is temporarily unavailable. Please try again after a refresh."
          );
        } else {
          setErrorText(raw || "Failed to fetch contact journey.");
          toast.error(raw || "Failed to fetch contact journey");
        }
        setJourney({ events: [] });
      } finally {
        setLoading(false);
      }
    })();
  }, [isOpen, log]);

  useEffect(() => {
    if (isOpen) setExpanded(false);
  }, [isOpen]);

  const typeBadge =
    journey.campaignType === "flow" ? (
      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-semibold">
        Flow
      </span>
    ) : (
      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
        Dynamic URL
      </span>
    );

  const eventsFiltered = useMemo(() => {
    const all = journey?.events || [];
    if (filter === "messages")
      return all.filter(e => isMessageEvent(e.eventType));
    if (filter === "clicks") return all.filter(e => isClickEvent(e.eventType));
    return all;
  }, [journey, filter]);

  const COLLAPSE_AFTER = 6;
  const eventsVisible =
    expanded || eventsFiltered.length <= COLLAPSE_AFTER
      ? eventsFiltered
      : eventsFiltered.slice(0, COLLAPSE_AFTER);

  const leftOff = journey?.leftOffAt;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-hidden">
          <div className="flex items-center justify-center min-h-full p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl flex flex-col max-h-[85vh] transform overflow-hidden rounded-xl bg-white shadow-xl transition-all">
                {/* Header */}
                <Dialog.Title className="sticky top-0 z-10 bg-white/70 backdrop-blur px-6 pt-6 pb-2 text-base font-semibold text-gray-800 flex items-center gap-2 border-b border-gray-200">
                  <Compass size={16} className="text-emerald-600" />
                  Contact Journey for {displayPhone}
                  {typeBadge}
                  <div className="ml-auto flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <div className="inline-flex rounded-lg border overflow-hidden">
                      <button
                        className={`px-2 py-1 text-xs ${
                          filter === "all"
                            ? "bg-gray-900 text-white"
                            : "bg-white"
                        }`}
                        onClick={() => setFilter("all")}
                      >
                        All
                      </button>
                      <button
                        className={`px-2 py-1 text-xs border-l ${
                          filter === "messages"
                            ? "bg-gray-900 text-white"
                            : "bg-white"
                        }`}
                        onClick={() => setFilter("messages")}
                      >
                        Messages
                      </button>
                      <button
                        className={`px-2 py-1 text-xs border-l ${
                          filter === "clicks"
                            ? "bg-gray-900 text-white"
                            : "bg-white"
                        }`}
                        onClick={() => setFilter("clicks")}
                      >
                        Clicks
                      </button>
                    </div>
                    <button
                      onClick={onClose}
                      className="ml-2 inline-flex items-center justify-center rounded-lg p-2 hover:bg-gray-100"
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </Dialog.Title>

                {/* Body */}
                <div className="flex-grow overflow-y-auto px-6">
                  {loading ? (
                    <p className="text-center text-gray-500 py-8">
                      Loading journey...
                    </p>
                  ) : errorText ? (
                    <div className="py-8">
                      <p className="text-center text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 text-sm">
                        {errorText}
                      </p>
                    </div>
                  ) : (eventsFiltered.length || 0) > 0 ? (
                    <>
                      {leftOff && (
                        <div className="mt-3 mb-2 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 px-2 py-1 font-semibold">
                            Left off at:{" "}
                            <span className="text-amber-900">{leftOff}</span>
                            {journey.flowName ? (
                              <span className="text-amber-700">
                                &nbsp;in{" "}
                                <span className="font-bold">
                                  {journey.flowName}
                                </span>
                              </span>
                            ) : null}
                          </span>
                        </div>
                      )}

                      <div className="relative ml-3 py-3">
                        <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" />
                        <div className="space-y-3">
                          {eventsVisible.map((event, idx) => (
                            <JourneyEvent
                              key={idx}
                              isCurrent={
                                leftOff && event?.title?.includes(leftOff)
                              }
                              event={event}
                            />
                          ))}
                        </div>
                      </div>

                      {eventsFiltered.length > COLLAPSE_AFTER && (
                        <div className="flex justify-center pt-2 pb-4">
                          <button
                            onClick={() => setExpanded(v => !v)}
                            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                          >
                            {expanded
                              ? "Show less"
                              : `Show ${
                                  eventsFiltered.length - COLLAPSE_AFTER
                                } more events`}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No journey events found for this message.
                    </p>
                  )}
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 px-6 pt-2 pb-4 flex justify-end gap-3 border-t border-gray-200">
                  <button
                    onClick={onClose}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm font-semibold"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

const JourneyEvent = ({ event, isCurrent }) => {
  const icon = ICONS[event.eventType] || (
    <Hourglass size={16} className="text-white" />
  );
  const color = COLORS[event.eventType] || "bg-gray-400";

  const handleCopy = () => {
    if (event.url) navigator.clipboard?.writeText(event.url);
  };

  const isClickable = Boolean(event.url);
  const shouldShowDetails = !(
    event.eventType === "ButtonClicked" || event.eventType === "Redirect"
  );

  return (
    <div className="relative pl-6">
      <div
        className={`absolute -left-3 top-1 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-white ${color} ${
          isCurrent ? "scale-110 shadow-lg" : ""
        }`}
      >
        {icon}
      </div>

      <div
        className={`rounded-lg p-1.5 ${
          isCurrent ? "bg-amber-50 border border-amber-200" : "bg-white"
        }`}
      >
        <p className="font-semibold text-gray-800">{event.title}</p>

        {shouldShowDetails && event.details && (
          <p className="text-sm text-gray-600 break-words">{event.details}</p>
        )}

        {isClickable && (
          <p className="mt-1">
            <a
              className="inline-flex items-center gap-1 text-blue-700 underline underline-offset-2"
              href={event.url}
              target="_blank"
              rel="noreferrer"
              title={event.url}
            >
              <Link2 size={14} />
              {displayUrl(event.url)}
            </a>
            <button
              onClick={handleCopy}
              className="ml-2 inline-flex items-center gap-1 text-gray-500 hover:text-gray-700"
              title="Copy URL"
            >
              <Copy size={14} />
              <span className="text-xs">Copy</span>
            </button>
          </p>
        )}

        <p className="text-xs text-gray-400 mt-1">
          {formatDate(event.timestamp)} | {relTime(event.timestamp)}
        </p>
      </div>
    </div>
  );
};

export default ContactJourneyModal;
