import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Edit2, Trash2, Loader2, X, Play, Pause, 
  FastForward, Check, Upload, Image as ImageIcon
} from 'lucide-react';
import { comboService } from '../../../shared/services/comboService';
import { notificationService } from '../../../shared/services/notificationService';
import './AdminCombosPage.css';

const AdminCombosPage = () => {
  const [combosList, setCombosList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // File upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Fetch all combos from API
  const fetchCombos = async () => {
    setIsLoading(true);
    try {
      const data = await comboService.getAdminCombos();
      setCombosList(data || []);
    } catch (err) {
      console.error(err);
      notificationService.error("Không thể tải danh sách combo bắp nước.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCombos();
  }, []);

  // Filter combos list based on search query and status filter
  const filteredCombos = combosList.filter(combo => {
    if (!combo) return false;
    const comboName = combo.name || '';
    const comboDesc = combo.description || '';
    const matchesSearch = comboName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          comboDesc.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isComboActive = combo.status === 'ACTIVE';
    if (statusFilter === 'active') {
      return matchesSearch && isComboActive;
    } else if (statusFilter === 'inactive') {
      return matchesSearch && !isComboActive;
    }
    return matchesSearch;
  });

  // Open modal for creation
  const handleOpenCreateModal = () => {
    setSelectedCombo(null);
    setName('');
    setDescription('');
    setPrice('');
    setImageUrl('');
    setIsActive(true);
    setSelectedFile(null);
    setPreviewUrl('');
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (combo) => {
    setSelectedCombo(combo);
    setName(combo.name);
    setDescription(combo.description || '');
    setPrice(combo.price);
    setImageUrl(combo.imageUrl || '');
    setIsActive(combo.status === 'ACTIVE');
    setSelectedFile(null);
    setPreviewUrl(combo.imageUrl || '');
    setIsModalOpen(true);
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file) => {
    if (!file.type.startsWith('image/')) {
      notificationService.error("Vui lòng chỉ chọn tệp hình ảnh!");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file)); // Hiển thị hình ảnh xem trước tạm thời
  };

  // Delete combo
  const handleDeleteCombo = async (uuid, comboName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa combo "${comboName}" không?`)) {
      try {
        await comboService.deleteCombo(uuid);
        notificationService.success("Xóa combo thành công!");
        fetchCombos();
      } catch (err) {
        console.error(err);
        notificationService.error(err.message || "Xóa combo thất bại.");
      }
    }
  };

  // Form submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Front-end validations
    if (!name.trim()) {
      notificationService.error("Tên combo không được để trống!");
      return;
    }
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      notificationService.error("Giá tiền phải lớn hơn 0!");
      return;
    }

    setIsSubmitting(true);
    let finalImageUrl = imageUrl;

    try {
      // 1. Upload file ảnh lên Cloudinary nếu có chọn file mới
      if (selectedFile) {
        setIsUploading(true);
        try {
          const uploadedUrl = await comboService.uploadComboImage(selectedFile);
          finalImageUrl = uploadedUrl;
        } catch (uploadErr) {
          console.error(uploadErr);
          notificationService.error("Tải ảnh lên máy chủ Cloudinary thất bại. Vui lòng thử lại!");
          setIsSubmitting(false);
          setIsUploading(false);
          return;
        }
        setIsUploading(false);
      }

      // Đóng gói JSON data gửi sang Spring Boot API
      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: numPrice,
        imageUrl: finalImageUrl,
        isActive: isActive
      };

      if (selectedCombo) {
        // Cập nhật combo hiện tại
        await comboService.updateCombo(selectedCombo.uuid, payload);
        notificationService.success(`Cập nhật combo "${name}" thành công!`);
      } else {
        // Tạo mới combo
        await comboService.createCombo(payload);
        notificationService.success(`Thêm mới combo "${name}" thành công!`);
      }

      setIsModalOpen(false);
      fetchCombos();
    } catch (err) {
      console.error(err);
      notificationService.error(err.message || "Lưu thông tin combo thất bại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 text-left">
      {/* HEADER PAGE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white uppercase tracking-wider font-heading">
            Quản lý Bắp Nước
          </h1>
          <p className="text-[11px] text-gray-500 font-semibold mt-0.5">
            Xem danh mục, điều chỉnh giá bán và trạng thái bán bắp nước đi kèm phim.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs text-white font-bold transition shadow-lg shadow-red-600/10 cursor-pointer shrink-0 self-start md:self-auto"
        >
          <Plus size={14} /> Tạo Combo Mới
        </button>
      </div>

      {/* FILTER & SEARCH */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center bg-[#0B0F19]/30 border border-[#1A2238]/60 p-4 rounded-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Tìm kiếm bắp nước theo tên, mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all duration-200"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'active', label: 'Hoạt động' },
            { value: 'inactive', label: 'Vô hiệu hóa' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition cursor-pointer ${
                statusFilter === opt.value
                  ? 'bg-red-600 text-white'
                  : 'bg-[#0F1322] border border-[#1A2238] text-gray-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* LIST VIEW (TABLE) */}
      {isLoading ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center gap-3 bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-gray-400 text-xs font-medium">Đang tải danh mục bắp nước...</p>
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl">
          <span className="material-symbols-outlined text-zinc-700 text-5xl">fastfood</span>
          <p className="font-bold text-white uppercase tracking-wider text-xs">Không tìm thấy combo nào</p>
          <p className="text-[10px] text-gray-500">Hãy tạo gói combo mới hoặc thay đổi từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div className="bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#1A2238] flex items-center justify-between bg-black/10">
            <span className="text-xs font-bold text-white">
              Danh mục hoạt động ({filteredCombos.length} gói)
            </span>
          </div>

          <div className="divide-y divide-[#1A2238]/40">
            {filteredCombos.map((combo) => {
              const isActiveCombo = combo.status === 'ACTIVE';
              return (
                <div 
                  key={combo.uuid}
                  className="flex items-center flex-col md:flex-row p-5 gap-4 hover:bg-white/[0.012] transition-colors"
                >
                  {/* Thumbnail ảnh */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/5 bg-black/30 shrink-0 shadow-lg">
                    {combo.imageUrl ? (
                      <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 text-gray-600">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>

                  {/* Thông tin chữ */}
                  <div className="flex-1 min-w-0 text-center md:text-left">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider leading-snug">
                      {combo.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2 pr-4">
                      {combo.description || "Chưa có mô tả chi tiết."}
                    </p>
                  </div>

                  {/* Giá tiền */}
                  <div className="w-32 shrink-0 text-center">
                    <span className="text-sm font-bold text-yellow-400 block font-mono">
                      {(combo.price || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  {/* Trạng thái hoạt động */}
                  <div className="w-32 shrink-0 flex justify-center">
                    {isActiveCombo ? (
                      <span className="bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 px-3 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Đang bán
                      </span>
                    ) : (
                      <span className="bg-rose-500/15 border border-rose-500/35 text-rose-400 px-3 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5 shadow-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Tạm ngưng
                      </span>
                    )}
                  </div>

                  {/* Hành động (Sửa, Xóa) */}
                  <div className="w-24 shrink-0 flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleOpenEditModal(combo)}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors cursor-pointer"
                      title="Sửa thông tin"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteCombo(combo.uuid, combo.name)}
                      className="p-2 bg-white/5 hover:bg-red-950/20 border border-white/10 hover:border-red-900/30 rounded-lg text-gray-500 hover:text-red-500 transition-colors cursor-pointer"
                      title="Xóa combo"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#0b0f19] border border-[#1a2238] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in my-8 text-left">
            
            {/* Header Modal */}
            <div className="p-5 border-b border-[#1A2238] flex items-center justify-between bg-black/20">
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                {selectedCombo ? `Chỉnh sửa: ${selectedCombo.name}` : "Tạo Combo Bắp Nước Mới"}
              </h3>
              <button
                onClick={() => !isSubmitting && setIsModalOpen(false)}
                className="text-gray-400 hover:text-white rounded-lg p-1 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
                
                {/* Tên Combo */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tên gói Combo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Combo Solo, Combo Gia Đình..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-colors"
                  />
                </div>

                {/* Giá tiền */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Đơn giá bán (VNĐ) *</label>
                  <input
                    type="number"
                    required
                    min="1000"
                    step="1000"
                    placeholder="Ví dụ: 90000, 160000..."
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-colors font-mono"
                  />
                </div>

                {/* Mô tả */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mô tả chi tiết các sản phẩm</label>
                  <textarea
                    placeholder="Ví dụ: Gồm 1 bắp lớn vị ngọt + 2 ly Coca cỡ vừa..."
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-colors resize-none"
                  />
                </div>

                {/* File Upload & Preview Area */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Hình ảnh minh họa</label>
                  
                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center transition-all ${
                      dragOver 
                        ? 'border-red-500 bg-red-500/5 scale-[0.99]' 
                        : previewUrl 
                          ? 'border-white/15 bg-white/[0.02]' 
                          : 'border-white/10 hover:border-white/20 bg-white/5'
                    }`}
                  >
                    {previewUrl ? (
                      <div className="relative w-full h-36 flex items-center justify-center rounded-lg overflow-hidden group/img">
                        <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity gap-2">
                          <label htmlFor="modal-file-input" className="px-3 py-1.5 bg-white text-black font-bold text-[10px] rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                            Thay ảnh mới
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null);
                              setPreviewUrl('');
                              setImageUrl('');
                            }}
                            className="px-3 py-1.5 bg-red-600 text-white font-bold text-[10px] rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                          >
                            Xóa ảnh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400">
                          <Upload size={18} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">
                            Kéo thả ảnh vào đây hoặc click để chọn
                          </p>
                          <p className="text-[9px] text-gray-500 mt-1">
                            Hỗ trợ tệp PNG, JPG, JPEG chất lượng cao.
                          </p>
                        </div>
                        <label
                          htmlFor="modal-file-input"
                          className="px-4 py-2 border border-white/10 hover:border-white/20 bg-white/5 text-[10px] text-gray-300 font-bold rounded-lg cursor-pointer transition-colors active:scale-95 mt-1"
                        >
                          Duyệt tập tin
                        </label>
                      </div>
                    )}

                    <input
                      id="modal-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Trạng thái hoạt động */}
                <div className="flex items-center justify-between p-3.5 bg-white/5 border border-white/5 rounded-xl mt-4">
                  <div>
                    <span className="text-xs font-bold text-white block">Trạng thái bán</span>
                    <span className="text-[10px] text-gray-500">Mở bán gói combo này ngay lập tức.</span>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600 peer-checked:after:bg-white" />
                  </label>
                </div>

              </div>

              {/* Footer Modal với Nút Lưu và Spinner Loading */}
              <div className="p-5 border-t border-[#1A2238] bg-black/25 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsModalOpen(false)}
                  className={`px-4 py-2 border border-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Hủy bỏ
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-lg shadow-red-600/10 active:scale-98 cursor-pointer ${
                    isSubmitting ? 'opacity-75 cursor-wait' : ''
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {isUploading ? 'Đang tải ảnh...' : 'Đang lưu...'}
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Lưu thông tin
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCombosPage;
