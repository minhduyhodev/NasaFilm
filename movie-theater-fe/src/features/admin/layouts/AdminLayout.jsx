import React, { useCallback, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';
import huyAdmin from '../../../shared/assets/huyadmin.jpg';

const Sidebar = ({ isOpen, onClose }) => {
  const { logout } = useAuthContext();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/auth/login');
  }, [logout, navigate]);

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#06060a] border-r border-white/10 flex flex-col overflow-hidden transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
      <div className="px-6 pt-8 pb-4 flex items-center justify-center">
        <img src={nasaLogo} alt="NASAFILM Logo" className="w-full max-w-[200px] h-auto object-contain rounded-xl translate-x-2" />
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto no-scrollbar">
        {[
          { to: '/admin', icon: 'dashboard', label: 'Overview' },
          { to: '/admin/movies', icon: 'movie', label: 'Movies' },
          { to: '/admin/showtimes', icon: 'schedule', label: 'Showtimes' },
          { to: '/admin/cinemas', icon: 'theater_comedy', label: 'Cinemas' },
          { to: '/admin/users', icon: 'group', label: 'Users' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-[24px] transition-all duration-300 ${
                isActive
                  ? 'bg-error text-white shadow-[0_12px_40px_rgba(220,38,38,0.24)]'
                  : 'text-on-surface-variant hover:text-white hover:bg-white/5'
              }`
            }
            onClick={onClose}
          >
            {({ isActive }) => (
              <>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                  {item.icon}
                </span>
                <span className="font-label-md">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 mt-auto space-y-3">
        <div className="bg-[#101118] p-4 rounded-[30px] border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.25)] flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#161820] border border-white/10 flex items-center justify-center overflow-hidden">
            <img alt="Admin Profile" className="w-full h-full object-cover" src={huyAdmin} />
          </div>
          <div>
            <p className="font-label-md text-white font-bold">ADMIN HUY HANDSOME</p>
          </div>
          <button onClick={handleLogout} className="ml-auto rounded-full border border-white/10 p-2 text-on-surface-variant hover:text-error transition-colors">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

const AdminLayout = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#070709] text-on-surface overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="lg:ml-72 min-h-screen flex flex-col overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.04),_transparent_30%),_radial-gradient(circle_at_bottom_right,_rgba(220,38,38,0.08),_transparent_25%)]">
        <div className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#09090f]/95 backdrop-blur-[16px] shadow-[0_10px_40px_rgba(0,0,0,0.2)]">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-4 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#101118] text-on-surface-variant lg:hidden"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              <div className="relative w-full max-w-3xl">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
                <input
                  className="w-full rounded-full bg-[#101118] border border-white/10 py-3 pl-14 pr-4 text-white placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-error/30"
                  placeholder="Search analytics, users, or movies..."
                  type="text"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-8 sm:px-8">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
