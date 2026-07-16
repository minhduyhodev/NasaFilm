import { useMemo, useState } from 'react';
import { Clapperboard, Loader2 } from 'lucide-react';
import { useMovieFilterOptions } from '../../../shared/hooks/queries/useMovieQueries';
import { useShowtimeRadar } from '../context/ShowtimeRadarProvider';

const VISIBLE_CHIP_LIMIT = 6;

const ProfilePreferenceBanner = () => {
  const { data: filterOptions } = useMovieFilterOptions();
  const genres = filterOptions?.genres ?? [];
  const [expanded, setExpanded] = useState(false);
  const {
    loading,
    savedSelectedGenres,
  } = useShowtimeRadar();

  const selectedGenreNames = useMemo(
    () => savedSelectedGenres
      .map((genreUuid) => genres.find((genre) => String(genre.uuid) === String(genreUuid))?.name)
      .filter(Boolean),
    [genres, savedSelectedGenres],
  );

  const hasOverflow = selectedGenreNames.length > VISIBLE_CHIP_LIMIT;
  const visibleNames = expanded
    ? selectedGenreNames
    : selectedGenreNames.slice(0, VISIBLE_CHIP_LIMIT);
  const hiddenCount = selectedGenreNames.length - VISIBLE_CHIP_LIMIT;

  if (loading) {
    return (
      <div className="profile-preference-banner profile-preference-banner--loading">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
        <span>Đang tải sở thích...</span>
      </div>
    );
  }

  if (selectedGenreNames.length === 0) {
    return null;
  }

  return (
    <div className="profile-preference-banner">
      <div className="profile-preference-banner__label-row">
        <div className="profile-preference-banner__label">
          <Clapperboard size={12} className="text-amber-500" />
          <span>Sở thích xem phim</span>
        </div>
        <span className="profile-preference-banner__count" title={`${selectedGenreNames.length} thể loại`}>
          {selectedGenreNames.length}
        </span>
      </div>
      <div className={`profile-preference-banner__chips${expanded ? ' is-expanded' : ''}`}>
        {visibleNames.map((name) => (
          <span key={name} className="profile-preference-banner__chip">
            {name}
          </span>
        ))}
        {!expanded && hasOverflow && (
          <button
            type="button"
            className="profile-preference-banner__chip profile-preference-banner__chip--more"
            onClick={() => setExpanded(true)}
            aria-expanded={false}
            aria-label={`Xem thêm ${hiddenCount} thể loại`}
          >
            +{hiddenCount}
          </button>
        )}
      </div>
      {expanded && hasOverflow && (
        <button
          type="button"
          className="profile-preference-banner__toggle"
          onClick={() => setExpanded(false)}
          aria-expanded
        >
          Thu gọn
        </button>
      )}
    </div>
  );
};

export default ProfilePreferenceBanner;
