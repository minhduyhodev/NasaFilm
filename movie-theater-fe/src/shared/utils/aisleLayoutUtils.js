/** @typedef {{ version: number, slots: string[] }} AisleLayout */

export const EMPTY_AISLE_LAYOUT = () => ({
  version: 2,
  slots: [],
});

export const slotKey = (rowName, col) => `${rowName}:${col}`;

export const parseLayoutConfig = (raw) => {
  if (!raw) return EMPTY_AISLE_LAYOUT();
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object') return EMPTY_AISLE_LAYOUT();

    if (Array.isArray(parsed.slots)) {
      return { version: 2, slots: [...parsed.slots] };
    }

    if (Array.isArray(parsed.verticalAfterCol)) {
      return migrateLegacyColumns(parsed.verticalAfterCol);
    }

    if (Array.isArray(parsed.vertical) || Array.isArray(parsed.horizontal) || Array.isArray(parsed.diagonal)) {
      return migrateV1Segments(parsed);
    }

    return EMPTY_AISLE_LAYOUT();
  } catch {
    return EMPTY_AISLE_LAYOUT();
  }
};

export const serializeLayoutConfig = (layout) => JSON.stringify({
  version: 2,
  slots: layout.slots ?? [],
});

const migrateLegacyColumns = (columnPositions, rowNames = []) => {
  const layout = EMPTY_AISLE_LAYOUT();
  if (!columnPositions?.length) return layout;
  columnPositions.forEach((col) => {
    rowNames.forEach((row) => {
      layout.slots.push(slotKey(row, col));
    });
  });
  return layout;
};

const migrateV1Segments = (parsed) => {
  const slots = new Set();

  (parsed.vertical || []).forEach((key) => {
    const [row, afterCol] = key.split(':');
    if (row && afterCol) slots.add(slotKey(row, Number(afterCol)));
  });

  (parsed.horizontal || []).forEach((key) => {
    const [row, col] = key.split(':');
    if (row && col) slots.add(slotKey(row, Number(col)));
  });

  (parsed.diagonal || []).forEach((key) => {
    slots.add(key);
  });

  return { version: 2, slots: [...slots] };
};

export const computeDefaultAisleCol = (cols) => {
  if (!cols || cols <= 8) return null;
  return Math.floor(cols / 2) + 1;
};

/**
 * Treat builder "cols" as bookable seats per row.
 * Insert aisle column(s) into the grid so aisles do not reduce bookable count.
 */
export const expandColsForDefaultAisles = (bookableCols, presetId) => {
  const cols = Number(bookableCols) || 0;
  if (cols <= 8) {
    return { gridCols: cols, aisleCols: [] };
  }
  if (presetId === 'imax') {
    const gridCols = cols + 2;
    return {
      gridCols,
      aisleCols: [Math.floor(gridCols / 3) + 1, Math.floor((gridCols * 2) / 3) + 1],
    };
  }
  const gridCols = cols + 1;
  return { gridCols, aisleCols: [Math.floor(gridCols / 2) + 1] };
};

export const buildLayoutFromAisleCols = (aisleCols, rowNames) => {
  const layout = EMPTY_AISLE_LAYOUT();
  (aisleCols || []).forEach((col) => {
    rowNames.forEach((row) => layout.slots.push(slotKey(row, col)));
  });
  return layout;
};

export const buildDefaultLayout = (cols, rowNames, presetId) => {
  const { aisleCols } = expandColsForDefaultAisles(cols, presetId);
  // When cols is already grid size (legacy), fall back to marking mid columns inside cols.
  if (!aisleCols.length) {
    const layout = EMPTY_AISLE_LAYOUT();
    const legacy = [computeDefaultAisleCol(cols)].filter(Boolean);
    legacy.forEach((col) => {
      rowNames.forEach((row) => layout.slots.push(slotKey(row, col)));
    });
    return layout;
  }
  return buildLayoutFromAisleCols(aisleCols, rowNames);
};

export const hasAisleSlot = (layout, rowName, col) =>
  (layout.slots || []).includes(slotKey(rowName, col));

export const addAisleSlots = (layout, keys) => {
  const next = new Set(layout.slots || []);
  keys.forEach((k) => next.add(k));
  return { ...layout, slots: [...next] };
};

export const removeAisleSlots = (layout, keys) => {
  const remove = new Set(keys);
  return {
    ...layout,
    slots: (layout.slots || []).filter((k) => !remove.has(k)),
  };
};

export const toggleAisleSlot = (layout, rowName, col) => {
  const key = slotKey(rowName, col);
  if (hasAisleSlot(layout, rowName, col)) {
    return removeAisleSlots(layout, [key]);
  }
  return addAisleSlots(layout, [key]);
};

export const buildSlotsFromSeatList = (seats) =>
  seats
    .filter((s) => s.customTypeName === 'AISLE')
    .map((s) => slotKey(s.rowName, s.seatNumber));

export const applyAisleSlotsToSeats = (seats, layout) => {
  const slotSet = new Set(layout.slots || []);
  return seats.map((seat) => {
    const key = slotKey(seat.rowName, seat.seatNumber);
    if (slotSet.has(key)) {
      return { ...seat, customTypeName: 'AISLE', status: 'DISABLED' };
    }
    // Seat left the aisle overlay — restore to a sellable default, but keep MAINTENANCE.
    if (seat.customTypeName === 'AISLE') {
      if (seat.status === 'MAINTENANCE') {
        return { ...seat, customTypeName: 'BROKEN', status: 'MAINTENANCE' };
      }
      return { ...seat, customTypeName: 'STANDARD', status: 'ACTIVE' };
    }
    // Never mutate non-aisle statuses (esp. MAINTENANCE / BROKEN).
    return seat;
  });
};

/** Count seats that can actually be sold (exclude aisle + maintenance + disabled). */
export const countBookableSeats = (seats = []) =>
  seats.filter(
    (s) => s.status === 'ACTIVE' && s.customTypeName !== 'AISLE',
  ).length;

export const getRowIndex = (rowName, rowNames) => rowNames.indexOf(rowName);

export const collectDiagonalGroups = (rowNames, seatsByRow) => {
  const mainGroups = new Map();
  const antiGroups = new Map();
  let maxCol = 0;

  rowNames.forEach((row) => {
    (seatsByRow[row] || []).forEach((s) => {
      if (s.seatNumber > maxCol) maxCol = s.seatNumber;
    });
  });

  rowNames.forEach((row) => {
    (seatsByRow[row] || []).forEach((seat) => {
      const rowIndex = getRowIndex(row, rowNames);
      if (rowIndex < 0) return;
      const main = rowIndex + seat.seatNumber;
      const anti = rowIndex + (maxCol - seat.seatNumber + 1);
      if (!mainGroups.has(main)) mainGroups.set(main, []);
      mainGroups.get(main).push({ row, col: seat.seatNumber });
      if (!antiGroups.has(anti)) antiGroups.set(anti, []);
      antiGroups.get(anti).push({ row, col: seat.seatNumber });
    });
  });

  return { mainGroups, antiGroups };
};

export const isVerticalLineComplete = (layout, col, rowNames) =>
  rowNames.length > 0 && rowNames.every((row) => hasAisleSlot(layout, row, col));

export const isHorizontalLineComplete = (layout, rowName, seatsByRow) => {
  const cols = (seatsByRow[rowName] || []).map((s) => s.seatNumber);
  return cols.length > 0 && cols.every((col) => hasAisleSlot(layout, rowName, col));
};

export const getCompleteVerticalCols = (layout, rowNames) => {
  const cols = new Set((layout.slots || []).map((k) => Number(k.split(':')[1])));
  return [...cols].filter((col) => isVerticalLineComplete(layout, col, rowNames));
};

export const getCompleteHorizontalRows = (layout, seatsByRow, rowNames) =>
  rowNames.filter((row) => isHorizontalLineComplete(layout, row, seatsByRow));

/** Kích thước ô ghế trên sơ đồ admin (h-7 + gap-2) */
export const AISLE_ROW_HEIGHT = 28;
export const AISLE_ROW_GAP = 8;
export const AISLE_ROW_STEP = AISLE_ROW_HEIGHT + AISLE_ROW_GAP;

/** Kích thước ô ghế trên trang booking (h-6 + gap-2) */
export const BOOKING_AISLE_ROW_HEIGHT = 24;
export const BOOKING_AISLE_ROW_GAP = 10;
export const BOOKING_AISLE_ROW_STEP = BOOKING_AISLE_ROW_HEIGHT + BOOKING_AISLE_ROW_GAP;

export const getVerticalAisleBandHeight = (rowCount, step = AISLE_ROW_STEP, rowHeight = AISLE_ROW_HEIGHT) =>
  rowCount * step - (step - rowHeight);

export const getVerticalAisleMidRowIndex = (rowNames) =>
  Math.floor((rowNames.length - 1) / 2);

/** Các đoạn hàng liên tiếp không phải lối đi ngang hoàn chỉnh */
export const getNonHorizontalRowSegments = (rowNames, completeHorizontalRows) => {
  const horizSet = new Set(completeHorizontalRows || []);
  const segments = [];
  let start = null;

  rowNames.forEach((row, idx) => {
    if (!horizSet.has(row)) {
      if (start === null) start = idx;
    } else if (start !== null) {
      segments.push({ startIdx: start, endIdx: idx - 1 });
      start = null;
    }
  });

  if (start !== null) {
    segments.push({ startIdx: start, endIdx: rowNames.length - 1 });
  }

  return segments;
};

/** Hàng + đoạn dùng để vẽ band dọc và nhãn (bỏ qua hàng lối đi ngang) */
export const getVerticalAisleLabelRow = (rowNames, completeHorizontalRows = []) => {
  const segments = getNonHorizontalRowSegments(rowNames, completeHorizontalRows);
  if (!segments.length) return null;

  const longest = segments.reduce((best, seg) => {
    const len = seg.endIdx - seg.startIdx;
    const bestLen = best.endIdx - best.startIdx;
    return len > bestLen ? seg : best;
  });

  const rowIdx = Math.floor((longest.startIdx + longest.endIdx) / 2);
  return { rowName: rowNames[rowIdx], rowIdx, segment: longest };
};

export const getVerticalBandStyleForSegment = (segment, anchorIdx, step = AISLE_ROW_STEP, rowHeight = AISLE_ROW_HEIGHT) => ({
  top: `-${(anchorIdx - segment.startIdx) * step}px`,
  height: `${(segment.endIdx - segment.startIdx + 1) * step - (step - rowHeight)}px`,
});

export const getVerticalBandSegmentClasses = (segment, rowNames) => {
  const atTop = segment.startIdx === 0;
  const atBottom = segment.endIdx === rowNames.length - 1;
  return [
    atTop ? 'aisle-band-vertical-segment-top' : '',
    atBottom ? 'aisle-band-vertical-segment-bottom' : '',
  ].filter(Boolean).join(' ');
};

/** Tách hàng lối đi ngang thành đoạn band + ô giao với lối đi dọc */
export const buildHorizontalAisleRowItems = (rowSeats, completeVerticalCols) => {
  const vertSet = new Set(completeVerticalCols || []);
  if (!vertSet.size) {
    return [{ kind: 'band', seats: rowSeats }];
  }

  const items = [];
  let bandRun = [];

  rowSeats.forEach((seat) => {
    if (vertSet.has(seat.seatNumber)) {
      if (bandRun.length) {
        items.push({ kind: 'band', seats: bandRun });
        bandRun = [];
      }
      items.push({ kind: 'crossing', seat });
    } else {
      bandRun.push(seat);
    }
  });

  if (bandRun.length) {
    items.push({ kind: 'band', seats: bandRun });
  }

  return items.length ? items : [{ kind: 'band', seats: rowSeats }];
};

export const isAisleCrossingCell = (rowName, col, completeVerticalCols, completeHorizontalRows) =>
  completeHorizontalRows.includes(rowName)
  && completeVerticalCols.includes(col);

/** Các đoạn hàng liên tiếp có ô lối đi tại cột `col` (bỏ hàng lối đi ngang) */
export const getVerticalAisleSegmentsForCol = (layout, col, rowNames, completeHorizontalRows = []) => {
  const horizSet = new Set(completeHorizontalRows);
  const segments = [];
  let start = null;

  rowNames.forEach((row, idx) => {
    if (hasAisleSlot(layout, row, col) && !horizSet.has(row)) {
      if (start === null) start = idx;
    } else if (start !== null) {
      segments.push({ startIdx: start, endIdx: idx - 1 });
      start = null;
    }
  });

  if (start !== null) {
    segments.push({ startIdx: start, endIdx: rowNames.length - 1 });
  }

  return segments;
};

export const getVerticalCellSegmentInfo = (rowIdx, col, layout, rowNames, completeHorizontalRows = []) => {
  const segments = getVerticalAisleSegmentsForCol(layout, col, rowNames, completeHorizontalRows);
  const segment = segments.find((s) => rowIdx >= s.startIdx && rowIdx <= s.endIdx);
  if (!segment) return null;

  const isTop = rowIdx === segment.startIdx;
  const isBottom = rowIdx === segment.endIdx;
  let role = 'middle';
  if (isTop && isBottom) role = 'single';
  else if (isTop) role = 'top';
  else if (isBottom) role = 'bottom';

  return { role, segment };
};

export const shouldRenderVerticalAisleLabel = (rowName, col, layout, rowNames, completeHorizontalRows = []) => {
  if (!isVerticalLineComplete(layout, col, rowNames)) return false;

  const rowIdx = getRowIndex(rowName, rowNames);
  if (rowIdx < 0 || !hasAisleSlot(layout, rowName, col)) return false;

  const segments = getVerticalAisleSegmentsForCol(layout, col, rowNames, completeHorizontalRows);
  if (!segments.length) return false;

  const longest = segments.reduce((best, seg) => {
    const len = seg.endIdx - seg.startIdx;
    const bestLen = best.endIdx - best.startIdx;
    return len > bestLen ? seg : best;
  });

  const labelRowIdx = Math.floor((longest.startIdx + longest.endIdx) / 2);
  return rowIdx === labelRowIdx;
};

export const getVerticalAisleCellClassName = (role) => {
  const base = 'aisle-band-vertical-cell';
  if (role === 'single') return `${base} aisle-vcell-single`;
  if (role === 'top') return `${base} aisle-vcell-top`;
  if (role === 'bottom') return `${base} aisle-vcell-bottom`;
  return `${base} aisle-vcell-middle`;
};

export const getVerticalLabelOverlayStyle = (
  segment,
  anchorIdx,
  step = AISLE_ROW_STEP,
  rowHeight = AISLE_ROW_HEIGHT,
) => ({
  top: `-${(anchorIdx - segment.startIdx) * step}px`,
  height: `${(segment.endIdx - segment.startIdx + 1) * step - (step - rowHeight)}px`,
});

export const getVerticalAisleCellJoinClass = (role, variant = 'admin') => {
  if (role !== 'middle' && role !== 'bottom') return '';
  return variant === 'booking' ? 'aisle-vcell-join-up--booking' : 'aisle-vcell-join-up--admin';
};

export const getVerticalLabelOverlayStyleForVariant = (segment, anchorIdx, variant = 'admin') =>
  getVerticalLabelOverlayStyle(
    segment,
    anchorIdx,
    variant === 'booking' ? BOOKING_AISLE_ROW_STEP : AISLE_ROW_STEP,
    variant === 'booking' ? BOOKING_AISLE_ROW_HEIGHT : AISLE_ROW_HEIGHT,
  );

export const getAisleLabelAnchors = (layout, seatsByRow, rowNames) => {
  const slots = new Set(layout.slots || []);
  const anchors = new Set();
  const completeVerticalCols = getCompleteVerticalCols(layout, rowNames);
  const completeHorizontalRows = getCompleteHorizontalRows(layout, seatsByRow, rowNames);

  completeVerticalCols.forEach((col) => {
    const segments = getVerticalAisleSegmentsForCol(layout, col, rowNames, completeHorizontalRows);
    if (!segments.length) return;

    const longest = segments.reduce((best, seg) => {
      const len = seg.endIdx - seg.startIdx;
      const bestLen = best.endIdx - best.startIdx;
      return len > bestLen ? seg : best;
    });

    const midIdx = Math.floor((longest.startIdx + longest.endIdx) / 2);
    anchors.add(slotKey(rowNames[midIdx], col));
  });

  completeHorizontalRows.forEach((row) => {
    buildHorizontalAisleRowItems(seatsByRow[row] || [], completeVerticalCols).forEach((item) => {
      if (item.kind !== 'band' || !item.seats.length) return;
      const cols = item.seats.map((s) => s.seatNumber).sort((a, b) => a - b);
      const midCol = cols[Math.floor((cols.length - 1) / 2)];
      anchors.add(slotKey(row, midCol));
    });
  });

  const { mainGroups, antiGroups } = collectDiagonalGroups(rowNames, seatsByRow);
  [...mainGroups.values(), ...antiGroups.values()].forEach((cells) => {
    if (cells.length > 1 && cells.every(({ row, col }) => slots.has(slotKey(row, col)))) {
      const mid = cells[Math.floor((cells.length - 1) / 2)];
      anchors.add(slotKey(mid.row, mid.col));
    }
  });

  return anchors;
};

export const getCompleteDiagonalCellKeys = (layout, seatsByRow, rowNames) => {
  const slots = new Set(layout.slots || []);
  const keys = new Set();
  const { mainGroups, antiGroups } = collectDiagonalGroups(rowNames, seatsByRow);

  [...mainGroups.values(), ...antiGroups.values()].forEach((cells) => {
    if (cells.length > 1 && cells.every(({ row, col }) => slots.has(slotKey(row, col)))) {
      cells.forEach(({ row, col }) => keys.add(slotKey(row, col)));
    }
  });

  return keys;
};

export const partitionRowByAisleSlots = (seatsList, completeVerticalCols) => {
  if (!seatsList?.length || !completeVerticalCols?.length) {
    return [{ seats: seatsList, aisleAfter: null }];
  }

  const sortedCols = [...completeVerticalCols].sort((a, b) => b - a);
  const blocks = [];
  let current = [...seatsList];

  sortedCols.forEach((aisleCol) => {
    const splitIdx = current.findIndex((s) => s.seatNumber < aisleCol);
    if (splitIdx > 0) {
      blocks.unshift({ seats: current.slice(splitIdx), aisleAfter: aisleCol });
      current = current.slice(0, splitIdx);
    } else if (splitIdx === 0) {
      blocks.unshift({ seats: current, aisleAfter: aisleCol });
      current = [];
    }
  });

  if (current.length > 0) {
    blocks.unshift({ seats: current, aisleAfter: null });
  }

  return blocks.length ? blocks : [{ seats: seatsList, aisleAfter: null }];
};
