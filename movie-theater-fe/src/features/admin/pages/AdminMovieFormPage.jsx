import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  X, Plus, User, Play, Calendar, FileText, Archive, Pause,
  Search, Loader2, Upload,
} from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import { logger } from '../../../shared/utils/logger';
import { systemConfigService } from '../../../shared/services/systemConfigService';
import { getDefaultOnlineStreamingPrice } from '../../../shared/utils/systemConfig';
import {
  AdminPage,
  PageHeader,
  PrimaryButton,
  GhostButton,
  AdminSelectDropdown,
  AdminDatePicker,
} from '../components';
import { adminInputClass } from '../components/adminFormStyles';
import PosterImage from '../../../shared/components/PosterImage';
import { unwrapMediaUrl, isAwsMovieStreamingUrl } from '../../../shared/utils/mediaUrlUtils';
import { uploadMediaToS3 } from '../../../shared/utils/s3Upload';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';
import './AdminMovieFormPage.css';

/** Tag multi-select — cùng onToggle(uuid) như checklist cũ (chỉ UI). */
const AmfTagPicker = ({
  label,
  required,
  items,
  selectedUuids,
  onToggle,
  getLabel,
  searchPlaceholder = 'Tìm...',
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = items.filter((item) => selectedUuids.includes(item.uuid));
  const filtered = items.filter((item) =>
    getLabel(item).toLowerCase().includes(query.trim().toLowerCase())
  );

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div className="amf-field" ref={rootRef}>
      <label className="amf-label">
        {label}
        {required ? <span className="amf-req"> *</span> : null}
      </label>
      <div className={`amf-tag-field${open ? ' is-open' : ''}`}>
        <div className="amf-tag-field__body" onClick={() => setOpen(true)}>
          {selected.map((item) => (
            <button
              key={item.uuid}
              type="button"
              className="amf-tag"
              onClick={(e) => {
                e.stopPropagation();
                onToggle(item.uuid);
              }}
            >
              <span>{getLabel(item)}</span>
              <X className="amf-tag__x" />
            </button>
          ))}
          <input
            type="text"
            className="amf-tag-field__search"
            placeholder={selected.length ? '' : searchPlaceholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
        </div>
        <Search className="amf-tag-field__icon" aria-hidden="true" />
        {open && (
          <div className="amf-tag-field__menu custom-scrollbar" role="listbox">
            {filtered.length === 0 ? (
              <p className="amf-tag-field__empty">Không có kết quả</p>
            ) : (
              filtered.map((item) => {
                const active = selectedUuids.includes(item.uuid);
                return (
                  <button
                    key={item.uuid}
                    type="button"
                    className={`amf-tag-field__option${active ? ' is-active' : ''}`}
                    onClick={() => onToggle(item.uuid)}
                  >
                    {getLabel(item)}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [uploadProgress, setUploadProgress] = useState({
    poster: null,
    trailer: null,
    movie: null,
  });

  useEffect(() => {
    setPosterLoadError(false);
  }, [formData.posterUrl]);

  const handleS3FileUpload = async (folder, file, fieldName) => {
    if (!file) return;
    if (!formData.title?.trim()) {
      notificationService.error('Nhập Tên phim trước khi upload — file S3 sẽ đặt theo tên phim (vd: movie/avatar2009.mp4)');
      return;
    }
    setUploadProgress((prev) => ({ ...prev, [folder]: 1 }));
    try {
      const key = await uploadMediaToS3(folder, file, {
        movieTitle: formData.title.trim(),
        onProgress: (percent) => {
          setUploadProgress((prev) => ({ ...prev, [folder]: percent }));
        },
      });
      setFormData((prev) => ({ ...prev, [fieldName]: key }));
      notificationService.success(`Đã upload ${folder} lên S3: ${key}`);
    } catch (err) {
      logger.error('S3 upload failed:', err);
      notificationService.error(err.message || `Upload ${folder} thất bại`);
    } finally {
      setUploadProgress((prev) => ({ ...prev, [folder]: null }));
    }
  };
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
        logger.error('Failed to load metadata in admin movie form:', err);
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
        logger.error('Failed to load movie for edit:', err);
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
        'Link phim chỉ chấp nhận S3 key thư mục movie/ (vd: movie/avatar2009.mp4) hoặc Object URL bucket java-06'
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
      logger.error('Failed to save movie:', err);
      notificationService.error(err.message || 'Lưu phim thất bại');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = adminInputClass;

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
        <div className="amf-grid">
          {/* LEFT — Thông tin chung */}
          <div className="amf-card">
            <h3 className="amf-card__title">Thông tin chung</h3>

            <div className="amf-info">
              <label className="amf-poster-upload">
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
                      <Upload className="amf-poster__icon" />
                      <span>
                        {uploadProgress.poster != null
                          ? `${uploadProgress.poster}%`
                          : formData.posterUrl?.trim()
                            ? 'Không tải được ảnh'
                            : 'Chưa có poster'}
                      </span>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  disabled={uploadProgress.poster != null}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    handleS3FileUpload('poster', file, 'posterUrl');
                  }}
                />
              </label>

              <div className="amf-info__fields">
                <div className="amf-field">
                  <label className="amf-label">
                    Tên phim<span className="amf-req"> *</span>
                  </label>
                  <input
                    type="text"
                    className="amf-input amf-input--line"
                    placeholder="Nhập tên phim..."
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="amf-field">
                  <label className="amf-label">
                    Poster URL<span className="amf-req"> *</span>
                  </label>
                  <input
                    type="text"
                    className="amf-input amf-input--line"
                    placeholder="poster/Avatar2009.jpg"
                    value={formData.posterUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, posterUrl: e.target.value }))}
                    required
                  />
                </div>

                <div className="amf-field">
                  <label className="amf-label">Mô tả phim</label>
                  <textarea
                    className="amf-input amf-input--line amf-textarea"
                    placeholder="Nhập mô tả chi tiết..."
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE — Media + Cast */}
          <div className="amf-col-stack">
            <div className="amf-card">
              <h3 className="amf-card__title">Phương tiện &amp; media</h3>

              <div className="amf-field">
                <label className="amf-label">Trailer URL</label>
                <div className="amf-media-row">
                  <input
                    type="text"
                    className="amf-input amf-input--box"
                    placeholder="trailer/trailerAvatar2009.mp4"
                    value={formData.trailerUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, trailerUrl: e.target.value }))}
                  />
                  <label className="amf-media-upload" title="Upload trailer">
                    <Upload className="w-4 h-4" />
                    {uploadProgress.trailer != null ? (
                      <span className="amf-media-upload__pct">{uploadProgress.trailer}%</span>
                    ) : null}
                    <input
                      type="file"
                      accept="video/*,.mkv,.mp4,.webm"
                      className="sr-only"
                      disabled={uploadProgress.trailer != null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        handleS3FileUpload('trailer', file, 'trailerUrl');
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="amf-field">
                <label className="amf-label">Streaming URL</label>
                <div className="amf-media-row">
                  <input
                    type="text"
                    className="amf-input amf-input--box"
                    placeholder="movie/avatar2009.mp4"
                    value={formData.streamingUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, streamingUrl: e.target.value }))}
                  />
                  <label className="amf-media-upload" title="Upload phim">
                    <Upload className="w-4 h-4" />
                    {uploadProgress.movie != null ? (
                      <span className="amf-media-upload__pct">{uploadProgress.movie}%</span>
                    ) : null}
                    <input
                      type="file"
                      accept="video/*,.mkv,.mp4,.webm"
                      className="sr-only"
                      disabled={uploadProgress.movie != null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        handleS3FileUpload('movie', file, 'streamingUrl');
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="amf-card">
              <h3 className="amf-card__title">Dàn diễn viên</h3>
              <div className="amf-cast-box">
                {!isEditing && (
                  <button type="button" className="amf-cast-add" onClick={handleAddActorToCast}>
                    <Plus className="w-3.5 h-3.5" /> Thêm vai
                  </button>
                )}

                {formData.actors.length === 0 ? (
                  <button
                    type="button"
                    className="amf-cast-placeholders"
                    onClick={handleAddActorToCast}
                    aria-label="Thêm diễn viên vào dàn cast"
                  >
                    <span className="amf-cast-placeholder" />
                    <span className="amf-cast-placeholder" />
                    <span className="amf-cast-placeholder" />
                  </button>
                ) : (
                  <div className="amf-cast-list custom-scrollbar">
                    {formData.actors.map((cast, index) => {
                      const matchingActorObj = actorsList.find((a) => a.uuid === cast.actorUuid);
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
                            className="amf-input amf-input--box"
                            value={cast.characterName}
                            onChange={(e) => handleCastFieldChange(index, 'characterName', e.target.value)}
                          />
                          <label className="amf-cast-main">
                            <input
                              type="checkbox"
                              checked={cast.isMain}
                              onChange={(e) => handleCastFieldChange(index, 'isMain', e.target.checked)}
                            />
                            Chính
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveActorFromCast(index)}
                            className="amf-cast-del"
                            title="Xóa vai diễn"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                    {isEditing && (
                      <button
                        type="button"
                        className="amf-cast-add amf-cast-add--inline"
                        onClick={handleAddActorToCast}
                        aria-label="Thêm vai diễn"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT — Phân loại & phát hành */}
          <div className="amf-card">
            <h3 className="amf-card__title">Phân loại &amp; phát hành</h3>

            <AmfTagPicker
              label="Thể loại"
              required
              items={genresList}
              selectedUuids={formData.genreUuids}
              onToggle={handleGenreCheckboxChange}
              getLabel={(g) => g.name}
              searchPlaceholder="Tìm thể loại..."
            />

            <AmfTagPicker
              label="Quốc gia"
              required
              items={countriesList}
              selectedUuids={formData.countryUuids}
              onToggle={handleCountryCheckboxChange}
              getLabel={(c) => `${c.name} (${c.code})`}
              searchPlaceholder="Tìm quốc gia..."
            />

            <div className="amf-fields-2">
              <div className="amf-field">
                <label className="amf-label">
                  Thời lượng (phút)<span className="amf-req"> *</span>
                </label>
                <input
                  type="number"
                  className="amf-input amf-input--line"
                  placeholder="120"
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                  required
                />
              </div>

              <AdminDatePicker
                label="Ngày khởi chiếu *"
                value={formData.releaseDate}
                onChange={(v) => setFormData((prev) => ({ ...prev, releaseDate: v }))}
                placeholder="Chọn ngày khởi chiếu"
              />

              <AdminSelectDropdown
                label="Trạng thái *"
                labelClassName="amf-label"
                value={formData.status}
                options={statusOptions}
                onChange={(val) => setFormData((prev) => ({ ...prev, status: val }))}
              />

              <AdminSelectDropdown
                label="Giới hạn độ tuổi *"
                labelClassName="amf-label"
                value={formData.ageRestriction}
                options={ageRestrictionOptions}
                onChange={(val) => setFormData((prev) => ({ ...prev, ageRestriction: val }))}
              />

              <AdminSelectDropdown
                label="Hình thức phát hành *"
                labelClassName="amf-label"
                value={formData.screeningMode}
                options={screeningModeOptions}
                onChange={(val) => {
                  setFormData((prev) => ({
                    ...prev,
                    screeningMode: val,
                    onlinePrice:
                      val === 'THEATER_ONLY' || val === 'NONE'
                        ? ''
                        : prev.onlinePrice || String(defaultOnlinePrice),
                  }));
                }}
              />

              <div className="amf-field">
                <label className="amf-label">Giá vé (VNĐ)</label>
                <input
                  type="number"
                  min="0"
                  disabled={
                    formData.screeningMode === 'THEATER_ONLY' || formData.screeningMode === 'NONE'
                  }
                  className="amf-input amf-input--line"
                  placeholder={
                    formData.screeningMode === 'THEATER_ONLY' || formData.screeningMode === 'NONE'
                      ? 'Không áp dụng'
                      : `Mặc định: ${defaultOnlinePrice.toLocaleString('vi-VN')} VND`
                  }
                  value={formData.onlinePrice}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || Number(val) >= 0) {
                      setFormData((prev) => ({ ...prev, onlinePrice: val }));
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="amf-actions">
          <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
            Lưu phim
          </PrimaryButton>
          <GhostButton
            type="button"
            className="amf-btn-cancel"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Hủy
          </GhostButton>
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
