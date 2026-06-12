import React, { useState, useEffect } from 'react';
import { Film, SlidersHorizontal, Download, Search, Edit2, Trash2, Calendar, Tv, Clock, Activity, X } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import './ShowtimesPage.css';

const ShowtimesPage = () => {
  const [movies, setMovies] = useState([]);
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShowtime, setEditingShowtime] = useState(null);
  const [isMovieDropdownOpen, setIsMovieDropdownOpen] = useState(false);
  const [searchMovieKeyword, setSearchMovieKeyword] = useState('');

  const [showtimesList, setShowtimesList] = useState([
    { id: 1, title: 'Neon Genesis: Redemption', moviePoster: '', cinema: 'Hall 3', time: '19:30', screen: 'IMAX', status: 'Live' },
    { id: 2, title: 'Echoes of the Summit', moviePoster: '', cinema: 'Hall 1', time: '16:00', screen: 'Standard', status: 'Scheduled' },
    { id: 3, title: 'The Attic Watcher', moviePoster: '', cinema: 'Hall 2', time: '22:00', screen: 'Horror Room', status: 'Draft' },
    { id: 4, title: 'Midnight Heist', moviePoster: '', cinema: 'Hall 5', time: '21:15', screen: 'VIP', status: 'Live' },
  ]);

  const [formData, setFormData] = useState({
    movieUuid: '',
    cinema: 'Hall 1',
    time: '12:00',
    screen: 'Standard',
    status: 'Scheduled',
  });

  // Fetch movies from backend to populate select dropdown and list showtimes
  useEffect(() => {
    const fetchMoviesAndInit = async () => {
      setIsLoadingMovies(true);
      try {
        const data = await movieService.getMovies({ size: 100 });
        if (data && data.content) {
          setMovies(data.content);
          
          // Initialize mock showtimes with database movies if available
          const dbMovies = data.content;
          if (dbMovies.length > 0) {
            const initialShowtimes = [
              { id: 1, title: dbMovies[0]?.title || 'Neon Genesis: Redemption', movieUuid: dbMovies[0]?.uuid, moviePoster: dbMovies[0]?.primaryMediaUrl, cinema: 'Hall 3', time: '19:30', screen: 'IMAX', status: 'Live' },
              { id: 2, title: dbMovies[1]?.title || dbMovies[0]?.title || 'Echoes of the Summit', movieUuid: dbMovies[1]?.uuid || dbMovies[0]?.uuid, moviePoster: dbMovies[1]?.primaryMediaUrl || dbMovies[0]?.primaryMediaUrl, cinema: 'Hall 1', time: '16:00', screen: 'Standard', status: 'Scheduled' },
              { id: 3, title: dbMovies[2]?.title || dbMovies[0]?.title || 'The Attic Watcher', movieUuid: dbMovies[2]?.uuid || dbMovies[0]?.uuid, moviePoster: dbMovies[2]?.primaryMediaUrl || dbMovies[0]?.primaryMediaUrl, cinema: 'Hall 2', time: '22:00', screen: 'Horror Room', status: 'Draft' },
              { id: 4, title: dbMovies[3]?.title || dbMovies[0]?.title || 'Midnight Heist', movieUuid: dbMovies[3]?.uuid || dbMovies[0]?.uuid, moviePoster: dbMovies[3]?.primaryMediaUrl || dbMovies[0]?.primaryMediaUrl, cinema: 'Hall 5', time: '21:15', screen: 'VIP', status: 'Live' },
            ];
            setShowtimesList(initialShowtimes);
          }
        }
      } catch (error) {
        console.error('Failed to fetch movies from BE:', error);
      } finally {
        setIsLoadingMovies(false);
      }
    };
    fetchMoviesAndInit();
  }, []);

  const cards = [
    {
      label: 'HÔM NAY',
      value: showtimesList.filter(s => s.status === 'Live').length.toString(),
      sub: 'Suất chiếu hoạt động',
      Icon: Clock,
      color: 'text-rose-500',
    },
    {
      label: 'SẮP CHIẾU',
      value: showtimesList.filter(s => s.status === 'Scheduled').length.toString(),
      sub: 'Trong 3 ngày tới',
      Icon: Calendar,
      color: 'text-emerald-500',
    },
    {
      label: 'PHÒNG CHIẾU',
      value: '18',
      sub: 'Số phòng khả dụng',
      Icon: Tv,
      color: 'text-amber-500',
    },
    {
      label: 'TỶ LỆ LẤP ĐẦY',
      value: '76%',
      sub: 'Tỷ lệ đặt vé trung bình',
      Icon: Activity,
      color: 'text-sky-500',
    },
  ];

  const handleAddClick = () => {
    setEditingShowtime(null);
    setFormData({
      movieUuid: movies[0]?.uuid || '',
      cinema: 'Hall 1',
      time: '12:00',
      screen: 'Standard',
      status: 'Scheduled',
    });
    setIsMovieDropdownOpen(false);
    setSearchMovieKeyword('');
    setIsModalOpen(true);
  };

  const handleEditClick = (showtime) => {
    setEditingShowtime(showtime);
    const matchingMovie = movies.find(m => m.title === showtime.title || m.uuid === showtime.movieUuid);
    setFormData({
      movieUuid: matchingMovie?.uuid || '',
      cinema: showtime.cinema,
      time: showtime.time,
      screen: showtime.screen,
      status: showtime.status,
    });
    setIsMovieDropdownOpen(false);
    setSearchMovieKeyword('');
    setIsModalOpen(true);
  };

  const handleDeleteClick = (id, title) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa lịch chiếu của phim "${title}"?`)) {
      setShowtimesList(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedMovie = movies.find(m => m.uuid === formData.movieUuid);
    const movieTitle = selectedMovie ? selectedMovie.title : 'Chưa chọn phim';
    const moviePoster = selectedMovie ? selectedMovie.primaryMediaUrl : '';

    if (editingShowtime) {
      setShowtimesList(prev => prev.map(s => s.id === editingShowtime.id ? {
        ...s,
        title: movieTitle,
        movieUuid: formData.movieUuid,
        moviePoster,
        cinema: formData.cinema,
        time: formData.time,
        screen: formData.screen,
        status: formData.status,
      } : s));
    } else {
      const newShowtime = {
        id: Date.now(),
        title: movieTitle,
        movieUuid: formData.movieUuid,
        moviePoster,
        cinema: formData.cinema,
        time: formData.time,
        screen: formData.screen,
        status: formData.status,
      };
      setShowtimesList(prev => [newShowtime, ...prev]);
    }
    setIsModalOpen(false);
  };

  const filteredShowtimes = showtimesList.filter(row => 
    row.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.cinema.toLowerCase().includes(searchTerm.toLowerCase()) ||
    row.screen.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMovies = movies.filter(movie => 
    movie.title.toLowerCase().includes(searchMovieKeyword.toLowerCase())
  );

  const selectedMovie = movies.find(m => m.uuid === formData.movieUuid);

  return (
    <>
      <div className="admin-header-container">
        <div className="admin-header-info">
          <p className="admin-subtitle">NASAFilm Show Scheduling</p>
          <h1 className="admin-title">Lịch Chiếu Phim</h1>
          <p className="admin-description">
            Lên lịch các suất chiếu phim, cập nhật thời gian chiếu và theo dõi tỷ lệ lấp đầy phòng chiếu theo thời gian thực.
          </p>
        </div>
        <button className="admin-add-btn" onClick={handleAddClick}>
          <span className="admin-add-btn-plus">+</span>
          <div className="admin-add-btn-label-group">
            <div className="admin-add-btn-sub">Thêm mới</div>
            <div className="admin-add-btn-main">Lịch Chiếu</div>
          </div>
        </button>
      </div>

      {/* Unified Stats Insight Panel (No-Card Layout, reduced by 60% clutter) */}
      <div className="dashboard-unified-stats-panel bg-[#121826]/70 border border-[#1A2238] rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 divide-y md:divide-y-0 md:divide-x divide-[#1A2238] shadow-2xl backdrop-blur-md mb-8">
        {cards.map((card) => (
          <div key={card.label} className="w-full flex items-center justify-between md:justify-center md:px-8 gap-6 py-4 md:py-0">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 block">{card.label}</span>
              <h3 className="text-3xl font-black text-white tracking-tight leading-none mt-1">{card.value}</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">
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
              placeholder="Tìm kiếm lịch chiếu, rạp chiếu hoặc phim..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="admin-action-group">
            <button className="admin-action-btn">
              <SlidersHorizontal className="w-4 h-4" />
              Bộ lọc
            </button>
            <button className="admin-action-btn">
              <Download className="w-4 h-4" />
              Xuất file
            </button>
          </div>
        </div>

        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr className="admin-table-thead-tr">
                <th className="pb-3 text-left">Phim</th>
                <th className="pb-3 text-center">Rạp / Phòng</th>
                <th className="pb-3 text-center">Thời gian</th>
                <th className="pb-3 text-center">Màn hình</th>
                <th className="pb-3 text-center">Trạng thái</th>
                <th className="pb-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredShowtimes.length > 0 ? (
                filteredShowtimes.map((row) => {
                  const matchingMovie = movies.find(m => m.title === row.title || m.uuid === row.movieUuid);
                  const posterUrl = matchingMovie?.primaryMediaUrl || row.moviePoster || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                  
                  return (
                    <tr key={row.id || row.title} className="admin-table-tr group">
                      <td className="admin-table-td-showtime py-4">
                        <div className="flex items-center gap-3">
                          <div className="admin-table-poster-wrapper border border-[#1A2238] rounded-lg overflow-hidden w-12 h-16 shrink-0 bg-black/40">
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
                            <div className="text-white font-bold text-base leading-tight group-hover:text-red-500 transition-colors duration-300">{row.title}</div>
                            <div className="text-xs text-gray-400 mt-1 font-medium">Bản Chiếu Chuẩn</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center text-gray-300 font-bold py-4">{row.cinema}</td>
                      <td className="text-center text-gray-300 font-bold py-4">{row.time}</td>
                      <td className="text-center text-gray-300 py-4">
                        <span className="px-2 py-0.5 rounded bg-[#1A2238]/60 border border-[#1A2238] text-xs text-gray-300 font-semibold">{row.screen}</span>
                      </td>
                      <td className="py-4 text-center">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            row.status === 'Live'
                              ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                              : row.status === 'Scheduled'
                              ? 'bg-blue-500/10 border-blue-500/25 text-blue-400'
                              : 'bg-zinc-500/10 border-zinc-500/25 text-zinc-400'
                          }`}
                        >
                          {row.status === 'Live'
                            ? '🟢 Đang Chiếu'
                            : row.status === 'Scheduled'
                            ? '🔵 Đã Lên Lịch'
                            : '⚫ Nháp'}
                        </span>
                      </td>
                      <td className="text-center py-4">
                        <div className="flex items-center justify-center gap-3">
                          <button className="admin-btn-action-edit" title="Sửa" onClick={() => handleEditClick(row)}>
                            Sửa
                          </button>
                          <button className="admin-btn-action-delete" title="Xóa" onClick={() => handleDeleteClick(row.id || row.title, row.title)}>
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-gray-400">Không tìm thấy suất chiếu nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Showtime */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 className="modal-title">{editingShowtime ? 'Chỉnh sửa lịch chiếu' : 'Thêm mới lịch chiếu'}</h2>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Custom Movie Selection with Poster Preview */}
              <div className="form-group">
                <label className="form-label">Chọn Phim từ Cơ sở dữ liệu *</label>
                <div className="relative">
                  <button
                    type="button"
                    className="form-select flex items-center justify-between text-left cursor-pointer w-full"
                    onClick={() => setIsMovieDropdownOpen(!isMovieDropdownOpen)}
                  >
                    <span className="truncate">{selectedMovie ? selectedMovie.title : 'Chọn phim...'}</span>
                    <span className="material-symbols-outlined text-gray-500 text-sm">arrow_drop_down</span>
                  </button>

                  {isMovieDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto p-2 space-y-1">
                      <div className="p-2 border-b border-gray-100 flex items-center gap-2 mb-1">
                        <Search className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Tìm nhanh tên phim..."
                          className="w-full text-sm outline-none border-none bg-transparent"
                          value={searchMovieKeyword}
                          onChange={(e) => setSearchMovieKeyword(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>

                      {isLoadingMovies ? (
                        <div className="text-center py-4 text-xs text-gray-400">Đang tải danh sách phim...</div>
                      ) : filteredMovies.length > 0 ? (
                        filteredMovies.map(movie => (
                          <button
                            key={movie.uuid}
                            type="button"
                            className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition text-left ${formData.movieUuid === movie.uuid ? 'bg-red-50 text-red-600' : ''}`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, movieUuid: movie.uuid }));
                              setIsMovieDropdownOpen(false);
                              setSearchMovieKeyword('');
                            }}
                          >
                            <img
                              src={movie.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120'}
                              alt={movie.title}
                              className="w-8 h-12 object-cover rounded shadow-sm shrink-0"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                              }}
                            />
                            <div className="overflow-hidden">
                              <div className="font-bold text-xs text-gray-900 truncate">{movie.title}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{movie.durationMinutes} phút | {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}</div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-gray-400">Không tìm thấy bộ phim nào</div>
                      )}
                    </div>
                  )}
                </div>

                {/* Selected Movie Image and Information Preview */}
                {selectedMovie && (
                  <div className="flex items-center gap-4 p-3.5 bg-gray-50 rounded-lg border border-gray-200 mt-2">
                    <img
                      src={selectedMovie.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120'}
                      alt={selectedMovie.title}
                      className="w-14 h-20 object-cover rounded shadow-sm border border-gray-200 shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                      }}
                    />
                    <div className="overflow-hidden">
                      <div className="font-bold text-gray-900 truncate text-sm">{selectedMovie.title}</div>
                      <div className="text-xs text-gray-500 mt-1 font-semibold">
                        Thời lượng: {selectedMovie.durationMinutes} phút
                      </div>
                      {selectedMovie.genres && selectedMovie.genres.length > 0 && (
                        <div className="text-[11px] text-red-600 bg-red-50 border border-red-100 rounded px-2 py-0.5 inline-block mt-2 font-bold uppercase tracking-wider">
                          {selectedMovie.genres.join(' / ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Phòng / Rạp chiếu *</label>
                  <select
                    className="form-select"
                    value={formData.cinema}
                    onChange={(e) => setFormData(prev => ({ ...prev, cinema: e.target.value }))}
                    required
                  >
                    <option value="Hall 1">Hall 1</option>
                    <option value="Hall 2">Hall 2</option>
                    <option value="Hall 3">Hall 3</option>
                    <option value="Hall 5">Hall 5</option>
                    <option value="Hall 6">Hall 6</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Thời gian chiếu *</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Loại màn hình *</label>
                  <select
                    className="form-select"
                    value={formData.screen}
                    onChange={(e) => setFormData(prev => ({ ...prev, screen: e.target.value }))}
                    required
                  >
                    <option value="Standard">Standard (2D)</option>
                    <option value="IMAX">IMAX 3D</option>
                    <option value="VIP">VIP Lounge</option>
                    <option value="Horror Room">Horror Special</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Trạng thái *</label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    required
                  >
                    <option value="Live">Đang Chiếu (Live)</option>
                    <option value="Scheduled">Đã Lên Lịch (Scheduled)</option>
                    <option value="Draft">Nháp (Draft)</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn-submit">
                  Lưu Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ShowtimesPage;
