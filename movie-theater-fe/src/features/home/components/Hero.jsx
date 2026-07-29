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

const FALLBACK_POSTERS = [
  {
    src: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=480&auto=format&fit=crop",
    alt: "Cinema",
    movie: null,
  },
  {
    src: "https://images.unsplash.com/photo-1536440136627-eb85e2c5e0e4?q=80&w=480&auto=format&fit=crop",
    alt: "Movie night",
    movie: null,
  },
  {
    src: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=480&auto=format&fit=crop",
    alt: "Film reel",
    movie: null,
  },
  {
    src: "https://images.unsplash.com/photo-1517604931441-175ad6222228?q=80&w=480&auto=format&fit=crop",
    alt: "Theater seats",
    movie: null,
  },
  {
    src: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=480&auto=format&fit=crop",
    alt: "Projector light",
    movie: null,
  },
  {
    src: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=480&auto=format&fit=crop",
    alt: "Popcorn",
    movie: null,
  },
];

const toDomeItems = (payload) => {
  const list = payload?.content || payload || [];
  if (!Array.isArray(list) || !list.length) return [];

  const seen = new Set();
  return mapApiMovies(list)
    .map((movie) => {
      const raw = pickPosterMediaUrl(movie) || movie?.primaryMediaUrl || movie?.poster || "";
      const src = resolveSafePosterUrl(raw, 360);
      if (!src || src === FALLBACK_POSTER) return null;
      if (seen.has(src)) return null;
      seen.add(src);
      return {
        src,
        alt: movie?.title || "Phim",
        movie,
        raw,
      };
    })
    .filter(Boolean);
};

const Hero = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [heroInView, setHeroInView] = useState(true);
  const [domeItems, setDomeItems] = useState(FALLBACK_POSTERS);
  const [postersReady, setPostersReady] = useState(false);
  const sectionRef = useRef(null);
  const { data: nowShowingData } = useNowShowingMovies();
  const { data: upcomingData } = useUpcomingMovies();

  const candidateItems = useMemo(() => {
    const items = [...toDomeItems(nowShowingData), ...toDomeItems(upcomingData)];
    return items.slice(0, 24);
  }, [nowShowingData, upcomingData]);

  // Lọc poster 404 trước khi nhồi sphere — hết spam console + tile trống
  useEffect(() => {
    let cancelled = false;

    if (!candidateItems.length) {
      setDomeItems(FALLBACK_POSTERS);
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
      const filled =
        valid.length >= 6
          ? valid.slice(0, 24)
          : [...valid, ...FALLBACK_POSTERS].slice(0, 24);

      setDomeItems(filled);
      setPostersReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [candidateItems]);

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

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[90vh] w-full overflow-x-clip overflow-y-visible bg-transparent pt-24 pb-4 md:min-h-screen md:pb-6"
      aria-label="Hero gallery"
    >
      <div className="absolute inset-0 z-[1]">
        <Suspense fallback={null}>
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
