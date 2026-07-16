import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Filter,
  ArrowRight,
  Search,
  X,
  ChevronDown,
  RotateCcw,
  Globe,
  Clapperboard,
  Calendar,
  MapPin,
  Shield,
  User,
} from 'lucide-react';

const COLLAPSED_SECTIONS = {
  actor: false,
  country: false,
  genre: false,
  schedule: false,
  cinema: false,
  rating: false,
};

const FilterSection = ({
  id,
  title,
  icon: Icon,
  expanded,
  onToggle,
  children,
  count,
}) => (
  <section className={`filter-section ${expanded ? 'filter-section-open' : ''}`}>
    <button type="button" className="filter-section-header" onClick={() => onToggle(id)}>
      <div className="filter-section-title">
        {Icon && <Icon className="filter-section-icon" />}
        <span>{title}</span>
        {count != null && count > 0 && <span className="filter-section-count">{count}</span>}
      </div>
      <ChevronDown className={`filter-section-chevron ${expanded ? 'filter-section-chevron-open' : ''}`} />
    </button>
    {expanded && <div className="filter-section-body">{children}</div>}
  </section>
);

const ChipGroup = ({ value, onChange, options, allLabel = 'Tất cả' }) => (
  <div className="filter-chip-row">
    <button
      type="button"
      onClick={() => onChange(null)}
      className={`filter-chip ${value === null ? 'filter-chip-active' : ''}`}
    >
      {allLabel}
    </button>
    {options.map((option) => (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange(option.value)}
        className={`filter-chip ${value === option.value ? 'filter-chip-active' : ''}`}
      >
        {option.label}
      </button>
    ))}
  </div>
);

const SearchableChipGrid = ({ query, onQueryChange, placeholder, items, value, onSelect, emptyText }) => {
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="filter-searchable-grid">
      <div className="filter-mini-search">
        <Search className="filter-mini-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="filter-mini-search-input"
          autoComplete="off"
        />
        {query && (
          <button type="button" className="filter-mini-search-clear" onClick={() => onQueryChange('')}>
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <div className="filter-chip-grid">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`filter-chip ${value === null ? 'filter-chip-active' : ''}`}
        >
          Tất cả
        </button>
        {filtered.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onSelect(item.value)}
            className={`filter-chip ${value === item.value ? 'filter-chip-active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p className="filter-empty-hint">{emptyText}</p>}
    </div>
  );
};

const MovieFilterPanel = ({
  isOpen,
  onToggle,
  onClose,
  onApply,
  onClearTemp,
  activeFilterCount,
  activeFilters,
  onClearApplied,
  tempCountry,
  tempGenre,
  tempShowtimeDate,
  tempCinema,
  tempAgeRestriction,
  onCountrySelect,
  onGenreSelect,
  onShowtimeDateSelect,
  onCinemaSelect,
  onAgeRestrictionSelect,
  countryQuery,
  onCountryQueryChange,
  genreQuery,
  onGenreQueryChange,
  dbCountries,
  dbGenres,
  dbCinemas,
  filterDates,
  ageRestrictions,
  actorQuery,
  onActorInputChange,
  onActorSelect,
  isActorDropdownOpen,
  setIsActorDropdownOpen,
  actorSearchRef,
  filteredActors,
  tempActor,
  hiddenSections = [],
}) => {
  const isSectionHidden = (id) => hiddenSections.includes(id);
  const [expandedSections, setExpandedSections] = useState(COLLAPSED_SECTIONS);
  const wasOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setExpandedSections(COLLAPSED_SECTIONS);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const toggleSection = (id) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const countryOptions = useMemo(
    () => dbCountries.map((c) => ({ value: c.uuid, label: c.name })),
    [dbCountries]
  );

  const genreOptions = useMemo(
    () => dbGenres.map((g) => ({ value: g.uuid, label: g.name })),
    [dbGenres]
  );

  const cinemaOptions = useMemo(
    () => dbCinemas.map((c) => ({ value: c.uuid, label: c.name })),
    [dbCinemas]
  );

  const dateOptions = useMemo(
    () => filterDates.map((d) => ({ value: d.dateStr, label: d.label })),
    [filterDates]
  );

  const ratingOptions = useMemo(
    () => ageRestrictions.map((r) => ({ value: r.value, label: r.label })),
    [ageRestrictions]
  );

  const tempFilterCount = [
    tempCountry,
    tempGenre,
    tempActor,
    !isSectionHidden('schedule') ? tempShowtimeDate : null,
    !isSectionHidden('cinema') ? tempCinema : null,
    tempAgeRestriction,
  ].filter(Boolean).length;

  return (
    <div className="movie-filter-wrapper">
      <div className={`movie-filter-panel ${isOpen ? 'movie-filter-panel-open' : ''}`}>
        <button type="button" className="movie-filter-trigger" onClick={onToggle}>
          <div className="movie-filter-trigger-left">
            <span className="movie-filter-trigger-icon">
              <Filter className="h-4 w-4" fill="currentColor" />
            </span>
            <div className="movie-filter-trigger-text">
              <span className="movie-filter-trigger-title">Bộ lọc phim</span>
              <span className="movie-filter-trigger-sub">
                {activeFilterCount > 0
                  ? `${activeFilterCount} bộ lọc đang áp dụng`
                  : 'Tùy chỉnh theo diễn viên, thể loại, quốc gia...'}
              </span>
            </div>
          </div>
          <div className="movie-filter-trigger-right">
            {activeFilterCount > 0 && (
              <span className="movie-filter-badge">{activeFilterCount}</span>
            )}
            <ChevronDown className={`movie-filter-trigger-chevron ${isOpen ? 'movie-filter-trigger-chevron-open' : ''}`} />
          </div>
        </button>

        {activeFilterCount > 0 && (
          <div className="movie-filter-applied-bar">
            {activeFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                className="movie-filter-applied-chip"
                onClick={filter.onRemove}
              >
                {filter.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button type="button" className="movie-filter-applied-clear" onClick={onClearApplied}>
              Xóa tất cả
            </button>
          </div>
        )}

        {isOpen && (
          <div className="movie-filter-body">
            <FilterSection
              id="actor"
              title="Diễn viên"
              icon={User}
              expanded={expandedSections.actor}
              onToggle={toggleSection}
            >
              <div className="filter-actor-search" ref={actorSearchRef}>
                <div className="filter-actor-input-wrap">
                  <Search className="filter-actor-search-icon" />
                  <input
                    type="text"
                    value={actorQuery}
                    onChange={(e) => onActorInputChange(e.target.value)}
                    onFocus={() => setIsActorDropdownOpen(true)}
                    placeholder="Nhập tên diễn viên..."
                    className="filter-actor-input"
                    autoComplete="off"
                  />
                  {actorQuery && (
                    <button
                      type="button"
                      onClick={() => onActorSelect(null)}
                      className="filter-actor-clear"
                      aria-label="Xóa diễn viên"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {isActorDropdownOpen && (
                  <div className="filter-actor-dropdown">
                    <button
                      type="button"
                      onClick={() => onActorSelect(null)}
                      className={`filter-actor-option ${tempActor === null ? 'filter-actor-option-active' : ''}`}
                    >
                      Tất cả diễn viên
                    </button>
                    {filteredActors.length > 0 ? (
                      filteredActors.map((actor) => (
                        <button
                          key={actor.uuid}
                          type="button"
                          onClick={() => onActorSelect(actor)}
                          className={`filter-actor-option ${tempActor === actor.uuid ? 'filter-actor-option-active' : ''}`}
                        >
                          {actor.fullName}
                        </button>
                      ))
                    ) : (
                      <div className="filter-actor-empty">Không tìm thấy diễn viên</div>
                    )}
                  </div>
                )}
              </div>
            </FilterSection>

            <FilterSection
              id="country"
              title="Quốc gia"
              icon={Globe}
              expanded={expandedSections.country}
              onToggle={toggleSection}
              count={dbCountries.length}
            >
              <SearchableChipGrid
                query={countryQuery}
                onQueryChange={onCountryQueryChange}
                placeholder="Tìm quốc gia..."
                items={countryOptions}
                value={tempCountry}
                onSelect={onCountrySelect}
                emptyText="Không tìm thấy quốc gia phù hợp"
              />
            </FilterSection>

            <FilterSection
              id="genre"
              title="Thể loại"
              icon={Clapperboard}
              expanded={expandedSections.genre}
              onToggle={toggleSection}
              count={dbGenres.length}
            >
              <SearchableChipGrid
                query={genreQuery}
                onQueryChange={onGenreQueryChange}
                placeholder="Tìm thể loại..."
                items={genreOptions}
                value={tempGenre}
                onSelect={onGenreSelect}
                emptyText="Không tìm thấy thể loại phù hợp"
              />
            </FilterSection>

            {!isSectionHidden('schedule') && (
              <FilterSection
                id="schedule"
                title="Suất chiếu"
                icon={Calendar}
                expanded={expandedSections.schedule}
                onToggle={toggleSection}
              >
                <ChipGroup
                  value={tempShowtimeDate}
                  onChange={onShowtimeDateSelect}
                  options={dateOptions}
                />
              </FilterSection>
            )}

            {!isSectionHidden('cinema') && (
              <FilterSection
                id="cinema"
                title="Cụm rạp"
                icon={MapPin}
                expanded={expandedSections.cinema}
                onToggle={toggleSection}
              >
                <ChipGroup value={tempCinema} onChange={onCinemaSelect} options={cinemaOptions} />
              </FilterSection>
            )}

            <FilterSection
              id="rating"
              title="Xếp hạng độ tuổi"
              icon={Shield}
              expanded={expandedSections.rating}
              onToggle={toggleSection}
            >
              <ChipGroup
                value={tempAgeRestriction}
                onChange={onAgeRestrictionSelect}
                options={ratingOptions}
              />
            </FilterSection>

            <div className="movie-filter-footer">
              <button type="button" className="movie-filter-btn-secondary" onClick={onClearTemp}>
                <RotateCcw className="h-4 w-4" />
                Đặt lại
                {tempFilterCount > 0 && <span className="movie-filter-btn-count">{tempFilterCount}</span>}
              </button>
              <div className="movie-filter-footer-actions">
                <button type="button" className="movie-filter-btn-ghost" onClick={onClose}>
                  Đóng
                </button>
                <button type="button" className="movie-filter-btn-primary" onClick={onApply}>
                  Lọc kết quả
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieFilterPanel;
