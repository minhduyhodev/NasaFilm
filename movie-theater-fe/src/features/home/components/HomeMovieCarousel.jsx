import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePublicShowtimes } from "../hooks/useHomeQueries";
import {
  buildEarliestShowtimeByMovie,
  resolveMovieEarliestShowtime,
} from "../utils/homeQuickBookUtils";
import MovieCard from "./MovieCard";
import MovieCardSkeleton from "./MovieCardSkeleton";
import "./HomeMovieCarousel.css";

const PAGE_SIZE = 4;

const HomeMovieCarousel = ({
  sectionId,
  eyebrow,
  title,
  subtitle,
  viewAllTo,
  moviesList = [],
  isLoading = false,
  actionLabel = "Chi tiết",
  priorityCount = 4,
  showEarliestShowtime = false,
}) => {
  const scrollerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0);

  const { data: showtimesData } = usePublicShowtimes({
    enabled: showEarliestShowtime && !isLoading && moviesList.length > 0,
  });

  const showtimeMap = useMemo(
    () => buildEarliestShowtimeByMovie(showtimesData || []),
    [showtimesData],
  );

  const totalPages = Math.max(1, Math.ceil(moviesList.length / PAGE_SIZE));

  const getScrollStep = () => {
    const el = scrollerRef.current;
    if (!el) return 240;
    const card = el.firstElementChild;
    const cardWidth = card ? card.getBoundingClientRect().width : 240;
    const styles = window.getComputedStyle(el);
    const gap = Number.parseFloat(styles.columnGap || styles.gap || "24") || 24;
    return cardWidth + gap;
  };

  const scroll = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;

    const step = getScrollStep();
    const pageWidth = step * PAGE_SIZE;
    const currentPageIndex = Math.round(el.scrollLeft / pageWidth);
    const targetPageIndex =
      direction === "right" ? currentPageIndex + 1 : currentPageIndex - 1;
    const nextPageIndex = Math.max(0, Math.min(targetPageIndex, totalPages - 1));

    el.scrollTo({
      left: nextPageIndex * pageWidth,
      behavior: "smooth",
    });
    setCurrentPage(nextPageIndex);
  };

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = getScrollStep();
    const pageWidth = step * PAGE_SIZE;
    const pageIndex = Math.round(el.scrollLeft / Math.max(1, pageWidth));
    setCurrentPage(Math.max(0, Math.min(pageIndex, totalPages - 1)));
  };

  const goToPage = (index) => {
    const el = scrollerRef.current;
    if (!el) return;
    const step = getScrollStep();
    el.scrollTo({
      left: index * step * PAGE_SIZE,
      behavior: "smooth",
    });
    setCurrentPage(index);
  };

  if (!isLoading && moviesList.length === 0) {
    return null;
  }

  const showPager = !isLoading && moviesList.length > PAGE_SIZE;

  return (
    <section id={sectionId} className="home-movie-carousel">
      <div className="home-movie-carousel__head">
        <div className="home-movie-carousel__title-block">
          {eyebrow ? <p className="home-movie-carousel__eyebrow">{eyebrow}</p> : null}
          <h2 className="home-movie-carousel__title">{title}</h2>
          {subtitle ? <p className="home-movie-carousel__subtitle">{subtitle}</p> : null}
          <div className="home-movie-carousel__underline" aria-hidden />
        </div>
        {viewAllTo ? (
          <Link to={viewAllTo} className="home-movie-carousel__view-all">
            XEM TẤT CẢ
            <ChevronRight className="home-movie-carousel__view-all-icon" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="home-movie-carousel__stage">
        {showPager ? (
          <>
            <button
              type="button"
              onClick={() => scroll("left")}
              className="home-movie-carousel__nav home-movie-carousel__nav--prev"
              aria-label={`${title} — trang trước`}
              disabled={currentPage <= 0}
            >
              <ChevronLeft size={40} />
            </button>
            <button
              type="button"
              onClick={() => scroll("right")}
              className="home-movie-carousel__nav home-movie-carousel__nav--next"
              aria-label={`${title} — trang tiếp`}
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight size={40} />
            </button>
          </>
        ) : null}

        <div
          ref={scrollerRef}
          onScroll={handleScroll}
          className="home-movie-carousel__track"
        >
          {isLoading
            ? Array.from({ length: PAGE_SIZE }).map((_, index) => (
                <div key={`skeleton-${index}`} className="home-movie-carousel__item">
                  <MovieCardSkeleton showcase />
                </div>
              ))
            : moviesList.map((movie, index) => {
                const earliest = showEarliestShowtime
                  ? resolveMovieEarliestShowtime(movie, showtimeMap)
                  : null;

                return (
                  <div
                    key={movie.uuid || movie.title}
                    className={`home-movie-carousel__item${
                      index % PAGE_SIZE === 0 ? " is-page-start" : ""
                    }`}
                  >
                    <MovieCard
                      {...movie}
                      layout="showcase"
                      actionLabel={actionLabel}
                      posterLoading={index < priorityCount ? "eager" : "lazy"}
                      earliestShowtimeStart={
                        earliest?.startTime || movie.nextShowtimeStart
                      }
                    />
                  </div>
                );
              })}
        </div>
      </div>

      {showPager ? (
        <div className="home-movie-carousel__dots">
          {Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={`dot-${index}`}
              type="button"
              onClick={() => goToPage(index)}
              className={`home-movie-carousel__dot${
                currentPage === index ? " is-active" : ""
              }`}
              aria-label={`Trang ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default HomeMovieCarousel;
