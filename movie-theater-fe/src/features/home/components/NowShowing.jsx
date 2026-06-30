import React, { useRef, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MovieCard from './MovieCard';
import MovieCardSkeleton from './MovieCardSkeleton';
import { useNowShowingMovies } from '../hooks/useHomeQueries';
import './NowShowing.css';

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
  const { data, isLoading } = useNowShowingMovies();

  const moviesList = useMemo(() => {
    if (!data?.content?.length) return [];
    return mapApiMovies(data.content);
  }, [data]);

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
    <section className="now-showing-section">
      <div className="now-showing-head">
        <div className="now-showing-head-text">
          <h2 className="now-showing-title">Phim đang chiếu</h2>
          <p className="now-showing-subtitle">Khám phá các suất chiếu mới nhất hôm nay</p>
        </div>
        <div className="now-showing-nav">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="now-showing-nav-btn"
            aria-label="Xem phim trước"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            className="now-showing-nav-btn"
            aria-label="Xem phim tiếp"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="now-showing-track no-scrollbar"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="now-showing-item"
            >
              <MovieCardSkeleton />
            </div>
          ))
        ) : (
          moviesList.map((movie, index) => (
            <div
              key={movie.uuid || movie.title}
              className={`now-showing-item ${index % 4 === 0 ? 'md:snap-start snap-center' : 'md:snap-none snap-center'}`}
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
