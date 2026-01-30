// 📄 src/components/layout/AppLayout.jsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import SidebarMenu from "./SidebarMenu";
import Topbar from "./Topbar";
import { getBreadcrumbs } from "../../utils/breadcrumbUtils";

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const breadcrumbs = getBreadcrumbs(location.pathname) || [];
  const hideBreadcrumbs = location.pathname.startsWith("/app/inbox/chatinbox");
  const showBreadcrumbs = !hideBreadcrumbs && breadcrumbs.length >= 2;
  const pageTitle = showBreadcrumbs
    ? breadcrumbs[breadcrumbs.length - 1].label
    : "";

  return (
    <div
      className="flex h-screen w-full flex-col overflow-hidden bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50"
      data-test-id="app-layout-root"
    >
      <Topbar />

      <div className="flex flex-1 overflow-hidden">
      {/* ✅ Sidebar */}
      <div
        className="w-20 flex-shrink-0 bg-white shadow-xl h-full z-[45] transition-all duration-300"
      >
        <SidebarMenu />
      </div>

      {/* ✅ Main Content */}
      <div
        className="flex flex-col flex-1 h-full overflow-hidden transition-all duration-300"
      >
        {showBreadcrumbs && (
          <div className="bg-transparent sticky top-0 z-[35] font-['Plus_Jakarta_Sans']">
            <div className="px-4 lg:px-6 h-12 flex items-center justify-between gap-3 min-w-0">
              <div className="flex items-center gap-3 min-w-0 border-b-2 border-slate-200/80 pb-2 mb-2 mt-2 transition-all">
                <h1 className="min-w-0 text-[14px] font-bold text-slate-800 truncate">
                  {pageTitle}
                </h1>

                <div className="hidden md:block h-3 w-[1px] bg-slate-200/60" />

                <nav className="flex items-center gap-0.5 text-[11px] font-medium text-slate-400 tracking-tight overflow-x-auto no-scrollbar min-w-0">
                  <button
                    onClick={() => navigate("/app/welcomepage")}
                    className="inline-flex items-center justify-center w-7 h-7 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    title="Home"
                    aria-label="Home"
                  >
                    <Home size={13} />
                  </button>

                  {breadcrumbs.slice(1).map((breadcrumb, index) => (
                    <div
                      key={`${breadcrumb.path}-${index}`}
                      className="flex items-center gap-0.5 shrink-0"
                    >
                      <ChevronRight size={11} className="text-slate-300 mx-1" />
                      <button
                        onClick={() => navigate(breadcrumb.path)}
                        className={`px-3 py-1 rounded-full transition-all duration-300 ${
                          breadcrumb.isActive
                            ? "bg-emerald-50 text-emerald-600 font-bold shadow-sm ring-1 ring-emerald-100/50"
                            : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50/40"
                        }`}
                        aria-current={breadcrumb.isActive ? "page" : undefined}
                      >
                        {breadcrumb.label}
                      </button>
                    </div>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      </div>
    </div>
  );
}
