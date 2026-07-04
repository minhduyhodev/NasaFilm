import React, { useEffect, useMemo, useState } from 'react';
import {
  History,
  Search,
  Ticket,
  MonitorPlay,
  MapPin,
  Gift,
  ChevronRight,
  Receipt,
  Sparkles,
  Calendar,
  Clock,
  CreditCard,
  Popcorn,
  Armchair,
  Building2,
} from 'lucide-react';
import { bookingService } from '../../../shared/services/bookingService';
import RefundDetailModal from '../../../shared/components/RefundDetailModal';
import Pagination from '../../../shared/components/Pagination';
import { maskTicketCode, formatShowtimeDisplay } from '../utils/movieUtils';
import './PurchaseHistoryPanel.css';

const DEFAULT_PAGE_SIZE = 5;

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'theater', label: 'Rạp chiếu' },
  { id: 'online', label: 'Trực tuyến' },
  { id: 'promo', label: 'Ưu đãi' },
];

const parsePrice = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  return parseInt(String(value).replace(/\D/g, ''), 10) || 0;
};

const hasCombo = (combo) =>
  Boolean(combo && !combo.toLowerCase().includes('không kèm') && combo.trim() !== '');

const isTheaterOrder = (item) => (item.bookingType || '').toUpperCase() !== 'ONLINE';
const isOnlineOrder = (item) => (item.bookingType || '').toUpperCase() === 'ONLINE';
const hasPromotion = (item) => Boolean(item.promotionCode);

const countSeats = (seats) => {
  if (!seats || !seats.trim()) return 0;
  return seats.split(',').map((s) => s.trim()).filter(Boolean).length;
};

const statusMeta = (status) => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'CONFIRMED') {
    return { label: 'Thành công', className: 'ph-status--success' };
  }
  if (normalized === 'CANCELLED') {
    return { label: 'Đã hủy', className: 'ph-status--cancelled' };
  }
  if (normalized === 'REFUND_PENDING') {
    return { label: 'Chờ duyệt hoàn tiền', className: 'ph-status--pending' };
  }
  if (normalized === 'REFUND_PROCESSING') {
    return { label: 'Đang hoàn tiền', className: 'ph-status--pending' };
  }
  if (normalized === 'REFUNDED') {
    return { label: 'Đã hoàn tiền', className: 'ph-status--refunded' };
  }
  if (normalized === 'PENDING') {
    return { label: 'Chờ xử lý', className: 'ph-status--pending' };
  }
  return { label: status || 'Không rõ', className: 'ph-status--neutral' };
};

const paymentStatusMeta = (status) => {
  const normalized = (status || '').toUpperCase();
  if (normalized === 'SUCCESS' || normalized === 'PAID') {
    return { label: 'Đã thanh toán', className: 'ph-pay--success' };
  }
  if (normalized === 'FAILED') {
    return { label: 'Thất bại', className: 'ph-pay--failed' };
  }
  if (normalized === 'REFUNDED') {
    return { label: 'Đã hoàn tiền', className: 'ph-pay--success' };
  }
  if (normalized === 'PENDING') {
    return { label: 'Đang xử lý', className: 'ph-pay--pending' };
  }
  return null;
};

const InvoiceDetail = ({ order, onBack, onViewRefund }) => {
  const online = isOnlineOrder(order);
  const status = statusMeta(order.bookingStatus);
  const payStatus = paymentStatusMeta(order.paymentStatus);
  const seatCount = online ? 1 : Math.max(countSeats(order.seats), 1);

  return (
    <div className="ph-invoice-wrap">
      <button type="button" className="ph-back" onClick={onBack}>
        ← Quay lại danh sách
      </button>

      <article className={`ph-invoice${online ? ' ph-invoice--online' : ''}`}>
        <header className="ph-invoice__header">
          <div className="ph-invoice__brand">
            <Receipt size={20} />
            <div>
              <span className="ph-invoice__brand-name">NASA Cinema</span>
              <span className="ph-invoice__brand-sub">Hóa đơn điện tử</span>
            </div>
          </div>
          <span className={`ph-status ${status.className}`}>{status.label}</span>
        </header>

        <div className="ph-invoice__perforation" aria-hidden="true" />

        <section className="ph-invoice__hero">
          <div className={`ph-invoice__type${online ? ' ph-invoice__type--online' : ''}`}>
            {online ? <MonitorPlay size={22} /> : <Ticket size={22} />}
          </div>
          <div className="ph-invoice__hero-text">
            <h3>{order.movieTitle}</h3>
            <p>{online ? 'Vé xem trực tuyến' : 'Vé rạp chiếu'}</p>
          </div>
        </section>

        <div className="ph-invoice__code">
          <span>Mã giao dịch</span>
          <strong className="ph-mono">{maskTicketCode(order.ticketCode)}</strong>
        </div>

        <section className="ph-invoice__section">
          <h4>Thông tin đặt vé</h4>
          <dl className="ph-invoice__grid">
            <div className="ph-invoice__item">
              <dt><Building2 size={14} /> Rạp / Nền tảng</dt>
              <dd>{order.cinemaName}</dd>
            </div>
            {!online && order.roomName && (
              <div className="ph-invoice__item">
                <dt><MapPin size={14} /> Phòng chiếu</dt>
                <dd>{order.roomName}</dd>
              </div>
            )}
            <div className="ph-invoice__item">
              <dt><Calendar size={14} /> {online ? 'Ngày mua' : 'Suất chiếu'}</dt>
              <dd>{order.showtime || order.purchasedAt || '—'}</dd>
            </div>
            <div className="ph-invoice__item">
              <dt><Clock size={14} /> Thời gian giao dịch</dt>
              <dd>{order.purchasedAt || '—'}</dd>
            </div>
            {!online && (
              <div className="ph-invoice__item">
                <dt><Armchair size={14} /> Ghế ({seatCount})</dt>
                <dd>{order.seats || '—'}</dd>
              </div>
            )}
            <div className="ph-invoice__item">
              <dt><Popcorn size={14} /> Đồ ăn & nước</dt>
              <dd>{order.combo || 'Không kèm bắp nước'}</dd>
            </div>
          </dl>
        </section>

        {order.promotionCode && (
          <section className="ph-invoice__promo">
            <Gift size={16} />
            <div>
              <span className="ph-invoice__promo-label">Ưu đãi đã áp dụng</span>
              <strong>{order.promotionCode}</strong>
              {order.promotionDescription && (
                <p>{order.promotionDescription}</p>
              )}
            </div>
          </section>
        )}

        <div className="ph-invoice__perforation ph-invoice__perforation--dashed" aria-hidden="true" />

        <section className="ph-invoice__section">
          <h4>Thanh toán</h4>
          <dl className="ph-invoice__grid">
            <div className="ph-invoice__item">
              <dt><CreditCard size={14} /> Phương thức</dt>
              <dd>{order.paymentMethod || 'Ví NASA'}</dd>
            </div>
            {payStatus && (
              <div className="ph-invoice__item">
                <dt>Trạng thái TT</dt>
                <dd>
                  <span className={`ph-pay-badge ${payStatus.className}`}>
                    {payStatus.label}
                  </span>
                </dd>
              </div>
            )}
            <div className="ph-invoice__item ph-invoice__item--qty">
              <dt>Số lượng vé</dt>
              <dd>{seatCount}</dd>
            </div>
          </dl>
        </section>

        <footer className="ph-invoice__total">
          <span>Tổng thanh toán</span>
          <strong>{order.totalPrice}</strong>
        </footer>

        <p className="ph-invoice__note">
          Cảm ơn bạn đã sử dụng dịch vụ NASA Cinema. Hóa đơn này có giá trị tra cứu giao dịch.
        </p>
        {['CANCELLED', 'REFUNDED', 'REFUND_PENDING', 'REFUND_PROCESSING'].includes(
          (order.bookingStatus || '').toUpperCase()
        ) && order.bookingUuid && (
          <button
            type="button"
            className="ph-refund-btn"
            onClick={() => onViewRefund?.(order.bookingUuid)}
          >
            Xem trạng thái hoàn tiền
          </button>
        )}
      </article>
    </div>
  );
};

const PurchaseHistoryPanel = () => {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [refundBookingUuid, setRefundBookingUuid] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await bookingService.getPurchaseHistory();
        if (active) setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        if (active) {
          setOrders([]);
          setError(err?.message || 'Không thể tải lịch sử mua hàng.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return orders.filter((item) => {
      if (filter === 'theater' && !isTheaterOrder(item)) return false;
      if (filter === 'online' && !isOnlineOrder(item)) return false;
      if (filter === 'promo' && !hasPromotion(item)) return false;

      if (!keyword) return true;
      const haystack = [
        item.ticketCode,
        item.movieTitle,
        item.cinemaName,
        item.roomName,
        item.promotionCode,
        item.bookingUuid,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [orders, filter, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage) || 1);
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredOrders.length, itemsPerPage, currentPage]);

  const stats = useMemo(() => {
    const totalSpend = orders.reduce((sum, item) => sum + parsePrice(item.totalPrice), 0);
    const ticketCount = orders.reduce((sum, item) => {
      if (isOnlineOrder(item)) return sum + 1;
      return sum + Math.max(countSeats(item.seats), 1);
    }, 0);
    const promoCount = orders.filter(hasPromotion).length;
    const comboCount = orders.filter((item) => hasCombo(item.combo)).length;
    return { totalSpend, ticketCount, promoCount, comboCount };
  }, [orders]);

  return (
    <div className="ph-panel">
      <div className="panel-header ph-panel__intro">
        <div>
          <h2>Lịch sử mua hàng</h2>
          <p className="ph-panel__subtitle">
            Theo dõi giao dịch vé rạp, xem online và ưu đãi đã áp dụng
          </p>
        </div>
      </div>

      <section className="ph-stats">
        <article className="ph-stat ph-stat--gold">
          <span className="ph-stat__label">Tổng chi tiêu</span>
          <strong>{stats.totalSpend.toLocaleString('vi-VN')}đ</strong>
        </article>
        <article className="ph-stat ph-stat--red">
          <span className="ph-stat__label">Số lượng vé</span>
          <strong>{stats.ticketCount}</strong>
        </article>
        <article className="ph-stat ph-stat--amber">
          <span className="ph-stat__label">Có combo</span>
          <strong>{stats.comboCount}</strong>
        </article>
        <article className="ph-stat ph-stat--purple">
          <span className="ph-stat__label">Dùng ưu đãi</span>
          <strong>{stats.promoCount}</strong>
        </article>
      </section>

      <div className="ph-toolbar">
        <div className="ph-filters">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`ph-filter-btn${filter === item.id ? ' is-active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="ph-search">
          <Search size={14} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm phim, mã vé, rạp, mã ưu đãi..."
          />
        </div>
      </div>

      <div className="ph-body">
        {isLoading ? (
          <div className="ph-state">
            <div className="ph-spinner" />
            <p>Đang tải lịch sử giao dịch...</p>
          </div>
        ) : error ? (
          <div className="ph-state ph-state--error">
            <p>{error}</p>
          </div>
        ) : selected ? (
          <InvoiceDetail
            order={selected}
            onBack={() => setSelected(null)}
            onViewRefund={setRefundBookingUuid}
          />
        ) : filteredOrders.length === 0 ? (
          <div className="ph-state">
            <History size={40} />
            <p>Không tìm thấy giao dịch phù hợp</p>
          </div>
        ) : (
          <div className="ph-list">
            {paginatedOrders.map((item) => {
              const status = statusMeta(item.bookingStatus);
              const online = isOnlineOrder(item);
              return (
                <button
                  key={item.bookingUuid || item.ticketCode}
                  type="button"
                  className="ph-card"
                  onClick={() => setSelected(item)}
                >
                  <div className={`ph-card__icon${online ? ' ph-card__icon--online' : ''}`}>
                    {online ? <MonitorPlay size={18} /> : <Ticket size={18} />}
                  </div>

                  <div className="ph-card__main">
                    <div className="ph-card__top">
                      <h4>{item.movieTitle}</h4>
                      <span className={`ph-status ${status.className}`}>{status.label}</span>
                    </div>
                    <p className="ph-card__meta">
                      <MapPin size={12} />
                      {item.cinemaName}
                      {item.roomName ? ` · ${item.roomName}` : ''}
                    </p>
                    <p className="ph-card__meta ph-card__meta--muted">
                      {formatShowtimeDisplay(item.showtime || item.purchasedAt)}
                      {' · '}
                      <span className="ph-mono">{maskTicketCode(item.ticketCode)}</span>
                    </p>
                    {item.promotionCode && (
                      <p className="ph-card__promo">
                        <Sparkles size={12} />
                        Ưu đãi: {item.promotionCode}
                      </p>
                    )}
                  </div>

                  <div className="ph-card__side">
                    <strong>{item.totalPrice}</strong>
                    <span className="ph-card__cta">
                      Chi tiết <ChevronRight size={14} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!isLoading && !error && !selected && filteredOrders.length > 0 && (
        <div className="ph-pagination">
          <Pagination
            currentPage={currentPage}
            totalItems={filteredOrders.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
            itemsPerPageOptions={[5, 10, 20]}
          />
        </div>
      )}
      <RefundDetailModal
        bookingUuid={refundBookingUuid}
        open={Boolean(refundBookingUuid)}
        onClose={() => setRefundBookingUuid(null)}
      />
    </div>
  );
};

export default PurchaseHistoryPanel;
