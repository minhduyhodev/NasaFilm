import React, { useState, useEffect } from 'react';
import { Search, X, Plus, User, ShieldAlert, Globe, Play, Calendar, FileText, Archive, Pause, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import './MoviesPage.css';

const getStatusConfig = (status) => {
  switch (status) {
    case 'NOW_SHOWING':
      return {
        label: '🟢 Đang chiếu',
        className: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
      };
    case 'COMING_SOON':
      return {
        label: '🔵 Sắp chiếu',
        className: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
      };
    case 'DRAFT':
      return {
        label: '⚫ Bản nháp',
        className: 'bg-zinc-500/10 border-zinc-500/25 text-zinc-400',
      };
    case 'ENDED':
      return {
        label: '🔴 Đã kết thúc',
        className: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
      };
    case 'INACTIVE':
      return {
        label: '🟡 Tạm ngưng',
        className: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
      };
    default:
      return {
        label: status || 'N/A',
        className: 'bg-zinc-500/10 border-zinc-500/25 text-zinc-400',
      };
  }
};

const getStatusBadge = (status) => {
  switch (status) {
    case 'NOW_SHOWING':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-emerald-500/10 border-emerald-500/20 text-emerald-600">
          <Play className="w-3 h-3 fill-emerald-600/10" /> Đang chiếu
        </span>
      );
    case 'COMING_SOON':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-blue-500/10 border-blue-500/20 text-blue-600">
          <Calendar className="w-3 h-3" /> Sắp chiếu
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-gray-500/10 border-gray-500/20 text-gray-600">
          <FileText className="w-3 h-3" /> Bản nháp
        </span>
      );
    case 'ENDED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-red-500/10 border-red-500/20 text-red-600">
          <Archive className="w-3 h-3" /> Đã kết thúc
        </span>
      );
    case 'INACTIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-amber-500/10 border-amber-500/20 text-amber-600">
          <Pause className="w-3 h-3 fill-amber-600/10" /> Tạm ngưng
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider border bg-gray-500/10 border-gray-500/20 text-gray-600">
          {status}
        </span>
      );
  }
};

const MoviesPage = () => {
  const [movies, setMovies] = useState([]);
  const [totalMoviesCount, setTotalMoviesCount] = useState(0);
  const [liveMoviesCount, setLiveMoviesCount] = useState(0);
  const [upcomingMoviesCount, setUpcomingMoviesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

  // Form & Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [genresList, setGenresList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [actorsList, setActorsList] = useState([]);
  const [editingMovie, setEditingMovie] = useState(null);

  // Actor Selector Pop-out States
  const [activeCastIndex, setActiveCastIndex] = useState(null);
  const [isActorSelectorOpen, setIsActorSelectorOpen] = useState(false);
  const [actorSearchTerm, setActorSearchTerm] = useState('');
  const [actorCountryFilter, setActorCountryFilter] = useState('');
  const [isActorCountryDropdownOpen, setIsActorCountryDropdownOpen] = useState(false);

  // Movie Filter States
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isGenreFilterOpen, setIsGenreFilterOpen] = useState(false);
  const [isCountryFilterOpen, setIsCountryFilterOpen] = useState(false);

  // Movie Detail Modal States
  const [selectedDetailMovie, setSelectedDetailMovie] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleViewDetail = async (movieUuid) => {
    if (!movieUuid) return;
    try {
      notificationService.info("Đang tải thông tin chi tiết phim...");
      const detail = await movieService.getMovieDetail(movieUuid);
      setSelectedDetailMovie(detail);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error("Failed to load movie details:", err);
      notificationService.error("Không thể lấy chi tiết phim");
    }
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationMinutes: '',
    releaseDate: '',
    status: 'NOW_SHOWING',
    genreUuids: [],
    countryUuids: [],
    posterUrl: '',
    streamingUrl: '',
    trailerUrl: '',
    actors: []
  });

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const handleOpenDatePicker = () => {
    if (formData.releaseDate) {
      const parsedDate = new Date(formData.releaseDate);
      if (!isNaN(parsedDate.getTime())) {
        setCalendarMonth(parsedDate.getMonth());
        setCalendarYear(parsedDate.getFullYear());
      }
    } else {
      const today = new Date();
      setCalendarMonth(today.getMonth());
      setCalendarYear(today.getFullYear());
    }
    setIsDatePickerOpen(true);
  };

  const handlePrevMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 0) {
        setCalendarYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 11) {
        setCalendarYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleSelectDay = (dayObj) => {
    const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
    setFormData(prev => ({ ...prev, releaseDate: dateStr }));
    setIsDatePickerOpen(false);
  };

  const getDaysInMonth = (year, month) => {
    const date = new Date(year, month, 1);
    const days = [];
    const firstDayIndex = date.getDay(); // 0 = Sun, 1 = Mon, ...
    const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    // Previous month's days
    const prevMonthDate = new Date(year, month, 0);
    const prevMonthDaysCount = prevMonthDate.getDate();
    for (let i = adjustedFirstDayIndex - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDaysCount - i,
        month: month === 0 ? 11 : month - 1,
        year: month === 0 ? year - 1 : year,
        isCurrentMonth: false,
      });
    }

    // Current month's days
    const currentMonthDaysCount = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= currentMonthDaysCount; i++) {
      days.push({
        day: i,
        month: month,
        year: year,
        isCurrentMonth: true,
      });
    }

    // Next month's days
    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      days.push({
        day: i,
        month: month === 11 ? 0 : month + 1,
        year: month === 11 ? year + 1 : year,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  const formatDateDisplay = (dateString) => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
    }
    return dateString;
  };

  const statusOptions = [
    { value: 'NOW_SHOWING', label: 'Đang chiếu', icon: <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" /> },
    { value: 'COMING_SOON', label: 'Sắp chiếu', icon: <Calendar className="w-3.5 h-3.5 text-blue-500" /> },
    { value: 'DRAFT', label: 'Bản nháp', icon: <FileText className="w-3.5 h-3.5 text-gray-500" /> },
    { value: 'ENDED', label: 'Đã kết thúc', icon: <Archive className="w-3.5 h-3.5 text-red-500" /> },
    { value: 'INACTIVE', label: 'Tạm ngưng', icon: <Pause className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" /> }
  ];

  const currentStatusOption = statusOptions.find(opt => opt.value === formData.status) || statusOptions[0];

  const fetchMovies = async () => {
    setIsLoading(true);
    try {
      const data = await movieService.getMovies({
        keyword: keyword.trim() || undefined,
        status: statusFilter || undefined,
        genreUuids: genreFilter ? [genreFilter] : undefined,
        countryUuid: countryFilter || undefined,
        size: 100
      });

      if (data && data.content) {
        setMovies(data.content);
        setTotalMoviesCount(data.totalElements || data.content.length);
        
        const live = data.content.filter(m => m.status === 'NOW_SHOWING').length;
        const upcoming = data.content.filter(m => m.status === 'COMING_SOON').length;
        setLiveMoviesCount(live);
        setUpcomingMoviesCount(upcoming);
      } else {
        setMovies([]);
        setTotalMoviesCount(0);
        setLiveMoviesCount(0);
        setUpcomingMoviesCount(0);
      }
    } catch (err) {
      console.error("Failed to load admin movies list:", err);
      notificationService.error("Không thể tải danh sách phim");
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load metadata categories on mount
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [genresData, countriesData, actorsData] = await Promise.all([
          movieService.getGenres(),
          movieService.getCountries(),
          movieService.getActors()
        ]);
        setGenresList(genresData);
        setCountriesList(countriesData);
        setActorsList(actorsData || []);
      } catch (err) {
        console.error("Failed to load metadata in admin movies page:", err);
      }
    };
    fetchMetadata();
  }, []);

  // Debounce search keyword and reload when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovies();
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword, statusFilter, genreFilter, countryFilter]);

  const handleAddClick = () => {
    setEditingMovie(null);
    setFormData({
      title: '',
      description: '',
      durationMinutes: '',
      releaseDate: '',
      status: 'NOW_SHOWING',
      genreUuids: [],
      countryUuids: [],
      posterUrl: '',
      streamingUrl: '',
      trailerUrl: '',
      actors: []
    });
    setIsModalOpen(true);
  };

  const handleEditClick = async (movieUuid) => {
    try {
      notificationService.info("Đang lấy chi tiết phim để chỉnh sửa...");
      const detail = await movieService.getMovieDetail(movieUuid);
      setEditingMovie(detail);

      const poster = detail.medias?.find(m => m.mediaType === 'POSTER')?.mediaUrl || '';
      const trailer = detail.medias?.find(m => m.mediaType === 'TRAILER')?.mediaUrl || '';

      const mappedGenreUuids = detail.genres
        ? genresList.filter(g => detail.genres.includes(g.name)).map(g => g.uuid)
        : [];
      const mappedCountryUuids = detail.countries
        ? countriesList.filter(c => detail.countries.includes(c.name)).map(c => c.uuid)
        : [];

      setFormData({
        title: detail.title || '',
        description: detail.description || '',
        durationMinutes: detail.durationMinutes || '',
        releaseDate: detail.releaseDate || '',
        status: detail.status || 'NOW_SHOWING',
        genreUuids: mappedGenreUuids,
        countryUuids: mappedCountryUuids,
        posterUrl: poster,
        streamingUrl: detail.streamingUrl || '',
        trailerUrl: trailer,
        actors: detail.actors?.map(a => ({
          actorUuid: a.uuid,
          characterName: a.characterName || '',
          isMain: a.isMain || false,
          castOrder: a.castOrder || 0
        })) || []
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error("Failed to load movie for edit:", err);
      notificationService.error("Không thể lấy thông tin chi tiết phim để chỉnh sửa");
    }
  };

  const handleDeleteMovie = async (movieUuid, title) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bộ phim "${title}" không? Hợp đồng lịch chiếu liên quan cũng sẽ bị ảnh hưởng.`)) {
      try {
        await movieService.deleteMovie(movieUuid);
        notificationService.success(`Xóa thành công phim "${title}"`);
        fetchMovies();
      } catch (err) {
        console.error("Failed to delete movie:", err);
        notificationService.error(err.message || "Xóa phim thất bại");
      }
    }
  };

  const handleGenreCheckboxChange = (genreUuid) => {
    setFormData(prev => {
      const exists = prev.genreUuids.includes(genreUuid);
      const nextUuids = exists 
        ? prev.genreUuids.filter(id => id !== genreUuid)
        : [...prev.genreUuids, genreUuid];
      return { ...prev, genreUuids: nextUuids };
    });
  };

  const handleCountryCheckboxChange = (countryUuid) => {
    setFormData(prev => {
      const exists = prev.countryUuids.includes(countryUuid);
      const nextUuids = exists
        ? prev.countryUuids.filter(id => id !== countryUuid)
        : [...prev.countryUuids, countryUuid];
      return { ...prev, countryUuids: nextUuids };
    });
  };

  // Cast Handler
  const handleAddActorToCast = () => {
    setFormData(prev => ({
      ...prev,
      actors: [
        ...prev.actors,
        { actorUuid: '', characterName: '', isMain: false, castOrder: prev.actors.length + 1 }
      ]
    }));
  };

  const handleRemoveActorFromCast = (index) => {
    setFormData(prev => ({
      ...prev,
      actors: prev.actors.filter((_, i) => i !== index)
    }));
  };

  const handleCastFieldChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.actors];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, actors: updated };
    });
  };

  const handleOpenActorSelector = (index) => {
    setActiveCastIndex(index);
    setActorSearchTerm('');
    setActorCountryFilter('');
    setIsActorCountryDropdownOpen(false);
    setIsActorSelectorOpen(true);
  };

  const handleSelectActorForCast = (actorUuid) => {
    if (activeCastIndex === null) return;
    handleCastFieldChange(activeCastIndex, 'actorUuid', actorUuid);
    setIsActorSelectorOpen(false);
  };

  const handleRemoveActorSelect = (index) => {
    handleCastFieldChange(index, 'actorUuid', '');
  };

  const filteredActorsForSelector = actorsList.filter(a => {
    const matchesSearch = a.fullName.toLowerCase().includes(actorSearchTerm.toLowerCase());
    const matchesCountry = actorCountryFilter ? a.countryUuid === actorCountryFilter : true;
    return matchesSearch && matchesCountry;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      notificationService.error("Tên phim không được để trống");
      return;
    }
    if (!formData.releaseDate) {
      notificationService.error("Ngày khởi chiếu không được để trống");
      return;
    }

    const medias = [];
    if (formData.posterUrl.trim()) {
      medias.push({
        mediaUrl: formData.posterUrl.trim(),
        mediaType: 'POSTER',
        title: `${formData.title.trim()} Poster`,
        isPrimary: true,
        sortOrder: 1
      });
    }
    if (formData.trailerUrl.trim()) {
      medias.push({
        mediaUrl: formData.trailerUrl.trim(),
        mediaType: 'TRAILER',
        title: `${formData.title.trim()} Trailer`,
        isPrimary: false,
        sortOrder: 2
      });
    }

    const requestData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      durationMinutes: Number(formData.durationMinutes),
      releaseDate: formData.releaseDate,
      status: formData.status,
      genreUuids: formData.genreUuids,
      countryUuids: formData.countryUuids,
      streamingUrl: formData.streamingUrl.trim() || null,
      medias: medias,
      actors: formData.actors.filter(a => a.actorUuid)
    };

    try {
      if (editingMovie) {
        await movieService.updateMovie(editingMovie.uuid, requestData);
        notificationService.success(`Cập nhật thành công phim "${requestData.title}"`);
      } else {
        await movieService.createMovie(requestData);
        notificationService.success(`Thêm mới thành công phim "${requestData.title}"`);
      }
      setIsModalOpen(false);
      fetchMovies();
    } catch (err) {
      console.error("Failed to save movie:", err);
      notificationService.error(err.message || "Lưu phim thất bại");
    }
  };

  const handleSearchChange = (e) => {
    setKeyword(e.target.value);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Quản lý Phim</h1>
          <p className="text-xs text-gray-400 mt-1">
            Tổng số: <span className="text-white font-bold">{totalMoviesCount}</span> · 
            Đang chiếu: <span className="text-emerald-400 font-bold">{liveMoviesCount}</span> · 
            Sắp chiếu: <span className="text-amber-400 font-bold">{upcomingMoviesCount}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input 
              className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Lọc theo tên phim..." 
              value={keyword}
              onChange={handleSearchChange}
            />
          </div>
          <button
            onClick={() => {
              setIsFilterPanelOpen(!isFilterPanelOpen);
              setIsStatusFilterOpen(false);
              setIsGenreFilterOpen(false);
              setIsCountryFilterOpen(false);
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition duration-150 cursor-pointer ${
              isFilterPanelOpen || statusFilter || genreFilter || countryFilter
                ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'border-[#1A2238] bg-[#0F1322] text-gray-300 hover:bg-[#1A2238]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Lọc
            {(statusFilter || genreFilter || countryFilter) && (
              <span className="flex h-1.5 w-1.5 rounded-full bg-red-500" />
            )}
          </button>
          <button 
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs text-white font-bold transition shadow-md cursor-pointer"
            onClick={handleAddClick}
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm Phim Mới
          </button>
        </div>
      </div>

      {isFilterPanelOpen && (
        <div className="mb-6 p-4 rounded-xl bg-[#0B0F19]/60 border border-[#1A2238] animate-dropdown-fade-in flex flex-wrap gap-4 items-end text-left">
          {/* Status Filter */}
          <div className="flex-1 min-w-[180px] relative">
            <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Trạng thái</label>
            <button
              type="button"
              onClick={() => {
                setIsStatusFilterOpen(!isStatusFilterOpen);
                setIsGenreFilterOpen(false);
                setIsCountryFilterOpen(false);
              }}
              className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-1.5 text-xs text-white flex items-center justify-between cursor-pointer focus:outline-none focus:border-red-500/50 select-none hover:border-[#2C3B5E] transition-colors"
            >
              <span>{statusFilter ? statusOptions.find(opt => opt.value === statusFilter)?.label : 'Tất cả trạng thái'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {isStatusFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsStatusFilterOpen(false)} />
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#0F1322] border border-[#1A2238] rounded-lg shadow-2xl z-50 py-1 no-scrollbar animate-dropdown-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setStatusFilter('');
                      setIsStatusFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer ${
                      !statusFilter ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'
                    }`}
                  >
                    Tất cả trạng thái
                  </button>
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setIsStatusFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer flex items-center gap-2 ${
                        statusFilter === opt.value ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Genre Filter */}
          <div className="flex-1 min-w-[180px] relative">
            <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Thể loại</label>
            <button
              type="button"
              onClick={() => {
                setIsGenreFilterOpen(!isGenreFilterOpen);
                setIsStatusFilterOpen(false);
                setIsCountryFilterOpen(false);
              }}
              className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-1.5 text-xs text-white flex items-center justify-between cursor-pointer focus:outline-none focus:border-red-500/50 select-none hover:border-[#2C3B5E] transition-colors"
            >
              <span className="truncate">{genreFilter ? genresList.find(g => g.uuid === genreFilter)?.name : 'Tất cả thể loại'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {isGenreFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsGenreFilterOpen(false)} />
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#0F1322] border border-[#1A2238] rounded-lg shadow-2xl z-50 py-1 no-scrollbar animate-dropdown-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setGenreFilter('');
                      setIsGenreFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer ${
                      !genreFilter ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'
                    }`}
                  >
                    Tất cả thể loại
                  </button>
                  {genresList.map((g) => (
                    <button
                      key={g.uuid}
                      type="button"
                      onClick={() => {
                        setGenreFilter(g.uuid);
                        setIsGenreFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer ${
                        genreFilter === g.uuid ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'
                      }`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Country Filter */}
          <div className="flex-1 min-w-[180px] relative">
            <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Quốc gia</label>
            <button
              type="button"
              onClick={() => {
                setIsCountryFilterOpen(!isCountryFilterOpen);
                setIsStatusFilterOpen(false);
                setIsGenreFilterOpen(false);
              }}
              className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-1.5 text-xs text-white flex items-center justify-between cursor-pointer focus:outline-none focus:border-red-500/50 select-none hover:border-[#2C3B5E] transition-colors"
            >
              <span className="truncate">{countryFilter ? countriesList.find(c => c.uuid === countryFilter)?.name : 'Tất cả quốc gia'}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>
            {isCountryFilterOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsCountryFilterOpen(false)} />
                <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#0F1322] border border-[#1A2238] rounded-lg shadow-2xl z-50 py-1 no-scrollbar animate-dropdown-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setCountryFilter('');
                      setIsCountryFilterOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer ${
                      !countryFilter ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'
                    }`}
                  >
                    Tất cả quốc gia
                  </button>
                  {countriesList.map((c) => (
                    <button
                      key={c.uuid}
                      type="button"
                      onClick={() => {
                        setCountryFilter(c.uuid);
                        setIsCountryFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-white/[0.04] cursor-pointer ${
                        countryFilter === c.uuid ? 'text-red-400 font-bold bg-red-500/10' : 'text-gray-300'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {(statusFilter || genreFilter || countryFilter) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setGenreFilter('');
                setCountryFilter('');
                setIsStatusFilterOpen(false);
                setIsGenreFilterOpen(false);
                setIsCountryFilterOpen(false);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 text-xs font-bold text-red-400 cursor-pointer h-[34px] transition duration-150"
            >
              <X className="w-3.5 h-3.5" />
              Xóa lọc
            </button>
          )}
        </div>
      )}

      <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] overflow-hidden shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-gray-400 text-[9px] font-bold uppercase tracking-wider border-b border-[#1A2238] bg-white/[0.02]">
                <th className="py-2.5 px-4 text-left">Phim</th>
                <th className="py-2.5 px-4 text-left">Phân loại & Quốc gia</th>
                <th className="py-2.5 px-4 text-center">Khởi chiếu</th>
                <th className="py-2.5 px-4 text-center">Trạng thái</th>
                <th className="py-2.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-400">Đang tải danh sách phim...</td>
                </tr>
              ) : movies.length > 0 ? (
                movies.map((row) => {
                  const posterUrl = row.primaryMediaUrl 
                                 || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                  return (
                    <tr key={row.uuid} className="border-b border-[#1A2238]/60 hover:bg-white/[0.015] transition-colors align-middle group">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => handleViewDetail(row.uuid)}
                            className="border border-[#1A2238] rounded overflow-hidden w-9 h-12 shrink-0 bg-black/40 cursor-pointer"
                          >
                            <img 
                              src={posterUrl} 
                              alt={row.title} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                              }}
                            />
                          </div>
                          <div className="text-left">
                            <div 
                              onClick={() => handleViewDetail(row.uuid)}
                              className="text-white font-bold text-sm leading-tight hover:text-red-500 transition-colors duration-200 cursor-pointer"
                            >
                              {row.title}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5 font-medium">
                              {row.releaseDate ? row.releaseDate.substring(0, 4) : 'N/A'} · {row.durationMinutes} phút
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-left">
                        <div className="flex flex-wrap items-center gap-1">
                          {row.genres && row.genres.length > 0 ? (
                            row.genres.map((g) => (
                              <span key={g} className="px-1.5 py-0.5 rounded bg-[#1A2238]/60 border border-[#1A2238]/80 text-[10px] text-gray-300 font-medium whitespace-nowrap">
                                {g}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-xs">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center text-gray-300 text-xs font-semibold">{row.releaseDate || 'N/A'}</td>
                      <td className="py-2.5 px-4 text-center">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleEditClick(row.uuid)}
                            className="inline-flex items-center justify-center rounded border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-[11px] font-bold text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/30 transition duration-150 cursor-pointer"
                          >
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleDeleteMovie(row.uuid, row.title)}
                            className="inline-flex items-center justify-center rounded border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/15 hover:border-red-500/30 transition duration-150 cursor-pointer"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-400">Không tìm thấy bộ phim nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Add / Edit Movie */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-xl bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left transform scale-100 transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {editingMovie ? 'Chỉnh sửa phim' : 'Thêm mới phim'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer animate-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* SECTION 1: MOVIE INFORMATION */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider border-b border-gray-200 pb-1">1. Thông tin phim</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Tên phim *</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                      placeholder="Nhập tên phim..."
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Mô tả phim</label>
                    <textarea
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors h-20 resize-y"
                      placeholder="Nhập mô tả chi tiết..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: RELEASE & STATUS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider border-b border-gray-200 pb-1">2. Thông tin phát hành & Trạng thái</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Thời lượng (phút) *</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                      placeholder="Ví dụ: 120"
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Ngày khởi chiếu *</label>
                    <button
                      type="button"
                      onClick={handleOpenDatePicker}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors"
                    >
                      <span className={`truncate whitespace-nowrap ${formData.releaseDate ? "text-gray-900 font-mono" : "text-gray-400"}`}>
                        {formData.releaseDate ? formatDateDisplay(formData.releaseDate) : "Chọn ngày..."}
                      </span>
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    </button>

                    {isDatePickerOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsDatePickerOpen(false)}></div>
                        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 animate-dropdown-fade-in w-72">
                          <div className="flex items-center justify-between mb-3.5">
                            <button
                              type="button"
                              onClick={handlePrevMonth}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition cursor-pointer"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              {`Tháng ${calendarMonth + 1}, ${calendarYear}`}
                            </span>
                            <button
                              type="button"
                              onClick={handleNextMonth}
                              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition cursor-pointer"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mb-1.5">
                            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                              <div key={d} className="py-1">{d}</div>
                            ))}
                          </div>

                          <div className="grid grid-cols-7 gap-1 text-center">
                            {getDaysInMonth(calendarYear, calendarMonth).map((dayObj, idx) => {
                              const isSelected = formData.releaseDate === `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                              const today = new Date();
                              const isToday = today.getDate() === dayObj.day && today.getMonth() === dayObj.month && today.getFullYear() === dayObj.year;

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => handleSelectDay(dayObj)}
                                  className={`py-1.5 text-[11px] rounded-md font-medium transition cursor-pointer ${
                                    isSelected
                                      ? 'bg-red-600 text-white font-bold'
                                      : isToday
                                      ? 'border border-red-500/30 text-red-600 font-semibold'
                                      : dayObj.isCurrentMonth
                                      ? 'text-gray-800 hover:bg-gray-100'
                                      : 'text-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {dayObj.day}
                                </button>
                              );
                            })}
                          </div>

                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, releaseDate: '' }));
                                setIsDatePickerOpen(false);
                              }}
                              className="text-[10px] text-gray-500 hover:text-gray-800 font-bold uppercase transition cursor-pointer"
                            >
                              Xóa
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                                setFormData(prev => ({ ...prev, releaseDate: dateStr }));
                                setIsDatePickerOpen(false);
                              }}
                              className="text-[10px] text-red-600 hover:text-red-700 font-bold uppercase transition cursor-pointer"
                            >
                              Hôm nay
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Trạng thái *</label>
                    <button
                      type="button"
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        {currentStatusOption.icon}
                        <span>{currentStatusOption.label}</span>
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500 transition-transform duration-200" style={{ transform: isStatusDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                    </button>

                    {isStatusDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)}></div>
                        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl p-1.5 space-y-0.5 animate-dropdown-fade-in max-h-60 overflow-y-auto custom-scrollbar">
                          {statusOptions.map(option => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, status: option.value }));
                                setIsStatusDropdownOpen(false);
                              }}
                              className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-gray-50 transition text-left text-xs ${formData.status === option.value ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-700'}`}
                            >
                              {option.icon}
                              <span>{option.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Thể loại</label>
                    <div className="max-h-24 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50/50 space-y-1.5 no-scrollbar">
                      {genresList.map(genre => (
                        <label key={genre.uuid} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 bg-white text-red-600 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                            checked={formData.genreUuids.includes(genre.uuid)}
                            onChange={() => handleGenreCheckboxChange(genre.uuid)}
                          />
                          <span className="text-[11px] text-gray-700">{genre.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Quốc gia</label>
                    <div className="max-h-24 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-gray-50/50 space-y-1.5 no-scrollbar">
                      {countriesList.map(country => (
                        <label key={country.uuid} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 bg-white text-red-600 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                            checked={formData.countryUuids.includes(country.uuid)}
                            onChange={() => handleCountryCheckboxChange(country.uuid)}
                          />
                          <span className="text-[11px] text-gray-700">{country.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: MEDIA ASSETS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider border-b border-gray-200 pb-1">3. Tài nguyên hình ảnh & Trailer</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Poster URL</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                      placeholder="Link ảnh poster..."
                      value={formData.posterUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, posterUrl: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Link phim</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                      placeholder="Link xem phim online..."
                      value={formData.streamingUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, streamingUrl: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Trailer URL</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                      placeholder="Link video trailer..."
                      value={formData.trailerUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, trailerUrl: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: CAST & CHARACTERS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-gray-200 pb-1">
                  <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider">4. Dàn diễn viên (Cast)</h3>
                  <button
                    type="button"
                    onClick={handleAddActorToCast}
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Thêm vai diễn
                  </button>
                </div>

                {formData.actors.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic">Chưa có diễn viên nào được thêm vào phim này.</p>
                ) : (
                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                    {formData.actors.map((cast, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 rounded bg-gray-50/50 border border-gray-200">
                        <div className="flex-1">
                          <div
                            onClick={() => handleOpenActorSelector(index)}
                            className="bg-white border border-gray-300 hover:border-red-500/30 rounded px-2 py-1 text-[11px] text-gray-900 cursor-pointer flex items-center justify-between min-h-[30px] transition-colors"
                          >
                            {cast.actorUuid ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center border border-gray-200">
                                  {actorsList.find(a => a.uuid === cast.actorUuid)?.avatarUrl ? (
                                    <img
                                      src={actorsList.find(a => a.uuid === cast.actorUuid).avatarUrl}
                                      alt="actor"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <User className="w-3 h-3 text-gray-500" />
                                  )}
                                </div>
                                <span className="truncate">
                                  {actorsList.find(a => a.uuid === cast.actorUuid)?.fullName || 'Không xác định'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-500">Chọn diễn viên...</span>
                            )}
                            <span className="text-gray-500 text-[8px]">▼</span>
                          </div>
                        </div>

                        <div className="w-32">
                          <input
                            type="text"
                            placeholder="Tên vai..."
                            value={cast.characterName}
                            onChange={(e) => handleCastFieldChange(index, 'characterName', e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-[11px] text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors min-h-[30px]"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveActorFromCast(index)}
                          className="p-1 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-colors cursor-pointer shrink-0"
                          title="Xóa vai diễn"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ACTION BUTTONS */}
              <div className="pt-3 border-t border-gray-200 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  {editingMovie ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movie Detail Modal */}
      {isDetailModalOpen && selectedDetailMovie && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsDetailModalOpen(false)}></div>
          <div className="relative w-full max-w-xl bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left transform scale-100 transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Backdrop Header */}
            <div className="absolute top-0 left-0 w-full h-40 z-0">
              <img 
                src={selectedDetailMovie.medias?.find(m => m.mediaType === 'BACKDROP')?.mediaUrl || selectedDetailMovie.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=600'} 
                alt="Backdrop" 
                className="w-full h-full object-cover brightness-[0.4]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
            </div>

            {/* Close button */}
            <button 
              className="absolute top-4 right-4 z-20 text-gray-500 hover:text-gray-900 p-1.5 bg-white/90 rounded-full border border-gray-200 hover:bg-white transition-colors cursor-pointer"
              onClick={() => setIsDetailModalOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 pt-20 space-y-5">
              <div className="flex gap-4 items-start">
                {/* Poster */}
                <div className="w-24 h-32 rounded-lg overflow-hidden border border-gray-200 shadow-2xl bg-gray-100 shrink-0">
                  <img 
                    src={selectedDetailMovie.medias?.find(m => m.mediaType === 'POSTER')?.mediaUrl || selectedDetailMovie.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120'} 
                    alt={selectedDetailMovie.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                    }}
                  />
                </div>

                {/* Title & Metadata */}
                <div className="space-y-2 text-left pt-2">
                  <h2 className="text-xl font-black text-gray-900 leading-tight">{selectedDetailMovie.title}</h2>
                  <div className="flex flex-wrap gap-2 items-center text-[11px] text-gray-500">
                    <span className="font-mono">{selectedDetailMovie.durationMinutes} phút</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[9px] text-red-400 font-bold uppercase">
                      {selectedDetailMovie.status === 'NOW_SHOWING' ? 'Đang chiếu' : selectedDetailMovie.status === 'COMING_SOON' ? 'Sắp chiếu' : 'Bản nháp'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedDetailMovie.genres?.map(g => (
                      <span key={g} className="px-2 py-0.5 rounded bg-gray-100 border border-gray-200 text-[9px] text-gray-700 font-bold">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 text-left">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Mô tả chi tiết</h3>
                <p className="text-gray-800 text-xs leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200 max-h-24 overflow-y-auto custom-scrollbar">
                  {selectedDetailMovie.description || 'Không có mô tả chi tiết cho bộ phim này.'}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-left bg-gray-50 border border-gray-200 p-3 rounded-lg">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Ngày khởi chiếu</span>
                  <span className="text-gray-900 text-xs font-semibold">{selectedDetailMovie.releaseDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Quốc gia</span>
                  <span className="text-gray-900 text-xs font-semibold">{selectedDetailMovie.countries?.join(', ') || 'N/A'}</span>
                </div>
              </div>

              {/* Cast List */}
              <div className="space-y-2 text-left">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dàn diễn viên (Cast)</h3>
                {selectedDetailMovie.actors && selectedDetailMovie.actors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                    {selectedDetailMovie.actors.map((actor, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 shrink-0 flex items-center justify-center">
                          {actor.avatarUrl ? (
                            <img src={actor.avatarUrl} alt={actor.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div className="space-y-0.5 leading-tight min-w-0">
                          <p className="text-gray-900 font-bold text-xs truncate">
                            {actor.fullName}
                            {actor.isMain && (
                              <span className="ml-1 px-1 rounded bg-amber-100 border border-amber-200 text-[7px] text-amber-800 font-bold uppercase">Chính</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-600 truncate">vai {actor.characterName || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg border border-gray-200 text-center">Chưa có thông tin diễn viên cho phim này.</p>
                )}
              </div>

              {/* Action Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                {selectedDetailMovie.medias?.find(m => m.mediaType === 'TRAILER')?.mediaUrl && (
                  <a 
                    href={selectedDetailMovie.medias.find(m => m.mediaType === 'TRAILER').mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    Xem Trailer
                  </a>
                )}
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleEditClick(selectedDetailMovie.uuid);
                  }}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Chỉnh sửa thông tin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actor Selector Pop-out Modal */}
      {isActorSelectorOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsActorSelectorOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left flex flex-col max-h-[75vh]">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2.5">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Chọn diễn viên</h3>
              <button 
                type="button"
                onClick={() => setIsActorSelectorOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Tìm diễn viên..."
                  value={actorSearchTerm}
                  onChange={(e) => setActorSearchTerm(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-300 rounded-lg pl-8 pr-2 py-1.5 text-xs text-gray-900 placeholder-gray-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsActorCountryDropdownOpen(!isActorCountryDropdownOpen)}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 flex items-center justify-between focus:outline-none focus:border-red-500/50 cursor-pointer select-none"
                  >
                    <span className="truncate">
                      {actorCountryFilter
                        ? `${countriesList.find(c => c.uuid === actorCountryFilter)?.name} (${countriesList.find(c => c.uuid === actorCountryFilter)?.code})`
                        : 'Tất cả quốc tịch'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0 ml-1" />
                  </button>
                  {isActorCountryDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsActorCountryDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 no-scrollbar animate-dropdown-fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            setActorCountryFilter('');
                            setIsActorCountryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-gray-100 cursor-pointer ${
                            !actorCountryFilter ? 'text-red-600 font-bold bg-red-50/30' : 'text-gray-700'
                          }`}
                        >
                          Tất cả quốc tịch
                        </button>
                        {countriesList.map((c) => (
                          <button
                            key={c.uuid}
                            type="button"
                            onClick={() => {
                              setActorCountryFilter(c.uuid);
                              setIsActorCountryDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-gray-100 cursor-pointer ${
                              actorCountryFilter === c.uuid ? 'text-red-600 font-bold bg-red-50/30' : 'text-gray-700'
                            }`}
                          >
                            {c.name} ({c.code})
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-1 min-h-[200px]">
              {filteredActorsForSelector.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-8 italic">Không tìm thấy diễn viên nào phù hợp.</p>
              ) : (
                filteredActorsForSelector.map((a) => {
                  const isAlreadySelected = formData.actors.some(
                    (cast, idx) => cast.actorUuid === a.uuid && idx !== activeCastIndex
                  );
                  return (
                    <div
                      key={a.uuid}
                      onClick={() => !isAlreadySelected && handleSelectActorForCast(a.uuid)}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                        isAlreadySelected
                          ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                          : 'bg-gray-50 border-gray-200 hover:border-red-500/20 hover:bg-gray-100 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-100 shrink-0 flex items-center justify-center">
                          {a.avatarUrl ? (
                            <img src={a.avatarUrl} alt={a.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-gray-900 font-bold text-xs">{a.fullName}</p>
                          <p className="text-[10px] text-gray-600 mt-0.5">{a.countryName || 'Không xác định'}</p>
                        </div>
                      </div>
                      {isAlreadySelected ? (
                        <span className="text-[9px] bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded text-red-400 font-bold uppercase">Đã chọn</span>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-emerald-400 font-bold uppercase">Chọn</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MoviesPage;
