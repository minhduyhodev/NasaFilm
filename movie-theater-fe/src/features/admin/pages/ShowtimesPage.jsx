import React, { useState, useEffect } from 'react';
import { Film, SlidersHorizontal, Download, Search, Plus, Calendar, Tv, Clock, X, Play, FileText, Ban, CheckCircle, HelpCircle } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { cinemaService } from '../../../shared/services/cinemaService';
import { showtimeService } from '../../../shared/services/showtimeService';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';
import './ShowtimesPage.css';

const ShowtimesPage = () => {
  const [showtimes, setShowtimes] = useState([]);
  const [movies, setMovies] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMovies, setIsLoadingMovies] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMovieDropdownOpen, setIsMovieDropdownOpen] = useState(false);
  const [searchMovieKeyword, setSearchMovieKeyword] = useState('');

  const [formData, setFormData] = useState({
    movieUuid: '',
    cinemaUuid: '',
    cinemaRoomUuid: '',
    startTime: '',
    basePrice: 85000,
  });

  useEffect(() => {
    fetchShowtimes();
    fetchMovies();
    fetchCinemas();
  }, []);

  const fetchShowtimes = async () => {
    setIsLoading(true);
    try {
      const data = await showtimeService.getAdminShowtimes();
      setShowtimes(data);
    } catch (error) {
      console.error('Failed to fetch showtimes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovies = async () => {
    setIsLoadingMovies(true);
    try {
      const data = await movieService.getMovies({ size: 100 });
      if (data && data.content) {
        setMovies(data.content);
      }
    } catch (error) {
      console.error('Failed to fetch movies:', error);
    } finally {
      setIsLoadingMovies(false);
    }
  };

  const fetchCinemas = async () => {
    try {
      const data = await cinemaService.getCinemas('', 0, 100);
      setCinemas(data.content || data);
    } catch (error) {
      console.error('Failed to fetch cinemas:', error);
    }
  };

  const handleCinemaChange = async (cinemaUuid) => {
    setFormData(prev => ({ ...prev, cinemaUuid, cinemaRoomUuid: '' }));
    if (!cinemaUuid) {
      setRooms([]);
      return;
    }
    try {
      const data = await cinemaService.getRoomsByCinema(cinemaUuid);
      setRooms(data.filter(r => r.status === 'ACTIVE')); // Only active rooms can host showtimes
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    }
  };

  const handleAddClick = () => {
    setFormData({
      movieUuid: movies[0]?.uuid || '',
      cinemaUuid: cinemas[0]?.uuid || '',
      cinemaRoomUuid: '',
      startTime: '',
      basePrice: 85000,
    });
    if (cinemas[0]?.uuid) {
      handleCinemaChange(cinemas[0].uuid);
    }
    setIsMovieDropdownOpen(false);
    setSearchMovieKeyword('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.cinemaRoomUuid) {
      alert('Vui lòng chọn phòng chiếu');
      return;
    }
    try {
      // Convert startTime string from local timezone format to ISO String (OffsetDateTime compliant)
      const isoStartTime = new Date(formData.startTime).toISOString();
      await showtimeService.createShowtime({
        movieUuid: formData.movieUuid,
        cinemaRoomUuid: formData.cinemaRoomUuid,
        startTime: isoStartTime,
        basePrice: parseFloat(formData.basePrice),
      });
      setIsModalOpen(false);
      fetchShowtimes();
      alert('Tạo suất chiếu thành công!');
    } catch (error) {
      alert(error.message || 'Lỗi khi tạo suất chiếu');
    }
  };

  const handleStatusTransition = async (showtimeUuid, newStatus) => {
    if (newStatus === 'CANCELLED' && !window.confirm('Bạn có chắc chắn muốn hủy suất chiếu này? Hành động này sẽ tự động hủy và hoàn tiền toàn bộ vé đã đặt.')) {
      return;
    }
    try {
      await showtimeService.updateShowtimeStatus(showtimeUuid, newStatus);
      fetchShowtimes();
      alert(`Đã cập nhật trạng thái suất chiếu thành công!`);
    } catch (error) {
      alert(error.message || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const formatDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-zinc-500/10 border-zinc-500/20 text-zinc-400">
            <FileText className="w-2.5 h-2.5" /> Nháp
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-blue-500/10 border-blue-500/20 text-blue-400">
            <Calendar className="w-2.5 h-2.5" /> Đã Lên Lịch
          </span>
        );
      case 'OPEN_FOR_BOOKING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
            <Play className="w-2.5 h-2.5 fill-emerald-400/10" /> Đang Mở Bán
          </span>
        );
      case 'SOLD_OUT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-red-500/10 border-red-500/20 text-red-400">
            <CheckCircle className="w-2.5 h-2.5" /> Hết Ghế
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-rose-500/10 border-rose-500/20 text-rose-500">
            <Ban className="w-2.5 h-2.5" /> Đã Hủy
          </span>
        );
      case 'FINISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-zinc-700/20 border-zinc-700/30 text-gray-500">
            <CheckCircle className="w-2.5 h-2.5" /> Kết Thúc
          </span>
        );
      default:
        return null;
    }
  };

  const getValidTransitions = (status) => {
    switch (status) {
      case 'DRAFT':
        return [{ target: 'SCHEDULED', label: 'Xuất Bản' }];
      case 'SCHEDULED':
        return [
          { target: 'OPEN_FOR_BOOKING', label: 'Mở Bán Vé' },
          { target: 'CANCELLED', label: 'Hủy Suất' }
        ];
      case 'OPEN_FOR_BOOKING':
        return [
          { target: 'SOLD_OUT', label: 'Hết Vé' },
          { target: 'FINISHED', label: 'Kết Thúc' },
          { target: 'CANCELLED', label: 'Hủy Suất' }
        ];
      case 'SOLD_OUT':
        return [
          { target: 'OPEN_FOR_BOOKING', label: 'Mở Lại' },
          { target: 'FINISHED', label: 'Kết Thúc' },
          { target: 'CANCELLED', label: 'Hủy Suất' }
        ];
      default:
        return []; // Cancelled and Finished are final states
    }
  };

  const filteredShowtimes = showtimes.filter(st => 
    st.movieTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.cinemaRoomName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    st.cinemaName.toLowerCase().includes(searchTerm.toLowerCase())
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
            Tổng lịch chiếu: <span className="text-white font-bold">{showtimes.length}</span> · 
            Đang mở bán: <span className="text-emerald-400 font-bold">{showtimes.filter(s => s.status === 'OPEN_FOR_BOOKING').length}</span>
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
          <div className="relative w-full sm:max-w-xs text-left">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
            <input
              className="w-full rounded-lg bg-[#0F1322] border border-[#1A2238] pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-colors"
              placeholder="Tìm kiếm lịch chiếu..."
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

        <div className="overflow-x-auto text-left">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-gray-400 text-[9px] font-bold uppercase tracking-wider border-b border-[#1A2238] bg-white/[0.02]">
                <th className="py-2.5 px-4 text-left">Phim</th>
                <th className="py-2.5 px-4 text-center">Rạp Chiếu</th>
                <th className="py-2.5 px-4 text-center">Phòng Chiếu</th>
                <th className="py-2.5 px-4 text-center">Thời Gian Chiếu (Giờ dọn dẹp +15m)</th>
                <th className="py-2.5 px-4 text-center">Giá Vé</th>
                <th className="py-2.5 px-4 text-center">Trạng Thái</th>
                <th className="py-2.5 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A2238]/40">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-400">Đang tải lịch chiếu...</td>
                </tr>
              ) : filteredShowtimes.length > 0 ? (
                filteredShowtimes.map((row) => {
                  const matchingMovie = movies.find(m => m.uuid === row.movieUuid);
                  const posterUrl = matchingMovie?.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                  
                  return (
                    <tr key={row.uuid} className="border-b border-[#1A2238]/60 hover:bg-white/[0.015] transition-colors align-middle group">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="border border-[#1A2238] rounded overflow-hidden w-9 h-12 shrink-0 bg-black/40">
                            <img 
                              src={posterUrl} 
                              alt={row.movieTitle} 
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                              }}
                            />
                          </div>
                          <div>
                            <div className="text-white font-bold text-sm leading-tight">{row.movieTitle}</div>
                            <div className="text-[10px] text-gray-400 mt-0.5 font-medium">{matchingMovie?.durationMinutes ? `${matchingMovie.durationMinutes} phút` : '2D Phụ đề'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="text-center text-gray-300 font-bold py-2.5 px-4">{row.cinemaName}</td>
                      <td className="text-center text-gray-300 font-bold py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#1A2238]/60 border border-[#1A2238] text-[10px] text-gray-300 font-semibold">{row.cinemaRoomName}</span>
                      </td>
                      <td className="text-center py-2.5 px-4">
                        <div className="flex flex-col items-center">
                          <span className="text-white font-bold">{formatDateTime(row.startTime)}</span>
                          <span className="text-[10px] text-gray-500 mt-0.5">đến {formatDateTime(row.endTime)}</span>
                        </div>
                      </td>
                      <td className="text-center text-amber-500 font-mono font-bold py-2.5 px-4">
                        {row.basePrice?.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {getStatusBadge(row.status)}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap max-w-[180px] ml-auto">
                          {getValidTransitions(row.status).map(transition => (
                            <button
                              key={transition.target}
                              onClick={() => handleStatusTransition(row.uuid, transition.target)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition duration-150 cursor-pointer ${
                                transition.target === 'CANCELLED'
                                  ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20'
                                  : transition.target === 'OPEN_FOR_BOOKING'
                                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20'
                                  : 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20'
                              }`}
                            >
                              {transition.label}
                            </button>
                          ))}
                          {getValidTransitions(row.status).length === 0 && (
                            <span className="text-[10px] text-gray-500 font-medium italic">Không có hành động</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-400">Không tìm thấy suất chiếu nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Showtime */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-[#090D1A] border border-[#1A2238] shadow-2xl p-6 text-left relative max-h-[90vh] overflow-y-auto">
            <button 
              className="absolute right-4 top-4 p-1 text-gray-400 hover:text-white rounded bg-white/5 cursor-pointer" 
              onClick={() => setIsModalOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
            <h2 className="text-base font-bold text-white mb-4 uppercase tracking-wider">Thêm Suất Chiếu Mới</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Custom Movie Selection with Poster Preview */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold uppercase text-gray-400">Chọn Phim *</label>
                <div className="relative">
                  <button
                    type="button"
                    className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 flex items-center justify-between text-left cursor-pointer transition-colors"
                    onClick={() => setIsMovieDropdownOpen(!isMovieDropdownOpen)}
                  >
                    <span className="truncate">{selectedMovie ? selectedMovie.title : 'Chọn phim từ cơ sở dữ liệu...'}</span>
                    <span className="text-[10px] text-gray-400">▼</span>
                  </button>

                  {isMovieDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-[#090D1A] border border-[#1A2238] rounded-lg shadow-2xl max-h-60 overflow-y-auto p-2 space-y-1">
                      <div className="p-2 border-b border-[#1A2238] flex items-center gap-2 mb-1">
                        <Search className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                          type="text"
                          placeholder="Tìm nhanh tên phim..."
                          className="w-full text-xs outline-none border-none bg-transparent text-white"
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
                            className={`w-full flex items-center gap-3 p-2 rounded-md hover:bg-white/5 transition text-left ${formData.movieUuid === movie.uuid ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'border border-transparent'}`}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, movieUuid: movie.uuid }));
                              setIsMovieDropdownOpen(false);
                              setSearchMovieKeyword('');
                            }}
                          >
                            <img
                              src={movie.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120'}
                              alt={movie.title}
                              className="w-8 h-10 object-cover rounded shadow-sm shrink-0 border border-[#1A2238]"
                              onError={(e) => {
                                e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                              }}
                            />
                            <div className="overflow-hidden leading-tight">
                              <div className="font-bold text-xs text-white truncate">{movie.title}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{movie.durationMinutes} phút · {movie.status === 'NOW_SHOWING' ? 'Đang chiếu' : 'Sắp chiếu'}</div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-4 text-xs text-gray-400">Không tìm thấy bộ phim nào</div>
                      )}
                    </div>
                  )}
                </div>

                {selectedMovie && (
                  <div className="flex items-center gap-3.5 p-3 bg-[#0F1322]/50 rounded-lg border border-[#1A2238] mt-2 text-left">
                    <img
                      src={selectedMovie.primaryMediaUrl || 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120'}
                      alt={selectedMovie.title}
                      className="w-10 h-14 object-cover rounded border border-[#1A2238] shrink-0"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=120';
                      }}
                    />
                    <div className="overflow-hidden leading-normal text-left">
                      <div className="font-bold text-white truncate text-xs">{selectedMovie.title}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        Thời lượng: {selectedMovie.durationMinutes} phút (+10m trailer)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cinema Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Chọn Rạp Chiếu *</label>
                <select
                  className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                  value={formData.cinemaUuid}
                  onChange={(e) => handleCinemaChange(e.target.value)}
                  required
                >
                  <option value="">-- Chọn Rạp --</option>
                  {cinemas.map(c => (
                    <option key={c.uuid} value={c.uuid}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Room Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Chọn Phòng Chiếu *</label>
                <select
                  className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                  value={formData.cinemaRoomUuid}
                  onChange={(e) => setFormData(prev => ({ ...prev, cinemaRoomUuid: e.target.value }))}
                  required
                  disabled={!formData.cinemaUuid}
                >
                  <option value="">-- Chọn Phòng Chiếu --</option>
                  {rooms.map(r => (
                    <option key={r.uuid} value={r.uuid}>{r.name} ({r.roomCode} · {r.roomType})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Datetime local Picker */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Thời Gian Bắt Đầu *</label>
                  <input
                    type="datetime-local"
                    className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50"
                    value={formData.startTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>

                {/* Base Ticket Price */}
                <div>
                  <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1">Giá Vé Cơ Bản (VNĐ) *</label>
                  <input
                    type="number"
                    min="10000"
                    step="5000"
                    required
                    className="w-full bg-[#0F1322] border border-[#1A2238] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                    value={formData.basePrice}
                    onChange={(e) => setFormData(prev => ({ ...prev, basePrice: parseInt(e.target.value) || 85000 }))}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2 text-xs text-gray-300 font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-xs text-white font-bold cursor-pointer"
                >
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
