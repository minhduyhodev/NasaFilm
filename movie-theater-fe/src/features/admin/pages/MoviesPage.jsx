import React, { useState, useEffect } from 'react';
import {
  Search, X, Plus, User, ShieldAlert, Globe, Play, Calendar, FileText, Archive, Pause,
  ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal,
  Film, Clock, Eye, Edit2, Users, Trash2, EyeOff
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import './MoviesPage.css';

const getStatusConfig = (status) => {
  switch (status) {
    case 'NOW_SHOWING':
      return {
        label: 'Đang chiếu',
        className: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400',
      };
    case 'COMING_SOON':
      return {
        label: 'Sắp chiếu',
        className: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
      };
    case 'DRAFT':
      return {
        label: 'Bản nháp',
        className: 'bg-zinc-500/10 border-zinc-500/25 text-zinc-400',
      };
    case 'ENDED':
      return {
        label: 'Đã kết thúc',
        className: 'bg-rose-500/10 border-rose-500/25 text-rose-400',
      };
    case 'INACTIVE':
      return {
        label: 'Tạm ngưng',
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Play className="w-3 h-3 fill-emerald-400" /> Đang chiếu
        </span>
      );
    case 'COMING_SOON':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400">
          <Calendar className="w-3 h-3" /> Sắp chiếu
        </span>
      );
    case 'DRAFT':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 border border-gray-500/20 text-gray-400">
          <FileText className="w-3 h-3" /> Bản nháp
        </span>
      );
    case 'ENDED':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400">
          <Archive className="w-3 h-3" /> Đã kết thúc
        </span>
      );
    case 'INACTIVE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
          <Pause className="w-3 h-3 fill-amber-400" /> Tạm ngưng
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/10 border border-gray-500/20 text-gray-400">
          {status}
        </span>
      );
  }
};

const getCardStatusPill = (status) => {
  switch (status) {
    case 'NOW_SHOWING':
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/80 text-white shadow-lg shadow-emerald-500/30 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
          Đang chiếu
        </span>
      );
    case 'COMING_SOON':
      return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/80 text-white shadow-lg shadow-blue-500/30 backdrop-blur-sm">Sắp chiếu</span>;
    case 'DRAFT':
      return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-zinc-600/80 text-white backdrop-blur-sm">Bản nháp</span>;
    case 'ENDED':
      return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-600/80 text-white backdrop-blur-sm">Kết thúc</span>;
    case 'INACTIVE':
      return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/80 text-white backdrop-blur-sm">Tạm ngưng</span>;
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
  const [movies, setMovies] = useState([]);
  const [totalMoviesCount, setTotalMoviesCount] = useState(0);
  const [overallStats, setOverallStats] = useState({ total: 0, nowShowing: 0, comingSoon: 0, inactive: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [genresList, setGenresList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [actorsList, setActorsList] = useState([]);
  const [editingMovie, setEditingMovie] = useState(null);
  const [activeCastIndex, setActiveCastIndex] = useState(null);
  const [isActorSelectorOpen, setIsActorSelectorOpen] = useState(false);
  const [actorSearchTerm, setActorSearchTerm] = useState('');
  const [actorCountryFilter, setActorCountryFilter] = useState('');
  const [isActorCountryDropdownOpen, setIsActorCountryDropdownOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [isGenreFilterOpen, setIsGenreFilterOpen] = useState(false);
  const [isCountryFilterOpen, setIsCountryFilterOpen] = useState(false);
  const [selectedDetailMovie, setSelectedDetailMovie] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleViewDetail = async (movieUuid) => {
    if (!movieUuid) return;
    try {
      notificationService.info("Dang tai thong tin chi tiet phim...");
      const detail = await movieService.getMovieDetail(movieUuid);
      setSelectedDetailMovie(detail);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error("Failed to load movie details:", err);
      notificationService.error("Khong the lay chi tiet phim");
    }
  };

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationMinutes: '',
    releaseDate: '',
    status: 'NOW_SHOWING',
    ageRestriction: 'P',
    genreUuids: [],
    countryUuids: [],
    posterUrl: '',
    streamingUrl: '',
    trailerUrl: '',
    actors: []
  });

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isAgeDropdownOpen, setIsAgeDropdownOpen] = useState(false);

  const ageRestrictionOptions = [
    { value: 'P', label: 'P - Moi lua tuoi' },
    { value: 'K', label: 'K - Duoi 13 tuoi (can co nguoi giam ho)' },
    { value: 'T13', label: 'T13 - Tu 13 tuoi tro len' },
    { value: 'T16', label: 'T16 - Tu 16 tuoi tro len' },
    { value: 'T18', label: 'T18 - Tu 18 tuoi tro len' }
  ];
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
    const firstDayIndex = date.getDay();
    const adjustedFirstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
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
    const currentMonthDaysCount = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= currentMonthDaysCount; i++) {
      days.push({ day: i, month: month, year: year, isCurrentMonth: true });
    }
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
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateString;
  };

  const statusOptions = [
    { value: 'NOW_SHOWING', label: 'Dang chieu', icon: <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" /> },
    { value: 'COMING_SOON', label: 'Sap chieu', icon: <Calendar className="w-3.5 h-3.5 text-blue-500" /> },
    { value: 'DRAFT', label: 'Ban nhap', icon: <FileText className="w-3.5 h-3.5 text-gray-500" /> },
    { value: 'ENDED', label: 'Da ket thuc', icon: <Archive className="w-3.5 h-3.5 text-red-500" /> },
    { value: 'INACTIVE', label: 'Tam ngung', icon: <Pause className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" /> }
  ];

  const currentStatusOption = statusOptions.find(opt => opt.value === formData.status) || statusOptions[0];

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
      console.error("Failed to load overall stats:", err);
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
      console.error("Failed to load admin movies list:", err);
      notificationService.error("Khong the tai danh sach phim");
      setMovies([]);
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleAddClick = () => {
    setEditingMovie(null);
    setFormData({
      title: '',
      description: '',
      durationMinutes: '',
      releaseDate: '',
      status: 'NOW_SHOWING',
      ageRestriction: 'P',
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
      notificationService.info("Dang lay chi tiet phim de chinh sua...");
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
        ageRestriction: detail.ageRestriction || 'P',
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
      notificationService.error("Khong the lay thong tin chi tiet phim de chinh sua");
    }
  };

  const handleDeleteMovie = async (movieUuid, title) => {
    if (window.confirm(`Ban co chac chan muon xoa bo phim "${title}" khong? Hop dong lich chieu lien quan cung se bi anh huong.`)) {
      try {
        await movieService.deleteMovie(movieUuid);
        notificationService.success(`Xoa thanh cong phim "${title}"`);
        fetchMovies();
        fetchOverallStats();
      } catch (err) {
        console.error("Failed to delete movie:", err);
        notificationService.error(err.message || "Xoa phim that bai");
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
      notificationService.error("Ten phim khong duoc de trong");
      return;
    }
    if (!formData.releaseDate) {
      notificationService.error("Ngay khoi chieu khong duoc de trong");
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
      ageRestriction: formData.ageRestriction || 'P',
      genreUuids: formData.genreUuids,
      countryUuids: formData.countryUuids,
      streamingUrl: formData.streamingUrl.trim() || null,
      medias: medias,
      actors: formData.actors.filter(a => a.actorUuid)
    };
    try {
      if (editingMovie) {
        await movieService.updateMovie(editingMovie.uuid, requestData);
        notificationService.success(`Cap nhat thanh cong phim "${requestData.title}"`);
      } else {
        await movieService.createMovie(requestData);
        notificationService.success(`Them moi thanh cong phim "${requestData.title}"`);
      }
      setIsModalOpen(false);
      fetchMovies();
      fetchOverallStats();
    } catch (err) {
      console.error("Failed to save movie:", err);
      notificationService.error(err.message || "Luu phim that bai");
    }
  };

  const handleSearchChange = (e) => {
    setKeyword(e.target.value);
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
      {/* PAGE HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">Hệ Thống Phim Điện Ảnh</p>
          <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">Quản Lý Kho Phim</h1>
          <p className="text-sm text-gray-400 mt-2">
            Đăng ký, cập nhật chi tiết và thiết lập phân loại phim trên hệ thống lưu trữ của NASAFilm.
          </p>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs text-white font-bold transition shadow-md shadow-red-600/20 cursor-pointer shrink-0 self-start md:self-auto"
          onClick={handleAddClick}
        >
          <Plus className="w-4 h-4" /> Thêm Phim Mới
        </button>
      </div>      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6 text-left">
        {[
          { label: 'TỔNG SỐ PHIM', value: overallStats.total, icon: Film, color: 'text-rose-400', kpiClass: 'kpi-total' },
          { label: 'ĐANG CHIẾU', value: overallStats.nowShowing, icon: Play, color: 'text-emerald-400', kpiClass: 'kpi-showing' },
          { label: 'SẮP CHIẾU', value: overallStats.comingSoon, icon: Clock, color: 'text-blue-400', kpiClass: 'kpi-upcoming' },
          { label: 'NHÁP / TẠM NGƯNG', value: hiddenCount, icon: EyeOff, color: 'text-zinc-400', kpiClass: 'kpi-hidden' }
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
      {/* SEARCH + FILTER TOOLBAR */}
      <div className="rounded-xl bg-[#0F1322] border border-[#1A2238] shadow-xl mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-[#1A2238]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
            <input
              className="w-full rounded-lg bg-[#0B0F19] border border-[#1A2238] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Tim kiem ten phim..."
              value={keyword}
              onChange={handleSearchChange}
            />
            {keyword && (
              <button
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
              onClick={() => { setGenreFilter(''); setCountryFilter(''); }}
              className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-red-500/30 bg-red-500/5 hover:bg-red-500/15 text-xs font-bold text-red-400 cursor-pointer transition"
            >
              <X className="w-3 h-3" /> Xoa loc
            </button>
          )}

          <div className="flex-1" />

          <button
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-xs text-white font-bold transition shadow-md shadow-red-600/20 cursor-pointer shrink-0"
            onClick={handleAddClick}
          >
            <Plus className="w-3.5 h-3.5" /> Them Phim Moi
          </button>
        </div>

        <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {statusPills.map((pill) => (
            <button
              key={pill.value}
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

      {/* MOVIE CARDS GRID */}
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
            <div key={movie.uuid} className="group relative cursor-pointer">
              <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-[#0B0F19] border border-[#1A2238] shadow-lg">
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

                  {movie.trailerUrl && (
                    <div className="mb-1.5">
                      <span className="inline-flex items-center gap-1 text-[9px] bg-red-600/80 text-white px-1.5 py-0.5 rounded font-bold">
                        <Play className="w-2 h-2 fill-white" /> TRAILER
                      </span>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleViewDetail(movie.uuid); }}
                      className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-bold rounded-md p-1.5 flex items-center justify-center gap-1 hover:bg-blue-500/30 transition cursor-pointer"
                    >
                      <Eye className="w-2.5 h-2.5" /> Chi tiet
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditClick(movie.uuid); }}
                      className="bg-white/10 border border-white/20 text-white text-[10px] font-bold rounded-md p-1.5 flex items-center justify-center gap-1 hover:bg-white/20 transition cursor-pointer"
                    >
                      <Edit2 className="w-2.5 h-2.5" /> Chinh sua
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleEditClick(movie.uuid); }}
                      className="bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[10px] font-bold rounded-md p-1.5 flex items-center justify-center gap-1 hover:bg-purple-500/30 transition cursor-pointer"
                    >
                      <Users className="w-2.5 h-2.5" /> Dien vien
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteMovie(movie.uuid, movie.title); }}
                      className="bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-bold rounded-md p-1.5 flex items-center justify-center gap-1 hover:bg-rose-500/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-2.5 h-2.5" /> Xoa phim
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs font-bold text-white mt-1.5 truncate px-0.5" title={movie.title}>{movie.title}</p>
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

      {/* PAGINATION */}
      {totalMoviesCount > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalMoviesCount}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}

      {/* MODAL FORM: ADD / EDIT MOVIE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left transform scale-100 transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {editingMovie ? 'Chinh sua phim' : 'Them moi phim'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* SECTION 1 */}
              <div className="space-y-3 text-left">
                <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider border-b border-gray-200 pb-1">1. Thong tin phim</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Ten phim *</label>
                    <input
                      type="text"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors"
                      placeholder="Nhap ten phim..."
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Mo ta phim</label>
                    <textarea
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors h-20 resize-y"
                      placeholder="Nhap mo ta chi tiet..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2 */}
              <div className="space-y-3 text-left">
                <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider border-b border-gray-200 pb-1">2. Thong tin phat hanh &amp; Trang thai</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Thoi luong (phut) *</label>
                    <input
                      type="number"
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors h-[38px]"
                      placeholder="Vi du: 120"
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Ngay khoi chieu *</label>
                    <button
                      type="button"
                      onClick={handleOpenDatePicker}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors h-[38px]"
                    >
                      <span className={`truncate whitespace-nowrap ${formData.releaseDate ? "text-gray-900 font-mono" : "text-gray-400"}`}>
                        {formData.releaseDate ? formatDateDisplay(formData.releaseDate) : "Chon ngay..."}
                      </span>
                      <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                    </button>
                    {isDatePickerOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsDatePickerOpen(false)}></div>
                        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl p-4 animate-dropdown-fade-in w-72">
                          <div className="flex items-center justify-between mb-3.5">
                            <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition cursor-pointer">
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                              {`Thang ${calendarMonth + 1}, ${calendarYear}`}
                            </span>
                            <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition cursor-pointer">
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
                                  className={`py-1.5 text-[11px] rounded-md font-medium transition cursor-pointer ${isSelected ? 'bg-red-600 text-white font-bold' : isToday ? 'border border-red-500/30 text-red-600 font-semibold' : dayObj.isCurrentMonth ? 'text-gray-800 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-50'}`}
                                >
                                  {dayObj.day}
                                </button>
                              );
                            })}
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                            <button type="button" onClick={() => { setFormData(prev => ({ ...prev, releaseDate: '' })); setIsDatePickerOpen(false); }} className="text-[10px] text-gray-500 hover:text-gray-800 font-bold uppercase transition cursor-pointer">Xoa</button>
                            <button type="button" onClick={() => setIsDatePickerOpen(false)} className="text-[10px] text-red-600 hover:text-red-700 font-bold uppercase transition cursor-pointer">Dong</button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Trang thai phim *</label>
                    <button
                      type="button"
                      onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 flex items-center justify-between focus:outline-none focus:border-red-500/50 cursor-pointer h-[38px] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        {currentStatusOption.icon}
                        <span>{currentStatusOption.label}</span>
                      </span>
                      <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    </button>
                    {isStatusDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsStatusDropdownOpen(false)}></div>
                        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 animate-dropdown-fade-in">
                          {statusOptions.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { setFormData(prev => ({ ...prev, status: opt.value })); setIsStatusDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-100 cursor-pointer flex items-center gap-2 ${formData.status === opt.value ? 'text-red-600 font-bold bg-red-50/50' : 'text-gray-700'}`}
                            >
                              {opt.icon}
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="relative">
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Gioi han do tuoi (Age Rating) *</label>
                    <button
                      type="button"
                      onClick={() => setIsAgeDropdownOpen(!isAgeDropdownOpen)}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 flex items-center justify-between focus:outline-none focus:border-red-500/50 cursor-pointer h-[38px] transition-colors"
                    >
                      <span>{ageRestrictionOptions.find(opt => opt.value === formData.ageRestriction)?.label || 'Chon lua tuoi...'}</span>
                      <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                    </button>
                    {isAgeDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsAgeDropdownOpen(false)}></div>
                        <div className="absolute left-0 right-0 z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 animate-dropdown-fade-in">
                          {ageRestrictionOptions.map(opt => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => { setFormData(prev => ({ ...prev, ageRestriction: opt.value })); setIsAgeDropdownOpen(false); }}
                              className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-gray-100 cursor-pointer ${formData.ageRestriction === opt.value ? 'text-red-600 font-bold bg-red-50/50' : 'text-gray-700'}`}
                            >
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* SECTION 3 */}
              <div className="space-y-3 text-left">
                <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider border-b border-gray-200 pb-1">3. Phan loai &amp; Phuong tien</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">The loai phim *</label>
                    <div className="border border-gray-200 rounded-lg p-2.5 max-h-32 overflow-y-auto space-y-1.5 bg-gray-50 custom-scrollbar">
                      {genresList.map(genre => (
                        <label key={genre.uuid} className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" className="rounded text-red-600 focus:ring-red-500 cursor-pointer" checked={formData.genreUuids.includes(genre.uuid)} onChange={() => handleGenreCheckboxChange(genre.uuid)} />
                          <span className="text-gray-700">{genre.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Quoc gia san xuat *</label>
                    <div className="border border-gray-200 rounded-lg p-2.5 max-h-32 overflow-y-auto space-y-1.5 bg-gray-50 custom-scrollbar">
                      {countriesList.map(country => (
                        <label key={country.uuid} className="flex items-center gap-2 cursor-pointer select-none">
                          <input type="checkbox" className="rounded text-red-600 focus:ring-red-500 cursor-pointer" checked={formData.countryUuids.includes(country.uuid)} onChange={() => handleCountryCheckboxChange(country.uuid)} />
                          <span className="text-gray-700">{country.name} ({country.code})</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="space-y-3 mt-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Poster URL *</label>
                    <input type="url" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50" placeholder="https://..." value={formData.posterUrl} onChange={(e) => setFormData(prev => ({ ...prev, posterUrl: e.target.value }))} required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Trailer URL (YouTube)</label>
                      <input type="url" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50" placeholder="https://youtube.com/watch?v=..." value={formData.trailerUrl} onChange={(e) => setFormData(prev => ({ ...prev, trailerUrl: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1.5">Link phim (Streaming URL)</label>
                      <input type="url" className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50" placeholder="Ho tro file .mp4 hoac link stream..." value={formData.streamingUrl} onChange={(e) => setFormData(prev => ({ ...prev, streamingUrl: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4 */}
              <div className="space-y-3 text-left">
                <div className="flex items-center justify-between border-b border-gray-200 pb-1">
                  <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider">4. Dan dien vien (Cast)</h3>
                  <button type="button" onClick={handleAddActorToCast} className="px-2 py-1 bg-red-50 hover:bg-red-100 text-[10px] font-bold text-red-600 rounded border border-red-200 flex items-center gap-1 transition cursor-pointer">
                    <Plus className="w-3 h-3" /> Them vai dien
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  {formData.actors.length === 0 ? (
                    <p className="text-center text-gray-500 italic py-4">Chua co vai dien nao duoc thiet lap.</p>
                  ) : (
                    formData.actors.map((cast, index) => {
                      const matchingActorObj = actorsList.find(a => a.uuid === cast.actorUuid);
                      return (
                        <div key={index} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200">
                          <div className="w-1/3">
                            <button type="button" onClick={() => handleOpenActorSelector(index)} className="w-full text-left px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-gray-800 hover:bg-gray-100 transition truncate cursor-pointer font-bold">
                              {matchingActorObj ? matchingActorObj.fullName : 'Chon dien vien...'}
                            </button>
                          </div>
                          <div className="flex-1">
                            <input type="text" placeholder="Ten vai dien..." className="w-full px-2 py-1.5 bg-gray-50 border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none" value={cast.characterName} onChange={(e) => handleCastFieldChange(index, 'characterName', e.target.value)} />
                          </div>
                          <label className="flex items-center gap-1 cursor-pointer select-none">
                            <input type="checkbox" className="rounded text-red-600 focus:ring-red-500 cursor-pointer" checked={cast.isMain} onChange={(e) => handleCastFieldChange(index, 'isMain', e.target.checked)} />
                            <span className="text-[10px] text-gray-600 font-bold uppercase tracking-wider">Chinh</span>
                          </label>
                          <button type="button" onClick={() => handleRemoveActorFromCast(index)} className="p-1 hover:bg-red-50 hover:text-red-600 rounded text-gray-400 transition cursor-pointer" title="Xoa vai dien">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SUBMIT */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-200 text-left">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-bold rounded-lg transition cursor-pointer">Huy</button>
                <button type="submit" className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition cursor-pointer">Luu phim</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOVIE DETAIL MODAL */}
      {isDetailModalOpen && selectedDetailMovie && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left transform scale-100 transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Chi tiet phim</h2>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-lg font-black text-gray-900 leading-snug uppercase">{selectedDetailMovie.title}</h1>
                  <p className="text-xs text-gray-500 font-mono">ID: {selectedDetailMovie.uuid}</p>
                </div>
                <div className="shrink-0">{getStatusBadge(selectedDetailMovie.status)}</div>
              </div>
              <div className="flex gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <img
                  src={selectedDetailMovie.medias?.find(m => m.mediaType === 'POSTER')?.mediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120'}
                  alt={selectedDetailMovie.title}
                  className="w-16 h-24 object-cover rounded-lg border border-gray-200 shadow-sm shrink-0"
                />
                <div className="space-y-2 leading-relaxed min-w-0 text-left">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-600">
                    <div>
                      <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px] block">Thoi luong</span>
                      <span className="text-gray-900 font-semibold">{selectedDetailMovie.durationMinutes} phut</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px] block">Do tuoi</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-red-100 border border-red-200 text-red-700 inline-block mt-0.5">{selectedDetailMovie.ageRestriction || 'P'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px] block">Khoi chieu</span>
                      <span className="text-gray-900 font-semibold font-mono">{selectedDetailMovie.releaseDate || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-bold text-gray-400 uppercase tracking-wider text-[9px] block">Stream link</span>
                      <span className="text-gray-900 font-semibold truncate block" title={selectedDetailMovie.streamingUrl || 'Chua tich hop'}>
                        {selectedDetailMovie.streamingUrl ? 'San sang' : 'Khong ho tro'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-left">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Mo ta cot truyen</span>
                <p className="text-xs text-gray-700 leading-relaxed bg-gray-50 p-2.5 rounded-lg border border-gray-100 whitespace-pre-wrap">{selectedDetailMovie.description || 'Chua co mo ta chi tiet cho phim nay.'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">The loai</span>
                  <span className="text-gray-900 text-xs font-semibold">{selectedDetailMovie.genres?.join(', ') || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Quoc gia</span>
                  <span className="text-gray-900 text-xs font-semibold">{selectedDetailMovie.countries?.join(', ') || 'N/A'}</span>
                </div>
              </div>
              <div className="space-y-2 text-left">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dan dien vien (Cast)</h3>
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
                              <span className="ml-1 px-1 rounded bg-amber-100 border border-amber-200 text-[7px] text-amber-800 font-bold uppercase">Chinh</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-600 truncate">vai {actor.characterName || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg border border-gray-200 text-center">Chua co thong tin dien vien cho phim nay.</p>
                )}
              </div>
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
                  onClick={() => { setIsDetailModalOpen(false); handleEditClick(selectedDetailMovie.uuid); }}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Chinh sua thong tin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTOR SELECTOR POP-OUT MODAL */}
      {isActorSelectorOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsActorSelectorOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left flex flex-col max-h-[75vh]">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2.5">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Chon dien vien</h3>
              <button type="button" onClick={() => setIsActorSelectorOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Tim dien vien..."
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
                        : 'Tat ca quoc tich'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0 ml-1" />
                  </button>
                  {isActorCountryDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsActorCountryDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1 no-scrollbar animate-dropdown-fade-in">
                        <button type="button" onClick={() => { setActorCountryFilter(''); setIsActorCountryDropdownOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-gray-100 cursor-pointer ${!actorCountryFilter ? 'text-red-600 font-bold bg-red-50/30' : 'text-gray-700'}`}>Tat ca quoc tich</button>
                        {countriesList.map((c) => (
                          <button key={c.uuid} type="button" onClick={() => { setActorCountryFilter(c.uuid); setIsActorCountryDropdownOpen(false); }} className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-gray-100 cursor-pointer ${actorCountryFilter === c.uuid ? 'text-red-600 font-bold bg-red-50/30' : 'text-gray-700'}`}>
                            {c.name} ({c.code})
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-1 min-h-[200px]">
              {filteredActorsForSelector.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-8 italic">Khong tim thay dien vien nao phu hop.</p>
              ) : (
                filteredActorsForSelector.map((a) => {
                  const isAlreadySelected = formData.actors.some(
                    (cast, idx) => cast.actorUuid === a.uuid && idx !== activeCastIndex
                  );
                  return (
                    <div
                      key={a.uuid}
                      onClick={() => !isAlreadySelected && handleSelectActorForCast(a.uuid)}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${isAlreadySelected ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed' : 'bg-gray-50 border-gray-200 hover:border-red-500/20 hover:bg-gray-100 cursor-pointer'}`}
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
                          <p className="text-[10px] text-gray-600 mt-0.5">{a.countryName || 'Khong xac dinh'}</p>
                        </div>
                      </div>
                      {isAlreadySelected ? (
                        <span className="text-[9px] bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded text-red-400 font-bold uppercase">Da chon</span>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-emerald-400 font-bold uppercase">Chon</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoviesPage;
