import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, Clock, Calendar, Play, MapPin, Film, Award, X, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { notificationService } from '../../../shared/services/notificationService';
import { movieService } from '../../../shared/services/movieService';
import { showtimeService } from '../../../shared/services/showtimeService';

import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { bookingService } from '../../../shared/services/bookingService';

import './MovieDetailPage.css';

const getEmbedUrl = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
  }
  return url;
};

const MovieDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();
  const [activeDateTab, setActiveDateTab] = useState('today');
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);

  const [dbMovie, setDbMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [vodStatus, setVodStatus] = useState(null);
  const [isVodPurchaseOpen, setIsVodPurchaseOpen] = useState(false);
  const [isVodConfirming, setIsVodConfirming] = useState(false);

  useEffect(() => {
    const fetchVodStatus = async () => {
      if (isAuthenticated && dbMovie && (dbMovie.screeningMode === 'BOTH' || dbMovie.screeningMode === 'ONLINE_ONLY')) {
        try {
          const status = await bookingService.getVodStatus(dbMovie.uuid);
          setVodStatus(status);
        } catch (err) {
          console.error("Failed to load VOD status:", err);
        }
      }
    };
    fetchVodStatus();
  }, [dbMovie, isAuthenticated]);

  useEffect(() => {
    const fetchMovieDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await movieService.getMovieDetail(id);
        setDbMovie(data);
        setIsVideoActive(false);

        try {
          const allShowtimes = await showtimeService.getPublicShowtimes();
          const movieShowtimes = allShowtimes.filter(st => st.movieUuid === data.uuid);
          setShowtimes(movieShowtimes);
        } catch (stErr) {
          console.error("Failed to fetch showtimes:", stErr);
        }
      } catch (err) {
        console.error("Failed to fetch movie detail:", err);
        setError("Không thể tải chi tiết phim. Vui lòng thử lại sau.");
      } finally {
        setIsLoading(false);
      }
    };
    if (id) {
      fetchMovieDetail();
    }
  }, [id]);

  // Scroll to top on load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  const getDynamicDates = () => {
    const dates = [];
    const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const now = new Date();

    for (let i = 0; i < 4; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);

      const dayName = i === 0 ? 'Hôm nay' : daysOfWeek[d.getDay()];
      const dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

      dates.push({
        id: i === 0 ? 'today' : i === 1 ? 'fri' : i === 2 ? 'sat' : 'sun',
        label: `${dayName}, ${dateStr}`,
        fullDateText: `${dayName}, ${dateStr}`,
        rawDate: d
      });
    }
    return dates;
  };

  const dynamicDates = getDynamicDates();

  const dateMap = {
    today: dynamicDates[0].fullDateText,
    fri: dynamicDates[1].fullDateText,
    sat: dynamicDates[2].fullDateText,
    sun: dynamicDates[3].fullDateText
  };

  const getShowtimesForActiveTab = () => {
    const activeDateObj = dynamicDates.find(d => d.id === activeDateTab)?.rawDate;
    if (!activeDateObj) return [];

    return showtimes.filter(st => {
      const stDate = new Date(st.startTime);
      return stDate.getDate() === activeDateObj.getDate() &&
        stDate.getMonth() === activeDateObj.getMonth() &&
        stDate.getFullYear() === activeDateObj.getFullYear();
    });
  };

  const getSeatInfoForShowtime = (showtime) => {
    if (!showtime) return null;
    const seedStr = showtime.uuid;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const occupiedStandard = (hash % 15) + 5;
    const occupiedVip = ((hash >> 1) % 10) + 3;
    const occupiedCouple = ((hash >> 2) % 6) + 1;

    const freeStandard = 30 - occupiedStandard;
    const freeVip = 15 - occupiedVip;
    const freeCouple = 8 - occupiedCouple;

    return {
      standard: freeStandard,
      vip: freeVip,
      couple: freeCouple,
      total: freeStandard + freeVip + freeCouple
    };
  };

  const handleBookTickets = () => {
    const el = document.getElementById('select-showtimes');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      notificationService.info(`Vui lòng chọn suất chiếu để tiếp tục đặt vé phim ${movie.title}`);
    }
  };

  const handleShowtimeClick = (showtime) => {
    setSelectedShowtime(showtime);
  };

  const handleProceedToBooking = () => {
    if (!selectedShowtime) return;
    const theater = `${selectedShowtime.cinemaName} - ${selectedShowtime.cinemaRoomName}`;
    const dateText = dateMap[activeDateTab];
    const showtimeText = new Date(selectedShowtime.startTime).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    navigate('/booking', {
      state: {
        showtimeUuid: selectedShowtime.uuid,
        theater,
        movie: movie.title,
        moviePoster: movie.poster,
        movieRating: movie.rating,
        movieFormat: movie.format,
        movieAgeRestriction: movie.ageRestriction,
        date: dateText,
        showtime: showtimeText
      }
    });
  };

  const handleBuyVodClick = () => {
    if (!isAuthenticated) {
      notificationService.info("Vui lòng đăng nhập để tiếp tục mua vé xem phim Online.");
      navigate('/login', { state: { from: `/movie/${id}` } });
      return;
    }
    navigate('/checkout', {
      state: {
        isVod: true,
        movieUuid: dbMovie.uuid,
        movie: dbMovie.title,
        moviePoster: dbMovie.poster || '',
        movieRating: dbMovie.rating || 8.0,
        movieFormat: 'VOD 4K',
        movieAgeRestriction: dbMovie.ageRestriction || 'P',
        totalAmount: dbMovie.onlinePrice || 45000,
        date: 'Mọi lúc, mọi nơi',
        showtime: 'Xem trực tuyến',
        theater: 'Trình phát video NASA VOD',
        selectedSeats: [],
        durationMinutes: dbMovie.durationMinutes || 120
      }
    });
  };

  const handleWatchVodClick = () => {
    navigate(`/watch/${dbMovie.uuid}`);
  };

  const seatInfo = selectedShowtime ? getSeatInfoForShowtime(selectedShowtime) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f121d] flex items-center justify-center text-white">
        <p className="text-xl font-bold animate-pulse">Đang tải chi tiết phim...</p>
      </div>
    );
  }

  if (error || !dbMovie) {
    return (
      <div className="min-h-screen bg-[#0f121d] flex flex-col items-center justify-center text-white p-4">
        <p className="text-xl font-bold text-red-500 mb-4">{error || "Không tìm thấy phim"}</p>
        <button onClick={() => navigate('/')} className="bg-red-600 px-6 py-2 rounded-lg font-bold text-sm uppercase">Quay lại trang chủ</button>
      </div>
    );
  }

  const movie = {
    title: dbMovie.title || '',
    description: dbMovie.description || '',
    duration: dbMovie.durationMinutes ? `${dbMovie.durationMinutes} phút` : '',
    releaseDate: dbMovie.releaseDate || '',
    genres: dbMovie.genres || [],
    rating: dbMovie.rating || 8.0,
    format: dbMovie.format || '2D',
    ageRestriction: dbMovie.ageRestriction || '',
    poster: dbMovie.medias?.find(m => m.isPrimary)?.mediaUrl
      || dbMovie.medias?.find(m => m.mediaType === 'POSTER')?.mediaUrl
      || '',
    backdrop: dbMovie.medias?.find(m => m.mediaType === 'BACKDROP')?.mediaUrl
      || dbMovie.medias?.find(m => m.mediaType === 'POSTER')?.mediaUrl
      || 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1200',
    trailer: dbMovie.medias?.find(m => m.mediaType === 'TRAILER')?.mediaUrl || '',
    cast: dbMovie.actors?.map(act => ({
      name: act.fullName,
      role: act.characterName || 'Diễn viên',
      avatar: act.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100'
    })) || []
  };

  const showtimesForActiveTab = getShowtimesForActiveTab();

  const groupedShowtimes = showtimesForActiveTab.reduce((acc, st) => {
    const cinemaName = st.cinemaName || 'NASA Landmark 81';
    if (!acc[cinemaName]) {
      acc[cinemaName] = {
        name: cinemaName,
        showtimes: []
      };
    }
    acc[cinemaName].showtimes.push(st);
    return acc;
  }, {});

  return (
    <div className="movie-detail-wrapper">
      <Navbar />

      <main className="relative pt-0">
        {/* Hero Section */}
        <section className="relative h-[650px] md:h-[780px] w-full overflow-hidden bg-black">
          {/* Base Backdrop Image Layer (Always visible, z-index: 0) */}
          <img
            alt="Movie backdrop"
            className={`movie-backdrop-img ${isVideoActive ? 'video-active' : ''}`}
            src={movie.backdrop}
          />

          {/* Video Trailer Background Layer (Absolute on top, z-index: 10) */}
          {movie.trailer && (() => {
            const isYouTube = movie.trailer.includes('youtube.com') || movie.trailer.includes('youtu.be');
            if (isYouTube) {
              const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
              const match = movie.trailer.match(regExp);
              const videoId = match && match[2].length === 11 ? match[2] : '';
              const bgYoutubeUrl = videoId
                ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`
                : '';
              if (bgYoutubeUrl) {
                return (
                  <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden scale-110 z-10">
                    <iframe
                      src={bgYoutubeUrl}
                      title="Background Trailer"
                      className="w-full h-full object-cover opacity-100"
                      style={{ border: 'none', transform: 'scale(1.35)', transformOrigin: 'center' }}
                      onLoad={() => setIsVideoActive(true)}
                    ></iframe>
                  </div>
                );
              }
            } else {
              return (
                <video
                  src={movie.trailer}
                  autoPlay
                  muted
                  loop
                  playsInline
                  onPlay={() => setIsVideoActive(true)}
                  className="absolute inset-0 w-full h-full object-cover opacity-100 scale-105 z-10"
                />
              );
            }
            return null;
          })()}

          {/* Gradient Overlay Layer (z-index: 20) */}
          <div className="absolute inset-0 hero-gradient z-20"></div>

          {/* Detail Overlay Content Layer (z-index: 30) */}
          <div className="absolute bottom-0 left-0 w-full px-4 md:px-12 lg:px-20 pb-12 md:pb-16 flex flex-col md:flex-row gap-8 items-end z-30">
            {/* Poster */}
            <div className="hidden lg:block w-64 h-[380px] rounded-2xl overflow-hidden shadow-2xl poster-hover flex-shrink-0 border border-white/10 bg-[#0f121d]">
              <img
                alt="High-res Movie Poster"
                className="w-full h-full object-contain"
                src={movie.poster}
              />
            </div>

            {/* Info */}
            <div className="flex-grow space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-3">
                {movie.ageRestriction && (
                  <span className={`px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${movie.ageRestriction.toUpperCase() === 'P' ? 'bg-emerald-600 text-white' :
                      movie.ageRestriction.toUpperCase().includes('T18') ? 'bg-red-600 text-white' :
                        'bg-amber-600 text-white'
                    }`}>
                    {movie.ageRestriction}
                  </span>
                )}
                {movie.genres.map((g) => (
                  <span key={g} className="bg-red-600/20 text-red-500 px-3 py-1 rounded-full text-xs font-black border border-red-500/30">
                    {g}
                  </span>
                ))}

                {movie.rating && (
                  <div className="flex items-center gap-1.5 text-yellow-400 font-bold ml-2">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{movie.rating.toFixed(1)} IMDb</span>
                  </div>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-none tracking-wide uppercase">
                {movie.title}
              </h1>

              <div className="flex items-center gap-6 text-gray-400 text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-red-500" /> {movie.duration}
                </span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-red-500" /> {movie.releaseDate}
                </span>
              </div>

              <p className="text-gray-300 text-sm md:text-base max-w-2xl leading-relaxed font-medium">
                {movie.description}
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                {/* 1. Mua vé xem tại rạp (Chỉ khi screeningMode là THEATER_ONLY hoặc BOTH hoặc chưa cấu hình) */}
                {(dbMovie.screeningMode === 'THEATER_ONLY' || dbMovie.screeningMode === 'BOTH' || !dbMovie.screeningMode) && (
                  <button
                    onClick={handleBookTickets}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider neon-red-glow hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    Đặt vé tại rạp
                  </button>
                )}

                {/* 2. Vé xem Online VOD (Chỉ khi screeningMode là ONLINE_ONLY hoặc BOTH) */}
                {(dbMovie.screeningMode === 'ONLINE_ONLY' || dbMovie.screeningMode === 'BOTH') && (
                  <>
                    {vodStatus && vodStatus.hasPurchased && vodStatus.playbackState !== 'EXPIRED' ? (
                      <button
                        onClick={handleWatchVodClick}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        {vodStatus.playbackState === 'STREAMING' ? 'Tiếp tục xem phim' : 'Xem phim Online'}
                      </button>
                    ) : (
                      <button
                        onClick={handleBuyVodClick}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        {vodStatus && vodStatus.playbackState === 'EXPIRED' ? 'Mua lại xem Online' : `Mua xem Online`}
                      </button>
                    )}
                  </>
                )}

                {/* 3. Phim ngưng chiếu hoàn toàn */}
                {dbMovie.screeningMode === 'NONE' && (
                  <span className="px-6 py-3.5 bg-gray-800 text-gray-500 rounded-xl font-bold text-sm uppercase tracking-wider border border-gray-700">
                    Phim tạm ngưng chiếu
                  </span>
                )}

                {/* 4. Nút Xem Trailer */}
                <button
                  onClick={() => setIsTrailerOpen(true)}
                  className="glass-panel text-white hover:text-red-500 px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current text-red-500" /> Xem Trailer
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <section id="select-showtimes" className="px-4 md:px-12 lg:px-20 py-16 md:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 max-w-7xl mx-auto">

          {/* Left Side: Cast & Crew */}
          <div className="lg:col-span-4 space-y-6 text-left">
            <h3 className="text-xl md:text-2xl font-black text-white border-l-4 border-red-600 pl-4 uppercase tracking-wider">
              Diễn Viên Chính
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {movie.cast.map((actor) => (
                <div key={actor.name} className="flex flex-col items-center gap-2 text-center group bg-[#111215]/40 border border-white/5 p-4 rounded-2xl hover:border-red-500/20 transition-all duration-300">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden border-2 border-transparent group-hover:border-red-600 transition-all duration-300 bg-slate-900">
                    <img
                      alt={actor.name}
                      className="w-full h-full object-cover"
                      src={actor.avatar}
                    />
                  </div>
                  <span className="text-xs md:text-sm font-bold text-white leading-snug">{actor.name}</span>
                  <span className="text-[10px] md:text-xs text-gray-400 font-semibold">{actor.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Side: Showtimes */}
          <div className="lg:col-span-8 space-y-6 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
              <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">
                Chọn suất chiếu
              </h3>

              {/* Date Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {dynamicDates.map((date) => (
                  <button
                    key={date.id}
                    onClick={() => {
                      setActiveDateTab(date.id);
                      if (selectedShowtime) {
                        const isPast = checkIfTimeInPastForTab(selectedShowtime.time, date.id);
                        if (isPast) {
                          setSelectedShowtime(null);
                        }
                      }
                    }}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeDateTab === date.id
                        ? 'bg-red-600 text-white shadow-lg shadow-red-600/15'
                        : 'glass-panel text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {date.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {Object.keys(groupedShowtimes).length > 0 ? (
                Object.values(groupedShowtimes).map((cinemaGroup) => (
                  <div key={cinemaGroup.name} className="py-4 text-left">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-2.5">
                        <Film className="text-red-500 h-4 w-4" />
                        <h4 className="text-base font-black text-white uppercase font-heading tracking-wide">
                          {cinemaGroup.name}
                        </h4>
                      </div>
                      <span className="text-xs text-gray-500 flex items-center gap-1 font-semibold">
                        <MapPin className="h-3 w-3 text-red-500" /> Hồ Chí Minh
                      </span>
                    </div>

                    <div className="border-b border-white/5 my-4" />

                    <div className="flex flex-wrap gap-2.5">
                      {cinemaGroup.showtimes.map((st) => {
                        const timeStr = new Date(st.startTime).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        });
                        const isSelected = selectedShowtime?.uuid === st.uuid;
                        const isSoldOut = st.status === 'SOLD_OUT';
                        return (
                          <button
                            key={st.uuid}
                            onClick={() => !isSoldOut && handleShowtimeClick(st)}
                            disabled={isSoldOut}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 text-left ${isSelected
                                ? 'bg-red-600 text-white font-black scale-105 shadow-lg shadow-red-600/20'
                                : isSoldOut
                                  ? 'text-gray-700 cursor-not-allowed opacity-20'
                                  : 'text-gray-400 hover:text-white hover:bg-white/5 border border-white/5'
                              }`}
                          >
                            {timeStr}
                            <span className="block text-[8px] text-gray-500 font-medium font-sans mt-0.5">
                              {st.cinemaRoomName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 font-medium bg-[#111215]/20 border border-white/5 rounded-2xl">
                  <AlertCircle className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                  Không có suất chiếu nào được lên lịch cho ngày này.
                </div>
              )}

              {/* Selected Showtime Summary & Book Button */}
              {selectedShowtime && seatInfo && (
                <div className="glass-panel p-6 rounded-2xl border-red-500/20 bg-red-600/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-fade-in">
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Suất chiếu đã chọn</span>
                    <h4 className="text-base font-black text-white uppercase">
                      {selectedShowtime.cinemaName} - {selectedShowtime.cinemaRoomName}
                    </h4>
                    <p className="text-xs font-bold text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span>{dateMap[activeDateTab]} • <span className="text-red-500 font-extrabold">{
                        new Date(selectedShowtime.startTime).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        })
                      }</span></span>
                      <span className="text-gray-600 hidden sm:inline">|</span>
                      <span className="text-emerald-400">Còn trống: <span className="font-extrabold">{seatInfo.total}</span> ghế</span>
                    </p>
                    {/* Seat type breakdown badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                        Ghế Thường: <span className="text-white font-extrabold">{seatInfo.standard}</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/5 border border-yellow-500/20 text-yellow-500/80">
                        Ghế VIP: <span className="text-yellow-400 font-extrabold">{seatInfo.vip}</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/5 border border-red-500/20 text-red-500/80">
                        Ghế Đôi: <span className="text-red-400 font-extrabold">{seatInfo.couple}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleProceedToBooking}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Đặt ghế ngay</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Trailer Modal */}
      {isTrailerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setIsTrailerOpen(false)}></div>
          <div className="relative w-full max-w-4xl aspect-video glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-black">
            <button
              className="absolute top-4 right-4 text-white hover:text-red-500 transition-colors z-50 bg-black/70 p-2 rounded-full cursor-pointer"
              onClick={() => setIsTrailerOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>

            {movie.trailer ? (
              (() => {
                const embedUrl = getEmbedUrl(movie.trailer);
                const isYouTube = movie.trailer.includes('youtube.com') || movie.trailer.includes('youtu.be');
                if (isYouTube) {
                  return (
                    <iframe
                      src={embedUrl}
                      title={`${movie.title} Trailer`}
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  );
                } else {
                  return (
                    <video
                      src={movie.trailer}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  );
                }
              })()
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 bg-[#0c0d12]">
                <Play className="text-red-500 h-16 w-16 mb-4 animate-pulse fill-current" />
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">Chưa có Trailer</h2>
                <p className="text-gray-400 mt-2 font-medium">Trailer chính thức của bộ phim {movie.title} đang được cập nhật.</p>
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setIsTrailerOpen(false)}
                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Quay lại
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}



      <Footer />
    </div>
  );
};

export default MovieDetailPage;
