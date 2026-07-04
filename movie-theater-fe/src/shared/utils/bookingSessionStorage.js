export const BOOKING_SESSION_KEYS = {
  BOOKING: 'booking_state',
  CHECKOUT: 'checkout_state',
  ORBIT: 'orbit_booking_state',
};

export function readBookingSession(key, locationState = null) {
  if (locationState != null && typeof locationState === 'object') {
    writeBookingSession(key, locationState);
    return locationState;
  }
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error(`Failed to parse session state (${key}):`, error);
  }
  return null;
}

export function writeBookingSession(key, data) {
  if (data == null) {
    return;
  }
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to save session state (${key}):`, error);
  }
}

export function clearBookingSession(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function useInitialRouteState(key, locationState) {
  return readBookingSession(key, locationState) ?? {};
}
