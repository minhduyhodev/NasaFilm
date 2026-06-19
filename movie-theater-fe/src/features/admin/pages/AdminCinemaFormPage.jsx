import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cinemaService } from '../../../shared/services/cinemaService';
import { notificationService } from '../../../shared/services/notificationService';
import { AdminPage, PageHeader, Section, PrimaryButton, GhostButton } from '../components';

const inputClass =
  'w-full rounded-md bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition border border-white/[0.06]';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

const AdminCinemaFormPage = () => {
  const navigate = useNavigate();
  const { cinemaUuid } = useParams();
  const isEditing = Boolean(cinemaUuid);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', phoneNumber: '' });

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
        });
      } catch (err) {
        notificationService.error('Khong the tai chi nhanh');
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
      if (isEditing) {
        await cinemaService.updateCinema(cinemaUuid, form);
        notificationService.success('Cap nhat chi nhanh thanh cong');
        navigate(`/admin/cinemas/${cinemaUuid}`);
      } else {
        const created = await cinemaService.createCinema(form);
        notificationService.success('Them chi nhanh thanh cong');
        navigate(`/admin/cinemas/${created?.uuid || ''}`);
      }
    } catch (err) {
      notificationService.error(err.message || 'Luu that bai');
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
              <label className={labelClass}>Ten chi nhanh *</label>
              <input className={inputClass} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>Dia chi *</label>
              <input className={inputClass} value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>So dien thoai *</label>
              <input className={inputClass} value={form.phoneNumber} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} required />
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
