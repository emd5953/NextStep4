// Simple in-memory cache with TTL
const cache = new Map();

export const cacheService = {
  set: (key, value, ttlMinutes = 5) => {
    const expiry = Date.now() + (ttlMinutes * 60 * 1000);
    cache.set(key, { value, expiry });
  },

  get: (key) => {
    const item = cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      cache.delete(key);
      return null;
    }
    
    return item.value;
  },

  clear: (key) => {
    if (key) {
      cache.delete(key);
    } else {
      cache.clear();
    }
  }
};
