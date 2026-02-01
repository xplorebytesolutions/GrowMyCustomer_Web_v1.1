import React from "react";
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { 
  Library, 
  ListChecks, 
  FileBarChart,
  ChevronLeft,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Plus
} from "lucide-react";
import { toast } from "react-toastify";
import axiosClient from "../../api/axiosClient";
import { useAuth } from "../../app/providers/AuthProvider";

const tabs = [
  { label: "Approved", to: "/app/template-builder/approved", icon: <FileBarChart size={16} />, key: "approved" },
  { label: "Library", to: "/app/template-builder/library", icon: <Library size={16} />, key: "library" },
  { label: "Drafts", to: "/app/template-builder/drafts", icon: <ListChecks size={16} />, key: "drafts" },
  { label: "Pending", to: "/app/template-builder/pending", icon: <Clock size={16} />, key: "pending" },
];

export default function TemplateBuilderLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { effectiveBusinessId, businessId: ctxBusinessId } = useAuth();

  const businessId = React.useMemo(
    () =>
      effectiveBusinessId ||
      ctxBusinessId ||
      localStorage.getItem("businessId") ||
      null,
    [ctxBusinessId, effectiveBusinessId]
  );

  const [summary, setSummary] = React.useState({ approved: 0, pending: 0, drafts: 0, library: 0 });
  const [syncing, setSyncing] = React.useState(false);

  const loadSummary = React.useCallback(async () => {
    if (!businessId) return;
    try {
      const res = await axiosClient.get(`templates/summary/${businessId}`, { __silentToast: true });
      if (res?.data?.success) {
        setSummary(res.data);
      }
    } catch (e) {
      // silent
    }
  }, [businessId]);

  React.useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleSync = async () => {
    if (!businessId || syncing) return;
    setSyncing(true);
    try {
      const { data } = await axiosClient.post(`templates/sync/${businessId}`);
      if (data.success) {
        toast.success(data.message || "Sync started...");
        loadSummary();
        // Trigger refresh in children by updating search params
        setSearchParams(prev => {
          const next = new URLSearchParams(prev);
          next.set("v", Date.now().toString());
          return next;
        }, { replace: true });
      } else {
        toast.error(data.message || "Sync failed");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Sync error");
    } finally {
      setSyncing(false);
    }
  };

  const q = searchParams.get("q") || "";
  const categoryFilter = searchParams.get("category") || "ALL";

  const onSearchChange = (val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val) next.set("q", val);
      else next.delete("q");
      return next;
    }, { replace: true });
  };

  const onCategoryChange = (val) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (val !== "ALL") next.set("category", val);
      else next.delete("category");
      return next;
    }, { replace: true });
  };

  // Helper to check active state
  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col">
       {/* Top Header Bar */}
       <header className="bg-white border-b border-slate-200 px-6 py-3">
         <div className="max-w-7xl mx-auto flex flex-col gap-3">

            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Template Builder</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Create, validate, manage, and submit your WhatsApp templates.
                </p>
              </div>
              
              {/* Actions Portal/Placeholder if needed, or simple Summary */}
              {/* <div className="text-sm text-slate-400">
                Workspace
              </div> */}
            </div>

            {/* Navigation Tabs & Search/Filter Row */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 border-b border-transparent">
              <div className="flex items-center gap-1">
                {tabs.map((tab) => {
                  const active = isActive(tab.to);
                  return (
                    <Link
                      key={tab.to}
                      to={tab.to}
                      className={`
                        relative px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 transition-all
                        ${active 
                          ? "text-emerald-700 bg-white border-b-2 border-emerald-600 shadow-sm z-10" 
                          : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                        }
                      `}
                    >
                      {tab.icon}
                      {tab.label}
                      {summary[tab.key] > 0 && (
                        <span className={`
                          ml-1.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full
                          ${active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"}
                        `}>
                          {summary[tab.key]}
                        </span>
                      )}
                      {active && (
                        <div className="absolute -bottom-[1px] left-0 right-0 h-[1px] bg-white" />
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Integrated Search & Filter */}
              <div className="flex items-center gap-4 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-100 mb-1">
                  <div className="flex items-center gap-2 border-r border-slate-200 pr-3 mr-1">
                    <Search size={14} className="text-slate-400" />
                    <input 
                      type="text"
                      placeholder="Search..."
                      className="bg-transparent border-none text-xs focus:ring-0 w-32 md:w-48 placeholder-slate-400 text-slate-700 p-0"
                      value={q}
                      onChange={(e) => onSearchChange(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <select 
                      className="bg-transparent border-none text-[11px] font-semibold text-slate-600 focus:ring-0 cursor-pointer p-0 pr-6"
                      value={categoryFilter}
                      onChange={(e) => onCategoryChange(e.target.value)}
                    >
                      <option value="ALL">All Categories</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <button
                  type="button"
                  onClick={() => navigate("/app/template-builder/drafts?create=1")}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-all shadow-sm"
                  title="Create a new template from scratch"
                >
                  <Plus size={14} />
                  New Template
                </button>
                <button
                  type="button"
                  onClick={handleSync}
                  disabled={!businessId || syncing}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-4 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60 transition-all shadow-sm"
                  title="Sync templates from Meta"
                >
                  <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
                  {syncing ? "Syncing..." : "Sync Template"}
                </button>
              </div>
            </div>
          </div>
        </header>

       {/* Main Content Area */}
       <main className="flex-1 max-w-7xl mx-auto w-full p-4">
         <Outlet />
       </main>
    </div>
  );
}
