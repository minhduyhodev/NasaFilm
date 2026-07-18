import { useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { adminDiscoverService } from '../../api/adminDiscoverService';
import { movieService } from '../../../../shared/services/movieService';
import { notificationService } from '../../../../shared/services/notificationService';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';
import { resolveMediaUrl, FALLBACK_POSTER } from '../../../../shared/utils/mediaUrlUtils';
import { AdminModal, AdminSelectDropdown, GhostButton, PrimaryButton } from '../../components';
import { adminInputClass, adminLabelClass } from '../../components/adminFormStyles';

const emptySuggestionForm = () => ({
  mood: 'RELAX',
  movieUuid: '',
  sortOrder: 0,
  active: true,
  note: '',
});

const MatchmakerSuggestionsTab = ({ moodOptions = [] }) => {
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [movies, setMovies] = useState([]);
  const [moodFilter, setMoodFilter] = useState('');
  const [modal, setModal] = useState({ open: false, suggestion: null });
  const [form, setForm] = useState(emptySuggestionForm());
  const [movieSearch, setMovieSearch] = useState('');

  const moodChoices = useMemo(() => {
    const fromConfig = (moodOptions || [])
      .filter((item) => item.active !== false)
      .map((item) => ({ key: item.key, label: item.label || item.key }));
    if (fromConfig.length) return fromConfig;
    return [
      { key: 'RELAX', label: 'Thư giãn' },
      { key: 'EXCITING', label: 'Phấn khích' },
      { key: 'EMOTIONAL', label: 'Cảm xúc' },
      { key: 'THRILLING', label: 'Hồi hộp' },
    ];
  }, [moodOptions]);

  const moodFilterOptions = useMemo(
    () => [
      { value: '', label: 'Tất cả' },
      ...moodChoices.map((mood) => ({ value: mood.key, label: mood.label })),
    ],
    [moodChoices],
  );

  const moodFormOptions = useMemo(
    () => moodChoices.map((mood) => ({ value: mood.key, label: mood.label })),
    [moodChoices],
  );

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const data = await adminDiscoverService.getSuggestions(
        moodFilter ? { mood: moodFilter } : {},
      );
      setSuggestions(Array.isArray(data) ? data : []);
    } catch (err) {
      notificationService.error(err?.message || 'Không thể tải gợi ý phim');
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMovies = async () => {
    try {
      const data = await movieService.getMovies({ size: 500 });
      const content = data?.content || data?.data?.content || data || [];
      setMovies(Array.isArray(content) ? content : []);
    } catch {
      setMovies([]);
    }
  };

  useEffect(() => {
    loadMovies();
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [moodFilter]);

  const filteredMovies = useMemo(() => {
    const q = movieSearch.trim().toLowerCase();
    if (!q) return movies.slice(0, 40);
    return movies
      .filter((movie) => (movie.title || '').toLowerCase().includes(q))
      .slice(0, 40);
  }, [movies, movieSearch]);

  const openCreate = () => {
    setForm({
      ...emptySuggestionForm(),
      mood: moodChoices[0]?.key || 'RELAX',
    });
    setMovieSearch('');
    setModal({ open: true, suggestion: null });
  };

  const openEdit = (suggestion) => {
    setForm({
      mood: suggestion.mood || 'RELAX',
      movieUuid: suggestion.movieUuid || '',
      sortOrder: suggestion.sortOrder ?? 0,
      active: suggestion.active !== false,
      note: suggestion.note || '',
    });
    setMovieSearch(suggestion.movieTitle || '');
    setModal({ open: true, suggestion });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.movieUuid) {
      notificationService.error('Vui lòng chọn phim');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        mood: form.mood,
        movieUuid: form.movieUuid,
        sortOrder: Number(form.sortOrder) || 0,
        active: Boolean(form.active),
        note: form.note.trim() || null,
      };
      if (modal.suggestion?.uuid) {
        await adminDiscoverService.updateSuggestion(modal.suggestion.uuid, payload);
        notificationService.success('Đã cập nhật gợi ý');
      } else {
        await adminDiscoverService.createSuggestion(payload);
        notificationService.success('Đã tạo gợi ý');
      }
      setModal({ open: false, suggestion: null });
      await loadSuggestions();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể lưu gợi ý');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (suggestion) => {
    const ok = await confirm({
      title: 'Xóa gợi ý phim',
      message: 'Gợi ý curated sẽ không còn ưu tiên trong kết quả Matchmaker.',
      highlight: suggestion.movieTitle || suggestion.movieUuid,
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await adminDiscoverService.deleteSuggestion(suggestion.uuid);
      notificationService.success('Đã xóa gợi ý');
      await loadSuggestions();
    } catch (err) {
      notificationService.error(err?.message || 'Không thể xóa gợi ý');
    }
  };

  const moodLabel = (key) => moodChoices.find((item) => item.key === key)?.label || key;

  return (
    <>
      <section className="mma-manage__panel">
        <div className="mma-manage__panel-head mma-manage__panel-head--row">
          <div>
            <h2 className="mma-manage__title">Gợi ý phim theo mood</h2>
            <p className="mma-manage__sub">
              Ghim phim thủ công theo mood — ưu tiên lên đầu kết quả quiz Matchmaker.
            </p>
          </div>
          <PrimaryButton type="button" onClick={openCreate}>
            <Plus className="w-3.5 h-3.5" />
            Thêm gợi ý
          </PrimaryButton>
        </div>

        <div className="mma-manage__toolbar">
          <AdminSelectDropdown
            label="Lọc theo mood"
            value={moodFilter}
            options={moodFilterOptions}
            onChange={setMoodFilter}
            placeholder="Tất cả"
            size="sm"
            className="mma-manage__mood-select"
          />
        </div>

        {loading ? (
          <div className="matchmaker-analytics__loading">
            <Loader2 className="w-6 h-6 animate-spin text-red-400" />
            <span>Đang tải gợi ý...</span>
          </div>
        ) : (
          <div className="mma-manage__table-wrap">
            <table className="mma-manage__table">
              <thead>
                <tr>
                  <th>Phim</th>
                  <th>Mood</th>
                  <th>Thứ tự</th>
                  <th>Ghi chú</th>
                  <th>Trạng thái</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {suggestions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="mma-manage__empty">Chưa có gợi ý thủ công.</td>
                  </tr>
                ) : (
                  suggestions.map((item) => (
                    <tr key={item.uuid}>
                      <td>
                        <div className="mma-manage__movie-cell">
                          <img
                            src={item.moviePosterUrl ? resolveMediaUrl(item.moviePosterUrl, 64) : FALLBACK_POSTER}
                            alt=""
                            className="mma-manage__poster"
                          />
                          <span>{item.movieTitle || item.movieUuid}</span>
                        </div>
                      </td>
                      <td>{moodLabel(item.mood)}</td>
                      <td>{item.sortOrder}</td>
                      <td className="mma-manage__muted">{item.note || '—'}</td>
                      <td>
                        <span className={`mma-manage__badge ${item.active ? 'is-active' : 'is-off'}`}>
                          {item.active ? 'Bật' : 'Tắt'}
                        </span>
                      </td>
                      <td className="mma-manage__row-actions">
                        <button type="button" className="mma-manage__icon-btn" onClick={() => openEdit(item)} title="Sửa">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" className="mma-manage__icon-btn is-danger" onClick={() => handleDelete(item)} title="Xóa">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <AdminModal
        open={modal.open}
        onClose={() => setModal({ open: false, suggestion: null })}
        title={modal.suggestion ? 'Sửa gợi ý phim' : 'Thêm gợi ý phim'}
        subtitle="Chọn mood và phim để ưu tiên trong kết quả matchmaker."
        size="lg"
        footer={(
          <>
            <GhostButton type="button" onClick={() => setModal({ open: false, suggestion: null })}>
              Hủy
            </GhostButton>
            <PrimaryButton type="submit" form="mma-suggestion-form" loading={saving}>
              Lưu
            </PrimaryButton>
          </>
        )}
      >
        <form id="mma-suggestion-form" className="mma-manage__form" onSubmit={handleSave}>
          <AdminSelectDropdown
            label="Mood"
            value={form.mood}
            options={moodFormOptions}
            onChange={(value) => setForm((prev) => ({ ...prev, mood: value }))}
            placeholder="Chọn mood"
          />

          <div className={adminLabelClass}>
            Chọn phim
            <div className="mma-manage__movie-search">
              <Search className="w-4 h-4" />
              <input
                className={adminInputClass}
                placeholder="Tìm theo tên phim..."
                value={movieSearch}
                onChange={(e) => setMovieSearch(e.target.value)}
              />
            </div>
            <div className="mma-manage__movie-list">
              {filteredMovies.map((movie) => {
                const selected = form.movieUuid === movie.uuid;
                return (
                  <button
                    key={movie.uuid}
                    type="button"
                    className={`mma-manage__movie-option ${selected ? 'is-selected' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, movieUuid: movie.uuid }))}
                  >
                    <img
                      src={movie.primaryMediaUrl ? resolveMediaUrl(movie.primaryMediaUrl, 48) : FALLBACK_POSTER}
                      alt=""
                    />
                    <span>{movie.title}</span>
                  </button>
                );
              })}
              {filteredMovies.length === 0 && (
                <p className="mma-manage__empty">Không tìm thấy phim.</p>
              )}
            </div>
          </div>

          <label className={adminLabelClass}>
            Thứ tự ưu tiên
            <input
              className={adminInputClass}
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
            />
          </label>
          <label className={adminLabelClass}>
            Ghi chú (hiện trong lý do gợi ý)
            <input
              className={adminInputClass}
              value={form.note}
              onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
            />
          </label>
          <label className="mma-manage__check">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
            />
            Đang bật
          </label>
        </form>
      </AdminModal>
    </>
  );
};

export default MatchmakerSuggestionsTab;
