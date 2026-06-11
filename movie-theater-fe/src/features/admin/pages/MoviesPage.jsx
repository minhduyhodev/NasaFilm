import React, { useState, useEffect } from 'react';
import { Film, Play, Calendar, Star } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import './MoviesPage.css';

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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationMinutes: '',
    releaseDate: '',
    status: 'NOW_SHOWING',
    genreUuids: [],
    countryUuids: [],
    posterUrl: '',
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
      Icon: Film
    },
    {
      label: 'ĐANG CHIẾU',
      value: String(liveMoviesCount),
      sub: 'Đang chiếu tại rạp',
      hasDot: true,
      Icon: Play
    },
    {
      label: 'SẮP CHIẾU',
      value: String(upcomingMoviesCount),
      sub: 'Đã lên lịch khởi chiếu',
      Icon: Calendar
    },
    {
      label: 'ĐÁNH GIÁ TB',
      value: '4.8',
      sub: 'Mục tiêu: Đạt 5.0',
      hasProgress: true,
      progressValue: '96%',
      Icon: Star
    }
  ];

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <h1 className="admin-title">Quản lý Phim</h1>
          <p className="admin-subtitle">Quản lý Kho phim & Danh mục</p>
        </div>
        <button className="admin-add-btn" onClick={handleAddClick}>
          <span className="material-symbols-outlined">add</span>
          Thêm Phim Mới
        </button>
      </div>

      <div className="admin-stats-grid">
        {stats.map((card) => (
          <div key={card.label} className="admin-stat-card group">
            {/* Watermark Icon */}
            <card.Icon className="absolute -right-4 -top-4 w-24 h-24 text-white/5 group-hover:text-white/10 transition-colors duration-300" strokeWidth={1} />

            <div>
              <div className="admin-stat-card-top">
                <p className="admin-stat-label">{card.label}</p>
                <card.Icon className="text-[#6e7191] w-5 h-5" strokeWidth={2} />
              </div>
              <div className="admin-stat-value-group">
                <h3 className="admin-stat-value">{card.value}</h3>
              </div>
            </div>

            <div className="admin-stat-footer">
              {card.hasProgress ? (
                <div className="space-y-2">
                  <div className="admin-progress-bg">
                    <div className="admin-progress-fill" style={{ width: card.progressValue }} />
                  </div>
                  <p className="admin-progress-label">{card.sub}</p>
                </div>
              ) : (
                <p className="admin-stat-desc">
                  {card.hasDot && <span className="admin-stat-desc-dot" />}
                  {card.sub}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="admin-table-card">
        <div className="admin-table-controls">
          <div className="admin-search-wrapper">
            <span className="admin-search-icon">search</span>
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
                <th className="pb-3 text-left">Thể loại</th>
                <th className="pb-3 text-left">Ngày khởi chiếu</th>
                <th className="pb-3 text-left">Trạng thái</th>
                <th className="pb-3 text-left">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-400">Đang tải danh sách phim...</td>
                </tr>
              ) : movies.length > 0 ? (
                movies.map((row) => (
                  <tr key={row.uuid} className="admin-table-tr">
                    <td className="admin-table-td-name">
                      <div className="admin-table-name">{row.title}</div>
                      <div className="admin-table-desc">{row.description ? row.description.substring(0, 50) + '...' : 'Không có mô tả'}</div>
                    </td>
                    <td className="admin-table-td-genre">{row.genres && row.genres.length > 0 ? row.genres.join(' / ') : 'N/A'}</td>
                    <td className="admin-table-td-date">{row.releaseDate || 'N/A'}</td>
                    <td className="py-4 pr-6">
                      <span className={row.status === 'NOW_SHOWING' ? 'admin-badge-live' : 'admin-badge-draft'}>
                        {row.status}
                      </span>
                    </td>
                    <td className="admin-table-actions-td">
                      <button 
                        onClick={() => handleEditClick(row.uuid)}
                        className="text-blue-500 hover:underline mr-3 bg-transparent border-0 cursor-pointer"
                      >
                        Sửa
                      </button>
                      <button 
                        onClick={() => handleDeleteMovie(row.uuid, row.title)}
                        className="text-red-500 hover:underline bg-transparent border-0 cursor-pointer"
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-400">Không tìm thấy bộ phim nào</td>
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
                <span className="material-symbols-outlined">close</span>
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
                <select
                  className="form-select"
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="NOW_SHOWING">NOW_SHOWING (Đang chiếu)</option>
                  <option value="COMING_SOON">COMING_SOON (Sắp chiếu)</option>
                  <option value="DRAFT">DRAFT (Nháp)</option>
                  <option value="ENDED">ENDED (Đã kết thúc)</option>
                  <option value="INACTIVE">INACTIVE (Tạm ngưng)</option>
                </select>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </>
  );
};

export default MoviesPage;
