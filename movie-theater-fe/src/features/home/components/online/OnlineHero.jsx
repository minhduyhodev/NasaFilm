import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Play, ChevronLeft, ChevronRight } from "lucide-react";
import { movieService } from "../../../../shared/services/movieService";
import {
  getOnlineMoviePath,
  getMoviePosterUrl,
  getHeroTrailerUrl,
  preloadHeroBackground,
  pickPosterMediaUrl,
} from "../../utils/movieUtils";
import PosterImage from "../../../../shared/components/PosterImage";
import { getHeroBackgroundSource } from "../../utils/videoSourceUtils";
import "./OnlineHero.css";

const HERO_LIMIT = 8;
const SLIDE_DURATION_MS = 12000;
const TICK_MS = 80;

const formatDuration = (mins) => {
  if (!mins) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
};

const buildSubtitle = (movie) => {
  if (!movie) {
    return "Thưởng thức phim 4K mọi lúc mọi nơi trên NASAFilm.";
  }
  const parts = [];
  if (movie.durationMinutes) parts.push(formatDuration(movie.durationMinutes));
  if (movie.genres?.length) parts.push(...movie.genres.slice(0, 2));
  return parts.length > 0
    ? parts.join(" · ")
    : "Xem trực tuyến chất lượng cao trên NASAFilm.";
};

const OnlineHero = ({
  movies = [],
  isLoading = false,
  getOnlinePath,
  getActionLabel,
  staticHeroBackground,
}) => {
  const [enrichedMovies, setEnrichedMovies] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trailerReady, setTrailerReady] = useState(false);
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const enrichTokenRef = useRef(0);

  const slides = useMemo(() => {
    if (enrichedMovies.length > 0) return enrichedMovies.slice(0, HERO_LIMIT);
    return movies.slice(0, HERO_LIMIT);
  }, [enrichedMovies, movies]);

  const displayMovie = slides[currentIndex] || null;
  const showLoadingSkeleton = isLoading && !displayMovie;
  const contentKey = displayMovie?.uuid || "fallback";
  const title = displayMovie?.title || "Phim Trực Tuyến";
  const subtitle = buildSubtitle(displayMovie);

  useEffect(() => {
    if (!movies?.length) {
      setEnrichedMovies([]);
      setCurrentIndex(0);
      return;
    }

    setEnrichedMovies(movies.slice(0, HERO_LIMIT));
    setCurrentIndex(0);

    const token = enrichTokenRef.current + 1;
    enrichTokenRef.current = token;
    let cancelled = false;

    const enrich = async () => {
      const targetMovies = movies.slice(0, HERO_LIMIT);
      let summaries = [];
      try {
        summaries = await movieService.getMovieSummaries(targetMovies.map((m) => m.uuid));
      } catch {
        summaries = [];
      }
      const summaryByUuid = new Map(summaries.map((s) => [s.uuid, s]));

      const detailed = targetMovies.map((movie) => {
        const summary = summaryByUuid.get(movie.uuid);
        if (!summary) return movie;
        return {
          ...movie,
          title: summary.title || movie.title,
          ageRestriction: summary.ageRestriction || movie.ageRestriction,
          primaryMediaUrl: summary.primaryMediaUrl || pickPosterMediaUrl(movie),
        };
      });
      if (!cancelled && enrichTokenRef.current === token) {
        setEnrichedMovies(detailed);
      }
    };

    enrich();
    return () => {
      cancelled = true;
    };
  }, [movies]);

  const goToSlide = useCallback(
    (index) => {
      if (!slides.length) return;
      const next = (index + slides.length) % slides.length;
      setCurrentIndex(next);
      setProgress(0);
    },
    [slides.length],
  );

  const goNext = useCallback(
    () => goToSlide(currentIndex + 1),
    [currentIndex, goToSlide],
  );
  const goPrev = useCallback(
    () => goToSlide(currentIndex - 1),
    [currentIndex, goToSlide],
  );

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return undefined;

    timerRef.current = window.setInterval(() => {
      setProgress((prev) => {
        const next = prev + (TICK_MS / SLIDE_DURATION_MS) * 100;
        if (next >= 100) {
          goToSlide(currentIndex + 1);
          return 0;
        }
        return next;
      });
    }, TICK_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [slides.length, currentIndex, isPaused, goToSlide]);

  const posterRaw = displayMovie ? pickPosterMediaUrl(displayMovie) : "";
  const trailerUrl = displayMovie ? getHeroTrailerUrl(displayMovie) : "";
  const heroSource = trailerUrl
    ? getHeroBackgroundSource(trailerUrl)
    : { type: "none" };

  useEffect(() => {
    if (!displayMovie?.uuid) {
      setTrailerReady(false);
      return undefined;
    }

    let cancelled = false;
    setTrailerReady(false);

    const loadTrailer = async () => {
      await preloadHeroBackground(displayMovie);
      if (!cancelled) setTrailerReady(true);
    };

    loadTrailer();
    setProgress(0);

    const video = videoRef.current;
    if (video) {
      video.load();
      video.play().catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [displayMovie?.uuid]);

  const movieLink = displayMovie?.uuid
    ? getOnlinePath
      ? getOnlinePath(displayMovie.uuid)
      : getOnlineMoviePath(displayMovie.uuid)
    : "/online";
  const actionLabel = displayMovie
    ? getActionLabel
      ? getActionLabel(displayMovie.uuid, "Xem ngay")
      : "Xem ngay"
    : "Xem ngay";

  return (
    <section
      className="online-hero online-hero--page"
      style={
        staticHeroBackground
          ? { backgroundImage: `url(${staticHeroBackground})` }
          : undefined
      }
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="online-hero__backdrop">
        {posterRaw && (
          <PosterImage
            src={posterRaw}
            alt=""
            aria-hidden="true"
            width={1400}
            loading="eager"
            className="online-hero__poster online-hero__poster--base"
          />
        )}

        {trailerReady && heroSource.type === "image" && (
          <motion.img
            key={`trailer-${displayMovie?.uuid}`}
            src={heroSource.url}
            alt=""
            aria-hidden="true"
            className="online-hero__poster online-hero__poster--trailer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            decoding="async"
            onError={(e) => {
              if (
                heroSource.fallbackUrl &&
                e.currentTarget.src !== heroSource.fallbackUrl
              ) {
                e.currentTarget.src = heroSource.fallbackUrl;
              }
            }}
          />
        )}

        {trailerReady && heroSource.type === "video" && (
          <motion.video
            key={heroSource.url}
            ref={videoRef}
            src={heroSource.url}
            className="online-hero__video online-hero__poster--trailer"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}

        {trailerReady && heroSource.type === "embed" && (
          <iframe
            title=""
            aria-hidden="true"
            src={heroSource.embedUrl}
            className="online-hero__iframe online-hero__poster--trailer"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      <div className="online-hero__overlay-cinemas" aria-hidden="true" />

      {slides.length > 1 && (
        <div className="online-hero__nav-rail">
          <button
            type="button"
            onClick={goPrev}
            className="online-hero__nav-btn online-hero__nav-btn--prev"
            aria-label="Phim trước"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="online-hero__nav-btn online-hero__nav-btn--next"
            aria-label="Phim sau"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="online-hero__content online-hero__content--centered">
        {showLoadingSkeleton ? (
          <div
            className="online-hero__skeleton online-hero__copy--centered"
            aria-busy="true"
            aria-label="Đang tải phim trực tuyến"
          >
            <div className="online-hero__skeleton-title" />
            <div className="online-hero__skeleton-sub" />
            <div className="online-hero__skeleton-cta" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={contentKey}
              className="online-hero__copy online-hero__copy--centered"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <motion.h1
                className="online-hero__title"
                title={title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {title}
              </motion.h1>
              <motion.p
                className="online-hero__sub"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                {subtitle}
              </motion.p>

              {displayMovie && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Link
                    to={movieLink}
                    className="btn-gold online-hero__cta online-hero__cta--centered"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {actionLabel}
                  </Link>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {slides.length > 1 && (
        <div className="online-hero__pager online-hero__pager--centered">
          <div className="online-hero__progress" aria-hidden="true">
            <div
              className="online-hero__progress-bar"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div
            className="online-hero__dots"
            role="tablist"
            aria-label="Chọn phim nổi bật"
          >
            {slides.map((movie, idx) => (
              <button
                key={movie.uuid}
                type="button"
                role="tab"
                aria-selected={idx === currentIndex}
                onClick={() => goToSlide(idx)}
                className={`online-hero__dot ${idx === currentIndex ? "online-hero__dot--active" : ""}`}
                aria-label={`Xem ${movie.title}`}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default OnlineHero;
