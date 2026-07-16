import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';
import { AdminPage, PageHeader, Section, PrimaryButton, GhostButton } from '../components';
import { adminInputClass, adminLabelClass, adminTextareaClass } from '../components/adminFormStyles';

const AdminCinemaFormPage = () => {
  const navigate = useNavigate();
  const { cinemaUuid } = useParams();
  const isEditing = Boolean(cinemaUuid);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    phoneNumber: '',
    entranceNote: '',
    latitude: '',
    longitude: '',
  });

  useEffect(() => {
    if (!isEditing) return;
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const detail = await cinemaService.getCinemaDetail(cinemaUuid);
        if (!isMounted) return;
        setForm({
          name: detail.name || '',
          address: detail.address || '',
          phoneNumber: detail.phoneNumber || '',
          entranceNote: detail.entranceNote || '',
          latitude: detail.latitude ?? '',
          longitude: detail.longitude ?? '',
        });
      } catch (err) {
        notificationService.error('Không thể tải chi nhánh');
        navigate('/admin/cinemas');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [cinemaUuid, isEditing, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        phoneNumber: form.phoneNumber.trim(),
        entranceNote: form.entranceNote.trim() || null,
        latitude: form.latitude === '' ? null : Number(form.latitude),
        longitude: form.longitude === '' ? null : Number(form.longitude),
      };
      if (isEditing) {
        await cinemaService.updateCinema(cinemaUuid, payload);
        notificationService.success('Cập nhật chi nhánh thành công');
        navigate(`/admin/cinemas/${cinemaUuid}`);
      } else {
        const created = await cinemaService.createCinema(payload);
        notificationService.success('Them chi nhanh thanh cong');
        navigate(`/admin/cinemas/${created?.uuid || ''}`);
      }
    } catch (err) {
      notificationService.error(err.message || 'Lưu thất bại');
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
        title={isEditing ? 'Chinh sua chi nhanh' : 'Them chi nhanh moi'}
        backTo={isEditing ? `/admin/cinemas/${cinemaUuid}` : '/admin/cinemas'}
      />
      <form onSubmit={handleSubmit}>
        <Section title="Thong tin chi nhanh">
          <div className="grid grid-cols-1 gap-4 max-w-xl">
            <div>
              <label className={adminLabelClass}>Ten chi nhanh *</label>
              <input className={adminInputClass} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className={adminLabelClass}>Dia chi *</label>
              <input className={adminInputClass} value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required />
            </div>
            <div>
              <label className={adminLabelClass}>So dien thoai *</label>
              <input className={adminInputClass} value={form.phoneNumber} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} required />
            </div>
            <div>
              <label className={adminLabelClass}>Huong dan vao cong</label>
              <textarea
                className={`${adminTextareaClass} min-h-[88px] resize-y`}
                value={form.entranceNote}
                onChange={(e) => setForm((p) => ({ ...p, entranceNote: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={adminLabelClass}>Vi do</label>
                <input className={adminInputClass} type="number" step="any" value={form.latitude} onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} />
              </div>
              <div>
                <label className={adminLabelClass}>Kinh do</label>
                <input className={adminInputClass} type="number" step="any" value={form.longitude} onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} />
              </div>
            </div>
          </div>
        </Section>
        <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
          <GhostButton type="button" onClick={() => navigate(isEditing ? `/admin/cinemas/${cinemaUuid}` : '/admin/cinemas')}>Huy</GhostButton>
          <PrimaryButton type="submit" loading={isSaving} disabled={isSaving}>{isEditing ? 'Cap nhat' : 'Them chi nhanh'}</PrimaryButton>
        </div>
      </form>
    </AdminPage>
  );
};

export default AdminCinemaFormPage;
