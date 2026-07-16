import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  Clock,
  Calendar,
  Play,
  MapPin,
  Film,
  Award,
  X,
  AlertCircle,
  Users,
} from "lucide-react";
import { notificationService } from "../../../shared/services/notificationService";
import { movieService } from "../../../shared/services/movieService";
import { showtimeService } from "../../../shared/services/showtimeService";

import { useAuthContext } from "../../auth/hooks/useAuthContext";
import { orbitService } from "../../../shared/services/orbitService";
import { ORBIT_DEFAULT_MAX_MEMBERS } from "../../../shared/utils/orbitUtils";
import OrbitJoinInput from "../components/OrbitJoinInput";
import OrbitActiveRoomsPanel from "../components/OrbitActiveRoomsPanel";
import { useOrbitAccessibleRooms } from "../../../shared/hooks/useOrbitAccessibleRooms";
import {
  buildOrbitNavigateState,
  getRecentOrbitRoomForShowtime,
  rememberOrbitRoom,
} from "../../../shared/utils/orbitRecentStorage";
import { vodService } from "../../../shared/services/vodService";
import { resolveMovieOnlinePrice } from "../../../shared/utils/systemConfig";
import { systemConfigService } from "../../../shared/services/systemConfigService";
import { getOnlineMoviePath, getOnlineActionLabel, getMoviePosterUrl, formatAgeRestrictionBadge } from "../utils/movieUtils";
import PosterImage from "../../../shared/components/PosterImage";
import MovieReviewsSection from "../components/MovieReviewsSection";
import FavoriteButton from "../components/FavoriteButton";
import ShareButton from "../../../shared/components/ShareButton";
import PageMeta from "../../../shared/components/PageMeta";
import { resolveMediaUrl } from "../../../shared/utils/mediaUrlUtils";

import "./MovieDetailPage.css";

const getEmbedUrl = (url) => {
  if (!url) return null;
  const regExp =
    /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}?autoplay=1&rel=0`;
  }
  return url;
};

const MovieDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isFromOnline = searchParams.get("from") === "online";
  const { isAuthenticated } = useAuthContext();
  const [activeDateTab, setActiveDateTab] = useState("day-0");
  const [selectedShowtime, setSelectedShowtime] = useState(null);
  const [isCreatingOrbit, setIsCreatingOrbit] = useState(false);
  const [orbitFeatureEnabled, setOrbitFeatureEnabled] = useState(true);
  const { rooms: accessibleOrbitRooms, refresh: refreshOrbitRooms } = useOrbitAccessibleRooms({
    enabled: orbitFeatureEnabled,
  });
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [isVideoActive, setIsVideoActive] = useState(false);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [reviewSummary, setReviewSummary] = useState(null);

  const [dbMovie, setDbMovie] = useState(null);
  const [showtimes, setShowtimes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [vodStatus, setVodStatus] = useState(null);

  useEffect(() => {
    systemConfigService.getConfig().catch(() => {});
    orbitService.getFeatureStatus().then((s) => setOrbitFeatureEnabled(Boolean(s?.enabled))).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchVodStatus = async () => {
      if (
        isAuthenticated &&
        dbMovie &&
        (isFromOnline ||
          dbMovie.screeningMode === "BOTH" ||
          dbMovie.screeningMode === "ONLINE_ONLY")
      ) {
        try {
          const status = await vodService.getStatus(dbMovie.uuid);
          setVodStatus(status);
        } catch (err) {
          console.error("Failed to load VOD status:", err);
        }
      }
    };
    fetchVodStatus();
  }, [dbMovie, isAuthenticated, isFromOnline]);

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
          const movieId = String(data.uuid || '').toLowerCase();
          const movieShowtimes = (allShowtimes || []).filter(
            (st) => String(st.movieUuid || '').toLowerCase() === movieId,
          );
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

  // Scroll to top on load (unless opening reviews via hash)
  useEffect(() => {
    const openFromHash = window.location.hash === '#movie-reviews';
    if (!openFromHash) {
      window.scrollTo(0, 0);
      setReviewsExpanded(false);
    } else {
      setReviewsExpanded(true);
    }
  }, [id]);

  useEffect(() => {
    if (window.location.hash !== '#movie-reviews' || !dbMovie) return;

    const timer = window.setTimeout(() => {
      document.getElementById('movie-reviews')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [id, dbMovie]);

  const handleOpenReviews = (event) => {
    event.preventDefault();
    setReviewsExpanded(true);
    window.history.replaceState(null, '', '#movie-reviews');
    requestAnimationFrame(() => {
      document.getElementById('movie-reviews')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  const getDynamicDates = () => {
    const daysOfWeek = [
      "Chủ Nhật",
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
    ];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueDates = new Map();
    showtimes.forEach((st) => {
      const stDate = new Date(st.startTime);
      const normalized = new Date(
        stDate.getFullYear(),
        stDate.getMonth(),
        stDate.getDate(),
      );
      const key = `${normalized.getFullYear()}-${normalized.getMonth()}-${normalized.getDate()}`;
      if (!uniqueDates.has(key)) uniqueDates.set(key, normalized);
    });

    return Array.from(uniqueDates.values())
      .sort((a, b) => a - b)
      .map((d) => {
        const dayDiff = Math.round((d - today) / (24 * 60 * 60 * 1000));
        const dayName = dayDiff === 0 ? "Hôm nay" : daysOfWeek[d.getDay()];
        const dateStr = `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}`;
        const id = `day-${d.getFullYear()}${(d.getMonth() + 1).toString().padStart(2, "0")}${d.getDate().toString().padStart(2, "0")}`;

        return {
          id,
          label: `${dayName}, ${dateStr}`,
          fullDateText: `${dayName}, ${dateStr}`,
          rawDate: d,
        };
      });
  };

  const dynamicDates = useMemo(() => getDynamicDates(), [showtimes]);

  useEffect(() => {
    if (dynamicDates.length === 0) return;
    setActiveDateTab((prev) =>
      dynamicDates.some((d) => d.id === prev) ? prev : dynamicDates[0].id,
    );
  }, [dynamicDates]);

  const dateMap = {};
  dynamicDates.forEach((d) => {
    dateMap[d.id] = d.fullDateText;
  });

  const getShowtimesForActiveTab = () => {
    const activeDateObj = dynamicDates.find(
      (d) => d.id === activeDateTab,
    )?.rawDate;
    if (!activeDateObj) return [];

    return showtimes.filter((st) => {
      const stDate = new Date(st.startTime);
      return (
        stDate.getDate() === activeDateObj.getDate() &&
        stDate.getMonth() === activeDateObj.getMonth() &&
        stDate.getFullYear() === activeDateObj.getFullYear()
      );
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
      total: freeStandard + freeVip + freeCouple,
    };
  };

  const handleBookTickets = () => {
    const el = document.getElementById("select-showtimes");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
      notificationService.info(
        `Vui lòng chọn suất chiếu để tiếp tục đặt vé phim ${movie.title}`,
      );
    }
  };

  const handleShowtimeClick = (showtime) => {
    setSelectedShowtime(showtime);
  };

  const handleProceedToBooking = () => {
    if (!selectedShowtime) return;
    const theater = `${selectedShowtime.cinemaName} - ${selectedShowtime.cinemaRoomName}`;
    const dateText = dateMap[activeDateTab];
    const showtimeText = new Date(
      selectedShowtime.startTime,
    ).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    navigate("/booking", {
      state: {
        showtimeUuid: selectedShowtime.uuid,
        theater,
        movie: movie.title,
        movieUuid: dbMovie.uuid,
        moviePoster: movie.poster,
        movieRating: movie.rating,
        movieFormat: movie.format,
        movieAgeRestriction: movie.ageRestriction,
        date: dateText,
        showtime: showtimeText,
      },
    });
  };

  const handleEnterOrbitRoom = (roomOrEntry, movieExtras = {}) => {
    const roomUuid = roomOrEntry.uuid || roomOrEntry.roomUuid;
    if (!roomUuid) return;
    const state = buildOrbitNavigateState(
      {
        movieUuid: roomOrEntry.movieUuid,
        movieTitle: roomOrEntry.movieTitle,
        theater: roomOrEntry.theater,
        showtimeUuid: roomOrEntry.showtimeUuid,
      },
      movieExtras,
    );
    if (roomOrEntry.uuid) {
      rememberOrbitRoom(roomOrEntry, movieExtras);
    }
    navigate(`/booking/orbit/${roomUuid}`, { state });
  };

  const handleCreateOrbitRoom = async () => {
    if (!selectedShowtime) return;
    if (!isAuthenticated) {
      notificationService.info("Vui lòng đăng nhập để tạo phòng nhóm.");
      navigate("/login", { state: { from: `/movie/${id}` } });
      return;
    }
    const theater = `${selectedShowtime.cinemaName} - ${selectedShowtime.cinemaRoomName}`;
    const dateText = dateMap[activeDateTab];
    const showtimeText = new Date(selectedShowtime.startTime).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const movieExtras = {
      theater,
      movie: movie.title,
      movieUuid: dbMovie.uuid,
      moviePoster: movie.poster,
      movieRating: movie.rating,
      movieFormat: movie.format,
      movieAgeRestriction: movie.ageRestriction,
      date: dateText,
      showtime: showtimeText,
    };

    setIsCreatingOrbit(true);
    try {
      const room = await orbitService.createRoom(selectedShowtime.uuid, ORBIT_DEFAULT_MAX_MEMBERS);
      rememberOrbitRoom(room, movieExtras);
      notificationService.success("Đã tạo phòng nhóm — mời bạn bè qua link chia sẻ.");
      navigate(`/booking/orbit/${room.uuid}`, { state: movieExtras });
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("đang hoạt động")) {
        try {
          await refreshOrbitRooms();
          const rooms = await orbitService.getActiveRooms();
          const existing = rooms.find((r) => r.host) || rooms[0];
          if (existing) {
            rememberOrbitRoom(existing, movieExtras);
            notificationService.info("Bạn đã có phòng nhóm đang mở — chuyển vào phòng hiện tại.");
            handleEnterOrbitRoom(existing, movieExtras);
            return;
          }
        } catch {
          /* fall through */
        }
      }
      notificationService.error(msg || "Không thể tạo phòng nhóm.");
    } finally {
      setIsCreatingOrbit(false);
    }
  };

  const normalizeUuid = (value) => String(value || '').toLowerCase();

  const orbitForSelectedShowtime = useMemo(() => {
    if (!isAuthenticated || !selectedShowtime?.uuid) return null;
    const fromApi = accessibleOrbitRooms.find(
      (room) => normalizeUuid(room.showtimeUuid) === normalizeUuid(selectedShowtime.uuid),
    );
    if (fromApi) return { source: fromApi.source || 'active', room: fromApi };
    const recent = getRecentOrbitRoomForShowtime(selectedShowtime.uuid);
    if (recent) return { source: 'recent', room: recent };
    return null;
  }, [isAuthenticated, accessibleOrbitRooms, selectedShowtime?.uuid]);

  const hostActiveOtherRoom = useMemo(() => {
    if (!selectedShowtime?.uuid) return null;
    return accessibleOrbitRooms.find(
      (room) => (room.isHost || room.host)
        && normalizeUuid(room.showtimeUuid) !== normalizeUuid(selectedShowtime.uuid),
    ) || null;
  }, [accessibleOrbitRooms, selectedShowtime?.uuid]);

  const handleBuyVodClick = () => {
    if (!isAuthenticated) {
      notificationService.info(
        "Vui lòng đăng nhập để tiếp tục mua vé xem phim Online.",
      );
      navigate("/login", { state: { from: `/movie/${id}` } });
      return;
    }
    navigate("/checkout", {
      state: {
        isVod: true,
        movieUuid: dbMovie.uuid,
        movie: dbMovie.title,
        moviePoster: dbMovie.poster || "",
        movieRating: dbMovie.rating,
        movieFormat: "VOD 4K",
        movieAgeRestriction: dbMovie.ageRestriction || "P",
        totalAmount: resolveMovieOnlinePrice(dbMovie),
        date: "Mọi lúc, mọi nơi",
        showtime: "Xem trực tuyến",
        theater: "Trình phát video NASA VOD",
        selectedSeats: [],
        durationMinutes: dbMovie.durationMinutes || 120,
      },
    });
  };

  const handleWatchVodClick = () => {
    navigate(getOnlineMoviePath(dbMovie.uuid, vodStatus));
  };

  const seatInfo = selectedShowtime
    ? getSeatInfoForShowtime(selectedShowtime)
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f121d] flex items-center justify-center text-white">
        <p className="text-xl font-bold animate-pulse">
          Đang tải chi tiết phim...
        </p>
      </div>
    );
  }

  if (error || !dbMovie) {
    return (
      <div className="min-h-screen bg-[#0f121d] flex flex-col items-center justify-center text-white p-4">
        <p className="text-xl font-bold text-red-500 mb-4">
          {error || "Không tìm thấy phim"}
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-red-600 px-6 py-2 rounded-lg font-bold text-sm uppercase"
        >
          Quay lại trang chủ
        </button>
      </div>
    );
  }

  const posterRaw =
    dbMovie.medias?.find((m) => m.isPrimary)?.mediaUrl ||
    dbMovie.medias?.find((m) => m.mediaType === "POSTER")?.mediaUrl ||
    "";
  const backdropRaw =
    dbMovie.medias?.find((m) => m.mediaType === "BACKDROP")?.mediaUrl ||
    posterRaw ||
    "";

  const movie = {
    title: dbMovie.title || "",
    description: dbMovie.description || "",
    duration: dbMovie.durationMinutes ? `${dbMovie.durationMinutes} phút` : "",
    releaseDate: dbMovie.releaseDate || "",
    genres: dbMovie.genres || [],
    rating: dbMovie.rating,
    format: dbMovie.format || "2D",
    ageRestriction: dbMovie.ageRestriction || "",
    posterRaw,
    backdropRaw,
    poster: getMoviePosterUrl(dbMovie),
    backdrop: backdropRaw || posterRaw,
    trailer:
      dbMovie.medias?.find((m) => m.mediaType === "TRAILER")?.mediaUrl || "",
    cast:
      dbMovie.actors?.map((act) => ({
        name: act.fullName,
        role: act.characterName || "Diễn viên",
        avatar:
          act.avatarUrl ||
          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100",
      })) || [],
  };

  const hasBookableShowtime = (showtimes || []).some((st) => {
    const stStatus = String(st.status || '').toUpperCase();
    if (stStatus !== 'OPEN_FOR_BOOKING' && stStatus !== 'SOLD_OUT') return false;
    const startMs = new Date(st.startTime).getTime();
    return !Number.isNaN(startMs) && startMs > Date.now();
  });

  // Có suất mở bán sắp tới = đang chiếu (không phụ thuộc status/releaseDate trong admin).
  const isComingSoon = !isFromOnline && !hasBookableShowtime;

  const canBookTheater =
    hasBookableShowtime &&
    !isFromOnline &&
    (dbMovie.screeningMode === 'THEATER_ONLY' ||
      dbMovie.screeningMode === 'BOTH' ||
      !dbMovie.screeningMode);

  const showtimesForActiveTab = getShowtimesForActiveTab();

  const groupedShowtimes = showtimesForActiveTab.reduce((acc, st) => {
    const cinemaName = st.cinemaName || "NASA Landmark 81";
    if (!acc[cinemaName]) {
      acc[cinemaName] = {
        name: cinemaName,
        showtimes: [],
      };
    }
    acc[cinemaName].showtimes.push(st);
    return acc;
  }, {});

  return (
    <div className="movie-detail-wrapper">
      <PageMeta
        title={movie.title}
        description={movie.description?.slice(0, 160)}
        image={resolveMediaUrl(movie.posterRaw || movie.backdropRaw)}
      />

      <main className="relative pt-0">
        {/* Hero Section */}
        <section className="relative h-[650px] md:h-[780px] w-full overflow-hidden bg-black">
          {/* Base Backdrop Image Layer (Always visible, z-index: 0) */}
          <PosterImage
            alt="Movie backdrop"
            className={`movie-backdrop-img ${isVideoActive ? "video-active" : ""}`}
            src={movie.backdropRaw || movie.posterRaw}
            width={1200}
          />

          {/* Video Trailer Background Layer (Absolute on top, z-index: 10) */}
          {movie.trailer &&
            (() => {
              const isYouTube =
                movie.trailer.includes("youtube.com") ||
                movie.trailer.includes("youtu.be");
              if (isYouTube) {
                const regExp =
                  /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
                const match = movie.trailer.match(regExp);
                const videoId = match && match[2].length === 11 ? match[2] : "";
                const bgYoutubeUrl = videoId
                  ? `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&iv_load_policy=3&playsinline=1&enablejsapi=1`
                  : "";
                if (bgYoutubeUrl) {
                  return (
                    <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden scale-110 z-10">
                      <iframe
                        src={bgYoutubeUrl}
                        title="Background Trailer"
                        className="w-full h-full object-cover opacity-100"
                        style={{
                          border: "none",
                          transform: "scale(1.35)",
                          transformOrigin: "center",
                        }}
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
            <div className="hidden lg:block relative w-64 h-[380px] rounded-2xl overflow-hidden shadow-2xl poster-hover flex-shrink-0 border border-white/10 bg-[#0f121d]">
              {reviewSummary?.bestOnBigScreen && (
                <span className="movie-detail-best-screen-badge" title="Khán giả NASA khuyên xem trên màn chiếu lớn">
                  Best on Big Screen
                </span>
              )}
              <PosterImage
                alt="High-res Movie Poster"
                className="w-full h-full object-cover"
                src={movie.posterRaw}
                width={500}
              />
            </div>

            {/* Info */}
            <div className="flex-grow space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-3">
                {movie.ageRestriction && (
                  <span
                    className={`px-3 py-1 rounded text-xs font-black uppercase tracking-wider ${
                      movie.ageRestriction.toUpperCase() === "P"
                        ? "bg-emerald-600 text-white"
                        : movie.ageRestriction.toUpperCase().includes("T18")
                          ? "bg-red-600 text-white"
                          : "bg-amber-600 text-white"
                    }`}
                    title={movie.ageRestriction}
                  >
                    {formatAgeRestrictionBadge(movie.ageRestriction)}
                  </span>
                )}
                {movie.genres.map((g) => (
                  <span
                    key={g}
                    className="bg-red-600/20 text-red-500 px-3 py-1 rounded-full text-xs font-black border border-red-500/30"
                  >
                    {g}
                  </span>
                ))}
                {reviewSummary?.bestOnBigScreen && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-300 px-3 py-1 rounded-full text-xs font-black border border-amber-400/40 lg:hidden">
                    <Award className="h-3.5 w-3.5" />
                    Best on Big Screen
                  </span>
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
                  <Calendar className="h-4 w-4 text-red-500" />{" "}
                  {movie.releaseDate}
                </span>
              </div>

              <a
                href="#movie-reviews"
                onClick={handleOpenReviews}
                className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 text-sm font-bold transition-colors"
              >
                <Award className="h-4 w-4" />
                Xem đánh giá khán giả
              </a>

              <p className="text-gray-300 text-sm md:text-base max-w-2xl leading-relaxed font-medium">
                {movie.description}
              </p>

              <div className="flex flex-col gap-4 pt-4">
                <div className="flex flex-wrap items-center gap-4">
                {/* 1. Mua vé xem tại rạp — ẩn với phim sắp chiếu */}
                {canBookTheater && (
                  <button
                    onClick={handleBookTickets}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider neon-red-glow hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    Đặt vé tại rạp
                  </button>
                )}
                {isComingSoon && !isFromOnline && (
                  <span className="px-6 py-3.5 bg-amber-500/10 text-amber-300 rounded-xl font-bold text-sm uppercase tracking-wider border border-amber-400/30">
                    Sắp chiếu
                  </span>
                )}

                {/* 2. Vé xem Online VOD */}
                {(isFromOnline ||
                  dbMovie.screeningMode === "ONLINE_ONLY" ||
                  dbMovie.screeningMode === "BOTH") && (
                  <>
                    {vodStatus &&
                    vodStatus.hasPurchased &&
                    vodStatus.playbackState !== "EXPIRED" ? (
                      <button
                        onClick={handleWatchVodClick}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        {getOnlineActionLabel(vodStatus, "Xem phim Online")}
                      </button>
                    ) : (
                      <button
                        onClick={handleBuyVodClick}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider shadow-lg shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      >
                        Vé xem online
                      </button>
                    )}
                  </>
                )}

                {/* 3. Phim ngưng chiếu hoàn toàn */}
                {dbMovie.screeningMode === "NONE" && (
                  <span className="px-6 py-3.5 bg-gray-800 text-gray-500 rounded-xl font-bold text-sm uppercase tracking-wider border border-gray-700">
                    Phim tạm ngưng chiếu
                  </span>
                )}

                {/* 4. Nút Xem Trailer */}
                <button
                  onClick={() => setIsTrailerOpen(true)}
                  className="glass-panel text-white hover:text-red-500 px-8 py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider flex items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current text-red-500" /> Xem
                  Trailer
                </button>
                </div>

                {dbMovie?.uuid && (
                  <div className="flex flex-wrap items-center gap-4">
                    <FavoriteButton movieUuid={dbMovie.uuid} />
                    <ShareButton title={movie.title} text={movie.description} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Grid */}
        <section id="select-showtimes" className="movie-detail-content">
          {movie.cast.length > 0 && (
            <div className={`movie-detail-cast-col${isFromOnline ? ' movie-detail-cast-col--full' : ''}`}>
              <h3 className="movie-detail-section-title movie-detail-section-title--accent">
                Diễn Viên Chính
              </h3>
              <div className="movie-detail-cast-grid">
                {movie.cast.map((actor) => (
                  <div key={actor.name} className="movie-detail-cast-card">
                    <div className="movie-detail-cast-avatar">
                      <img alt={actor.name} src={actor.avatar} />
                    </div>
                    <div className="movie-detail-cast-meta">
                      <span className="movie-detail-cast-name">{actor.name}</span>
                      <span className="movie-detail-cast-role">{actor.role}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Right Side: Showtimes */}
          {!isFromOnline && canBookTheater && (
          <div className={`movie-detail-showtimes-col${movie.cast.length === 0 ? ' movie-detail-showtimes-col--full' : ''}`}>
            {orbitFeatureEnabled && (
              <div className="mb-5 space-y-3 flex flex-col items-center">
                <div className="w-full">
                  <OrbitJoinInput />
                </div>
                <div className="w-full">
                  <OrbitActiveRoomsPanel
                    title="Phòng Orbit của bạn"
                    enabled={orbitFeatureEnabled}
                  />
                </div>
              </div>
            )}
            <div className="movie-detail-showtimes-head">
              <h3 className="movie-detail-section-title">
                Chọn suất chiếu
              </h3>

              <div className="movie-detail-date-tabs scrollbar-hide">
                {dynamicDates.map((date) => (
                  <button
                    key={date.id}
                    type="button"
                    onClick={() => {
                      setActiveDateTab(date.id);
                      setSelectedShowtime(null);
                    }}
                    className={`movie-detail-date-tab${activeDateTab === date.id ? ' is-active' : ''}`}
                  >
                    {date.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="movie-detail-cinema-groups">
              {Object.keys(groupedShowtimes).length > 0 ? (
                Object.values(groupedShowtimes).map((cinemaGroup) => (
                  <div key={cinemaGroup.name} className="movie-detail-cinema-group">
                    <div className="movie-detail-cinema-head">
                      <div className="movie-detail-cinema-name">
                        <Film className="text-red-500 h-4 w-4" />
                        <h4>{cinemaGroup.name}</h4>
                      </div>
                      <span className="movie-detail-cinema-location">
                        <MapPin className="h-3 w-3 text-red-500" /> Hồ Chí Minh
                      </span>
                    </div>

                    <div className="movie-detail-cinema-divider" />

                    <div className="movie-detail-showtime-grid">
                      {cinemaGroup.showtimes.map((st) => {
                        const timeStr = new Date(
                          st.startTime,
                        ).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        });
                        const isSelected = selectedShowtime?.uuid === st.uuid;
                        const isSoldOut = st.status === "SOLD_OUT";
                        return (
                          <button
                            key={st.uuid}
                            type="button"
                            onClick={() =>
                              !isSoldOut && handleShowtimeClick(st)
                            }
                            disabled={isSoldOut}
                            className={`movie-detail-showtime-btn${
                              isSelected ? ' is-selected' : ''
                            }${isSoldOut ? ' is-sold-out' : ''}`}
                          >
                            {timeStr}
                            <span className="movie-detail-showtime-room">
                              {st.cinemaRoomName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div className="movie-detail-showtimes-empty">
                  <AlertCircle className="h-7 w-7 text-gray-600 mx-auto mb-2" />
                  Không có suất chiếu nào được lên lịch cho ngày này.
                </div>
              )}

              {selectedShowtime && seatInfo && (
                <div className="movie-detail-selected-showtime glass-panel border-red-500/20 bg-red-600/5 animate-fade-in">
                  <div className="space-y-1 text-left">
                    <span className="text-[10px] font-black uppercase text-red-500 tracking-wider">
                      Suất chiếu đã chọn
                    </span>
                    <h4 className="text-base font-black text-white uppercase">
                      {selectedShowtime.cinemaName} -{" "}
                      {selectedShowtime.cinemaRoomName}
                    </h4>
                    <p className="text-xs font-bold text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span>
                        {dateMap[activeDateTab]} •{" "}
                        <span className="text-red-500 font-extrabold">
                          {new Date(
                            selectedShowtime.startTime,
                          ).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })}
                        </span>
                      </span>
                      <span className="text-gray-600 hidden sm:inline">|</span>
                      <span className="text-emerald-400">
                        Còn trống:{" "}
                        <span className="font-extrabold">{seatInfo.total}</span>{" "}
                        ghế
                      </span>
                    </p>
                    {/* Seat type breakdown badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400">
                        Ghế Thường:{" "}
                        <span className="text-white font-extrabold">
                          {seatInfo.standard}
                        </span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-yellow-500/5 border border-yellow-500/20 text-yellow-500/80">
                        Ghế VIP:{" "}
                        <span className="text-yellow-400 font-extrabold">
                          {seatInfo.vip}
                        </span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/5 border border-red-500/20 text-red-500/80">
                        Ghế Đôi:{" "}
                        <span className="text-red-400 font-extrabold">
                          {seatInfo.couple}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                      onClick={handleProceedToBooking}
                      className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>Đặt ghế ngay</span>
                    </button>
                    {orbitFeatureEnabled && (
                    <>
                    {orbitForSelectedShowtime && (
                      <button
                        type="button"
                        onClick={() => handleEnterOrbitRoom(
                          orbitForSelectedShowtime.room,
                          {
                            theater: `${selectedShowtime.cinemaName} - ${selectedShowtime.cinemaRoomName}`,
                            movie: movie.title,
                            movieUuid: dbMovie.uuid,
                            moviePoster: movie.poster,
                            movieRating: movie.rating,
                            movieFormat: movie.format,
                            movieAgeRestriction: movie.ageRestriction,
                            date: dateMap[activeDateTab],
                            showtime: new Date(selectedShowtime.startTime).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: false,
                            }),
                          },
                        )}
                        className="border border-emerald-500/40 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-100 px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Users className="w-4 h-4" />
                        {orbitForSelectedShowtime.source === "recent"
                          ? "Vào lại phòng nhóm"
                          : (orbitForSelectedShowtime.room.isHost || orbitForSelectedShowtime.room.host ? "Vào phòng nhóm của bạn" : "Vào phòng nhóm")}
                      </button>
                    )}
                    {!orbitForSelectedShowtime && (
                    <button
                      type="button"
                      onClick={handleCreateOrbitRoom}
                      disabled={isCreatingOrbit || Boolean(hostActiveOtherRoom)}
                      className="border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-100 px-6 py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Users className="w-4 h-4" />
                      {isCreatingOrbit ? "Đang tạo..." : "Tạo phòng nhóm"}
                    </button>
                    )}
                    {hostActiveOtherRoom && !orbitForSelectedShowtime && (
                      <button
                        type="button"
                        onClick={() => handleEnterOrbitRoom(hostActiveOtherRoom, {
                          movie: movie.title,
                          movieUuid: dbMovie.uuid,
                        })}
                        className="border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Vào phòng nhóm đang mở
                      </button>
                    )}
                    </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
        </section>

        <div id="movie-reviews" className="movie-reviews-anchor">
          <MovieReviewsSection
            movieUuid={dbMovie.uuid}
            movieTitle={movie.title}
            isExpanded={reviewsExpanded}
            onExpandedChange={setReviewsExpanded}
            onSummaryChange={setReviewSummary}
            showTheaterCta={canBookTheater}
            showOnlineCta={
              isFromOnline ||
              dbMovie.screeningMode === 'ONLINE_ONLY' ||
              dbMovie.screeningMode === 'BOTH'
            }
          />
        </div>
      </main>

      {/* Trailer Modal */}
      {isTrailerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/95 backdrop-blur-md"
            onClick={() => setIsTrailerOpen(false)}
          ></div>
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
                const isYouTube =
                  movie.trailer.includes("youtube.com") ||
                  movie.trailer.includes("youtu.be");
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
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">
                  Chưa có Trailer
                </h2>
                <p className="text-gray-400 mt-2 font-medium">
                  Trailer chính thức của bộ phim {movie.title} đang được cập
                  nhật.
                </p>
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
    </div>
  );
};

export default MovieDetailPage;
