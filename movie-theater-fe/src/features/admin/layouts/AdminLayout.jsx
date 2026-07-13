import React, { useEffect, useState, useRef, lazy, Suspense } from "react";
import {
  Outlet,
  Link,
  useLocation,
} from "react-router-dom";
import { Menu } from "lucide-react";
import nasaLogo from "../../../shared/assets/NASAFILM.jpg";
import PageTransition from "../../../shared/components/PageTransition";
import { isCounterOpsPath } from "../../../shared/utils/adminNavigation";
import SupportAdminMessageAlerts from "../components/SupportAdminMessageAlerts";
import "./AdminLayout.css";
import "../styles/admin-theme.css";
import "../../counter/styles/counter-staff-theme.css";

const AdminSidebar = lazy(() => import("./AdminSidebar"));

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const location = useLocation();
  const mainRef = useRef(null);
  const isOpsPage = isCounterOpsPath(location.pathname);
  const isWidePage = isOpsPage;
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#080B14] text-gray-100 overflow-hidden relative font-sans antialiased admin-shell">
      <SupportAdminMessageAlerts />
      <Suspense fallback={<div className="fixed inset-y-0 left-0 z-50 w-16 bg-[#0B0F19] border-r border-[#1E293B]/20" />}>
        <AdminSidebar
          isOpen={isSidebarOpen}
          onToggle={() => setSidebarOpen((prev) => !prev)}
          onClose={() => {
            if (window.innerWidth < 1024) {
              setSidebarOpen(false);
            }
          }}
        />
      </Suspense>

      {isSidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300"
        />
      )}

      <main
        ref={mainRef}
        data-scroll-container="admin-main"
        className={`min-h-screen flex flex-col overflow-y-auto custom-scrollbar relative z-10 bg-[#080B14] font-sans transition-all duration-300 ${
          isSidebarOpen ? "lg:ml-64" : "lg:ml-16"
        }`}
      >
        <div className="sticky top-0 z-40 w-full border-b border-[#1E293B]/60 bg-[#0B0F19]/90 backdrop-blur-[16px] shadow-sm lg:hidden">
          <div className="flex w-full items-center px-6 py-3 justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="inline-flex h-10 w-10 items-center justify-center text-gray-200 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer"
                title="Mở sidebar"
                aria-label="Mở sidebar"
                aria-expanded={isSidebarOpen}
              >
                <Menu className="w-5 h-5" aria-hidden="true" />
              </button>

              <Link
                to="/admin"
                className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <img
                  src={nasaLogo}
                  alt="NASAFILM Logo"
                  className="h-6 w-6 rounded-md object-cover shadow-sm"
                />
                <span className="text-sm font-bold tracking-tight leading-none text-white font-heading">
                  NASA<span className="text-red-500">Film</span>
                </span>
              </Link>
            </div>
          </div>
        </div>

        <div className={`mx-auto flex w-full flex-col px-4 py-6 md:px-8 md:py-8 ${isWidePage ? 'max-w-none' : 'max-w-7xl'}`}>
          <PageTransition scrollTarget='[data-scroll-container="admin-main"]'>
            {children ?? <Outlet />}
          </PageTransition>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
