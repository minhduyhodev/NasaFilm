import { useNavigate } from 'react-router-dom';
import { Home, LayoutDashboard, SearchX } from 'lucide-react';
import { useAuthContext } from '../../features/auth/hooks/useAuthContext';
import {
  getDefaultAdminPath,
  isAdminOrStaffUser,
} from '../../shared/utils/adminNavigation';

export const NotFoundPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthContext();
  const staffUser = isAuthenticated && isAdminOrStaffUser(user);

  const handleGoBack = () => {
    navigate(staffUser ? getDefaultAdminPath(user) : '/', { replace: true });
  };

  return (
    <div className="min-h-[calc(100vh-6.5rem)] bg-[#07080d] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      />

      <div className="max-w-md w-full text-center relative z-10">
        <div className="bg-[#0f111a]/80 border border-white/5 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.5)] flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
            <SearchX size={40} className="stroke-[1.5]" aria-hidden="true" />
          </div>

          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 mb-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
            404 - KHÔNG TÌM THẤY TRANG
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight leading-snug mb-3">
            Trang Không Tồn Tại
          </h1>
          <p className="text-sm text-[#8a8d9f] font-medium leading-relaxed mb-8">
            Đường dẫn bạn nhập không tồn tại hoặc đã được thay đổi. Vui lòng quay lại khu vực phù hợp.
          </p>

          <button
            type="button"
            onClick={handleGoBack}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-600 hover:bg-[#d12c2c] text-white font-bold text-sm uppercase tracking-wider rounded-xl transition duration-200 shadow-[0_15px_30px_rgba(220,38,38,0.2)]"
          >
            {staffUser ? <LayoutDashboard size={16} /> : <Home size={16} />}
            <span>{staffUser ? 'Về Cổng Quản Trị' : 'Về Trang Chủ'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
