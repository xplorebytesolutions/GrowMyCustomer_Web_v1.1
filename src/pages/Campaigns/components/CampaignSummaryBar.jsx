import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Send,
  CheckCircle2,
  Eye,
  XCircle,
  MousePointerClick,
} from "lucide-react";

function CampaignSummaryBar({ summary }) {
  if (!summary) {
    return (
      <div className="bg-white border rounded-lg shadow-sm p-4 mb-4">
        <p className="text-gray-500">Loading summary...</p>
      </div>
    );
  }

  // --- Calculations for Rates ---
  const deliveryRate =
    summary.sent > 0 // Use 'sent' as the base for delivery rate
      ? ((summary.delivered / summary.sent) * 100).toFixed(1)
      : 0;
  const readRate =
    summary.delivered > 0
      ? ((summary.read / summary.delivered) * 100).toFixed(1)
      : 0;

  // --- Data for the Chart ---
  const chartData = [
    { name: "Read", value: summary.read || 0 },
    {
      name: "Delivered (Unread)",
      value: (summary.delivered || 0) - (summary.read || 0),
    },
    // Show 'Sent' but not yet delivered
    {
      name: "Sent (Pending Delivery)",
      value:
        (summary.sent || 0) -
        (summary.delivered || 0) -
        (summary.failedCount || 0),
    },
    { name: "Failed", value: summary.failedCount || 0 },
  ];
  const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"]; // Green, Blue, Amber, Red

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
        <KpiCard
          title="Total Recipients"
          value={summary.totalSent || 0} // This is the total number of messages attempted
          icon={<Send size={40} />}
          gradient="from-slate-500 to-slate-600"
        />
        {/* NEW "Sent" CARD */}
        <KpiCard
          title="Sent"
          value={summary.sent || 0}
          subText="Successfully sent to provider"
          icon={<Send size={40} />}
          gradient="from-emerald-500 to-teal-600"
          decoration="wave"
        />
        <KpiCard
          title="Delivered"
          value={summary.delivered || 0}
          subText={`${deliveryRate}% Delivery Rate`}
          icon={<CheckCircle2 size={40} />}
          gradient="from-emerald-600 to-cyan-600"
          decoration="graph"
        />
        <KpiCard
          title="Read"
          value={summary.read || 0}
          subText={`${readRate}% Read Rate`}
          icon={<Eye size={40} />}
          gradient="from-blue-400 to-cyan-500"
          decoration="bars"
        />
        <KpiCard
          title="Failed"
          value={summary.failedCount || 0}
          subText="Could not be sent"
          icon={<XCircle size={40} />}
          gradient="from-orange-400 to-red-500"
        />
        <KpiCard
          title="Clicked"
          value={summary.clickedCount || 0}
          icon={<MousePointerClick size={40} />}
          gradient="from-green-400 to-teal-500"
        />
      </div>

      {/* Chart Section */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center items-center">
        <h3 className="font-semibold text-gray-700 mb-2">
          Message Status Funnel
        </h3>
        <div className="w-full h-48 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData.filter(d => d.value > 0)}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                fill="#8884d8"
                paddingAngle={5}
              >
                {chartData
                  .filter(d => d.value > 0)
                  .map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[chartData.indexOf(entry)]}
                    />
                  ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
// A new, redesigned component for the KPI cards to match your example
const KpiCard = ({
  icon,
  title,
  value,
  subText = null,
  gradient,
  decoration = null,
}) => {
  const decorations = {
    wave: (
      <svg
        className="absolute bottom-0 left-0 w-full h-16 text-white opacity-10"
        fill="currentColor"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path d="M0,50 C25,100 75,0 100,50 L100,100 L0,100 Z" />
      </svg>
    ),
    graph: (
      <svg
        className="absolute bottom-0 right-0 h-20 text-white opacity-10"
        fill="none"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M0 80 C20 40, 40 90, 60 50, 80 10, 100 60"
          stroke="currentColor"
          strokeWidth="4"
        />
      </svg>
    ),
    bars: (
      <svg
        className="absolute bottom-0 right-4 h-16 text-white opacity-10"
        fill="currentColor"
        viewBox="0 0 50 100"
        preserveAspectRatio="none"
      >
        <rect x="0" y="60" width="8" height="40" />
        <rect x="12" y="40" width="8" height="60" />
        <rect x="24" y="20" width="8" height="80" />
        <rect x="36" y="50" width="8" height="50" />
      </svg>
    ),
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl shadow-lg p-5 text-white bg-gradient-to-r ${gradient}`}
    >
      {decoration && decorations[decoration]}
      <div className="relative flex items-center gap-5">
        <div className="opacity-80">{icon}</div>
        <div className="flex-grow">
          <p className="text-sm font-medium text-white/80">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subText && <p className="text-xs text-white/70">{subText}</p>}
        </div>
      </div>
    </div>
  );
};

export default CampaignSummaryBar;

// import React from "react";
// import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
// import {
//   Send,
//   CheckCircle2,
//   Eye,
//   XCircle,
//   MousePointerClick,
// } from "lucide-react"; // Modern icons

// function CampaignSummaryBar({ summary }) {
//   if (!summary) {
//     return (
//       <div className="bg-white border rounded-lg shadow-sm p-4 mb-4">
//         <p className="text-gray-500">Loading summary...</p>
//       </div>
//     );
//   }

//   // --- Calculations for Rates ---
//   const deliveryRate =
//     summary.totalSent > 0
//       ? ((summary.delivered / summary.totalSent) * 100).toFixed(1)
//       : 0;
//   const readRate =
//     summary.delivered > 0
//       ? ((summary.read / summary.delivered) * 100).toFixed(1)
//       : 0;
//   const clickRate =
//     summary.delivered > 0
//       ? ((summary.clickedCount / summary.delivered) * 100).toFixed(1)
//       : 0;

//   // --- Data for the Chart ---
//   const chartData = [
//     { name: "Read", value: summary.read || 0 },
//     {
//       name: "Delivered (Not Read)",
//       value: (summary.delivered || 0) - (summary.read || 0),
//     },
//     { name: "Failed", value: summary.failedCount || 0 },
//   ];
//   const COLORS = ["#10B981", "#3B82F6", "#EF4444"]; // Emerald, Blue, Red

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
//       {/* KPI Cards Section */}
//       <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
//         {/* Total Sent Card */}
//         <KpiCard
//           icon={<Send size={24} className="text-gray-400" />}
//           title="Total Sent"
//           value={summary.totalSent || 0}
//         />

//         {/* Delivered Card */}
//         <KpiCard
//           icon={<CheckCircle2 size={24} className="text-blue-500" />}
//           title="Delivered"
//           value={summary.delivered || 0}
//           subText={`${deliveryRate}% Delivery Rate`}
//         />

//         {/* Read Card */}
//         <KpiCard
//           icon={<Eye size={24} className="text-emerald-500" />}
//           title="Read"
//           value={summary.read || 0}
//           subText={`${readRate}% Read Rate`}
//         />

//         {/* Failed Card */}
//         <KpiCard
//           icon={<XCircle size={24} className="text-red-500" />}
//           title="Failed"
//           value={summary.failedCount || 0}
//         />

//         {/* Clicked Card */}
//         <KpiCard
//           icon={<MousePointerClick size={24} className="text-pink-500" />}
//           title="Clicked"
//           value={summary.clickedCount || 0}
//           subText={`${clickRate}% Click Rate`}
//         />
//       </div>

//       {/* Chart Section */}
//       <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center items-center">
//         <h3 className="font-semibold text-gray-700 mb-2">Delivery Funnel</h3>
//         <div className="w-full h-48 relative">
//           <ResponsiveContainer width="100%" height="100%">
//             <PieChart>
//               <Pie
//                 data={chartData}
//                 dataKey="value"
//                 nameKey="name"
//                 cx="50%"
//                 cy="50%"
//                 innerRadius={50}
//                 outerRadius={70}
//                 fill="#8884d8"
//                 paddingAngle={5}
//               >
//                 {chartData.map((entry, index) => (
//                   <Cell
//                     key={`cell-${index}`}
//                     fill={COLORS[index % COLORS.length]}
//                   />
//                 ))}
//               </Pie>
//               <Tooltip formatter={(value, name) => [value, name]} />
//             </PieChart>
//           </ResponsiveContainer>
//           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
//             <span className="text-3xl font-bold text-gray-800">
//               {deliveryRate}%
//             </span>
//             <span className="text-sm text-gray-500">Delivered</span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // A reusable component for the KPI cards to keep the main component clean
// const KpiCard = ({ icon, title, value, subText = null }) => (
//   <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
//     <div className="flex items-center gap-4">
//       {icon}
//       <div>
//         <p className="text-gray-500 text-sm font-medium">{title}</p>
//         <p className="text-2xl font-bold text-gray-800">{value}</p>
//         {subText && <p className="text-xs text-gray-400">{subText}</p>}
//       </div>
//     </div>
//   </div>
// );

// export default CampaignSummaryBar;

// import React from "react";
// import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
// import {
//   Send,
//   CheckCircle2,
//   Eye,
//   XCircle,
//   MousePointerClick,
// } from "lucide-react";

// function CampaignSummaryBar({ summary }) {
//   if (!summary) {
//     return (
//       <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6 text-center text-slate-400">
//         Loading Summary...
//       </div>
//     );
//   }

//   // --- Calculations for Rates ---
//   const deliveryRate =
//     summary.totalSent > 0 ? (summary.delivered / summary.totalSent) * 100 : 0;
//   const readRate =
//     summary.delivered > 0 ? (summary.read / summary.delivered) * 100 : 0;
//   const failureRate =
//     summary.totalSent > 0 ? (summary.failedCount / summary.totalSent) * 100 : 0;

//   // --- Data for the Chart ---
//   const chartData = [
//     { name: "Read", value: summary.read || 0 },
//     {
//       name: "Delivered",
//       value: (summary.delivered || 0) - (summary.read || 0),
//     },
//     { name: "Failed", value: summary.failedCount || 0 },
//   ];
//   // Vibrant, neon-like colors for the dark theme
//   const COLORS = ["#22d3ee", "#38bdf8", "#fb7185"]; // Cyan, Sky Blue, Rose

//   return (
//     <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800/80 mb-6">
//       <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
//         {/* KPI Cards Section */}
//         <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
//           <KpiCard
//             title="Total Sent"
//             value={summary.totalSent || 0}
//             icon={<Send />}
//             gradient="from-slate-700 to-slate-800"
//           />
//           <KpiCard
//             title="Delivered"
//             value={summary.delivered || 0}
//             subText={`${deliveryRate.toFixed(1)}% Delivery Rate`}
//             icon={<CheckCircle2 />}
//             gradient="from-blue-500 to-cyan-500"
//           />
//           <KpiCard
//             title="Read"
//             value={summary.read || 0}
//             subText={`${readRate.toFixed(1)}% Read Rate`}
//             icon={<Eye />}
//             gradient="from-emerald-500 to-green-500"
//           />
//           <KpiCard
//             title="Failed"
//             value={summary.failedCount || 0}
//             subText={`${failureRate.toFixed(1)}% Failure Rate`}
//             icon={<XCircle />}
//             gradient="from-rose-500 to-red-600"
//           />
//           <KpiCard
//             title="Clicked"
//             value={summary.clickedCount || 0}
//             icon={<MousePointerClick />}
//             gradient="from-violet-500 to-fuchsia-500"
//           />
//         </div>

//         {/* Central Chart Section */}
//         <div className="lg:col-span-4 flex flex-col items-center justify-center p-4 bg-slate-800/50 backdrop-blur-sm border border-slate-700/80 rounded-xl h-full">
//           <h3 className="font-semibold text-slate-300 text-base mb-2">
//             Delivery Status
//           </h3>
//           <div
//             className="w-full h-48"
//             style={{ filter: `drop-shadow(0 0 12px ${COLORS[1]}40)` }}
//           >
//             <ResponsiveContainer width="100%" height="100%">
//               <PieChart>
//                 <Pie
//                   data={chartData}
//                   dataKey="value"
//                   nameKey="name"
//                   cx="50%"
//                   cy="50%"
//                   innerRadius={60}
//                   outerRadius={75}
//                   fill="#8884d8"
//                   paddingAngle={5}
//                 >
//                   {chartData.map((entry, index) => (
//                     <Cell
//                       key={`cell-${index}`}
//                       fill={COLORS[index % COLORS.length]}
//                       stroke={COLORS[index % COLORS.length]}
//                     />
//                   ))}
//                 </Pie>
//                 <Tooltip
//                   cursor={false}
//                   contentStyle={{
//                     background: "rgba(20, 30, 48, 0.8)",
//                     backdropFilter: "blur(4px)",
//                     border: "1px solid rgba(255,255,255,0.1)",
//                     borderRadius: "0.75rem",
//                     color: "#fff",
//                   }}
//                 />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // A new, redesigned component for the gradient KPI cards
// const KpiCard = ({ title, value, subText, icon, gradient }) => (
//   <div
//     className={`bg-gradient-to-br ${gradient} p-5 rounded-xl shadow-lg text-white relative overflow-hidden`}
//   >
//     <div className="flex justify-between items-start">
//       <div className="flex flex-col">
//         <p className="text-sm font-medium text-white/80">{title}</p>
//         <span className="text-4xl font-bold tracking-tight mt-1">{value}</span>
//       </div>
//       <div className="opacity-70">{React.cloneElement(icon, { size: 24 })}</div>
//     </div>
//     {subText && <p className="text-xs text-white/70 mt-2">{subText}</p>}
//   </div>
// );

// export default CampaignSummaryBar;

// import React from "react";
// import {
//   PieChart,
//   Pie,
//   Cell,
//   ResponsiveContainer,
//   Legend,
//   Tooltip,
// } from "recharts";

// function CampaignSummaryBar({ summary }) {
//   if (!summary) {
//     return (
//       <div className="bg-white border rounded-md shadow p-4 mb-4">
//         <p className="text-gray-500">Loading summary...</p>
//       </div>
//     );
//   }

//   const chartData = [
//     { name: "Read", value: summary.read || 0 },
//     {
//       name: "Delivered (Not Read)",
//       value: (summary.delivered || 0) - (summary.read || 0),
//     },
//     { name: "Failed", value: summary.failedCount || 0 },
//   ];
//   const COLORS = ["#00C49F", "#0088FE", "#FF8042"];

//   const formatDate = datetime =>
//     datetime ? new Date(datetime).toLocaleString() : "-";

//   return (
//     <div className="bg-white border rounded-md shadow p-4 mb-4">
//       <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
//         {/* KPI Section */}
//         <div className="lg:col-span-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-sm text-gray-800">
//           <div>
//             <p className="font-semibold text-purple-700">📬 Total Sent</p>
//             <p className="text-2xl font-bold">{summary.totalSent || 0}</p>
//           </div>
//           <div>
//             <p className="font-semibold text-blue-600">🚚 Delivered</p>
//             <p className="text-2xl font-bold">{summary.delivered || 0}</p>
//           </div>
//           <div>
//             <p className="font-semibold text-teal-600">👀 Read</p>
//             <p className="text-2xl font-bold">{summary.read || 0}</p>
//           </div>
//           <div>
//             <p className="font-semibold text-red-600">❌ Failed</p>
//             <p className="text-2xl font-bold">{summary.failedCount || 0}</p>
//           </div>
//           <div>
//             <p className="font-semibold text-green-700">✅ Clicked</p>
//             <p className="text-2xl font-bold">{summary.clickedCount || 0}</p>
//           </div>
//         </div>
//         {/* Chart Section */}
//         <div className="col-span-2 h-48">
//           <ResponsiveContainer width="100%" height="100%">
//             <PieChart>
//               <Pie
//                 data={chartData}
//                 dataKey="value"
//                 nameKey="name"
//                 cx="50%"
//                 cy="50%"
//                 innerRadius={40}
//                 outerRadius={60}
//                 fill="#8884d8"
//               >
//                 {chartData.map((entry, index) => (
//                   <Cell
//                     key={`cell-${index}`}
//                     fill={COLORS[index % COLORS.length]}
//                   />
//                 ))}
//               </Pie>
//               <Tooltip />
//               <Legend iconSize={10} />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default CampaignSummaryBar;
// import React from "react";

// function CampaignSummaryBar({ summary }) {
//   if (!summary) return null;

//   const formatDate = datetime =>
//     datetime ? new Date(datetime).toLocaleString() : "-";

//   return (
//     <div className="bg-white border rounded-md shadow p-4 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-800">
//       <div>
//         <p className="font-semibold text-purple-700">📬 Total Sent</p>
//         <p>{summary.totalSent}</p>
//       </div>
//       <div>
//         <p className="font-semibold text-red-600">❌ Failed</p>
//         <p>{summary.failedCount}</p>
//       </div>
//       <div>
//         <p className="font-semibold text-green-700">✅ Clicked</p>
//         <p>{summary.clickedCount}</p>
//       </div>
//       <div>
//         <p className="font-semibold text-blue-600">🕒 Last Sent</p>
//         <p>{formatDate(summary.lastSentAt)}</p>
//       </div>
//     </div>
//   );
// }

// export default CampaignSummaryBar;
