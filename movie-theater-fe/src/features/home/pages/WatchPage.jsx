import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Clock,
  ShieldAlert,
  AlertCircle,
  Play,
  Film,
  ChevronLeft,
  Minimize2,
} from 'lucide-react';
import { vodService } from '../../../shared/services/vodService';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import { filterOnlineMovies, getOnlineActivatePath, getMovieStreamingUrl, canWatchOnlineDirectly, getOnlineMoviePath, VOD_VERIFIED_KEY } from '../utils/movieUtils';
import { useOnlineVodRoutes } from '../hooks/useOnlineVodRoutes';
import { resolveMediaUrl } from '../../../shared/utils/mediaUrlUtils';
import PosterImage from '../../../shared/components/PosterImage';
import { getVideoSource, isEmbeddableSource, isUnsupportedSource, getProviderLabel } from '../utils/videoSourceUtils';
import Hls from 'hls.js';
import { useHomeChrome } from '../context/HomeChromeContext';
import './WatchPage.css';

const formatDuration = (mins) => {
  if (!mins) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const getPosterRaw = (movie) =>
  movie?.medias?.find((m) => m.isPrimary)?.mediaUrl ||
  movie?.medias?.find((m) => m.mediaType === 'POSTER')?.mediaUrl ||
  movie?.primaryMediaUrl ||
  movie?.poster ||
  '';

const getBackdropRaw = (movie) =>
  movie?.medias?.find((m) => m.mediaType === 'BACKDROP')?.mediaUrl || getPosterRaw(movie);

const WatchPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const playerSlotRef = useRef(null);
  const [movie, setMovie] = useState(null);
  const [upNext, setUpNext] = useState([]);
  const [streamData, setStreamData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isStartingPlay, setIsStartingPlay] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [cinemaModeType, setCinemaModeType] = useState(null);
  const { setHideChrome } = useHomeChrome();
  const [cinemaRect, setCinemaRect] = useState(null);
  const [cinemaUiVisible, setCinemaUiVisible] = useState(true);
  const [videoError, setVideoError] = useState('');
  const [directUrlIndex, setDirectUrlIndex] = useState(0);
  const [remainingTimeText, setRemainingTimeText] = useState('');
  const heartbeatIntervalRef = useRef(null);
  const cinemaUiTimerRef = useRef(null);

  const sidebarUuids = useMemo(() => upNext.map((m) => m.uuid), [upNext]);
  const { getOnlinePath } = useOnlineVodRoutes(sidebarUuids);

  const getFullscreenRect = () => ({
    top: 0,
    left: 0,
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const getElementRect = (el) => {
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
    };
  };

  const showCinemaUi = () => {
    setCinemaUiVisible(true);
    if (cinemaUiTimerRef.current) clearTimeout(cinemaUiTimerRef.current);
    cinemaUiTimerRef.current = setTimeout(() => setCinemaUiVisible(false), 3200);
  };

  const enterCinemaMode = async () => {
    if (!isPlaying || !playerRef.current) return;

    if (playerRef.current.requestFullscreen) {
      try {
        await playerRef.current.requestFullscreen();
        setIsCinemaMode(true);
        setCinemaModeType('native');
        return;
      } catch {
        /* fallback to custom cinema */
      }
    }

    const startRect = getElementRect(playerRef.current);
    setCinemaModeType('custom');
    setCinemaRect(startRect);
    setIsCinemaMode(true);
    setCinemaUiVisible(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setCinemaRect(getFullscreenRect());
      });
    });
    if (cinemaUiTimerRef.current) clearTimeout(cinemaUiTimerRef.current);
    cinemaUiTimerRef.current = setTimeout(() => setCinemaUiVisible(false), 3200);
  };

  const exitCinemaMode = async () => {
    if (cinemaUiTimerRef.current) clearTimeout(cinemaUiTimerRef.current);
    setCinemaUiVisible(true);

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }

    if (cinemaModeType === 'custom' && playerSlotRef.current) {
      setCinemaRect(getFullscreenRect());
      await new Promise((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setCinemaRect(getElementRect(playerSlotRef.current));
            window.setTimeout(resolve, 560);
          });
        });
      });
    }

    setIsCinemaMode(false);
    setCinemaModeType(null);
    setCinemaRect(null);
  };

  const toggleCinemaMode = () => {
    if (!isPlaying) return;
    if (isCinemaMode) exitCinemaMode();
    else enterCinemaMode();
  };

  useEffect(() => {
    return () => {
      if (cinemaUiTimerRef.current) clearTimeout(cinemaUiTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsCinemaMode(false);
        setCinemaModeType(null);
        setCinemaRect(null);
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && isCinemaMode && cinemaModeType === 'custom') {
        exitCinemaMode();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCinemaMode, cinemaModeType]);

  useEffect(() => {
    if (isCinemaMode && cinemaModeType === 'custom') {
      document.body.classList.add('watch-cinema-active');
    } else {
      document.body.classList.remove('watch-cinema-active');
    }
    return () => document.body.classList.remove('watch-cinema-active');
  }, [isCinemaMode, cinemaModeType]);

  useEffect(() => {
    setHideChrome(isCinemaMode && cinemaModeType === 'custom');
    return () => setHideChrome(false);
  }, [isCinemaMode, cinemaModeType, setHideChrome]);

  useEffect(() => {
    let active = true;
    const initializeStream = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [movieDetail, moviesData] = await Promise.all([
          movieService.getMovieDetail(id),
          movieService.getMovies({ status: 'NOW_SHOWING', page: 0, size: 12 }),
        ]);
        if (!active) return;
        setMovie(movieDetail);

        const onlineList = filterOnlineMovies(moviesData?.content || []).filter(
          (m) => m.uuid !== id
        );
        setUpNext(onlineList.slice(0, 3));

        const status = await vodService.getStatus(id);
        if (!active) return;
        if (!status.hasPurchased) {
          throw new Error('Bạn chưa mua vé xem trực tuyến phim này.');
        }
        if (status.playbackState === 'EXPIRED') {
          throw new Error('Vé xem phim trực tuyến của bạn đã hết hạn.');
        }

        const resolvedStreamUrl = getMovieStreamingUrl(movieDetail);
        if (!resolvedStreamUrl?.trim()) {
          throw new Error(
            'Phim chưa được cấu hình link phát trực tuyến. Admin cần thêm URL video (.mp4) hoặc YouTube/Vimeo trong trang quản lý phim.'
          );
        }

        if (canWatchOnlineDirectly(status)) {
          const playSession = await vodService.activatePlay(id);
          if (!active) return;
          setStreamData({ ...playSession, streamingUrl: playSession.streamingUrl || resolvedStreamUrl.trim() });
          setPreviewReady(false);
          setIsPlaying(true);
          return;
        }

        const verifiedBookingUuid = sessionStorage.getItem(VOD_VERIFIED_KEY(id));
        if (!verifiedBookingUuid) {
          navigate(getOnlineActivatePath(id), { replace: true });
          return;
        }

        setPreviewReady(true);
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Không thể bắt đầu luồng phát phim trực tuyến.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    if (id) initializeStream();
    return () => {
      active = false;
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (!streamData?.streamToken) return;

    const sendHeartbeat = async () => {
      try {
        await vodService.heartbeat(id, streamData.streamToken);
      } catch (err) {
        if (err.status === 409 || err.message?.includes('thiết bị khác')) {
          notificationService.error('Tài khoản đang xem ở thiết bị khác.');
          navigate(`/movie/${id}?from=online`);
        } else if (err.message?.includes('hết hạn')) {
          notificationService.error('Vé xem trực tuyến đã hết hạn.');
          navigate(`/movie/${id}?from=online`);
        }
      }
    };

    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 15000);
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [streamData, id, navigate]);

  useEffect(() => {
    if (!streamData?.expiresAt) return;

    const timer = setInterval(() => {
      const diff = new Date(streamData.expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(timer);
        notificationService.error('Thời hạn xem vé trực tuyến đã kết thúc.');
        navigate(`/movie/${id}?from=online`);
      } else {
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setRemainingTimeText(
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        );
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [streamData, id, navigate]);

  const handlePlay = async () => {
    setVideoError('');
    if (streamData?.streamToken) {
      setIsPlaying(true);
      return;
    }
    if (isStartingPlay) return;
    setIsStartingPlay(true);
    try {
      const verifiedBookingUuid = sessionStorage.getItem(VOD_VERIFIED_KEY(id));
      const playSession = await vodService.activatePlay(id, verifiedBookingUuid || undefined);
      const resolvedStreamUrl = playSession.streamingUrl || getMovieStreamingUrl(movie);
      if (!resolvedStreamUrl?.trim()) {
        throw new Error('Phim chưa được cấu hình link phát trực tuyến.');
      }
      sessionStorage.removeItem(VOD_VERIFIED_KEY(id));
      setStreamData({ ...playSession, streamingUrl: resolvedStreamUrl.trim() });
      setPreviewReady(false);
      setIsPlaying(true);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể bắt đầu phát phim.');
    } finally {
      setIsStartingPlay(false);
    }
  };

  const streamUrl = streamData?.streamingUrl || movie?.streamingUrl || '';
  const videoSource = getVideoSource(streamUrl);

  const getDirectPlaybackUrl = () => {
    if (!videoSource?.url) return '';
    if (!videoSource.fallbackUrls?.length) return videoSource.url;
    if (directUrlIndex === 0) return videoSource.url;
    return videoSource.fallbackUrls[directUrlIndex - 1] || videoSource.url;
  };

  useEffect(() => {
    setDirectUrlIndex(0);
    setVideoError('');
  }, [streamUrl]);

  const handleDirectVideoError = () => {
    const maxAttempts = 1 + (videoSource.fallbackUrls?.length || 0);
    if (directUrlIndex < maxAttempts - 1) {
      setDirectUrlIndex((prev) => prev + 1);
      setVideoError('');
      return;
    }

    const driveHint =
      videoSource.provider === 'drive'
        ? ' Google Drive cần bật "Ai có link đều xem được" và file dung lượng nhỏ hơn 100MB, hoặc dùng link .mp4 trên Cloudinary.'
        : '';
    setVideoError(
      `Không thể tải video từ ${getProviderLabel(videoSource)}.${driveHint}`
    );
  };

  useEffect(() => {
    if (!isPlaying || videoSource.type !== 'direct') return;

    const video = videoRef.current;
    if (!video) return;

    const startPlayback = async () => {
      try {
        await video.play();
      } catch {
        /* Trình duyệt có thể chặn autoplay — người dùng bấm play trên thanh điều khiển */
      }
    };

    if (video.readyState >= 2) {
      startPlayback();
      return;
    }

    video.addEventListener('loadeddata', startPlayback, { once: true });
    return () => video.removeEventListener('loadeddata', startPlayback);
  }, [isPlaying, videoSource.type, videoSource.url, streamUrl, directUrlIndex]);

  useEffect(() => {
    if (!isPlaying || videoSource.type !== 'hls') return;

    const video = videoRef.current;
    if (!video || !videoSource.url) return;

    let hlsInstance = null;

    const startPlayback = async () => {
      try {
        await video.play();
      } catch {
        /* autoplay có thể bị chặn */
      }
    };

    if (Hls.isSupported()) {
      hlsInstance = new Hls({ enableWorker: true });
      hlsInstance.loadSource(videoSource.url);
      hlsInstance.attachMedia(video);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, startPlayback);
      hlsInstance.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setVideoError(`Không thể phát HLS stream (${getProviderLabel(videoSource)}).`);
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = videoSource.url;
      video.addEventListener('loadedmetadata', startPlayback, { once: true });
    } else {
      setVideoError('Trình duyệt không hỗ trợ phát HLS (.m3u8).');
    }

    return () => {
      if (hlsInstance) hlsInstance.destroy();
    };
  }, [isPlaying, videoSource.type, videoSource.url, streamUrl]);

  if (isLoading) {
    return (
      <div className="watch-page min-h-screen flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-t-red-600 border-white/10 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-red-400 animate-pulse tracking-wider">
          Đang khởi tạo luồng phát...
        </p>
      </div>
    );
  }

  if (error || !movie || (!streamData && !previewReady)) {
    return (
      <div className="watch-page min-h-screen flex flex-col items-center justify-center text-white p-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-4 text-red-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <p className="text-base font-bold text-red-500 mb-6 text-center max-w-md">
          {error || 'Có lỗi xảy ra khi tải luồng phát.'}
        </p>
        <button
          type="button"
          onClick={() => navigate(`/online/activate/${id}`)}
          className="bg-red-600 hover:bg-red-700 px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all"
        >
          Quay lại kích hoạt vé
        </button>
      </div>
    );
  }

  const backdrop = getBackdropRaw(movie);
  const releaseYear = movie.releaseDate
    ? new Date(movie.releaseDate).getFullYear()
    : null;
  const genreLabel = movie.genres?.slice(0, 2).join(' / ') || 'Phim';
  const isCustomCinema = isCinemaMode && cinemaModeType === 'custom';

  const renderPlayerMedia = () => {
    if (!isPlaying) return null;

    if (videoSource.type === 'none') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-6 text-center">
          <Film className="w-14 h-14 text-red-500 mb-3" />
          <p className="text-sm text-white/60">Luồng phát đang được cập nhật.</p>
        </div>
      );
    }

    if (isUnsupportedSource(videoSource)) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <p className="text-sm text-white/80 max-w-md leading-relaxed">{videoSource.message}</p>
        </div>
      );
    }

    if (isEmbeddableSource(videoSource)) {
      return (
        <iframe
          src={videoSource.embedUrl}
          title={movie.title}
          className="watch-player-embed"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      );
    }

    if (videoSource.type === 'direct' || videoSource.type === 'hls') {
      return (
        <>
          <video
            ref={videoRef}
            key={`${videoSource.type}-${getDirectPlaybackUrl()}-${directUrlIndex}`}
            src={videoSource.type === 'direct' ? getDirectPlaybackUrl() : undefined}
            controls={!isCustomCinema}
            autoPlay={videoSource.type === 'direct'}
            playsInline
            className="watch-player-video"
            controlsList="nodownload"
            onContextMenu={(e) => e.preventDefault()}
            onError={handleDirectVideoError}
          />
          {videoError && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/90 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-red-500 mb-3" />
              <p className="text-sm text-white/70 max-w-sm">{videoError}</p>
            </div>
          )}
        </>
      );
    }

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black p-6 text-center">
        <Film className="w-14 h-14 text-red-500 mb-3" />
        <p className="text-sm text-white/60">Link phát không hợp lệ hoặc chưa được cấu hình.</p>
      </div>
    );
  };

  return (
    <div className="watch-page min-h-screen flex flex-col text-white">
      <div className={`watch-cinema-backdrop ${isCustomCinema ? 'watch-cinema-backdrop--visible' : ''}`} />

      <main className={`flex-1 px-4 md:px-8 lg:px-16 xl:px-20 py-6 md:py-8 ${isCustomCinema ? 'pointer-events-none' : ''}`}>
        <div className={`max-w-[1440px] mx-auto watch-page-content ${isCustomCinema ? 'watch-page-content--cinema' : ''}`}>
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <button
              type="button"
              onClick={() => navigate('/online')}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white/50 hover:text-white transition-colors w-fit"
            >
              <ChevronLeft className="w-4 h-4" /> Trực tuyến
            </button>
            <div className="watch-timer-badge">
              <Clock className="w-4 h-4 text-red-400" />
              <div>
                <span className="text-[9px] uppercase tracking-wider text-red-400/80 font-bold block">
                  Thời gian còn lại
                </span>
                <span className="font-mono font-bold text-white">{remainingTimeText || '--:--:--'}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-10">
            {/* Left column */}
            <div className="lg:col-span-8 space-y-6">
              {/* Player */}
              <div className="relative">
                {isCustomCinema && <div ref={playerSlotRef} className="watch-player-slot" aria-hidden />}

                <div
                  ref={playerRef}
                  className={`watch-player-wrap ${isCustomCinema ? 'watch-player-wrap--cinema' : ''} ${isCustomCinema && !cinemaUiVisible ? 'watch-player-wrap--cinema-ui-hidden' : ''}`}
                  style={
                    isCustomCinema && cinemaRect
                      ? {
                          top: cinemaRect.top,
                          left: cinemaRect.left,
                          width: cinemaRect.width,
                          height: cinemaRect.height,
                        }
                      : undefined
                  }
                  onMouseMove={isCustomCinema ? showCinemaUi : undefined}
                >
                {!isPlaying && (previewReady || streamData) && (
                  <>
                    <PosterImage src={backdrop} alt={movie.title} width={1200} className="watch-player-poster" />
                    <div className="watch-player-overlay" />
                    {!isCinemaMode && (
                      <div className="watch-vod-badge">
                        <ShieldAlert className="w-3.5 h-3.5" /> Bảo mật VOD
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handlePlay}
                      className="watch-play-btn"
                      aria-label="Phát phim"
                    >
                      <Play className="h-7 w-7 fill-current ml-1" />
                    </button>
                  </>
                )}

                {renderPlayerMedia()}

                <div className={`watch-cinema-vignette ${isEmbeddableSource(videoSource) ? 'watch-cinema-vignette--hidden' : ''}`} aria-hidden />

                {isPlaying && isCustomCinema && (
                  <div className="watch-cinema-ui">
                    <div className="watch-cinema-ui-top">
                      <button
                        type="button"
                        onClick={exitCinemaMode}
                        className="watch-cinema-exit-btn"
                      >
                        <Minimize2 className="h-4 w-4" />
                        Thu nhỏ
                      </button>
                      <div className="watch-timer-badge border-white/10 bg-black/40">
                        <Clock className="w-3.5 h-3.5 text-red-400" />
                        <span className="font-mono text-xs font-bold">{remainingTimeText}</span>
                      </div>
                    </div>
                    <div className="watch-cinema-ui-bottom">
                      <button
                        type="button"
                        onClick={toggleCinemaMode}
                        className="watch-cinema-exit-btn"
                      >
                        <Minimize2 className="h-4 w-4" />
                        Thoát chế độ rạp
                      </button>
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* Title row */}
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="space-y-3">
                  <h1 className="watch-title">{movie.title}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="watch-tag">{genreLabel}</span>
                    {releaseYear && <span className="watch-tag">{releaseYear}</span>}
                    {movie.ageRestriction && (
                      <span className="watch-tag border-red-500/30 text-red-400">
                        {movie.ageRestriction}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <Link
                    to="/online"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-white/80 hover:bg-white/10 transition-colors"
                  >
                    Xem thêm phim
                  </Link>
                </div>
              </div>

              {/* Synopsis + Cast */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-7 space-y-3">
                  <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500">
                    Tóm tắt
                  </h2>
                  <p className="text-sm text-white/60 leading-relaxed">{movie.description}</p>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Đạo diễn</p>
                      <p className="text-sm font-semibold text-white/80">
                        {movie.director || 'NASAFilm Studio'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Quốc gia</p>
                      <p className="text-sm font-semibold text-white/80">
                        {movie.countries?.join(', ') || '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {movie.actors?.length > 0 && (
                  <div className="md:col-span-5 rounded-xl border border-white/5 bg-[#111111] p-4">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.25em] text-red-500 mb-4">
                      Diễn viên
                    </h2>
                    <div className="space-y-3">
                      {movie.actors.slice(0, 3).map((actor) => (
                        <div key={actor.uuid || actor.fullName} className="flex items-center gap-3">
                          <img
                            src={
                              actor.avatarUrl ||
                              'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100'
                            }
                            alt={actor.fullName}
                            className="h-10 w-10 rounded-full object-cover border border-white/10"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">{actor.fullName}</p>
                            <p className="text-[10px] text-white/40 uppercase tracking-wide">
                              {actor.characterName || 'Diễn viên'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <aside className="lg:col-span-4 space-y-5">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">Tiếp theo</h2>
                  <Link to="/online" className="text-[10px] font-bold uppercase tracking-wider text-red-500 hover:text-red-400">
                    Xem tất cả
                  </Link>
                </div>
                <div className="space-y-2">
                  {upNext.map((item) => (
                    <Link
                      key={item.uuid}
                      to={getOnlinePath(item.uuid)}
                      className="watch-sidebar-card"
                    >
                      <PosterImage
                        src={item.primaryMediaUrl || item.poster}
                        alt={item.title}
                        width={96}
                        className="h-16 w-24 shrink-0 rounded object-cover"
                      />
                      <div className="min-w-0 py-0.5">
                        <p className="text-xs font-bold text-white uppercase line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-white/40 mt-0.5">
                          {item.genres?.[0]} · {formatDuration(item.durationMinutes)}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {upNext.length === 0 && (
                    <p className="text-sm text-white/40 py-4">Chưa có phim gợi ý.</p>
                  )}
                </div>
              </div>

              {upNext[0] && (
              <Link to={getOnlinePath(upNext[0].uuid)} className="watch-feature-box block group">
                <div
                  className="absolute inset-0 opacity-25 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${resolveMediaUrl(upNext[0].primaryMediaUrl || upNext[0].poster, 600)})` }}
                />
                <div className="relative">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500">
                    Gợi ý tiếp theo
                  </p>
                  <h3 className="mt-2 text-lg font-black uppercase text-white leading-tight line-clamp-2">
                    {upNext[0].title}
                  </h3>
                  <p className="mt-2 text-xs text-white/50 leading-relaxed">
                    {upNext[0].genres?.slice(0, 2).join(' · ')}
                    {upNext[0].durationMinutes ? ` · ${upNext[0].durationMinutes} phút` : ''}
                  </p>
                  <span className="inline-block mt-4 rounded border border-red-500/40 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-red-400 group-hover:bg-red-500/10 transition-colors">
                    Xem phim này
                  </span>
                </div>
              </Link>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WatchPage;
