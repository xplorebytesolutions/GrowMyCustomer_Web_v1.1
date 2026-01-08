import React from "react";
import { Outlet, Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { 
  Library, 
  ListChecks, 
  FileBarChart,
  ChevronLeft,
  Clock,
  Search,
  Filter
} from "lucide-react";

const tabs = [
  { label: "Library", to: "/app/template-builder/library", icon: <Library size={16} /> },
  { label: "Drafts", to: "/app/template-builder/drafts", icon: <ListChecks size={16} /> },
  { label: "Pending", to: "/app/template-builder/pending", icon: <Clock size={16} /> },
  { label: "Approved", to: "/app/template-builder/approved", icon: <FileBarChart size={16} /> },
];

export default function TemplateBuilderLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

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
