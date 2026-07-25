export const ADMIN_SEAT_W = '3rem';
export const ADMIN_SEAT_GAP = '0.375rem';
/** @deprecated dùng grid placement */
export const ADMIN_COUPLE_W = `calc(2 * ${ADMIN_SEAT_W} + ${ADMIN_SEAT_GAP})`;
/** @deprecated dùng grid placement */
export const BOOKING_COUPLE_W = 'calc(44px * 2 + 8px)';

export const isCoupleSeat = (seat) => {
  const type = (seat?.customTypeName || seat?.seatTypeName || '').toLowerCase();
  return type === 'couple' || type.includes('đôi') || type.includes('couple');
};

export const seatItemKey = (seat) => seat?.seatUuid || seat?.uuid;

const isAisleBlockedSeat = (seat, aisleSlotChecker) =>
  seat?.customTypeName === 'AISLE'
  || (typeof aisleSlotChecker === 'function' && aisleSlotChecker(seat));

/** Ghế sofa lẻ — thiếu slot liền kề cùng loại COUPLE */
export const findInvalidCoupleSeats = (allSeats) => {
  const byRow = {};
  (allSeats || []).forEach((seat) => {
    if (!isCoupleSeat(seat)) return;
    const row = seat.rowName || 'A';
    if (!byRow[row]) byRow[row] = [];
    byRow[row].push(seat);
  });

  const invalid = [];
  Object.values(byRow).forEach((rowSeats) => {
    const sorted = [...rowSeats].sort((a, b) => a.seatNumber - b.seatNumber);
    let i = 0;
    while (i < sorted.length) {
      const current = sorted[i];
      const next = sorted[i + 1];
      if (next && next.seatNumber === current.seatNumber + 1) {
        i += 2;
      } else {
        invalid.push(current);
        i += 1;
      }
    }
  });
  return invalid;
};

export const findCouplePartnerCandidate = (seat, rowSeats, aisleSlotChecker = () => false) => {
  if (!seat || !rowSeats?.length) return null;

  const nums = new Set(rowSeats.map((s) => s.seatNumber));
  const candidates = [seat.seatNumber - 1, seat.seatNumber + 1].filter((n) => nums.has(n));

  for (const num of candidates) {
    const partner = rowSeats.find((s) => s.seatNumber === num);
    if (!partner || partner.uuid === seat.uuid) continue;
    if (isAisleBlockedSeat(partner, aisleSlotChecker)) continue;
    if (partner.customTypeName === 'BROKEN' || partner.status === 'DISABLED') continue;
    return partner;
  }
  return null;
};

export const resolveCouplePaintPair = (seat, allSeats, aisleSlotChecker = () => false) => {
  if (!seat) {
    return { ok: false, message: 'Không tìm thấy ghế để tô sofa đôi.' };
  }

  const rowSeats = (allSeats || []).filter((s) => s.rowName === seat.rowName);
  const partner = findCouplePartnerCandidate(seat, rowSeats, aisleSlotChecker);

  if (!partner) {
    return {
      ok: false,
      message: `Không thể đặt sofa đôi tại ${seat.rowName}${seat.seatNumber}: cần 1 slot liền kề (trái/phải) không phải lối đi hoặc ghế hỏng.`,
    };
  }

  if (isAisleBlockedSeat(seat, aisleSlotChecker)) {
    return {
      ok: false,
      message: `Không thể đặt sofa đôi trên ô lối đi ${seat.rowName}${seat.seatNumber}.`,
    };
  }

  return { ok: true, targets: [seat, partner] };
};

export const collectCouplePaintTargets = (seats, allSeats, aisleSlotChecker = () => false) => {
  const uuids = new Set();
  const errors = [];

  (seats || []).forEach((seat) => {
    const result = resolveCouplePaintPair(seat, allSeats, aisleSlotChecker);
    if (result.ok) {
      result.targets.forEach((s) => uuids.add(s.uuid));
    } else {
      errors.push(result.message);
    }
  });

  return { uuids: [...uuids], errors };
};

/** Ghép cặp sofa — cùng thuật toán tăng dần với findInvalidCoupleSeats */
export const buildCoupleRowPairing = (rowSeats, isAisleSeat = () => false) => {
  const couples = (rowSeats || [])
    .filter((s) => isCoupleSeat(s) && !isAisleSeat(s))
    .sort((a, b) => a.seatNumber - b.seatNumber);

  const invalidNums = new Set();
  const pairsByHighNum = new Map();

  let i = 0;
  while (i < couples.length) {
    const current = couples[i];
    const next = couples[i + 1];
    if (next && next.seatNumber === current.seatNumber + 1) {
      pairsByHighNum.set(next.seatNumber, [current, next]);
      i += 2;
    } else {
      invalidNums.add(current.seatNumber);
      i += 1;
    }
  }

  return { invalidNums, pairsByHighNum };
};

export const seatNumberToGridColumn = (seatNumber, maxSeatNumber) =>
  maxSeatNumber - seatNumber + 1;

export const getMaxSeatNumber = (seatsByRow, rowNames) =>
  rowNames.reduce((max, rowName) => {
    (seatsByRow[rowName] || []).forEach((seat) => {
      if (seat.seatNumber > max) max = seat.seatNumber;
    });
    return max;
  }, 0);

/** @deprecated dùng getMaxSeatNumber */
export const getMaxSeatCount = (seatsByRow, rowNames) =>
  getMaxSeatNumber(seatsByRow, rowNames);

export const getMaxGridColumnCount = getMaxSeatNumber;

export const getSeatMapGridStyle = (maxSeatNumber) => ({
  '--seat-map-cols': maxSeatNumber,
});

export const getGridColumnStyle = (gridStart, span = 1) => ({
  gridColumn: `${gridStart} / span ${span}`,
});

/**
 * Đặt ghế theo số cột = seatNumber → ghế đôi luôn span 2, thẳng hàng mọi row.
 */
export const buildRowPlacedItems = (rowSeats, maxSeatNumber, isAisleSeat = () => false) => {
  const items = [];
  const coveredNumbers = new Set();
  const { invalidNums, pairsByHighNum } = buildCoupleRowPairing(rowSeats, isAisleSeat);
  const lowPairNums = new Set(
    [...pairsByHighNum.values()].map(([low]) => low.seatNumber),
  );

  let i = 0;
  while (i < rowSeats.length) {
    const seat = rowSeats[i];

    if (coveredNumbers.has(seat.seatNumber)) {
      i += 1;
      continue;
    }

    const gridStart = seatNumberToGridColumn(seat.seatNumber, maxSeatNumber);

    if (isAisleSeat(seat)) {
      items.push({
        kind: 'aisle',
        seats: [seat],
        gridStart,
        span: 1,
        key: seatItemKey(seat),
      });
      coveredNumbers.add(seat.seatNumber);
      i += 1;
      continue;
    }

    if (isCoupleSeat(seat)) {
      if (invalidNums.has(seat.seatNumber)) {
        items.push({
          kind: 'couple-invalid',
          seats: [seat],
          gridStart,
          span: 1,
          key: `invalid-${seatItemKey(seat)}`,
        });
        coveredNumbers.add(seat.seatNumber);
        i += 1;
        continue;
      }

      const pair = pairsByHighNum.get(seat.seatNumber);
      if (pair) {
        const [low, high] = pair;
        items.push({
          kind: 'couple',
          seats: [low, high],
          gridStart: seatNumberToGridColumn(high.seatNumber, maxSeatNumber),
          span: 2,
          key: `couple-${seatItemKey(low)}-${seatItemKey(high)}`,
        });
        coveredNumbers.add(low.seatNumber);
        coveredNumbers.add(high.seatNumber);
        i += 1;
        continue;
      }

      if (lowPairNums.has(seat.seatNumber)) {
        i += 1;
        continue;
      }
    }

    items.push({
      kind: 'single',
      seats: [seat],
      gridStart,
      span: 1,
      key: seatItemKey(seat),
    });
    coveredNumbers.add(seat.seatNumber);
    i += 1;
  }

  invalidNums.forEach((num) => {
    [num - 1, num + 1].forEach((partnerNum) => {
      if (partnerNum < 1 || partnerNum > maxSeatNumber) return;
      if (coveredNumbers.has(partnerNum)) return;
      if (rowSeats.some((s) => s.seatNumber === partnerNum)) return;

      const ghostKey = `ghost-${partnerNum}`;
      items.push({
        kind: 'couple-invalid-ghost',
        seats: [],
        seatNumber: partnerNum,
        gridStart: seatNumberToGridColumn(partnerNum, maxSeatNumber),
        span: 1,
        key: ghostKey,
      });
      coveredNumbers.add(partnerNum);
    });
  });

  return items;
};

/** @deprecated dùng buildRowPlacedItems */
export const buildRowGridItems = (rowSeats, isAisleSeat) =>
  buildRowPlacedItems(rowSeats, rowSeats.length, isAisleSeat);

export const buildCoupleMergedItems = buildRowPlacedItems;

/** Band ngang trên hàng lối đi — theo cột seatNumber */
export const computeHorizontalBandOverlays = (rowSeats, completeVerticalCols, maxSeatNumber) => {
  const vertSet = new Set(completeVerticalCols || []);
  const overlays = [];
  let runSeats = [];

  const flush = () => {
    if (!runSeats.length) return;
    const nums = runSeats.map((s) => s.seatNumber);
    const high = Math.max(...nums);
    const low = Math.min(...nums);
    overlays.push({
      gridStart: seatNumberToGridColumn(high, maxSeatNumber),
      span: high - low + 1,
    });
    runSeats = [];
  };

  [...rowSeats]
    .sort((a, b) => b.seatNumber - a.seatNumber)
    .forEach((seat) => {
      if (vertSet.has(seat.seatNumber)) {
        flush();
      } else {
        runSeats.push(seat);
      }
    });
  flush();

  return overlays;
};

export const getHorizontalBandOverlayStyle = (overlay) => ({
  left: `calc(${(overlay.gridStart - 1)} * (var(--seat-slot-w) + var(--seat-slot-gap)))`,
  width: `calc(${overlay.span} * var(--seat-slot-w) + ${Math.max(0, overlay.span - 1)} * var(--seat-slot-gap))`,
});

export const getCoupleLabel = (rowName, seats) => {
  if (seats.length === 1) {
    return `${rowName}${seats[0].seatNumber}`;
  }
  const nums = seats.map((s) => s.seatNumber).sort((a, b) => b - a);
  return `${rowName}${nums[0]}·${nums[1]}`;
};

export const isAnySeatSelected = (seats, selectedIds) =>
  seats.some((s) => selectedIds.has(seatItemKey(s)));
