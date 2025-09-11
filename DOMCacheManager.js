/**
 * DOM Cache Manager for OTTO Interface
 * Reduces repetitive querySelector calls by caching DOM element references
 * Automatically invalidates cache when DOM structure changes
 */

class DOMCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.mutationObserver = null;
    this.watchedElements = new Set();
    this.invalidationCallbacks = [];
    
    // Track cache performance
    this.performanceMetrics = {
      totalQueries: 0,
      cacheHitRate: 0,
      averageQueryTime: 0,
      lastCleanup: Date.now()
    };
    
    // Setup mutation observer for automatic cache invalidation
    this.setupMutationObserver();
  }
  
  /**
   * Setup MutationObserver to detect DOM changes
   */
  setupMutationObserver() {
    if (typeof MutationObserver === 'undefined') return;
    
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldInvalidate = false;
      
      for (const mutation of mutations) {
        if (mutation.type === 'childList' || 
            mutation.type === 'attributes' && mutation.attributeName === 'id') {
          shouldInvalidate = true;
          break;
        }
      }
      
      if (shouldInvalidate) {
        this.invalidateCache();
      }
    });
    
    // Observe the entire document for changes
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id', 'class', 'data-player', 'data-toggle', 'data-fill', 'data-param']
    });
  }
  
  /**
   * Get element from cache or query DOM
   * @param {string} selector - CSS selector
   * @param {boolean} forceRefresh - Force bypass cache
   * @returns {Element|null}
   */
  get(selector, forceRefresh = false) {
    this.performanceMetrics.totalQueries++;
    
    if (!forceRefresh && this.cache.has(selector)) {
      const cached = this.cache.get(selector);
      
      // Verify element is still in DOM
      if (cached && document.body.contains(cached)) {
        this.cacheHits++;
        this.updateMetrics();
        return cached;
      }
      
      // Element no longer in DOM, remove from cache
      this.cache.delete(selector);
    }
    
    // Query DOM and cache result
    this.cacheMisses++;
    const startTime = performance.now();
    const element = document.querySelector(selector);
    const queryTime = performance.now() - startTime;
    
    if (element) {
      this.cache.set(selector, element);
      this.watchedElements.add(element);
    }
    
    this.updateMetrics(queryTime);
    return element;
  }
  
  /**
   * Get multiple elements from cache or query DOM
   * @param {string} selector - CSS selector
   * @param {boolean} forceRefresh - Force bypass cache
   * @returns {NodeList}
   */
  getAll(selector, forceRefresh = false) {
    const cacheKey = `all:${selector}`;
    this.performanceMetrics.totalQueries++;
    
    if (!forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      
      // Verify all elements are still in DOM
      const allValid = Array.from(cached).every(el => document.body.contains(el));
      
      if (allValid) {
        this.cacheHits++;
        this.updateMetrics();
        return cached;
      }
      
      // Some elements no longer in DOM, remove from cache
      this.cache.delete(cacheKey);
    }
    
    // Query DOM and cache result
    this.cacheMisses++;
    const startTime = performance.now();
    const elements = document.querySelectorAll(selector);
    const queryTime = performance.now() - startTime;
    
    if (elements.length > 0) {
      this.cache.set(cacheKey, elements);
      elements.forEach(el => this.watchedElements.add(el));
    }
    
    this.updateMetrics(queryTime);
    return elements;
  }
  
  /**
   * Get element by ID from cache
   * @param {string} id - Element ID (without #)
   * @param {boolean} forceRefresh - Force bypass cache
   * @returns {Element|null}
   */
  getById(id, forceRefresh = false) {
    return this.get(`#${id}`, forceRefresh);
  }
  
  /**
   * Batch get multiple selectors
   * @param {Array<string>} selectors - Array of CSS selectors
   * @returns {Object} Map of selector to element
   */
  getBatch(selectors) {
    const results = {};
    
    for (const selector of selectors) {
      results[selector] = this.get(selector);
    }
    
    return results;
  }
  
  /**
   * Invalidate specific cache entry
   * @param {string} selector - CSS selector to invalidate
   */
  invalidate(selector) {
    this.cache.delete(selector);
    this.cache.delete(`all:${selector}`);
  }
  
  /**
   * Invalidate entire cache
   */
  invalidateCache() {
    const previousSize = this.cache.size;
    this.cache.clear();
    this.watchedElements.clear();
    
    // Notify listeners
    this.invalidationCallbacks.forEach(callback => {
      try {
        callback(previousSize);
      } catch (error) {
        console.error('Cache invalidation callback error:', error);
      }
    });
  }
  
  /**
   * Add callback for cache invalidation events
   * @param {Function} callback - Function to call on invalidation
   */
  onInvalidation(callback) {
    this.invalidationCallbacks.push(callback);
  }
  
  /**
   * Update performance metrics
   * @param {number} queryTime - Time taken for last query
   */
  updateMetrics(queryTime = 0) {
    const hitRate = this.cacheHits / (this.cacheHits + this.cacheMisses);
    this.performanceMetrics.cacheHitRate = Math.round(hitRate * 100);
    
    if (queryTime > 0) {
      const avgTime = this.performanceMetrics.averageQueryTime;
      const totalQueries = this.performanceMetrics.totalQueries;
      this.performanceMetrics.averageQueryTime = 
        (avgTime * (totalQueries - 1) + queryTime) / totalQueries;
    }
    
    // Periodic cleanup of stale entries
    if (Date.now() - this.performanceMetrics.lastCleanup > 60000) { // Every minute
      this.cleanupStaleEntries();
    }
  }
  
  /**
   * Remove stale cache entries
   */
  cleanupStaleEntries() {
    const entriesToRemove = [];
    
    for (const [selector, element] of this.cache.entries()) {
      if (!document.body.contains(element)) {
        entriesToRemove.push(selector);
      }
    }
    
    entriesToRemove.forEach(selector => this.cache.delete(selector));
    this.performanceMetrics.lastCleanup = Date.now();
  }
  
  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      hitRate: this.performanceMetrics.cacheHitRate,
      averageQueryTime: this.performanceMetrics.averageQueryTime.toFixed(3),
      watchedElements: this.watchedElements.size
    };
  }
  
  /**
   * Destroy cache manager and cleanup
   */
  destroy() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    this.cache.clear();
    this.watchedElements.clear();
    this.invalidationCallbacks = [];
  }
  
  /**
   * Prefetch and cache common selectors
   * @param {Array<string>} selectors - Selectors to prefetch
   */
  prefetch(selectors) {
    selectors.forEach(selector => {
      if (!this.cache.has(selector)) {
        this.get(selector);
      }
    });
  }
  
  /**
   * Cache frequently used elements on initialization
   */
  warmupCache() {
    const commonSelectors = [
      '#tempo-display',
      '#kit-dropdown',
      '#group-dropdown',
      '#preset-dropdown',
      '#current-player-number',
      '.player-tab',
      '.pattern-btn',
      '.custom-slider',
      '[data-toggle]',
      '[data-fill]',
      '.dropdown-option',
      '#splash-screen',
      '#loop-timeline',
      '#loop-handle',
      '#mute-drummer-btn',
      '#kit-mixer-btn'
    ];
    
    this.prefetch(commonSelectors);
  }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DOMCacheManager;
}