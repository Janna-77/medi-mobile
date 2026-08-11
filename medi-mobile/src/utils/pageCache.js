// In-memory cache — equivalent to the web version's sessionStorage cache.
// Persists for the lifetime of the app session, cleared on restart.
const cache = new Map()

export function getCache(key) {
    return cache.get(key) ?? null
}

export function setCache(key, value) {
    cache.set(key, value)
}

export function clearCache(key) {
    cache.delete(key)
}

export function clearAllCaches() {
    cache.clear()
}
