import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, Plus, User, Play, Calendar, FileText, Archive, Pause,
  ChevronLeft, ChevronRight, Search, Loader2, Film
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getDefaultOnlineStreamingPrice } from '../../../shared/utils/systemConfig';
import { formatDateDisplay, getDaysInMonth } from '../utils/adminMovieUtils.jsx';
import {
  AdminPage,
  PageHeader,
  Section,
  PrimaryButton,
  GhostButton,
  AdminSelectDropdown,
} from '../components';
import { adminInputClass } from '../components/adminFormStyles';
import PosterImage from '../../../shared/components/PosterImage';
import { unwrapMediaUrl, isAwsMovieStreamingUrl } from '../../../shared/utils/mediaUrlUtils';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const mapDetailToFormData = (detail, genresList, countriesList) => {
  const poster = unwrapMediaUrl(detail.medias?.find(m => m.mediaType === 'POSTER')?.mediaUrl || '');
  const trailer = unwrapMediaUrl(detail.medias?.find(m => m.mediaType === 'TRAILER')?.mediaUrl || '');
  const mappedGenreUuids = detail.genres
    ? genresList.filter(g => detail.genres.includes(g.name)).map(g => g.uuid)
    : [];
  const mappedCountryUuids = detail.countries
    ? countriesList.filter(c => detail.countries.includes(c.name)).map(c => c.uuid)
    : [];
  return {
    title: detail.title || '',
    description: detail.description || '',
    durationMinutes: detail.durationMinutes || '',
    releaseDate: detail.releaseDate || '',
    status: detail.status || 'NOW_SHOWING',
    ageRestriction: detail.ageRestriction || 'P',
    genreUuids: mappedGenreUuids,
    countryUuids: mappedCountryUuids,
    posterUrl: poster,
    streamingUrl: unwrapMediaUrl(detail.streamingUrl || ''),
    trailerUrl: trailer,
    actors: detail.actors?.map(a => ({
      actorUuid: a.uuid,
      characterName: a.characterName || '',
      isMain: a.isMain || false,
      castOrder: a.castOrder || 0
    })) || [],
    screeningMode: detail.screeningMode || 'BOTH',
    onlinePrice: detail.onlinePrice !== null && detail.onlinePrice !== undefined ? detail.onlinePrice : ''
  };
};

const AdminMovieFormPage = () => {
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { movieUuid } = useParams();
  const isEditing = Boolean(movieUuid);

  const [editingMovie, setEditingMovie] = useState(null);
  const [genresList, setGenresList] = useState([]);
  const [countriesList, setCountriesList] = useState([]);
  const [actorsList, setActorsList] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [metadataLoaded, setMetadataLoaded] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    durationMinutes: '',
    releaseDate: '',
    status: 'NOW_SHOWING',
    ageRestriction: 'P',
    genreUuids: [],
    countryUuids: [],
    posterUrl: '',
    streamingUrl: '',
    trailerUrl: '',
    actors: [],
    screeningMode: 'BOTH',
    onlinePrice: ''
  });
  const [initialFormData, setInitialFormData] = useState(null);
  const [defaultOnlinePrice, setDefaultOnlinePrice] = useState(getDefaultOnlineStreamingPrice());

  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());

  const [activeCastIndex, setActiveCastIndex] = useState(null);
  const [isActorSelectorOpen, setIsActorSelectorOpen] = useState(false);
  const [actorSearchTerm, setActorSearchTerm] = useState('');
  const [actorCountryFilter, setActorCountryFilter] = useState('');
  const [posterLoadError, setPosterLoadError] = useState(false);

  useEffect(() => {
    setPosterLoadError(false);
  }, [formData.posterUrl]);

  const ageRestrictionOptions = [
    { value: 'P', label: 'P - Mọi lứa tuổi' },
    { value: 'K', label: 'K - Dưới 13 tuổi (cần có người giám hộ)' },
    { value: 'T13', label: 'T13 - Từ 13 tuổi trở lên' },
    { value: 'T16', label: 'T16 - Từ 16 tuổi trở lên' },
    { value: 'T18', label: 'T18 - Từ 18 tuổi trở lên' }
  ];

  const statusOptions = [
    { value: 'NOW_SHOWING', label: 'Đang chiếu', icon: <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" /> },
    { value: 'COMING_SOON', label: 'Sắp chiếu', icon: <Calendar className="w-3.5 h-3.5 text-blue-500" /> },
    { value: 'DRAFT', label: 'Bản nháp', icon: <FileText className="w-3.5 h-3.5 text-gray-500" /> },
    { value: 'ENDED', label: 'Đã kết thúc', icon: <Archive className="w-3.5 h-3.5 text-red-500" /> },
    { value: 'INACTIVE', label: 'Tạm ngưng', icon: <Pause className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" /> }
  ];

  const screeningModeOptions = [
    { value: 'BOTH', label: 'Cả rạp & Xem Online' },
    { value: 'THEATER_ONLY', label: 'Chỉ chiếu rạp' },
    { value: 'ONLINE_ONLY', label: 'Chỉ xem Online (VOD)' },
    { value: 'NONE', label: 'Ngừng chiếu hoàn toàn' },
  ];

  useEffect(() => {
    let isMounted = true;
    const fetchMetadata = async () => {
      try {
        const [genresData, countriesData, actorsData] = await Promise.all([
          movieService.getGenres(),
          movieService.getCountries(),
          movieService.getActors()
        ]);
        if (isMounted) {
          setGenresList(genresData);
          setCountriesList(countriesData);
          setActorsList(actorsData || []);
          setMetadataLoaded(true);
        }
      } catch (err) {
        console.error('Failed to load metadata in admin movie form:', err);
        notificationService.error('Không thể tải dữ liệu phân loại phim');
      }
    };
    fetchMetadata();
    systemConfigService.getConfig()
      .then((cfg) => {
        if (isMounted) {
          setDefaultOnlinePrice(getDefaultOnlineStreamingPrice(cfg));
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (!metadataLoaded || isEditing) return;
    const initialObj = {
      title: '',
      description: '',
      durationMinutes: '',
      releaseDate: '',
      status: 'NOW_SHOWING',
      ageRestriction: 'P',
      genreUuids: [],
      countryUuids: [],
      posterUrl: '',
      streamingUrl: '',
      trailerUrl: '',
      actors: [],
      screeningMode: 'BOTH',
      onlinePrice: String(defaultOnlinePrice)
    };
    setFormData(initialObj);
    setInitialFormData(initialObj);
  }, [metadataLoaded, isEditing, defaultOnlinePrice]);

  useEffect(() => {
    if (!metadataLoaded || !isEditing) return;

    let isMounted = true;
    const loadMovie = async () => {
      setIsLoading(true);
      try {
        notificationService.info('Đang lấy chi tiết phim để chỉnh sửa...');
        const detail = await movieService.getMovieDetail(movieUuid);
        if (!isMounted) return;
        setEditingMovie(detail);
        const mapped = mapDetailToFormData(detail, genresList, countriesList);
        setFormData(mapped);
        setInitialFormData(mapped);
      } catch (err) {
        console.error('Failed to load movie for edit:', err);
        notificationService.error('Không thể lấy thông tin chi tiết phim để chỉnh sửa');
        navigate('/admin/movies');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadMovie();
    return () => { isMounted = false; };
  }, [metadataLoaded, isEditing, movieUuid, genresList, countriesList, navigate]);

  const handleOpenDatePicker = () => {
    if (formData.releaseDate) {
      const parsedDate = new Date(formData.releaseDate);
      if (!isNaN(parsedDate.getTime())) {
        setCalendarMonth(parsedDate.getMonth());
        setCalendarYear(parsedDate.getFullYear());
      }
    } else {
      const today = new Date();
      setCalendarMonth(today.getMonth());
      setCalendarYear(today.getFullYear());
    }
    setIsDatePickerOpen(true);
  };

  const handlePrevMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 0) {
        setCalendarYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setCalendarMonth(prev => {
      if (prev === 11) {
        setCalendarYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleSelectDay = (dayObj) => {
    const dateStr = `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
    setFormData(prev => ({ ...prev, releaseDate: dateStr }));
    setIsDatePickerOpen(false);
  };

  const handleGenreCheckboxChange = (genreUuid) => {
    setFormData(prev => {
      const exists = prev.genreUuids.includes(genreUuid);
      const nextUuids = exists
        ? prev.genreUuids.filter(id => id !== genreUuid)
        : [...prev.genreUuids, genreUuid];
      return { ...prev, genreUuids: nextUuids };
    });
  };

  const handleCountryCheckboxChange = (countryUuid) => {
    setFormData(prev => {
      const exists = prev.countryUuids.includes(countryUuid);
      const nextUuids = exists
        ? prev.countryUuids.filter(id => id !== countryUuid)
        : [...prev.countryUuids, countryUuid];
      return { ...prev, countryUuids: nextUuids };
    });
  };

  const handleAddActorToCast = () => {
    setFormData(prev => ({
      ...prev,
      actors: [
        ...prev.actors,
        { actorUuid: '', characterName: '', isMain: false, castOrder: prev.actors.length + 1 }
      ]
    }));
  };

  const handleRemoveActorFromCast = (index) => {
    setFormData(prev => ({
      ...prev,
      actors: prev.actors.filter((_, i) => i !== index)
    }));
  };

  const handleCastFieldChange = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.actors];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, actors: updated };
    });
  };

  const handleOpenActorSelector = (index) => {
    setActiveCastIndex(index);
    setActorSearchTerm('');
    setActorCountryFilter('');
    setIsActorSelectorOpen(true);
  };

  const handleSelectActorForCast = (actorUuid) => {
    if (activeCastIndex === null) return;
    handleCastFieldChange(activeCastIndex, 'actorUuid', actorUuid);
    setIsActorSelectorOpen(false);
  };

  const filteredActorsForSelector = actorsList.filter(a => {
    const matchesSearch = a.fullName.toLowerCase().includes(actorSearchTerm.toLowerCase());
    const matchesCountry = actorCountryFilter ? a.countryUuid === actorCountryFilter : true;
    return matchesSearch && matchesCountry;
  });

  const isDirty = initialFormData && JSON.stringify(formData) !== JSON.stringify(initialFormData);

  const handleCancel = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: 'Hủy chỉnh sửa',
        message: 'Bạn có chắc chắn muốn hủy? Mọi thay đổi chưa lưu sẽ bị mất.',
        confirmLabel: 'Hủy bỏ',
        variant: 'warning',
      });
      if (!ok) return;
    }
    if (isEditing) {
      navigate(`/admin/movies/${movieUuid}`);
    } else {
      navigate('/admin/movies');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      notificationService.error('Tên phim không được để trống');
      return;
    }
    if (!formData.releaseDate) {
      notificationService.error('Ngày khởi chiếu không được để trống');
      return;
    }

    const supportsOnline =
      formData.screeningMode === 'BOTH' || formData.screeningMode === 'ONLINE_ONLY';
    let streamingUrl = unwrapMediaUrl(formData.streamingUrl.trim()) || null;
    if (streamingUrl && !isAwsMovieStreamingUrl(streamingUrl)) {
      notificationService.error(
        'Link phim chỉ chấp nhận Object URL AWS S3 thư mục movie/ (java-06.s3.ap-southeast-1.amazonaws.com/movie/...)'
      );
      return;
    }
    if (supportsOnline && !streamingUrl) {
      notificationService.error(
        'Phim xem online cần Link phim AWS S3 (movie/...mp4), không dùng YouTube/opstream'
      );
      return;
    }

    const medias = [];
    if (formData.posterUrl.trim()) {
      medias.push({
        mediaUrl: unwrapMediaUrl(formData.posterUrl.trim()),
        mediaType: 'POSTER',
        title: `${formData.title.trim()} Poster`,
        isPrimary: true,
        sortOrder: 1
      });
    }
    if (formData.trailerUrl.trim()) {
      medias.push({
        mediaUrl: unwrapMediaUrl(formData.trailerUrl.trim()),
        mediaType: 'TRAILER',
        title: `${formData.title.trim()} Trailer`,
        isPrimary: false,
        sortOrder: 2
      });
    }

    const requestData = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      durationMinutes: Number(formData.durationMinutes),
      releaseDate: formData.releaseDate,
      status: formData.status,
      ageRestriction: formData.ageRestriction || 'P',
      genreUuids: formData.genreUuids,
      countryUuids: formData.countryUuids,
      streamingUrl,
      medias,
      actors: formData.actors.filter(a => a.actorUuid),
      screeningMode: formData.screeningMode,
      onlinePrice: (formData.screeningMode === 'THEATER_ONLY' || formData.screeningMode === 'NONE' || formData.onlinePrice === '')
        ? null
        : Math.max(0, Number(formData.onlinePrice))
    };

    setIsSaving(true);
    try {
      if (isEditing) {
        const updated = await movieService.updateMovie(movieUuid, requestData);
        notificationService.success(`Cập nhật thành công phim "${updated?.title || requestData.title}"`);
        navigate(`/admin/movies/${movieUuid}`);
      } else {
        const created = await movieService.createMovie(requestData);
        notificationService.success(`Thêm mới thành công phim "${created?.title || requestData.title}"`);
        navigate(`/admin/movies/${created.uuid}`);
      }
    } catch (err) {
      console.error('Failed to save movie:', err);
      notificationService.error(err.message || 'Lưu phim thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = adminInputClass;
  const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-400 text-sm">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-red-500" />
        Đang tải thông tin phim...
      </div>
    );
  }

  return (
    <AdminPage>
      <PageHeader
        title={isEditing ? 'Chỉnh sửa phim' : 'Thêm phim mới'}
        description={isEditing && editingMovie ? editingMovie.title : 'Nhập thông tin phim và lưu vào hệ thống.'}
        backTo={isEditing ? `/admin/movies/${movieUuid}` : '/admin/movies'}
      />

      <form onSubmit={handleSubmit} className="space-y-8">
          <Section title="Poster & thông tin phim">
            <div className="grid grid-cols-1 md:grid-cols-[148px_1fr] gap-6">
              <div className="shrink-0">
                <div className="aspect-[2/3] w-full max-w-[148px] rounded-lg overflow-hidden bg-white/[0.03] flex items-center justify-center">
                  {formData.posterUrl?.trim() && !posterLoadError ? (
                    <PosterImage
                      src={formData.posterUrl.trim()}
                      alt={formData.title || 'Poster phim'}
                      width={300}
                      className="w-full h-full object-cover"
                      onError={() => setPosterLoadError(true)}
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-gray-600 px-3 text-center">
                      <Film className="w-8 h-8" />
                      <span className="text-[10px] leading-snug">
                        {formData.posterUrl?.trim() ? 'Không tải được ảnh' : 'Chưa có poster'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 min-w-0">
                <div>
                  <label className={labelClass}>Tên phim *</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Nhập tên phim..."
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Poster URL *</label>
                  <input
                    type="url"
                    className={inputClass}
                    placeholder="https://..."
                    value={formData.posterUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, posterUrl: e.target.value }))}
                    required
                  />
                  <p className="text-xs text-gray-600 mt-1">Ảnh xem trước cập nhật khi bạn nhập URL.</p>
                </div>
                <div>
                  <label className={labelClass}>Mô tả phim</label>
                  <textarea
                    className={`${inputClass} h-24 resize-y`}
                    placeholder="Nhập mô tả chi tiết..."
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </Section>

          <Section title="Phát hành & trạng thái" divided>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Thời lượng (phút) *</label>
                <input
                  type="number"
                  className={`${inputClass} h-[38px]`}
                  placeholder="Ví dụ: 120"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                  required
                />
              </div>
              <div className="relative">
                <label className={labelClass}>Ngày khởi chiếu *</label>
                <button
                  type="button"
                  onClick={handleOpenDatePicker}
                  className={`${inputClass} flex items-center justify-between text-left cursor-pointer h-[38px]`}
                >
                  <span className={`truncate whitespace-nowrap ${formData.releaseDate ? 'text-white' : 'text-gray-500'}`}>
                    {formData.releaseDate ? formatDateDisplay(formData.releaseDate) : 'Chọn ngày...'}
                  </span>
                  <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                </button>
                {isDatePickerOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsDatePickerOpen(false)} />
                    <div className="absolute left-0 right-0 z-50 mt-1 bg-[#0F1322] border border-[#1A2238] rounded-xl shadow-2xl p-4 animate-dropdown-fade-in w-72">
                      <div className="flex items-center justify-between mb-3.5">
                        <button type="button" onClick={handlePrevMonth} className="p-1.5 hover:bg-white/[0.04] rounded-lg text-gray-400 transition cursor-pointer">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          {`Tháng ${calendarMonth + 1}, ${calendarYear}`}
                        </span>
                        <button type="button" onClick={handleNextMonth} className="p-1.5 hover:bg-white/[0.04] rounded-lg text-gray-400 transition cursor-pointer">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-500 mb-1.5">
                        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                          <div key={d} className="py-1">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">
                        {getDaysInMonth(calendarYear, calendarMonth).map((dayObj, idx) => {
                          const isSelected = formData.releaseDate === `${dayObj.year}-${String(dayObj.month + 1).padStart(2, '0')}-${String(dayObj.day).padStart(2, '0')}`;
                          const today = new Date();
                          const isToday = today.getDate() === dayObj.day && today.getMonth() === dayObj.month && today.getFullYear() === dayObj.year;
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectDay(dayObj)}
                              className={`py-1.5 text-[11px] rounded-md font-medium transition cursor-pointer ${isSelected ? 'bg-red-600 text-white font-bold' : isToday ? 'border border-red-500/30 text-red-400 font-semibold' : dayObj.isCurrentMonth ? 'text-gray-200 hover:bg-white/[0.06]' : 'text-gray-600 hover:bg-white/[0.03]'}`}
                            >
                              {dayObj.day}
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-[#1A2238]">
                        <button type="button" onClick={() => { setFormData(prev => ({ ...prev, releaseDate: '' })); setIsDatePickerOpen(false); }} className="text-[10px] text-gray-500 hover:text-white font-bold uppercase transition cursor-pointer">Xóa</button>
                        <button type="button" onClick={() => setIsDatePickerOpen(false)} className="text-[10px] text-red-400 hover:text-red-300 font-bold uppercase transition cursor-pointer">Đóng</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <AdminSelectDropdown
                label="Trạng thái phim *"
                labelClassName={labelClass}
                size="sm"
                value={formData.status}
                options={statusOptions}
                onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
              />

              <AdminSelectDropdown
                label="Giới hạn độ tuổi (Age Rating) *"
                labelClassName={labelClass}
                size="sm"
                value={formData.ageRestriction}
                options={ageRestrictionOptions}
                onChange={(val) => setFormData((prev) => ({ ...prev, ageRestriction: val }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <AdminSelectDropdown
                label="Hình thức phát hành *"
                labelClassName={labelClass}
                size="sm"
                value={formData.screeningMode}
                options={screeningModeOptions}
                onChange={(val) => {
                  setFormData((prev) => ({
                    ...prev,
                    screeningMode: val,
                    onlinePrice: (val === 'THEATER_ONLY' || val === 'NONE')
                      ? ''
                      : (prev.onlinePrice || String(defaultOnlinePrice)),
                  }));
                }}
              />

              <div>
                <label className={labelClass}>Giá vé xem Online (VND)</label>
                <input
                  type="number"
                  min="0"
                  disabled={formData.screeningMode === 'THEATER_ONLY' || formData.screeningMode === 'NONE'}
                  className={`${inputClass} h-[38px] disabled:opacity-50 disabled:cursor-not-allowed`}
                  placeholder={formData.screeningMode === 'THEATER_ONLY' || formData.screeningMode === 'NONE' ? 'Không áp dụng' : `Mặc định: ${defaultOnlinePrice.toLocaleString('vi-VN')} VND`}
                  value={formData.onlinePrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || Number(val) >= 0) {
                      setFormData(prev => ({ ...prev, onlinePrice: val }));
                    }
                  }}
                />
              </div>
            </div>
          </Section>

          <Section title="Phân loại & phương tiện" divided>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Thể loại phim *</label>
                <div className="rounded-md bg-white/[0.02] p-3 max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                  {genresList.map(genre => (
                    <label key={genre.uuid} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" className="rounded text-red-600 focus:ring-red-500 cursor-pointer" checked={formData.genreUuids.includes(genre.uuid)} onChange={() => handleGenreCheckboxChange(genre.uuid)} />
                      <span className="text-gray-300">{genre.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Quốc gia sản xuất *</label>
                <div className="rounded-md bg-white/[0.02] p-3 max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                  {countriesList.map(country => (
                    <label key={country.uuid} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox" className="rounded text-red-600 focus:ring-red-500 cursor-pointer" checked={formData.countryUuids.includes(country.uuid)} onChange={() => handleCountryCheckboxChange(country.uuid)} />
                      <span className="text-gray-300">{country.name} ({country.code})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className={labelClass}>Trailer URL (YouTube)</label>
                <input type="url" className={inputClass} placeholder="https://youtube.com/watch?v=..." value={formData.trailerUrl} onChange={(e) => setFormData(prev => ({ ...prev, trailerUrl: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Link phim (Streaming URL)</label>
                <input type="url" className={inputClass} placeholder="https://java-06.s3.ap-southeast-1.amazonaws.com/movie/TenPhim.mp4" value={formData.streamingUrl} onChange={(e) => setFormData(prev => ({ ...prev, streamingUrl: e.target.value }))} />
                <p className="mt-1 text-[10px] text-gray-500">Google Drive: mở file video → Chia sẻ → Sao chép liên kết file (dạng /file/d/ID/view). Không dùng link thư mục /folders/</p>
              </div>
            </div>
          </Section>

          <Section
            title="Dàn diễn viên"
            divided
            action={
              <GhostButton type="button" onClick={handleAddActorToCast}>
                <Plus className="w-3.5 h-3.5" /> Thêm vai
              </GhostButton>
            }
          >
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {formData.actors.length === 0 ? (
                <p className="text-center text-gray-500 italic py-4">Chưa có vai diễn nào được thiết lập.</p>
              ) : (
                formData.actors.map((cast, index) => {
                  const matchingActorObj = actorsList.find(a => a.uuid === cast.actorUuid);
                  return (
                    <div key={index} className="flex items-center gap-2.5 py-2 border-b border-white/[0.04] last:border-0">
                      <div className="w-1/3">
                        <button type="button" onClick={() => handleOpenActorSelector(index)} className="w-full text-left px-2 py-1.5 bg-[#0B0F19] border border-[#1A2238] rounded text-gray-200 hover:bg-white/[0.04] transition truncate cursor-pointer font-bold">
                          {matchingActorObj ? matchingActorObj.fullName : 'Chọn diễn viên...'}
                        </button>
                      </div>
                      <div className="flex-1">
                        <input type="text" placeholder="Tên vai diễn..." className="w-full px-2 py-1.5 bg-[#0B0F19] border border-[#1A2238] rounded text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50" value={cast.characterName} onChange={(e) => handleCastFieldChange(index, 'characterName', e.target.value)} />
                      </div>
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input type="checkbox" className="rounded text-red-600 focus:ring-red-500 cursor-pointer" checked={cast.isMain} onChange={(e) => handleCastFieldChange(index, 'isMain', e.target.checked)} />
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Chính</span>
                      </label>
                      <button type="button" onClick={() => handleRemoveActorFromCast(index)} className="p-1 hover:bg-red-500/10 hover:text-red-400 rounded text-gray-500 transition cursor-pointer" title="Xóa vai diễn">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </Section>

          <div className="flex justify-end gap-2 pt-8 border-t border-white/[0.06]">
            <GhostButton type="button" onClick={handleCancel} disabled={isSaving}>
              Hủy
            </GhostButton>
            <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
              Lưu phim
            </PrimaryButton>
          </div>
        </form>

      {/* ACTOR SELECTOR OVERLAY MODAL */}
      {isActorSelectorOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsActorSelectorOpen(false)} />
          <div className="relative w-full max-w-md bg-[#0F1322] border border-[#1A2238] rounded-xl overflow-hidden shadow-2xl p-5 text-left flex flex-col max-h-[75vh]">
            <div className="flex justify-between items-center mb-4 border-b border-[#1A2238] pb-2.5">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Chọn diễn viên</h3>
              <button type="button" onClick={() => setIsActorSelectorOpen(false)} className="text-gray-500 hover:text-white transition-colors cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Tìm diễn viên..."
                  value={actorSearchTerm}
                  onChange={(e) => setActorSearchTerm(e.target.value)}
                  className="w-full bg-[#0B0F19] border border-[#1A2238] rounded-lg pl-8 pr-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50"
                />
              </div>
              <AdminSelectDropdown
                size="sm"
                value={actorCountryFilter}
                placeholder="Tất cả quốc tịch"
                options={[
                  { value: '', label: 'Tất cả quốc tịch' },
                  ...countriesList.map((c) => ({
                    value: c.uuid,
                    label: `${c.name} (${c.code})`,
                  })),
                ]}
                onChange={setActorCountryFilter}
                menuClassName="max-h-48 overflow-y-auto custom-scrollbar"
              />
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-1.5 pr-1 min-h-[200px]">
              {filteredActorsForSelector.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-8 italic">Không tìm thấy diễn viên nào phù hợp.</p>
              ) : (
                filteredActorsForSelector.map((a) => {
                  const isAlreadySelected = formData.actors.some(
                    (cast, idx) => cast.actorUuid === a.uuid && idx !== activeCastIndex
                  );
                  return (
                    <div
                      key={a.uuid}
                      onClick={() => !isAlreadySelected && handleSelectActorForCast(a.uuid)}
                      className={`flex items-center justify-between p-2 rounded-lg border transition-all ${isAlreadySelected ? 'bg-[#0B0F19] border-[#1A2238] opacity-50 cursor-not-allowed' : 'bg-[#0B0F19] border-[#1A2238] hover:border-red-500/30 hover:bg-white/[0.03] cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-[#1A2238] bg-[#0F1322] shrink-0 flex items-center justify-center">
                          {a.avatarUrl ? (
                            <img src={a.avatarUrl} alt={a.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-bold text-xs">{a.fullName}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{a.countryName || 'Không xác định'}</p>
                        </div>
                      </div>
                      {isAlreadySelected ? (
                        <span className="text-[9px] bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded text-red-400 font-bold uppercase">Đã chọn</span>
                      ) : (
                        <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded text-emerald-400 font-bold uppercase">Chọn</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </AdminPage>
  );
};

export default AdminMovieFormPage;
