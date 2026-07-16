import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, Plus, User, Play, Calendar, FileText, Archive, Pause,
  Search, Loader2, Film
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getDefaultOnlineStreamingPrice } from '../../../shared/utils/systemConfig';
import {
  AdminPage,
  PageHeader,
  Section,
  PrimaryButton,
  GhostButton,
  AdminSelectDropdown,
  AdminDatePicker,
} from '../components';
import { adminInputClass, adminLabelClass, adminTextareaClass } from '../components/adminFormStyles';
import PosterImage from '../../../shared/components/PosterImage';
import { unwrapMediaUrl, isAwsMovieStreamingUrl } from '../../../shared/utils/mediaUrlUtils';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import './AdminMovieFormPage.css';

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
  const labelClass = adminLabelClass;
  const textareaClass = adminTextareaClass;

  if (isLoading) {
    return (
      <AdminPage className="amf-page">
        <div className="adm-loading">
          <Loader2 className="w-5 h-5 animate-spin text-red-500" />
          <p>Đang tải thông tin phim...</p>
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage className="amf-page">
      <PageHeader
        eyebrow="Quản lý nội dung"
        title={isEditing ? 'Chỉnh sửa phim' : 'Thêm phim mới'}
        description={isEditing && editingMovie ? editingMovie.title : 'Nhập thông tin phim và lưu vào hệ thống.'}
        backTo={isEditing ? `/admin/movies/${movieUuid}` : '/admin/movies'}
      />

      <form onSubmit={handleSubmit} className="amf-form">
          <Section title="Poster & thông tin phim">
            <div className="grid grid-cols-1 md:grid-cols-[148px_1fr] gap-6">
              <div className="shrink-0">
                <div className="amf-poster">
                  {formData.posterUrl?.trim() && !posterLoadError ? (
                    <PosterImage
                      src={formData.posterUrl.trim()}
                      alt={formData.title || 'Poster phim'}
                      width={300}
                      className="w-full h-full object-cover"
                      onError={() => setPosterLoadError(true)}
                    />
                  ) : (
                    <div className="amf-poster__empty">
                      <Film className="w-8 h-8" />
                      <span>
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
                  <p className="amf-hint">Ảnh xem trước cập nhật khi bạn nhập URL.</p>
                </div>
                <div>
                  <label className={labelClass}>Mô tả phim</label>
                  <textarea
                    className={textareaClass}
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
                  className={inputClass}
                  placeholder="Ví dụ: 120"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, durationMinutes: e.target.value }))}
                  required
                />
              </div>
              <AdminDatePicker
                label="Ngày khởi chiếu *"
                value={formData.releaseDate}
                onChange={(v) => setFormData((prev) => ({ ...prev, releaseDate: v }))}
                placeholder="Chọn ngày khởi chiếu"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AdminSelectDropdown
                label="Trạng thái phim *"
                labelClassName={labelClass}
                value={formData.status}
                options={statusOptions}
                onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
              />

              <AdminSelectDropdown
                label="Giới hạn độ tuổi (Age Rating) *"
                labelClassName={labelClass}
                value={formData.ageRestriction}
                options={ageRestrictionOptions}
                onChange={(val) => setFormData((prev) => ({ ...prev, ageRestriction: val }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AdminSelectDropdown
                label="Hình thức phát hành *"
                labelClassName={labelClass}
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
                  className={inputClass}
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
                <div className="amf-checklist custom-scrollbar">
                  {genresList.map(genre => (
                    <label key={genre.uuid} className="amf-check">
                      <input type="checkbox" checked={formData.genreUuids.includes(genre.uuid)} onChange={() => handleGenreCheckboxChange(genre.uuid)} />
                      <span>{genre.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelClass}>Quốc gia sản xuất *</label>
                <div className="amf-checklist custom-scrollbar">
                  {countriesList.map(country => (
                    <label key={country.uuid} className="amf-check">
                      <input type="checkbox" checked={formData.countryUuids.includes(country.uuid)} onChange={() => handleCountryCheckboxChange(country.uuid)} />
                      <span>{country.name} ({country.code})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Trailer URL (YouTube)</label>
                <input type="url" className={inputClass} placeholder="https://youtube.com/watch?v=..." value={formData.trailerUrl} onChange={(e) => setFormData(prev => ({ ...prev, trailerUrl: e.target.value }))} />
              </div>
              <div>
                <label className={labelClass}>Link phim (Streaming URL)</label>
                <input type="url" className={inputClass} placeholder="https://java-06.s3.ap-southeast-1.amazonaws.com/movie/TenPhim.mp4" value={formData.streamingUrl} onChange={(e) => setFormData(prev => ({ ...prev, streamingUrl: e.target.value }))} />
                <p className="amf-hint">Object URL AWS S3 thư mục movie/ — không dùng YouTube/Drive folder.</p>
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
            <div className="amf-cast-list custom-scrollbar">
              {formData.actors.length === 0 ? (
                <p className="amf-cast-empty">Chưa có vai diễn nào được thiết lập.</p>
              ) : (
                formData.actors.map((cast, index) => {
                  const matchingActorObj = actorsList.find(a => a.uuid === cast.actorUuid);
                  return (
                    <div key={index} className="amf-cast-row">
                      <button
                        type="button"
                        onClick={() => handleOpenActorSelector(index)}
                        className={`amf-cast-pick${matchingActorObj ? '' : ' amf-cast-pick--empty'}`}
                      >
                        {matchingActorObj ? matchingActorObj.fullName : 'Chọn diễn viên...'}
                      </button>
                      <input
                        type="text"
                        placeholder="Tên vai diễn..."
                        className={inputClass}
                        value={cast.characterName}
                        onChange={(e) => handleCastFieldChange(index, 'characterName', e.target.value)}
                      />
                      <label className="amf-cast-main">
                        <input type="checkbox" checked={cast.isMain} onChange={(e) => handleCastFieldChange(index, 'isMain', e.target.checked)} />
                        Chính
                      </label>
                      <button type="button" onClick={() => handleRemoveActorFromCast(index)} className="amf-cast-del" title="Xóa vai diễn">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </Section>

          <div className="amf-actions">
            <GhostButton type="button" onClick={handleCancel} disabled={isSaving}>
              Hủy
            </GhostButton>
            <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
              Lưu phim
            </PrimaryButton>
          </div>
        </form>

      {isActorSelectorOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsActorSelectorOpen(false)} />
          <div className="amf-modal">
            <div className="amf-modal__head">
              <h3 className="amf-modal__title">Chọn diễn viên</h3>
              <button type="button" onClick={() => setIsActorSelectorOpen(false)} className="amf-modal__close" aria-label="Đóng">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="amf-modal__search">
                <Search className="amf-modal__search-icon" />
                <input
                  type="text"
                  placeholder="Tìm diễn viên..."
                  value={actorSearchTerm}
                  onChange={(e) => setActorSearchTerm(e.target.value)}
                  className={inputClass}
                />
              </div>
              <AdminSelectDropdown
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
            <div className="amf-actor-list custom-scrollbar">
              {filteredActorsForSelector.length === 0 ? (
                <p className="amf-cast-empty">Không tìm thấy diễn viên nào phù hợp.</p>
              ) : (
                filteredActorsForSelector.map((a) => {
                  const isAlreadySelected = formData.actors.some(
                    (cast, idx) => cast.actorUuid === a.uuid && idx !== activeCastIndex
                  );
                  return (
                    <button
                      key={a.uuid}
                      type="button"
                      disabled={isAlreadySelected}
                      onClick={() => handleSelectActorForCast(a.uuid)}
                      className="amf-actor-item"
                    >
                      <div className="amf-actor-item__main">
                        <div className="amf-actor-item__avatar">
                          {a.avatarUrl ? (
                            <img src={a.avatarUrl} alt={a.fullName} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="amf-actor-item__name">{a.fullName}</p>
                          <p className="amf-actor-item__meta">{a.countryName || 'Không xác định'}</p>
                        </div>
                      </div>
                      <span className={`amf-actor-item__tag ${isAlreadySelected ? 'amf-actor-item__tag--picked' : 'amf-actor-item__tag--ok'}`}>
                        {isAlreadySelected ? 'Đã chọn' : 'Chọn'}
                      </span>
                    </button>
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
