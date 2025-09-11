/**
 * RenderOptimizer.js
 * Optimizes rendering and DOM updates for better performance
 * Phase 4 Implementation
 */

class RenderOptimizer {
  constructor() {
    // RAF management
    this.rafCallbacks = new Map();
    this.rafId = null;
    this.isRunning = false;
    
    // Batch update queue
    this.updateQueue = [];
    this.updateScheduled = false;
    
    // Virtual DOM-like diffing for batch updates
    this.domCache = new WeakMap();
    
    // FPS monitoring
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.fps = 60;
    this.targetFPS = 60;
    this.frameTime = 1000 / this.targetFPS;
    
    // Performance metrics
    this.metrics = {
      totalFrames: 0,
      droppedFrames: 0,
      averageFPS: 60,
      renderTime: 0,
      updateCount: 0
    };
    
    // Intersection Observer for visibility
    this.visibilityObserver = null;
    this.visibleElements = new Set();
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize render optimizer
   */
  initialize() {
    // Set up visibility observer
    this.setupVisibilityObserver();
    
    // Start animation loop
    this.start();
    
    // Monitor page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pause();
      } else {
        this.resume();
      }
    });
  }
  
  /**
   * Set up intersection observer
   */
  setupVisibilityObserver() {
    const options = {
      root: null,
      rootMargin: '50px',
      threshold: 0.01
    };
    
    this.visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.visibleElements.add(entry.target);
        } else {
          this.visibleElements.delete(entry.target);
        }
      });
    }, options);
  }
  
  /**
   * Register element for visibility tracking
   */
  observeElement(element) {
    if (this.visibilityObserver && element) {
      this.visibilityObserver.observe(element);
    }
  }
  
  /**
   * Unregister element from visibility tracking
   */
  unobserveElement(element) {
    if (this.visibilityObserver && element) {
      this.visibilityObserver.unobserve(element);
      this.visibleElements.delete(element);
    }
  }
  
  /**
   * Check if element is visible
   */
  isElementVisible(element) {
    return this.visibleElements.has(element);
  }
  
  /**
   * Request animation frame with callback
   */
  requestFrame(id, callback, priority = 0) {
    if (!this.rafCallbacks.has(id)) {
      this.rafCallbacks.set(id, {
        callback,
        priority,
        lastRun: 0
      });
    }
  }
  
  /**
   * Cancel animation frame
   */
  cancelFrame(id) {
    this.rafCallbacks.delete(id);
  }
  
  /**
   * Main animation loop
   */
  animationLoop(currentTime) {
    if (!this.isRunning) return;
    
    const startTime = performance.now();
    
    // Calculate FPS
    this.calculateFPS(currentTime);
    
    // Process callbacks by priority
    const callbacks = Array.from(this.rafCallbacks.values())
      .sort((a, b) => b.priority - a.priority);
    
    for (const item of callbacks) {
      // Skip if called too recently (throttling)
      if (currentTime - item.lastRun < this.frameTime) {
        continue;
      }
      
      try {
        item.callback(currentTime);
        item.lastRun = currentTime;
      } catch (error) {
        console.error('Error in RAF callback:', error);
      }
    }
    
    // Process batch updates
    if (this.updateScheduled) {
      this.processBatchUpdates();
    }
    
    // Update metrics
    const renderTime = performance.now() - startTime;
    this.updateMetrics(renderTime);
    
    // Schedule next frame
    this.rafId = requestAnimationFrame((time) => this.animationLoop(time));
  }
  
  /**
   * Calculate current FPS
   */
  calculateFPS(currentTime) {
    this.frameCount++;
    
    if (currentTime >= this.lastFrameTime + 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastFrameTime));
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
      
      // Adjust quality based on FPS
      if (this.fps < 30) {
        this.reduceQuality();
      } else if (this.fps > 55) {
        this.increaseQuality();
      }
    }
  }
  
  /**
   * Reduce rendering quality for better performance
   */
  reduceQuality() {
    // Reduce animation complexity
    document.body.classList.add('reduced-motion');
    
    // Increase frame skip threshold
    this.frameTime = 1000 / 30;
  }
  
  /**
   * Increase rendering quality
   */
  increaseQuality() {
    // Restore animations
    document.body.classList.remove('reduced-motion');
    
    // Restore target frame rate
    this.frameTime = 1000 / this.targetFPS;
  }
  
  /**
   * Batch DOM update
   */
  batchUpdate(element, updates) {
    this.updateQueue.push({ element, updates });
    
    if (!this.updateScheduled) {
      this.updateScheduled = true;
    }
  }
  
  /**
   * Process batch updates
   */
  processBatchUpdates() {
    const fragment = document.createDocumentFragment();
    const updates = new Map();
    
    // Group updates by parent
    for (const update of this.updateQueue) {
      const parent = update.element.parentNode;
      if (!updates.has(parent)) {
        updates.set(parent, []);
      }
      updates.get(parent).push(update);
    }
    
    // Apply updates
    updates.forEach((updateList, parent) => {
      // Only update visible elements immediately
      updateList.forEach(({ element, updates }) => {
        if (this.isElementVisible(element) || !element.isConnected) {
          this.applyUpdates(element, updates);
        } else {
          // Defer non-visible updates
          this.deferUpdate(element, updates);
        }
      });
    });
    
    // Clear queue
    this.updateQueue = [];
    this.updateScheduled = false;
    this.metrics.updateCount++;
  }
  
  /**
   * Apply updates to element
   */
  applyUpdates(element, updates) {
    // Cache current state
    const cache = this.domCache.get(element) || {};
    let hasChanges = false;
    
    // Apply only changed properties
    for (const [key, value] of Object.entries(updates)) {
      if (cache[key] !== value) {
        if (key === 'textContent' || key === 'innerHTML') {
          element[key] = value;
        } else if (key === 'classList') {
          this.updateClassList(element, value);
        } else if (key === 'style') {
          Object.assign(element.style, value);
        } else if (key.startsWith('data-')) {
          element.setAttribute(key, value);
        } else {
          element[key] = value;
        }
        cache[key] = value;
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      this.domCache.set(element, cache);
    }
  }
  
  /**
   * Update class list efficiently
   */
  updateClassList(element, classes) {
    if (Array.isArray(classes)) {
      // Replace all classes
      element.className = classes.join(' ');
    } else if (typeof classes === 'object') {
      // Add/remove specific classes
      for (const [className, shouldAdd] of Object.entries(classes)) {
        element.classList.toggle(className, shouldAdd);
      }
    }
  }
  
  /**
   * Defer update for non-visible element
   */
  deferUpdate(element, updates) {
    // Store deferred updates
    const deferred = this.deferredUpdates.get(element) || {};
    Object.assign(deferred, updates);
    this.deferredUpdates.set(element, deferred);
    
    // Set up observer to apply when visible
    this.observeElement(element);
  }
  
  /**
   * Force immediate render
   */
  forceRender() {
    if (this.updateQueue.length > 0) {
      this.processBatchUpdates();
    }
  }
  
  /**
   * Debounce function with RAF
   */
  debounceWithRAF(func, wait = 0) {
    let timeout;
    let rafId;
    
    return (...args) => {
      const later = () => {
        timeout = null;
        rafId = requestAnimationFrame(() => func(...args));
      };
      
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * Throttle function with RAF
   */
  throttleWithRAF(func, limit = 16) {
    let inThrottle;
    let lastTime = 0;
    
    return (...args) => {
      const now = performance.now();
      
      if (!inThrottle && now - lastTime >= limit) {
        requestAnimationFrame(() => {
          func(...args);
          lastTime = now;
          inThrottle = false;
        });
        inThrottle = true;
      }
    };
  }
  
  /**
   * Create virtual list for large datasets
   */
  createVirtualList(container, items, itemHeight, renderItem) {
    const scrollHeight = items.length * itemHeight;
    const viewportHeight = container.clientHeight;
    const visibleCount = Math.ceil(viewportHeight / itemHeight);
    const totalCount = items.length;
    
    // Create spacer elements
    const spacerTop = document.createElement('div');
    const spacerBottom = document.createElement('div');
    const itemContainer = document.createElement('div');
    
    container.innerHTML = '';
    container.appendChild(spacerTop);
    container.appendChild(itemContainer);
    container.appendChild(spacerBottom);
    
    const updateVisibleItems = () => {
      const scrollTop = container.scrollTop;
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount + 1, totalCount);
      
      // Update spacers
      spacerTop.style.height = `${startIndex * itemHeight}px`;
      spacerBottom.style.height = `${Math.max(0, (totalCount - endIndex) * itemHeight)}px`;
      
      // Render visible items
      itemContainer.innerHTML = '';
      for (let i = startIndex; i < endIndex; i++) {
        const element = renderItem(items[i], i);
        itemContainer.appendChild(element);
      }
    };
    
    // Use RAF for smooth scrolling
    const handleScroll = this.throttleWithRAF(updateVisibleItems, 16);
    container.addEventListener('scroll', handleScroll);
    
    // Initial render
    updateVisibleItems();
    
    return {
      update: updateVisibleItems,
      destroy: () => container.removeEventListener('scroll', handleScroll)
    };
  }
  
  /**
   * Update metrics
   */
  updateMetrics(renderTime) {
    this.metrics.totalFrames++;
    this.metrics.renderTime = renderTime;
    
    if (renderTime > this.frameTime) {
      this.metrics.droppedFrames++;
    }
    
    // Calculate average FPS
    this.metrics.averageFPS = Math.round(
      (this.metrics.averageFPS * 0.9) + (this.fps * 0.1)
    );
  }
  
  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      currentFPS: this.fps,
      visibleElements: this.visibleElements.size,
      pendingUpdates: this.updateQueue.length
    };
  }
  
  /**
   * Start animation loop
   */
  start() {
    if (!this.isRunning) {
      this.isRunning = true;
      this.animationLoop(performance.now());
    }
  }
  
  /**
   * Pause animation loop
   */
  pause() {
    this.isRunning = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
  
  /**
   * Resume animation loop
   */
  resume() {
    if (!this.isRunning) {
      this.start();
    }
  }
  
  /**
   * Destroy optimizer
   */
  destroy() {
    this.pause();
    
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
    }
    
    this.rafCallbacks.clear();
    this.updateQueue = [];
    this.visibleElements.clear();
    this.domCache = new WeakMap();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RenderOptimizer;
}