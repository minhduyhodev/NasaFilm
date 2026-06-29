import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useMovieFilterOptions } from '../../../shared/hooks/queries/useMovieQueries';

const AGE_RESTRICTIONS = [
  { value: 'P', label: 'P (Mọi lứa tuổi)' },
  { value: 'K', label: 'K (Dưới 13 tuổi)' },
  { value: 'T13', label: 'T13 (13 tuổi trở lên)' },
  { value: 'T16', label: 'T16 (16 tuổi trở lên)' },
  { value: 'T18', label: 'T18 (18 tuổi trở lên)' },
];

function buildFilterDates() {
  const dates = [];
  const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const now = new Date();

  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const dayLabel = i === 0 ? 'Hôm nay' : i === 1 ? 'Ngày mai' : daysOfWeek[d.getDay()];
    const formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    dates.push({
      dateStr,
      label: `${dayLabel}, ${formattedDate}`,
    });
  }
  return dates;
}

/**
 * Shared movie list filter state for /movies and /online catalog sections.
 * @param {{ onPageReset?: () => void, includeShowtimeFilters?: boolean }} options
 */
export function useMovieListFilters({ onPageReset, includeShowtimeFilters = true } = {}) {
  const onPageResetRef = useRef(onPageReset);
  onPageResetRef.current = onPageReset;

  const resetPage = useCallback(() => {
    onPageResetRef.current?.();
  }, []);

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [titleSearch, setTitleSearch] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');

  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedActor, setSelectedActor] = useState(null);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [selectedShowtimeDate, setSelectedShowtimeDate] = useState(null);
  const [selectedCinema, setSelectedCinema] = useState(null);
  const [selectedAgeRestriction, setSelectedAgeRestriction] = useState(null);

  const [tempCountry, setTempCountry] = useState(null);
  const [tempActor, setTempActor] = useState(null);
  const [tempGenre, setTempGenre] = useState(null);
  const [tempShowtimeDate, setTempShowtimeDate] = useState(null);
  const [tempCinema, setTempCinema] = useState(null);
  const [tempAgeRestriction, setTempAgeRestriction] = useState(null);

  const [actorQuery, setActorQuery] = useState('');
  const [isActorDropdownOpen, setIsActorDropdownOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [genreQuery, setGenreQuery] = useState('');

  const actorSearchRef = useRef(null);
  const filterDates = useMemo(() => buildFilterDates(), []);

  const { data: filterOptions } = useMovieFilterOptions();
  const dbGenres = filterOptions?.genres || [];
  const dbCountries = filterOptions?.countries || [];
  const dbActors = filterOptions?.actors || [];
  const dbCinemas = filterOptions?.cinemas || [];

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchKeyword(titleSearch.trim());
    }, 400);
    return () => clearTimeout(timer);
  }, [titleSearch]);

  useEffect(() => {
    onPageResetRef.current?.();
  }, [searchKeyword]);

  const trimmedKeyword = searchKeyword.trim();
  const hasAppliedFilters = Boolean(
    selectedGenre ||
      selectedCountry ||
      selectedActor ||
      (includeShowtimeFilters && selectedCinema) ||
      (includeShowtimeFilters && selectedShowtimeDate) ||
      selectedAgeRestriction
  );

  const appliedQueryParams = useMemo(() => {
    const params = {};
    if (trimmedKeyword) params.keyword = trimmedKeyword;
    if (selectedGenre) params.genreUuids = [selectedGenre];
    if (selectedCountry) params.countryUuid = selectedCountry;
    if (selectedActor) params.actorUuid = selectedActor;
    if (includeShowtimeFilters && selectedCinema) params.cinemaUuid = selectedCinema;
    if (includeShowtimeFilters && selectedShowtimeDate) params.showtimeDate = selectedShowtimeDate;
    if (selectedAgeRestriction) params.ageRestriction = selectedAgeRestriction;
    return params;
  }, [
    trimmedKeyword,
    selectedGenre,
    selectedCountry,
    selectedActor,
    selectedCinema,
    selectedShowtimeDate,
    selectedAgeRestriction,
    includeShowtimeFilters,
  ]);

  const filteredActors = useMemo(() => {
    const query = actorQuery.trim().toLowerCase();
    if (!query) return dbActors.slice(0, 8);
    return dbActors.filter((actor) => actor.fullName?.toLowerCase().includes(query)).slice(0, 8);
  }, [actorQuery, dbActors]);

  const getActorNameByUuid = useCallback(
    (uuid) => dbActors.find((actor) => actor.uuid === uuid)?.fullName || '',
    [dbActors]
  );

  const handleClearTempFilters = useCallback(() => {
    setTempCountry(null);
    setTempActor(null);
    setActorQuery('');
    setTempGenre(null);
    setTempShowtimeDate(null);
    setTempCinema(null);
    setTempAgeRestriction(null);
    setCountryQuery('');
    setGenreQuery('');
    setIsActorDropdownOpen(false);
  }, []);

  const handleClearAppliedFilters = useCallback(() => {
    handleClearTempFilters();
    setSelectedCountry(null);
    setSelectedActor(null);
    setSelectedGenre(null);
    setSelectedShowtimeDate(null);
    setSelectedCinema(null);
    setSelectedAgeRestriction(null);
    setTitleSearch('');
    setSearchKeyword('');
    resetPage();
  }, [handleClearTempFilters, resetPage]);

  const activeFilters = useMemo(() => {
    const filters = [];

    if (selectedCountry) {
      const name = dbCountries.find((c) => c.uuid === selectedCountry)?.name;
      if (name) {
        filters.push({
          key: 'country',
          label: name,
          onRemove: () => {
            setSelectedCountry(null);
            setTempCountry(null);
            resetPage();
          },
        });
      }
    }
    if (selectedGenre) {
      const name = dbGenres.find((g) => g.uuid === selectedGenre)?.name;
      if (name) {
        filters.push({
          key: 'genre',
          label: name,
          onRemove: () => {
            setSelectedGenre(null);
            setTempGenre(null);
            resetPage();
          },
        });
      }
    }
    if (selectedActor) {
      const name = getActorNameByUuid(selectedActor);
      if (name) {
        filters.push({
          key: 'actor',
          label: name,
          onRemove: () => {
            setSelectedActor(null);
            setTempActor(null);
            setActorQuery('');
            resetPage();
          },
        });
      }
    }
    if (includeShowtimeFilters && selectedShowtimeDate) {
      const label = filterDates.find((d) => d.dateStr === selectedShowtimeDate)?.label;
      if (label) {
        filters.push({
          key: 'showtime',
          label,
          onRemove: () => {
            setSelectedShowtimeDate(null);
            setTempShowtimeDate(null);
            resetPage();
          },
        });
      }
    }
    if (includeShowtimeFilters && selectedCinema) {
      const name = dbCinemas.find((c) => c.uuid === selectedCinema)?.name;
      if (name) {
        filters.push({
          key: 'cinema',
          label: name,
          onRemove: () => {
            setSelectedCinema(null);
            setTempCinema(null);
            resetPage();
          },
        });
      }
    }
    if (selectedAgeRestriction) {
      const label = AGE_RESTRICTIONS.find((r) => r.value === selectedAgeRestriction)?.label;
      if (label) {
        filters.push({
          key: 'rating',
          label,
          onRemove: () => {
            setSelectedAgeRestriction(null);
            setTempAgeRestriction(null);
            resetPage();
          },
        });
      }
    }
    if (searchKeyword) {
      filters.push({
        key: 'search',
        label: `"${searchKeyword}"`,
        onRemove: () => {
          setTitleSearch('');
          setSearchKeyword('');
          resetPage();
        },
      });
    }
    return filters;
  }, [
    selectedCountry,
    selectedGenre,
    selectedActor,
    selectedShowtimeDate,
    selectedCinema,
    selectedAgeRestriction,
    dbCountries,
    dbGenres,
    dbCinemas,
    filterDates,
    dbActors,
    searchKeyword,
    includeShowtimeFilters,
    getActorNameByUuid,
    resetPage,
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (actorSearchRef.current && !actorSearchRef.current.contains(event.target)) {
        setIsActorDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApplyFilters = useCallback(() => {
    setSelectedCountry(tempCountry);
    setSelectedActor(tempActor);
    setSelectedGenre(tempGenre);
    setSelectedShowtimeDate(tempShowtimeDate);
    setSelectedCinema(tempCinema);
    setSelectedAgeRestriction(tempAgeRestriction);
    resetPage();
  }, [
    tempCountry,
    tempActor,
    tempGenre,
    tempShowtimeDate,
    tempCinema,
    tempAgeRestriction,
    resetPage,
  ]);

  const syncTempFromSelected = useCallback(() => {
    setTempCountry(selectedCountry);
    setTempActor(selectedActor);
    setActorQuery(selectedActor ? getActorNameByUuid(selectedActor) : '');
    setTempGenre(selectedGenre);
    setTempShowtimeDate(selectedShowtimeDate);
    setTempCinema(selectedCinema);
    setTempAgeRestriction(selectedAgeRestriction);
  }, [
    selectedCountry,
    selectedActor,
    selectedGenre,
    selectedShowtimeDate,
    selectedCinema,
    selectedAgeRestriction,
    getActorNameByUuid,
  ]);

  const handleToggleFilters = useCallback(() => {
    if (!isFiltersOpen) syncTempFromSelected();
    setIsFiltersOpen((open) => !open);
  }, [isFiltersOpen, syncTempFromSelected]);

  const handleCloseFilters = useCallback(() => {
    setIsFiltersOpen(false);
    syncTempFromSelected();
  }, [syncTempFromSelected]);

  const resetAllFilters = useCallback(() => {
    setSelectedCountry(null);
    setSelectedActor(null);
    setSelectedGenre(null);
    setSelectedShowtimeDate(null);
    setSelectedCinema(null);
    setSelectedAgeRestriction(null);
    handleClearTempFilters();
    setTitleSearch('');
    setSearchKeyword('');
    setIsFiltersOpen(false);
    resetPage();
  }, [handleClearTempFilters, resetPage]);

  const hiddenSections = includeShowtimeFilters ? [] : ['schedule', 'cinema'];

  const filterPanelProps = {
    isOpen: isFiltersOpen,
    onToggle: handleToggleFilters,
    onClose: handleCloseFilters,
    onApply: handleApplyFilters,
    onClearTemp: handleClearTempFilters,
    activeFilterCount: activeFilters.length,
    activeFilters,
    onClearApplied: handleClearAppliedFilters,
    hiddenSections,
    tempCountry,
    tempGenre,
    tempShowtimeDate,
    tempCinema,
    tempAgeRestriction,
    onCountrySelect: setTempCountry,
    onGenreSelect: setTempGenre,
    onShowtimeDateSelect: setTempShowtimeDate,
    onCinemaSelect: setTempCinema,
    onAgeRestrictionSelect: setTempAgeRestriction,
    countryQuery,
    onCountryQueryChange: setCountryQuery,
    genreQuery,
    onGenreQueryChange: setGenreQuery,
    dbCountries,
    dbGenres,
    dbCinemas,
    filterDates,
    ageRestrictions: AGE_RESTRICTIONS,
    actorQuery,
    onActorInputChange: (value) => {
      setActorQuery(value);
      setIsActorDropdownOpen(true);
      if (!value.trim()) setTempActor(null);
    },
    onActorSelect: (actor) => {
      if (!actor) {
        setTempActor(null);
        setActorQuery('');
        setIsActorDropdownOpen(false);
        return;
      }
      setTempActor(actor.uuid);
      setActorQuery(actor.fullName);
      setIsActorDropdownOpen(false);
    },
    isActorDropdownOpen,
    setIsActorDropdownOpen,
    actorSearchRef,
    filteredActors,
    tempActor,
  };

  return {
    titleSearch,
    setTitleSearch,
    searchKeyword,
    trimmedKeyword,
    hasAppliedFilters,
    appliedQueryParams,
    filterPanelProps,
    resetAllFilters,
    handleClearSearch: () => {
      setTitleSearch('');
      setSearchKeyword('');
      resetPage();
    },
  };
}
