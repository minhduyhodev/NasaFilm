import React, { useEffect, useState } from 'react';
import { Upload, Image as ImageIcon, Check } from 'lucide-react';
import { comboService } from '../../../../shared/services/comboService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass } from '../adminFormStyles';

const ComboFormPanel = ({ combo, onSuccess, onCancel }) => {
  const isEditing = Boolean(combo?.uuid);
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
    setSelectedFile(null);
    setPreviewUrl(combo?.imageUrl || '');
    setForm({
      name: combo?.name || '',
      description: combo?.description || '',
      price: combo?.price != null ? String(combo.price) : '',
      imageUrl: combo?.imageUrl || '',
      isActive: combo ? combo.status === 'ACTIVE' : true,
    });
  }, [combo]);

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
    if (!form.name.trim()) {
      notificationService.error('Tên combo không được để trống');
      return;
    }
    const numPrice = parseFloat(form.price);
    if (Number.isNaN(numPrice) || numPrice <= 0) {
      notificationService.error('Giá phải lớn hơn 0');
      return;
    }

    setIsSaving(true);
    let finalImageUrl = form.imageUrl;
    try {
      if (selectedFile) {
        setIsUploading(true);
        finalImageUrl = await comboService.uploadComboImage(selectedFile);
        setIsUploading(false);
      }
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: numPrice,
        imageUrl: finalImageUrl,
        isActive: form.isActive,
      };
      if (isEditing) {
        await comboService.updateCombo(combo.uuid, payload);
        notificationService.success('Cập nhật combo thành công');
      } else {
        await comboService.createCombo(payload);
        notificationService.success('Tạo combo thành công');
      }
      onSuccess?.();
    } catch (err) {
      notificationService.error(err.message || 'Lưu thất bại');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Tên combo *</label>
          <input className={adminInputClass} value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        </div>
        <div>
          <label className={adminLabelClass}>Đơn giá (VND) *</label>
          <input type="number" min="1000" step="1000" className={adminInputClass} value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-300">Đang bán</span>
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Mô tả</label>
          <textarea rows={3} className={`${adminInputClass} resize-none`} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
        </div>
        <div className="sm:col-span-2">
          <label className={adminLabelClass}>Hình ảnh</label>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files?.[0]) handleFileSelection(e.dataTransfer.files[0]);
            }}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition ${dragOver ? 'border-red-500 bg-red-500/5' : 'border-white/10 bg-white/[0.02]'}`}
          >
            {previewUrl ? (
              <div className="relative w-full max-w-xs h-36 rounded-lg overflow-hidden">
                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <ImageIcon className="w-10 h-10 text-gray-600 mb-2" />
            )}
            <label htmlFor="combo-file-modal" className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] text-xs text-gray-300 cursor-pointer hover:bg-white/[0.08]">
              <Upload className="w-3.5 h-3.5" />
              Chọn ảnh
            </label>
            <input id="combo-file-modal" type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])} />
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" loading={isSaving || isUploading} disabled={isSaving || isUploading}>
          <Check className="w-3.5 h-3.5" />
          {isUploading ? 'Đang tải ảnh...' : isEditing ? 'Cập nhật' : 'Tạo combo'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default ComboFormPanel;
