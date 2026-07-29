import { describe, expect, it } from 'vitest';
import { deriveSeatGapState } from './seatGapUtils';

const seat = (seatUuid, seatNumber, overrides = {}) => ({
  seatUuid,
  seatNumber,
  seatTypeName: 'STANDARD',
  availabilityStatus: 'AVAILABLE',
  selected: false,
  blocked: false,
  ...overrides,
});

const rows = (seats) => [{ rowName: 'A', seats }];

describe('deriveSeatGapState', () => {
  it('shows and clears a gap immediately as local intent changes', () => {
    const initialRows = rows([
      seat('a1', 1),
      seat('a2', 2),
      seat('a3', 3, { availabilityStatus: 'BOOKED' }),
    ]);

    const withGap = deriveSeatGapState(initialRows, ['a1']);
    expect(withGap.hasGapViolation).toBe(true);
    expect(withGap.seatRows[0].seats[1].blocked).toBe(true);

    const resolved = deriveSeatGapState(withGap.seatRows, [], ['a1']);
    expect(resolved.hasGapViolation).toBe(false);
    expect(resolved.seatRows[0].seats[1].blocked).toBe(false);
    expect(resolved.seatRows[0].seats[0]).toMatchObject({
      selected: false,
      availabilityStatus: 'AVAILABLE',
      lockedUntil: null,
    });
  });

  it('treats active locks as causal but booked seats as non-causal', () => {
    const foreignLock = deriveSeatGapState(rows([
      seat('a1', 1, { availabilityStatus: 'LOCKED_BY_OTHER' }),
      seat('a2', 2),
      seat('a3', 3, { availabilityStatus: 'BOOKED' }),
    ]), []);
    expect(foreignLock.hasGapViolation).toBe(true);
    expect(foreignLock.seatRows[0].seats[1].blocked).toBe(true);

    const bookedOnly = deriveSeatGapState(rows([
      seat('a1', 1, { availabilityStatus: 'BOOKED' }),
      seat('a2', 2),
      seat('a3', 3, { availabilityStatus: 'UNAVAILABLE' }),
    ]), []);
    expect(bookedOnly.hasGapViolation).toBe(false);
    expect(bookedOnly.seatRows[0].seats[1].blocked).toBe(false);
  });

  it('does not block couple seats or bridge missing seat-number segments', () => {
    const coupleCandidate = deriveSeatGapState(rows([
      seat('a1', 1, { selected: true, availabilityStatus: 'LOCKED_BY_ME' }),
      seat('a2', 2, { seatTypeName: 'couple' }),
      seat('a3', 3, { availabilityStatus: 'LOCKED_BY_OTHER' }),
    ]), ['a1']);
    expect(coupleCandidate.hasGapViolation).toBe(false);
    expect(coupleCandidate.seatRows[0].seats[1].blocked).toBe(false);

    const separatedSegments = deriveSeatGapState(rows([
      seat('a1', 1, { selected: true, availabilityStatus: 'LOCKED_BY_ME' }),
      seat('a3', 3, { availabilityStatus: 'LOCKED_BY_OTHER' }),
    ]), ['a1']);
    expect(separatedSegments.hasGapViolation).toBe(false);
  });

  it('resets stale server blocked flags before recalculating', () => {
    const result = deriveSeatGapState(rows([
      seat('a1', 1),
      seat('a2', 2, { blocked: true }),
      seat('a3', 3),
    ]), []);

    expect(result.hasGapViolation).toBe(false);
    expect(result.seatRows[0].seats[1].blocked).toBe(false);
  });
});
