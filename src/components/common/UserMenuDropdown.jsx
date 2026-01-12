// 📄 src/components/common/UserMenuDropdown.jsx

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut, Rocket, ShieldCheck, Lock, Terminal, UserCog } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";

export default function UserMenuDropdown({ currentPlan }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const { userName: ctxUserName, logout } = useAuth();

  // Prefer AuthProvider userName, fall back to old localStorage value
  const storedUserName = localStorage.getItem("userName") || "User";
  const displayName = ctxUserName || storedUserName;

  const userAvatar =
    localStorage.getItem("userAvatar") ||
    "/user_avatar_premium.png";

  // Use passed prop, or fallback to localStorage, or default "basic"
  const rawPlan = currentPlan || localStorage.getItem("plan") || "basic";
  // Capitalize for display (e.g. "basic" -> "Basic")
  const plan = rawPlan.charAt(0).toUpperCase() + rawPlan.slice(1);

  // ✅ Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleUpgrade = () => {
    setOpen(false);
    navigate("/app/upgrade");
  };

  const handleSecurity = () => {
    setOpen(false);
    navigate("/app/settings/password");
  };

  const handleApiSetup = () => {
    setOpen(false);
    navigate("/app/settings/whatsapp");
  };

  const handleProfileUpdate = () => {
    setOpen(false);
    navigate("/app/settings/profile-completion");
  };

  // const handleProfileSettings = () => {
  //   setOpen(false);
  //   // Go to profile/settings page inside app shell
  //   navigate("/app/settings/profile");
  // };

  // ✅ Smart logout: use AuthProvider.logout, NO redirectTo leak
  const handleLogout = () => {
    setOpen(false);

    const currentPath =
      (location.pathname || "") +
      (location.search || "") +
      (location.hash || "");

    // For debugging if ever needed
    // console.log("[Logout] from path:", currentPath);

    try {
      // Central logout: clears token, legacy auth keys, auth state, entitlements
      logout();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[UserMenuDropdown] logout() failed", err);
    }

    // Optional: clear per-user UI preferences
    try {
      localStorage.removeItem("messaging-pinned");
      localStorage.removeItem("messaging-archived");
      localStorage.removeItem("messaging-order");
    } catch {
      // ignore
    }

    // Manual logout → clean login page (no redirectTo),
    // so next user does NOT inherit previous user’s target page.
    navigate("/login");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-2"
      >
        <img
          src={userAvatar}
          alt="User Avatar"
          className="w-9 h-9 rounded-full border border-gray-300 shadow-sm"
        />
        <ChevronDown size={16} className="text-gray-600 hidden sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50 animate-fadeIn">
          <div className="px-4 py-3 border-b">
            <p className="text-sm font-medium text-gray-800">{displayName}</p>
            <p className="text-xs text-gray-400">Plan: {plan}</p>
          </div>
          <ul className="py-1 text-sm text-gray-700">
            <li>
              <button
                onClick={handleProfileUpdate}
                className="w-full flex items-center px-4 py-2 hover:bg-emerald-50 group"
              >
                <UserCog size={16} className="mr-2 text-indigo-500 transition-transform group-hover:scale-110" />
                Profile Update
              </button>
            </li>
            <li>
              <button
                onClick={handleSecurity}
                className="w-full flex items-center px-4 py-2 hover:bg-emerald-50 group"
              >
                <Lock size={16} className="mr-2 text-sapphire-600 transition-transform group-hover:scale-110" />
                Change Password
              </button>
            </li>
            <li>
              <button
                onClick={handleApiSetup}
                className="w-full flex items-center px-4 py-2 hover:bg-emerald-50 group"
              >
                <Terminal size={16} className="mr-2 text-amber-600 transition-transform group-hover:scale-110" />
                Manual Api Setup
              </button>
            </li>
            <li>
              <button
                onClick={handleUpgrade}
                className="w-full flex items-center px-4 py-2 hover:bg-emerald-50 group"
              >
                <Rocket size={16} className="mr-2 text-emerald-600 transition-transform group-hover:scale-110" />
                Upgrade Plan
              </button>
            </li>
            {/* <li>
              <button
                onClick={handleProfileSettings}
                className="w-full flex items-center px-4 py-2 hover:bg-purple-50"
              >
                <ShieldCheck size={16} className="mr-2 text-indigo-500" />
                Profile Settings
              </button>
            </li> */}
            <li>
              <button
                onClick={handleLogout}
                className="w-full flex items-center px-4 py-2 hover:bg-red-50 text-red-600"
              >
                <LogOut size={16} className="mr-2" />
                Logout
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

// // src/components/common/UserMenuDropdown.jsx

// import { useState, useRef, useEffect } from "react";
// import { ChevronDown, LogOut, Rocket, ShieldCheck } from "lucide-react";
// import { useNavigate, useLocation } from "react-router-dom";

// export default function UserMenuDropdown() {
//   const [open, setOpen] = useState(false);
//   const menuRef = useRef();
//   const navigate = useNavigate();
//   const location = useLocation(); // ✅ Current page path

//   const userName = localStorage.getItem("userName") || "User";
//   const userAvatar =
//     localStorage.getItem("userAvatar") ||
//     "https://randomuser.me/api/portraits/men/75.jpg";
//   const plan = localStorage.getItem("plan") || "basic";

//   // ✅ Close dropdown when clicked outside
//   useEffect(() => {
//     const handleClickOutside = e => {
//       if (menuRef.current && !menuRef.current.contains(e.target)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   // ✅ Smart Logout with redirectTo param
//   const handleLogout = () => {
//     const currentPath = location.pathname + location.search;

//     // 🔐 Only clear auth-related keys, not app preferences
//     localStorage.removeItem("xbytechat-auth");
//     localStorage.removeItem("accessToken");
//     localStorage.removeItem("role");
//     localStorage.removeItem("plan");
//     localStorage.removeItem("businessId");
//     localStorage.removeItem("companyName");
//     localStorage.removeItem("xbytechat-auth-data");

//     // Redirect with preserved target
//     navigate(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
//   };

//   return (
//     <div className="relative" ref={menuRef}>
//       <button
//         onClick={() => setOpen(prev => !prev)}
//         className="flex items-center gap-2"
//       >
//         <img
//           src={userAvatar}
//           alt="User Avatar"
//           className="w-9 h-9 rounded-full border border-gray-300 shadow-sm"
//         />
//         <ChevronDown size={16} className="text-gray-600 hidden sm:block" />
//       </button>

//       {open && (
//         <div className="absolute right-0 mt-2 w-56 bg-white border rounded-lg shadow-lg z-50 animate-fadeIn">
//           <div className="px-4 py-3 border-b">
//             <p className="text-sm font-medium text-gray-800">{userName}</p>
//             <p className="text-xs text-gray-400">Plan: {plan}</p>
//           </div>
//           <ul className="py-1 text-sm text-gray-700">
//             <li>
//               <button
//                 onClick={() => navigate("/plans/upgrade")}
//                 className="w-full flex items-center px-4 py-2 hover:bg-purple-50"
//               >
//                 <Rocket size={16} className="mr-2 text-purple-600" />
//                 Upgrade Plan
//               </button>
//             </li>
//             <li>
//               <button
//                 onClick={() => navigate("/dashboard/profile-completion")}
//                 className="w-full flex items-center px-4 py-2 hover:bg-purple-50"
//               >
//                 <ShieldCheck size={16} className="mr-2 text-indigo-500" />
//                 Profile Settings
//               </button>
//             </li>
//             <li>
//               <button
//                 onClick={handleLogout}
//                 className="w-full flex items-center px-4 py-2 hover:bg-red-50 text-red-600"
//               >
//                 <LogOut size={16} className="mr-2" />
//                 Logout
//               </button>
//             </li>
//           </ul>
//         </div>
//       )}
//     </div>
//   );
// }
