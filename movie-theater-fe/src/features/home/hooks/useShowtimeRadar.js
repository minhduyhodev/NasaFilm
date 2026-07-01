import { useCallback, useEffect, useRef, useState } from 'react';
import { showtimeRadarService } from '../../../shared/services/showtimeRadarService';
import { notificationService } from '../../../shared/services/notificationService';
import { buildShowtimeRadarPayload } from '../../../shared/utils/showtimeRadarPayload';

export const RADAR_PREFERENCES_UPDATED_EVENT = 'nasa-radar-preferences-updated';

const buildPayload = buildShowtimeRadarPayload;

export const resolveRadarEmptyMessage = ({
  selectedGenres = [],
  includeFavorites = true,
  upcomingShowtimeCount = 0,
  enabled = false,
} = {}) => {
  if (selectedGenres.length === 0 && !includeFavorites) {
    return 'Chọn thể loại hoặc bật phim yêu thích, sau đó bấm Lưu sở thích.';
  }
  if (!enabled) {
    return 'Bấm Lưu sở thích để kích hoạt gợi ý Radar.';
  }
  if (upcomingShowtimeCount === 0) {
    return 'Hiện chưa có suất chiếu mở bán trong 48 giờ tới. Radar sẽ cập nhật khi có lịch mới.';
  }
  return 'Chưa có suất phù hợp sở thích trong 48 giờ tới. Radar sẽ thông báo khi có suất mới.';
};

export const useShowtimeRadar = ({ autoLoad = true } = {}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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

  const syncPreferenceStateRef = useCallback((next) => {
    preferenceStateRef.current = next;
  }, []);

  const applyPreferenceData = useCallback((data) => {
    const nextState = {
      enabled: Boolean(data?.enabled),
      includeFavorites: data?.includeFavorites !== false,
      selectedGenres: (data?.genreUuids ?? []).map(String),
      timeSlotStartHour:
        data?.timeSlotStartHour != null ? String(data.timeSlotStartHour) : '',
      timeSlotEndHour:
        data?.timeSlotEndHour != null ? String(data.timeSlotEndHour) : '',
    };
    syncPreferenceStateRef(nextState);
    setEnabled(nextState.enabled);
    setIncludeFavorites(nextState.includeFavorites);
    setSelectedGenres(nextState.selectedGenres);
    setSavedSelectedGenres(nextState.selectedGenres);
    setSavedIncludeFavorites(nextState.includeFavorites);
    setTimeSlotStartHour(nextState.timeSlotStartHour);
    setTimeSlotEndHour(nextState.timeSlotEndHour);
    setSuggestions(data?.suggestions ?? []);
    setUpcomingShowtimeCount(Number(data?.upcomingShowtimeCount ?? 0));
  }, [syncPreferenceStateRef]);

  const resetLocalState = useCallback(() => {
    const nextState = {
      enabled: false,
      includeFavorites: true,
      selectedGenres: [],
      timeSlotStartHour: '',
      timeSlotEndHour: '',
    };
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
  }, [syncPreferenceStateRef]);

  const loadRadar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await showtimeRadarService.getPreference();
      applyPreferenceData(data);
    } catch (error) {
      console.error(error);
      setSuggestions([]);
      setUpcomingShowtimeCount(0);
    } finally {
      setLoading(false);
    }
  }, [applyPreferenceData]);

  useEffect(() => {
    if (!autoLoad) return undefined;
    loadRadar();
    const onUpdated = () => loadRadar();
    window.addEventListener(RADAR_PREFERENCES_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(RADAR_PREFERENCES_UPDATED_EVENT, onUpdated);
  }, [autoLoad, loadRadar]);

  const persistPreference = useCallback(async (payload, successMessage) => {
    setSaving(true);
    try {
      const data = await showtimeRadarService.updatePreference(payload);
      applyPreferenceData(data);
      window.dispatchEvent(new Event(RADAR_PREFERENCES_UPDATED_EVENT));
      if (successMessage) {
        notificationService.success(successMessage);
      }
      return data;
    } catch (error) {
      notificationService.error('Không thể cập nhật Smart Showtime Radar');
      console.error(error);
      try {
        const data = await showtimeRadarService.getPreference();
        applyPreferenceData(data);
      } catch (reloadError) {
        console.error(reloadError);
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, [applyPreferenceData]);

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
      window.dispatchEvent(new Event(RADAR_PREFERENCES_UPDATED_EVENT));
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

  const refreshSuggestions = async () => {
    setRefreshing(true);
    try {
      const data = await showtimeRadarService.getPreference();
      applyPreferenceData(data);
    } catch (error) {
      notificationService.error('Không thể làm mới gợi ý');
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleGenre = (genreUuid) => {
    const normalized = String(genreUuid);
    const current = preferenceStateRef.current;
    const nextGenres = current.selectedGenres.includes(normalized)
      ? current.selectedGenres.filter((id) => id !== normalized)
      : [...current.selectedGenres, normalized];
    const nextState = { ...current, selectedGenres: nextGenres };
    syncPreferenceStateRef(nextState);
    setSelectedGenres(nextGenres);
  };

  const updateIncludeFavorites = (value) => {
    const current = preferenceStateRef.current;
    const nextState = { ...current, includeFavorites: value };
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
    loading,
    saving,
    refreshing,
    enabled,
    includeFavorites,
    setIncludeFavorites: updateIncludeFavorites,
    selectedGenres,
    savedSelectedGenres,
    suggestions,
    upcomingShowtimeCount,
    emptyMessage,
    loadRadar,
    savePreferences,
    toggleEnabled,
    deletePreferences,
    refreshSuggestions,
    toggleGenre,
  };
};

export default useShowtimeRadar;
