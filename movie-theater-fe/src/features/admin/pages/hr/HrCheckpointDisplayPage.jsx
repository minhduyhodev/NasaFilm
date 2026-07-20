import { Link } from 'react-router-dom';
import { AdminPage, PageHeader } from '../../components';
import CheckpointCodeDisplay from './CheckpointCodeDisplay';
import './hr.css';

/**
 * Màn hình quầy: hiển thị mã QR điểm danh cho nhân viên quét.
 * Mở trên tablet/monitor tại quầy — không phải trang cá nhân để tự chấm công.
 */
const HrCheckpointDisplayPage = () => (
  <AdminPage>
    <PageHeader
      eyebrow="Chấm công & Lương"
      title="Mã QR điểm danh tại quầy"
      description="Mở trang này trên màn hình/tablet đặt tại quầy. Nhân viên dùng điện thoại cá nhân vào Bảng công của tôi để quét mã khi check-in hoặc check-out."
      variant="default"
    />

    <div className="hr-checkpoint-kiosk-wrap">
      <CheckpointCodeDisplay variant="kiosk" qrSize={400} />
      <div className="hr-checkpoint-kiosk-steps">
        <p className="hr-card__title">Hướng dẫn cho nhân viên</p>
        <ol>
          <li>Mở menu <Link to="/admin/hr/me" className="hr-link">Bảng công của tôi</Link> trên điện thoại.</li>
          <li>Chọn ca và bấm <strong>Check-in</strong> hoặc <strong>Check-out</strong>.</li>
          <li>Quét mã QR trên màn hình quầy này (hoặc nhập 6 số đang hiển thị).</li>
        </ol>
      </div>
    </div>
  </AdminPage>
);

export default HrCheckpointDisplayPage;
