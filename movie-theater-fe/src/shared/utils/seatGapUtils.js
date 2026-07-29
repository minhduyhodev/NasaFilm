function normalizeValue(value) {
  return String(value || '').trim().toUpperCase();
}

function isCoupleSeat(seat) {
  return normalizeValue(seat.seatTypeName) === 'COUPLE';
}

function isAvailable(seat) {
  return normalizeValue(seat.availabilityStatus) === 'AVAILABLE';
}

function isUnavailableForGapRule(seat) {
  return !isAvailable(seat) || Boolean(seat.selected);
}

function isActiveHoldOrSelection(seat) {
  const availabilityStatus = normalizeValue(seat.availabilityStatus);
  return Boolean(seat.selected)
    || availabilityStatus === 'LOCKED_BY_ME'
    || availabilityStatus === 'LOCKED_BY_OTHER';
}

function isOwnSelection(seat, previousSelectedSet) {
  return previousSelectedSet.has(seat.seatUuid)
    || seat.selected
    || normalizeValue(seat.availabilityStatus) === 'LOCKED_BY_ME';
}

function recalculateRowGapState(seats) {
  let hasGapViolation = false;
  let segmentStart = 0;

  while (segmentStart < seats.length) {
    let segmentEnd = segmentStart;
    while (
      segmentEnd + 1 < seats.length
      && Number(seats[segmentEnd + 1].seatNumber) === Number(seats[segmentEnd].seatNumber) + 1
    ) {
      segmentEnd += 1;
    }

    for (let index = segmentStart; index <= segmentEnd; index += 1) {
      const currentSeat = seats[index];
      if (!isAvailable(currentSeat) || currentSeat.selected || isCoupleSeat(currentSeat)) {
        continue;
      }

      const leftUnavailable = index === segmentStart || isUnavailableForGapRule(seats[index - 1]);
      const rightUnavailable = index === segmentEnd || isUnavailableForGapRule(seats[index + 1]);
      if (!leftUnavailable || !rightUnavailable) {
        continue;
      }

      const leftCausedByHold = index !== segmentStart && isActiveHoldOrSelection(seats[index - 1]);
      const rightCausedByHold = index !== segmentEnd && isActiveHoldOrSelection(seats[index + 1]);
      if (leftCausedByHold || rightCausedByHold) {
        currentSeat.blocked = true;
        hasGapViolation = true;
      }
    }

    segmentStart = segmentEnd + 1;
  }

  return hasGapViolation;
}

/**
 * Mirrors the seat-map display rule on the server so gap feedback changes immediately.
 */
export function deriveSeatGapState(seatRows, nextSelectedSeatUuids, previousSelectedSeatUuids = []) {
  const nextSelectedSet = new Set(nextSelectedSeatUuids || []);
  const previousSelectedSet = new Set(previousSelectedSeatUuids || []);
  let hasGapViolation = false;

  const rows = (seatRows || []).map((row) => {
    const seats = (row.seats || []).map((seat) => {
      const selected = nextSelectedSet.has(seat.seatUuid);
      const releasedOwnSelection = !selected && isOwnSelection(seat, previousSelectedSet);
      const nextSeat = {
        ...seat,
        selected,
        blocked: false,
      };

      if (releasedOwnSelection) {
        nextSeat.availabilityStatus = 'AVAILABLE';
        nextSeat.lockedUntil = null;
      }

      return nextSeat;
    });

    hasGapViolation = recalculateRowGapState(seats) || hasGapViolation;
    return { ...row, seats };
  });

  return { seatRows: rows, hasGapViolation };
}
