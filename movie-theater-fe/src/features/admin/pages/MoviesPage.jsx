import React, { useState, useEffect } from 'react';
import { Film, Play, Calendar, Star, Search, FileText, CheckCircle, AlertCircle, X, Plus } from 'lucide-react';
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

const statusOptions = [
  { value: 'NOW_SHOWING', label: 'Đang chiếu', icon: Play, colorClass: 'status-select-now-showing' },
  { value: 'COMING_SOON', label: 'Sắp chiếu', icon: Calendar, colorClass: 'status-select-coming-soon' },
  { value: 'DRAFT', label: 'Bản nháp', icon: FileText, colorClass: 'status-select-draft' },
  { value: 'ENDED', label: 'Đã kết thúc', icon: CheckCircle, colorClass: 'status-select-ended' },
  { value: 'INACTIVE', label: 'Tạm ngưng', icon: AlertCircle, colorClass: 'status-select-inactive' },
];

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
  const [editingMovie, setEditingMovie] = useState(null);

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
    trailerUrl: ''
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
        const [genresData, countriesData] = await Promise.all([
          movieService.getGenres(),
          movieService.getCountries()
        ]);
        setGenresList(genresData);
        setCountriesList(countriesData);
      } catch (err) {
        console.error("Failed to load metadata in admin movies page:", err);
      }
    };
    fetchMetadata();
  }, []);

  useEffect(() => {
    fetchMovies();
  }, [keyword]);

  const handleDeleteMovie = async (movieUuid, title) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa phim "${title}" không?`)) {
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

  const handleEditClick = async (movieUuid) => {
    try {
      notificationService.info("Đang tải thông tin chi tiết phim...");
      const movieDetail = await movieService.getMovieDetail(movieUuid);
      
      const posterMedia = movieDetail.medias?.find(m => m.mediaType === 'POSTER');
      const backdropMedia = movieDetail.medias?.find(m => m.mediaType === 'BACKDROP');
      const trailerMedia = movieDetail.medias?.find(m => m.mediaType === 'TRAILER');
      
      // Map names returned by API back to UUIDs
      const matchedGenreUuids = [];
      if (movieDetail.genres && genresList.length > 0) {
        movieDetail.genres.forEach(name => {
          const match = genresList.find(g => g.name.toLowerCase() === name.toLowerCase());
          if (match) matchedGenreUuids.push(match.uuid);
        });
      }
      
      const matchedCountryUuids = [];
      if (movieDetail.countries && countriesList.length > 0) {
        movieDetail.countries.forEach(name => {
          const match = countriesList.find(c => c.name.toLowerCase() === name.toLowerCase());
          if (match) matchedCountryUuids.push(match.uuid);
        });
      }

      setFormData({
        title: movieDetail.title || '',
        description: movieDetail.description || '',
        durationMinutes: movieDetail.durationMinutes || '',
        releaseDate: movieDetail.releaseDate || '',
        status: movieDetail.status || 'NOW_SHOWING',
        genreUuids: matchedGenreUuids,
        countryUuids: matchedCountryUuids,
        posterUrl: posterMedia ? posterMedia.mediaUrl : '',
        backdropUrl: backdropMedia ? backdropMedia.mediaUrl : '',
        trailerUrl: trailerMedia ? trailerMedia.mediaUrl : ''
      });
      setEditingMovie(movieDetail);
      setIsModalOpen(true);
    } catch (err) {
      console.error("Failed to load movie detail for editing:", err);
      notificationService.error("Không thể lấy chi tiết phim để sửa");
    }
  };

  const handleAddClick = () => {
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
      trailerUrl: ''
    });
    setEditingMovie(null);
    setIsModalOpen(true);
  };

  const handleGenreCheckboxChange = (genreUuid) => {
    setFormData(prev => {
      const current = prev.genreUuids;
      const next = current.includes(genreUuid)
        ? current.filter(id => id !== genreUuid)
        : [...current, genreUuid];
      return { ...prev, genreUuids: next };
    });
  };

  const handleCountryCheckboxChange = (countryUuid) => {
    setFormData(prev => {
      const current = prev.countryUuids;
      const next = current.includes(countryUuid)
        ? current.filter(id => id !== countryUuid)
        : [...current, countryUuid];
      return { ...prev, countryUuids: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      notificationService.error("Vui lòng nhập tên phim");
      return;
    }
    if (!formData.durationMinutes || Number(formData.durationMinutes) <= 0) {
      notificationService.error("Thời lượng phim phải lớn hơn 0");
      return;
    }
    if (!formData.releaseDate) {
      notificationService.error("Vui lòng nhập ngày khởi chiếu");
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
      medias: medias
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

  const stats = [
    {
      label: 'TỔNG SỐ PHIM',
      value: String(totalMoviesCount),
      sub: 'Tất cả phim trong kho',
      Icon: Film,
      color: 'text-indigo-500',
      bgIcon: 'text-indigo-500/10 group-hover:text-indigo-500/20 group-hover:scale-105',
    },
    {
      label: 'ĐANG CHIẾU',
      value: String(liveMoviesCount),
      sub: 'Đang chiếu tại rạp',
      hasDot: true,
      Icon: Play,
      color: 'text-emerald-500',
      bgIcon: 'text-emerald-500/10 group-hover:text-emerald-500/20 group-hover:scale-105',
    },
    {
      label: 'SẮP CHIẾU',
      value: String(upcomingMoviesCount),
      sub: 'Đã lên lịch khởi chiếu',
      Icon: Calendar,
      color: 'text-amber-500',
      bgIcon: 'text-amber-500/10 group-hover:text-amber-500/20 group-hover:scale-105',
    },
    {
      label: 'ĐÁNH GIÁ TB',
      value: '4.8',
      sub: 'Mục tiêu: Đạt 5.0',
      hasProgress: true,
      progressValue: '96%',
      Icon: Star,
      color: 'text-rose-500',
      bgIcon: 'text-rose-500/10 group-hover:text-rose-500/20 group-hover:scale-105',
    }
  ];

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">NASAFilm Catalog Operations</p>
          <h1 className="admin-title">Quản lý Phim</h1>
          <p className="admin-description">Danh mục kho phim, cấu trúc thể loại, thời lượng và phát sóng.</p>
        </div>
        <button className="admin-add-btn" onClick={handleAddClick}>
          <Plus className="w-4 h-4" />
          Thêm Phim Mới
        </button>
      </div>

      {/* Unified Stats Insight Panel (No-Card Layout, reduced by 60% clutter) */}
      <div className="dashboard-unified-stats-panel bg-[#121826]/70 border border-[#1A2238] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 divide-y md:divide-y-0 md:divide-x divide-[#1A2238] shadow-2xl backdrop-blur-md mb-8">
        {stats.map((card) => (
          <div key={card.label} className="w-full flex items-center justify-between md:justify-center md:px-8 gap-6 py-4 md:py-0">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block">{card.label}</span>
              <h3 className="text-3xl font-black text-white tracking-tight leading-none mt-1">{card.value}</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">
                {card.hasDot && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block mr-1.5" />}
                {card.sub}
              </p>
            </div>
            <div className={`p-3.5 rounded-xl bg-white/5 border border-white/5 ${card.color} shrink-0`}>
              <card.Icon className="w-6 h-6" strokeWidth={1.5} />
            </div>
          </div>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-controls">
          <div className="admin-search-wrapper">
            <Search className="admin-search-icon" />
            <input 
              className="admin-search-input" 
              placeholder="Lọc theo tên phim..." 
              value={keyword}
              onChange={handleSearchChange}
            />
          </div>
          <div className="admin-action-group">
            <button className="admin-action-btn" onClick={() => fetchMovies()}>Làm mới</button>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-thead-tr">
                <th className="pb-3 text-left">Phim</th>
                <th className="pb-3 text-center">Đánh giá / Thời lượng</th>
                <th className="pb-3 text-center">Thể loại</th>
                <th className="pb-3 text-center">Khởi chiếu</th>
                <th className="pb-3 text-center">Trạng thái</th>
                <th className="pb-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">Đang tải danh sách phim...</td>
                </tr>
              ) : movies.length > 0 ? (
                movies.map((row) => {
                  const posterUrl = row.primaryMediaUrl 
                                 || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                  return (
                    <tr key={row.uuid} className="admin-table-tr group">
                      <td className="admin-table-td-name">
                        <div className="admin-table-name-group">
                          <div 
                            onClick={() => handleViewDetail(row.uuid)}
                            className="admin-table-poster-wrapper border border-[#1A2238] rounded-lg overflow-hidden w-12 h-16 shrink-0 bg-black/40 cursor-pointer"
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
                              className="text-white font-bold text-base leading-tight group-hover:text-red-500 transition-colors duration-300 cursor-pointer"
                            >
                              {row.title}
                            </div>
                            <div className="text-xs text-gray-400 mt-1 font-medium max-w-[280px] truncate">{row.description || 'Không có mô tả'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-amber-500 font-bold text-sm">⭐ 4.8</span>
                          <span className="text-[11px] text-gray-400 font-mono">{row.durationMinutes} phút</span>
                        </div>
                      </td>
                      <td className="text-center py-4">
                        <div className="flex flex-wrap items-center justify-center gap-1.5">
                          {row.genres && row.genres.length > 0 ? (
                            row.genres.map((g) => (
                              <span key={g} className="px-2 py-0.5 rounded bg-[#1A2238]/60 border border-[#1A2238] text-[10px] text-gray-300 font-medium whitespace-nowrap">
                                {g}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-xs">N/A</span>
                          )}
                        </div>
                      </td>
                      <td className="text-center text-gray-300 font-semibold text-xs py-4">{row.releaseDate || 'N/A'}</td>
                      <td className="text-center">
                        {(() => {
                          const statusConfig = getStatusConfig(row.status);
                          return (
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusConfig.className}`}>
                              {statusConfig.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="text-center py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => handleEditClick(row.uuid)}
                            className="admin-btn-action-edit"
                          >
                            Sửa
                          </button>
                          <button 
                            onClick={() => handleDeleteMovie(row.uuid, row.title)}
                            className="admin-btn-action-delete"
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
                  <td colSpan="6" className="text-center py-10 text-gray-400">Không tìm thấy bộ phim nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form Add / Edit Movie */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{editingMovie ? 'Chỉnh sửa phim' : 'Thêm mới phim'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Tên phim *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập tên phim..."
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Thời lượng (phút) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Ví dụ: 120"
                    value={formData.durationMinutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Ngày khởi chiếu *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.releaseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Trạng thái *</label>
                <div className="status-select-grid">
                  {statusOptions.map((opt) => {
                    const IconComponent = opt.icon;
                    const isActive = formData.status === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={`status-select-item ${opt.colorClass} ${isActive ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, status: opt.value }))}
                      >
                        {IconComponent && <IconComponent className="w-4 h-4" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả phim</label>
                <textarea
                  className="form-textarea"
                  placeholder="Nhập mô tả chi tiết..."
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label">Poster URL (Ảnh)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com/poster.jpg"
                    value={formData.posterUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, posterUrl: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Backdrop URL (Ảnh nền)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com/backdrop.jpg"
                    value={formData.backdropUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, backdropUrl: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Trailer URL (Video)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="https://example.com/trailer.mp4"
                    value={formData.trailerUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, trailerUrl: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Thể loại</label>
                <div className="checkbox-grid">
                  {genresList.map(genre => (
                    <label key={genre.uuid} className="checkbox-label">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={formData.genreUuids.includes(genre.uuid)}
                        onChange={() => handleGenreCheckboxChange(genre.uuid)}
                      />
                      <span>{genre.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Quốc gia</label>
                <div className="checkbox-grid">
                  {countriesList.map(country => (
                    <label key={country.uuid} className="checkbox-label">
                      <input
                        type="checkbox"
                        className="checkbox-input"
                        checked={formData.countryUuids.includes(country.uuid)}
                        onChange={() => handleCountryCheckboxChange(country.uuid)}
                      />
                      <span>{country.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  Lưu lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Movie Detail Modal */}
      {isDetailModalOpen && selectedDetailMovie && (
        <div className="modal-overlay" onClick={() => setIsDetailModalOpen(false)}>
          <div className="modal-content max-w-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Backdrop Header */}
            <div className="absolute top-0 left-0 w-full h-48 z-0">
              <img 
                src={selectedDetailMovie.medias?.find(m => m.mediaType === 'BACKDROP')?.mediaUrl || selectedDetailMovie.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=600'} 
                alt="Backdrop" 
                className="w-full h-full object-cover brightness-[0.25]"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#121826]" />
            </div>

            {/* Close button */}
            <button 
              className="absolute top-4 right-4 z-20 text-gray-400 hover:text-white p-2 bg-black/40 rounded-full border border-white/10 hover:bg-black/60 transition-colors cursor-pointer"
              onClick={() => setIsDetailModalOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative z-10 pt-24 px-2 space-y-6">
              <div className="flex flex-col sm:flex-row gap-5 items-start">
                {/* Poster */}
                <div className="w-32 h-44 rounded-xl overflow-hidden border-2 border-[#1A2238] shadow-2xl bg-black/40 shrink-0">
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
                <div className="space-y-3 text-left">
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">{selectedDetailMovie.title}</h2>
                  <div className="flex flex-wrap gap-2 items-center text-xs text-gray-300">
                    <span className="text-amber-500 font-bold">⭐ 4.8</span>
                    <span>•</span>
                    <span className="font-mono">{selectedDetailMovie.durationMinutes} phút</span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-bold uppercase">
                      {selectedDetailMovie.status === 'NOW_SHOWING' ? 'Đang chiếu' : selectedDetailMovie.status === 'COMING_SOON' ? 'Sắp chiếu' : 'Bản nháp'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {selectedDetailMovie.genres?.map(g => (
                      <span key={g} className="px-2.5 py-0.5 rounded-md bg-[#1A2238] border border-white/5 text-[10px] text-gray-300 font-bold">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2 text-left">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">Mô tả chi tiết</h3>
                <p className="text-gray-300 text-sm leading-relaxed bg-black/20 p-4 rounded-xl border border-[#1A2238] max-h-32 overflow-y-auto custom-scrollbar">
                  {selectedDetailMovie.description || 'Không có mô tả chi tiết cho bộ phim này.'}
                </p>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 text-left bg-[#0B1020]/50 border border-[#1A2238] p-4 rounded-xl">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Ngày khởi chiếu</span>
                  <span className="text-white text-sm font-semibold">{selectedDetailMovie.releaseDate || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Quốc gia</span>
                  <span className="text-white text-sm font-semibold">{selectedDetailMovie.countries?.join(', ') || 'N/A'}</span>
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex justify-end gap-3 pt-2">
                {selectedDetailMovie.medias?.find(m => m.mediaType === 'TRAILER')?.mediaUrl && (
                  <a 
                    href={selectedDetailMovie.medias.find(m => m.mediaType === 'TRAILER').mediaUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-[#1a2238] hover:bg-white/5 border border-white/10 hover:border-white/20 text-gray-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    Xem Trailer
                  </a>
                )}
                <button 
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    handleEditClick(selectedDetailMovie.uuid);
                  }}
                  className="px-4 py-2.5 bg-red-600 hover:bg-[#d12c2c] text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Chỉnh sửa thông tin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MoviesPage;
