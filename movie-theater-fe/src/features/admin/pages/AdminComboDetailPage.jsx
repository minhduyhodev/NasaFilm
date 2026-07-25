import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit2, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';
import { comboService } from '../../../shared/services/comboService';
import { notificationService } from '../../../shared/services/notificationService';
import {
  AdminPage,
  PageHeader,
  Section,
  MetadataRow,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from '../components';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const AdminComboDetailPage = () => {
  const { comboUuid } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [combo, setCombo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const combos = await comboService.getAdminCombos();
        const found = (combos || []).find((c) => c.uuid === comboUuid);
        if (!isMounted) return;
        if (!found) {
          notificationService.error('Không tìm thấy combo');
          navigate('/admin/combos');
          return;
        }
        setCombo(found);
      } catch {
        notificationService.error('Không thể tải combo');
        navigate('/admin/combos');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [comboUuid, navigate]);

  const handleDelete = async () => {
    if (!combo) return;
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
      navigate('/admin/combos');
    } catch (err) {
      notificationService.error(err.message || 'Xóa thất bại');
    } finally {
      setIsDeleting(false);
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

  if (!combo) return null;

  const isActive = combo.status === 'ACTIVE';

  return (
    <AdminPage>
      <PageHeader
        title={combo.name}
        description={isActive ? 'Đang bán · Combo bắp nước' : 'Tạm ngưng · Combo bắp nước'}
        backTo="/admin/combos"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="w-full max-w-xs aspect-square rounded-xl overflow-hidden bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
            {combo.imageUrl ? (
              <img src={combo.imageUrl} alt={combo.name} className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-12 h-12 text-gray-600" />
            )}
          </div>
          <div className="w-full max-w-xs flex flex-col gap-2">
            <PrimaryButton type="button" className="w-full justify-center py-2.5" onClick={() => navigate(`/admin/combos/${combo.uuid}/edit`)}>
              <Edit2 className="w-3.5 h-3.5" />
              Chinh sua
            </PrimaryButton>
            <GhostButton
              type="button"
              className="w-full justify-center py-2.5 text-red-400 border border-red-500/30 hover:bg-red-500/10"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Dang xoa...' : 'Xoa combo'}
            </GhostButton>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          <Section title="Thong tin co ban">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetadataRow label="Gia ban" value={`${Number(combo.price || 0).toLocaleString('vi-VN')} VND`} />
              <MetadataRow
                label="Trang thai"
                value={
                  <StatusBadge variant={isActive ? 'success' : 'danger'}>
                    {isActive ? 'Dang ban' : 'Tam ngung'}
                  </StatusBadge>
                }
              />
              <MetadataRow label="Mo ta" value={combo.description || 'Chua co mo ta'} className="md:col-span-2" />
            </dl>
          </Section>
        </div>
      </div>
    </AdminPage>
  );
};

export default AdminComboDetailPage;
