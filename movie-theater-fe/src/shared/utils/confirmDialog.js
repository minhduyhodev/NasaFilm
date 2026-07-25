import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
import './sweetalertTheme.css';

const VARIANT_STYLES = {
  danger: {
    icon: 'warning',
    confirmColor: '#e11d48',
    confirmClass: 'nasafilm-swal-confirm--danger',
  },
  warning: {
    icon: 'warning',
    confirmColor: '#d97706',
    confirmClass: 'nasafilm-swal-confirm--warning',
  },
  default: {
    icon: 'question',
    confirmColor: '#2563eb',
    confirmClass: 'nasafilm-swal-confirm--default',
  },
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const buildHtml = ({ message, highlight, detail }) => {
  const parts = [];

  if (message) {
    parts.push(`<p class="nasafilm-swal-message">${escapeHtml(message)}</p>`);
  }
  if (highlight) {
    parts.push(`<div class="nasafilm-swal-highlight">${escapeHtml(highlight)}</div>`);
  }
  if (detail) {
    parts.push(`<p class="nasafilm-swal-detail">${escapeHtml(detail)}</p>`);
  }

  return parts.join('');
};

/**
 * Popup xác nhận thay thế window.confirm — trả về true nếu người dùng bấm xác nhận.
 */
export const confirmAction = async ({
  title = 'Xác nhận',
  message = 'Bạn có chắc chắn muốn thực hiện hành động này?',
  highlight = '',
  detail = '',
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy',
  variant = 'danger',
} = {}) => {
  const style = VARIANT_STYLES[variant] || VARIANT_STYLES.danger;

  const result = await Swal.fire({
    title,
    html: buildHtml({ message, highlight, detail }),
    icon: style.icon,
    showCancelButton: true,
    confirmButtonText: confirmLabel,
    cancelButtonText: cancelLabel,
    confirmButtonColor: style.confirmColor,
    cancelButtonColor: '#334155',
    background: '#141418',
    color: '#f1f5f9',
    reverseButtons: true,
    focusCancel: true,
    buttonsStyling: true,
    allowOutsideClick: false,
    allowEscapeKey: true,
    customClass: {
      popup: 'nasafilm-swal-popup',
      title: 'nasafilm-swal-title',
      htmlContainer: 'nasafilm-swal-html',
      confirmButton: `nasafilm-swal-confirm ${style.confirmClass}`,
      cancelButton: 'nasafilm-swal-cancel',
      icon: 'nasafilm-swal-icon',
    },
  });

  return result.isConfirmed === true;
};

export default confirmAction;
