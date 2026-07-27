import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNowShowingMovies, useUpcomingMovies } from "../hooks/useHomeQueries";
import { mapApiMovies } from "../utils/movieUtils";
import { resolveMediaUrl } from "../../../shared/utils/mediaUrlUtils";
import HeroMovieDetailPanel from "./HeroMovieDetailPanel";
import "./Hero.css";

const DomeGallery = lazy(() => import("./DomeGallery"));

const AUTO_HIGHLIGHT_DELAY_MS = 9000;
const AUTO_HIGHLIGHT_INITIAL_MS = 7500;

const FALLBACK_POSTERS = [
  {
    src: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=774&auto=format&fit=crop",
    alt: "Cinema",
    movie: null,
  },
  {
    src: "https://images.unsplash.com/photo-1536440136627-eb85e2c5e0e4?q=80&w=774&auto=format&fit=crop",
    alt: "Movie night",
    movie: null,
  },
  {
    src: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=774&auto=format&fit=crop",
    alt: "Film reel",
    movie: null,
  },
  {
    src: "https://images.unsplash.com/photo-1517604931441-175ad6222228?q=80&w=774&auto=format&fit=crop",
    alt: "Theater seats",
    movie: null,
  },
  {
    src: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?q=80&w=774&auto=format&fit=crop",
    alt: "Projector light",
    movie: null,
  },
  {
    src: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?q=80&w=774&auto=format&fit=crop",
    alt: "Popcorn",
    movie: null,
  },
];

const toDomeItems = (payload) => {
  const list = payload?.content || payload || [];
  if (!Array.isArray(list) || !list.length) return [];

  return mapApiMovies(list)
    .map((movie) => {
      const src =
        resolveMediaUrl(movie?.primaryMediaUrl || movie?.poster || "", 480) ||
        movie?.primaryMediaUrl ||
        "";
      if (!src) return null;
      return {
        src,
        alt: movie?.title || "Phim",
        movie,
      };
    })
    .filter(Boolean);
};

const Hero = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [autoOpenSignal, setAutoOpenSignal] = useState(0);
  const [autoOpenIndex, setAutoOpenIndex] = useState(0);
  const userInteractedRef = useRef(false);
  const selectedRef = useRef(false);
  const autoHighlightingRef = useRef(false);
  const highlightCursorRef = useRef(0);
  const { data: nowShowingData } = useNowShowingMovies();
  const { data: upcomingData } = useUpcomingMovies();

  const domeItems = useMemo(() => {
    const items = [...toDomeItems(nowShowingData), ...toDomeItems(upcomingData)];
    if (items.length >= 6) return items.slice(0, 24);
    return [...items, ...FALLBACK_POSTERS].slice(0, 24);
  }, [nowShowingData, upcomingData]);

  const highlightIndices = useMemo(
    () =>
      domeItems
        .map((item, index) => (item.movie ? index : null))
        .filter((index) => index !== null)
        .slice(0, 10),
    [domeItems],
  );

  const triggerAutoHighlight = useCallback(() => {
    if (userInteractedRef.current || highlightIndices.length === 0) return;
    const cursor = highlightCursorRef.current % highlightIndices.length;
    const index = highlightIndices[cursor];
    highlightCursorRef.current = cursor + 1;
    autoHighlightingRef.current = true;
    setAutoOpenIndex(index);
    setAutoOpenSignal((n) => n + 1);
  }, [highlightIndices]);

  const handleImageSelect = useCallback((item) => {
    if (!autoHighlightingRef.current) {
      userInteractedRef.current = true;
    }
    autoHighlightingRef.current = false;
    setSelectedItem(item);
  }, []);

  const handleDetailClose = useCallback(() => {
    setSelectedItem(null);
  }, []);

  useEffect(() => {
    selectedRef.current = Boolean(selectedItem);
  }, [selectedItem]);

  const handleGalleryInteract = useCallback(() => {
    userInteractedRef.current = true;
  }, []);

  useEffect(() => {
    if (highlightIndices.length === 0) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return undefined;

    let intervalId = null;
    const initialTimer = window.setTimeout(() => {
      if (!userInteractedRef.current && !selectedRef.current) {
        triggerAutoHighlight();
      }
      intervalId = window.setInterval(() => {
        if (!userInteractedRef.current && !selectedRef.current) {
          triggerAutoHighlight();
        }
      }, AUTO_HIGHLIGHT_DELAY_MS);
    }, AUTO_HIGHLIGHT_INITIAL_MS);

    return () => {
      window.clearTimeout(initialTimer);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [highlightIndices.length, triggerAutoHighlight]);

  return (
    <section
      className="relative min-h-[90vh] w-full overflow-hidden bg-transparent pt-24 pb-4 md:min-h-screen md:pb-6"
      aria-label="Hero gallery"
      onPointerDown={handleGalleryInteract}
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
            paused={Boolean(selectedItem)}
            autoOpenIndex={autoOpenIndex}
            autoOpenSignal={autoOpenSignal}
            onImageSelect={handleImageSelect}
            onDetailClose={handleDetailClose}
          />
        </Suspense>
      </div>

      <div
        className="pointer-events-none absolute inset-0 z-[2] opacity-[0.12] mix-blend-overlay"
        aria-hidden
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

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
