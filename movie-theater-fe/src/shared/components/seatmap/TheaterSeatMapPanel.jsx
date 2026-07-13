import React, { useMemo, useState, useRef } from 'react';
import { X, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
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
  hasAisleSlot,
  slotKey,
  getAisleLabelAnchors,
  getCompleteVerticalCols,
  getCompleteHorizontalRows,
  getCompleteDiagonalCellKeys,
} from '../../utils/aisleLayoutUtils';
import { normalizeUuid } from '../../utils/orbitUtils';
import {
  AISLE_LABEL,
  isInCompleteVerticalCol,
  renderVerticalAisleCellProps,
} from '../aisle/aisleMapRender';
import '../aisle/AisleMapStyles.css';
import './SeatMapGrid.css';

const TheaterSeatMapPanel = ({
  seatRows = [],
  aisleLayout,
  hasGapViolation = false,
  disabled = false,
  orbitSeatOwners = null,
  onSeatClick,
  onCoupleClick,
  screenLabel = 'MÀN HÌNH CHÍNH',
  screenAccent = 'white',
  showLegend = true,
  legendExtras = null,
  className = '',
  footerNote = null,
}) => {

  const resolveOrbitOwner = (seatUuid) => {
    if (!orbitSeatOwners || !seatUuid) return null;
    const key = normalizeUuid(seatUuid);
    if (orbitSeatOwners instanceof Map) {
      return orbitSeatOwners.get(key) ?? orbitSeatOwners.get(seatUuid) ?? null;
    }
    return orbitSeatOwners[key] ?? orbitSeatOwners[seatUuid] ?? null;
  };

  const buildOrbitSeatClass = (baseClass, owner, extras = '') => {
    let seatClass = `${baseClass} ${owner.cssClass} orbit-member-locked`;
    if (owner.isSelf) seatClass += ' orbit-member-self';
    if (extras) seatClass += ` ${extras}`;
    return seatClass;
  };
  const bookingSeatsByRow = useMemo(() => {
    const map = {};
    seatRows.forEach((rowItem) => {
      map[rowItem.rowName] = [...(rowItem.seats || [])].sort(
        (a, b) => (b.seatNumber || 0) - (a.seatNumber || 0),
      );
    });
    return map;
  }, [seatRows]);

  const bookingRowNames = useMemo(
    () => seatRows.map((r) => r.rowName).sort(),
    [seatRows],
  );

  const maxSeatNumber = useMemo(
    () => getMaxSeatNumber(bookingSeatsByRow, bookingRowNames),
    [bookingSeatsByRow, bookingRowNames],
  );

  const aisleLabelAnchors = useMemo(
    () => getAisleLabelAnchors(aisleLayout, bookingSeatsByRow, bookingRowNames),
    [aisleLayout, bookingSeatsByRow, bookingRowNames],
  );

  const completeHorizontalRows = useMemo(
    () => getCompleteHorizontalRows(aisleLayout, bookingSeatsByRow, bookingRowNames),
    [aisleLayout, bookingSeatsByRow, bookingRowNames],
  );

  const completeVerticalCols = useMemo(
    () => getCompleteVerticalCols(aisleLayout, bookingRowNames),
    [aisleLayout, bookingRowNames],
  );

  const completeDiagonalCells = useMemo(
    () => getCompleteDiagonalCellKeys(aisleLayout, bookingSeatsByRow, bookingRowNames),
    [aisleLayout, bookingSeatsByRow, bookingRowNames],
  );

  const screenGradient = screenAccent === 'cyan'
    ? 'from-cyan-400/45 to-transparent'
    : 'from-white/45 to-transparent';

  const renderCoupleElement = (seats, rowName) => {
    const orbitOwner = seats.map((s) => resolveOrbitOwner(s.seatUuid)).find(Boolean);
    const isBooked = seats.some((s) =>
      s.availabilityStatus === 'BOOKED' || s.availabilityStatus === 'UNAVAILABLE',
    );
    const isForeignLock = seats.some((s) => s.availabilityStatus === 'LOCKED_BY_OTHER');
    const isSelected = seats.some((s) => s.selected || s.availabilityStatus === 'LOCKED_BY_ME');
    const isBlocked = seats.some((s) => s.blocked);
    const label = getCoupleLabel(rowName, seats).replace(rowName, '');

    if (orbitOwner) {
      const isForeignOrbit = !orbitOwner.isSelf;
      const notClickable = disabled || isBooked || isForeignOrbit;
      const blockedExtra = isBlocked ? 'blocked' : '';
      const seatClass = buildOrbitSeatClass(
        'seat couple relative z-[1] w-full h-full',
        orbitOwner,
        blockedExtra,
      );

      return (
        <div
          key={seats.map((s) => s.seatUuid).join('-')}
          onClick={() => !notClickable && onCoupleClick?.(seats)}
          className={seatClass}
          title={isForeignOrbit ? `Ghế ${orbitOwner.displayName}` : `Sofa đôi ${getCoupleLabel(rowName, seats)}`}
          role="button"
          tabIndex={notClickable ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !notClickable) onCoupleClick?.(seats);
          }}
        >
          {label}
        </div>
      );
    }

    const isOccupied = isBooked || isForeignLock;
    let seatClass = 'seat couple relative z-[1] w-full h-full';
    if (isOccupied) seatClass += ' occupied';
    else if (isSelected) seatClass += ' selected';
    else if (isBlocked) seatClass += ' blocked';

    return (
      <div
        key={seats.map((s) => s.seatUuid).join('-')}
        onClick={() => !disabled && !isOccupied && onCoupleClick?.(seats)}
        className={seatClass}
        title={`Sofa đôi ${getCoupleLabel(rowName, seats)}`}
        role="button"
        tabIndex={disabled || isOccupied ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !disabled && !isOccupied) onCoupleClick?.(seats);
        }}
      >
        {isOccupied ? <X className="h-3 w-3" /> : label}
      </div>
    );
  };

  const renderSeatElement = (seat) => {
    const orbitOwner = resolveOrbitOwner(seat.seatUuid);
    const isBooked = seat.availabilityStatus === 'BOOKED'
      || seat.availabilityStatus === 'UNAVAILABLE';
    const isForeignLock = seat.availabilityStatus === 'LOCKED_BY_OTHER';
    const isSelected = seat.selected || seat.availabilityStatus === 'LOCKED_BY_ME';
    let type = (seat.seatTypeName || '').toLowerCase();
    if (type.includes('thường') || type.includes('standard') || type.includes('regular')) {
      type = 'standard';
    } else if (type.includes('vip')) {
      type = 'vip';
    } else if (type.includes('đôi') || type.includes('couple')) {
      type = 'couple';
    }

    if (orbitOwner) {
      const isForeignOrbit = !orbitOwner.isSelf;
      const notClickable = disabled || isBooked || isForeignOrbit;
      const blockedExtra = seat.blocked ? 'blocked' : '';
      const seatClass = buildOrbitSeatClass(
        `seat ${type} relative z-[1] w-full h-full`,
        orbitOwner,
        blockedExtra,
      );

      return (
        <div
          key={seat.seatUuid}
          onClick={() => !notClickable && onSeatClick?.(seat)}
          className={seatClass}
          role="button"
          tabIndex={notClickable ? -1 : 0}
          title={isForeignOrbit ? `Ghế ${orbitOwner.displayName}` : undefined}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !notClickable) onSeatClick?.(seat);
          }}
        >
          {seat.seatNumber}
        </div>
      );
    }

    const isOccupied = isBooked || isForeignLock;
    let seatClass = `seat ${type} relative z-[1] w-full h-full`;
    if (isOccupied) seatClass += ' occupied';
    else if (isSelected) seatClass += ' selected';
    else if (seat.blocked) seatClass += ' blocked';

    return (
      <div
        key={seat.seatUuid}
        onClick={() => !disabled && !isOccupied && onSeatClick?.(seat)}
        className={seatClass}
        role="button"
        tabIndex={disabled || isOccupied ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !disabled && !isOccupied) onSeatClick?.(seat);
        }}
      >
        {isOccupied ? <X className="h-3 w-3" /> : seat.seatNumber}
      </div>
    );
  };

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      {/* Viewport container sử dụng Container Query để tự động co giãn ghế */}
      <div
        className="w-full border border-white/5 bg-[#0b0f19]/40 rounded-2xl p-4 md:p-6 relative select-none custom-scrollbar"
        style={{ containerType: 'inline-size' }}
      >
        <div 
          className="flex flex-col gap-2 w-full"
          style={{
            '--seat-slot-gap': '0.7cqw',
            '--seat-slot-w': 'calc((100cqw - 4rem - (var(--seat-map-cols) - 1) * var(--seat-slot-gap)) / var(--seat-map-cols))',
            '--seat-slot-h': 'calc(var(--seat-slot-w) * 0.7)',
            '--seat-font-size': 'calc(var(--seat-slot-w) * 0.3)',
            '--seat-couple-font-size': 'calc(var(--seat-slot-w) * 0.28)',
          }}
        >
          {/* Màn hình curved */}
          <div className="w-full mb-6 text-center shrink-0">
            <div className={`screen-curve relative mx-auto w-[65%] h-1 bg-gradient-to-b ${screenGradient} rounded-[50%] screen-glow`} />
            <p className="text-[9px] font-bold text-gray-500 mt-2 tracking-widest uppercase">{screenLabel}</p>
          </div>
        {bookingRowNames.map((row) => {
          const seatsList = bookingSeatsByRow[row] || [];
          const isFullHorizontalAisle = completeHorizontalRows.includes(row);

          return (
            <div key={row} className="flex items-center gap-2 mb-1 justify-center w-full">
              <div 
                className="text-center font-bold text-gray-500 shrink-0 w-6 text-[10px] md:text-xs"
              >
                {row}
              </div>

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
                      {item.kind === 'couple-invalid-ghost' ? (
                        <div
                          className="seat-couple-invalid-ghost flex items-center justify-center text-[8px] font-bold font-mono text-yellow-400/90"
                          title={`Thiếu slot sofa đôi tại ${row}${item.seatNumber}`}
                          aria-hidden
                        >
                          ?
                        </div>
                      ) : item.kind === 'couple-invalid' ? (
                        <div
                          className="seat standard occupied relative z-[1] w-full h-full flex items-center justify-center text-[9px] font-bold opacity-50 cursor-not-allowed"
                          title="Ghế sofa chưa đủ cặp — không thể đặt"
                          aria-hidden
                        >
                          <X className="h-3 w-3" />
                        </div>
                      ) : item.kind === 'couple'
                        ? renderCoupleElement(item.seats, row)
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
                            return renderSeatElement(seat);
                          }

                          const verticalCell = inCompleteVert
                            ? renderVerticalAisleCellProps(
                              row,
                              seat.seatNumber,
                              bookingRowNames,
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

              <div 
                className="text-center font-bold text-gray-500 shrink-0 w-6 text-[10px] md:text-xs"
              >
                {row}
              </div>
            </div>
          );
        })}
        </div>
      </div>

      {hasGapViolation && (
        <div className="w-full mt-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-black text-center flex items-center justify-center gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>Không được để trống 1 ghế đơn bị kẹp giữa các ghế đã chọn/đã đặt. Vui lòng chọn ghế trống đó hoặc thay đổi vị trí — không thể xác nhận thanh toán khi còn cảnh báo này.</span>
        </div>
      )}

      {footerNote && (
        <p className="text-center text-sm text-zinc-500 mt-4 w-full">{footerNote}</p>
      )}

      {showLegend && (
        <div className="flex flex-wrap justify-center gap-6 mt-8 glass-panel p-6 rounded-xl w-full border border-white/5 bg-[#121215]/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-6 border-2 border-white/25 rounded-lg bg-transparent flex items-center justify-center text-[9px] font-bold text-zinc-500">1</div>
            <span className="text-xs font-bold text-gray-300">Ghế Thường</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-6 border-2 border-yellow-500/35 rounded-lg bg-transparent flex items-center justify-center text-[9px] font-bold text-yellow-500/70">1</div>
            <span className="text-xs font-bold text-gray-300">Ghế VIP</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="seat couple opacity-80 pointer-events-none flex items-center justify-center text-[9px] font-bold w-[calc(2.25rem*2+0.5rem)] h-6">12·11</div>
            <span className="text-xs font-bold text-gray-300">Ghế Đôi</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-6 bg-white/5 border-2 border-red-500/20 rounded-lg flex items-center justify-center text-red-500/25 opacity-60">
              <X className="h-3 w-3" />
            </div>
            <span className="text-xs font-bold text-gray-300">Đã đặt</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-6 bg-white border border-white rounded-lg flex items-center justify-center text-[9px] font-bold text-black shadow-[0_0_10px_rgba(255,255,255,0.5)]">1</div>
            <span className="text-xs font-bold text-gray-300">Đang chọn</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-6 border-2 border-dashed border-red-500 bg-red-500/5 rounded-lg flex items-center justify-center text-[9px] font-bold text-red-500">1</div>
            <span className="text-xs font-bold text-gray-300">Cảnh báo khe hở</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div
              className="w-16 h-6 rounded-lg border border-blue-400/30 bg-blue-500/10"
              aria-hidden
            />
            <span className="text-xs font-bold text-gray-300">Lối đi</span>
          </div>
          {legendExtras}
        </div>
      )}
    </div>
  );
};

export default React.memo(TheaterSeatMapPanel);
