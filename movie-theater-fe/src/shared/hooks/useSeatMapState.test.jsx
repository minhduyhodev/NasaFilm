// @vitest-environment jsdom
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi, beforeEach } from 'vitest';
import { useSeatMapState } from './useSeatMapState';

const { getSeatMap } = vi.hoisted(() => ({ getSeatMap: vi.fn() }));

vi.mock('../services/bookingService', () => ({
  bookingService: {
    getSeatMap,
    watchSeatMap: vi.fn().mockResolvedValue(undefined),
    unwatchSeatMap: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/stompSocketService', () => ({
  SEAT_MAP_REFRESH_MS: 5000,
  stompSocketService: {
    ensureConnected: vi.fn().mockResolvedValue(undefined),
    isConnected: vi.fn(() => true),
  },
}));

vi.mock('./useRealtimeTopic', () => ({ useRealtimeTopic: vi.fn() }));
vi.mock('../services/notificationService', () => ({ notificationService: { error: vi.fn() } }));
vi.mock('../utils/logger', () => ({ logger: { error: vi.fn() } }));

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function seatMap(selected = false) {
  return {
    rows: [{
      rowName: 'A',
      seats: [{
        seatUuid: 'seat-a',
        seatNumber: 1,
        price: 100000,
        seatTypeName: 'STANDARD',
        availabilityStatus: selected ? 'LOCKED_BY_ME' : 'AVAILABLE',
        selected,
      }],
    }],
  };
}

let seatMapState;

function SeatMapHarness({ dedupeInFlight = false }) {
  seatMapState = useSeatMapState('showtime-a', {
    dedupeInFlight,
    enablePolling: false,
    enableRealtime: false,
    watchSeatMap: false,
  });
  return <div>{seatMapState.selectedSeats.map((seat) => seat.seatUuid).join(',')}</div>;
}

describe('useSeatMapState', () => {
  beforeEach(() => {
    getSeatMap.mockReset();
    seatMapState = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('ignores a late response that still contains a deselected seat', async () => {
    const initial = deferred();
    const selected = deferred();
    const deselected = deferred();
    getSeatMap
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(selected.promise)
      .mockReturnValueOnce(deselected.promise);

    render(<SeatMapHarness />);
    await waitFor(() => expect(getSeatMap).toHaveBeenCalledTimes(1));

    await act(async () => {
      initial.resolve(seatMap(false));
    });

    await act(async () => {
      seatMapState.setSelectionIntent(['seat-a']);
      void seatMapState.fetchSeatMap(['seat-a'], { commitIntent: false });
    });
    await waitFor(() => expect(getSeatMap).toHaveBeenCalledTimes(2));

    await act(async () => {
      seatMapState.setSelectionIntent([]);
      void seatMapState.fetchSeatMap([], { commitIntent: false });
    });
    await waitFor(() => expect(getSeatMap).toHaveBeenCalledTimes(3));

    await act(async () => {
      deselected.resolve(seatMap(false));
    });
    await waitFor(() => expect(seatMapState.selectedSeats).toEqual([]));

    await act(async () => {
      selected.resolve(seatMap(true));
    });
    await waitFor(() => expect(seatMapState.selectedSeats).toEqual([]));
    expect(seatMapState.seatRows[0].seats[0].selected).toBe(false);
  });

  it('updates gap feedback before the next seat-map response resolves', async () => {
    const initial = deferred();
    const refresh = deferred();
    getSeatMap.mockReturnValueOnce(initial.promise).mockReturnValueOnce(refresh.promise);

    render(<SeatMapHarness />);
    await waitFor(() => expect(getSeatMap).toHaveBeenCalledTimes(1));
    await act(async () => {
      initial.resolve({
        rows: [{
          rowName: 'A',
          seats: [
            { seatUuid: 'seat-a', seatNumber: 1, price: 100000, seatTypeName: 'STANDARD', availabilityStatus: 'AVAILABLE', selected: false },
            { seatUuid: 'seat-b', seatNumber: 2, price: 100000, seatTypeName: 'STANDARD', availabilityStatus: 'AVAILABLE', selected: false },
            { seatUuid: 'seat-c', seatNumber: 3, price: 100000, seatTypeName: 'STANDARD', availabilityStatus: 'BOOKED', selected: false },
          ],
        }],
      });
    });

    await act(async () => {
      seatMapState.setSelectionIntent(['seat-a']);
      void seatMapState.fetchSeatMap(['seat-a'], { commitIntent: false });
    });

    expect(seatMapState.hasGapViolation).toBe(true);
    expect(seatMapState.seatRows[0].seats[1].blocked).toBe(true);

    await act(async () => {
      seatMapState.setSelectionIntent([]);
    });

    expect(seatMapState.hasGapViolation).toBe(false);
    expect(seatMapState.seatRows[0].seats[1].blocked).toBe(false);

    await act(async () => {
      refresh.resolve(seatMap(false));
    });
  });

  it('does not reuse an in-flight request for a different selection query', async () => {
    const initial = deferred();
    const selected = deferred();
    const deselected = deferred();
    getSeatMap
      .mockReturnValueOnce(initial.promise)
      .mockReturnValueOnce(selected.promise)
      .mockReturnValueOnce(deselected.promise);

    render(<SeatMapHarness dedupeInFlight />);
    await waitFor(() => expect(getSeatMap).toHaveBeenCalledTimes(1));
    await act(async () => {
      initial.resolve(seatMap(false));
    });

    await act(async () => {
      seatMapState.setSelectionIntent(['seat-a']);
      void seatMapState.fetchSeatMap(['seat-a'], { commitIntent: false });
      seatMapState.setSelectionIntent([]);
      void seatMapState.fetchSeatMap([], { commitIntent: false });
    });

    await waitFor(() => expect(getSeatMap).toHaveBeenCalledTimes(3));
    expect(getSeatMap.mock.calls[1][1]).toEqual(['seat-a']);
    expect(getSeatMap.mock.calls[2][1]).toEqual([]);

    await act(async () => {
      selected.resolve(seatMap(true));
      deselected.resolve(seatMap(false));
    });
    await waitFor(() => expect(seatMapState.selectedSeats).toEqual([]));
  });
});
