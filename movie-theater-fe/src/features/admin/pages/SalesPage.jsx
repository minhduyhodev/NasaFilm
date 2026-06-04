import React from 'react';

const SalesPage = () => {
  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-on-surface-variant mb-2">Sales Overview</p>
          <h1 className="font-headline-xl text-white">Revenue Performance</h1>
          <p className="max-w-2xl text-on-surface-variant mt-2">Monitor sales growth, conversion rates, and campaign revenue from a clean analytics view.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-error px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(220,38,38,0.24)] hover:bg-[#d12c2c] transition">
          <span className="material-symbols-outlined">bar_chart</span>
          Export Data
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: '$142.5K', badge: 'This month' },
          { label: 'Conversion', value: '32.8%', badge: 'Avg rate' },
          { label: 'Growth', value: '+8.4%', badge: 'vs last month' },
          { label: 'Transactions', value: '1,248', badge: 'Completed' },
        ].map((card) => (
          <div key={card.label} className="rounded-[28px] bg-[#101118] border border-white/10 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
            <p className="text-sm uppercase tracking-[0.24em] text-on-surface-variant mb-4">{card.label}</p>
            <h3 className="font-headline-lg text-white">{card.value}</h3>
            <p className="text-on-surface-variant mt-3">{card.badge}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-[32px] bg-[#101118] border border-white/10 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h2 className="font-headline-md text-white">Revenue Trend</h2>
              <p className="text-on-surface-variant">Sales performance over the last 30 days</p>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-full bg-[#11131b] text-on-surface-variant font-label-sm border border-white/10">Daily</button>
              <button className="px-4 py-2 rounded-full bg-error text-white font-label-sm">Monthly</button>
            </div>
          </div>
          <div className="relative rounded-[32px] bg-[#0b0b0f] p-6 h-72">
            <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 1000 200">
              <defs>
                <linearGradient id="salesChartGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255, 92, 92, 0.32)" stopOpacity="1" />
                  <stop offset="100%" stopColor="rgba(255, 92, 92, 0)" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0,180 L0,130 C120,100 180,150 300,80 C420,20 520,90 620,55 C720,25 860,145 960,90 L1000,70 L1000,180 Z" fill="url(#salesChartGrad)" />
              <path d="M0,130 C120,100 180,150 300,80 C420,20 520,90 620,55 C720,25 860,145 960,90 L1000,70" fill="none" stroke="#ff5c5c" strokeWidth={4} />
            </svg>
          </div>
        </div>

        <div className="rounded-[32px] bg-[#101118] border border-white/10 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
          <h2 className="font-headline-md text-white mb-4">Top Channels</h2>
          <div className="space-y-4">
            {[
              { label: 'Online booking', value: '58%' },
              { label: 'Counter sales', value: '24%' },
              { label: 'Membership', value: '18%' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-on-surface-variant mb-2">
                  <span>{item.label}</span>
                  <span className="text-white font-semibold">{item.value}</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full bg-error" style={{ width: item.value }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default SalesPage;
