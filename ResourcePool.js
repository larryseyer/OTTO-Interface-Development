/**
 * ResourcePool.js
 * Object pooling and resource management for performance
 * Phase 4 Implementation
 */

class ResourcePool {
  constructor() {
    // Object pools
    this.pools = new Map();

    // Pool configurations
    this.configs = new Map();

    // Statistics
    this.stats = {
      created: 0,
      reused: 0,
      destroyed: 0,
      currentSize: 0,
      peakSize: 0,
    };

    // Memory management
    this.memoryLimit = 50 * 1024 * 1024; // 50MB default limit
    this.currentMemoryUsage = 0;

    // Cleanup settings
    this.cleanupInterval = 30000; // 30 seconds
    this.cleanupTimer = null;

    // Initialize default pools
    this.initializeDefaultPools();
  }

  /**
   * Initialize default object pools
   */
  initializeDefaultPools() {
    // DOM element pool
    this.createPool("div", {
      create: () => document.createElement("div"),
      reset: (elem) => {
        elem.className = "";
        elem.innerHTML = "";
        elem.style.cssText = "";
        elem.onclick = null;
        elem.onmouseover = null;
        elem.onmouseout = null;
      },
      destroy: (elem) => {
        if (elem.parentNode) {
          elem.parentNode.removeChild(elem);
        }
      },
      maxSize: 100,
      preAllocate: 10,
    });

    // Pattern data pool
    this.createPool("pattern", {
      create: () => ({
        id: null,
        name: "",
        steps: new Array(16).fill(false),
        velocity: new Array(16).fill(0.5),
        accent: new Array(16).fill(false),
      }),
      reset: (pattern) => {
        pattern.id = null;
        pattern.name = "";
        pattern.steps.fill(false);
        pattern.velocity.fill(0.5);
        pattern.accent.fill(false);
      },
      maxSize: 50,
      preAllocate: 16,
    });

    // Audio buffer pool
    this.createPool("audioBuffer", {
      create: () => ({
        buffer: null,
        source: null,
        gainNode: null,
        startTime: 0,
        duration: 0,
      }),
      reset: (audio) => {
        if (audio.source) {
          try {
            audio.source.stop();
            audio.source.disconnect();
          } catch (e) {}
        }
        if (audio.gainNode) {
          audio.gainNode.disconnect();
        }
        audio.buffer = null;
        audio.source = null;
        audio.gainNode = null;
        audio.startTime = 0;
        audio.duration = 0;
      },
      maxSize: 32,
      preAllocate: 8,
    });

    // Event object pool
    this.createPool("event", {
      create: () => ({
        type: "",
        target: null,
        data: null,
        timestamp: 0,
        handled: false,
      }),
      reset: (event) => {
        event.type = "";
        event.target = null;
        event.data = null;
        event.timestamp = 0;
        event.handled = false;
      },
      maxSize: 200,
      preAllocate: 20,
    });

    // Animation data pool
    this.createPool("animation", {
      create: () => ({
        element: null,
        property: "",
        from: 0,
        to: 0,
        duration: 0,
        startTime: 0,
        easing: "linear",
        callback: null,
      }),
      reset: (anim) => {
        anim.element = null;
        anim.property = "";
        anim.from = 0;
        anim.to = 0;
        anim.duration = 0;
        anim.startTime = 0;
        anim.easing = "linear";
        anim.callback = null;
      },
      maxSize: 100,
      preAllocate: 10,
    });

    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Create a new pool
   */
  createPool(name, config) {
    const pool = {
      available: [],
      inUse: new Set(),
      config: {
        create: config.create || (() => ({})),
        reset: config.reset || (() => {}),
        destroy: config.destroy || (() => {}),
        maxSize: config.maxSize || 100,
        minSize: config.minSize || 0,
        preAllocate: config.preAllocate || 0,
        growthRate: config.growthRate || 1,
      },
    };

    this.pools.set(name, pool);
    this.configs.set(name, pool.config);

    // Pre-allocate objects
    if (config.preAllocate > 0) {
      this.preAllocate(name, config.preAllocate);
    }
  }

  /**
   * Pre-allocate objects for a pool
   */
  preAllocate(poolName, count) {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    for (let i = 0; i < count; i++) {
      const obj = pool.config.create();
      pool.available.push(obj);
      this.stats.created++;
    }

    this.updateStats();
  }

  /**
   * Acquire object from pool
   */
  acquire(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) {
      console.warn(`Pool '${poolName}' does not exist`);
      return null;
    }

    let obj;

    if (pool.available.length > 0) {
      // Reuse existing object
      obj = pool.available.pop();
      this.stats.reused++;
    } else if (pool.inUse.size < pool.config.maxSize) {
      // Create new object
      obj = pool.config.create();
      this.stats.created++;
    } else {
      // Pool is at max capacity
      console.warn(`Pool '${poolName}' is at maximum capacity`);
      return null;
    }

    pool.inUse.add(obj);
    this.updateStats();

    return obj;
  }

  /**
   * Release object back to pool
   */
  release(poolName, obj) {
    const pool = this.pools.get(poolName);
    if (!pool || !pool.inUse.has(obj)) {
      return false;
    }

    // Reset object
    try {
      pool.config.reset(obj);
    } catch (error) {
      console.error(`Error resetting object in pool '${poolName}':`, error);
      pool.config.destroy(obj);
      pool.inUse.delete(obj);
      this.stats.destroyed++;
      return false;
    }

    // Move from inUse to available
    pool.inUse.delete(obj);
    pool.available.push(obj);

    this.updateStats();
    return true;
  }

  /**
   * Release all objects in a pool
   */
  releaseAll(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    const objects = Array.from(pool.inUse);
    objects.forEach((obj) => this.release(poolName, obj));
  }

  /**
   * Clear a pool
   */
  clearPool(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    // Destroy all objects
    [...pool.available, ...pool.inUse].forEach((obj) => {
      try {
        pool.config.destroy(obj);
        this.stats.destroyed++;
      } catch (error) {
        console.error(`Error destroying object in pool '${poolName}':`, error);
      }
    });

    pool.available = [];
    pool.inUse.clear();

    this.updateStats();
  }

  /**
   * Trim pool to size
   */
  trimPool(poolName, targetSize = null) {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    const target = targetSize ?? pool.config.minSize;
    const currentSize = pool.available.length;

    if (currentSize > target) {
      const toRemove = currentSize - target;

      for (let i = 0; i < toRemove; i++) {
        const obj = pool.available.pop();
        if (obj) {
          pool.config.destroy(obj);
          this.stats.destroyed++;
        }
      }
    }

    this.updateStats();
  }

  /**
   * Grow pool
   */
  growPool(poolName, amount = null) {
    const pool = this.pools.get(poolName);
    if (!pool) return;

    const growthAmount = amount ?? pool.config.growthRate;
    const currentTotal = pool.available.length + pool.inUse.size;
    const newTotal = Math.min(currentTotal + growthAmount, pool.config.maxSize);
    const toCreate = newTotal - currentTotal;

    if (toCreate > 0) {
      this.preAllocate(poolName, toCreate);
    }
  }

  /**
   * Get pool statistics
   */
  getPoolStats(poolName) {
    const pool = this.pools.get(poolName);
    if (!pool) return null;

    return {
      available: pool.available.length,
      inUse: pool.inUse.size,
      total: pool.available.length + pool.inUse.size,
      maxSize: pool.config.maxSize,
      utilization: pool.inUse.size / pool.config.maxSize,
    };
  }

  /**
   * Create object factory
   */
  createFactory(poolName) {
    return {
      acquire: () => this.acquire(poolName),
      release: (obj) => this.release(poolName, obj),
      with: async (callback) => {
        const obj = this.acquire(poolName);
        if (!obj)
          throw new Error(`Failed to acquire object from pool '${poolName}'`);

        try {
          const result = await callback(obj);
          return result;
        } finally {
          this.release(poolName, obj);
        }
      },
    };
  }

  /**
   * Batch acquire
   */
  acquireBatch(poolName, count) {
    const objects = [];

    for (let i = 0; i < count; i++) {
      const obj = this.acquire(poolName);
      if (obj) {
        objects.push(obj);
      } else {
        // Release already acquired objects if we can't get all
        objects.forEach((o) => this.release(poolName, o));
        return null;
      }
    }

    return objects;
  }

  /**
   * Batch release
   */
  releaseBatch(poolName, objects) {
    objects.forEach((obj) => this.release(poolName, obj));
  }

  /**
   * Start cleanup timer
   */
  startCleanupTimer() {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Cleanup unused resources
   */
  cleanup() {
    this.pools.forEach((pool, name) => {
      // Trim pools that have too many available objects
      const utilization =
        pool.inUse.size / (pool.available.length + pool.inUse.size);

      if (utilization < 0.25 && pool.available.length > pool.config.minSize) {
        // Low utilization, trim pool
        this.trimPool(name);
      }

      // Check for leaked objects (in use for too long)
      // This would require tracking acquisition time
    });

    // Run garbage collection hint
    if (window.gc) {
      window.gc();
    }
  }

  /**
   * Estimate memory usage
   */
  estimateMemoryUsage() {
    let totalMemory = 0;

    this.pools.forEach((pool) => {
      const objectCount = pool.available.length + pool.inUse.size;
      // Rough estimate: 1KB per object average
      totalMemory += objectCount * 1024;
    });

    this.currentMemoryUsage = totalMemory;
    return totalMemory;
  }

  /**
   * Update statistics
   */
  updateStats() {
    let totalSize = 0;

    this.pools.forEach((pool) => {
      totalSize += pool.available.length + pool.inUse.size;
    });

    this.stats.currentSize = totalSize;
    this.stats.peakSize = Math.max(this.stats.peakSize, totalSize);
  }

  /**
   * Get all statistics
   */
  getStats() {
    const poolStats = {};

    this.pools.forEach((pool, name) => {
      poolStats[name] = this.getPoolStats(name);
    });

    return {
      global: { ...this.stats },
      pools: poolStats,
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      created: 0,
      reused: 0,
      destroyed: 0,
      currentSize: this.stats.currentSize,
      peakSize: this.stats.currentSize,
    };
  }

  /**
   * Destroy all pools
   */
  destroy() {
    this.stopCleanupTimer();

    this.pools.forEach((pool, name) => {
      this.clearPool(name);
    });

    this.pools.clear();
    this.configs.clear();
    this.resetStats();
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = ResourcePool;
}
