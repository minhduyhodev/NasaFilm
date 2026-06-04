import React from 'react';

const MoviesPage: React.FC = () => {
  return (
    <>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.32em] text-on-surface-variant mb-2">Manage Movies</p>
          <h1 className="font-headline-xl text-white">Movie Inventory</h1>
          <p className="max-w-2xl text-on-surface-variant mt-2">Update titles, track screening status, and keep your movie catalog up to date.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-error px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(220,38,38,0.24)] hover:bg-[#d12c2c] transition">
          <span className="material-symbols-outlined">add</span>
          Add New Movie
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Total Movies', value: '124', badge: 'All titles' },
          { label: 'Live Now', value: '18', badge: 'Currently screening' },
          { label: 'Upcoming', value: '42', badge: 'Scheduled premieres' },
          { label: 'Avg Rating', value: '4.8', badge: 'Audience score' },
        ].map((card) => (
          <div key={card.label} className="rounded-[28px] bg-[#101118] border border-white/10 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]">
            <p className="text-sm uppercase tracking-[0.24em] text-on-surface-variant mb-4">{card.label}</p>
            <h3 className="font-headline-lg text-white">{card.value}</h3>
            <p className="text-on-surface-variant mt-3">{card.badge}</p>
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
