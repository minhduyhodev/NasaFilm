import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNowShowingMovies, useUpcomingMovies } from "../hooks/useHomeQueries";
import { mapApiMovies } from "../utils/movieUtils";
import { resolveMediaUrl } from "../../../shared/utils/mediaUrlUtils";
import HeroMovieDetailPanel from "./HeroMovieDetailPanel";

const DomeGallery = lazy(() => import("./DomeGallery"));

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
  const { data: nowShowingData } = useNowShowingMovies();
  const { data: upcomingData } = useUpcomingMovies();

  const domeItems = useMemo(() => {
    const items = [...toDomeItems(nowShowingData), ...toDomeItems(upcomingData)];
    if (items.length >= 6) return items.slice(0, 24);
    return [...items, ...FALLBACK_POSTERS].slice(0, 24);
  }, [nowShowingData, upcomingData]);

  const handleImageSelect = useCallback((item) => {
    setSelectedItem(item);
  }, []);

  const handleDetailClose = useCallback(() => {
    setSelectedItem(null);
  }, []);

  return (
    <section
      className="relative isolate min-h-[90vh] w-full overflow-hidden bg-black pt-24 pb-36 md:min-h-screen md:pb-40"
      aria-label="Hero gallery"
    >
      <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(229,9,20,0.28)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(40,0,8,0.65)_0%,transparent_50%)]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
      </div>

      <div className="absolute inset-0 z-[1]">
        <Suspense fallback={null}>
          <DomeGallery
            images={domeItems}
            fit={0.55}
            fitBasis="auto"
            minRadius={480}
            overlayBlurColor="#000000"
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

      <AnimatePresence>
        {selectedItem ? (
          <HeroMovieDetailPanel key={selectedItem.src} item={selectedItem} />
        ) : null}
      </AnimatePresence>
    </section>
  );
};

export default Hero;
