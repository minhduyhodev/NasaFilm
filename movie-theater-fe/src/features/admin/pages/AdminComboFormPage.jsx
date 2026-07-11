import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, Upload, Image as ImageIcon, Check } from 'lucide-react';
import { comboService } from '../../../shared/services/comboService';
import { notificationService } from '../../../shared/services/notificationService';
import { AdminPage, PageHeader, Section, PrimaryButton, GhostButton } from '../components';
import { comboFormSchema, firstComboFormError } from '../utils/comboFormSchema';

const inputClass =
  'w-full rounded-md bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/20 transition border border-white/[0.06]';
const labelClass = 'block text-xs font-medium text-gray-500 mb-1';

const AdminComboFormPage = () => {
  const navigate = useNavigate();
  const { comboUuid } = useParams();
  const isEditing = Boolean(comboUuid);

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    imageUrl: '',
    isActive: true,
  });

  useEffect(() => {
    if (!isEditing) return;
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const combos = await comboService.getAdminCombos();
        const combo = (combos || []).find((c) => c.uuid === comboUuid);
        if (!isMounted) return;
        if (!combo) {
          notificationService.error('Không tìm thấy combo');
          navigate('/admin/combos');
          return;
        }
        setForm({
          name: combo.name || '',
          description: combo.description || '',
          price: String(combo.price ?? ''),
          imageUrl: combo.imageUrl || '',
          isActive: combo.status === 'ACTIVE',
        });
        setPreviewUrl(combo.imageUrl || '');
      } catch (err) {
        notificationService.error('Không thể tải combo');
        navigate('/admin/combos');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [comboUuid, isEditing, navigate]);

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
    const parsed = comboFormSchema.safeParse({
      name: form.name,
      description: form.description,
      price: form.price,
      imageUrl: form.imageUrl,
      isActive: form.isActive,
    });
    if (!parsed.success) {
      notificationService.error(firstComboFormError(parsed.error));
      return;
    }

    setIsSaving(true);
    let finalImageUrl = parsed.data.imageUrl || '';
    try {
      if (selectedFile) {
        setIsUploading(true);
        finalImageUrl = await comboService.uploadComboImage(selectedFile);
        setIsUploading(false);
      }
      const payload = {
        name: parsed.data.name,
        description: (parsed.data.description || '').trim(),
        price: parsed.data.price,
        imageUrl: finalImageUrl,
        isActive: parsed.data.isActive,
      };
      if (isEditing) {
        await comboService.updateCombo(comboUuid, payload);
        notificationService.success('Cập nhật combo thành công');
        navigate(`/admin/combos/${comboUuid}`);
      } else {
        const created = await comboService.createCombo(payload);
        notificationService.success('Tạo combo thành công');
        navigate(`/admin/combos/${created?.uuid || ''}`);
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
        title={isEditing ? 'Chinh sua combo' : 'Tao combo moi'}
        backTo={isEditing ? `/admin/combos/${comboUuid}` : '/admin/combos'}
      />

      <form onSubmit={handleSubmit}>
        <Section title="Thong tin combo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
            <div className="md:col-span-2">
              <label className={labelClass}>Ten combo *</label>
              <input className={inputClass} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div>
              <label className={labelClass}>Don gia (VND) *</label>
              <input type="number" min="1000" step="1000" className={inputClass} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-300">Dang ban</span>
              </label>
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Mo ta</label>
              <textarea rows={3} className={`${inputClass} resize-none`} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className={labelClass}>Hinh anh</label>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
                }}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition ${dragOver ? 'border-red-500 bg-red-500/5' : 'border-white/[0.1] bg-white/[0.02]'}`}
              >
                {previewUrl ? (
                  <div className="relative w-full max-w-xs h-36 rounded-lg overflow-hidden">
                    <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <ImageIcon className="w-10 h-10 text-gray-600 mb-2" />
                )}
                <label htmlFor="combo-file" className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] text-xs text-gray-300 cursor-pointer hover:bg-white/[0.08]">
                  <Upload className="w-3.5 h-3.5" />
                  Chon anh
                </label>
                <input id="combo-file" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])} />
              </div>
            </div>
          </div>
        </Section>

        <div className="flex justify-end gap-2 pt-4 border-t border-white/[0.06]">
          <GhostButton type="button" onClick={() => navigate(isEditing ? `/admin/combos/${comboUuid}` : '/admin/combos')}>Huy</GhostButton>
          <PrimaryButton type="submit" loading={isSaving || isUploading} disabled={isSaving || isUploading}>
            <Check className="w-3.5 h-3.5" />
            {isUploading ? 'Dang tai anh...' : isEditing ? 'Cap nhat' : 'Tao combo'}
          </PrimaryButton>
        </div>
      </form>
    </AdminPage>
  );
};

export default AdminComboFormPage;
