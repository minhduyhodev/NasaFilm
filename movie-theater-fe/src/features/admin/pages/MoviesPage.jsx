import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Plus, Play, Calendar, FileText, Archive, Pause,
  ChevronDown, Film, Clock, Eye, Edit2, Trash2, EyeOff
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import './MoviesPage.css';

const getCardStatusPill = (status) => {
  switch (status) {
    case 'NOW_SHOWING':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/80 text-white shadow-lg shadow-emerald-500/30 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
          Dang chieu
        </span>
      );
    case 'COMING_SOON':
      return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/80 text-white shadow-lg shadow-blue-500/30 backdrop-blur-sm">Sap chieu</span>;
    case 'DRAFT':
      return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-zinc-600/80 text-white backdrop-blur-sm">Ban nhap</span>;
    case 'ENDED':
      return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-600/80 text-white backdrop-blur-sm">Ket thuc</span>;
    case 'INACTIVE':
      return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/80 text-white backdrop-blur-sm">Tam ngung</span>;
    default:
      return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-zinc-600/80 text-white backdrop-blur-sm">{status}</span>;
  }
};

const getAgeBadgeClass = (rating) => {
  if (!rating) return 'bg-zinc-600 text-white';
  const r = rating.toUpperCase();
  if (r === 'P') return 'bg-emerald-500 text-white';
  if (r === 'K') return 'bg-yellow-400 text-black';
  if (r === 'T13') return 'bg-orange-500 text-white';
  if (r === 'T16') return 'bg-red-600 text-white';
  if (r === 'T18') return 'bg-rose-700 text-white';
  return 'bg-zinc-600 text-white';
};

const MoviesPage = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState([]);
  const [totalMoviesCount, setTotalMoviesCount] = useState(0);
  const [overallStats, setOverallStats] = useState({ total: 0, nowShowing: 0, comingSoon: 0, inactive: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [genresList, setGenresList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [genreFilter, setGenreFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [isGenreFilterOpen, setIsGenreFilterOpen] = useState(false);
  const [isCountryFilterOpen, setIsCountryFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOverallStats = async () => {
    try {
      const data = await movieService.getMovies({ size: 1000 });
      if (data && data.content) {
        const total = data.totalElements || data.content.length;
        const nowShowing = data.content.filter(m => m.status === 'NOW_SHOWING').length;
        const comingSoon = data.content.filter(m => m.status === 'COMING_SOON').length;
        const inactive = data.content.filter(m => m.status === 'INACTIVE' || m.status === 'DRAFT').length;
        setOverallStats({ total, nowShowing, comingSoon, inactive });
      }
    } catch (err) {
      console.error('Failed to load overall stats:', err);
    }
  };

  const fetchMovies = async () => {
    setIsLoading(true);
    try {
      const data = await movieService.getMovies({
        keyword: keyword.trim() || undefined,
        status: statusFilter || undefined,
        genreUuids: genreFilter ? [genreFilter] : undefined,
        countryUuid: countryFilter || undefined,
        page: currentPage - 1,
        size: itemsPerPage
      });
      if (data && data.content) {
        setMovies(data.content);
        setTotalMoviesCount(data.totalElements || data.content.length);
      } else {
        setMovies([]);
        setTotalMoviesCount(0);
      }
    } catch (err) {
      console.error('Failed to load admin movies list:', err);
      notificationService.error('Khong the tai danh sach phim');
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [genresData, countriesData] = await Promise.all([
          movieService.getGenres(),
          movieService.getCountries()
        ]);
        setGenresList(genresData);
        setCountriesList(countriesData);
      } catch (err) {
        console.error('Failed to load metadata in admin movies page:', err);
      }
    };
    fetchMetadata();
    fetchOverallStats();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, statusFilter, genreFilter, countryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovies();
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword, currentPage, itemsPerPage, statusFilter, genreFilter, countryFilter]);

  const handleDeleteMovie = async (movieUuid, title) => {
    if (!window.confirm(`Ban co chac chan muon xoa bo phim "${title}" khong?`)) return;
    try {
      await movieService.deleteMovie(movieUuid);
      notificationService.success(`Xoa thanh cong phim "${title}"`);
      fetchMovies();
      fetchOverallStats();
    } catch (err) {
      console.error('Failed to delete movie:', err);
      notificationService.error(err.message || 'Xoa phim that bai');
    }
  };

  const statusPills = [
    { value: '', label: 'Tat ca' },
    { value: 'NOW_SHOWING', label: 'Dang chieu' },
    { value: 'COMING_SOON', label: 'Sap chieu' },
    { value: 'DRAFT', label: 'Ban nhap' },
    { value: 'ENDED', label: 'Ket thuc' },
    { value: 'INACTIVE', label: 'Tam ngung' },
  ];

  const hiddenCount = overallStats.inactive || 0;

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">He Thong Phim Dien Anh</p>
          <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">Quan Ly Kho Phim</h1>
          <p className="text-sm text-gray-400 mt-2">
            Dang ky, cap nhat chi tiet va thiet lap phan loai phim tren he thong luu tru cua NASAFilm.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs text-white font-bold transition shadow-md shadow-red-600/20 cursor-pointer shrink-0 self-start md:self-auto"
          onClick={() => navigate('/admin/movies/new')}
        >
          <Plus className="w-4 h-4" /> Them Phim Moi
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 text-left">
        {[
          { label: 'TONG SO PHIM', value: overallStats.total, icon: Film, color: 'text-rose-400', kpiClass: 'kpi-total' },
          { label: 'DANG CHIEU', value: overallStats.nowShowing, icon: Play, color: 'text-emerald-400', kpiClass: 'kpi-showing' },
          { label: 'SAP CHIEU', value: overallStats.comingSoon, icon: Clock, color: 'text-blue-400', kpiClass: 'kpi-upcoming' },
          { label: 'NHAP / TAM NGUNG', value: hiddenCount, icon: EyeOff, color: 'text-zinc-400', kpiClass: 'kpi-hidden' }
        ].map(kpi => (
          <div key={kpi.label} className={`kpi-card ${kpi.kpiClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">{kpi.label}</span>
              <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
            </div>
            <p className={`text-xl font-black ${kpi.color} leading-none`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-[#0F1322] border border-[#1A2238] shadow-xl mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-[#1A2238]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input
              className="w-full rounded-lg bg-[#0B0F19] border border-[#1A2238] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Tim kiem ten phim..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => { setIsGenreFilterOpen(!isGenreFilterOpen); setIsCountryFilterOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2238] bg-[#0B0F19] px-3 py-2 text-xs text-gray-300 hover:border-[#2C3B5E] transition-colors cursor-pointer select-none"
            >
              <span className="truncate max-w-[120px]">{genreFilter ? genresList.find(g => g.uuid === genreFilter)?.name : 'The loai'}</span>
              <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
            </button>
            {isGenreFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsGenreFilterOpen(false)} />
                <div className="absolute left-0 top-full mt-1 min-w-[160px] max-h-48 overflow-y-auto bg-[#0F1322] border border-[#1A2238] rounded-lg shadow-2xl z-50 py-1 no-scrollbar animate-dropdown-fade-in">
                  <button type="button" onClick={() => { setGenreFilter(''); setIsGenreFilterOpen(false); }} className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer ${!genreFilter ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'}`}>Tat ca the loai</button>
                  {genresList.map((g) => (
                    <button key={g.uuid} type="button" onClick={() => { setGenreFilter(g.uuid); setIsGenreFilterOpen(false); }} className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer ${genreFilter === g.uuid ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'}`}>{g.name}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => { setIsCountryFilterOpen(!isCountryFilterOpen); setIsGenreFilterOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1A2238] bg-[#0B0F19] px-3 py-2 text-xs text-gray-300 hover:border-[#2C3B5E] transition-colors cursor-pointer select-none"
            >
              <span className="truncate max-w-[120px]">{countryFilter ? countriesList.find(c => c.uuid === countryFilter)?.name : 'Quoc gia'}</span>
              <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
            </button>
            {isCountryFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCountryFilterOpen(false)} />
                <div className="absolute left-0 top-full mt-1 min-w-[160px] max-h-48 overflow-y-auto bg-[#0F1322] border border-[#1A2238] rounded-lg shadow-2xl z-50 py-1 no-scrollbar animate-dropdown-fade-in">
                  <button type="button" onClick={() => { setCountryFilter(''); setIsCountryFilterOpen(false); }} className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer ${!countryFilter ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'}`}>Tat ca quoc gia</button>
                  {countriesList.map((c) => (
                    <button key={c.uuid} type="button" onClick={() => { setCountryFilter(c.uuid); setIsCountryFilterOpen(false); }} className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer ${countryFilter === c.uuid ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'}`}>{c.name}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {(genreFilter || countryFilter) && (
            <button
              type="button"
              onClick={() => { setGenreFilter(''); setCountryFilter(''); }}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 text-xs font-bold text-red-400 cursor-pointer transition"
            >
              <X className="w-3 h-3" /> Xoa loc
            </button>
          )}

          <div className="flex-1" />

          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-xs text-white font-bold transition shadow-md shadow-red-600/20 cursor-pointer shrink-0"
            onClick={() => navigate('/admin/movies/new')}
          >
            <Plus className="w-3.5 h-3.5" /> Them Phim Moi
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {statusPills.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setStatusFilter(pill.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-150 cursor-pointer ${
                statusFilter === pill.value
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                  : 'bg-[#0B0F19] border border-[#1A2238] text-gray-400 hover:border-[#2C3B5E] hover:text-gray-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
          <div className="flex-1" />
          <span className="text-[10px] text-gray-500 shrink-0 font-mono">{totalMoviesCount} phim</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="relative aspect-[2/3] rounded-xl bg-[#1A2238]" />
              <div className="h-3 bg-[#1A2238] rounded mt-2 w-3/4" />
            </div>
          ))}
        </div>
      ) : movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mb-6">
          {movies.map((movie) => (
            <div key={movie.uuid} className="group relative">
              <div
                className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#0B0F19] border border-[#1A2238] shadow-lg cursor-pointer"
                onClick={() => navigate(`/admin/movies/${movie.uuid}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/admin/movies/${movie.uuid}`); }}
              >
                {movie.primaryMediaUrl ? (
                  <img
                    src={movie.primaryMediaUrl}
                    alt={movie.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#0F1322] to-[#1A2238]">
                    <Film className="w-10 h-10 text-[#2C3B5E]" />
                  </div>
                )}

                <div className="absolute top-2 left-2 z-10">
                  {getCardStatusPill(movie.status)}
                </div>

                {movie.ageRestriction && (
                  <div className={`absolute top-2 right-2 z-10 w-7 h-7 rounded font-black text-[10px] flex items-center justify-center shadow-lg ${getAgeBadgeClass(movie.ageRestriction)}`}>
                    {movie.ageRestriction}
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/80 to-black/60 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-3 z-20">
                  <p className="font-bold text-sm text-white leading-tight mb-1 line-clamp-2">{movie.title}</p>

                  {movie.durationMinutes && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-300 mb-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{movie.durationMinutes} phut</span>
                    </div>
                  )}

                  {movie.genres && movie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {movie.genres.slice(0, 3).map((g) => (
                        <span key={g} className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{g}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/movies/${movie.uuid}`); }}
                      className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold rounded-md p-1.5 flex items-center justify-center gap-1 hover:bg-blue-500/30 transition cursor-pointer"
                    >
                      <Eye className="w-2.5 h-2.5" /> Chi tiet
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/movies/${movie.uuid}/edit`); }}
                      className="bg-white/10 border border-white/20 text-white text-[10px] font-bold rounded-md p-1.5 flex items-center justify-center gap-1 hover:bg-white/20 transition cursor-pointer"
                    >
                      <Edit2 className="w-2.5 h-2.5" /> Sua
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDeleteMovie(movie.uuid, movie.title); }}
                      className="bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold rounded-md p-1.5 flex items-center justify-center gap-1 hover:bg-rose-500/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Xoa
                    </button>
                  </div>
                </div>
              </div>

              <p
                className="text-xs font-bold text-white mt-1.5 truncate px-0.5 cursor-pointer hover:text-red-400 transition-colors"
                title={movie.title}
                onClick={() => navigate(`/admin/movies/${movie.uuid}`)}
              >
                {movie.title}
              </p>
              {movie.releaseDate && (
                <p className="text-[10px] text-gray-500 mt-0.5 px-0.5">{movie.releaseDate.substring(0, 4)}</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#0F1322] border border-[#1A2238] flex items-center justify-center mb-4">
            <Film className="w-8 h-8 text-[#2C3B5E]" />
          </div>
          <p className="font-bold text-white uppercase tracking-wider text-xs mb-1">Khong tim thay bo phim nao</p>
          <p className="text-xs text-gray-500">Hay thu thay doi tu khoa hoac bo loc cua ban.</p>
        </div>
      )}

      {totalMoviesCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalMoviesCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
    </div>
  );
};

export default MoviesPage;
