/**
 * EventManager.js
 * Centralized event listener management with automatic cleanup
 * Prevents memory leaks and provides lifecycle tracking
 */

class EventManager {
  constructor() {
    // WeakMap for element -> listeners mapping (allows GC)
    this.elementListeners = new WeakMap();

    // Map for named event groups (for bulk operations)
    this.eventGroups = new Map();

    // Set of all active listener IDs for debugging
    this.activeListeners = new Set();

    // Listener count limits
    this.maxListenersPerElement = 50;
    this.maxTotalListeners = 5000;

    // Debug mode flag
    this.debugMode = false;

    // Statistics
    this.stats = {
      added: 0,
      removed: 0,
      leaked: 0,
      activeCount: 0,
    };

    // Mutation observer for automatic cleanup
    this.observer = null;
    this.initMutationObserver();
  }

  /**
   * Initialize mutation observer to detect removed elements
   */
  initMutationObserver() {
    if (typeof MutationObserver === "undefined") return;

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.cleanupElement(node);
            // Recursively cleanup child elements
            const children = node.querySelectorAll("*");
            children.forEach((child) => this.cleanupElement(child));
          }
        });
      });
    });

    // Start observing when DOM is ready
    if (document.body) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    }
  }

  /**
   * Add an event listener with tracking
   */
  addEventListener(element, event, handler, options = {}, group = null) {
    if (!element || !event || !handler) {
      console.error("EventManager: Invalid parameters for addEventListener");
      return null;
    }

    // Check listener limits
    if (this.activeListeners.size >= this.maxTotalListeners) {
      console.warn("EventManager: Maximum total listeners reached");
      return null;
    }

    // Get or create listener map for this element
    let elementMap = this.elementListeners.get(element);
    if (!elementMap) {
      elementMap = new Map();
      this.elementListeners.set(element, elementMap);
    }

    // Check per-element limit
    if (elementMap.size >= this.maxListenersPerElement) {
      console.warn("EventManager: Maximum listeners per element reached");
      return null;
    }

    // Generate unique listener ID
    const listenerId = this.generateListenerId(element, event);

    // Create listener wrapper for tracking
    const listenerWrapper = {
      id: listenerId,
      element: element,
      event: event,
      handler: handler,
      options: options,
      group: group,
      addedAt: Date.now(),
      callCount: 0,
      lastCalled: null,
      actualHandler: (e) => {
        listenerWrapper.callCount++;
        listenerWrapper.lastCalled = Date.now();
        try {
          return handler.call(element, e);
        } catch (error) {
          console.error("EventManager: Error in event handler", error);
        }
      },
    };

    // Store in element map
    const eventKey = this.getEventKey(event, options);
    elementMap.set(eventKey, listenerWrapper);

    // Add to group if specified
    if (group) {
      if (!this.eventGroups.has(group)) {
        this.eventGroups.set(group, new Set());
      }
      this.eventGroups.get(group).add(listenerWrapper);
    }

    // Add to active listeners
    this.activeListeners.add(listenerId);

    // Actually add the event listener
    element.addEventListener(event, listenerWrapper.actualHandler, options);

    // Update stats
    this.stats.added++;
    this.stats.activeCount = this.activeListeners.size;

    if (this.debugMode) {
      console.log(`EventManager: Added listener ${listenerId}`);
    }

    return listenerId;
  }

  /**
   * Remove a specific event listener
   */
  removeEventListener(element, event, handler = null, options = {}) {
    if (!element || !event) return false;

    const elementMap = this.elementListeners.get(element);
    if (!elementMap) return false;

    const eventKey = this.getEventKey(event, options);
    const listenerWrapper = elementMap.get(eventKey);

    if (!listenerWrapper) return false;

    // If handler specified, verify it matches
    if (handler && listenerWrapper.handler !== handler) return false;

    // Remove actual event listener
    element.removeEventListener(event, listenerWrapper.actualHandler, options);

    // Remove from element map
    elementMap.delete(eventKey);

    // Clean up empty element map
    if (elementMap.size === 0) {
      this.elementListeners.delete(element);
    }

    // Remove from group if applicable
    if (listenerWrapper.group) {
      const group = this.eventGroups.get(listenerWrapper.group);
      if (group) {
        group.delete(listenerWrapper);
        if (group.size === 0) {
          this.eventGroups.delete(listenerWrapper.group);
        }
      }
    }

    // Remove from active listeners
    this.activeListeners.delete(listenerWrapper.id);

    // Update stats
    this.stats.removed++;
    this.stats.activeCount = this.activeListeners.size;

    if (this.debugMode) {
      console.log(`EventManager: Removed listener ${listenerWrapper.id}`);
    }

    return true;
  }

  /**
   * Remove all listeners from an element
   */
  cleanupElement(element) {
    if (!element) return;

    const elementMap = this.elementListeners.get(element);
    if (!elementMap) return;

    let removed = 0;
    elementMap.forEach((listenerWrapper, eventKey) => {
      element.removeEventListener(
        listenerWrapper.event,
        listenerWrapper.actualHandler,
        listenerWrapper.options,
      );

      // Remove from group
      if (listenerWrapper.group) {
        const group = this.eventGroups.get(listenerWrapper.group);
        if (group) {
          group.delete(listenerWrapper);
        }
      }

      // Remove from active listeners
      this.activeListeners.delete(listenerWrapper.id);
      removed++;
    });

    // Clear element map
    this.elementListeners.delete(element);

    // Update stats
    this.stats.removed += removed;
    this.stats.activeCount = this.activeListeners.size;

    if (this.debugMode && removed > 0) {
      console.log(`EventManager: Cleaned up ${removed} listeners from element`);
    }
  }

  /**
   * Remove all listeners in a group
   */
  removeGroup(groupName) {
    const group = this.eventGroups.get(groupName);
    if (!group) return 0;

    let removed = 0;
    group.forEach((listenerWrapper) => {
      this.removeEventListener(
        listenerWrapper.element,
        listenerWrapper.event,
        listenerWrapper.handler,
        listenerWrapper.options,
      );
      removed++;
    });

    this.eventGroups.delete(groupName);

    if (this.debugMode) {
      console.log(
        `EventManager: Removed ${removed} listeners from group ${groupName}`,
      );
    }

    return removed;
  }

  /**
   * Remove all event listeners
   */
  removeAll() {
    let removed = 0;

    // Remove all groups
    this.eventGroups.forEach((group, groupName) => {
      removed += this.removeGroup(groupName);
    });

    // Remove any remaining listeners
    const elements = [];
    this.elementListeners.forEach((map, element) => {
      elements.push(element);
    });

    elements.forEach((element) => {
      this.cleanupElement(element);
      removed++;
    });

    // Clear all tracking
    this.activeListeners.clear();
    this.eventGroups.clear();

    // Update stats
    this.stats.activeCount = 0;

    console.log(`EventManager: Removed all ${removed} listeners`);
    return removed;
  }

  /**
   * Get statistics about event listeners
   */
  getStats() {
    const stats = { ...this.stats };

    // Calculate potential leaks
    stats.leaked = stats.added - stats.removed - stats.activeCount;

    // Group statistics
    stats.groups = {};
    this.eventGroups.forEach((group, name) => {
      stats.groups[name] = group.size;
    });

    // Element statistics
    stats.elementCount = 0;
    stats.elementsWithMostListeners = [];

    this.elementListeners.forEach((map, element) => {
      stats.elementCount++;
      if (map.size > 10) {
        stats.elementsWithMostListeners.push({
          element: element.tagName + (element.id ? "#" + element.id : ""),
          count: map.size,
        });
      }
    });

    stats.elementsWithMostListeners.sort((a, b) => b.count - a.count);

    return stats;
  }

  /**
   * Enable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (enabled) {
      console.log("EventManager: Debug mode enabled");
      console.log("Current stats:", this.getStats());
    }
  }

  /**
   * Generate unique listener ID
   */
  generateListenerId(element, event) {
    const elementId = element.id || element.className || element.tagName;
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${elementId}_${event}_${timestamp}_${random}`;
  }

  /**
   * Get event key for storage
   */
  getEventKey(event, options) {
    const capture = options.capture || false;
    const passive = options.passive || false;
    const once = options.once || false;
    return `${event}_${capture}_${passive}_${once}`;
  }

  /**
   * Destroy the event manager
   */
  destroy() {
    // Stop mutation observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Remove all listeners
    this.removeAll();

    // Clear all references
    this.elementListeners = new WeakMap();
    this.eventGroups.clear();
    this.activeListeners.clear();

    console.log("EventManager: Destroyed");
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = EventManager;
}
