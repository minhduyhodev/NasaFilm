import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Upload, Image as ImageIcon } from 'lucide-react';
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
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [form, setForm] = useState({
    name: '',
    address: '',
    phoneNumber: '',
    entranceNote: '',
    imageUrl: '',
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
          imageUrl: detail.imageUrl || '',
          latitude: detail.latitude ?? '',
          longitude: detail.longitude ?? '',
        });
        setPreviewUrl(detail.imageUrl || '');
      } catch {
        notificationService.error('Không thể tải chi nhánh');
        navigate('/admin/cinemas');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [cinemaUuid, isEditing, navigate]);

  const handleFileSelection = (file) => {
    if (!file.type.startsWith('image/')) {
      notificationService.error('Vui lòng chọn tệp hình ảnh');
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let finalImageUrl = form.imageUrl || '';
      if (selectedFile) {
        setIsUploading(true);
        finalImageUrl = await cinemaService.uploadCinemaImage(selectedFile);
        setIsUploading(false);
      }
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        phoneNumber: form.phoneNumber.trim(),
        entranceNote: form.entranceNote.trim() || null,
        imageUrl: finalImageUrl || null,
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
      setIsUploading(false);
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
              <label className={adminLabelClass}>Anh dai dien rap</label>
              <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center border-white/[0.1] bg-white/[0.02]">
                {previewUrl ? (
                  <div className="relative w-full max-w-xs h-36 rounded-lg overflow-hidden">
                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <ImageIcon className="w-10 h-10 text-gray-600 mb-2" />
                )}
                <label htmlFor="cinema-file" className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] text-xs text-gray-300 cursor-pointer hover:bg-white/[0.08]">
                  <Upload className="w-3.5 h-3.5" />
                  Chon anh
                </label>
                <input id="cinema-file" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])} />
              </div>
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
          <PrimaryButton type="submit" loading={isSaving || isUploading} disabled={isSaving || isUploading}>
            {isUploading ? 'Dang tai anh...' : isEditing ? 'Cap nhat' : 'Them chi nhanh'}
          </PrimaryButton>
        </div>
      </form>
    </AdminPage>
  );
};

export default AdminCinemaFormPage;
