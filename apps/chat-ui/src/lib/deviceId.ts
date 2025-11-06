/**
 * Device ID management for anonymous user quota tracking
 *
 * Uses crypto.randomUUID() stored in localStorage for persistence
 * across browser sessions. This enables quota tracking without
 * requiring user authentication.
 */

const DEVICE_ID_KEY = 'mcp_device_id';

/**
 * Get or generate a stable device ID for this browser
 *
 * The ID persists across sessions via localStorage. If no ID exists,
 * a new UUID is generated using crypto.randomUUID() and stored for
 * future requests.
 *
 * @returns Stable UUID identifying this device
 *
 * @example
 * ```ts
 * const deviceId = getOrCreateDeviceId();
 * // deviceId: "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function getOrCreateDeviceId(): string {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const deviceId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, deviceId);

  return deviceId;
}

/**
 * Clear the device ID from localStorage
 *
 * Use for testing or when user explicitly requests quota reset.
 * Next call to getOrCreateDeviceId() will generate a new ID.
 *
 * @example
 * ```ts
 * clearDeviceId();
 * const newId = getOrCreateDeviceId(); // Fresh UUID
 * ```
 */
export function clearDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY);
}
