import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Edit2, Trash2, Loader2, Globe } from 'lucide-react';
import { movieService } from '../../../shared/services/movieService';
import { notificationService } from '../../../shared/services/notificationService';
import {
  AdminPage,
  PageHeader,
  Section,
  MetadataRow,
  PrimaryButton,
  GhostButton,
} from '../components';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const AdminActorDetailPage = () => {
  const { actorUuid } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [actor, setActor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const actors = await movieService.getActors();
        const found = (actors || []).find((a) => a.uuid === actorUuid);
        if (!isMounted) return;
        if (!found) {
          notificationService.error('Khong tim thay dien vien');
          navigate('/admin/media');
          return;
        }
        setActor(found);
      } catch (err) {
        notificationService.error('Khong the tai thong tin dien vien');
        navigate('/admin/media');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, [actorUuid, navigate]);

  const handleDelete = async () => {
    if (!actor) return;
    const ok = await confirm({
      title: 'Xóa diễn viên',
      message: 'Bạn có chắc chắn muốn xóa diễn viên này không?',
      highlight: actor.fullName,
      detail: 'Hành động này không thể hoàn tác.',
      confirmLabel: 'Xóa',
      variant: 'danger',
    });
    if (!ok) return;
    setIsDeleting(true);
    try {
      await movieService.deleteActor(actor.uuid);
      notificationService.success(`Da xoa "${actor.fullName}"`);
      navigate('/admin/media');
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

  if (!actor) return null;

  return (
    <AdminPage>
      <PageHeader
        title={actor.fullName}
        description={actor.countryName || 'Hồ sơ diễn viên'}
        backTo="/admin/media"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 flex flex-col items-start gap-3">
          <div className="w-full max-w-xs aspect-square rounded-full overflow-hidden border-2 border-white/[0.08] bg-white/[0.03] flex items-center justify-center mx-auto lg:mx-0">
            {actor.avatarUrl ? (
              <img src={actor.avatarUrl} alt={actor.fullName} className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-gray-600" />
            )}
          </div>

          <div className="w-full max-w-xs flex flex-col gap-2">
            <PrimaryButton
              type="button"
              className="w-full justify-center py-2.5"
              onClick={() => navigate('/admin/media')}
            >
              <Edit2 className="w-3.5 h-3.5" />
              Chinh sua
            </PrimaryButton>
            <GhostButton
              type="button"
              className="w-full justify-center py-2.5 text-red-400 hover:text-red-300 border border-red-500/30 hover:bg-red-500/10"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isDeleting ? 'Dang xoa...' : 'Xoa dien vien'}
            </GhostButton>
          </div>
        </div>

        <div className="lg:col-span-8">
          <Section title="Thong tin co ban">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetadataRow label="Ho va ten" value={actor.fullName} />
              <MetadataRow
                label="Quoc tich"
                value={
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-gray-500" />
                    {actor.countryName || 'Khong xac dinh'}
                  </span>
                }
              />
            </dl>
          </Section>
        </div>
      </div>
    </AdminPage>
  );
};

export default AdminActorDetailPage;
