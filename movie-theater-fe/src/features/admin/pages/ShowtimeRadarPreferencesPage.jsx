import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, PowerOff, Radar, Search } from 'lucide-react';
import { adminShowtimeRadarService } from '../api/adminShowtimeRadarService';
import { notificationService } from '../../../shared/services/notificationService';
import Pagination from '../../../shared/components/Pagination';
import { AdminPage, PageHeader } from '../components';
import { adminFilterSelectClass } from '../components/adminFormStyles';
import './ShowtimeRadarPreferencesPage.css';

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ShowtimeRadarPreferencesPage = () => {
  const [allPreferences, setAllPreferences] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [enabledFilter, setEnabledFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminShowtimeRadarService.getPreferences();
      setAllPreferences(Array.isArray(data) ? data : []);
    } catch (error) {
      notificationService.error(error.message || 'Không thể tải sở thích Radar.');
      setAllPreferences([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, enabledFilter]);

  const stats = useMemo(
    () => ({
      total: allPreferences.length,
      disabled: allPreferences.filter((item) => !item.enabled).length,
    }),
    [allPreferences],
  );

  const filteredPreferences = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return allPreferences.filter((item) => {
      const matchesEnabled =
        enabledFilter === 'all'
        || (enabledFilter === 'on' && item.enabled)
        || (enabledFilter === 'off' && !item.enabled);
      if (!matchesEnabled) return false;
      if (!normalizedSearch) return true;
      const email = (item.userEmail ?? '').toLowerCase();
      const fullName = (item.userFullName ?? '').toLowerCase();
      return email.includes(normalizedSearch) || fullName.includes(normalizedSearch);
    });
  }, [allPreferences, enabledFilter, searchQuery]);

  const paginatedPreferences = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPreferences.slice(start, start + itemsPerPage);
  }, [filteredPreferences, currentPage, itemsPerPage]);

  const emptyMessage = allPreferences.length === 0
    ? 'Chưa có khách hàng nào lưu sở thích Smart Showtime Radar.'
    : 'Không tìm thấy sở thích phù hợp bộ lọc.';

  return (
    <AdminPage>
      <PageHeader
        title="Sở thích Smart Showtime Radar"
        description="Dữ liệu từ bảng showtime_radar_preference — xem thể loại và trạng thái Radar của khách hàng."
      />

      <div className="adm-kpi-grid mb-6">
        {[
          {
            label: 'Tổng cấu hình',
            value: stats.total,
            Icon: Radar,
            valueColor: 'text-white',
            iconColor: 'text-sky-400',
          },
          {
            label: 'Đang tắt',
            value: stats.disabled,
            Icon: PowerOff,
            valueColor: 'text-slate-400',
            iconColor: 'text-slate-400',
          },
        ].map(({ label, value, Icon, valueColor, iconColor }) => (
          <div key={label} className="adm-kpi-card flex items-center justify-between gap-3">
            <div>
              <span className="adm-kpi-card__label">{label}</span>
              <span className={`adm-kpi-card__value ${valueColor}`}>{value}</span>
            </div>
            <div className={`p-2.5 rounded-xl bg-[#1a2238]/60 border border-[#2c3b5e]/30 ${iconColor}`}>
              <Icon className="w-5 h-5" />
            </div>
          </div>
        ))}
      </div>

      <div className="radar-prefs-page__toolbar">
        <div className="radar-prefs-page__search">
          <Search className="h-4 w-4 text-slate-500 shrink-0" />
          <input
            type="search"
            placeholder="Tìm theo tên hoặc email khách hàng..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
        <select
          className={adminFilterSelectClass}
          value={enabledFilter}
          onChange={(event) => setEnabledFilter(event.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="on">Đang bật Radar</option>
          <option value="off">Đang tắt Radar</option>
        </select>
      </div>

      <div className="radar-prefs-page__table-wrap">
        {isLoading ? (
          <div className="radar-prefs-page__empty">
            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
            Đang tải danh sách sở thích...
          </div>
        ) : filteredPreferences.length === 0 ? (
          <div className="radar-prefs-page__empty">
            <Radar className="mx-auto mb-2 h-5 w-5 text-sky-400 opacity-70" />
            {emptyMessage}
          </div>
        ) : (
          <table className="radar-prefs-page__table">
            <thead>
              <tr>
                <th>Khách hàng</th>
                <th>Radar</th>
                <th>Thể loại</th>
                <th>Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPreferences.map((item) => (
                <tr key={item.userUuid}>
                  <td>
                    <div className="radar-prefs-page__user-name">
                      {item.userFullName || '—'}
                    </div>
                    <div className="radar-prefs-page__user-email">{item.userEmail || '—'}</div>
                  </td>
                  <td>
                    <span
                      className={`radar-prefs-page__badge ${
                        item.enabled
                          ? 'radar-prefs-page__badge--on'
                          : 'radar-prefs-page__badge--off'
                      }`}
                    >
                      {item.enabled ? 'Đang bật' : 'Đang tắt'}
                    </span>
                  </td>
                  <td>
                    <div className="radar-prefs-page__chips">
                      {(item.genreNames ?? []).length > 0 ? (
                        item.genreNames.map((name) => (
                          <span key={`${item.userUuid}-${name}`} className="radar-prefs-page__chip">
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="radar-prefs-page__chip radar-prefs-page__chip--muted">
                          Chưa chọn
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{formatDateTime(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && filteredPreferences.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalItems={filteredPreferences.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
        />
      )}
    </AdminPage>
  );
};

export default ShowtimeRadarPreferencesPage;
