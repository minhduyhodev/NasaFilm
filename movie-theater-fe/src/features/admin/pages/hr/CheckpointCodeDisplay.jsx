import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { hrService } from '../../api/hrService';

/**
 * Hiển thị mã QR điểm danh xoay theo thời gian (dùng trên màn hình quầy).
 * Nhân viên quét mã này từ điện thoại cá nhân khi check-in/out.
 */
export default function CheckpointCodeDisplay({
  fetchCode = () => hrService.getCheckpointDisplay(),
  variant = 'default',
  qrSize = 320,
}) {
  const [data, setData] = useState(null);
  const [qrUrl, setQrUrl] = useState('');
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const periodRef = useRef(60);

  const loadCode = useCallback(async () => {
    try {
      const res = await fetchCode();
      setData(res);
      setRemaining(res?.validForSeconds ?? 0);
      periodRef.current = res?.periodSeconds || 60;
      setError('');
      if (res?.qrContent) {
        const url = await QRCode.toDataURL(String(res.qrContent), {
          width: qrSize,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#0b1020', light: '#ffffff' },
        });
        setQrUrl(url);
      }
    } catch (err) {
      setError(err?.message || 'Không tải được mã điểm danh.');
    } finally {
      setLoading(false);
    }
  }, [fetchCode, qrSize]);

  useEffect(() => {
    loadCode();
  }, [loadCode]);

  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          loadCode();
          return periodRef.current;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [loadCode]);

  if (loading) {
    return (
      <div className="hr-state">
        <Loader2 className="h-8 w-8 text-red-500 animate-spin" />
        <p>Đang tạo mã...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hr-state">
        <QrCode className="h-9 w-9 text-slate-500" />
        <p>{error}</p>
      </div>
    );
  }

  const code = data?.code || '';
  const prettyCode = code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
  const pct = periodRef.current > 0 ? Math.round((remaining / periodRef.current) * 100) : 0;
  const isKiosk = variant === 'kiosk';

  return (
    <div className={`hr-checkpoint-card${isKiosk ? ' hr-checkpoint-card--kiosk' : ''}`}>
      <div className={`hr-checkpoint${isKiosk ? ' hr-checkpoint--kiosk' : ''}`}>
        {qrUrl && (
          <img
            src={qrUrl}
            alt="Mã QR điểm danh tại quầy"
            className={`hr-checkpoint__qr${isKiosk ? ' hr-checkpoint__qr--kiosk' : ''}`}
          />
        )}
        <p className="hr-card__title" style={{ margin: 0 }}>
          {isKiosk ? 'Quét mã để chấm công' : 'Mã checkpoint ca'}
        </p>
        <div className={`hr-checkpoint__code${isKiosk ? ' hr-checkpoint__code--kiosk' : ''}`}>
          {prettyCode}
        </div>
        <div className={`hr-checkpoint__bar${isKiosk ? ' hr-checkpoint__bar--kiosk' : ''}`}>
          <span className="hr-checkpoint__bar-fill" style={{ width: `${pct}%` }} />
        </div>
        <p
          className="hr-muted"
          style={{
            fontSize: isKiosk ? 14 : 12,
            textAlign: 'center',
            maxWidth: isKiosk ? 420 : 320,
            lineHeight: 1.5,
          }}
        >
          Mã tự đổi sau <span className="hr-strong">{remaining}s</span>.
          {isKiosk
            ? ' Mở Bảng công của tôi trên điện thoại → Check-in/Check-out → Quét mã QR này.'
            : ' Nhân viên quét QR hoặc nhập mã 6 số tại màn chấm công.'}
        </p>
      </div>
    </div>
  );
}
