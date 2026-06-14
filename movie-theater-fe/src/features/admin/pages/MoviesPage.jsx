import React, { useState, useEffect } from 'react';
import { Search, X, Plus, User, ShieldAlert, Globe } from 'lucide-react';
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
    backdropUrl: '',
    trailerUrl: '',
    actors: []
  });

  const fetchMovies = async () => {
    setIsLoading(true);
    try {
      const data = await movieService.getMovies({
        keyword: keyword.trim() || undefined,
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

  // Debounce search keyword
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMovies();
    }, 400);
    return () => clearTimeout(timer);
  }, [keyword]);

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
      backdropUrl: '',
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
      const backdrop = detail.medias?.find(m => m.mediaType === 'BACKDROP')?.mediaUrl || '';
      const trailer = detail.medias?.find(m => m.mediaType === 'TRAILER')?.mediaUrl || '';

      setFormData({
        title: detail.title || '',
        description: detail.description || '',
        durationMinutes: detail.durationMinutes || '',
        releaseDate: detail.releaseDate || '',
        status: detail.status || 'NOW_SHOWING',
        genreUuids: detail.genreUuids || [],
        countryUuids: detail.countryUuids || [],
        posterUrl: poster,
        backdropUrl: backdrop,
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
    if (formData.backdropUrl.trim()) {
      medias.push({
        mediaUrl: formData.backdropUrl.trim(),
        mediaType: 'BACKDROP',
        title: `${formData.title.trim()} Backdrop`,
        isPrimary: false,
        sortOrder: 2
      });
    }
    if (formData.trailerUrl.trim()) {
      medias.push({
        mediaUrl: formData.trailerUrl.trim(),
        mediaType: 'TRAILER',
        title: `${formData.title.trim()} Trailer`,
        isPrimary: false,
        sortOrder: 3
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
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs text-white font-bold transition shadow-md cursor-pointer"
            onClick={handleAddClick}
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm Phim Mới
          </button>
        </div>
      </div>

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
                              {row.releaseDate ? row.releaseDate.substring(0, 4) : 'N/A'} · {row.durationMinutes} phút · <span className="text-amber-500 font-bold">⭐ 4.8</span>
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
                        {(() => {
                          const statusConfig = getStatusConfig(row.status);
                          return (
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusConfig.className}`}>
                              {statusConfig.label}
                            </span>
                          );
                        })()}
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
          <div className="relative w-full max-w-xl bg-[#0B0F19] border border-[#1A2238] rounded-xl overflow-hidden shadow-2xl shadow-black/80 p-5 text-left transform scale-100 transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4 border-b border-[#1A2238]/60 pb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {editingMovie ? 'Chỉnh sửa phim' : 'Thêm mới phim'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer animate-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 text-xs">
              {/* SECTION 1: MOVIE INFORMATION */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider border-b border-[#1A2238]/60 pb-1">1. Thông tin phim</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">Tên phim *</label>
                    <input
                      type="text"
                      className="w-full bg-[#070A13] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors"
                      placeholder="Nhập tên phim..."
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">Mô tả phim</label>
                    <textarea
                      className="w-full bg-[#070A13] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors h-20 resize-y"
                      placeholder="Nhập mô tả chi tiết..."
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: RELEASE & STATUS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider border-b border-[#1A2238]/60 pb-1">2. Thông tin phát hành & Trạng thái</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">Thời lượng (phút) *</label>
                    <input
                      type="number"
                      className="w-full bg-[#070A13] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors"
                      placeholder="Ví dụ: 120"
                      value={formData.durationMinutes}
                      onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">Ngày khởi chiếu *</label>
                    <input
                      type="date"
                      className="w-full bg-[#070A13] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors"
                      value={formData.releaseDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">Trạng thái *</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full bg-[#070A13] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors cursor-pointer"
                    >
                      <option value="NOW_SHOWING">🟢 Đang chiếu</option>
                      <option value="COMING_SOON">🔵 Sắp chiếu</option>
                      <option value="DRAFT">⚫ Bản nháp</option>
                      <option value="ENDED">🔴 Đã kết thúc</option>
                      <option value="INACTIVE">🟡 Tạm ngưng</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">Thể loại</label>
                    <div className="max-h-24 overflow-y-auto border border-[#1A2238] rounded-lg p-2 bg-[#070A13]/50 space-y-1.5 custom-scrollbar">
                      {genresList.map(genre => (
                        <label key={genre.uuid} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-[#1A2238] bg-black/40 text-red-600 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                            checked={formData.genreUuids.includes(genre.uuid)}
                            onChange={() => handleGenreCheckboxChange(genre.uuid)}
                          />
                          <span className="text-[11px] text-gray-300">{genre.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">Quốc gia</label>
                    <div className="max-h-24 overflow-y-auto border border-[#1A2238] rounded-lg p-2 bg-[#070A13]/50 space-y-1.5 custom-scrollbar">
                      {countriesList.map(country => (
                        <label key={country.uuid} className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            className="rounded border-[#1A2238] bg-black/40 text-red-600 focus:ring-0 focus:ring-offset-0 w-3 h-3 cursor-pointer"
                            checked={formData.countryUuids.includes(country.uuid)}
                            onChange={() => handleCountryCheckboxChange(country.uuid)}
                          />
                          <span className="text-[11px] text-gray-300">{country.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: MEDIA ASSETS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase text-red-500 tracking-wider border-b border-[#1A2238]/60 pb-1">3. Tài nguyên hình ảnh & Trailer</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">Poster URL</label>
                    <input
                      type="text"
                      className="w-full bg-[#070A13] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors"
                      placeholder="Link ảnh poster..."
                      value={formData.posterUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, posterUrl: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">Backdrop URL</label>
                    <input
                      type="text"
                      className="w-full bg-[#070A13] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors"
                      placeholder="Link ảnh nền..."
                      value={formData.backdropUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, backdropUrl: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-1.5">Trailer URL</label>
                    <input
                      type="text"
                      className="w-full bg-[#070A13] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors"
                      placeholder="Link video trailer..."
                      value={formData.trailerUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, trailerUrl: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: CAST & CHARACTERS */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-[#1A2238]/60 pb-1">
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
                      <div key={index} className="flex items-center gap-2 p-2 rounded bg-[#070A13]/50 border border-[#1A2238]/60">
                        <div className="flex-1">
                          <div
                            onClick={() => handleOpenActorSelector(index)}
                            className="bg-[#070A13] border border-[#1A2238] hover:border-red-500/30 rounded px-2 py-1 text-[11px] text-white cursor-pointer flex items-center justify-between min-h-[30px] transition-colors"
                          >
                            {cast.actorUuid ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-4 h-4 rounded-full overflow-hidden bg-slate-800 shrink-0 flex items-center justify-center border border-white/5">
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
                            className="w-full bg-[#070A13] border border-[#1A2238] rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-red-500/50 transition-colors min-h-[30px]"
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
              <div className="pt-3 border-t border-[#1A2238]/60 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#1A2238] hover:bg-white/5 text-gray-400 hover:text-white text-[11px] font-bold uppercase transition-all cursor-pointer"
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
          <div className="relative w-full max-w-xl bg-[#0B0F19] border border-[#1A2238] rounded-xl overflow-hidden shadow-2xl shadow-black/80 p-5 text-left transform scale-100 transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            {/* Backdrop Header */}
            <div className="absolute top-0 left-0 w-full h-40 z-0">
              <img 
                src={selectedDetailMovie.medias?.find(m => m.mediaType === 'BACKDROP')?.mediaUrl || selectedDetailMovie.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=600'} 
                alt="Backdrop" 
                className="w-full h-full object-cover brightness-[0.2]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0B0F19]" />
            </div>

            {/* Close button */}
            <button 
              className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white p-1.5 bg-black/40 rounded-full border border-white/10 hover:bg-black/60 transition-colors cursor-pointer"
              onClick={() => setIsDetailModalOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 pt-20 space-y-5">
              <div className="flex gap-4 items-start">
                {/* Poster */}
                <div className="w-24 h-32 rounded-lg overflow-hidden border border-[#1A2238] shadow-2xl bg-black/40 shrink-0">
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
                  <h2 className="text-xl font-black text-white leading-tight">{selectedDetailMovie.title}</h2>
                  <div className="flex flex-wrap gap-2 items-center text-[11px] text-gray-400">
                    <span className="text-amber-500 font-bold">⭐ 4.8</span>
                    <span>•</span>
                    <span className="font-mono">{selectedDetailMovie.durationMinutes} phút</span>
                    <span>•</span>
                    <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[9px] text-red-400 font-bold uppercase">
                      {selectedDetailMovie.status === 'NOW_SHOWING' ? 'Đang chiếu' : selectedDetailMovie.status === 'COMING_SOON' ? 'Sắp chiếu' : 'Bản nháp'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedDetailMovie.genres?.map(g => (
                      <span key={g} className="px-2 py-0.5 rounded bg-[#1A2238] border border-white/5 text-[9px] text-gray-300 font-bold">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5 text-left">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Mô tả chi tiết</h3>
                <p className="text-gray-300 text-xs leading-relaxed bg-black/20 p-3 rounded-lg border border-[#1A2238] max-h-24 overflow-y-auto custom-scrollbar">
                  {selectedDetailMovie.description || 'Không có mô tả chi tiết cho bộ phim này.'}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3 text-left bg-[#0B0F19]/50 border border-[#1A2238] p-3 rounded-lg">
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Ngày khởi chiếu</span>
                  <span className="text-white text-xs font-semibold">{selectedDetailMovie.releaseDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block">Quốc gia</span>
                  <span className="text-white text-xs font-semibold">{selectedDetailMovie.countries?.join(', ') || 'N/A'}</span>
                </div>
              </div>

              {/* Cast List */}
              <div className="space-y-2 text-left">
                <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Dàn diễn viên (Cast)</h3>
                {selectedDetailMovie.actors && selectedDetailMovie.actors.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                    {selectedDetailMovie.actors.map((actor, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 p-2 rounded-lg bg-black/20 border border-[#1A2238]">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/5 bg-[#121826] shrink-0 flex items-center justify-center">
                          {actor.avatarUrl ? (
                            <img src={actor.avatarUrl} alt={actor.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div className="space-y-0.5 leading-tight min-w-0">
                          <p className="text-white font-bold text-xs truncate">
                            {actor.fullName}
                            {actor.isMain && (
                              <span className="ml-1 px-1 rounded bg-amber-500/10 border border-amber-500/25 text-[7px] text-amber-400 font-bold uppercase">Chính</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400 truncate">vai {actor.characterName || 'N/A'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 italic bg-black/10 p-2 rounded-lg border border-white/5 text-center">Chưa có thông tin diễn viên cho phim này.</p>
                )}
              </div>

              {/* Action Footer */}
              <div className="flex justify-end gap-2 pt-2 border-t border-[#1A2238]/60">
                {selectedDetailMovie.medias?.find(m => m.mediaType === 'TRAILER')?.mediaUrl && (
                  <a 
                    href={selectedDetailMovie.medias.find(m => m.mediaType === 'TRAILER').mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 bg-[#1a2238] hover:bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
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
          <div className="relative w-full max-w-md bg-[#0B0F19] border border-[#1A2238] rounded-xl overflow-hidden shadow-2xl shadow-black/85 p-5 text-left flex flex-col max-h-[75vh]">
            <div className="flex justify-between items-center mb-4 border-b border-[#1A2238]/60 pb-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Chọn diễn viên</h3>
              <button 
                type="button"
                onClick={() => setIsActorSelectorOpen(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer"
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
                  className="w-full bg-[#070A13] border border-[#1A2238] rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <div>
                <select
                  value={actorCountryFilter}
                  onChange={(e) => setActorCountryFilter(e.target.value)}
                  className="w-full bg-[#070A13] border border-[#1A2238] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-red-500/50 cursor-pointer"
                >
                  <option value="">-- Tất cả quốc tịch --</option>
                  {countriesList.map((c) => (
                    <option key={c.uuid} value={c.uuid} className="bg-[#0B0F19]">
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1.5 pr-1 min-h-[200px]">
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
                          ? 'bg-black/15 border-white/5 opacity-40 cursor-not-allowed'
                          : 'bg-[#070A13]/40 border-white/5 hover:border-red-500/20 hover:bg-[#070A13]/70 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/5 bg-[#0B1020] shrink-0 flex items-center justify-center">
                          {a.avatarUrl ? (
                            <img src={a.avatarUrl} alt={a.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-bold text-xs">{a.fullName}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{a.countryName || 'Không xác định'}</p>
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
