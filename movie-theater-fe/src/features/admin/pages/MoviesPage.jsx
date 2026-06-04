import React from 'react';
import { Film, Play, Calendar, Star } from 'lucide-react';

const MoviesPage = () => {
  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">Manage Movies</h1>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6e7191]">Movie Inventory & Catalog Management</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(220,38,38,0.24)] hover:bg-[#d12c2c] transition">
          <span className="material-symbols-outlined">add</span>
          Add New Movie
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        {[
          {
            label: 'TOTAL MOVIES',
            value: '124',
            sub: 'from last month',
            trend: '+4%',
            Icon: Film
          },
          {
            label: 'LIVE NOW',
            value: '18',
            sub: 'Currently screening',
            hasDot: true,
            Icon: Play
          },
          {
            label: 'UPCOMING',
            value: '42',
            sub: 'Scheduled premieres',
            Icon: Calendar
          },
          {
            label: 'AVG RATING',
            value: '4.8',
            sub: 'Target: 5.0 score',
            hasProgress: true,
            progressValue: '96%',
            Icon: Star
          }
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-[24px] bg-[#11121a] border border-white/5 p-6 h-[170px] relative overflow-hidden flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:border-white/10 transition-all duration-300 group"
          >
            {/* Watermark Icon */}
            <card.Icon className="absolute -right-4 -top-4 w-24 h-24 text-white/5 group-hover:text-white/10 transition-colors duration-300" strokeWidth={1} />

            <div>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#6e7191]">{card.label}</p>
                <card.Icon className="text-[#6e7191] w-5 h-5" strokeWidth={2} />
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-white tracking-tight leading-none">{card.value}</h3>
                {card.trend && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-0.5">
                    {card.trend} <span className="text-[10px]">↑</span>
                  </span>
                )}
              </div>
            </div>

            <div className="mt-auto w-full">
              {card.hasProgress ? (
                <div className="space-y-2">
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#ccbba3] rounded-full" style={{ width: card.progressValue }} />
                  </div>
                  <p className="text-[11px] text-[#6e7191] font-medium">{card.sub}</p>
                </div>
              ) : (
                <p className="text-xs text-[#8a8d9f] font-medium flex items-center gap-1.5">
                  {card.hasDot && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />}
                  {card.trend ? <span className="italic text-[#6e7191]">{card.sub}</span> : card.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[32px] bg-[#101118] border border-white/10 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div className="relative w-full lg:max-w-xl">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input className="w-full rounded-full bg-[#0f1117] py-3 pl-14 pr-4 text-white placeholder:text-on-surface-variant border border-white/10 focus:outline-none focus:ring-2 focus:ring-error/30" placeholder="Filter by title, genre, or director..." />
          </div>
          <div className="flex gap-3">
            <button className="rounded-full border border-white/10 bg-[#11131b] px-4 py-3 text-sm text-on-surface-variant">Filters</button>
            <button className="rounded-full border border-white/10 bg-[#11131b] px-4 py-3 text-sm text-on-surface-variant">Export CSV</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-3 text-sm">
            <thead>
              <tr className="text-on-surface-variant text-xs uppercase tracking-[0.2em]">
                <th className="pb-3">Movie</th>
                <th className="pb-3">Genre</th>
                <th className="pb-3">Release Date</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {[
                { title: 'Neon Genesis: Redemption', genre: 'Sci-Fi / Thriller', date: 'Nov 24, 2024', status: 'Live' },
                { title: 'Echoes of the Summit', genre: 'Drama', date: 'Dec 12, 2024', status: 'Draft' },
                { title: 'The Attic Watcher', genre: 'Horror', date: 'Oct 31, 2024', status: 'Archived' },
                { title: 'Midnight Heist', genre: 'Action / Crime', date: 'Jan 15, 2025', status: 'Live' },
              ].map((row) => (
                <tr key={row.title} className="bg-[#0d0f16] rounded-[24px]">
                  <td className="py-4 pr-6">
                    <div className="font-semibold text-white">{row.title}</div>
                    <div className="text-on-surface-variant text-xs mt-1">By studio cinema</div>
                  </td>
                  <td className="py-4 pr-6 text-on-surface-variant">{row.genre}</td>
                  <td className="py-4 pr-6 text-on-surface-variant">{row.date}</td>
                  <td className="py-4 pr-6">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs ${row.status === 'Live' ? 'bg-emerald-500/10 text-emerald-300' : row.status === 'Draft' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-slate-600/10 text-slate-300'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="py-4 pr-6 text-on-surface-variant">Edit · Delete</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default MoviesPage;
