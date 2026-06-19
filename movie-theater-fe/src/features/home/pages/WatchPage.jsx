import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Clock, ShieldAlert, AlertCircle, Play, Film, AlertTriangle } from 'lucide-react';
import { bookingService } from '../../../shared/services/bookingService';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const WatchPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [streamData, setStreamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [remainingTimeText, setRemainingTimeText] = useState('');
  const heartbeatIntervalRef = useRef(null);

  // 1. Fetch movie details and VOD session on mount
  useEffect(() => {
    let active = true;
    const initializeStream = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const movieDetail = await movieService.getMovieDetail(id);
        if (!active) return;
        setMovie(movieDetail);

        // Fetch VOD status
        const status = await bookingService.getVodStatus(id);
        if (!active) return;
        if (!status.hasPurchased) {
          throw new Error('Bạn chưa mua vé xem trực tuyến phim này.');
        }

        if (status.playbackState === 'EXPIRED') {
          throw new Error('Vé xem phim trực tuyến của bạn đã hết hạn.');
        }

        // Activate VOD session
        const playSession = await bookingService.activateVodPlay(id);
        if (!active) return;
        setStreamData(playSession);
      } catch (err) {
        if (!active) return;
        console.error('Failed to initialize stream:', err);
        setError(err.message || 'Không thể bắt đầu luồng phát phim trực tuyến.');
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    if (id) {
      initializeStream();
    }

    return () => {
      active = false;
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [id]);

  // 2. Setup 15-second heartbeat interval when streamData is active
  useEffect(() => {
    if (!streamData || !streamData.streamToken) return;

    // Start heartbeat immediately and then every 15s
    const sendHeartbeat = async () => {
      try {
        await bookingService.vodHeartbeat(id, streamData.streamToken);
      } catch (err) {
        console.error('Heartbeat failed:', err);
        if (err.status === 409 || err.message?.includes('thiết bị khác') || err.message?.includes('409')) {
          notificationService.error('Tài khoản của bạn đang được xem ở thiết bị khác. Luồng phát này đã bị dừng.');
          navigate(`/movie/${id}`);
        } else if (err.message?.includes('hết hạn')) {
          notificationService.error('Vé xem trực tuyến của bạn đã hết hạn sử dụng.');
          navigate(`/movie/${id}`);
        }
      }
    };

    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 15000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [streamData, id, navigate]);

  // 3. Countdown timer for session expiration
  useEffect(() => {
    if (!streamData || !streamData.expiresAt) return;

    const timer = setInterval(() => {
      const expirationTime = new Date(streamData.expiresAt).getTime();
      const diff = expirationTime - Date.now();

      if (diff <= 0) {
        clearInterval(timer);
        notificationService.error('Thời hạn xem vé trực tuyến của bạn đã kết thúc.');
        navigate(`/movie/${id}`);
      } else {
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        const hStr = hours.toString().padStart(2, '0');
        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');

        setRemainingTimeText(`${hStr}:${mStr}:${sStr}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [streamData, id, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#070913] flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-t-purple-600 border-slate-800 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-purple-400 animate-pulse tracking-wider">ĐANG KHỞI TẠO ĐƯỜNG TRUYỀN PHIM...</p>
      </div>
    );
  }

  if (error || !movie || !streamData) {
    return (
      <div className="min-h-screen bg-[#070913] flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-4 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <p className="text-base font-bold text-red-500 mb-6 text-center max-w-md">{error || 'Có lỗi xảy ra khi tải luồng phát.'}</p>
        <button
          onClick={() => navigate(`/movie/${id}`)}
          className="bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
        >
          Quay lại chi tiết phim
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] flex flex-col text-white">
      <Navbar />

      <main className="flex-1 flex flex-col px-4 md:px-12 lg:px-20 py-8 max-w-7xl mx-auto w-full">
        {/* Back navigation & Session Info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <button
            onClick={() => navigate(`/movie/${id}`)}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-colors cursor-pointer w-fit"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại
          </button>

          <div className="flex items-center gap-3.5 bg-purple-950/20 border border-purple-500/25 px-4 py-2 rounded-xl">
            <Clock className="w-4 h-4 text-purple-400 animate-pulse" />
            <div className="text-left">
              <span className="text-[9px] uppercase tracking-wider text-purple-400 font-bold block leading-none mb-0.5">Thời gian còn lại</span>
              <span className="text-xs font-black text-white font-mono leading-none">{remainingTimeText || '--:--:--'}</span>
            </div>
          </div>
        </div>

        {/* Video Player Section */}
        <div className="relative w-full aspect-video rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(147,51,234,0.15)] border border-white/5 bg-black">
          {streamData.streamingUrl ? (
            <video
              src={streamData.streamingUrl}
              controls
              autoPlay
              className="w-full h-full object-contain"
              controlsList="nodownload"
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center p-6">
              <Film className="w-16 h-16 text-purple-500 fill-current mb-4 animate-pulse" />
              <h2 className="text-2xl font-black uppercase tracking-wider">Chưa tích hợp luồng phát</h2>
              <p className="text-gray-400 mt-2 font-medium">Link phim trực tuyến đang được cập nhật trên máy chủ.</p>
            </div>
          )}

          {/* Secure anti-sharing warning tag */}
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-2 text-[10px] text-red-400 font-bold tracking-wider uppercase select-none pointer-events-none">
            <ShieldAlert className="w-3.5 h-3.5" /> Chế độ bảo mật VOD hoạt động
          </div>
        </div>

        {/* Movie Meta Information */}
        <div className="mt-8 text-left space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {movie.ageRestriction && (
              <span className="bg-red-600 text-white px-3 py-1 rounded text-xs font-black uppercase tracking-wider">
                {movie.ageRestriction}
              </span>
            )}
            {movie.genres?.map((g) => (
              <span key={g} className="bg-purple-950/45 text-purple-400 px-3 py-1 rounded-full text-xs font-black border border-purple-500/20">
                {g}
              </span>
            ))}
          </div>

          <h1 className="text-2xl md:text-4xl font-black uppercase tracking-wide text-white">{movie.title}</h1>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-4xl font-medium">{movie.description}</p>

          <div className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-start gap-3 text-xs text-gray-400 max-w-4xl">
            <AlertTriangle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
            <p className="font-medium">
              Bạn đang xem luồng phát video trực tuyến bản quyền được mã hóa bởi <span className="text-purple-400 font-bold">NASAFilm VOD</span>.
              Vui lòng không mở tab xem phim trên nhiều trình duyệt hoặc chia sẻ tài khoản để đảm bảo phiên truyền tải không bị gián đoạn.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default WatchPage;
