import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Star, Clock, Calendar, Play, MapPin, Film, Award, X, AlertCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { notificationService } from '../../../shared/services/notificationService';
import { movieService } from '../../../shared/services/movieService';

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
  const [activeDateTab, setActiveDateTab] = useState('today');
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);

  const [dbMovie, setDbMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMovieDetail = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await movieService.getMovieDetail(id);
        setDbMovie(data);
        setIsVideoActive(false);
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

  const dateMap = {
    today: 'Hôm nay, 10/06',
    fri: 'Thứ 5, 11/06',
    sat: 'Thứ 6, 12/06',
    sun: 'Thứ 7, 13/06'
  };

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

  const getSeatInfoForShowtime = (cinema, time) => {
    const theaterName = cinema === 'IMAX' 
      ? 'NASA Landmark 81 - Phòng chiếu IMAX' 
      : 'CineStar Premium GOLD - Phòng VIP';
    
    const seedStr = `${theaterName}-${time}-${movie.title}`;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
      hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.abs(hash);

    const occupiedStandard = (hash % 26) + 10;
    const occupiedVip = ((hash >> 1) % 14) + 5;
    const occupiedCouple = ((hash >> 2) % 8) + 2;

    const freeStandard = 48 - occupiedStandard;
    const freeVip = 24 - occupiedVip;
    const freeCouple = 12 - occupiedCouple;

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

  const handleShowtimeClick = (cinema, time) => {
    setSelectedShowtime({ cinema, time });
  };

  const handleProceedToBooking = () => {
    if (!selectedShowtime) return;
    const theater = selectedShowtime.cinema === 'IMAX' 
      ? 'NASA Landmark 81 - Phòng chiếu IMAX' 
      : 'CineStar Premium GOLD - Phòng VIP';
    const dateText = dateMap[activeDateTab];
    const showtimeText = selectedShowtime.time;
    
    // Map mock selection to real seeded showtime UUIDs
    let showtimeUuid = '11111111-1111-1111-1111-111111111111';
    if (selectedShowtime.cinema === 'IMAX') {
      if (showtimeText === '19:15' || showtimeText === '19:30') {
        showtimeUuid = '11111111-1111-1111-1111-111111111111';
      } else {
        showtimeUuid = '22222222-2222-2222-2222-222222222222';
      }
    } else {
      if (showtimeText === '18:00') {
        showtimeUuid = '33333333-3333-3333-3333-333333333333';
      } else {
        showtimeUuid = '44444444-4444-4444-4444-444444444444';
      }
    }

    // Redirect to seat booking with routing state
    navigate('/booking', {
      state: {
        showtimeUuid,
        theater,
        movie: movie.title,
        moviePoster: movie.poster,
        movieRating: movie.rating,
        movieFormat: movie.format,
        date: dateText,
        showtime: showtimeText
      }
    });
  };

  const seatInfo = selectedShowtime ? getSeatInfoForShowtime(selectedShowtime.cinema, selectedShowtime.time) : null;

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
                <button 
                  onClick={handleBookTickets} 
                  className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider neon-red-glow hover:scale-105 active:scale-95 transition-all"
                >
                  Mua vé ngay
                </button>
                <button 
                  onClick={() => setIsTrailerOpen(true)}
                  className="glass-panel text-white hover:text-red-500 px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:bg-white/10 transition-colors"
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
                {[
                  { id: 'today', label: 'Hôm nay, 10/06' },
                  { id: 'fri', label: 'Thứ 5, 11/06' },
                  { id: 'sat', label: 'Thứ 6, 12/06' },
                  { id: 'sun', label: 'Thứ 7, 13/06' }
                ].map((date) => (
                  <button
                    key={date.id}
                    onClick={() => setActiveDateTab(date.id)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      activeDateTab === date.id 
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
              {/* Cinema 1: CineStar IMAX */}
              <div className="py-4 text-left">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Film className="text-red-500 h-4 w-4" />
                    <h4 className="text-base font-black text-white uppercase font-heading tracking-wide">CineStar IMAX - NASA Landmark 81</h4>
                  </div>
                  <span className="text-xs text-gray-500 flex items-center gap-1 font-semibold">
                    <MapPin className="h-3 w-3 text-red-500" /> Quận Bình Thạnh, HCM
                  </span>
                </div>
                
                {/* Thin Editorial Divider */}
                <div className="border-b border-white/5 my-4" />
                
                <div className="flex flex-wrap gap-2.5">
                  {['11:00', '13:45', '16:30', '19:15', '21:00', '22:45'].map((time) => {
                    const isSelected = selectedShowtime?.cinema === 'IMAX' && selectedShowtime?.time === time;
                    const isDisabled = time === '21:00'; // mock disabled
                    return (
                      <button
                        key={time}
                        onClick={() => !isDisabled && handleShowtimeClick('IMAX', time)}
                        disabled={isDisabled}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                          isSelected 
                            ? 'bg-red-600 text-white font-black scale-105 shadow-lg shadow-red-600/20' 
                            : isDisabled
                              ? 'text-gray-700 cursor-not-allowed opacity-20'
                              : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cinema 2: CineStar Premium GOLD */}
              <div className="py-4 text-left">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <Award className="text-yellow-500 h-4 w-4" />
                    <h4 className="text-base font-black text-yellow-500 uppercase font-heading tracking-wide">CineStar Premium GOLD</h4>
                  </div>
                  <span className="text-xs text-gray-500 flex items-center gap-1 font-semibold">
                    <MapPin className="h-3 w-3 text-red-500" /> Quận 1, HCM
                  </span>
                </div>
                
                {/* Thin Editorial Divider */}
                <div className="border-b border-white/5 my-4" />
                
                <div className="flex flex-wrap gap-2.5">
                  {['12:30', '15:15', '18:00', '20:45'].map((time) => {
                    const isSelected = selectedShowtime?.cinema === 'GOLD' && selectedShowtime?.time === time;
                    return (
                      <button
                        key={time}
                        onClick={() => handleShowtimeClick('GOLD', time)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                          isSelected 
                            ? 'bg-red-600 text-white font-black scale-105 shadow-lg shadow-red-600/20' 
                            : 'text-yellow-500/80 hover:text-yellow-500 hover:bg-yellow-500/5'
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Showtime Summary & Book Button */}
              {selectedShowtime && seatInfo && (
                <div className="glass-panel p-6 rounded-2xl border-red-500/20 bg-red-600/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 animate-fade-in">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">Suất chiếu đã chọn</span>
                    <h4 className="text-base font-black text-white uppercase">
                      {selectedShowtime.cinema === 'IMAX' ? 'CineStar IMAX - NASA Landmark 81' : 'CineStar Premium GOLD - Phòng VIP'}
                    </h4>
                    <p className="text-xs font-bold text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span>{dateMap[activeDateTab]} • <span className="text-red-500 font-extrabold">{selectedShowtime.time}</span></span>
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
