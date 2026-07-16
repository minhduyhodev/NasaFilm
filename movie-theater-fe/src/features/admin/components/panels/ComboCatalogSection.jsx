import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Loader2, Image as ImageIcon, Edit2, Trash2,
} from 'lucide-react';
import { comboService } from '../../../../shared/services/comboService';
import { notificationService } from '../../../../shared/services/notificationService';
import AdminModal from '../AdminModal';
import ComboFormPanel from './ComboFormPanel';
import {
  AdminPage,
  PageHeader,
  FilterPills,
  StatusBadge,
  PrimaryButton,
  GhostButton,
} from '../index';
import '../../pages/AdminCombosPage.css';
import { useConfirm } from '../../../../shared/context/ConfirmDialogContext';

const ComboCatalogSection = ({ embedded = false, sectionId = 'danh-muc' }) => {
  const confirm = useConfirm();
  const [combosList, setCombosList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const counts = useMemo(() => {
    const active = combosList.filter((c) => c?.status === 'ACTIVE').length;
    return {
      all: combosList.length,
      active,
      inactive: combosList.length - active,
    };
  }, [combosList]);

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

  const openCreate = () => setComboModal({ open: true, mode: 'create', combo: null });

  const body = (
    <>
      {!embedded ? (
        <PageHeader
          eyebrow="Dịch vụ đi kèm"
          title="Quản lý bắp nước"
          description="Xem danh mục, điều chỉnh giá bán và trạng thái bán bắp nước đi kèm phim."
          primaryAction={{
            label: 'Tạo combo mới',
            icon: <Plus size={16} />,
            onClick: openCreate,
          }}
        />
      ) : (
        <div className="combo-catalog-section__header">
          <div>
            <h2 className="combo-catalog-section__title">Danh mục bắp nước</h2>
            <p className="combo-catalog-section__desc">Quản lý giá bán, mô tả và trạng thái các gói combo đi kèm vé.</p>
          </div>
          <PrimaryButton type="button" onClick={openCreate}>
            <Plus size={14} /> Tạo combo
          </PrimaryButton>
        </div>
      )}

      <div className="adm-panel">
        <div className="adm-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="adm-toolbar__search max-w-md w-full">
            <Search className="adm-toolbar__search-icon" />
            <input
              type="text"
              autoComplete="off"
              placeholder="Tìm kiếm bắp nước theo tên, mô tả..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="adm-input"
            />
          </div>
          <FilterPills
            value={statusFilter}
            onChange={setStatusFilter}
            items={[
              { id: 'all', label: 'Tất cả', count: counts.all },
              { id: 'active', label: 'Hoạt động', count: counts.active },
              { id: 'inactive', label: 'Vô hiệu', count: counts.inactive },
            ]}
            ariaLabel="Lọc trạng thái combo"
          />
        </div>

        <div className="adm-panel__body">
          {isLoading ? (
            <div className="adm-loading min-h-[240px]">
              <Loader2 className="w-8 h-8 text-[var(--adm-accent)] animate-spin" />
              <p className="text-sm text-[var(--adm-text-dim)]">Đang tải danh mục bắp nước...</p>
            </div>
          ) : filteredCombos.length === 0 ? (
            <div className="adm-empty">
              <p className="font-semibold text-[var(--adm-text)]">Không tìm thấy combo nào</p>
              <p className="text-xs text-[var(--adm-text-dim)] mt-1">
                Hãy tạo gói combo mới hoặc thay đổi từ khóa tìm kiếm.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--adm-border)]">
              <div className="px-1 pb-3 text-xs font-semibold text-[var(--adm-text-muted)]">
                Danh mục ({filteredCombos.length} gói)
              </div>
              {filteredCombos.map((combo) => {
                const isActiveCombo = combo.status === 'ACTIVE';
                return (
                  <button
                    key={combo.uuid}
                    type="button"
                    onClick={() => setComboModal({ open: true, mode: 'detail', combo })}
                    className="flex items-center flex-col md:flex-row py-4 gap-4 hover:bg-white/[0.02] transition-colors w-full text-left cursor-pointer bg-transparent border-none"
                  >
                    <div className="w-20 h-20 rounded-[var(--adm-radius-sm)] overflow-hidden border border-[var(--adm-border)] bg-black/30 shrink-0">
                      {combo.imageUrl ? (
                        <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--adm-text-dim)]">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 text-center md:text-left">
                      <h3 className="text-sm font-bold text-[var(--adm-text)] uppercase tracking-wide leading-snug">
                        {combo.name}
                      </h3>
                      <p className="text-[11px] text-[var(--adm-text-dim)] mt-1 leading-relaxed line-clamp-2 pr-4">
                        {combo.description || 'Chưa có mô tả chi tiết.'}
                      </p>
                    </div>

                    <div className="w-32 shrink-0 text-center">
                      <span className="text-sm font-bold text-amber-400 block adm-tabular">
                        {(combo.price || 0).toLocaleString('vi-VN')} đ
                      </span>
                    </div>

                    <div className="w-32 shrink-0 flex justify-center">
                      <StatusBadge variant={isActiveCombo ? 'success' : 'danger'}>
                        {isActiveCombo ? 'Đang bán' : 'Tạm ngưng'}
                      </StatusBadge>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AdminModal
        open={comboModal.open}
        onClose={closeComboModal}
        title={comboModalTitle}
        subtitle={comboModalSubtitle}
        size={comboModal.mode === 'detail' ? 'md' : 'lg'}
      >
        {comboModal.mode === 'detail' && comboModal.combo && (
          <div className="space-y-5">
            <div className="w-full max-w-[200px] mx-auto aspect-square rounded-[var(--adm-radius-sm)] overflow-hidden bg-white/[0.03] border border-[var(--adm-border)] flex items-center justify-center">
              {comboModal.combo.imageUrl ? (
                <img src={comboModal.combo.imageUrl} alt={comboModal.combo.name} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-12 h-12 text-[var(--adm-text-dim)]" />
              )}
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">Giá bán</dt>
                <dd className="text-amber-400 font-bold adm-tabular">{Number(comboModal.combo.price || 0).toLocaleString('vi-VN')} đ</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">Trạng thái</dt>
                <dd>
                  <StatusBadge variant={comboModal.combo.status === 'ACTIVE' ? 'success' : 'danger'}>
                    {comboModal.combo.status === 'ACTIVE' ? 'Đang bán' : 'Tạm ngưng'}
                  </StatusBadge>
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[10px] uppercase tracking-wider text-[var(--adm-text-dim)] font-bold mb-0.5">Mô tả</dt>
                <dd className="text-[var(--adm-text-muted)]">{comboModal.combo.description || 'Chưa có mô tả'}</dd>
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
    </>
  );

  if (embedded) {
    return (
      <section id={sectionId} className="combo-catalog-section">
        {body}
      </section>
    );
  }

  return <AdminPage>{body}</AdminPage>;
};

export default ComboCatalogSection;
