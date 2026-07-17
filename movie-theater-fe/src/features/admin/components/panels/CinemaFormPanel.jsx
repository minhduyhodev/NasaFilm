import { useEffect, useState } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { cinemaService } from '../../../../shared/services/cinemaService';
import { notificationService } from '../../../../shared/services/notificationService';
import { PrimaryButton, GhostButton } from '..';
import { adminInputClass, adminLabelClass, adminSelectClass } from '../adminFormStyles';

const CinemaFormPanel = ({ cinema, onSuccess, onCancel }) => {
  const isEditing = Boolean(cinema?.uuid);
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
    status: 'ACTIVE',
  });

  useEffect(() => {
    setForm({
      name: cinema?.name || '',
      address: cinema?.address || '',
      phoneNumber: cinema?.phoneNumber || '',
      entranceNote: cinema?.entranceNote || '',
      imageUrl: cinema?.imageUrl || '',
      latitude: cinema?.latitude ?? '',
      longitude: cinema?.longitude ?? '',
      status: cinema?.status || 'ACTIVE',
    });
    setSelectedFile(null);
    setPreviewUrl(cinema?.imageUrl || '');
  }, [cinema]);

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
    if (!form.name.trim() || !form.address.trim() || !form.phoneNumber.trim()) {
      notificationService.error('Vui lòng điền đầy đủ thông tin chi nhánh');
      return;
    }
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
        status: form.status,
      };
      if (isEditing) {
        await cinemaService.updateCinema(cinema.uuid, payload);
        notificationService.success('Cập nhật chi nhánh thành công');
        onSuccess?.(cinema);
      } else {
        const created = await cinemaService.createCinema(payload);
        notificationService.success('Thêm chi nhánh mới thành công');
        onSuccess?.(created);
      }
    } catch (err) {
      notificationService.error(err.message || 'Lưu thất bại');
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={adminLabelClass}>Tên chi nhánh *</label>
        <input
          className={adminInputClass}
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="VD: NASA Film Landmark 81"
          required
        />
      </div>
      <div>
        <label className={adminLabelClass}>Địa chỉ *</label>
        <input
          className={adminInputClass}
          value={form.address}
          onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
          placeholder="Số nhà, quận, thành phố"
          required
        />
      </div>
      <div>
        <label className={adminLabelClass}>Số điện thoại *</label>
        <input
          className={adminInputClass}
          value={form.phoneNumber}
          onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))}
          placeholder="028xxxxxxx"
          required
        />
      </div>
      <div>
        <label className={adminLabelClass}>Ảnh đại diện rạp</label>
        <div className="border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center border-white/[0.1] bg-white/[0.02]">
          {previewUrl ? (
            <div className="relative w-full max-w-xs h-32 rounded-lg overflow-hidden">
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <ImageIcon className="w-8 h-8 text-gray-600 mb-1" />
          )}
          <label htmlFor="cinema-panel-file" className="mt-2.5 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.05] text-xs text-gray-300 cursor-pointer hover:bg-white/[0.08]">
            <Upload className="w-3.5 h-3.5" />
            Chọn ảnh
          </label>
          <input
            id="cinema-panel-file"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
          />
        </div>
      </div>
      <div>
        <label className={adminLabelClass}>Hướng dẫn vào cổng</label>
        <textarea
          className={`${adminInputClass} min-h-[88px] resize-y`}
          value={form.entranceNote}
          onChange={(e) => setForm((p) => ({ ...p, entranceNote: e.target.value }))}
          placeholder="VD: Cổng VIP: tầng B2, thang máy phía Đông Landmark 81"
        />
      </div>
      <div>
        <label className={adminLabelClass}>Trạng thái *</label>
        <select
          className={adminSelectClass}
          value={form.status}
          onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
        >
          <option value="ACTIVE">Hoạt động</option>
          <option value="MAINTENANCE">Bảo trì</option>
          <option value="DISABLED">Vô hiệu hóa</option>
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={adminLabelClass}>Vĩ độ (latitude)</label>
          <input
            className={adminInputClass}
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))}
            placeholder="10.7951"
          />
        </div>
        <div>
          <label className={adminLabelClass}>Kinh độ (longitude)</label>
          <input
            className={adminInputClass}
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))}
            placeholder="106.7218"
          />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
        <GhostButton type="button" onClick={onCancel}>Hủy</GhostButton>
        <PrimaryButton type="submit" loading={isSaving || isUploading} disabled={isSaving || isUploading}>
          {isUploading ? 'Đang tải ảnh...' : isEditing ? 'Cập nhật' : 'Thêm chi nhánh'}
        </PrimaryButton>
      </div>
    </form>
  );
};

export default CinemaFormPanel;
