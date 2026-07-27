import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { usePublicShowtimes } from "../hooks/useHomeQueries";
import {
  buildEarliestShowtimeByMovie,
  resolveMovieEarliestShowtime,
} from "../utils/homeQuickBookUtils";
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
  maxItems = 8,
  showEarliestShowtime = false,
}) => {
  const { data: showtimesData } = usePublicShowtimes({
    enabled: showEarliestShowtime && !isLoading && moviesList.length > 0,
  });

  const showtimeMap = useMemo(
    () => buildEarliestShowtimeByMovie(showtimesData || []),
    [showtimesData],
  );

  if (!isLoading && moviesList.length === 0) {
    return null;
  }

  const displayList = moviesList.slice(0, maxItems);

  return (
    <section className="home-movie-grid">
      <div className="home-movie-grid__head">
        <div className="home-movie-grid__title-block">
          <h2 className="home-movie-grid__title">{title}</h2>
          <div className="home-movie-grid__underline" aria-hidden />
        </div>
        {viewAllTo ? (
          <Link to={viewAllTo} className="home-movie-grid__view-all">
            XEM TẤT CẢ
            <ChevronRight className="home-movie-grid__view-all-icon" aria-hidden />
          </Link>
        ) : null}
      </div>

      <div className="home-movie-grid__list">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <MovieCardSkeleton key={`skeleton-${index}`} showcase />
            ))
          : displayList.map((movie, index) => {
              const earliest = showEarliestShowtime
                ? resolveMovieEarliestShowtime(movie, showtimeMap)
                : null;

              return (
                <MovieCard
                  key={movie.uuid || movie.title}
                  {...movie}
                  layout="showcase"
                  actionLabel={actionLabel}
                  posterLoading={index < priorityCount ? "eager" : "lazy"}
                  earliestShowtimeStart={earliest?.startTime || movie.nextShowtimeStart}
                />
              );
            })}
      </div>
    </section>
  );
};

export default HomeMovieCarousel;
