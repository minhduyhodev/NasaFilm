import React, { useState, useEffect } from 'react';
import { Coins, Percent, TrendingUp, CreditCard, Activity, Radio, Compass, Loader2 } from 'lucide-react';
import { adminDashboardService } from '../api/adminDashboardService';
import './DashboardPage.css';

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminDashboardService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatRevenue = (val) => {
    if (val == null) return '0đ';
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1).replace('.', ',') + 'M đ';
    }
    return new Intl.NumberFormat('vi-VN').format(val) + 'đ';
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
        <span className="text-gray-400 text-sm font-semibold">Đang tải thông số vận hành...</span>
      </div>
    );
  }

  const revenueVal = stats ? formatRevenue(stats.totalRevenue) : '0đ';
  const transactionVal = stats ? new Intl.NumberFormat('vi-VN').format(stats.totalTransactions) : '0';
  const growthVal = stats ? (stats.growth >= 0 ? `+${stats.growth.toFixed(1)}%` : `${stats.growth.toFixed(1)}%`) : '0%';
  const conversionVal = stats ? `${stats.conversionRate.toFixed(1)}%` : '0%';

  const cards = [
    {
      label: 'DOANH THU',
      value: revenueVal,
      badge: 'Tháng này',
      Icon: Coins,
      color: 'text-rose-500',
    },
    {
      label: 'TỶ LỆ CHUYỂN ĐỔI',
      value: conversionVal,
      badge: 'Tổng số thành viên',
      Icon: Percent,
      color: 'text-emerald-500',
    },
    {
      label: 'TĂNG TRƯỞNG',
      value: growthVal,
      badge: 'So với tháng trước',
      Icon: TrendingUp,
      color: 'text-amber-500',
    },
    {
      label: 'GIAO DỊCH',
      value: transactionVal,
      badge: 'Đã hoàn thành',
      Icon: CreditCard,
      color: 'text-sky-500',
    },
  ];

  // Resolve dynamic cinemas data
  const cinemas = stats?.cinemas || [];
  const getCinema = (index, defaultName, defaultOccupancy, defaultRevenue) => {
    if (cinemas[index]) {
      return {
        name: cinemas[index].name.toUpperCase(),
        occupancy: cinemas[index].occupancyRate,
        revenue: formatRevenue(cinemas[index].revenue)
      };
    }
    return { name: defaultName, occupancy: defaultOccupancy, revenue: defaultRevenue };
  };

  const planet1 = getCinema(0, 'CHI NHÁNH A', 90, '45Mđ');
  const planet2 = getCinema(1, 'CHI NHÁNH B', 75, '30Mđ');
  const planet3 = getCinema(2, 'CHI NHÁNH C', 60, '15Mđ');

  // Resolve dynamic genres data
  const genres = stats?.genres || [];
  const getGenre = (index, defaultName, defaultOccupancy) => {
    if (genres[index]) {
      return {
        name: genres[index].name.toUpperCase(),
        occupancy: genres[index].occupancyRate
      };
    }
    return { name: defaultName, occupancy: defaultOccupancy };
  };

  const g1 = getGenre(0, 'SCI-FI', 92);
  const g2 = getGenre(1, 'KINH DỊ', 88);
  const g3 = getGenre(2, 'HÀNH ĐỘNG', 75);
  const g4 = getGenre(3, 'HOẠT HÌNH', 79);
  const g5 = getGenre(4, 'DRAMA', 64);

  // Dynamic coordinates calculation for Pentagon Radar Chart
  const getCoords = (genreData, angleIndex) => {
    const r = (genreData.occupancy / 100) * 100; // max radius is 100px
    const center_x = 160;
    const center_y = 140;
    let x, y;
    if (angleIndex === 0) {
      x = center_x;
      y = center_y - r;
    } else if (angleIndex === 1) {
      x = center_x + r * 0.951;
      y = center_y - r * 0.309;
    } else if (angleIndex === 2) {
      x = center_x + r * 0.588;
      y = center_y + r * 0.809;
    } else if (angleIndex === 3) {
      x = center_x - r * 0.588;
      y = center_y + r * 0.809;
    } else {
      x = center_x - r * 0.951;
      y = center_y - r * 0.309;
    }
    return { x: x.toFixed(1), y: y.toFixed(1) };
  };

  const p0 = getCoords(g1, 0);
  const p1 = getCoords(g2, 1);
  const p2 = getCoords(g3, 2);
  const p3 = getCoords(g4, 3);
  const p4 = getCoords(g5, 4);

  const polygonPoints = `${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`;

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">NASAFilm Control Room</p>
          <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">Bảng Điều Khiển Admin</h1>
          <p className="text-sm text-gray-400 mt-2">Tổng quan vận hành & Phân tích thời gian thực hệ thống rạp toàn cầu.</p>
        </div>
        <button className="dashboard-action-btn">
          <Radio className="w-4 h-4 animate-pulse shrink-0" />
          Kích hoạt Chiến Dịch Mới
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => {
          let colorClass = 'text-indigo-400';
          let kpiClass = 'kpi-revenue';
          if (card.label.includes('DOANH')) {
            colorClass = 'text-pink-400';
            kpiClass = 'kpi-revenue';
          } else if (card.label.includes('CHUYỂN')) {
            colorClass = 'text-emerald-400';
            kpiClass = 'kpi-conversion';
          } else if (card.label.includes('TRƯỞNG')) {
            colorClass = 'text-amber-400';
            kpiClass = 'kpi-growth';
          } else if (card.label.includes('GIAO DỊCH')) {
            colorClass = 'text-blue-400';
            kpiClass = 'kpi-transactions';
          }
          return (
            <div key={card.label} className={`kpi-card ${kpiClass}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">{card.label}</span>
                <card.Icon className={`w-4 h-4 ${colorClass} opacity-60`} />
              </div>
              <p className={`text-xl font-black ${colorClass} leading-none`}>{card.value}</p>
              <p className="text-[9px] text-gray-500 mt-1.5 leading-none">{card.badge}</p>
            </div>
          );
        })}
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

              {/* Planet 1 */}
              <g className="cursor-pointer group">
                <circle cx="450" cy="108" r="16" fill="#f43f5e" filter="url(#glow)" className="transition-transform duration-300 hover:scale-125" />
                <circle cx="450" cy="108" r="6" fill="#ffffff" />
                <path d="M450,108 L530,70" stroke="#f43f5e" strokeWidth="0.75" strokeDasharray="2 2" />
                <rect x="530" y="55" width="140" height="30" rx="4" fill="#121826" stroke="#1A2238" strokeWidth="1" className="opacity-90" />
                <text x="536" y="67" fill="#ffffff" className="text-[8px] font-bold">{planet1.name}</text>
                <text x="536" y="79" fill="#f43f5e" className="text-[8px] font-bold">{planet1.occupancy}% lấp đầy • {planet1.revenue}</text>
              </g>

              {/* Planet 2 */}
              <g className="cursor-pointer group">
                <circle cx="200" cy="190" r="12" fill="#3b82f6" filter="url(#glow)" />
                <circle cx="200" cy="190" r="4" fill="#ffffff" />
                <path d="M200,190 L110,210" stroke="#3b82f6" strokeWidth="0.75" strokeDasharray="2 2" />
                <rect x="10" y="195" width="130" height="30" rx="4" fill="#121826" stroke="#1A2238" strokeWidth="1" className="opacity-90" />
                <text x="16" y="207" fill="#ffffff" className="text-[8px] font-bold">{planet2.name}</text>
                <text x="16" y="219" fill="#3b82f6" className="text-[8px] font-bold">{planet2.occupancy}% lấp đầy • {planet2.revenue}</text>
              </g>

              {/* Planet 3 */}
              <g className="cursor-pointer group">
                <circle cx="580" cy="210" r="9" fill="#10b981" filter="url(#glow)" />
                <circle cx="580" cy="210" r="3" fill="#ffffff" />
                <path d="M580,210 L500,240" stroke="#10b981" strokeWidth="0.75" strokeDasharray="2 2" />
                <rect x="390" y="225" width="130" height="30" rx="4" fill="#121826" stroke="#1A2238" strokeWidth="1" className="opacity-90" />
                <text x="396" y="237" fill="#ffffff" className="text-[8px] font-bold">{planet3.name}</text>
                <text x="396" y="249" fill="#10b981" className="text-[8px] font-bold">{planet3.occupancy}% lấp đầy • {planet3.revenue}</text>
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
              <polygon points="160,40 255.1,109.1 218.8,220.9 101.2,220.9 64.9,109.1" fill="none" stroke="#1A2238" strokeWidth="1" />
              <polygon points="160,65 231.3,116.8 204.1,200.7 115.9,200.7 88.7,116.8" fill="none" stroke="#1A2238" strokeWidth="0.75" strokeDasharray="3 3" />
              <polygon points="160,90 207.6,124.5 189.4,180.5 130.6,180.5 112.4,124.5" fill="none" stroke="#1A2238" strokeWidth="0.75" strokeDasharray="3 3" />
              <polygon points="160,115 183.8,132.3 174.7,160.2 145.3,160.2 136.2,132.3" fill="none" stroke="#1A2238" strokeWidth="0.5" />

              {/* Spider Axes */}
              <line x1="160" y1="140" x2="160" y2="40" stroke="#1A2238" strokeWidth="1" />
              <line x1="160" y1="140" x2="255.1" y2="109.1" stroke="#1A2238" strokeWidth="1" />
              <line x1="160" y1="140" x2="218.8" y2="220.9" stroke="#1A2238" strokeWidth="1" />
              <line x1="160" y1="140" x2="101.2" y2="220.9" stroke="#1A2238" strokeWidth="1" />
              <line x1="160" y1="140" x2="64.9" y2="109.1" stroke="#1A2238" strokeWidth="1" />

              {/* Dynamic Data Radar Area */}
              <polygon 
                points={polygonPoints} 
                fill="rgba(239, 68, 68, 0.15)" 
                stroke="#ef4444" 
                strokeWidth="2.5" 
                filter="url(#radarGlow)"
              />

              {/* Glowing Data Dots */}
              <circle cx={p0.x} cy={p0.y} r="4.5" fill="#ef4444" />
              <circle cx={p1.x} cy={p1.y} r="4.5" fill="#ef4444" />
              <circle cx={p2.x} cy={p2.y} r="4.5" fill="#ef4444" />
              <circle cx={p3.x} cy={p3.y} r="4.5" fill="#ef4444" />
              <circle cx={p4.x} cy={p4.y} r="4.5" fill="#ef4444" />

              {/* Radar Labels */}
              <text x="160" y="27" textAnchor="middle" fill="#ffffff" className="text-[8px] font-bold">{g1.name} ({g1.occupancy}%)</text>
              <text x="265" y="106" textAnchor="start" fill="#ffffff" className="text-[8px] font-bold">{g2.name} ({g2.occupancy}%)</text>
              <text x="225" y="235" textAnchor="middle" fill="#ffffff" className="text-[8px] font-bold">{g3.name} ({g3.occupancy}%)</text>
              <text x="95" y="235" textAnchor="middle" fill="#ffffff" className="text-[8px] font-bold">{g4.name} ({g4.occupancy}%)</text>
              <text x="55" y="106" textAnchor="end" fill="#ffffff" className="text-[8px] font-bold">{g5.name} ({g5.occupancy}%)</text>
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
