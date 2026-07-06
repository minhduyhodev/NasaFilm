import React from 'react';
import { Sparkles } from 'lucide-react';

const formatStatusLabel = (status) => {
  if (status === 'VALID') return 'Hợp lệ';
  if (status === 'ALREADY_USED') return 'Đã soát';
  return status;
};

const StaffCheckInSessionHistory = ({ items = [], active = false }) => (
  <section className={`staff-control__panel staff-control__panel--history ${active ? 'staff-control__panel--live' : ''}`}>
    <h2 className="staff-control__panel-title">
      <Sparkles className="w-3.5 h-3.5" />
      Lịch sử soát vé phiên làm việc
    </h2>

    {items.length === 0 ? (
      <p className="staff-control__empty py-4">Chưa có vé nào được soát trong phiên này</p>
    ) : (
      <div className="staff-control__history-scroll">
        <table className="staff-control__history-table">
          <thead>
            <tr>
              <th>Mã vé</th>
              <th>Phim</th>
              <th>Ghế</th>
              <th>Thời gian</th>
              <th>Trạng thái</th>
              <th className="text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={`${item.code}-${item.checkedInAt}-${idx}`}>
                <td className="font-mono font-bold text-slate-300">{item.code}</td>
                <td className="font-bold text-white max-w-[200px] truncate">{item.movieTitle}</td>
                <td className="text-red-400 font-extrabold">{item.seats}</td>
                <td>{new Date(item.checkedInAt).toLocaleTimeString('vi-VN')}</td>
                <td>
                  <span className={`staff-control__history-badge ${item.status === 'VALID' ? 'staff-control__history-badge--ok' : 'staff-control__history-badge--err'}`}>
                    {formatStatusLabel(item.status)}
                  </span>
                </td>
                <td className="text-right truncate max-w-[200px]">{item.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

export default StaffCheckInSessionHistory;
