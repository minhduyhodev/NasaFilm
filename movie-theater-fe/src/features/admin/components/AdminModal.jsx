import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './AdminModal.css';

const SIZE_CLASS = {
  md: 'admin-modal-panel-md',
  lg: 'admin-modal-panel-lg',
  xl: 'admin-modal-panel-xl',
};

const AdminModal = ({
  open,
  onClose,
  title,
  subtitle,
  size = 'lg',
  footer,
  children,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="admin-modal-root" role="dialog" aria-modal="true">
      <button type="button" className="admin-modal-backdrop" onClick={onClose} aria-label="Đóng" />
      <div className={`admin-modal-panel ${SIZE_CLASS[size] || SIZE_CLASS.lg}`}>
        <div className="admin-modal-header">
          <div className="admin-modal-header-text">
            <h2 className="admin-modal-title">{title}</h2>
            {subtitle && <p className="admin-modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Đóng">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer && <div className="admin-modal-footer">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

export default AdminModal;
