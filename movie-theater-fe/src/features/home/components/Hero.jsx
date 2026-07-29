import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNowShowingMovies, useUpcomingMovies } from "../hooks/useHomeQueries";
import { mapApiMovies, pickPosterMediaUrl } from "../utils/movieUtils";
import {
  FALLBACK_POSTER,
  probeImageUrl,
  resolveSafePosterUrl,
} from "../../../shared/utils/mediaUrlUtils";
import HeroMovieDetailPanel from "./HeroMovieDetailPanel";
import "./Hero.css";

const DomeGallery = lazy(() => import("./DomeGallery"));

const TARGET_DOME_COUNT = 24;

const toDomeItems = (payload) => {
  const list = payload?.content || payload || [];
  if (!Array.isArray(list) || !list.length) return [];

  const seenSet = new Set();
  return mapApiMovies(list)
    .map((movie) => {
      const raw = pickPosterMediaUrl(movie) || movie?.primaryMediaUrl || movie?.poster || "";
      const src = resolveSafePosterUrl(raw, 360);
      if (!src || src === FALLBACK_POSTER) return null;
      if (seenSet.has(src)) return null;
      seenSet.add(src);
      return {
        src,
        alt: movie?.title || "Phim",
        movie,
        raw,
      };
    })
    .filter(Boolean);
};

/** Lặp lại poster thật để đủ ô cầu — không dùng ảnh stock Unsplash. */
const fillDomeItems = (valid = [], target = TARGET_DOME_COUNT) => {
  if (!valid.length) return [];
  if (valid.length >= target) return valid.slice(0, target);
  const filled = [];
  let i = 0;
  while (filled.length < target) {
    const item = valid[i % valid.length];
    filled.push({
      ...item,
      src: item.src,
      alt: item.alt,
      // Keep movie ref; Dome may key by src — duplicate src is ok for visual fill
    });
    i += 1;
  }
  return filled;
};

const Hero = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [heroInView, setHeroInView] = useState(true);
  const [domeItems, setDomeItems] = useState([]);
  const [postersReady, setPostersReady] = useState(false);
  const sectionRef = useRef(null);
  const { data: nowShowingData, isLoading: nowLoading } = useNowShowingMovies();
  const { data: upcomingData, isLoading: upcomingLoading } = useUpcomingMovies();

  const queriesLoading = nowLoading || upcomingLoading;

  const candidateItems = useMemo(() => {
    const items = [...toDomeItems(nowShowingData), ...toDomeItems(upcomingData)];
    return items.slice(0, TARGET_DOME_COUNT);
  }, [nowShowingData, upcomingData]);

  // Lọc poster 404 trước khi nhồi sphere — chỉ hiện khi poster phim sẵn sàng
  useEffect(() => {
    let cancelled = false;

    if (queriesLoading && !candidateItems.length) {
      setPostersReady(false);
      setDomeItems([]);
      return undefined;
    }

    if (!candidateItems.length) {
      setDomeItems([]);
      setPostersReady(true);
      return undefined;
    }

    setPostersReady(false);

    (async () => {
      const results = await Promise.all(
        candidateItems.map(async (item) => {
          const ok = await probeImageUrl(item.src, 4000);
          return ok ? item : null;
        }),
      );
      if (cancelled) return;

      const valid = results.filter(Boolean);
      setDomeItems(fillDomeItems(valid, TARGET_DOME_COUNT));
      setPostersReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [candidateItems, queriesLoading]);

  const handleImageSelect = useCallback((item) => {
    setSelectedItem(item);
  }, []);

  const handleDetailClose = useCallback(() => {
    setSelectedItem(null);
  }, []);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroInView(entry.isIntersecting && entry.intersectionRatio > 0.08);
      },
      { threshold: [0, 0.08, 0.25] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const galleryPaused = Boolean(selectedItem) || !heroInView;
  const showLoading = !postersReady;

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[90vh] w-full overflow-x-clip overflow-y-visible bg-transparent pt-24 pb-4 md:min-h-screen md:pb-6"
      aria-label="Hero gallery"
      aria-busy={showLoading || undefined}
    >
      <div className="absolute inset-0 z-[1]">
        {showLoading ? (
          <div className="hero-dome-loading" role="status" aria-live="polite">
            <span className="hero-dome-loading__orb" aria-hidden />
            <p className="hero-dome-loading__label">Đang tải phim…</p>
          </div>
        ) : domeItems.length > 0 ? (
          <Suspense
            fallback={(
              <div className="hero-dome-loading" role="status" aria-live="polite">
                <span className="hero-dome-loading__orb" aria-hidden />
                <p className="hero-dome-loading__label">Đang tải phim…</p>
              </div>
            )}
          >
            <DomeGallery
              images={domeItems}
              fit={0.72}
              fitBasis="width"
              minRadius={560}
              overlayBlurColor="transparent"
              grayscale={false}
              imageBorderRadius="16px"
              openedImageBorderRadius="22px"
              openedImageWidth="340px"
              openedImageHeight="486px"
              segments={35}
              dragSensitivity={20}
              dragDampening={0.55}
              autoRotate
              autoRotateSpeed={5.5}
              autoTiltDeg={-9}
              autoTiltSwayDeg={2.2}
              maxVerticalRotationDeg={12}
              detailLayout
              enlargeTransitionMs={320}
              paused={galleryPaused}
              onImageSelect={handleImageSelect}
              onDetailClose={handleDetailClose}
            />
          </Suspense>
        ) : (
          <div className="hero-dome-loading" role="status">
            <span className="hero-dome-loading__orb" aria-hidden />
            <p className="hero-dome-loading__label">Chưa có poster</p>
          </div>
        )}
      </div>

      <div className="hero-film-grain" aria-hidden />
      <div className="hero-bottom-fade" aria-hidden />

      <AnimatePresence>
        {selectedItem ? (
          <HeroMovieDetailPanel key={selectedItem.src} item={selectedItem} />
        ) : null}
      </AnimatePresence>
    </section>
  );
};

export default Hero;
