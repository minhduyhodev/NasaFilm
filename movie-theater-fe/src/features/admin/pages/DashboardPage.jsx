import React from 'react';
import { Coins, Percent, TrendingUp, CreditCard, Activity, Radio, Compass } from 'lucide-react';
import './DashboardPage.css';

const DashboardPage = () => {
  const cards = [
    {
      label: 'DOANH THU',
      value: '142,5K',
      badge: 'Tháng này',
      Icon: Coins,
      color: 'text-rose-500',
    },
    {
      label: 'TỶ LỆ CHUYỂN ĐỔI',
      value: '32,8%',
      badge: 'Tỷ lệ trung bình',
      Icon: Percent,
      color: 'text-emerald-500',
    },
    {
      label: 'TĂNG TRƯỞNG',
      value: '+8,4%',
      badge: 'So với tháng trước',
      Icon: TrendingUp,
      color: 'text-amber-500',
    },
    {
      label: 'GIAO DỊCH',
      value: '3,480',
      badge: 'Đã hoàn thành',
      Icon: CreditCard,
      color: 'text-sky-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="dashboard-header-container">
        <div className="dashboard-header-info">
          <p className="dashboard-subtitle">NASAFilm Control Room</p>
          <h1 className="dashboard-title text-white">Bảng Điều Khiển Admin</h1>
          <p className="text-gray-400 text-sm">Tổng quan vận hành & Phân tích thời gian thực hệ thống rạp toàn cầu.</p>
        </div>
        <button className="dashboard-action-btn">
          <Radio className="w-4 h-4 animate-pulse shrink-0" />
          Kích hoạt Chiến Dịch Mới
        </button>
      </div>

      {/* Unified Stats Insight Panel (No-Card Layout, reduced by 60% clutter) */}
      <div className="dashboard-unified-stats-panel bg-[#121826]/70 border border-[#1A2238] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 divide-y md:divide-y-0 md:divide-x divide-[#1A2238] shadow-2xl backdrop-blur-md">
        {cards.map((card) => (
          <div key={card.label} className="w-full flex items-center justify-between md:justify-center md:px-8 gap-6 py-4 md:py-0">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block">{card.label}</span>
              <h3 className="text-3xl font-black text-white tracking-tight leading-none mt-1">{card.value}</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">{card.badge}</p>
            </div>
            <div className={`p-3.5 rounded-xl bg-white/5 border border-white/5 ${card.color} shrink-0`}>
              <card.Icon className="w-6 h-6" strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>

      {/* High-Tech Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupancy Galaxy Chart (Planetary Telemetry) */}
        <div className="lg:col-span-2 rounded-2xl bg-[#121826]/70 border border-[#1A2238] p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
          <div className="mb-4">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-rose-500 animate-spin-slow" />
              <h2 className="text-xl font-bold text-white">Occupancy Galaxy</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">Giám sát doanh thu rạp chiếu thời gian thực theo mô hình quỹ đạo hành tinh.</p>
          </div>

          {/* SVG Orbit Graphic */}
          <div className="relative w-full h-[320px] bg-black/40 rounded-xl border border-[#1A2238] overflow-hidden flex items-center justify-center p-4">
            {/* Telemetry scanlines overlay */}
            <div className="absolute inset-0 bg-scanlines pointer-events-none opacity-[0.03]" />
            <div className="absolute inset-0 bg-radial-glow pointer-events-none" />

            <svg className="w-full h-full" viewBox="0 0 700 300" preserveAspectRatio="xMidYMid meet">
              <defs>
                <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                  <stop offset="40%" stopColor="#f43f5e" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                </radialGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Orbit Ellipses */}
              <ellipse cx="350" cy="150" rx="140" ry="60" fill="none" stroke="#1A2238" strokeWidth="1.5" strokeDasharray="4 6" />
              <ellipse cx="350" cy="150" rx="230" ry="100" fill="none" stroke="#1A2238" strokeWidth="1.5" strokeDasharray="3 5" />
              <ellipse cx="350" cy="150" rx="310" ry="130" fill="none" stroke="#1A2238" strokeWidth="1" />

              {/* Central Star: Control Center */}
              <circle cx="350" cy="150" r="24" fill="url(#sunGlow)" />
              <circle cx="350" cy="150" r="6" fill="#ffffff" filter="url(#glow)" />
              <text x="350" y="125" textAnchor="middle" fill="#ef4444" className="text-[10px] font-bold tracking-[0.2em]">NASA HQ</text>

              {/* Planet 1: Downtown Plaza */}
              <g className="cursor-pointer group">
                <circle cx="450" cy="108" r="16" fill="#f43f5e" filter="url(#glow)" className="transition-transform duration-300 hover:scale-125" />
                <circle cx="450" cy="108" r="6" fill="#ffffff" />
                <path d="M450,108 L530,70" stroke="#f43f5e" strokeWidth="0.75" strokeDasharray="2 2" />
                <rect x="530" y="55" width="130" height="30" rx="4" fill="#121826" stroke="#1A2238" strokeWidth="1" className="opacity-90" />
                <text x="536" y="67" fill="#ffffff" className="text-[9px] font-bold">DOWNTOWN PLAZA</text>
                <text x="536" y="79" fill="#f43f5e" className="text-[8px] font-bold">92% lấp đầy • $45K</text>
              </g>

              {/* Planet 2: Riverfront Mall */}
              <g className="cursor-pointer group">
                <circle cx="200" cy="190" r="12" fill="#3b82f6" filter="url(#glow)" />
                <circle cx="200" cy="190" r="4" fill="#ffffff" />
                <path d="M200,190 L110,210" stroke="#3b82f6" strokeWidth="0.75" strokeDasharray="2 2" />
                <rect x="10" y="195" width="110" height="30" rx="4" fill="#121826" stroke="#1A2238" strokeWidth="1" className="opacity-90" />
                <text x="16" y="207" fill="#ffffff" className="text-[9px] font-bold">RIVERFRONT</text>
                <text x="16" y="219" fill="#3b82f6" className="text-[8px] font-bold">79% lấp đầy • $32K</text>
              </g>

              {/* Planet 3: North Point Galaxy */}
              <g className="cursor-pointer group">
                <circle cx="580" cy="210" r="9" fill="#10b981" filter="url(#glow)" />
                <circle cx="580" cy="210" r="3" fill="#ffffff" />
                <path d="M580,210 L500,240" stroke="#10b981" strokeWidth="0.75" strokeDasharray="2 2" />
                <rect x="400" y="225" width="120" height="30" rx="4" fill="#121826" stroke="#1A2238" strokeWidth="1" className="opacity-90" />
                <text x="406" y="237" fill="#ffffff" className="text-[9px] font-bold">NORTH POINT</text>
                <text x="406" y="249" fill="#10b981" className="text-[8px] font-bold">64% lấp đầy • $18K</text>
              </g>
            </svg>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-gray-500 mt-3 px-1">
            <span>COSMIC TELEMETRY ACTIVE</span>
            <span>SYSTEM STATE: OPTIMAL</span>
          </div>
        </div>

        {/* Occupancy by Genre (Custom Movie Radar Chart) */}
        <div className="rounded-2xl bg-[#121826]/70 border border-[#1A2238] p-6 shadow-2xl backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-rose-500" />
              <h2 className="text-xl font-bold text-white">Movie Radar</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">Hiệu suất lấp đầy ghế bình quân chia theo thể loại phim thịnh hành.</p>
          </div>

          {/* Radar Chart Container */}
          <div className="relative w-full h-[260px] flex items-center justify-center mt-4 bg-black/20 rounded-xl border border-[#1A2238] overflow-hidden">
            <svg className="w-full h-full" viewBox="0 0 320 280">
              <defs>
                <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Dotted Pentagon Web Grid */}
              {/* Level 100% */}
              <polygon points="160,40 255.1,109.1 218.8,220.9 101.2,220.9 64.9,109.1" fill="none" stroke="#1A2238" strokeWidth="1" />
              {/* Level 75% */}
              <polygon points="160,65 231.3,116.8 204.1,200.7 115.9,200.7 88.7,116.8" fill="none" stroke="#1A2238" strokeWidth="0.75" strokeDasharray="3 3" />
              {/* Level 50% */}
              <polygon points="160,90 207.6,124.5 189.4,180.5 130.6,180.5 112.4,124.5" fill="none" stroke="#1A2238" strokeWidth="0.75" strokeDasharray="3 3" />
              {/* Level 25% */}
              <polygon points="160,115 183.8,132.3 174.7,160.2 145.3,160.2 136.2,132.3" fill="none" stroke="#1A2238" strokeWidth="0.5" />

              {/* Spider Axes */}
              <line x1="160" y1="140" x2="160" y2="40" stroke="#1A2238" strokeWidth="1" />
              <line x1="160" y1="140" x2="255.1" y2="109.1" stroke="#1A2238" strokeWidth="1" />
              <line x1="160" y1="140" x2="218.8" y2="220.9" stroke="#1A2238" strokeWidth="1" />
              <line x1="160" y1="140" x2="101.2" y2="220.9" stroke="#1A2238" strokeWidth="1" />
              <line x1="160" y1="140" x2="64.9" y2="109.1" stroke="#1A2238" strokeWidth="1" />

              {/* Actual Data Radar Area: Sci-Fi(92), Horror(88), Action(75), Animation(79), Drama(64) */}
              <polygon 
                points="160,48 243.7,112.8 204.1,200.7 113.6,203.9 99.1,120.2" 
                fill="rgba(239, 68, 68, 0.15)" 
                stroke="#ef4444" 
                strokeWidth="2.5" 
                filter="url(#radarGlow)"
              />

              {/* Glowing Data Dots */}
              <circle cx="160" cy="48" r="4.5" fill="#ef4444" />
              <circle cx="243.7" cy="112.8" r="4.5" fill="#ef4444" />
              <circle cx="204.1" cy="200.7" r="4.5" fill="#ef4444" />
              <circle cx="113.6" cy="203.9" r="4.5" fill="#ef4444" />
              <circle cx="99.1" cy="120.2" r="4.5" fill="#ef4444" />

              {/* Radar Labels */}
              <text x="160" y="27" textAnchor="middle" fill="#ffffff" className="text-[9px] font-bold">SCI-FI (92%)</text>
              <text x="265" y="106" textAnchor="start" fill="#ffffff" className="text-[9px] font-bold">KINH DỊ (88%)</text>
              <text x="225" y="235" textAnchor="middle" fill="#ffffff" className="text-[9px] font-bold">HÀNH ĐỘNG (75%)</text>
              <text x="95" y="235" textAnchor="middle" fill="#ffffff" className="text-[9px] font-bold">HOẠT HÌNH (79%)</text>
              <text x="55" y="106" textAnchor="end" fill="#ffffff" className="text-[9px] font-bold">DRAMA (64%)</text>
            </svg>
          </div>

          <button className="w-full mt-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 hover:border-white/15 text-xs font-semibold transition-all duration-300">
            Xem Báo Cáo Chi Tiết
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
