export const BOOKING_SESSION_KEYS = {
  BOOKING: 'booking_state',
  CHECKOUT: 'checkout_state',
  ORBIT: 'orbit_booking_state',
};

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

/** Shallow-merge location.state onto the stored session so partial navigations keep prior fields. */
function mergeBookingState(existing, incoming) {
  if (!isPlainObject(incoming)) {
    return existing ?? incoming ?? null;
  }
  if (!isPlainObject(existing)) {
    return { ...incoming };
  }
  return { ...existing, ...incoming };
}

export function readBookingSession(key, locationState = null) {
  let existing = null;
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) {
      existing = JSON.parse(saved);
    }
  } catch (error) {
    console.error(`Failed to parse session state (${key}):`, error);
  }

  if (locationState != null && typeof locationState === 'object') {
    const merged = mergeBookingState(existing, locationState);
    writeBookingSession(key, merged);
    return merged;
  }

  return existing;
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

export function clearAllBookingSessions() {
  Object.values(BOOKING_SESSION_KEYS).forEach((key) => clearBookingSession(key));
}
