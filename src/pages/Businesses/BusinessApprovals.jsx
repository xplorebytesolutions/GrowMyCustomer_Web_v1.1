// 📄 src/pages/Businesses/BusinessApprovals.jsx
import { useEffect, useState } from "react";
import { Check, XCircle, PauseCircle } from "lucide-react";
import { confirmAlert } from "react-confirm-alert";
import { toast } from "react-toastify";
import { Navigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";

import { useAuth } from "../../app/providers/AuthProvider";
import "react-confirm-alert/src/react-confirm-alert.css";

// MVP: only admins may view this page (partners/reviewers later)
const allowedRoles = ["admin", "superadmin"];

export default function BusinessApprovals() {
  const {
    isLoading: authLoading,
    role: ctxRole = "",
    hasAllAccess,
  } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingIds, setLoadingIds] = useState({});
  const [unauthorized, setUnauthorized] = useState(false);

  const role = String(ctxRole || "").toLowerCase();

  useEffect(() => {
    // Wait for auth to initialize
    if (authLoading) return;

    // Superadmin override, else role must be allowed
    if (!hasAllAccess && !allowedRoles.includes(role)) {
      setUnauthorized(true);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError("");

    axiosClient
      .get("/businesses/pending", { withCredentials: true })
      .then(({ data: res }) => {
        if (!isMounted) return;
        if (res?.success && Array.isArray(res?.data)) {
          setBusinesses(res.data);
        } else {
          setBusinesses([]);
        }
      })
      .catch(err => {
        if (!isMounted) return;
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          setUnauthorized(true);
        } else {
          setError(
            err?.response?.data?.message ||
              err.message ||
              "Failed to fetch businesses"
          );
        }
      })
      .finally(() => isMounted && setLoading(false));

    return () => {
      isMounted = false;
    };
  }, [authLoading, hasAllAccess, role]);

  if (authLoading) {
    // Stable placeholder while auth initializes
    return (
      <div
        data-test-id="business-approvals-auth-loading"
        aria-busy="true"
        style={{ display: "none" }}
      />
    );
  }

  if (unauthorized) return <Navigate to="/no-access" replace />; // ✅ correct route

  const confirmAction = (action, handler) => {
    confirmAlert({
      title: `Confirm ${action}`,
      message: `Are you sure you want to ${action.toLowerCase()} this business?`,
      buttons: [
        { label: "Yes", onClick: handler },
        { label: "No", onClick: () => {} },
      ],
    });
  };

  const handleStatusChange = (id, status) => {
    setLoadingIds(prev => ({ ...prev, [id]: true }));

    axiosClient
      .post(`/businesses/${status.toLowerCase()}/${id}`, null, {
        withCredentials: true,
      })
      .then(() => {
        toast.success(`✅ Business ${status}d successfully`);
        setBusinesses(prev => prev.filter(b => b.businessId !== id));
      })
      .catch(err => {
        const statusCode = err?.response?.status;
        if (statusCode === 401 || statusCode === 403) setUnauthorized(true);
        const msg =
          err?.response?.data?.message ||
          err.message ||
          `Failed to ${status} business`;
        toast.error(msg);
      })
      .finally(() =>
        setLoadingIds(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        })
      );
  };

  return (
    <div className="p-6 space-y-6 bg-[#f5f6f7] min-h-[calc(100vh-80px)]">
      {/* 🔰 Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-lg shadow">
        <div>
          <h1 className="text-2xl font-bold text-purple-800 mb-1">
            Pending Businesses
          </h1>
          <p className="text-sm text-gray-500">
            Review, Approve or Reject newly signed up businesses.
          </p>
        </div>
      </div>

      {/* 🔄 Loading/Error */}
      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">❌ {error}</p>}

      {/* 📋 Business Table */}
      {!loading && businesses.length === 0 && (
        <div className="bg-white p-6 rounded-lg text-center shadow text-gray-500">
          No pending businesses found.
        </div>
      )}

      {!loading && businesses.length > 0 && (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Company</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Contact</th>
                <th className="p-3 text-left">Plan</th>
                <th className="p-3 text-left">Created At</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {businesses.map(b => (
                <tr key={b.businessId} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{b.companyName}</td>
                  <td className="p-3">{b.businessEmail}</td>
                  <td className="p-3">
                    {b.representativeName || "—"}
                    <br />
                    {b.phone || ""}
                  </td>
                  <td className="p-3 capitalize">{b.plan}</td>
                  <td className="p-3">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 flex flex-wrap gap-2 justify-center">
                    {/* ✅ Soft buttons */}
                    <button
                      disabled={!!loadingIds[b.businessId]}
                      onClick={() =>
                        confirmAction("Approve", () =>
                          handleStatusChange(b.businessId, "approve")
                        )
                      }
                      className="flex items-center gap-1 bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 px-3 py-1 rounded-md text-xs disabled:opacity-50"
                    >
                      <Check size={14} /> Approve
                    </button>

                    <button
                      disabled={!!loadingIds[b.businessId]}
                      onClick={() =>
                        confirmAction("Reject", () =>
                          handleStatusChange(b.businessId, "reject")
                        )
                      }
                      className="flex items-center gap-1 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 px-3 py-1 rounded-md text-xs disabled:opacity-50"
                    >
                      <XCircle size={14} /> Reject
                    </button>

                    <button
                      disabled={!!loadingIds[b.businessId]}
                      onClick={() =>
                        confirmAction("Hold", () =>
                          handleStatusChange(b.businessId, "hold")
                        )
                      }
                      className="flex items-center gap-1 bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200 px-3 py-1 rounded-md text-xs disabled:opacity-50"
                    >
                      <PauseCircle size={14} /> Hold
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// import { useEffect, useState } from "react";
// import { Check, XCircle, PauseCircle } from "lucide-react";
// import { confirmAlert } from "react-confirm-alert";
// import { toast } from "react-toastify";
// import { Navigate } from "react-router-dom";
// import "react-confirm-alert/src/react-confirm-alert.css";

// const allowedRoles = ["admin", "superadmin", "partner", "reviewer"];

// export default function BusinessApprovals() {
//   const [businesses, setBusinesses] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [loadingIds, setLoadingIds] = useState({});
//   const [unauthorized, setUnauthorized] = useState(false);

//   const role = localStorage.getItem("role") || "";

//   useEffect(() => {
//     if (!allowedRoles.includes(role)) {
//       setUnauthorized(true);
//       return;
//     }

//     fetch(`${process.env.REACT_APP_API_BASE_URL}/businesses/pending`, {
//       credentials: "include",
//     })
//       .then(res => {
//         if (!res.ok) throw new Error("Failed to fetch businesses");
//         return res.json();
//       })
//       .then(res => {
//         if (res.success && Array.isArray(res.data)) {
//           setBusinesses(res.data);
//         } else {
//           setBusinesses([]);
//         }
//       })
//       .catch(err => setError(err.message))
//       .finally(() => setLoading(false));
//   }, [role]);

//   if (unauthorized) return <Navigate to="/app/no-access" />;

//   const confirmAction = (action, handler) => {
//     confirmAlert({
//       title: `Confirm ${action}`,
//       message: `Are you sure you want to ${action.toLowerCase()} this business?`,
//       buttons: [
//         { label: "Yes", onClick: handler },
//         { label: "No", onClick: () => {} },
//       ],
//     });
//   };

//   const handleStatusChange = (id, status) => {
//     setLoadingIds(prev => ({ ...prev, [id]: true }));

//     fetch(
//       `${
//         process.env.REACT_APP_API_BASE_URL
//       }/businesses/${status.toLowerCase()}/${id}`,
//       {
//         method: "POST",
//         credentials: "include",
//       }
//     )
//       .then(res => {
//         if (!res.ok) throw new Error(`Failed to ${status} business`);
//         return res.json();
//       })
//       .then(() => {
//         toast.success(`✅ Business ${status}d successfully`);
//         setBusinesses(prev => prev.filter(b => b.businessId !== id));
//       })
//       .catch(err => {
//         console.error(err);
//         toast.error(err.message);
//       })
//       .finally(() =>
//         setLoadingIds(prev => {
//           const copy = { ...prev };
//           delete copy[id];
//           return copy;
//         })
//       );
//   };

//   return (
//     <div className="p-6 space-y-6">
//       {/* 🔰 Page Header */}
//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-lg shadow">
//         <div>
//           <h1 className="text-2xl font-bold text-purple-800 mb-1">
//             Pending Businesses
//           </h1>
//           <p className="text-sm text-gray-500">
//             Review, Approve or Reject newly signed up businesses.
//           </p>
//         </div>
//       </div>

//       {/* 🔄 Loading/Error */}
//       {loading && <p className="text-sm text-gray-500">Loading...</p>}
//       {error && <p className="text-sm text-red-600">❌ {error}</p>}

//       {/* 📋 Business Table */}
//       {!loading && businesses.length === 0 && (
//         <div className="bg-white p-6 rounded-lg text-center shadow text-gray-500">
//           No pending businesses found.
//         </div>
//       )}

//       {!loading && businesses.length > 0 && (
//         <div className="overflow-x-auto bg-white rounded-lg shadow">
//           <table className="w-full text-sm">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="p-3 text-left">Company</th>
//                 <th className="p-3 text-left">Email</th>
//                 <th className="p-3 text-left">Contact</th>
//                 <th className="p-3 text-left">Plan</th>
//                 <th className="p-3 text-left">Created At</th>
//                 <th className="p-3 text-center">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {businesses.map(b => (
//                 <tr key={b.businessId} className="border-t hover:bg-gray-50">
//                   <td className="p-3 font-medium">{b.companyName}</td>
//                   <td className="p-3">{b.businessEmail}</td>
//                   <td className="p-3">
//                     {b.representativeName || "—"}
//                     <br />
//                     {b.phone || ""}
//                   </td>
//                   <td className="p-3 capitalize">{b.plan}</td>
//                   <td className="p-3">
//                     {new Date(b.createdAt).toLocaleDateString()}
//                   </td>
//                   <td className="p-3 flex flex-wrap gap-2 justify-center">
//                     {/* ✅ Soft buttons */}
//                     <button
//                       disabled={loadingIds[b.businessId]}
//                       onClick={() =>
//                         confirmAction("Approve", () =>
//                           handleStatusChange(b.businessId, "approve")
//                         )
//                       }
//                       className="flex items-center gap-1 bg-green-100 text-green-700 border border-green-300 hover:bg-green-200 px-3 py-1 rounded-md text-xs disabled:opacity-50"
//                     >
//                       <Check size={14} /> Approve
//                     </button>

//                     <button
//                       disabled={loadingIds[b.businessId]}
//                       onClick={() =>
//                         confirmAction("Reject", () =>
//                           handleStatusChange(b.businessId, "reject")
//                         )
//                       }
//                       className="flex items-center gap-1 bg-red-100 text-red-700 border border-red-300 hover:bg-red-200 px-3 py-1 rounded-md text-xs disabled:opacity-50"
//                     >
//                       <XCircle size={14} /> Reject
//                     </button>

//                     <button
//                       disabled={loadingIds[b.businessId]}
//                       onClick={() =>
//                         confirmAction("Hold", () =>
//                           handleStatusChange(b.businessId, "hold")
//                         )
//                       }
//                       className="flex items-center gap-1 bg-yellow-100 text-yellow-700 border border-yellow-300 hover:bg-yellow-200 px-3 py-1 rounded-md text-xs disabled:opacity-50"
//                     >
//                       <PauseCircle size={14} /> Hold
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );
// }
