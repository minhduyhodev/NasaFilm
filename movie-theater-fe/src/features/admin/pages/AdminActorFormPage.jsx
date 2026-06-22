import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, User } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import { AdminPage, PageHeader, Section, PrimaryButton, GhostButton } from '../components';

const inputClass =
  'w-full rounded-md bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition border border-white/[0.06]';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

const AdminActorFormPage = () => {
  const navigate = useNavigate();
  const { actorUuid } = useParams();
  const isEditing = Boolean(actorUuid);

  const [countriesList, setCountriesList] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    avatarUrl: '',
    countryUuid: '',
  });

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const countries = await movieService.getCountries();
        if (!isMounted) return;
        setCountriesList(countries || []);
        if (isEditing) {
          const actors = await movieService.getActors();
          const actor = (actors || []).find((a) => a.uuid === actorUuid);
          if (!actor) {
            notificationService.error('Khong tim thay dien vien');
            navigate('/admin/actors');
            return;
          }
          setFormData({
            fullName: actor.fullName || '',
            avatarUrl: actor.avatarUrl || '',
            countryUuid: actor.countryUuid || countries?.[0]?.uuid || '',
          });
        } else {
          setFormData((prev) => ({
            ...prev,
            countryUuid: countries?.[0]?.uuid || '',
          }));
        }
      } catch (err) {
        console.error(err);
        notificationService.error('Khong the tai du lieu');
        navigate('/admin/actors');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [actorUuid, isEditing, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      notificationService.error('Ten dien vien khong duoc de trong');
      return;
    }
    const payload = {
      fullName: formData.fullName.trim(),
      avatarUrl: formData.avatarUrl.trim() || null,
      countryUuid: formData.countryUuid || null,
    };
    setIsSaving(true);
    try {
      if (isEditing) {
        await movieService.updateActor(actorUuid, payload);
        notificationService.success(`Cap nhat thanh cong "${payload.fullName}"`);
        navigate(`/admin/actors/${actorUuid}`);
      } else {
        const created = await movieService.createActor(payload);
        notificationService.success(`Them moi thanh cong "${payload.fullName}"`);
        if (created?.uuid) navigate(`/admin/actors/${created.uuid}`);
        else navigate('/admin/actors');
      }
    } catch (err) {
      notificationService.error(err.message || 'Luu thong tin that bai');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[320px] text-gray-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
        Dang tai...
      </div>
    );
  }

  return (
    <AdminPage>
      <PageHeader
        title={isEditing ? 'Chinh sua dien vien' : 'Them dien vien moi'}
        backTo={isEditing ? `/admin/actors/${actorUuid}` : '/admin/actors'}
      />

      <form onSubmit={handleSubmit}>
        <Section title="Thong tin dien vien">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
            <div className="md:col-span-2">
              <label className={labelClass}>Ho va ten *</label>
              <input
                type="text"
                className={inputClass}
                placeholder="Nhap ten dien vien..."
                value={formData.fullName}
                onChange={(e) => setFormData((p) => ({ ...p, fullName: e.target.value }))}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>URL anh chan dung</label>
              <input
                type="url"
                className={inputClass}
                placeholder="https://..."
                value={formData.avatarUrl}
                onChange={(e) => setFormData((p) => ({ ...p, avatarUrl: e.target.value }))}
              />
              {formData.avatarUrl?.trim().startsWith('http') && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="w-16 h-16 rounded-full overflow-hidden border border-white/[0.08] bg-white/[0.03]">
                    <img src={formData.avatarUrl.trim()} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  </div>
                  <span className="text-xs text-gray-500">Xem truoc</span>
                </div>
              )}
            </div>
            <div>
              <label className={labelClass}>Quoc tich *</label>
              <select
                className={`${inputClass} app-select`}
                value={formData.countryUuid}
                onChange={(e) => setFormData((p) => ({ ...p, countryUuid: e.target.value }))}
                required
              >
                {countriesList.map((c) => (
                  <option key={c.uuid} value={c.uuid}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
          <GhostButton type="button" onClick={() => navigate(isEditing ? `/admin/actors/${actorUuid}` : '/admin/actors')}>
            Huy
          </GhostButton>
          <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>
            {isEditing ? 'Cap nhat' : 'Them dien vien'}
          </PrimaryButton>
        </div>
      </form>
    </AdminPage>
  );
};

export default AdminActorFormPage;
