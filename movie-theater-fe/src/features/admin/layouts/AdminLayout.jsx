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
    <div className="admin-shell adm-app antialiased overflow-hidden relative min-h-screen">
      <SupportAdminMessageAlerts />
      <Suspense
        fallback={
          <div className="adm-sidebar-fallback" aria-hidden="true" />
        }
      >
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
          className="adm-sidebar-overlay lg:hidden"
          aria-hidden="true"
        />
      )}

      <main
        ref={mainRef}
        data-scroll-container="admin-main"
        className={`adm-main custom-scrollbar ${
          isSidebarOpen ? "adm-main--sidebar-open" : "adm-main--sidebar-collapsed"
        }`}
      >
        <div className="adm-topbar lg:hidden">
          <div className="adm-topbar__brand">
            <button
              type="button"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="adm-icon-btn"
              title="Mở sidebar"
              aria-label="Mở sidebar"
              aria-expanded={isSidebarOpen}
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>

            <Link to="/admin" className="adm-brand-link">
              <img
                src={nasaLogo}
                alt="NASAFILM Logo"
                className="adm-brand-logo"
              />
              <span className="adm-brand-text">
                NASA<span className="adm-brand-accent">Film</span>
              </span>
            </Link>
          </div>
        </div>

        <div className={`adm-main-pad ${isWidePage ? "adm-main-pad--wide" : ""}`}>
          <PageTransition scrollTarget='[data-scroll-container="admin-main"]'>
            {children ?? <Outlet />}
          </PageTransition>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
