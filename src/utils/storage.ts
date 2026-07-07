export function storageGet<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return defaultValue
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

export function storageSet<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`[storage] Failed to write key "${key}":`, e)
  }
}

export function storageRemove(key: string): void {
  localStorage.removeItem(key)
}

export const STORAGE_KEYS = {
  SETTINGS: 'ds_settings',
  SESSIONS: 'ds_sessions',
  CURRENT_SESSION_ID: 'ds_current_session_id',
} as const
