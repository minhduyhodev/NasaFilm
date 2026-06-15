import React, { useState, useEffect } from 'react';
import { Film, SlidersHorizontal, Download, Search, Edit2, Trash2, Calendar, Tv, Clock, Activity, X, ChevronDown, Play, Pause, FileText } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
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

  // Movie Detail Modal States
  const [selectedDetailMovie, setSelectedDetailMovie] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleViewDetail = async (movieUuid) => {
    if (!movieUuid) return;
    try {
      const detail = await movieService.getMovieDetail(movieUuid);
      setSelectedDetailMovie(detail);
      setIsDetailModalOpen(true);
    } catch (error) {
      console.error("Failed to load movie details:", error);
    }
  };

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

  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  const statusOptions = [
    { value: 'Live', label: 'Đang Chiếu (Live)', icon: <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" /> },
    { value: 'Scheduled', label: 'Đã Lên Lịch (Scheduled)', icon: <Calendar className="w-3.5 h-3.5 text-blue-500" /> },
    { value: 'Draft', label: 'Nháp (Draft)', icon: <FileText className="w-3.5 h-3.5 text-gray-500" /> }
  ];

  const currentStatusOption = statusOptions.find(opt => opt.value === formData.status) || statusOptions[0];

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Lịch Chiếu Phim</h1>
          <p className="text-xs text-gray-400 mt-1">
            Đang chiếu: <span className="text-emerald-400 font-bold">{showtimesList.filter(s => s.status === 'Live').length}</span> · 
            Sắp chiếu: <span className="text-blue-400 font-bold">{showtimesList.filter(s => s.status === 'Scheduled').length}</span> · 
            Phòng khả dụng: <span className="text-white font-bold">18</span> · 
            Tỷ lệ lấp đầy: <span className="text-sky-400 font-bold">76%</span>
          </p>
        </div>
        <button 
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3.5 py-1.5 text-xs text-white font-bold transition shadow-md cursor-pointer"
          onClick={handleAddClick}
        >
          Thêm Lịch Chiếu Mới
        </button>
      </div>

      <div className="rounded-xl bg-[#0B0F19]/50 border border-[#1A2238] overflow-hidden shadow-xl backdrop-blur-md">
        {/* Controls Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 gap-3 border-b border-[#1A2238]">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Tìm kiếm lịch chiếu, phòng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-1.5 text-[11px] text-gray-300 font-bold hover:text-white hover:bg-white/5 transition-all cursor-pointer">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Bộ lọc
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F1322] border border-[#1A2238] px-3 py-1.5 text-[11px] text-gray-300 font-bold hover:text-white hover:bg-white/5 transition-all cursor-pointer">
              <Download className="w-3.5 h-3.5" />
              Xuất file
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-gray-400 text-[9px] font-bold uppercase tracking-wider border-b border-[#1A2238] bg-white/[0.02]">
                <th className="py-2.5 px-4 text-left">Phim</th>
                <th className="py-2.5 px-4 text-center">Rạp / Phòng</th>
                <th className="py-2.5 px-4 text-center">Thời gian</th>
                <th className="py-2.5 px-4 text-center">Màn hình</th>
                <th className="py-2.5 px-4 text-center">Trạng thái</th>
                <th className="py-2.5 px-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2238]/40">
              {filteredShowtimes.length > 0 ? (
                filteredShowtimes.map((row) => {
                  const matchingMovie = movies.find(m => m.title === row.title || m.uuid === row.movieUuid);
                  const posterUrl = matchingMovie?.primaryMediaUrl || row.moviePoster || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                  
                  return (
                    <tr key={row.id || row.title} className="border-b border-[#1A2238]/60 hover:bg-white/[0.015] transition-colors align-middle group">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => handleViewDetail(row.movieUuid || matchingMovie?.uuid)}
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
                              onClick={() => handleViewDetail(row.movieUuid || matchingMovie?.uuid)}
                              className="text-white font-bold text-sm leading-tight hover:text-red-500 transition-colors duration-200 cursor-pointer"
                            >
                              {row.title}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5 font-medium">Bản Chiếu Chuẩn</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center text-gray-300 font-bold py-2.5 px-4">{row.cinema}</td>
                      <td className="text-center text-gray-300 font-bold py-2.5 px-4">{row.time}</td>
                      <td className="text-center py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#1A2238]/60 border border-[#1A2238] text-[10px] text-gray-300 font-semibold">{row.screen}</span>
                      </td>

                      <td className="py-2.5 px-4 text-center">
                        {row.status === 'Live' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                            <Play className="w-2.5 h-2.5 fill-emerald-400/10" /> Đang Chiếu
                          </span>
                        ) : row.status === 'Scheduled' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-blue-500/10 border-blue-500/20 text-blue-400">
                            <Calendar className="w-2.5 h-2.5" /> Đã Lên Lịch
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-zinc-500/10 border-zinc-500/20 text-zinc-400">
                            <FileText className="w-2.5 h-2.5" /> Nháp
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button className="inline-flex items-center justify-center rounded border border-blue-500/20 bg-blue-500/5 px-2.5 py-1 text-[11px] font-bold text-blue-400 hover:bg-blue-500/15 hover:border-blue-500/30 transition duration-150 cursor-pointer" title="Sửa" onClick={() => handleEditClick(row)}>
                            Sửa
                          </button>
                          <button className="inline-flex items-center justify-center rounded border border-red-500/20 bg-red-500/5 px-2.5 py-1 text-[11px] font-bold text-red-400 hover:bg-red-500/15 hover:border-red-500/30 transition duration-150 cursor-pointer" title="Xóa" onClick={() => handleDeleteClick(row.id || row.title, row.title)}>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-lg bg-white border border-gray-200 rounded-xl overflow-hidden shadow-2xl p-5 text-left transform scale-100 transition-all duration-300 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                {editingShowtime ? 'Chỉnh sửa lịch chiếu' : 'Thêm mới lịch chiếu'}
              </h2>
              <button className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer" onClick={() => setIsModalOpen(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs">
              {/* Custom Movie Selection with Poster Preview */}
              <div className="space-y-2">
                <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider">Chọn Phim *</label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors"
                    onClick={() => setIsMovieDropdownOpen(!isMovieDropdownOpen)}
                  >
                    <span className="truncate">{selectedMovie ? selectedMovie.title : 'Chọn phim từ cơ sở dữ liệu...'}</span>
                    <span className="text-[10px] text-gray-500">▼</span>
                  </button>

                  {isMovieDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                      <div className="p-2 border-b border-gray-200 flex items-center gap-2 mb-1">
                        <Search className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Tìm nhanh tên phim..."
                          className="w-full text-xs outline-none border-none bg-transparent text-gray-900"
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
                            className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 transition text-left ${formData.movieUuid === movie.uuid ? 'bg-red-50 text-red-600 border border-red-200' : 'border border-transparent'}`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, movieUuid: movie.uuid }));
                              setIsMovieDropdownOpen(false);
                              setSearchMovieKeyword('');
                            }}
                          >
                            <img
                              src={movie.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120'}
                              alt={movie.title}
                              className="w-8 h-10 object-cover rounded shadow-sm shrink-0 border border-gray-200"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                              }}
                            />
                            <div className="overflow-hidden leading-tight">
                              <div className="font-bold text-xs text-gray-900 truncate">{movie.title}</div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{movie.durationMinutes} phút · {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}</div>
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
                  <div className="flex items-center gap-3.5 p-3 bg-gray-50/50 rounded-lg border border-gray-200 mt-2">
                    <img
                      src={selectedMovie.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120'}
                      alt={selectedMovie.title}
                      className="w-10 h-14 object-cover rounded border border-gray-200 shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                      }}
                    />
                    <div className="overflow-hidden leading-normal text-left">
                      <div className="font-bold text-gray-900 truncate text-xs">{selectedMovie.title}</div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Thời lượng: {selectedMovie.durationMinutes} phút
                      </div>
                      {selectedMovie.genres && selectedMovie.genres.length > 0 && (
                        <div className="text-[9px] text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 inline-block mt-1 font-bold uppercase tracking-wider">
                          {selectedMovie.genres.join(' / ')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider">Phòng / Rạp chiếu *</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors cursor-pointer"
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

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider">Thời gian chiếu *</label>
                  <input
                    type="time"
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors cursor-pointer"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                    onClick={(e) => {
                      try {
                        e.target.showPicker();
                      } catch (err) {
                        console.warn("showPicker is not supported:", err);
                      }
                    }}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider">Loại màn hình *</label>
                  <select
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-red-500/50 focus:bg-white transition-colors cursor-pointer"
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

                <div className="space-y-1.5 relative">
                  <label className="block text-[10px] font-bold uppercase text-gray-500 tracking-wider">Trạng thái *</label>
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

              <div className="pt-3 border-t border-gray-200 flex gap-2 justify-end">
                <button 
                  type="button" 
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-[11px] font-bold uppercase transition-all cursor-pointer" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase transition-all cursor-pointer"
                >
                  Lưu Lại
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
                className="w-full h-full object-cover brightness-[0.45]"
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

              {/* Action Footer */}
              <div className="flex justify-end gap-2 pt-2">
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
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Đóng lại
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShowtimesPage;
