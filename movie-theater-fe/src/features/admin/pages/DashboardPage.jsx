import React from 'react';

const DashboardPage = () => {
  return (
    <>
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.32em] text-on-surface-variant">Admin Dashboard</p>
          <h1 className="font-headline-xl text-white">Cinema operations at a glance</h1>
          <p className="max-w-2xl text-on-surface-variant">Monitor revenue, audience activity, and screening performance from one centralized admin panel.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-error px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(220,38,38,0.24)] hover:bg-[#d12c2c] transition">
          <span className="material-symbols-outlined">add</span>
          Add New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="rounded-[32px] bg-[#101118] border border-white/10 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="p-4 rounded-3xl bg-[#2b0f12] text-error shadow-[0_15px_40px_rgba(220,38,38,0.16)]">
              <span className="material-symbols-outlined">analytics</span>
            </div>
            <span className="text-error font-label-sm flex items-center gap-1">+12.5% <span className="material-symbols-outlined text-[14px]">trending_up</span></span>
          </div>
          <p className="font-label-sm uppercase tracking-[0.2em] text-on-surface-variant mb-2">Total Revenue</p>
          <h3 className="font-headline-lg text-white">$482,900</h3>
          <p className="font-body-md text-on-surface-variant mt-3">vs. last month $429.2k</p>
        </div>

        <div className="rounded-[32px] bg-[#101118] border border-white/10 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="p-4 rounded-3xl bg-[#10141d] text-primary shadow-[0_15px_40px_rgba(132,102,236,0.16)]">
              <span className="material-symbols-outlined">confirmation_number</span>
            </div>
            <span className="text-on-surface-variant font-label-sm flex items-center gap-1">+8.2% <span className="material-symbols-outlined text-[14px]">trending_up</span></span>
          </div>
          <p className="font-label-sm uppercase tracking-[0.2em] text-on-surface-variant mb-2">Tickets Sold</p>
          <h3 className="font-headline-lg text-white">24,102</h3>
          <p className="font-body-md text-on-surface-variant mt-3">Target reached: 92%</p>
        </div>

        <div className="rounded-[32px] bg-[#101118] border border-white/10 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="p-4 rounded-3xl bg-[#11131b] text-tertiary shadow-[0_15px_40px_rgba(204,197,191,0.16)]">
              <span className="material-symbols-outlined">meeting_room</span>
            </div>
            <span className="text-on-surface-variant font-label-sm flex items-center gap-1">Steady <span className="material-symbols-outlined text-[14px]">horizontal_rule</span></span>
          </div>
          <p className="font-label-sm uppercase tracking-[0.2em] text-on-surface-variant mb-2">Active Screens</p>
          <h3 className="font-headline-lg text-white">112</h3>
          <p className="font-body-md text-on-surface-variant mt-3">Across 14 locations</p>
        </div>

        <div className="rounded-[32px] bg-[#101118] border border-white/10 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="p-4 rounded-3xl bg-[#2b0f12] text-error shadow-[0_15px_40px_rgba(220,38,38,0.16)]">
              <span className="material-symbols-outlined">person_add</span>
            </div>
            <span className="text-error font-label-sm flex items-center gap-1">+24.1% <span className="material-symbols-outlined text-[14px]">trending_up</span></span>
          </div>
          <p className="font-label-sm uppercase tracking-[0.2em] text-on-surface-variant mb-2">New Users</p>
          <h3 className="font-headline-lg text-white">3,480</h3>
          <p className="font-body-md text-on-surface-variant mt-3">Loyalty program growing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[32px] bg-[#101118] border border-white/10 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h2 className="font-headline-md text-white">Revenue Overview</h2>
              <p className="font-body-md text-on-surface-variant">Daily sales performance across all theaters</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-full bg-[#11131b] text-on-surface-variant font-label-sm border border-white/10">Weekly</button>
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
