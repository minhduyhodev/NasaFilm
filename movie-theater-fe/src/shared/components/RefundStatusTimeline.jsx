import React from 'react';
import { CheckCircle2, Circle, Loader2, XCircle, Clock } from 'lucide-react';

const statusIcon = (status) => {
  if (status === 'COMPLETED') return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === 'FAILED') return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === 'PENDING') return <Clock className="w-4 h-4 text-amber-400" />;
  if (status === 'PROCESSING') return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />;
  return <Circle className="w-4 h-4 text-gray-500" />;
};

const RefundStatusTimeline = ({ timeline = [], refundStatus }) => {
  if (!timeline?.length && !refundStatus) {
    return (
      <p className="text-sm text-gray-500 py-2">Chưa có thông tin hoàn tiền.</p>
    );
  }

  const items = timeline?.length
    ? timeline
    : [{ status: refundStatus, label: refundStatus, at: null }];

  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li key={`${item.status}-${index}`} className="flex gap-3 items-start">
          <div className="mt-0.5">{statusIcon(item.status)}</div>
          <div>
            <p className="text-sm font-medium text-white">{item.label}</p>
            {item.at && (
              <p className="text-xs text-gray-500">
                {new Date(item.at).toLocaleString('vi-VN')}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
};

export default RefundStatusTimeline;
