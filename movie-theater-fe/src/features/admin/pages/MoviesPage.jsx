import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Plus, Film, Clock, ChevronDown, Clapperboard, PlayCircle, CalendarClock, Archive } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import VirtualGrid from '../../../shared/components/VirtualGrid';
import {
  AdminPage,
  PageHeader,
  Section,
  GhostButton,
} from '../components';
import { getMovieStatusLabel } from '../utils/statusLabels';
import { resolveMediaUrl, handlePosterError } from '../../../shared/utils/mediaUrlUtils';
import { useMediaUrlRouting } from '../../../shared/hooks/useMediaUrlRouting';
import './MoviesPage.css';

const FilterDropdown = ({ label, value, options, onChange, searchable = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const searchRef = useRef(null);
  const selected = options.find((o) => o.value === value);

  const filteredOptions = searchable && query.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    if (searchable && searchRef.current) {
      searchRef.current.focus();
    }
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, searchable]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="w-full inline-flex items-center justify-between gap-2 rounded-xl bg-[#0f172a] border border-[#242d42] px-3 py-2.5 text-xs text-white hover:border-red-500/30 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all duration-300 cursor-pointer sm:min-w-[180px]"
      >
        <span className="truncate">{selected?.label || label}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-[100] mt-1 w-full min-w-[220px] rounded-xl bg-[#121826] py-1 shadow-2xl ring-1 ring-white/10">
          {searchable && (
            <div className="px-2 pt-2 pb-1 border-b border-white/5">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="w-full rounded-lg bg-[#0f172a] border border-[#242d42] pl-8 pr-7 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/40"
                  onClick={(e) => e.stopPropagation()}
                />
                {query && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setQuery('');
                      searchRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 bg-transparent border-none p-0 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="max-h-52 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value || '__all__'}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm transition cursor-pointer border-none ${
                    value === opt.value
                      ? 'bg-red-500/10 text-red-300 font-medium'
                      : 'bg-transparent text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))
            ) : (
              <p className="px-3 py-3 text-xs text-gray-500 text-center">Không tìm thấy kết quả</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const MoviesPage = () => {
  const navigate = useNavigate();
  useMediaUrlRouting();
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
  const [statusFilter, setStatusFilter] = useState('');

  const fetchOverallStats = async () => {
    try {
      const data = await movieService.getMovies({ size: 1000 });
      if (data?.content) {
        setOverallStats({
          total: data.totalElements || data.content.length,
          nowShowing: data.content.filter((m) => m.status === 'NOW_SHOWING').length,
          comingSoon: data.content.filter((m) => m.status === 'COMING_SOON').length,
          inactive: data.content.filter((m) => m.status === 'INACTIVE' || m.status === 'DRAFT').length,
        });
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
        size: itemsPerPage,
      });
      if (data?.content) {
        setMovies(data.content);
        setTotalMoviesCount(data.totalElements || data.content.length);
      } else {
        setMovies([]);
        setTotalMoviesCount(0);
      }
    } catch (err) {
      console.error('Failed to load admin movies list:', err);
      notificationService.error('Không thể tải danh sách phim');
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
          movieService.getCountries(),
        ]);
        setGenresList(genresData);
        setCountriesList(countriesData);
      } catch (err) {
        console.error('Failed to load metadata:', err);
      }
    };
    fetchMetadata();
    fetchOverallStats();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, statusFilter, genreFilter, countryFilter]);

  useEffect(() => {
    const timer = setTimeout(fetchMovies, 400);
    return () => clearTimeout(timer);
  }, [keyword, currentPage, itemsPerPage, statusFilter, genreFilter, countryFilter]);

  const statusFilters = [
    { value: '', label: 'Tất cả' },
    { value: 'NOW_SHOWING', label: 'Đang chiếu' },
    { value: 'COMING_SOON', label: 'Sắp chiếu' },
    { value: 'DRAFT', label: 'Bản nháp' },
    { value: 'ENDED', label: 'Kết thúc' },
    { value: 'INACTIVE', label: 'Tạm ngưng' },
  ];

  const genreOptions = [
    { value: '', label: 'Tất cả thể loại' },
    ...genresList.map((g) => ({ value: g.uuid, label: g.name })),
  ];

  const countryOptions = [
    { value: '', label: 'Tất cả quốc gia' },
    ...countriesList.map((c) => ({ value: c.uuid, label: `${c.name} (${c.code})` })),
  ];

  const inputClass =
    'w-full rounded-xl bg-[#0f172a] border border-[#242d42] pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all duration-300';

  const kpiStats = [
    {
      label: 'Tổng số phim',
      value: overallStats.total,
      badge: 'trong hệ thống',
      icon: Clapperboard,
      color: 'text-pink-400',
      kpiClass: 'kpi-total',
    },
    {
      label: 'Đang chiếu',
      value: overallStats.nowShowing,
      badge: 'phim đang phát',
      icon: PlayCircle,
      color: 'text-emerald-400',
      kpiClass: 'kpi-showing',
    },
    {
      label: 'Sắp chiếu',
      value: overallStats.comingSoon,
      badge: 'phim sắp ra mắt',
      icon: CalendarClock,
      color: 'text-blue-400',
      kpiClass: 'kpi-upcoming',
    },
    {
      label: 'Nháp / tạm ngưng',
      value: overallStats.inactive,
      badge: 'chưa công khai',
      icon: Archive,
      color: 'text-slate-400',
      kpiClass: 'kpi-hidden',
    },
  ];

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'NOW_SHOWING':
        return 'text-emerald-400';
      case 'COMING_SOON':
        return 'text-blue-400';
      case 'DRAFT':
        return 'text-amber-400';
      case 'ENDED':
        return 'text-gray-500';
      case 'INACTIVE':
        return 'text-rose-400';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Trung tâm nội dung phim"
        variant="display"
        title="Quản lý phim"
        description="Đăng ký, cập nhật và phân loại phim trên hệ thống NASAFilm."
        primaryAction={{
          label: 'Thêm phim',
          icon: <Plus className="w-3.5 h-3.5" />,
          onClick: () => navigate('/admin/movies/new'),
        }}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpiStats.map((kpi) => (
          <div key={kpi.label} className={`kpi-card ${kpi.kpiClass}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500 leading-tight">
                {kpi.label}
              </span>
              <kpi.icon className={`w-4 h-4 ${kpi.color} opacity-60`} />
            </div>
            <p className={`text-xl font-black ${kpi.color} leading-none truncate font-heading`} title={String(kpi.value)}>
              {kpi.value}
            </p>
            <p className="text-[9px] text-gray-500 mt-1.5 leading-none">{kpi.badge}</p>
          </div>
        ))}
      </div>

      <div className="relative z-30 overflow-visible bg-[#1c2333]/50 border border-[#242d42] rounded-2xl p-5 space-y-4 backdrop-blur-md shadow-2xl">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
            <input
              className={`${inputClass} pl-10 pr-8`}
              placeholder="Tìm kiếm tên phim..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 cursor-pointer bg-transparent border-none p-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <FilterDropdown
            label="Tất cả thể loại"
            value={genreFilter}
            options={genreOptions}
            onChange={setGenreFilter}
            searchable
          />

          <FilterDropdown
            label="Tất cả quốc gia"
            value={countryFilter}
            options={countryOptions}
            onChange={setCountryFilter}
            searchable
          />

          {(genreFilter || countryFilter) && (
            <GhostButton type="button" onClick={() => { setGenreFilter(''); setCountryFilter(''); }}>
              Xóa lọc
            </GhostButton>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#242d42]/60">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mr-1">Trạng thái</span>
          {statusFilters.map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => setStatusFilter(pill.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide transition cursor-pointer border ${
                statusFilter === pill.value
                  ? 'bg-red-500/15 text-red-400 border-red-500/30'
                  : 'bg-transparent text-gray-500 border-[#242d42] hover:text-gray-300 hover:border-[#334155]'
              }`}
            >
              {pill.label}
            </button>
          ))}
          <span className="ml-auto text-xs font-medium text-gray-500">{totalMoviesCount} phim</span>
        </div>
      </div>

      <Section title="Danh sách phim" divided titleVariant="admin" className="relative z-0">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse aspect-[2/3] rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        ) : movies.length > 0 ? (
          <>
            <VirtualGrid
              items={movies}
              threshold={12}
              getItemKey={(movie) => movie.uuid}
              renderItem={(movie) => (
                <button
                  key={movie.uuid}
                  type="button"
                  onClick={() => navigate(`/admin/movies/${movie.uuid}`)}
                  className="group text-left cursor-pointer bg-transparent border-none p-0"
                >
                  <div className="relative aspect-[2/3] rounded-[20px] overflow-hidden bg-[#0f172a] mb-2 shadow-[0_15px_35px_rgba(0,0,0,0.35)] transition-transform duration-300 group-hover:scale-[1.02]">
                    {movie.primaryMediaUrl ? (
                      <img
                        src={resolveMediaUrl(movie.primaryMediaUrl, 400)}
                        data-original-url={movie.primaryMediaUrl}
                        alt={movie.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-opacity duration-200 group-hover:opacity-80"
                        onError={handlePosterError}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-gray-700" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white uppercase tracking-wide truncate font-heading group-hover:text-red-400 transition-colors duration-200">
                    {movie.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-2 font-medium">
                    <span className={`font-bold uppercase tracking-wide ${getStatusBadgeClass(movie.status)}`}>
                      {getMovieStatusLabel(movie.status)}
                    </span>
                    {movie.durationMinutes && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {movie.durationMinutes} phút
                        </span>
                      </>
                    )}
                  </p>
                </button>
              )}
            />

            {totalMoviesCount > 0 && (
              <Pagination
                currentPage={currentPage}
                totalItems={totalMoviesCount}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </>
        ) : (
          <div className="py-16 text-center">
            <Film className="w-8 h-8 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider font-heading">Không tìm thấy phim nào</p>
            <p className="text-xs text-gray-600 mt-1">Thử đổi từ khóa hoặc bộ lọc</p>
          </div>
        )}
      </Section>
    </AdminPage>
  );
};

export default MoviesPage;
