import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import {
  buildRowPlacedItems,
  getCoupleLabel,
  getSeatMapGridStyle,
  getGridColumnStyle,
  seatNumberToGridColumn,
  computeHorizontalBandOverlays,
  getHorizontalBandOverlayStyle,
  getMaxSeatNumber,
} from '../../utils/seatMapDisplay';
import {
  parseLayoutConfig,
  hasAisleSlot,
  slotKey,
  getAisleLabelAnchors,
  getCompleteVerticalCols,
  getCompleteHorizontalRows,
  getCompleteDiagonalCellKeys,
} from '../../utils/aisleLayoutUtils';
import {
  AISLE_LABEL,
  isInCompleteVerticalCol,
  renderVerticalAisleCellProps,
} from '../aisle/aisleMapRender';
import './SeatMapGrid.css';
import './LiveSeatMapView.css';
import '../aisle/AisleMapStyles.css';
import '../../../features/home/pages/BookingPage.css';

const normalizeSeatType = (seatTypeName = '') => {
  const type = seatTypeName.toLowerCase();
  if (type.includes('thường') || type.includes('standard') || type.includes('regular')) {
    return 'standard';
  }
  if (type.includes('vip')) return 'vip';
  if (type.includes('đôi') || type.includes('couple')) return 'couple';
  return 'standard';
};

/** Staff monitoring: sold / checked-in / held / available */
const resolveStaffSeatState = (seat) => {
  const status = seat?.availabilityStatus;
  if (status === 'BOOKED') {
    return seat?.checkedIn ? 'checked-in' : 'sold';
  }
  if (status === 'LOCKED_BY_OTHER' || status === 'LOCKED_BY_ME') {
    return 'held';
  }
  if (status === 'UNAVAILABLE') {
    return 'unavailable';
  }
  return 'available';
};

const staffStateLabel = {
  available: 'Trống',
  sold: 'Đã mua · chưa soát',
  'checked-in': 'Đã soát',
  held: 'Đang giữ',
  unavailable: 'Không bán',
};

const isSeatOccupiedBooking = (seat) =>
  seat.availabilityStatus === 'BOOKED'
  || seat.availabilityStatus === 'LOCKED_BY_OTHER'
  || seat.availabilityStatus === 'UNAVAILABLE';

const isSeatHeldBooking = (seat) => seat.availabilityStatus === 'LOCKED_BY_ME';

const renderBookingSeat = (seat) => {
  const occupied = isSeatOccupiedBooking(seat);
  const held = isSeatHeldBooking(seat);
  const type = normalizeSeatType(seat.seatTypeName || '');

  let seatClass = `seat ${type} relative z-[1] w-full h-full pointer-events-none`;
  if (occupied) seatClass += ' occupied';
  else if (held) seatClass += ' selected';

  return (
    <div
      key={seat.seatUuid}
      className={seatClass}
      title={`${seat.seatTypeName || ''} · ${seat.availabilityStatus}`}
    >
      {occupied ? <X className="h-3 w-3" /> : seat.seatNumber}
    </div>
  );
};

const renderStaffSeat = (seat) => {
  const type = normalizeSeatType(seat.seatTypeName || '');
  const state = resolveStaffSeatState(seat);
  const seatClass = `seat ${type} staff-seat staff-seat--${state} relative z-[1] w-full h-full pointer-events-none`;

  return (
    <div
      key={seat.seatUuid}
      className={seatClass}
      title={`${seat.seatTypeName || 'Ghế'} · ${staffStateLabel[state]}`}
    >
      {state === 'checked-in' ? (
        <Check className="h-3 w-3" strokeWidth={3} />
      ) : (
        seat.seatNumber
      )}
    </div>
  );
};

const renderBookingCouple = (seats, rowName) => {
  const occupied = seats.some(isSeatOccupiedBooking);
  const held = seats.some(isSeatHeldBooking);
  const label = getCoupleLabel(rowName, seats).replace(rowName, '');

  let seatClass = 'seat couple relative z-[1] w-full h-full pointer-events-none';
  if (occupied) seatClass += ' occupied';
  else if (held) seatClass += ' selected';

  return (
    <div
      key={seats.map((s) => s.seatUuid).join('-')}
      className={seatClass}
      title={`Sofa đôi ${getCoupleLabel(rowName, seats)}`}
    >
      {occupied ? <X className="h-3 w-3" /> : label}
    </div>
  );
};

const renderStaffCouple = (seats, rowName) => {
  const states = seats.map(resolveStaffSeatState);
  let state = 'available';
  if (states.some((s) => s === 'checked-in')) state = 'checked-in';
  else if (states.some((s) => s === 'sold')) state = 'sold';
  else if (states.some((s) => s === 'held')) state = 'held';
  else if (states.some((s) => s === 'unavailable')) state = 'unavailable';

  const label = getCoupleLabel(rowName, seats).replace(rowName, '');
  const seatClass = `seat couple staff-seat staff-seat--${state} relative z-[1] w-full h-full pointer-events-none`;

  return (
    <div
      key={seats.map((s) => s.seatUuid).join('-')}
      className={seatClass}
      title={`Sofa đôi ${getCoupleLabel(rowName, seats)} · ${staffStateLabel[state]}`}
    >
      {state === 'checked-in' ? <Check className="h-3 w-3" strokeWidth={3} /> : label}
    </div>
  );
};

const BookingLegend = () => (
  <>
    <div className="flex items-center gap-2">
      <div className="w-8 h-5 border-2 border-white/25 rounded-lg bg-transparent flex items-center justify-center text-[8px] font-bold text-zinc-500">1</div>
      <span className="text-[10px] font-bold text-gray-400">Ghế thường</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-8 h-5 border-2 border-yellow-500/35 rounded-lg bg-transparent flex items-center justify-center text-[8px] font-bold text-yellow-500/70">1</div>
      <span className="text-[10px] font-bold text-gray-400">VIP</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="seat couple opacity-80 pointer-events-none flex items-center justify-center text-[8px] font-bold w-[calc(2rem*2+0.35rem)] h-5">12·11</div>
      <span className="text-[10px] font-bold text-gray-400">Ghế đôi</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-8 h-5 bg-white/5 border-2 border-red-500/20 rounded-lg flex items-center justify-center text-red-500/25 opacity-60">
        <X className="h-3 w-3" />
      </div>
      <span className="text-[10px] font-bold text-gray-400">Đã đặt</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-8 h-5 bg-white border border-white rounded-lg flex items-center justify-center text-[8px] font-bold text-black">1</div>
      <span className="text-[10px] font-bold text-gray-400">Đang giữ</span>
    </div>
  </>
);

const StaffLegend = () => (
  <>
    <div className="flex items-center gap-2">
      <div className="w-8 h-5 border-2 border-white/30 rounded-lg bg-transparent flex items-center justify-center text-[8px] font-bold text-zinc-300">1</div>
      <span className="text-[10px] font-bold text-gray-400">Chưa mua</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-8 h-5 rounded-lg staff-legend-swatch staff-legend-swatch--sold flex items-center justify-center text-[8px] font-bold">1</div>
      <span className="text-[10px] font-bold text-gray-400">Đã mua · chưa soát</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-8 h-5 rounded-lg staff-legend-swatch staff-legend-swatch--checked flex items-center justify-center">
        <Check className="h-3 w-3" strokeWidth={3} />
      </div>
      <span className="text-[10px] font-bold text-gray-400">Đã soát</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-8 h-5 rounded-lg staff-legend-swatch staff-legend-swatch--held flex items-center justify-center text-[8px] font-bold">1</div>
      <span className="text-[10px] font-bold text-gray-400">Đang giữ</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-8 h-5 border-2 border-yellow-500/40 rounded-lg bg-transparent flex items-center justify-center text-[8px] font-bold text-yellow-500/80">1</div>
      <span className="text-[10px] font-bold text-gray-400">VIP</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="seat couple opacity-90 pointer-events-none flex items-center justify-center text-[8px] font-bold w-[calc(2rem*2+0.35rem)] h-5">12·11</div>
      <span className="text-[10px] font-bold text-gray-400">Ghế đôi</span>
    </div>
  </>
);

/**
 * @param {'booking' | 'staff'} variant
 *  - booking: customer booking map (sold seats dimmed with X)
 *  - staff: gate control map (sold / checked-in / held clearly visible)
 */
const LiveSeatMapView = ({
  rows = [],
  layoutConfig = null,
  showLegend = true,
  compact = false,
  variant = 'booking',
}) => {
  const isStaff = variant === 'staff';
  const aisleLayout = useMemo(() => parseLayoutConfig(layoutConfig), [layoutConfig]);

  const seatsByRow = useMemo(() => {
    const map = {};
    rows.forEach((rowItem) => {
      map[rowItem.rowName] = [...(rowItem.seats || [])].sort(
        (a, b) => (b.seatNumber || 0) - (a.seatNumber || 0),
      );
    });
    return map;
  }, [rows]);

  const rowNames = useMemo(
    () => rows.map((r) => r.rowName).sort(),
    [rows],
  );

  const maxSeatNumber = useMemo(
    () => getMaxSeatNumber(seatsByRow, rowNames),
    [seatsByRow, rowNames],
  );

  const aisleLabelAnchors = useMemo(
    () => getAisleLabelAnchors(aisleLayout, seatsByRow, rowNames),
    [aisleLayout, seatsByRow, rowNames],
  );

  const completeHorizontalRows = useMemo(
    () => getCompleteHorizontalRows(aisleLayout, seatsByRow, rowNames),
    [aisleLayout, seatsByRow, rowNames],
  );

  const completeVerticalCols = useMemo(
    () => getCompleteVerticalCols(aisleLayout, rowNames),
    [aisleLayout, rowNames],
  );

  const completeDiagonalCells = useMemo(
    () => getCompleteDiagonalCellKeys(aisleLayout, seatsByRow, rowNames),
    [aisleLayout, seatsByRow, rowNames],
  );

  if (!rows.length || maxSeatNumber <= 0) {
    return <p className="text-sm text-gray-500 text-center py-8">Chưa có sơ đồ ghế cho suất này.</p>;
  }

  const renderSeat = isStaff ? renderStaffSeat : renderBookingSeat;
  const renderCouple = isStaff ? renderStaffCouple : renderBookingCouple;

  return (
    <div className={`live-seat-map ${compact ? 'live-seat-map--compact' : ''} ${isStaff ? 'live-seat-map--staff' : ''}`}>
      <div className={`live-seat-map__screen ${compact ? 'live-seat-map__screen--compact' : ''}`}>
        <div className="screen-curve relative mx-auto w-3/4 h-2 bg-gradient-to-b from-white/45 to-transparent rounded-[50%] screen-glow" />
        <p className="text-[10px] font-bold text-gray-400 mt-3 tracking-widest uppercase">
          Màn hình chính
        </p>
      </div>

      <div className="flex flex-col gap-2.5 overflow-x-auto overflow-y-visible w-full items-center pb-2 py-4 scrollbar-hide select-none">
        {rowNames.map((row) => {
          const seatsList = seatsByRow[row] || [];
          const isFullHorizontalAisle = completeHorizontalRows.includes(row);

          return (
            <div key={row} className="flex items-center gap-2 mb-1 justify-center min-w-max">
              <div className="w-6 text-center text-[10px] font-bold text-gray-500">{row}</div>

              {isFullHorizontalAisle ? (
                <div
                  className="seat-map-grid seat-map-grid--booking"
                  style={getSeatMapGridStyle(maxSeatNumber)}
                >
                  {(() => {
                    const bandOverlays = computeHorizontalBandOverlays(
                      seatsList,
                      completeVerticalCols,
                      maxSeatNumber,
                    );
                    const labelOverlayIdx = bandOverlays.length
                      ? bandOverlays.reduce(
                        (bestIdx, overlay, idx, arr) => (
                          overlay.span > arr[bestIdx].span ? idx : bestIdx
                        ),
                        0,
                      )
                      : -1;

                    return (
                      <>
                        {bandOverlays.map((overlay, idx) => (
                          <div
                            key={`h-band-${overlay.gridStart}`}
                            className="seat-map-h-band aisle-band-complete aisle-band-horizontal-segment"
                            style={getHorizontalBandOverlayStyle(overlay)}
                          >
                            {idx === labelOverlayIdx && (
                              <span className="aisle-label-horizontal">{AISLE_LABEL}</span>
                            )}
                          </div>
                        ))}
                        {seatsList.map((seat) => {
                          const isCrossing = completeVerticalCols.includes(seat.seatNumber);
                          return (
                            <div
                              key={seat.seatUuid}
                              className={`seat-map-grid-cell ${isCrossing ? 'aisle-band-crossing' : ''}`}
                              style={getGridColumnStyle(
                                seatNumberToGridColumn(seat.seatNumber, maxSeatNumber),
                              )}
                              aria-hidden
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div
                  className="seat-map-grid seat-map-grid--booking seat-map-row-seats"
                  style={getSeatMapGridStyle(maxSeatNumber)}
                >
                  {buildRowPlacedItems(
                    seatsList,
                    maxSeatNumber,
                    (seat) => hasAisleSlot(aisleLayout, row, seat.seatNumber),
                  ).map((item) => (
                    <div
                      key={item.key}
                      className="seat-map-grid-cell relative z-[1]"
                      style={getGridColumnStyle(item.gridStart, item.span)}
                    >
                      {item.kind === 'couple-invalid' ? (
                        <div
                          className="seat standard occupied relative z-[1] w-full h-full flex items-center justify-center opacity-50 pointer-events-none"
                          aria-hidden
                        >
                          <X className="h-3 w-3" />
                        </div>
                      ) : item.kind === 'couple'
                        ? renderCouple(item.seats, row)
                        : (() => {
                          const seat = item.seats[0];
                          const isAisle = hasAisleSlot(aisleLayout, row, seat.seatNumber);
                          const inCompleteVert = isInCompleteVerticalCol(
                            seat.seatNumber,
                            completeVerticalCols,
                          );
                          const inCompleteDiag = completeDiagonalCells.has(
                            slotKey(row, seat.seatNumber),
                          );
                          const showDiagonalBand = isAisle
                            && aisleLabelAnchors.has(slotKey(row, seat.seatNumber))
                            && inCompleteDiag
                            && !inCompleteVert;

                          if (!isAisle) {
                            return renderSeat(seat);
                          }

                          const verticalCell = inCompleteVert
                            ? renderVerticalAisleCellProps(
                              row,
                              seat.seatNumber,
                              rowNames,
                              aisleLayout,
                              completeHorizontalRows,
                              'booking',
                            )
                            : null;

                          if (verticalCell) {
                            return (
                              <div
                                className={`seat-map-slot flex items-center justify-center ${verticalCell.cellClass} ${verticalCell.showLabel ? 'overflow-visible' : ''}`}
                                aria-hidden
                              >
                                {verticalCell.showLabel && (
                                  <div
                                    className="aisle-label-vertical-wrap"
                                    style={verticalCell.labelStyle}
                                  >
                                    <span className="aisle-label-vertical">{AISLE_LABEL}</span>
                                  </div>
                                )}
                              </div>
                            );
                          }

                          if (showDiagonalBand) {
                            return (
                              <div
                                className="seat-map-slot aisle-band-complete flex items-center justify-center"
                                aria-hidden
                              >
                                <span className="aisle-label-horizontal text-[10px] tracking-[0.28em]">{AISLE_LABEL}</span>
                              </div>
                            );
                          }

                          if (inCompleteDiag) {
                            return <div className="seat-map-slot" aria-hidden />;
                          }

                          return (
                            <div className="seat-map-slot rounded-lg aisle-slot-incomplete" aria-hidden />
                          );
                        })()}
                    </div>
                  ))}
                </div>
              )}

              <div className="w-6 text-center text-[10px] font-bold text-gray-500">{row}</div>
            </div>
          );
        })}
      </div>

      {showLegend && (
        <div className={`live-seat-map__legend ${compact ? 'live-seat-map__legend--compact' : ''}`}>
          {isStaff ? <StaffLegend /> : <BookingLegend />}
        </div>
      )}
    </div>
  );
};

export default LiveSeatMapView;
