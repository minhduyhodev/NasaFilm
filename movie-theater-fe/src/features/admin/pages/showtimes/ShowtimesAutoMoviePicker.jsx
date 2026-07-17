import { useMemo, useState } from 'react';
import { Search, Star } from 'lucide-react';
import { resolveMediaUrl, handlePosterError, FALLBACK_POSTER } from '../../../../shared/utils/mediaUrlUtils';
import {
  AUTO_MOVIE_SORT_OPTIONS,
  AUTO_MOVIE_STATUS_FILTERS,
  filterAutoScheduleMovies,
  getMoviePosterUrl,
  getMovieStatusLabel,
  isTheaterEligibleMovie,
  selectShowingMovies,
  sortAutoScheduleMovies,
} from './showtimesAutoUtils';

const getPosterSrc = (rawUrl, width = 80) =>
  rawUrl?.trim() ? resolveMediaUrl(rawUrl.trim(), width) : FALLBACK_POSTER;

const ShowtimesAutoMoviePicker = ({
  movies = [],
  selectedUuids = [],
  onChange,
  isLoading = false,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('SHOWING');
  const [sortKey, setSortKey] = useState('rating');

  const visibleMovies = useMemo(
    () => sortAutoScheduleMovies(
      filterAutoScheduleMovies(movies, { search, statusFilter }),
      sortKey,
    ),
    [movies, search, statusFilter, sortKey],
  );

  const visibleUuidSet = useMemo(
    () => new Set(visibleMovies.map((movie) => movie.uuid)),
    [visibleMovies],
  );

  const selectedVisibleCount = useMemo(
    () => selectedUuids.filter((uuid) => visibleUuidSet.has(uuid)).length,
    [selectedUuids, visibleUuidSet],
  );

  const allVisibleSelected = visibleMovies.length > 0 && selectedVisibleCount === visibleMovies.length;

  const toggleMovie = (uuid, checked) => {
    onChange(checked
      ? [...new Set([...selectedUuids, uuid])]
      : selectedUuids.filter((id) => id !== uuid));
  };

  const selectVisible = () => {
    onChange([...new Set([...selectedUuids, ...visibleMovies.map((movie) => movie.uuid)])]);
  };

  const clearSelection = () => {
    onChange([]);
  };

  const selectShowing = () => {
    onChange(selectShowingMovies(movies));
  };

  return (
    <div className="st-auto-movie-picker">
      <div className="st-auto-movie-picker__head">
        <div>
          <label className="st-auto-label mb-0">Phim chiếu *</label>
          <p className="st-auto-movie-picker__meta">
            Đã chọn
            {' '}
            <strong>{selectedUuids.length}</strong>
            {' '}
            /
            {' '}
            {movies.length}
            {' '}
            phim
            {visibleMovies.length !== movies.length && (
              <>
                {' '}
                · hiển thị
                {' '}
                {visibleMovies.length}
              </>
            )}
          </p>
        </div>
        <div className="st-auto-movie-picker__actions">
          <button type="button" className="st-auto-link" onClick={selectShowing}>
            Chọn đang/sắp chiếu
          </button>
          <button
            type="button"
            className="st-auto-link"
            onClick={allVisibleSelected ? clearSelection : selectVisible}
            disabled={visibleMovies.length === 0}
          >
            {allVisibleSelected ? 'Bỏ chọn hiển thị' : `Chọn hiển thị (${visibleMovies.length})`}
          </button>
        </div>
      </div>

      <div className="st-auto-movie-picker__toolbar">
        <div className="st-auto-movie-picker__search">
          <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" aria-hidden />
          <input
            type="search"
            className="st-auto-movie-picker__search-input"
            placeholder="Tìm tên phim, thể loại..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="st-auto-movie-picker__sort"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
          aria-label="Sắp xếp phim"
        >
          {AUTO_MOVIE_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>

      <div className="st-auto-movie-picker__filters" role="tablist" aria-label="Lọc trạng thái phim">
        {AUTO_MOVIE_STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            role="tab"
            aria-selected={statusFilter === filter.value}
            className={`st-auto-movie-picker__filter ${statusFilter === filter.value ? 'is-active' : ''}`}
            onClick={() => setStatusFilter(filter.value)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="st-auto-movie-grid custom-scrollbar">
        {isLoading ? (
          <div className="st-auto-movie-picker__empty">Đang tải danh sách phim...</div>
        ) : visibleMovies.length === 0 ? (
          <div className="st-auto-movie-picker__empty">
            Không có phim phù hợp. Thử đổi bộ lọc hoặc từ khóa tìm kiếm.
          </div>
        ) : (
          visibleMovies.map((movie) => {
            const checked = selectedUuids.includes(movie.uuid);
            const theaterEligible = isTheaterEligibleMovie(movie);
            const genreLabel = (movie.genres || []).slice(0, 2).join(' · ');

            return (
              <label
                key={movie.uuid}
                className={`st-auto-movie ${checked ? 'is-selected' : ''} ${!theaterEligible ? 'is-muted' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleMovie(movie.uuid, e.target.checked)}
                  className="st-checkbox"
                />
                <div className="st-auto-movie__poster">
                  <img
                    src={getPosterSrc(getMoviePosterUrl(movie), 80)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onError={handlePosterError}
                  />
                </div>
                <div className="st-auto-movie__body">
                  <div className="st-auto-movie__title-row">
                    <span className="st-auto-movie__title">{movie.title}</span>
                    <span className="st-auto-rating">
                      <Star className="w-2.5 h-2.5 fill-current" aria-hidden />
                      {movie.rating != null ? Number(movie.rating).toFixed(1) : '—'}
                    </span>
                  </div>
                  <div className="st-auto-movie__meta-row">
                    <span className={`st-auto-movie__status st-auto-movie__status--${String(movie.status || '').toLowerCase()}`}>
                      {getMovieStatusLabel(movie.status)}
                    </span>
                    {movie.durationMinutes ? (
                      <span>{movie.durationMinutes} phút</span>
                    ) : null}
                    {genreLabel ? <span className="truncate">{genreLabel}</span> : null}
                  </div>
                </div>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ShowtimesAutoMoviePicker;
