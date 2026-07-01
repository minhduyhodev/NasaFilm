import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { showtimeRadarService } from '../../../shared/services/showtimeRadarService';
import { notificationService } from '../../../shared/services/notificationService';
import { buildShowtimeRadarPayload } from '../../../shared/utils/showtimeRadarPayload';
import { queryKeys } from '../../../shared/hooks/queries/queryKeys';
import {
  resolveRadarEmptyMessage,
  useShowtimeRadarQuery,
  useShowtimeRadarRefresh,
} from '../hooks/useShowtimeRadarQuery';

const ShowtimeRadarContext = createContext(null);

const buildPayload = buildShowtimeRadarPayload;

const applyServerDataToDraft = (data) => ({
  enabled: Boolean(data?.enabled),
  includeFavorites: data?.includeFavorites !== false,
  selectedGenres: (data?.genreUuids ?? []).map(String),
  timeSlotStartHour:
    data?.timeSlotStartHour != null ? String(data.timeSlotStartHour) : '',
  timeSlotEndHour:
    data?.timeSlotEndHour != null ? String(data.timeSlotEndHour) : '',
});

const useShowtimeRadarState = () => {
  const queryClient = useQueryClient();
  const radarQuery = useShowtimeRadarQuery();
  const { refreshSuggestions: refreshScan, refreshing: scanRefreshing } = useShowtimeRadarRefresh();

  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [includeFavorites, setIncludeFavorites] = useState(true);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [savedSelectedGenres, setSavedSelectedGenres] = useState([]);
  const [savedIncludeFavorites, setSavedIncludeFavorites] = useState(true);
  const [timeSlotStartHour, setTimeSlotStartHour] = useState('');
  const [timeSlotEndHour, setTimeSlotEndHour] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [upcomingShowtimeCount, setUpcomingShowtimeCount] = useState(0);

  const preferenceStateRef = useRef({
    enabled: false,
    includeFavorites: true,
    selectedGenres: [],
    timeSlotStartHour: '',
    timeSlotEndHour: '',
  });
  const saveQueueRef = useRef(Promise.resolve());
  const persistPreferenceRef = useRef(async () => null);
  const draftDirtyRef = useRef(false);

  const syncPreferenceStateRef = useCallback((next) => {
    preferenceStateRef.current = next;
  }, []);

  const applyPreferenceData = useCallback((data, syncDraft = false) => {
    const nextState = applyServerDataToDraft(data);
    if (syncDraft || !draftDirtyRef.current) {
      syncPreferenceStateRef(nextState);
      setEnabled(nextState.enabled);
      setIncludeFavorites(nextState.includeFavorites);
      setSelectedGenres(nextState.selectedGenres);
      setTimeSlotStartHour(nextState.timeSlotStartHour);
      setTimeSlotEndHour(nextState.timeSlotEndHour);
      if (syncDraft) {
        draftDirtyRef.current = false;
      }
    } else {
      setEnabled(nextState.enabled);
      setTimeSlotStartHour(nextState.timeSlotStartHour);
      setTimeSlotEndHour(nextState.timeSlotEndHour);
    }
    setSavedSelectedGenres(nextState.selectedGenres);
    setSavedIncludeFavorites(nextState.includeFavorites);
    setSuggestions(data?.suggestions ?? []);
    setUpcomingShowtimeCount(Number(data?.upcomingShowtimeCount ?? 0));
  }, [syncPreferenceStateRef]);

  useEffect(() => {
    if (radarQuery.data) {
      applyPreferenceData(radarQuery.data);
    }
  }, [radarQuery.data, applyPreferenceData]);

  const resetLocalState = useCallback(() => {
    const nextState = {
      enabled: false,
      includeFavorites: true,
      selectedGenres: [],
      timeSlotStartHour: '',
      timeSlotEndHour: '',
    };
    draftDirtyRef.current = false;
    syncPreferenceStateRef(nextState);
    setEnabled(false);
    setIncludeFavorites(true);
    setSelectedGenres([]);
    setSavedSelectedGenres([]);
    setSavedIncludeFavorites(true);
    setTimeSlotStartHour('');
    setTimeSlotEndHour('');
    setSuggestions([]);
    setUpcomingShowtimeCount(0);
    queryClient.setQueryData(queryKeys.showtimeRadar, null);
  }, [queryClient, syncPreferenceStateRef]);

  const persistPreference = useCallback(async (payload, successMessage) => {
    setSaving(true);
    try {
      const data = await showtimeRadarService.updatePreference(payload);
      queryClient.setQueryData(queryKeys.showtimeRadar, data);
      applyPreferenceData(data, true);
      if (successMessage) {
        notificationService.success(successMessage);
      }
      return data;
    } catch (error) {
      notificationService.error('Không thể cập nhật Smart Showtime Radar');
      console.error(error);
      try {
        const data = await queryClient.fetchQuery({
          queryKey: queryKeys.showtimeRadar,
          queryFn: () => showtimeRadarService.getPreference(),
        });
        applyPreferenceData(data, true);
      } catch (reloadError) {
        console.error(reloadError);
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, [applyPreferenceData, queryClient]);

  persistPreferenceRef.current = persistPreference;

  const enqueuePreferenceSave = useCallback((successMessage = null) => {
    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const payload = buildPayload(preferenceStateRef.current);
        return persistPreferenceRef.current(payload, successMessage);
      });
    return saveQueueRef.current;
  }, []);

  const savePreferenceDraft = useCallback(async (overrides = {}, successMessage = null) => {
    const current = preferenceStateRef.current;
    const nextState = {
      enabled: overrides.enabled ?? current.enabled,
      includeFavorites: overrides.includeFavorites ?? current.includeFavorites,
      selectedGenres: overrides.selectedGenres ?? current.selectedGenres,
      timeSlotStartHour: overrides.timeSlotStartHour ?? current.timeSlotStartHour,
      timeSlotEndHour: overrides.timeSlotEndHour ?? current.timeSlotEndHour,
    };
    draftDirtyRef.current = false;
    syncPreferenceStateRef(nextState);
    setEnabled(nextState.enabled);
    setIncludeFavorites(nextState.includeFavorites);
    setSelectedGenres(nextState.selectedGenres);
    setTimeSlotStartHour(nextState.timeSlotStartHour);
    setTimeSlotEndHour(nextState.timeSlotEndHour);

    return enqueuePreferenceSave(successMessage);
  }, [enqueuePreferenceSave, syncPreferenceStateRef]);

  const savePreferences = async () => {
    const current = preferenceStateRef.current;
    if (current.selectedGenres.length === 0 && !current.includeFavorites) {
      notificationService.warning('Chọn ít nhất một thể loại hoặc bật phim yêu thích');
      return false;
    }

    const result = await savePreferenceDraft(
      { enabled: true },
      'Đã lưu sở thích — hiển thị trên hồ sơ của bạn',
    );
    return Boolean(result);
  };

  const toggleEnabled = async () => {
    const current = preferenceStateRef.current;
    const nextEnabled = !current.enabled;
    if (nextEnabled && current.selectedGenres.length === 0 && !current.includeFavorites) {
      notificationService.warning('Hãy cấu hình sở thích trước khi bật Radar');
      return false;
    }

    const result = await savePreferenceDraft(
      { enabled: nextEnabled },
      nextEnabled ? 'Đã bật Radar' : 'Đã tắt Radar',
    );
    return Boolean(result);
  };

  const deletePreferences = async () => {
    setSaving(true);
    try {
      await showtimeRadarService.deletePreference();
      resetLocalState();
      notificationService.success('Đã xóa cài đặt Radar');
      return true;
    } catch (error) {
      notificationService.error('Không thể xóa cài đặt Radar');
      console.error(error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const refreshSuggestions = useCallback(async () => {
    await refreshScan();
    const cached = queryClient.getQueryData(queryKeys.showtimeRadar);
    if (cached) {
      applyPreferenceData(cached, false);
    }
  }, [applyPreferenceData, queryClient, refreshScan]);

  const toggleGenre = (genreUuid) => {
    const normalized = String(genreUuid);
    const current = preferenceStateRef.current;
    const nextGenres = current.selectedGenres.includes(normalized)
      ? current.selectedGenres.filter((id) => id !== normalized)
      : [...current.selectedGenres, normalized];
    const nextState = { ...current, selectedGenres: nextGenres };
    draftDirtyRef.current = true;
    syncPreferenceStateRef(nextState);
    setSelectedGenres(nextGenres);
  };

  const updateIncludeFavorites = (value) => {
    const current = preferenceStateRef.current;
    const nextState = { ...current, includeFavorites: value };
    draftDirtyRef.current = true;
    syncPreferenceStateRef(nextState);
    setIncludeFavorites(value);
  };

  const emptyMessage = resolveRadarEmptyMessage({
    selectedGenres: savedSelectedGenres,
    includeFavorites: savedIncludeFavorites,
    upcomingShowtimeCount,
    enabled,
  });

  return {
    loading: radarQuery.isLoading,
    saving,
    refreshing: scanRefreshing || radarQuery.isFetching,
    enabled,
    includeFavorites,
    setIncludeFavorites: updateIncludeFavorites,
    selectedGenres,
    savedSelectedGenres,
    suggestions,
    upcomingShowtimeCount,
    emptyMessage,
    loadRadar: () => queryClient.invalidateQueries({ queryKey: queryKeys.showtimeRadar }),
    savePreferences,
    toggleEnabled,
    deletePreferences,
    refreshSuggestions,
    toggleGenre,
    timeSlotStartHour,
    timeSlotEndHour,
  };
};

export const ShowtimeRadarProvider = ({ children }) => {
  const value = useShowtimeRadarState();
  return (
    <ShowtimeRadarContext.Provider value={value}>
      {children}
    </ShowtimeRadarContext.Provider>
  );
};

export const useShowtimeRadar = () => {
  const context = useContext(ShowtimeRadarContext);
  if (!context) {
    throw new Error('useShowtimeRadar must be used within ShowtimeRadarProvider');
  }
  return context;
};

export default ShowtimeRadarProvider;
