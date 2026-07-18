import { useState, useEffect, useLayoutEffect, useRef, useId } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Plus, Film, Clock, ChevronDown, Play, Calendar, Trash2,
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import VirtualGrid from '../../../shared/components/VirtualGrid';
import {
  AdminPage,
  PageHeader,
  AdminKpiGrid,
  StatusBadge,
} from '../components';
import { getMovieStatusLabel } from '../utils/statusLabels';
import { resolveMediaUrl, handlePosterError } from '../../../shared/utils/mediaUrlUtils';
import { useMediaUrlRouting } from '../../../shared/hooks/useMediaUrlRouting';
import './MoviesPage.css';

const FilterDropdown = ({ label, value, options, onChange, searchable = false, className = '' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [coords, setCoords] = useState(null);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const listId = useId();
  const selected = options.find((o) => o.value === value);

  const filteredOptions = searchable && query.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(query.trim().toLowerCase())
      )
    : options;

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuWidth = Math.max(rect.width, 240);
    const gap = 6;
    const pad = 8;
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - pad) {
      left = Math.max(pad, rect.right - menuWidth);
    }

    setCoords({
      top: rect.bottom + gap,
      left,
      width: menuWidth,
      maxHeight: Math.min(280, Math.max(120, window.innerHeight - rect.bottom - gap - pad)),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return undefined;
    }
    updatePosition();
    const onReposition = () => updatePosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, filteredOptions.length]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return undefined;
    }
    if (searchable && searchRef.current) {
      searchRef.current.focus();
    }
    const handleClick = (e) => {
      const target = e.target;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, searchable]);

  const menu =
    open &&
    coords &&
    createPortal(
      <div
        ref={menuRef}
        id={listId}
        className="movies-dd__menu movies-dd__menu--portal"
        role="listbox"
        style={{
          top: coords.top,
          left: coords.left,
          width: coords.width,
          maxHeight: coords.maxHeight,
        }}
      >
        {searchable && (
          <div className="movies-dd__search">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="movies-dd__search-input"
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
                  className="movies-dd__search-clear"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
        <div className="movies-dd__list">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <button
                key={opt.value || '__all__'}
                type="button"
                role="option"
                aria-selected={value === opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`movies-dd__option${value === opt.value ? ' is-selected' : ''}`}
              >
                {opt.label}
              </button>
            ))
          ) : (
            <p className="movies-dd__empty">Không tìm thấy kết quả</p>
          )}
        </div>
      </div>,
      document.body,
    );

  return (
    <div className={`movies-dd ${className}`.trim()} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`movies-dd__trigger${open ? ' is-open' : ''}`}
      >
        <span className="truncate">{selected?.label || label}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {menu}
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [genresList, setGenresList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [genreFilter, setGenreFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const requestIdRef = useRef(0);
  const hasLoadedRef = useRef(false);

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

  useEffect(() => {
    const delay = keyword.trim() ? 280 : 0;
    const timer = setTimeout(() => setDebouncedKeyword(keyword.trim()), delay);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedKeyword]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    const soft = hasLoadedRef.current;
    if (soft) setIsRefreshing(true);
    else setIsLoading(true);

    (async () => {
      try {
        const data = await movieService.getMovies({
          keyword: debouncedKeyword || undefined,
          status: statusFilter || undefined,
          genreUuids: genreFilter ? [genreFilter] : undefined,
          countryUuid: countryFilter || undefined,
          page: currentPage - 1,
          size: itemsPerPage,
        });
        if (requestId !== requestIdRef.current) return;
        if (data?.content) {
          setMovies(data.content);
          setTotalMoviesCount(data.totalElements || data.content.length);
        } else {
          setMovies([]);
          setTotalMoviesCount(0);
        }
        hasLoadedRef.current = true;
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        console.error('Failed to load admin movies list:', err);
        notificationService.error('Không thể tải danh sách phim');
        setMovies([]);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    })();
  }, [debouncedKeyword, currentPage, itemsPerPage, statusFilter, genreFilter, countryFilter]);

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

  const applyStatusFilter = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const applyGenreFilter = (value) => {
    setGenreFilter(value);
    setCurrentPage(1);
  };

  const applyCountryFilter = (value) => {
    setCountryFilter(value);
    setCurrentPage(1);
  };

  const clearExtraFilters = () => {
    setGenreFilter('');
    setCountryFilter('');
    setCurrentPage(1);
  };

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
    ...countriesList.map((c) => ({ value: c.uuid, label: c.name })),
  ];

  const kpiStats = [
    {
      label: 'Tổng phim',
      value: overallStats.total,
      icon: Film,
      kpiClass: 'kpi-total',
    },
    {
      label: 'Đang chiếu',
      value: overallStats.nowShowing,
      icon: Play,
      kpiClass: 'kpi-showing',
    },
    {
      label: 'Sắp chiếu',
      value: overallStats.comingSoon,
      icon: Calendar,
      kpiClass: 'kpi-upcoming',
    },
    {
      label: 'Nháp / tạm ngưng',
      value: overallStats.inactive,
      icon: Trash2,
      kpiClass: 'kpi-hidden',
    },
  ];

  const getStatusVariant = (status) => {
    switch (status) {
      case 'NOW_SHOWING':
        return 'success';
      case 'COMING_SOON':
        return 'info';
      case 'DRAFT':
        return 'warning';
      case 'ENDED':
        return 'muted';
      case 'INACTIVE':
        return 'danger';
      default:
        return 'muted';
    }
  };

  return (
    <AdminPage className="movies-page">
      <PageHeader
        eyebrow="Trung tâm nội dung phim"
        variant="display"
        title="Quản lý phim"
        description="Đăng ký, cập nhật và phân loại phim trên hệ thống NASAFilm."
      />

      <AdminKpiGrid items={kpiStats} />

      <div className="movies-filter">
        <div className="movies-filter__row">
          <div className="movies-filter__search">
            <Search className="movies-filter__search-icon" />
            <input
              className="movies-filter__input"
              placeholder="Tìm kiếm tên phim..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
            {keyword && (
              <button
                type="button"
                onClick={() => setKeyword('')}
                className="movies-filter__clear"
                aria-label="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <FilterDropdown
            label="Tất cả thể loại"
            value={genreFilter}
            options={genreOptions}
            onChange={applyGenreFilter}
            searchable
          />

          <FilterDropdown
            label="Tất cả quốc gia"
            value={countryFilter}
            options={countryOptions}
            onChange={applyCountryFilter}
            searchable
          />

          {(genreFilter || countryFilter) && (
            <button
              type="button"
              className="movies-pill"
              onClick={clearExtraFilters}
            >
              Xóa lọc
            </button>
          )}

          <button
            type="button"
            className="movies-filter__add adm-btn adm-btn--primary"
            onClick={() => navigate('/admin/movies/new')}
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm phim
          </button>
        </div>

        <div className="movies-filter__pills">
          {statusFilters.map((pill) => (
            <button
              key={pill.value || 'all'}
              type="button"
              className={`movies-pill${statusFilter === pill.value ? ' is-active' : ''}`}
              onClick={() => applyStatusFilter(pill.value)}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`movies-results${isRefreshing ? ' is-refreshing' : ''}`}>
        {isLoading ? (
          <div className="movies-grid">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="movies-skeleton" />
            ))}
          </div>
        ) : movies.length > 0 ? (
          <>
            <VirtualGrid
              items={movies}
              threshold={100}
              columns={5}
              estimateRowHeight={380}
              maxHeight="none"
              getItemKey={(movie) => movie.uuid}
              gridClassName="movies-grid"
              renderItem={(movie) => (
                <button
                  key={movie.uuid}
                  type="button"
                  onClick={() => navigate(`/admin/movies/${movie.uuid}`)}
                  className="movies-card"
                >
                  <div className="movies-card__poster">
                    {movie.primaryMediaUrl ? (
                      <img
                        src={resolveMediaUrl(movie.primaryMediaUrl, 400)}
                        data-original-url={movie.primaryMediaUrl}
                        alt={movie.title}
                        loading="lazy"
                        decoding="async"
                        className="movies-card__img"
                        onError={handlePosterError}
                      />
                    ) : (
                      <div className="movies-card__placeholder">
                        <Film className="w-8 h-8" />
                      </div>
                    )}
                    <div className="movies-card__play" aria-hidden="true">
                      <Play className="movies-card__play-icon" fill="currentColor" />
                    </div>
                    <div className="movies-card__fade" aria-hidden="true" />
                    <p className="movies-card__title">{movie.title}</p>
                  </div>
                  <p className="movies-card__meta">
                    <StatusBadge variant={getStatusVariant(movie.status)}>
                      {getMovieStatusLabel(movie.status)}
                    </StatusBadge>
                    {movie.durationMinutes ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        {movie.durationMinutes} phút
                      </span>
                    ) : null}
                  </p>
                </button>
              )}
            />

            {totalMoviesCount > 0 && (
              <div className="mt-8 pt-2">
                <Pagination
                  currentPage={currentPage}
                  totalItems={totalMoviesCount}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                  onItemsPerPageChange={(size) => {
                    setItemsPerPage(size);
                    setCurrentPage(1);
                  }}
                />
              </div>
            )}
          </>
        ) : (
          <div className="movies-empty">
            <Film className="w-9 h-9 mx-auto opacity-50" />
            <p className="movies-empty__title">Không tìm thấy phim nào</p>
            <p className="text-xs mt-1 opacity-70">Thử đổi từ khóa hoặc bộ lọc</p>
          </div>
        )}
      </div>
    </AdminPage>
  );
};

export default MoviesPage;
