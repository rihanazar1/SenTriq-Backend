// Simple in-memory cache fallback when Redis is not available
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, value, ttlSeconds = 3600) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the value
    this.cache.set(key, value);

    // Set expiration timer
    const timer = setTimeout(() => {
      this.cache.delete(key);
      this.timers.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);
    return true;
  }

  get(key) {
    return this.cache.get(key) || null;
  }

  delete(key) {
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    
    return this.cache.delete(key);
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
  }

  size() {
    return this.cache.size;
  }

  has(key) {
    return this.cache.has(key);
  }
}

// Create singleton instance
const memoryCache = new MemoryCache();

module.exports = memoryCache;