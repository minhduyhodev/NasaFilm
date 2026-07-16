import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, BellRing, Calendar, Trash2 } from 'lucide-react';
import PosterImage from '../../../shared/components/PosterImage';
import { notificationService } from '../../../shared/services/notificationService';
import {
  loadMovieReminders,
  removeMovieReminder,
  saveMovieReminders,
  REMINDERS_UPDATED_EVENT,
} from '../utils/movieReminderUtils';
import { useConfirm } from '../../../shared/context/ConfirmDialogContext';

const RemindersPage = () => {
  const confirm = useConfirm();
  const [reminders, setReminders] = useState(loadMovieReminders);

  const refresh = useCallback(() => {
    setReminders(loadMovieReminders());
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(REMINDERS_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(REMINDERS_UPDATED_EVENT, refresh);
  }, [refresh]);

  const handleRemove = async (movieUuid, title) => {
    const ok = await confirm({
      title: 'Hủy nhắc hẹn',
      message: 'Bạn có chắc muốn hủy nhắc hẹn suất chiếu cho phim này?',
      highlight: title || 'Phim đã chọn',
      confirmLabel: 'Hủy nhắc hẹn',
      variant: 'warning',
    });
    if (!ok) return;

    const next = removeMovieReminder(movieUuid, reminders);
    setReminders(next);
    saveMovieReminders(next);
    notificationService.info(`Đã hủy nhắc nhở cho "${title || 'phim này'}"`);
  };

  const activeReminders = reminders.filter((item) => !item.notified);
  const pastReminders = reminders.filter((item) => item.notified);

  return (
    <div className="text-white min-h-screen bg-[#0b0f19]">

      <main className="pt-28 pb-16 px-4 md:px-8 lg:px-20">
        <div className="max-w-3xl mx-auto">
          <div className="mb-10">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-red-500">Tài khoản</span>
            <h1 className="mt-2 text-3xl md:text-4xl font-black uppercase font-heading">Nhắc Hẹn Suất Chiếu</h1>
            <p className="mt-3 text-sm text-gray-400">
              Danh sách phim bạn đã đặt nhắc. Hệ thống sẽ thông báo khi đến giờ công chiếu hoặc suất sớm nhất.
            </p>
          </div>

          {activeReminders.length === 0 ? (
            <div className="rounded-[28px] border border-white/5 bg-[#111216]/60 p-10 text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-600 mb-4" />
              <h2 className="text-lg font-black uppercase">Chưa có nhắc hẹn</h2>
              <p className="mt-2 text-sm text-gray-400">
                Bấm &quot;Nhắc Tôi&quot; tại mục Phim Sắp Chiếu trên trang chủ để thêm nhắc nhở.
              </p>
              <Link
                to="/"
                className="inline-block mt-6 rounded-full bg-red-600 hover:bg-red-700 px-6 py-3 text-xs font-black uppercase tracking-wider transition-colors"
              >
                Về trang chủ
              </Link>
            </div>
          ) : (
            <ul className="space-y-4">
              {activeReminders.map((item) => (
                <li
                  key={item.movieUuid}
                  className="flex gap-4 rounded-[24px] border border-white/5 bg-[#111216]/60 p-4 md:p-5"
                >
                  <Link
                    to={`/movie/${item.movieUuid}`}
                    className="shrink-0 w-20 md:w-24 aspect-[2/3] rounded-xl overflow-hidden bg-[#1a1d24]"
                  >
                    {item.posterUrl ? (
                      <PosterImage
                        src={item.posterUrl}
                        alt={item.title}
                        width={120}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-600">
                        <BellRing className="h-8 w-8" />
                      </div>
                    )}
                  </Link>

                  <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                    <div>
                      <Link
                        to={`/movie/${item.movieUuid}`}
                        className="text-lg font-black uppercase hover:text-red-400 transition-colors line-clamp-2"
                      >
                        {item.title || 'Phim sắp chiếu'}
                      </Link>
                      {item.remindLabel && (
                        <p className="mt-1 flex items-center gap-2 text-xs text-gray-400">
                          <Calendar className="h-3.5 w-3.5 shrink-0" />
                          <span>Nhắc lúc: {item.remindLabel}</span>
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.movieUuid, item.title)}
                      className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hủy nhắc
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {pastReminders.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] text-gray-500 mb-4">Đã thông báo</h2>
              <ul className="space-y-3 opacity-60">
                {pastReminders.map((item) => (
                  <li
                    key={`past-${item.movieUuid}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-[#111216]/40 px-4 py-3 text-sm"
                  >
                    <span className="font-bold truncate">{item.title || item.movieUuid}</span>
                    <span className="text-xs text-gray-500 shrink-0">{item.remindLabel || '—'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default RemindersPage;
