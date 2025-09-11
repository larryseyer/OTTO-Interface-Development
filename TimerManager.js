/**
 * TimerManager.js
 * Centralized timer management with automatic cleanup
 * Prevents timer leaks and provides lifecycle tracking
 */

class TimerManager {
  constructor() {
    // Map of timer ID to timer info
    this.timers = new Map();
    
    // Timer categories for group operations
    this.categories = {
      animation: new Set(),
      state: new Set(),
      notification: new Set(),
      debounce: new Set(),
      throttle: new Set(),
      general: new Set()
    };
    
    // Animation frame tracking
    this.animationFrames = new Map();
    
    // Paused state tracking
    this.pausedCategories = new Set();
    
    // Statistics
    this.stats = {
      created: 0,
      cleared: 0,
      executed: 0,
      active: 0,
      leaked: 0
    };
    
    // Debug mode
    this.debugMode = false;
    
    // Auto-cleanup for page visibility
    this.setupVisibilityHandling();
    
    // Track timer ID counter
    this.nextTimerId = 1;
  }
  
  /**
   * Set up page visibility handling
   */
  setupVisibilityHandling() {
    if (typeof document === 'undefined') return;
    
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pauseCategory('animation');
      } else {
        this.resumeCategory('animation');
      }
    });
  }
  
  /**
   * Create a timeout timer
   */
  setTimeout(callback, delay, category = 'general', name = null) {
    if (!callback || typeof callback !== 'function') {
      console.error('TimerManager: Invalid callback for setTimeout');
      return null;
    }
    
    const timerId = this.nextTimerId++;
    
    // Wrap callback to track execution
    const wrappedCallback = () => {
      try {
        callback();
        this.stats.executed++;
      } catch (error) {
        console.error('TimerManager: Error in timer callback', error);
      } finally {
        this.clearTimer(timerId);
      }
    };
    
    // Create timer info
    const timerInfo = {
      id: timerId,
      type: 'timeout',
      callback: callback,
      wrappedCallback: wrappedCallback,
      delay: delay,
      category: category,
      name: name || `timeout_${timerId}`,
      createdAt: Date.now(),
      paused: false,
      pausedAt: null,
      remainingDelay: delay,
      nativeId: null
    };
    
    // Check if category is paused
    if (!this.pausedCategories.has(category)) {
      timerInfo.nativeId = setTimeout(wrappedCallback, delay);
    } else {
      timerInfo.paused = true;
      timerInfo.pausedAt = Date.now();
    }
    
    // Store timer info
    this.timers.set(timerId, timerInfo);
    
    // Add to category
    if (!this.categories[category]) {
      this.categories[category] = new Set();
    }
    this.categories[category].add(timerId);
    
    // Update stats
    this.stats.created++;
    this.stats.active = this.timers.size;
    
    if (this.debugMode) {
      console.log(`TimerManager: Created timeout ${timerInfo.name} (${timerId})`);
    }
    
    return timerId;
  }
  
  /**
   * Create an interval timer
   */
  setInterval(callback, delay, category = 'general', name = null) {
    if (!callback || typeof callback !== 'function') {
      console.error('TimerManager: Invalid callback for setInterval');
      return null;
    }
    
    const timerId = this.nextTimerId++;
    
    // Wrap callback to track execution
    const wrappedCallback = () => {
      try {
        callback();
        this.stats.executed++;
      } catch (error) {
        console.error('TimerManager: Error in interval callback', error);
      }
    };
    
    // Create timer info
    const timerInfo = {
      id: timerId,
      type: 'interval',
      callback: callback,
      wrappedCallback: wrappedCallback,
      delay: delay,
      category: category,
      name: name || `interval_${timerId}`,
      createdAt: Date.now(),
      paused: false,
      pausedAt: null,
      lastExecuted: null,
      executionCount: 0,
      nativeId: null
    };
    
    // Check if category is paused
    if (!this.pausedCategories.has(category)) {
      timerInfo.nativeId = setInterval(() => {
        timerInfo.lastExecuted = Date.now();
        timerInfo.executionCount++;
        wrappedCallback();
      }, delay);
    } else {
      timerInfo.paused = true;
      timerInfo.pausedAt = Date.now();
    }
    
    // Store timer info
    this.timers.set(timerId, timerInfo);
    
    // Add to category
    if (!this.categories[category]) {
      this.categories[category] = new Set();
    }
    this.categories[category].add(timerId);
    
    // Update stats
    this.stats.created++;
    this.stats.active = this.timers.size;
    
    if (this.debugMode) {
      console.log(`TimerManager: Created interval ${timerInfo.name} (${timerId})`);
    }
    
    return timerId;
  }
  
  /**
   * Request animation frame
   */
  requestAnimationFrame(callback, name = null) {
    if (!callback || typeof callback !== 'function') {
      console.error('TimerManager: Invalid callback for requestAnimationFrame');
      return null;
    }
    
    const frameId = this.nextTimerId++;
    
    // Wrap callback
    const wrappedCallback = (timestamp) => {
      try {
        const shouldContinue = callback(timestamp);
        this.stats.executed++;
        
        // If callback returns true, request another frame
        if (shouldContinue === true) {
          const frameInfo = this.animationFrames.get(frameId);
          if (frameInfo && !frameInfo.paused) {
            frameInfo.nativeId = requestAnimationFrame(wrappedCallback);
          }
        } else {
          this.cancelAnimationFrame(frameId);
        }
      } catch (error) {
        console.error('TimerManager: Error in animation frame callback', error);
        this.cancelAnimationFrame(frameId);
      }
    };
    
    // Create frame info
    const frameInfo = {
      id: frameId,
      callback: callback,
      wrappedCallback: wrappedCallback,
      name: name || `frame_${frameId}`,
      createdAt: Date.now(),
      paused: false,
      frameCount: 0,
      nativeId: null
    };
    
    // Check if animations are paused
    if (!this.pausedCategories.has('animation')) {
      frameInfo.nativeId = requestAnimationFrame(wrappedCallback);
    } else {
      frameInfo.paused = true;
    }
    
    // Store frame info
    this.animationFrames.set(frameId, frameInfo);
    
    // Add to animation category
    this.categories.animation.add(frameId);
    
    // Update stats
    this.stats.created++;
    this.stats.active = this.timers.size + this.animationFrames.size;
    
    if (this.debugMode) {
      console.log(`TimerManager: Created animation frame ${frameInfo.name} (${frameId})`);
    }
    
    return frameId;
  }
  
  /**
   * Cancel animation frame
   */
  cancelAnimationFrame(frameId) {
    const frameInfo = this.animationFrames.get(frameId);
    if (!frameInfo) return false;
    
    if (frameInfo.nativeId) {
      cancelAnimationFrame(frameInfo.nativeId);
    }
    
    this.animationFrames.delete(frameId);
    this.categories.animation.delete(frameId);
    
    // Update stats
    this.stats.cleared++;
    this.stats.active = this.timers.size + this.animationFrames.size;
    
    if (this.debugMode) {
      console.log(`TimerManager: Cancelled animation frame ${frameInfo.name}`);
    }
    
    return true;
  }
  
  /**
   * Clear a timer
   */
  clearTimer(timerId) {
    const timerInfo = this.timers.get(timerId);
    if (!timerInfo) return false;
    
    // Clear native timer
    if (timerInfo.nativeId) {
      if (timerInfo.type === 'timeout') {
        clearTimeout(timerInfo.nativeId);
      } else if (timerInfo.type === 'interval') {
        clearInterval(timerInfo.nativeId);
      }
    }
    
    // Remove from category
    if (this.categories[timerInfo.category]) {
      this.categories[timerInfo.category].delete(timerId);
    }
    
    // Remove from timers map
    this.timers.delete(timerId);
    
    // Update stats
    this.stats.cleared++;
    this.stats.active = this.timers.size;
    
    if (this.debugMode) {
      console.log(`TimerManager: Cleared timer ${timerInfo.name}`);
    }
    
    return true;
  }
  
  /**
   * Clear all timers in a category
   */
  clearCategory(category) {
    if (!this.categories[category]) return 0;
    
    let cleared = 0;
    const timerIds = Array.from(this.categories[category]);
    
    timerIds.forEach(timerId => {
      // Check regular timers
      if (this.clearTimer(timerId)) {
        cleared++;
      }
      // Check animation frames
      else if (this.cancelAnimationFrame(timerId)) {
        cleared++;
      }
    });
    
    if (this.debugMode) {
      console.log(`TimerManager: Cleared ${cleared} timers in category ${category}`);
    }
    
    return cleared;
  }
  
  /**
   * Pause all timers in a category
   */
  pauseCategory(category) {
    if (this.pausedCategories.has(category)) return;
    
    this.pausedCategories.add(category);
    
    if (!this.categories[category]) return;
    
    let paused = 0;
    
    this.categories[category].forEach(timerId => {
      // Handle regular timers
      const timerInfo = this.timers.get(timerId);
      if (timerInfo && !timerInfo.paused) {
        if (timerInfo.nativeId) {
          if (timerInfo.type === 'timeout') {
            clearTimeout(timerInfo.nativeId);
            timerInfo.remainingDelay = timerInfo.delay - (Date.now() - timerInfo.createdAt);
          } else if (timerInfo.type === 'interval') {
            clearInterval(timerInfo.nativeId);
          }
          timerInfo.nativeId = null;
        }
        timerInfo.paused = true;
        timerInfo.pausedAt = Date.now();
        paused++;
      }
      
      // Handle animation frames
      const frameInfo = this.animationFrames.get(timerId);
      if (frameInfo && !frameInfo.paused) {
        if (frameInfo.nativeId) {
          cancelAnimationFrame(frameInfo.nativeId);
          frameInfo.nativeId = null;
        }
        frameInfo.paused = true;
        paused++;
      }
    });
    
    if (this.debugMode) {
      console.log(`TimerManager: Paused ${paused} timers in category ${category}`);
    }
  }
  
  /**
   * Resume all timers in a category
   */
  resumeCategory(category) {
    if (!this.pausedCategories.has(category)) return;
    
    this.pausedCategories.delete(category);
    
    if (!this.categories[category]) return;
    
    let resumed = 0;
    
    this.categories[category].forEach(timerId => {
      // Handle regular timers
      const timerInfo = this.timers.get(timerId);
      if (timerInfo && timerInfo.paused) {
        if (timerInfo.type === 'timeout') {
          timerInfo.nativeId = setTimeout(timerInfo.wrappedCallback, timerInfo.remainingDelay);
        } else if (timerInfo.type === 'interval') {
          timerInfo.nativeId = setInterval(() => {
            timerInfo.lastExecuted = Date.now();
            timerInfo.executionCount++;
            timerInfo.wrappedCallback();
          }, timerInfo.delay);
        }
        timerInfo.paused = false;
        timerInfo.pausedAt = null;
        resumed++;
      }
      
      // Handle animation frames
      const frameInfo = this.animationFrames.get(timerId);
      if (frameInfo && frameInfo.paused) {
        frameInfo.nativeId = requestAnimationFrame(frameInfo.wrappedCallback);
        frameInfo.paused = false;
        resumed++;
      }
    });
    
    if (this.debugMode) {
      console.log(`TimerManager: Resumed ${resumed} timers in category ${category}`);
    }
  }
  
  /**
   * Clear all timers
   */
  clearAll() {
    let cleared = 0;
    
    // Clear all regular timers
    const timerIds = Array.from(this.timers.keys());
    timerIds.forEach(timerId => {
      if (this.clearTimer(timerId)) {
        cleared++;
      }
    });
    
    // Clear all animation frames
    const frameIds = Array.from(this.animationFrames.keys());
    frameIds.forEach(frameId => {
      if (this.cancelAnimationFrame(frameId)) {
        cleared++;
      }
    });
    
    // Clear categories
    Object.keys(this.categories).forEach(category => {
      this.categories[category].clear();
    });
    
    // Clear paused categories
    this.pausedCategories.clear();
    
    console.log(`TimerManager: Cleared all ${cleared} timers`);
    return cleared;
  }
  
  /**
   * Get timer statistics
   */
  getStats() {
    const stats = { ...this.stats };
    stats.active = this.timers.size + this.animationFrames.size;
    stats.leaked = stats.created - stats.cleared - stats.active;
    
    // Category breakdown
    stats.categories = {};
    Object.keys(this.categories).forEach(category => {
      stats.categories[category] = {
        active: this.categories[category].size,
        paused: this.pausedCategories.has(category)
      };
    });
    
    // Timer type breakdown
    stats.types = {
      timeout: 0,
      interval: 0,
      animation: this.animationFrames.size
    };
    
    this.timers.forEach(timer => {
      stats.types[timer.type]++;
    });
    
    // Long-running timers
    stats.longRunning = [];
    const now = Date.now();
    this.timers.forEach(timer => {
      const runtime = now - timer.createdAt;
      if (runtime > 60000) { // Over 1 minute
        stats.longRunning.push({
          name: timer.name,
          type: timer.type,
          runtime: runtime,
          category: timer.category
        });
      }
    });
    
    return stats;
  }
  
  /**
   * Enable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (enabled) {
      console.log('TimerManager: Debug mode enabled');
      console.log('Current stats:', this.getStats());
    }
  }
  
  /**
   * Create a debounced function
   */
  debounce(func, delay, name = null) {
    let timerId = null;
    
    const debounced = (...args) => {
      if (timerId) {
        this.clearTimer(timerId);
      }
      
      timerId = this.setTimeout(() => {
        func(...args);
        timerId = null;
      }, delay, 'debounce', name || `debounce_${func.name}`);
    };
    
    debounced.cancel = () => {
      if (timerId) {
        this.clearTimer(timerId);
        timerId = null;
      }
    };
    
    return debounced;
  }
  
  /**
   * Create a throttled function
   */
  throttle(func, delay, name = null) {
    let timerId = null;
    let lastRun = 0;
    
    const throttled = (...args) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRun;
      
      if (timeSinceLastRun >= delay) {
        func(...args);
        lastRun = now;
      } else if (!timerId) {
        const remainingTime = delay - timeSinceLastRun;
        timerId = this.setTimeout(() => {
          func(...args);
          lastRun = Date.now();
          timerId = null;
        }, remainingTime, 'throttle', name || `throttle_${func.name}`);
      }
    };
    
    throttled.cancel = () => {
      if (timerId) {
        this.clearTimer(timerId);
        timerId = null;
      }
    };
    
    return throttled;
  }
  
  /**
   * Destroy the timer manager
   */
  destroy() {
    this.clearAll();
    this.timers.clear();
    this.animationFrames.clear();
    this.pausedCategories.clear();
    
    Object.keys(this.categories).forEach(category => {
      this.categories[category].clear();
    });
    
    console.log('TimerManager: Destroyed');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TimerManager;
}