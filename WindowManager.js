/**
 * WindowManager - Centralized state management for all UI windows, panels, and dropdowns
 * Eliminates DOM-based state tracking and prevents synchronization issues
 */
class WindowManager {
  constructor(otto) {
    // Store reference to OTTO interface
    this.otto = otto;

    // Window registry - stores configuration for each window
    this.registry = {};

    // State tracking
    this.states = {
      panels: {},
      modals: {},
      dropdowns: {},
      overlays: {},
    };

    // Mutex groups - only one window in a group can be open at a time
    this.mutexGroups = {
      fullHeightPanels: new Set(),
      partialHeightPanels: new Set(),
      dropdowns: new Set(),
    };

    // Track which window is active in each mutex group
    this.activeInGroup = {};

    // Track windows that are currently transitioning
    this.transitioning = new Set();

    // Event listeners storage for cleanup
    this.listeners = [];

    // Lifecycle hooks
    this.hooks = {
      beforeOpen: {},
      afterOpen: {},
      beforeClose: {},
      afterClose: {},
    };

    // Register all windows
    this.initializeRegistry();

    // Initialize
    this.init();
  }

  /**
   * Initialize the window registry with all known windows
   */
  initializeRegistry() {
    // Full-height panels
    this.registerWindow("panel", "preset", {
      element: "preset-panel",
      triggerButton: "preset-edit-btn",
      closeButton: "preset-panel-close",
      mutexGroup: "fullHeightPanels",
      cssClass: "slide-up-panel full-height-panel",
      activeClass: "active",
      buttonActiveClass: "panel-active",
      onOpen: () => {
        // Load preset list and focus input
        if (this.otto.renderPresetList) {
          this.otto.renderPresetList();
        }
        const nameInput = document.getElementById("preset-name-input");
        if (nameInput) {
          nameInput.value = "";
          setTimeout(() => nameInput.focus(), 100);
        }
      },
    });

    this.registerWindow("panel", "settings", {
      element: "settings-panel",
      triggerButton: "settings-btn",
      closeButton: "settings-panel-close",
      mutexGroup: "fullHeightPanels",
      cssClass: "slide-up-panel full-height-panel",
      activeClass: "active",
      buttonActiveClass: "panel-active",
    });

    this.registerWindow("panel", "cloud", {
      element: "cloud-panel",
      triggerButton: "upload-btn",
      closeButton: "cloud-panel-close",
      mutexGroup: "fullHeightPanels",
      cssClass: "slide-up-panel full-height-panel",
      activeClass: "active",
      buttonActiveClass: "panel-active",
    });

    this.registerWindow("panel", "sync", {
      element: "sync-panel",
      triggerButton: "sync-btn",
      closeButton: "sync-panel-close",
      mutexGroup: "fullHeightPanels",
      cssClass: "slide-up-panel full-height-panel",
      activeClass: "active",
      buttonActiveClass: "panel-active",
    });

    this.registerWindow("panel", "store", {
      element: "store-panel",
      triggerButton: null, // Opened via logo click
      closeButton: "store-panel-close",
      mutexGroup: "fullHeightPanels",
      cssClass: "slide-up-panel full-height-panel",
      activeClass: "active",
      buttonActiveClass: null,
      onOpen: () => {
        // Load store iframe
        const iframe = document.getElementById("store-iframe");
        const loadingMsg = document.getElementById("store-loading");
        const errorMsg = document.getElementById("store-error");

        if (iframe && !iframe.hasAttribute("data-loaded")) {
          console.log("Store panel opened - loading iframe");
          if (loadingMsg) loadingMsg.style.display = "block";
          if (errorMsg) errorMsg.style.display = "none";
          iframe.style.display = "block"; // Ensure iframe is visible

          // Use storeURL from OTTO interface
          const storeURL =
            this.otto.storeURL ||
            "https://my-store-1008202.creator-spring.com/";

          // Set timeout for loading
          const loadTimeout = setTimeout(() => {
            console.warn(
              "Store iframe load timeout - site may block embedding",
            );
            if (loadingMsg) loadingMsg.style.display = "none";
            if (errorMsg) errorMsg.style.display = "block";
          }, 5000);

          iframe.onload = () => {
            clearTimeout(loadTimeout);
            console.log("Store iframe loaded successfully");
            if (loadingMsg) loadingMsg.style.display = "none";
            if (errorMsg) errorMsg.style.display = "none";
            iframe.setAttribute("data-loaded", "true");
          };

          iframe.onerror = () => {
            clearTimeout(loadTimeout);
            console.error("Store iframe error");
            if (loadingMsg) loadingMsg.style.display = "none";
            if (errorMsg) errorMsg.style.display = "block";
            iframe.style.display = "none";
          };

          console.log("Setting iframe src to:", storeURL);
          iframe.src = storeURL;
          console.log("Iframe src after setting:", iframe.src);
        } else if (iframe && iframe.hasAttribute("data-loaded")) {
          console.log("Store already loaded");
        }
      },
    });

    // Full-screen mixer panel
    this.registerWindow("panel", "mixer", {
      element: "mixer-panel",
      triggerButton: null, // Handled manually in script.js setupKitControls
      closeButton: "mixer-panel-close",
      mutexGroup: "fullHeightPanels",
      cssClass: "slide-up-panel full-height-panel",
      activeClass: "active",
      buttonActiveClass: "panel-active",
      onOpen: () => {
        // Update kit name in header
        const kitName = document.getElementById("mixer-kit-name");
        const selectedKit = document.querySelector(
          "#kit-dropdown .dropdown-text",
        );
        if (kitName && selectedKit) {
          kitName.textContent = selectedKit.textContent;
        }

        // Load current kit mixer settings
        if (this.otto.mixerComponent) {
          this.otto.mixerComponent.loadCurrentKitMixer();
        }
      },
    });

    this.registerWindow("panel", "kit-edit", {
      element: "kit-edit-panel",
      triggerButton: null, // Handled manually in script.js setupKitControls
      closeButton: "kit-edit-panel-close",
      mutexGroup: "fullHeightPanels", // Changed to full height
      cssClass: "slide-up-panel full-height-panel", // Now full screen
      activeClass: "active",
      buttonActiveClass: "panel-active",
      multipleButtons: true,
      onOpen: () => {
        console.log("Kit-edit panel onOpen callback triggered");
        console.log("this.otto:", this.otto);
        console.log("this.otto.drumMapUI:", this.otto?.drumMapUI);

        // Initialize drum mapping UI when opened
        if (this.otto && this.otto.drumMapUI) {
          console.log("Calling drumMapUI.initialize()");
          this.otto.drumMapUI.initialize();
        } else {
          console.error("DrumMapUI not available:", {
            otto: !!this.otto,
            drumMapUI: !!this.otto?.drumMapUI,
          });
        }
      },
    });

    // Slide-out panel (no mutex group - can stay open)
    this.registerWindow("panel", "pattern-edit", {
      element: "pattern-edit-panel",
      triggerButton: ".edit-pattern-btn",
      closeButton: "pattern-panel-close",
      mutexGroup: null, // Can stay open independently
      cssClass: "pattern-edit-panel",
      activeClass: "active",
      buttonActiveClass: "active",
      onOpen: () => {
        // Enter edit mode
        this.otto.isEditMode = true;
        const deleteBtn = document.getElementById("group-delete-btn");
        if (deleteBtn) {
          // Check if Favorites is currently selected
          const currentGroup =
            this.otto.playerStates[this.otto.currentPlayer].patternGroup;
          if (currentGroup === "favorites") {
            deleteBtn.style.display = "none";
          } else {
            deleteBtn.style.display = "flex";
          }
        }

        // Load patterns and setup drag-drop
        if (this.otto.loadAvailablePatterns) {
          this.otto.loadAvailablePatterns();
        }
        if (this.otto.enablePatternEditDragDrop) {
          this.otto.enablePatternEditDragDrop();
        }
        if (this.otto.setupPatternPanelControls) {
          this.otto.setupPatternPanelControls();
        }
      },
      onClose: () => {
        // Exit edit mode
        this.otto.isEditMode = false;
        const deleteBtn = document.getElementById("group-delete-btn");
        if (deleteBtn) deleteBtn.style.display = "none";

        // Disable drag-drop
        if (this.otto.disablePatternEditDragDrop) {
          this.otto.disablePatternEditDragDrop();
        }
      },
    });

    // Dropdowns - DISABLED: Conflicts with manual event handling in script.js
    /*
    this.registerWindow("dropdown", "preset", {
      element: "preset-dropdown",
      triggerButton: "preset-selected",
      optionsContainer: "preset-options",
      mutexGroup: "dropdowns",
      activeClass: "open",
      clickOutsideClose: true,
    });

    this.registerWindow("dropdown", "kit", {
      element: "kit-dropdown",
      triggerButton: "kit-selected",
      optionsContainer: "kit-options",
      mutexGroup: "dropdowns",
      activeClass: "open",
      clickOutsideClose: true,
    });

    this.registerWindow("dropdown", "group", {
      element: "group-dropdown",
      triggerButton: "group-selected",
      optionsContainer: "group-options",
      mutexGroup: "dropdowns",
      activeClass: "open",
      clickOutsideClose: true,
    });
    */

    // Special overlays
    this.registerWindow("overlay", "splash", {
      element: "splash-screen",
      activeClass: "fade-out",
      autoClose: 2000, // Auto-close after 2 seconds
    });

    this.registerWindow("overlay", "mute", {
      element: null, // Gets element via class
      elementClass: "mute-overlay",
      activeClass: "muted",
    });
  }

  /**
   * Register a window with its configuration
   */
  registerWindow(type, name, config) {
    const key = `${type}-${name}`;

    // Store in registry
    this.registry[key] = {
      type,
      name,
      ...config,
    };

    // Initialize state
    if (!this.states[type + "s"]) {
      this.states[type + "s"] = {};
    }
    this.states[type + "s"][name] = { isOpen: false };

    // Add to mutex group if specified
    if (config.mutexGroup) {
      this.mutexGroups[config.mutexGroup].add(key);
    }

    // Initialize hooks
    this.hooks.beforeOpen[key] = [];
    this.hooks.afterOpen[key] = [];
    this.hooks.beforeClose[key] = [];
    this.hooks.afterClose[key] = [];
  }

  /**
   * Open a window
   */
  async openWindow(type, name, options = {}) {
    const key = `${type}-${name}`;
    const config = this.registry[key];

    console.log(`Opening window: ${key}`, config);

    if (!config) {
      console.error(`Window not registered: ${key}`);
      return false;
    }

    // Check if already open
    if (this.states[type + "s"][name].isOpen && !options.force) {
      return true;
    }

    // Check if transitioning
    if (this.transitioning.has(key)) {
      return false;
    }

    // Run beforeOpen hooks
    for (const hook of this.hooks.beforeOpen[key]) {
      const proceed = await hook(type, name, options);
      if (proceed === false) return false;
    }

    // Handle mutex groups
    if (config.mutexGroup) {
      await this.closeMutexGroup(config.mutexGroup, key);
    }

    // Mark as transitioning
    this.transitioning.add(key);

    // Get element
    const element = this.getElement(config);
    console.log(
      `Element for ${key}:`,
      element,
      "Config:",
      config.element || config.elementClass,
    );

    if (!element) {
      console.error(
        `Element not found for ${key}: ${config.element || config.elementClass}`,
      );
      this.transitioning.delete(key);
      return false;
    }

    console.log(`Adding class '${config.activeClass}' to element`);
    // Open the window
    element.classList.add(config.activeClass);

    // Update button state
    if (config.triggerButton && config.buttonActiveClass) {
      const buttons = this.getButtons(config.triggerButton);
      buttons.forEach((btn) => btn.classList.add(config.buttonActiveClass));
    }

    // Update state
    this.states[type + "s"][name].isOpen = true;

    // Track in mutex group
    if (config.mutexGroup) {
      this.activeInGroup[config.mutexGroup] = key;
    }

    // Run custom onOpen
    if (config.onOpen) {
      console.log(`Running onOpen callback for ${key}`);
      config.onOpen();
    } else {
      console.log(`No onOpen callback for ${key}`);
    }

    // Wait for transition
    await this.waitForTransition(element);

    // Mark transition complete
    this.transitioning.delete(key);

    // Run afterOpen hooks
    for (const hook of this.hooks.afterOpen[key]) {
      await hook(type, name, options);
    }

    return true;
  }

  /**
   * Close a window
   */
  async closeWindow(type, name, options = {}) {
    const key = `${type}-${name}`;
    const config = this.registry[key];

    if (!config) {
      console.error(`Window not registered: ${key}`);
      return false;
    }

    // Check if already closed
    if (!this.states[type + "s"][name].isOpen && !options.force) {
      return true;
    }

    // Check if transitioning
    if (this.transitioning.has(key)) {
      return false;
    }

    // Run beforeClose hooks
    for (const hook of this.hooks.beforeClose[key]) {
      const proceed = await hook(type, name, options);
      if (proceed === false) return false;
    }

    // Mark as transitioning
    this.transitioning.add(key);

    // Get element
    const element = this.getElement(config);
    if (!element) {
      console.error(`Element not found for ${key}`);
      this.transitioning.delete(key);
      return false;
    }

    // Run custom onClose
    if (config.onClose) {
      config.onClose();
    }

    // Close the window
    element.classList.remove(config.activeClass);

    // Update button state
    if (config.triggerButton && config.buttonActiveClass) {
      const buttons = this.getButtons(config.triggerButton);
      buttons.forEach((btn) => btn.classList.remove(config.buttonActiveClass));
    }

    // Update state
    this.states[type + "s"][name].isOpen = false;

    // Clear from mutex group
    if (config.mutexGroup && this.activeInGroup[config.mutexGroup] === key) {
      this.activeInGroup[config.mutexGroup] = null;
    }

    // Wait for transition
    await this.waitForTransition(element);

    // Mark transition complete
    this.transitioning.delete(key);

    // Run afterClose hooks
    for (const hook of this.hooks.afterClose[key]) {
      await hook(type, name, options);
    }

    return true;
  }

  /**
   * Toggle a window open/closed
   */
  async toggleWindow(type, name, options = {}) {
    const isOpen = this.isWindowOpen(type, name);
    if (isOpen) {
      return await this.closeWindow(type, name, options);
    } else {
      return await this.openWindow(type, name, options);
    }
  }

  /**
   * Close all windows in a mutex group except one
   */
  async closeMutexGroup(groupName, exceptKey = null) {
    const group = this.mutexGroups[groupName];
    if (!group) return;

    const promises = [];
    for (const key of group) {
      if (key !== exceptKey) {
        const [type, ...nameParts] = key.split("-");
        const name = nameParts.join("-");
        const stateCategory = type + "s";

        // Check if state exists before accessing isOpen
        if (
          this.states[stateCategory] &&
          this.states[stateCategory][name] &&
          this.states[stateCategory][name].isOpen
        ) {
          promises.push(this.closeWindow(type, name));
        }
      }
    }

    await Promise.all(promises);
  }

  /**
   * Close all windows
   */
  async closeAllWindows(exceptType = null, exceptName = null) {
    const promises = [];

    for (const [type, windows] of Object.entries(this.states)) {
      for (const [name, state] of Object.entries(windows)) {
        if (state.isOpen) {
          const skipThis =
            exceptType &&
            exceptName &&
            type === exceptType + "s" &&
            name === exceptName;
          if (!skipThis) {
            promises.push(this.closeWindow(type.slice(0, -1), name));
          }
        }
      }
    }

    await Promise.all(promises);
  }

  /**
   * Check if a window is open
   */
  isWindowOpen(type, name) {
    const stateKey = type + "s";
    return (
      this.states[stateKey] &&
      this.states[stateKey][name] &&
      this.states[stateKey][name].isOpen
    );
  }

  /**
   * Get the currently active window in a mutex group
   */
  getActiveInGroup(groupName) {
    return this.activeInGroup[groupName];
  }

  /**
   * Get element from config
   */
  getElement(config) {
    if (config.element) {
      return document.getElementById(config.element);
    } else if (config.elementClass) {
      return document.querySelector(`.${config.elementClass}`);
    }
    return null;
  }

  /**
   * Get buttons from selector (handles both ID and class selectors)
   */
  getButtons(selector) {
    if (!selector) return [];

    if (selector.startsWith(".")) {
      // Class selector - multiple buttons
      return Array.from(document.querySelectorAll(selector));
    } else {
      // ID selector - single button
      const btn = document.getElementById(selector);
      return btn ? [btn] : [];
    }
  }

  /**
   * Wait for CSS transition to complete
   */
  waitForTransition(element, timeout = 500) {
    return new Promise((resolve) => {
      let timeoutId;

      const handleTransitionEnd = () => {
        clearTimeout(timeoutId);
        element.removeEventListener("transitionend", handleTransitionEnd);
        resolve();
      };

      element.addEventListener("transitionend", handleTransitionEnd);

      // Fallback timeout in case transition doesn't fire
      timeoutId = setTimeout(() => {
        element.removeEventListener("transitionend", handleTransitionEnd);
        resolve();
      }, timeout);
    });
  }

  /**
   * Add lifecycle hook
   */
  addHook(event, type, name, callback) {
    const key = `${type}-${name}`;
    if (this.hooks[event] && this.hooks[event][key]) {
      this.hooks[event][key].push(callback);
    }
  }

  /**
   * Remove lifecycle hook
   */
  removeHook(event, type, name, callback) {
    const key = `${type}-${name}`;
    if (this.hooks[event] && this.hooks[event][key]) {
      const index = this.hooks[event][key].indexOf(callback);
      if (index > -1) {
        this.hooks[event][key].splice(index, 1);
      }
    }
  }

  /**
   * Setup event listeners for window triggers
   */
  setupEventListeners() {
    // Setup close buttons
    for (const [key, config] of Object.entries(this.registry)) {
      const [type, ...nameParts] = key.split("-");
      const name = nameParts.join("-");

      // Close button
      if (config.closeButton) {
        const closeBtn = document.getElementById(config.closeButton);
        if (closeBtn) {
          console.log(
            `Setting up close button for ${key}:`,
            config.closeButton,
          );
          const handler = (e) => {
            console.log(`Close button clicked for ${key}`);
            e.preventDefault();
            e.stopPropagation();
            this.closeWindow(type, name);
          };
          closeBtn.addEventListener("click", handler);
          this.listeners.push({ element: closeBtn, event: "click", handler });
        } else {
          console.warn(
            `Close button not found for ${key}:`,
            config.closeButton,
          );
        }
      }

      // Trigger button
      if (config.triggerButton) {
        const buttons = this.getButtons(config.triggerButton);
        buttons.forEach((btn) => {
          const handler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleWindow(type, name);
          };
          btn.addEventListener("click", handler);
          this.listeners.push({ element: btn, event: "click", handler });
        });
      }

      // Click outside to close (for dropdowns)
      if (config.clickOutsideClose) {
        const handler = (e) => {
          const element = this.getElement(config);
          if (
            element &&
            !element.contains(e.target) &&
            this.isWindowOpen(type, name)
          ) {
            this.closeWindow(type, name);
          }
        };
        document.addEventListener("click", handler);
        this.listeners.push({ element: document, event: "click", handler });
      }
    }

    // ESC key to close active windows
    const escHandler = (e) => {
      if (e.key === "Escape") {
        // Close dropdowns first
        this.closeMutexGroup("dropdowns");

        // Then close panels
        const fullHeight = this.activeInGroup["fullHeightPanels"];
        const partialHeight = this.activeInGroup["partialHeightPanels"];

        if (fullHeight) {
          const [type, ...nameParts] = fullHeight.split("-");
          const name = nameParts.join("-");
          this.closeWindow(type, name);
        } else if (partialHeight) {
          const [type, ...nameParts] = partialHeight.split("-");
          const name = nameParts.join("-");
          this.closeWindow(type, name);
        }
      }
    };
    document.addEventListener("keydown", escHandler);
    this.listeners.push({
      element: document,
      event: "keydown",
      handler: escHandler,
    });
  }

  /**
   * Cleanup all event listeners
   */
  cleanup() {
    for (const { element, event, handler } of this.listeners) {
      element.removeEventListener(event, handler);
    }
    this.listeners = [];
  }

  /**
   * Get current state snapshot (for debugging)
   */
  getStateSnapshot() {
    return {
      states: JSON.parse(JSON.stringify(this.states)),
      activeInGroup: { ...this.activeInGroup },
      transitioning: Array.from(this.transitioning),
    };
  }

  /**
   * Initialize the WindowManager
   */
  init() {
    // Setup event listeners for close buttons and other window controls
    this.setupEventListeners();
    // Also setup ESC key handler for closing windows
    this.setupEscapeKey();
    console.log(
      "WindowManager initialized with",
      Object.keys(this.registry).length,
      "windows",
    );
  }

  /**
   * Setup only ESC key handler
   */
  setupEscapeKey() {
    const escHandler = (e) => {
      if (e.key === "Escape") {
        // Close dropdowns first
        this.closeMutexGroup("dropdowns");

        // Then close panels
        const fullHeight = this.activeInGroup["fullHeightPanels"];
        const partialHeight = this.activeInGroup["partialHeightPanels"];

        if (fullHeight) {
          const [type, ...nameParts] = fullHeight.split("-");
          const name = nameParts.join("-");
          this.closeWindow(type, name);
        } else if (partialHeight) {
          const [type, ...nameParts] = partialHeight.split("-");
          const name = nameParts.join("-");
          this.closeWindow(type, name);
        }

        // Also close pattern edit panel if open
        if (this.isWindowOpen("panel", "pattern-edit")) {
          this.closeWindow("panel", "pattern-edit");
        }
      }
    };
    document.addEventListener("keydown", escHandler);
    this.listeners.push({
      element: document,
      event: "keydown",
      handler: escHandler,
    });
  }

  /**
   * Destroy the WindowManager
   */
  destroy() {
    this.cleanup();
    console.log("WindowManager destroyed");
  }
}

// Export for use in OTTO interface
if (typeof module !== "undefined" && module.exports) {
  module.exports = WindowManager;
}
