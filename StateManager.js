/**
 * StateManager.js
 * Centralized state management with validation and transactions
 * Replaces the problematic atomicStateUpdate system
 */

class StateManager {
  constructor() {
    // Current state
    this.state = {};

    // Previous state for rollback
    this.previousState = {};

    // State update queue
    this.updateQueue = [];
    this.maxQueueSize = 100;

    // Transaction tracking
    this.currentTransaction = null;
    this.transactionHistory = [];
    this.maxHistorySize = 50;

    // State validators
    this.validators = new Map();

    // State listeners
    this.listeners = new Map();

    // Dirty tracking
    this.dirtyPaths = new Set();

    // Update batching
    this.batchedUpdates = [];
    this.batchTimer = null;
    this.batchDelay = 16; // One frame

    // Statistics
    this.stats = {
      updates: 0,
      transactions: 0,
      rollbacks: 0,
      validationFailures: 0,
      queueOverflows: 0,
    };

    // Debug mode
    this.debugMode = false;
  }

  /**
   * Initialize state with default values
   */
  initialize(initialState = {}) {
    this.state = this.deepClone(initialState);
    this.previousState = this.deepClone(initialState);

    if (this.debugMode) {
      console.log("StateManager: Initialized with state", this.state);
    }
  }

  /**
   * Register a validator for a state path
   */
  registerValidator(path, validator) {
    if (typeof validator !== "function") {
      console.error("StateManager: Validator must be a function");
      return false;
    }

    this.validators.set(path, validator);
    return true;
  }

  /**
   * Register a listener for state changes
   */
  addListener(path, listener, immediate = false) {
    if (typeof listener !== "function") {
      console.error("StateManager: Listener must be a function");
      return null;
    }

    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }

    this.listeners.get(path).add(listener);

    // Call immediately with current value if requested
    if (immediate) {
      const value = this.getState(path);
      listener(value, value, path);
    }

    return () => this.removeListener(path, listener);
  }

  /**
   * Remove a listener
   */
  removeListener(path, listener) {
    const pathListeners = this.listeners.get(path);
    if (pathListeners) {
      pathListeners.delete(listener);
      if (pathListeners.size === 0) {
        this.listeners.delete(path);
      }
    }
  }

  /**
   * Get state value by path
   */
  getState(path = null) {
    if (!path) return this.deepClone(this.state);

    const keys = path.split(".");
    let value = this.state;

    for (const key of keys) {
      if (value && typeof value === "object") {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return this.deepClone(value);
  }

  /**
   * Set state with validation
   */
  setState(path, value, options = {}) {
    const {
      validate = true,
      notify = true,
      batch = false,
      source = "unknown",
    } = options;

    // Create update object
    const update = {
      path,
      value,
      timestamp: Date.now(),
      source,
      validate,
      notify,
    };

    // Add to batch or process immediately
    if (batch) {
      this.addToBatch(update);
    } else {
      this.processUpdate(update);
    }
  }

  /**
   * Process a state update
   */
  processUpdate(update) {
    const { path, value, validate, notify } = update;

    // Validate if required
    if (validate) {
      const validator = this.validators.get(path);
      if (validator && !validator(value)) {
        this.stats.validationFailures++;
        if (this.debugMode) {
          console.error(`StateManager: Validation failed for ${path}`, value);
        }
        return false;
      }
    }

    // Queue overflow check
    if (this.updateQueue.length >= this.maxQueueSize) {
      this.stats.queueOverflows++;
      this.updateQueue.shift(); // Remove oldest
    }

    // Store previous value
    const previousValue = this.getState(path);

    // Apply update
    this.applyUpdate(path, value);

    // Track dirty path
    this.dirtyPaths.add(path);

    // Add to queue
    this.updateQueue.push({
      ...update,
      previousValue,
    });

    // Update stats
    this.stats.updates++;

    // Notify listeners if required
    if (notify) {
      this.notifyListeners(path, value, previousValue);
    }

    if (this.debugMode) {
      console.log(`StateManager: Updated ${path}`, { previousValue, value });
    }

    return true;
  }

  /**
   * Apply update to state
   */
  applyUpdate(path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();

    // Navigate to parent object
    let current = this.state;
    for (const key of keys) {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    // Set the value
    current[lastKey] = value;
  }

  /**
   * Batch updates
   */
  addToBatch(update) {
    this.batchedUpdates.push(update);

    // Clear existing timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    // Set new timer
    this.batchTimer = setTimeout(() => {
      this.processBatch();
    }, this.batchDelay);
  }

  /**
   * Process batched updates
   */
  processBatch() {
    if (this.batchedUpdates.length === 0) return;

    const updates = [...this.batchedUpdates];
    this.batchedUpdates = [];
    this.batchTimer = null;

    // Start transaction
    this.beginTransaction("batch");

    // Process all updates
    updates.forEach((update) => {
      this.processUpdate(update);
    });

    // Commit transaction
    this.commitTransaction();
  }

  /**
   * Begin a transaction
   */
  beginTransaction(name = "transaction") {
    if (this.currentTransaction) {
      console.warn("StateManager: Transaction already in progress");
      return false;
    }

    this.currentTransaction = {
      name,
      startTime: Date.now(),
      previousState: this.deepClone(this.state),
      updates: [],
      dirtyPaths: new Set(),
    };

    if (this.debugMode) {
      console.log(`StateManager: Transaction "${name}" started`);
    }

    return true;
  }

  /**
   * Commit current transaction
   */
  commitTransaction() {
    if (!this.currentTransaction) {
      console.warn("StateManager: No transaction to commit");
      return false;
    }

    const transaction = this.currentTransaction;
    transaction.endTime = Date.now();
    transaction.duration = transaction.endTime - transaction.startTime;

    // Store transaction in history
    this.transactionHistory.push({
      name: transaction.name,
      timestamp: transaction.startTime,
      duration: transaction.duration,
      updates: transaction.updates.length,
      dirtyPaths: Array.from(transaction.dirtyPaths),
    });

    // Trim history
    if (this.transactionHistory.length > this.maxHistorySize) {
      this.transactionHistory.shift();
    }

    // Clear current transaction
    this.currentTransaction = null;

    // Update stats
    this.stats.transactions++;

    if (this.debugMode) {
      console.log(
        `StateManager: Transaction "${transaction.name}" committed (${transaction.duration}ms)`,
      );
    }

    return true;
  }

  /**
   * Rollback current transaction
   */
  rollbackTransaction() {
    if (!this.currentTransaction) {
      console.warn("StateManager: No transaction to rollback");
      return false;
    }

    const transaction = this.currentTransaction;

    // Restore previous state
    this.state = this.deepClone(transaction.previousState);

    // Clear dirty paths from this transaction
    transaction.dirtyPaths.forEach((path) => {
      this.dirtyPaths.delete(path);
    });

    // Clear current transaction
    this.currentTransaction = null;

    // Update stats
    this.stats.rollbacks++;

    if (this.debugMode) {
      console.log(
        `StateManager: Transaction "${transaction.name}" rolled back`,
      );
    }

    return true;
  }

  /**
   * Notify listeners of state change
   */
  notifyListeners(path, value, previousValue) {
    // Notify exact path listeners
    const exactListeners = this.listeners.get(path);
    if (exactListeners) {
      exactListeners.forEach((listener) => {
        try {
          listener(value, previousValue, path);
        } catch (error) {
          console.error("StateManager: Error in listener", error);
        }
      });
    }

    // Notify parent path listeners
    const pathParts = path.split(".");
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join(".");
      const parentListeners = this.listeners.get(parentPath);
      if (parentListeners) {
        const parentValue = this.getState(parentPath);
        parentListeners.forEach((listener) => {
          try {
            listener(parentValue, parentValue, parentPath);
          } catch (error) {
            console.error("StateManager: Error in parent listener", error);
          }
        });
      }
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => {
        try {
          listener(this.state, this.previousState, "*");
        } catch (error) {
          console.error("StateManager: Error in wildcard listener", error);
        }
      });
    }
  }

  /**
   * Get state diff between two states
   */
  getDiff(oldState, newState, path = "") {
    const diff = [];

    // Check for additions and modifications
    for (const key in newState) {
      const currentPath = path ? `${path}.${key}` : key;

      if (!(key in oldState)) {
        diff.push({
          type: "add",
          path: currentPath,
          value: newState[key],
        });
      } else if (typeof newState[key] === "object" && newState[key] !== null) {
        if (typeof oldState[key] === "object" && oldState[key] !== null) {
          diff.push(...this.getDiff(oldState[key], newState[key], currentPath));
        } else {
          diff.push({
            type: "modify",
            path: currentPath,
            oldValue: oldState[key],
            newValue: newState[key],
          });
        }
      } else if (newState[key] !== oldState[key]) {
        diff.push({
          type: "modify",
          path: currentPath,
          oldValue: oldState[key],
          newValue: newState[key],
        });
      }
    }

    // Check for deletions
    for (const key in oldState) {
      if (!(key in newState)) {
        const currentPath = path ? `${path}.${key}` : key;
        diff.push({
          type: "delete",
          path: currentPath,
          oldValue: oldState[key],
        });
      }
    }

    return diff;
  }

  /**
   * Check if state is dirty
   */
  isDirty(path = null) {
    if (!path) {
      return this.dirtyPaths.size > 0;
    }
    return this.dirtyPaths.has(path);
  }

  /**
   * Clear dirty flags
   */
  clearDirty(path = null) {
    if (!path) {
      this.dirtyPaths.clear();
    } else {
      this.dirtyPaths.delete(path);
    }
  }

  /**
   * Get state statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.updateQueue.length,
      dirtyPaths: this.dirtyPaths.size,
      listeners: this.listeners.size,
      validators: this.validators.size,
      transactionHistory: this.transactionHistory.length,
      currentTransaction: this.currentTransaction
        ? this.currentTransaction.name
        : null,
    };
  }

  /**
   * Deep clone helper
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map((item) => this.deepClone(item));
    if (obj instanceof Set)
      return new Set(Array.from(obj).map((item) => this.deepClone(item)));
    if (obj instanceof Map) {
      const clonedMap = new Map();
      obj.forEach((value, key) => {
        clonedMap.set(this.deepClone(key), this.deepClone(value));
      });
      return clonedMap;
    }

    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = this.deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  /**
   * Enable debug mode
   */
  setDebugMode(enabled) {
    this.debugMode = enabled;
    if (enabled) {
      console.log("StateManager: Debug mode enabled");
      console.log("Current state:", this.state);
      console.log("Stats:", this.getStats());
    }
  }

  /**
   * Reset state
   */
  reset(newState = {}) {
    this.state = this.deepClone(newState);
    this.previousState = this.deepClone(newState);
    this.updateQueue = [];
    this.dirtyPaths.clear();
    this.currentTransaction = null;

    // Notify all listeners of reset
    this.listeners.forEach((listeners, path) => {
      const value = this.getState(path);
      listeners.forEach((listener) => {
        try {
          listener(value, value, path);
        } catch (error) {
          console.error("StateManager: Error in reset listener", error);
        }
      });
    });

    if (this.debugMode) {
      console.log("StateManager: State reset");
    }
  }

  /**
   * Destroy the state manager
   */
  destroy() {
    // Clear batch timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Clear all data
    this.state = {};
    this.previousState = {};
    this.updateQueue = [];
    this.batchedUpdates = [];
    this.dirtyPaths.clear();
    this.listeners.clear();
    this.validators.clear();
    this.transactionHistory = [];
    this.currentTransaction = null;

    console.log("StateManager: Destroyed");
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = StateManager;
}
