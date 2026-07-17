import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import MovieCard from "./MovieCard";
import MovieCardSkeleton from "./MovieCardSkeleton";
import "./HomeMovieCarousel.css";

const HomeMovieCarousel = ({
  title,
  viewAllTo,
  moviesList = [],
  isLoading = false,
  actionLabel = "Chi tiết",
  priorityCount = 4,
}) => {
  const scrollerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);

  const getScrollAmount = () => {
    const el = scrollerRef.current;
    if (!el) return 240;
    const card = el.firstElementChild;
    const cardWidth = card ? card.clientWidth : 240;
    const gap = 24;
    return cardWidth + gap;
  };

  const totalPages = Math.max(1, Math.ceil(moviesList.length / 4));

  const scroll = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;

    const scrollAmount = getScrollAmount();
    const gap = 24;
    const visibleCards = Math.max(
      1,
      Math.floor((el.clientWidth + gap) / scrollAmount),
    );

    if (visibleCards >= 4) {
      const currentPageIndex = Math.round(el.scrollLeft / (scrollAmount * 4));
      const targetPageIndex =
        direction === "right" ? currentPageIndex + 1 : currentPageIndex - 1;
      const nextPageIndex = Math.max(
        0,
        Math.min(targetPageIndex, totalPages - 1),
      );

      el.scrollTo({
        left: nextPageIndex * scrollAmount * 4,
        behavior: "smooth",
      });
    } else {
      const totalScroll = scrollAmount * visibleCards;
      el.scrollBy({
        left: direction === "right" ? totalScroll : -totalScroll,
        behavior: "smooth",
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

  const goToPage = (index) => {
    const el = scrollerRef.current;
    if (!el) return;
    const scrollAmount = getScrollAmount();
    el.scrollTo({
      left: index * scrollAmount * 4,
      behavior: "smooth",
    });
  };

  if (!isLoading && moviesList.length === 0) {
    return null;
  }

  return (
    <section className="home-movie-carousel relative">
      <div className="home-movie-carousel__head mb-6 flex items-center justify-between">
        <h2 className="home-movie-carousel__title flex-1 text-center text-3xl font-black text-white md:text-4xl">
          {title}
        </h2>
        {viewAllTo && (
          <Link
            to={viewAllTo}
            className="home-movie-carousel__view-all hidden shrink-0 sm:inline-block"
          >
            Xem tất cả
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={() => scroll("left")}
        style={{ left: "-48px" }}
        className="home-movie-carousel__nav hidden md:flex"
        aria-label={`${title} — trang trước`}
      >
        <ChevronLeft size={44} />
      </button>
      <button
        type="button"
        onClick={() => scroll("right")}
        style={{ right: "-48px" }}
        className="home-movie-carousel__nav hidden md:flex"
        aria-label={`${title} — trang tiếp`}
      >
        <ChevronRight size={44} />
      </button>

      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        className="home-movie-carousel__track no-scrollbar flex gap-6 overflow-x-auto pb-4 pr-1 snap-x snap-mandatory"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="home-movie-carousel__item flex flex-col gap-4"
              >
                <MovieCardSkeleton />
              </div>
            ))
          : moviesList.map((movie, index) => (
              <div
                key={movie.uuid || movie.title}
                className={`home-movie-carousel__item ${index % 4 === 0 ? "md:snap-start snap-center" : "md:snap-none snap-center"} flex flex-col`}
              >
                <MovieCard
                  {...movie}
                  actionLabel={actionLabel}
                  posterLoading={index < priorityCount ? "eager" : "lazy"}
                />
              </div>
            ))}
      </div>

      {moviesList.length > 4 && (
        <div className="home-movie-carousel__dots mt-6 flex items-center justify-center gap-3">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToPage(index)}
              className={`home-movie-carousel__dot h-2 rounded-full transition-all duration-300 ${
                currentPage === index
                  ? "is-active w-5 bg-white"
                  : "w-2 bg-white/30 hover:bg-white/50"
              }`}
              aria-label={`Trang ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default HomeMovieCarousel;
