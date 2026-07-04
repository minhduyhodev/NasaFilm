export const ORBIT_ROOM_STATUS = {
  OPEN: 'OPEN',
  CHECKOUT: 'CHECKOUT',
  CLOSED: 'CLOSED',
  EXPIRED: 'EXPIRED',
  CANCELLED: 'CANCELLED',
};

export const ORBIT_STATUS_LABELS = {
  OPEN: 'Đang mở',
  CHECKOUT: 'Thanh toán',
  CLOSED: 'Hoàn tất',
  EXPIRED: 'Hết hạn',
  CANCELLED: 'Đã hủy',
};

export const ORBIT_TERMINAL_STATUSES = ['EXPIRED', 'CANCELLED', 'CLOSED'];

export const ORBIT_CHECKOUT_TTL_MINUTES = 15;

export const ORBIT_DEFAULT_MAX_MEMBERS = 8;

/** Backend already returns Vietnamese messages; use as-is with a safe fallback. */
export function resolveOrbitErrorMessage(err, fallback = 'Không thể thực hiện thao tác Orbit.') {
  const msg = err?.message?.trim();
  return msg || fallback;
}

export function formatOrbitStatus(status) {
  return ORBIT_STATUS_LABELS[status] || status;
}

export function formatShowtimeLabel(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatShowtimeDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  });
}

export function mapSeatTypeName(seatTypeName) {
  if (seatTypeName === 'VIP') return 'Ghế VIP';
  if (seatTypeName === 'COUPLE') return 'Ghế Đôi';
  return 'Ghế Thường';
}

export function buildSelectedFromMap(rows, seatUuids) {
  const wanted = new Set(seatUuids);
  const selected = [];
  (rows || []).forEach((row) => {
    (row.seats || []).forEach((seat) => {
      if (!wanted.has(seat.seatUuid)) return;
      selected.push({
        seatUuid: seat.seatUuid,
        id: `${row.rowName}${seat.seatNumber}`,
        rowName: row.rowName,
        seatNumber: seat.seatNumber,
        price: seat.price,
        type: mapSeatTypeName(seat.seatTypeName),
      });
    });
  });
  return selected;
}

export function resolveSeatLabels(seatUuids, seatRows) {
  if (!seatUuids?.length || !seatRows?.length) return [];
  const byUuid = new Map();
  seatRows.forEach((row) => {
    (row.seats || []).forEach((seat) => {
      byUuid.set(seat.seatUuid, `${row.rowName}${seat.seatNumber}`);
    });
  });
  return seatUuids.map((uuid) => byUuid.get(uuid) || uuid.slice(0, 8));
}

export function parseSeatMapSelection(data) {
  if (!data?.rows) {
    return {
      seatRows: [],
      selectedSeats: [],
      hasGapViolation: false,
      timeLeft: null,
      aisleLayoutConfig: data?.layoutConfig ?? null,
    };
  }

  const offset = data._serverTimeOffset || 0;
  let gapFound = false;
  let expiresAtVal = null;
  const newSelected = [];

  data.rows.forEach((row) => {
    row.seats.forEach((seat) => {
      if (seat.blocked) gapFound = true;
      if (seat.selected || seat.availabilityStatus === 'LOCKED_BY_ME') {
        if (seat.lockedUntil) {
          const seatExpire = new Date(seat.lockedUntil).getTime() - offset;
          if (!expiresAtVal || seatExpire > expiresAtVal) expiresAtVal = seatExpire;
        }
        newSelected.push({
          seatUuid: seat.seatUuid,
          id: `${row.rowName}${seat.seatNumber}`,
          rowName: row.rowName,
          seatNumber: seat.seatNumber,
          price: seat.price,
          type: mapSeatTypeName(seat.seatTypeName),
        });
      }
    });
  });

  let timeLeft = null;
  if (expiresAtVal) {
    const serverTime = data.serverTime ? new Date(data.serverTime).getTime() : Date.now();
    timeLeft = Math.max(0, Math.floor((expiresAtVal - serverTime) / 1000));
  }

  return {
    seatRows: data.rows,
    selectedSeats: newSelected,
    hasGapViolation: gapFound,
    timeLeft,
    aisleLayoutConfig: data.layoutConfig ?? null,
  };
}
