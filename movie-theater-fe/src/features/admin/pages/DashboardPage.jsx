import React from 'react';

const DashboardPage = () => {
  return (
    <>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">Admin Dashboard</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6e7191]">Operations & Analytics at a glance</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-error px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(220,38,38,0.24)] hover:bg-[#d12c2c] transition">
          <span className="material-symbols-outlined">add</span>
          Add New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          { label: 'REVENUE', value: '142,5K', badge: 'This month', icon: 'analytics' },
          { label: 'CONVERSATION', value: '32,8%', badge: 'Avg rate', icon: 'target' },
          { label: 'GROWTH', value: '+8,4%', badge: 'vs last month', icon: 'trending_up' },
          { label: 'TRANSACTIONS', value: '3,480', badge: 'Completed', icon: 'analytics' },
        ].map((card) => (
          <div key={card.label} className="rounded-[20px] bg-[#11121a] border border-white/5 p-6 flex flex-col justify-between h-[140px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-white/10 transition-all duration-300">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6e7191]">{card.label}</span>
              <span className="material-symbols-outlined text-[#6e7191] text-[20px]">{card.icon}</span>
            </div>
            <div>
              <h3 className="text-3xl font-bold text-white tracking-tight leading-none">{card.value}</h3>
              <p className="text-xs text-[#6e7191] mt-2 font-medium">{card.badge}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[32px] bg-[#101118] border border-white/10 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h2 className="font-headline-md text-white">Revenue Overview</h2>
              <p className="font-body-md text-on-surface-variant">Daily sales performance across all theaters</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-full bg-[#11131b] text-on-surface-variant font-label-sm border border-white/10">Daily</button>
              <button className="px-4 py-2 rounded-full bg-error text-white font-label-sm">Monthly</button>
            </div>
          </div>
          <div className="flex-1 w-full relative rounded-[32px] bg-[#0b0b0f] p-6 h-72">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
              <defs>
                <linearGradient id="chartGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(220, 38, 38, 0.24)" stopOpacity="1" />
                  <stop offset="100%" stopColor="rgba(220, 38, 38, 0)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,180 L0,120 C100,100 150,150 250,90 C350,30 400,100 500,60 C600,20 750,140 850,70 L1000,40 L1000,180 Z" fill="url(#chartGrad)" />
              <path d="M0,120 C100,100 150,150 250,90 C350,30 400,100 500,60 C600,20 750,140 850,70 L1000,40" fill="none" stroke="#ff8a7a" strokeWidth={4} />
            </svg>
          </div>
          {/* X Axis labels */}
          <div className="flex justify-between text-[10px] font-bold text-[#6e7191] uppercase tracking-[0.2em] mt-4 px-2">
            <span>DAY 01</span>
            <span>DAY 10</span>
            <span>DAY 20</span>
            <span>DAY 30</span>
          </div>
        </div>

        <div className="rounded-[32px] bg-[#101118] border border-white/10 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-headline-md text-white">Occupancy Rate</h2>
              <p className="font-body-md text-on-surface-variant">Capacity usage per genre</p>
            </div>
          </div>
          <div className="space-y-6 flex-1">
            <div className="space-y-2">
              <div className="flex justify-between font-label-md">
                <span className="text-on-surface">Sci-Fi / Action</span>
                <span className="text-error">92%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div className="bg-error h-full rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between font-label-md">
                <span className="text-on-surface">Drama</span>
                <span className="text-on-surface-variant">64%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div className="bg-[#6b7280] h-full rounded-full" style={{ width: '64%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between font-label-md">
                <span className="text-on-surface">Horror</span>
                <span className="text-error">88%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div className="bg-error h-full rounded-full" style={{ width: '88%' }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between font-label-md">
                <span className="text-on-surface">Animation</span>
                <span className="text-tertiary">79%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div className="bg-tertiary h-full rounded-full" style={{ width: '79%' }}></div>
              </div>
            </div>
          </div>
          <button className="w-full mt-6 py-3 rounded-full bg-[#11131b] text-on-surface-variant border border-white/10 hover:bg-white/5 transition-colors">View Detailed Breakdown</button>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
