import React, { useState, useEffect } from 'react';
import {
  Plus, Search, Loader2, ChevronDown, Image as ImageIcon, Edit2, Trash2,
} from 'lucide-react';
import { comboService } from '../../../../shared/services/comboService';
import { notificationService } from '../../../../shared/services/notificationService';
import AdminModal from '../AdminModal';
import ComboFormPanel from './ComboFormPanel';
import { PrimaryButton, GhostButton } from '../index';
import '../../pages/AdminCombosPage.css';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';

const ComboCatalogSection = ({ embedded = false, sectionId = 'danh-muc' }) => {
  const confirm = useConfirm();
  const [combosList, setCombosList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [comboModal, setComboModal] = useState({ open: false, mode: 'create', combo: null });

  const fetchCombos = async () => {
    setIsLoading(true);
    try {
      const data = await comboService.getAdminCombos();
      setCombosList(data || []);
    } catch (err) {
      console.error(err);
      notificationService.error('Không thể tải danh sách combo bắp nước.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCombos();
  }, []);

  const filteredCombos = combosList.filter((combo) => {
    if (!combo) return false;
    const comboName = combo.name || '';
    const comboDesc = combo.description || '';
    const matchesSearch = comboName.toLowerCase().includes(searchQuery.toLowerCase())
      || comboDesc.toLowerCase().includes(searchQuery.toLowerCase());
    const isComboActive = combo.status === 'ACTIVE';
    if (statusFilter === 'active') return matchesSearch && isComboActive;
    if (statusFilter === 'inactive') return matchesSearch && !isComboActive;
    return matchesSearch;
  });

  const statusOptions = [
    { value: 'all', label: 'Tất cả bắp nước', icon: <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 shrink-0" /> },
    { value: 'active', label: 'Hoạt động', icon: <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 shrink-0" /> },
    { value: 'inactive', label: 'Vô hiệu hóa', icon: <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2 shrink-0" /> },
  ];
  const currentStatusOpt = statusOptions.find((opt) => opt.value === statusFilter) || statusOptions[0];

  const closeComboModal = () => setComboModal({ open: false, mode: 'create', combo: null });

  const handleComboSaved = async () => {
    closeComboModal();
    await fetchCombos();
  };

  const handleDeleteCombo = async (combo) => {
    const ok = await confirm({
      title: 'Xóa combo',
      message: `Bạn có chắc muốn xóa combo "${combo.name}"? Hành động này không thể hoàn tác.`,
      confirmLabel: 'Xóa combo',
      variant: 'danger',
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await comboService.deleteCombo(combo.uuid);
      notificationService.success('Đã xóa combo');
      closeComboModal();
      await fetchCombos();
    } catch (err) {
      notificationService.error(err.message || 'Xóa thất bại');
    } finally {
      setIsDeleting(false);
    }
  };

  const comboModalTitle =
    comboModal.mode === 'create'
      ? 'Tạo combo mới'
      : comboModal.mode === 'edit'
        ? 'Chỉnh sửa combo'
        : comboModal.combo?.name || 'Chi tiết combo';

  const comboModalSubtitle =
    comboModal.mode === 'detail' && comboModal.combo
      ? comboModal.combo.status === 'ACTIVE' ? 'Đang bán · Combo bắp nước' : 'Tạm ngưng · Combo bắp nước'
      : undefined;

  const Wrapper = embedded ? 'section' : 'div';
  const wrapperProps = embedded ? { id: sectionId, className: 'combo-catalog-section' } : { className: 'space-y-6 text-left' };

  return (
    <Wrapper {...wrapperProps}>
      {!embedded && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-1.5">Trung Tâm Quản Lý Dịch Vụ</p>
            <h1 className="text-4xl font-black text-white uppercase leading-none tracking-tight">Quản Lý Bắp Nước</h1>
            <p className="text-sm text-gray-400 mt-2">Xem danh mục, điều chỉnh giá bán và trạng thái bán bắp nước đi kèm phim.</p>
          </div>
          <button
            type="button"
            onClick={() => setComboModal({ open: true, mode: 'create', combo: null })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2.5 text-xs text-white font-bold transition shadow-lg shadow-red-600/10 cursor-pointer shrink-0 self-start md:self-auto"
          >
            <Plus size={14} /> Tạo Combo Mới
          </button>
        </div>
      )}

      {embedded && (
        <div className="combo-catalog-section__header">
          <div>
            <h2 className="combo-catalog-section__title">Danh mục bắp nước</h2>
            <p className="combo-catalog-section__desc">Quản lý giá bán, mô tả và trạng thái các gói combo đi kèm vé.</p>
          </div>
          <button
            type="button"
            onClick={() => setComboModal({ open: true, mode: 'create', combo: null })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 hover:bg-red-700 px-3 py-2 text-xs text-white font-bold transition cursor-pointer shrink-0"
          >
            <Plus size={14} /> Tạo combo
          </button>
        </div>
      )}

      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${embedded ? 'combo-catalog-section__toolbar' : 'mb-6 p-1'}`}>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-3.5 h-3.5" />
          <input
            type="text"
            autoComplete="off"
            placeholder="Tìm kiếm bắp nước theo tên, mô tả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-[#0f172a] border border-[#242d42] pl-9 pr-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <div className="relative text-left z-30">
            <button
              type="button"
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0f172a] border border-[#242d42] text-gray-300 text-xs font-semibold hover:text-white hover:border-[#475569] focus:outline-none transition-all duration-200 cursor-pointer min-w-[160px] h-[34px] justify-between"
            >
              <span className="flex items-center">
                {currentStatusOpt.icon}
                <span>{currentStatusOpt.label}</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isStatusDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10 bg-transparent" onClick={() => setIsStatusDropdownOpen(false)} />
                <div className="absolute right-0 mt-1 w-44 bg-[#1c2333] border border-[#242d42] rounded-lg shadow-xl p-1.5 space-y-0.5 animate-dropdown-fade-in z-20 text-left">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setStatusFilter(opt.value);
                        setIsStatusDropdownOpen(false);
                      }}
                      className={`w-full flex items-center px-3 py-2 rounded-md hover:bg-white/5 transition text-left text-xs font-semibold cursor-pointer ${statusFilter === opt.value ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-gray-300 border border-transparent'}`}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="min-h-[240px] flex flex-col items-center justify-center gap-3 bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-gray-400 text-xs font-medium">Đang tải danh mục bắp nước...</p>
        </div>
      ) : filteredCombos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 bg-[#0B0F19]/50 border border-[#1A2238] rounded-2xl">
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
                <button
                  key={combo.uuid}
                  type="button"
                  onClick={() => setComboModal({ open: true, mode: 'detail', combo })}
                  className="flex items-center flex-col md:flex-row p-5 gap-4 hover:bg-white/[0.012] transition-colors w-full text-left cursor-pointer bg-transparent border-none"
                >
                  <div className="w-20 h-20 rounded-xl overflow-hidden border border-white/5 bg-black/30 shrink-0 shadow-lg">
                    {combo.imageUrl ? (
                      <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5 text-gray-600">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 text-center md:text-left">
                    <h3 className="text-sm font-black text-white uppercase tracking-wider leading-snug">
                      {combo.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1 leading-relaxed line-clamp-2 pr-4">
                      {combo.description || 'Chưa có mô tả chi tiết.'}
                    </p>
                  </div>

                  <div className="w-32 shrink-0 text-center">
                    <span className="text-sm font-bold text-yellow-400 block font-mono">
                      {(combo.price || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>

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
                </button>
              );
            })}
          </div>
        </div>
      )}

      <AdminModal
        open={comboModal.open}
        onClose={closeComboModal}
        title={comboModalTitle}
        subtitle={comboModalSubtitle}
        size={comboModal.mode === 'detail' ? 'md' : 'lg'}
      >
        {comboModal.mode === 'detail' && comboModal.combo && (
          <div className="space-y-5">
            <div className="w-full max-w-[200px] mx-auto aspect-square rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
              {comboModal.combo.imageUrl ? (
                <img src={comboModal.combo.imageUrl} alt={comboModal.combo.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-12 h-12 text-gray-600" />
              )}
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Giá bán</dt>
                <dd className="text-amber-400 font-bold">{Number(comboModal.combo.price || 0).toLocaleString('vi-VN')} đ</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Trạng thái</dt>
                <dd className="text-white">{comboModal.combo.status === 'ACTIVE' ? 'Đang bán' : 'Tạm ngưng'}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-0.5">Mô tả</dt>
                <dd className="text-gray-300">{comboModal.combo.description || 'Chưa có mô tả'}</dd>
              </div>
            </dl>
            <div className="flex flex-col sm:flex-row gap-2">
              <PrimaryButton
                type="button"
                className="flex-1 justify-center"
                onClick={() => setComboModal({ open: true, mode: 'edit', combo: comboModal.combo })}
              >
                <Edit2 className="w-3.5 h-3.5" />
                Chỉnh sửa
              </PrimaryButton>
              <GhostButton
                type="button"
                className="flex-1 justify-center text-red-400 border-red-500/30 hover:bg-red-500/10"
                onClick={() => handleDeleteCombo(comboModal.combo)}
                disabled={isDeleting}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Đang xóa...' : 'Xóa'}
              </GhostButton>
            </div>
          </div>
        )}
        {(comboModal.mode === 'create' || comboModal.mode === 'edit') && (
          <ComboFormPanel
            combo={comboModal.mode === 'edit' ? comboModal.combo : null}
            onSuccess={handleComboSaved}
            onCancel={closeComboModal}
          />
        )}
      </AdminModal>
    </Wrapper>
  );
};

export default ComboCatalogSection;
