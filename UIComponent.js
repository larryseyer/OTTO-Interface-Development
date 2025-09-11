/**
 * UIComponent.js
 * Base class for all UI components with lifecycle management
 * Phase 5 Implementation
 */

class UIComponent {
  constructor(options = {}) {
    // Component identification
    this.id = options.id || this.generateId();
    this.type = options.type || "component";
    this.name = options.name || this.constructor.name;

    // DOM elements
    this.container = null;
    this.element = null;
    this.children = new Map();

    // State management
    this.state = {};
    this.props = options.props || {};

    // Event handling
    this.eventListeners = new Map();
    this.eventManager = options.eventManager || window.eventManager;

    // Lifecycle flags
    this.mounted = false;
    this.initialized = false;
    this.destroyed = false;

    // Parent/child relationships
    this.parent = null;

    // Render optimization
    this.renderOptimizer = options.renderOptimizer || window.renderOptimizer;
    this.shouldUpdate = true;
    this.updateScheduled = false;

    // Component-specific options
    this.options = options;

    // Initialize if container provided
    if (options.container) {
      this.mount(options.container);
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `${this.constructor.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize component
   */
  initialize() {
    if (this.initialized) return;

    // Call lifecycle hook
    this.beforeInitialize();

    // Create DOM structure
    this.createElement();

    // Set up event listeners
    this.setupEventListeners();

    // Initialize children
    this.initializeChildren();

    // Mark as initialized
    this.initialized = true;

    // Call lifecycle hook
    this.afterInitialize();
  }

  /**
   * Create DOM element
   */
  createElement() {
    this.element = document.createElement(this.options.tagName || "div");
    this.element.id = this.id;
    this.element.className = this.getClassName();
    this.element.dataset.component = this.name;

    // Store reference for debugging
    this.element._component = this;

    // Render initial content
    this.render();
  }

  /**
   * Get component class name
   */
  getClassName() {
    const classes = ["ui-component", `ui-${this.type}`];
    if (this.options.className) {
      classes.push(this.options.className);
    }
    return classes.join(" ");
  }

  /**
   * Mount component to container
   */
  mount(container) {
    if (this.mounted) {
      console.warn(`Component ${this.id} is already mounted`);
      return;
    }

    this.container =
      typeof container === "string"
        ? document.querySelector(container)
        : container;

    if (!this.container) {
      throw new Error(`Container not found for component ${this.id}`);
    }

    // Initialize if not done
    if (!this.initialized) {
      this.initialize();
    }

    // Call lifecycle hook
    this.beforeMount();

    // Add to DOM
    this.container.appendChild(this.element);

    // Mark as mounted
    this.mounted = true;

    // Call lifecycle hook
    this.afterMount();

    // Initial update
    this.update();
  }

  /**
   * Unmount component
   */
  unmount() {
    if (!this.mounted) return;

    // Call lifecycle hook
    this.beforeUnmount();

    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    // Mark as unmounted
    this.mounted = false;

    // Call lifecycle hook
    this.afterUnmount();
  }

  /**
   * Update component
   */
  update(newProps = null) {
    if (!this.shouldComponentUpdate(newProps)) {
      return;
    }

    // Update props if provided
    if (newProps) {
      this.props = { ...this.props, ...newProps };
    }

    // Schedule update with render optimizer
    if (!this.updateScheduled) {
      this.updateScheduled = true;

      if (this.renderOptimizer) {
        this.renderOptimizer.batchUpdate(this.element, {
          innerHTML: this.render(),
        });
        this.renderOptimizer.requestFrame(this.id, () => {
          this.updateScheduled = false;
          this.afterUpdate();
        });
      } else {
        requestAnimationFrame(() => {
          this.element.innerHTML = this.render();
          this.updateScheduled = false;
          this.afterUpdate();
        });
      }
    }
  }

  /**
   * Set component state
   */
  setState(updates) {
    const prevState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Call lifecycle hook
    this.onStateChange(prevState, this.state);

    // Trigger update
    this.update();
  }

  /**
   * Get state value
   */
  getState(key = null) {
    return key ? this.state[key] : this.state;
  }

  /**
   * Add child component
   */
  addChild(child, mountPoint = null) {
    if (!(child instanceof UIComponent)) {
      throw new Error("Child must be a UIComponent instance");
    }

    // Set parent reference
    child.parent = this;

    // Store child
    this.children.set(child.id, child);

    // Mount child if we're mounted
    if (this.mounted) {
      const container = mountPoint
        ? this.element.querySelector(mountPoint)
        : this.element;
      child.mount(container);
    }

    return child;
  }

  /**
   * Remove child component
   */
  removeChild(childId) {
    const child = this.children.get(childId);
    if (!child) return;

    // Unmount and destroy child
    child.unmount();
    child.destroy();

    // Remove from children
    this.children.delete(childId);

    // Clear parent reference
    child.parent = null;
  }

  /**
   * Get child component
   */
  getChild(childId) {
    return this.children.get(childId);
  }

  /**
   * Initialize children
   */
  initializeChildren() {
    // Override in subclasses to create child components
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Override in subclasses to set up events
  }

  /**
   * Add event listener
   */
  addEventListener(target, event, handler, options = {}) {
    const element =
      typeof target === "string" ? this.element.querySelector(target) : target;

    if (!element) return;

    // Use event manager if available
    if (this.eventManager) {
      this.eventManager.addListener(element, event, handler, options);
    } else {
      element.addEventListener(event, handler, options);
    }

    // Store for cleanup
    const key = `${event}_${target}`;
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, []);
    }
    this.eventListeners.get(key).push({ element, handler, options });
  }

  /**
   * Remove event listener
   */
  removeEventListener(target, event, handler) {
    const element =
      typeof target === "string" ? this.element.querySelector(target) : target;

    if (!element) return;

    // Use event manager if available
    if (this.eventManager) {
      this.eventManager.removeListener(element, event, handler);
    } else {
      element.removeEventListener(event, handler);
    }

    // Remove from stored listeners
    const key = `${event}_${target}`;
    const listeners = this.eventListeners.get(key);
    if (listeners) {
      const index = listeners.findIndex((l) => l.handler === handler);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Emit custom event
   */
  emit(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
      detail: { ...detail, component: this },
      bubbles: true,
      cancelable: true,
    });

    this.element.dispatchEvent(event);
  }

  /**
   * Find components in tree
   */
  findComponents(selector) {
    const results = [];

    // Check self
    if (this.matches(selector)) {
      results.push(this);
    }

    // Check children recursively
    this.children.forEach((child) => {
      results.push(...child.findComponents(selector));
    });

    return results;
  }

  /**
   * Check if component matches selector
   */
  matches(selector) {
    if (typeof selector === "string") {
      return this.name === selector || this.type === selector;
    } else if (typeof selector === "function") {
      return selector(this);
    }
    return false;
  }

  /**
   * Show component
   */
  show() {
    if (this.element) {
      this.element.style.display = "";
      this.emit("show");
    }
  }

  /**
   * Hide component
   */
  hide() {
    if (this.element) {
      this.element.style.display = "none";
      this.emit("hide");
    }
  }

  /**
   * Enable component
   */
  enable() {
    if (this.element) {
      this.element.classList.remove("disabled");
      this.element.querySelectorAll("input, button, select").forEach((el) => {
        el.disabled = false;
      });
      this.emit("enable");
    }
  }

  /**
   * Disable component
   */
  disable() {
    if (this.element) {
      this.element.classList.add("disabled");
      this.element.querySelectorAll("input, button, select").forEach((el) => {
        el.disabled = true;
      });
      this.emit("disable");
    }
  }

  /**
   * Destroy component
   */
  destroy() {
    if (this.destroyed) return;

    // Call lifecycle hook
    this.beforeDestroy();

    // Unmount if needed
    if (this.mounted) {
      this.unmount();
    }

    // Destroy all children
    this.children.forEach((child) => child.destroy());
    this.children.clear();

    // Clean up event listeners
    if (this.eventManager) {
      this.eventListeners.forEach((listeners, key) => {
        listeners.forEach(({ element, event, handler }) => {
          this.eventManager.removeListener(element, event, handler);
        });
      });
    }
    this.eventListeners.clear();

    // Clear references
    this.element = null;
    this.container = null;
    this.parent = null;

    // Mark as destroyed
    this.destroyed = true;

    // Call lifecycle hook
    this.afterDestroy();
  }

  // Lifecycle hooks (override in subclasses)

  beforeInitialize() {}
  afterInitialize() {}

  beforeMount() {}
  afterMount() {}

  beforeUnmount() {}
  afterUnmount() {}

  beforeUpdate() {}
  afterUpdate() {}

  beforeDestroy() {}
  afterDestroy() {}

  onStateChange(prevState, newState) {}

  shouldComponentUpdate(newProps) {
    return this.shouldUpdate;
  }

  /**
   * Render component (override in subclasses)
   */
  render() {
    return "";
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = UIComponent;
}
