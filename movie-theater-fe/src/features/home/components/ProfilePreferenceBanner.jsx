import React, { useMemo } from 'react';
import { Clapperboard, Loader2 } from 'lucide-react';
import { useMovieFilterOptions } from '../../../shared/hooks/queries/useMovieQueries';
import useShowtimeRadar from '../hooks/useShowtimeRadar';

const ProfilePreferenceBanner = () => {
  const { data: filterOptions } = useMovieFilterOptions();
  const genres = filterOptions?.genres ?? [];
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
      <div className="profile-preference-banner__label">
        <Clapperboard size={12} className="text-amber-500" />
        <span>Sở thích xem phim</span>
      </div>
      <div className="profile-preference-banner__chips">
        {selectedGenreNames.map((name) => (
          <span key={name} className="profile-preference-banner__chip">
            {name}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ProfilePreferenceBanner;
