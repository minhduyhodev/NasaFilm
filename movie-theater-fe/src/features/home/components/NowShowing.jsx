import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';
import { movieService } from '../../../shared/services/movieService';

const mapApiMovies = (content) =>
  content.map(m => ({
    ...m,
    hoverDetails: {
      fullTitle: m.title,
      genre: m.genres ? m.genres.join(', ') : '',
      duration: m.durationMinutes ? `${m.durationMinutes}'` : '',
      country: m.countries ? m.countries.join(', ') : '',
      language: 'Phụ đề / Lồng tiếng',
    },
  }));

const NowShowing = () => {
  const scrollerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [moviesList, setMoviesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchNowShowing = async () => {
      setIsLoading(true);
      try {
        const data = await movieService.getMovies({
          status: 'NOW_SHOWING',
          page: 0,
          size: 20,
          requireBookableShowtime: true,
        });
        if (data?.content?.length > 0) {
          setMoviesList(mapApiMovies(data.content));
        } else {
          setMoviesList([]);
        }
      } catch (err) {
        console.error('Failed to load now showing movies:', err);
        setMoviesList([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchNowShowing();
  }, []);

  const getScrollAmount = () => {
    const el = scrollerRef.current;
    if (!el) return 240;
    const card = el.firstElementChild;
    const cardWidth = card ? card.clientWidth : 240;
    const gap = 24;
    return cardWidth + gap;
  };

  const scroll = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;

    const scrollAmount = getScrollAmount();
    const gap = 24;
    const visibleCards = Math.max(1, Math.floor((el.clientWidth + gap) / scrollAmount));

    if (visibleCards >= 4) {
      const currentPageIndex = Math.round(el.scrollLeft / (scrollAmount * 4));
      const targetPageIndex = direction === 'right' ? currentPageIndex + 1 : currentPageIndex - 1;
      const nextPageIndex = Math.max(0, Math.min(targetPageIndex, totalPages - 1));

      el.scrollTo({
        left: nextPageIndex * scrollAmount * 4,
        behavior: 'smooth',
      });
    } else {
      const totalScroll = scrollAmount * visibleCards;
      el.scrollBy({
        left: direction === 'right' ? totalScroll : -totalScroll,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;

    const scrollAmount = getScrollAmount();
    const pageIndex = Math.round(el.scrollLeft / (scrollAmount * 4));
    setCurrentPage(pageIndex);
  };

  const totalPages = Math.max(1, Math.ceil(moviesList.length / 4));

  if (!isLoading && moviesList.length === 0) {
    return null;
  }

  return (
    <section className="relative">
      <div className="mb-6 flex items-center justify-center">
        <h2 className="text-3xl font-black text-white md:text-4xl text-center">PHIM ĐANG CHIẾU </h2>
      </div>

      <button
        onClick={() => scroll('left')}
        style={{ left: '-48px' }}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-20 border-none outline-none focus:outline-none focus:ring-0 bg-transparent hover:bg-transparent shadow-none"
        aria-label="Previous page"
      >
        <ChevronLeft size={44} />
      </button>
      <button
        onClick={() => scroll('right')}
        style={{ right: '-48px' }}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors z-20 border-none outline-none focus:outline-none focus:ring-0 bg-transparent hover:bg-transparent shadow-none"
        aria-label="Next page"
      >
        <ChevronRight size={44} />
      </button>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="no-scrollbar flex gap-6 overflow-x-auto pb-4 pr-1 snap-x snap-mandatory"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="flex flex-col gap-4"
              style={{ flex: '0 0 calc((100% - 72px) / 4)', minWidth: '190px', maxWidth: '300px' }}
            >
              <MovieCardSkeleton />
            </div>
          ))
        ) : (
          moviesList.map((movie, index) => (
            <div
              key={movie.uuid || movie.title}
              className={`${index % 4 === 0 ? 'md:snap-start snap-center' : 'md:snap-none snap-center'} flex flex-col`}
              style={{ flex: '0 0 calc((100% - 72px) / 4)', minWidth: '190px', maxWidth: '300px' }}
            >
              <MovieCard {...movie} />
            </div>
          ))
        )}
      </div>

      {moviesList.length > 4 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => {
                const el = scrollerRef.current;
                if (!el) return;
                const scrollAmount = getScrollAmount();
                el.scrollTo({
                  left: index * scrollAmount * 4,
                  behavior: 'smooth',
                });
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                currentPage === index ? 'bg-white w-5' : 'bg-white/30 w-2 hover:bg-white/50'
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default NowShowing;
