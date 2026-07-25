import { confirmAction } from '../utils/confirmDialog';

/** @deprecated Provider không còn cần thiết — giữ để tương thích cấu trúc App. */
export const ConfirmDialogProvider = ({ children }) => children;

/** Hook xác nhận dùng SweetAlert2 — thay thế window.confirm */
export const useConfirm = () => confirmAction;
