import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, LogOut } from 'lucide-react';
import { useAuthContext } from '../hooks/useAuthContext';

export const UnauthorizedPage = () => {
  const navigate = useNavigate();
  const { logout } = useAuthContext();

  const handleGoHome = () => {
    navigate('/');
  };

  const handleSwitchAccount = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#07080d] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background cinematic glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-red-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid pattern background */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />

      <div className="max-w-md w-full text-center relative z-10">
        {/* Card Frame */}
        <div className="bg-[#0f111a]/80 border border-white/5 backdrop-blur-2xl rounded-[32px] p-8 shadow-[0_30px_70px_rgba(0,0,0,0.5)] flex flex-col items-center">
          
          {/* Animated Warning Icon */}
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.1)] animate-bounce-none">
            <ShieldAlert size={40} className="stroke-[1.5]" />
          </div>

          {/* Title and Headers */}
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-400 mb-2 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
            403 - TRUY CẬP BỊ TỪ CHỐI
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight leading-snug mb-3">
            Quyền Truy Cập Bị Từ Chối
          </h1>
          <p className="text-sm text-[#8a8d9f] font-medium leading-relaxed mb-8">
            Tài khoản của bạn không được cấp quyền truy cập vào trang này. Vui lòng quay lại trang chủ hoặc đăng nhập bằng tài khoản có đặc quyền cao hơn.
          </p>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={handleGoHome}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-600 hover:bg-[#d12c2c] text-white font-bold text-sm uppercase tracking-wider rounded-xl transition duration-200 shadow-[0_15px_30px_rgba(220,38,38,0.2)]"
            >
              <Home size={16} />
              <span>Về Trang Chủ</span>
            </button>

            <button 
              onClick={handleSwitchAccount}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-sm uppercase tracking-wider rounded-xl transition duration-200"
            >
              <LogOut size={16} />
              <span>Đổi Tài Khoản</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
