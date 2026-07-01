import React from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Radar, RefreshCw, Save } from 'lucide-react';
import { useMovieFilterOptions } from '../../../shared/hooks/queries/useMovieQueries';
import { useShowtimeRadar } from '../context/ShowtimeRadarProvider';
import ShowtimeRadarSuggestionsList from './ShowtimeRadarSuggestionsList';
import './ProfilePreferencesTab.css';

const ProfilePreferencesTab = () => {
  const { data: filterOptions, isLoading: genresLoading } = useMovieFilterOptions();
  const genres = filterOptions?.genres ?? [];

  const {
    loading,
    saving,
    refreshing,
    includeFavorites,
    setIncludeFavorites,
    selectedGenres,
    suggestions,
    emptyMessage,
    savePreferences,
    refreshSuggestions,
    toggleGenre,
  } = useShowtimeRadar();

  return (
    <div className="profile-preferences-tab">
      <div className="panel-header">
        <div>
          <h2>Sở thích xem phim</h2>
          <p className="profile-preferences-tab__desc">
            Chọn thể loại yêu thích — sau khi lưu sẽ hiển thị trên khung hồ sơ và Smart Showtime Radar quét suất trong 48 giờ tới.
          </p>
        </div>
      </div>

      <section className="profile-preferences-tab__form">
        <h3>Thể loại yêu thích</h3>
        {genresLoading ? (
          <p className="profile-preferences-tab__muted">Đang tải thể loại...</p>
        ) : (
          <div className="profile-preferences-tab__chips">
            {genres.map((genre) => {
              const active = selectedGenres.includes(String(genre.uuid));
              return (
                <button
                  key={genre.uuid}
                  type="button"
                  className={`profile-preferences-tab__chip${active ? ' is-active' : ''}`}
                  onClick={() => toggleGenre(String(genre.uuid))}
                >
                  {genre.name}
                </button>
              );
            })}
          </div>
        )}

        <label className="profile-preferences-tab__checkbox">
          <input
            type="checkbox"
            checked={includeFavorites}
            onChange={(event) => setIncludeFavorites(event.target.checked)}
          />
          <span>Gợi ý từ phim yêu thích của tôi</span>
        </label>

        {includeFavorites && (
          <Link to="/my-movies" className="profile-preferences-tab__link">
            Quản lý phim yêu thích →
          </Link>
        )}

        <div className="profile-preferences-tab__actions">
          <button
            type="button"
            className="profile-preferences-tab__save"
            onClick={savePreferences}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu sở thích
          </button>
        </div>
      </section>

      <section className="profile-preferences-tab__radar">
        <div className="profile-preferences-tab__radar-head">
          <div className="profile-preferences-tab__radar-title">
            <Radar className="h-5 w-5 text-sky-400" />
            <h3>Smart Showtime Radar</h3>
          </div>
          <button
            type="button"
            className="profile-preferences-tab__refresh"
            onClick={refreshSuggestions}
            disabled={refreshing || loading}
            aria-label="Làm mới gợi ý"
          >
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>

        <ShowtimeRadarSuggestionsList
          suggestions={suggestions}
          loading={loading}
          variant="profile"
          maxItems={8}
          emptyMessage={emptyMessage}
        />
      </section>
    </div>
  );
};

export default ProfilePreferencesTab;
