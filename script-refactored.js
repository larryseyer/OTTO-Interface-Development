/**
 * OTTO Interface - Refactored with Memory & State Management Fixes
 * Phase 1 Implementation: Critical Memory & State Management
 */

// Import new managers (will be loaded via script tags in HTML)
// Assumes EventManager.js, TimerManager.js, StateManager.js are loaded first

document.addEventListener("DOMContentLoaded", () => {
  const app = new OTTOAccurateInterface();
  
  // Store app reference for debugging (not for production)
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.OTTOApp = app;
  }
});

class OTTOAccurateInterface {
  constructor() {
    this.version = "1.0.1"; // Updated version for refactored code
    
    // Initialize core managers FIRST
    this.eventManager = new EventManager();
    this.timerManager = new TimerManager();
    this.stateManager = new StateManager();
    
    // Initialize Window Manager
    this.windowManager = new WindowManager(this);
    
    // Core configuration
    this.maxPlayers = 8;
    this.numberOfPlayers = 4;
    this.currentPlayer = 1;
    this.splashScreenLength = 1000;
    this.tempo = 120;
    this.loopPosition = 0;
    this.isPlaying = true;
    this.currentPreset = "default";
    
    // Online Store URL
    this.storeURL = "https://my-store-1008202.creator-spring.com/";
    
    // Lifecycle flags
    this.isDestroyed = false;
    this.isInitialized = false;
    
    // DOM Cache with WeakRef for automatic cleanup
    this.domCache = new Map();
    this.domCacheVersion = 0;
    
    // Initialize state with proper structure
    this.initializeState();
    
    // Storage configuration
    this.storage = {
      prefix: 'otto_',
      maxSize: 5 * 1024 * 1024, // 5MB limit
      compression: true
    };
    
    // Pattern and drumkit data (will be loaded from storage)
    this.patternGroups = null;
    this.drumkits = null;
    
    // Deferred initialization after DOM ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  /**
   * Initialize state structure with StateManager
   */
  initializeState() {
    // Define initial state structure
    const initialState = {
      global: {
        tempo: this.tempo,
        isPlaying: this.isPlaying,
        currentPlayer: this.currentPlayer,
        currentPreset: this.currentPreset,
        numberOfPlayers: this.numberOfPlayers,
        loopPosition: this.loopPosition
      },
      players: {},
      ui: {
        splashVisible: true,
        activeModal: null,
        activeDropdown: null,
        editMode: {
          pattern: false,
          preset: false,
          kit: false
        }
      },
      dirty: {
        pattern: false,
        patternGroup: false,
        drumkit: false,
        player: false,
        preset: false
      }
    };
    
    // Initialize player states
    for (let i = 1; i <= this.maxPlayers; i++) {
      initialState.players[i] = {
        presetName: "Default",
        kitName: "Acoustic",
        patternGroup: "favorites",
        selectedPattern: "basic",
        kitMixerActive: false,
        muted: false,
        toggleStates: {
          none: false,
          auto: true,
          manual: false,
          stick: false,
          ride: false,
          lock: false
        },
        fillStates: {
          now: false,
          4: false,
          8: false,
          16: true,
          32: false,
          solo: false
        },
        sliderValues: {
          swing: 10,
          energy: 50,
          volume: 75
        }
      };
    }
    
    // Initialize StateManager with the structure
    this.stateManager.initialize(initialState);
    
    // Register validators
    this.registerStateValidators();
    
    // Set up state listeners
    this.setupStateListeners();
  }
  
  /**
   * Register state validators
   */
  registerStateValidators() {
    // Tempo validator
    this.stateManager.registerValidator('global.tempo', (value) => {
      return typeof value === 'number' && value >= 30 && value <= 300;
    });
    
    // Player number validator
    this.stateManager.registerValidator('global.currentPlayer', (value) => {
      return typeof value === 'number' && value >= 1 && value <= this.numberOfPlayers;
    });
    
    // Slider validators
    for (let i = 1; i <= this.maxPlayers; i++) {
      ['swing', 'energy', 'volume'].forEach(param => {
        this.stateManager.registerValidator(`players.${i}.sliderValues.${param}`, (value) => {
          return typeof value === 'number' && value >= 0 && value <= 100;
        });
      });
    }
    
    // Loop position validator
    this.stateManager.registerValidator('global.loopPosition', (value) => {
      return typeof value === 'number' && value >= 0 && value <= 100;
    });
  }
  
  /**
   * Set up state listeners for UI updates
   */
  setupStateListeners() {
    // Listen for global state changes
    this.stateManager.addListener('global.tempo', (value) => {
      this.updateTempoDisplay(value);
    });
    
    this.stateManager.addListener('global.isPlaying', (value) => {
      this.updatePlayPauseButton(value);
    });
    
    this.stateManager.addListener('global.currentPlayer', (value) => {
      this.switchToPlayer(value);
    });
    
    // Listen for dirty state changes
    this.stateManager.addListener('dirty', (dirty) => {
      this.updateSaveButtonVisibility(dirty);
    });
  }
  
  /**
   * Initialize the interface
   */
  async init() {
    if (this.isInitialized || this.isDestroyed) return;
    
    try {
      console.log("OTTO Interface initializing...");
      
      // Set up global error handlers
      this.setupGlobalErrorHandlers();
      
      // Initialize DOM cache
      this.initDOMCache();
      
      // Load data from storage
      await this.loadDataFromStorage();
      
      // Set up UI components
      this.setupVersion();
      this.setupSplashScreen();
      this.setupLogoClick();
      this.setupPlayerTabs();
      this.setupPresetControls();
      this.setupKitControls();
      this.setupPatternGroupControls();
      this.setupPatternGrid();
      this.setupToggleButtons();
      this.setupFillButtons();
      this.setupSliders();
      this.setupLinkIcons();
      this.setupLoopTimeline();
      this.setupTopBarControls();
      this.setupKeyboardShortcuts();
      this.setupSaveButtons();
      
      // Set up modals
      this.setupAllModals();
      
      // Initialize UI state
      this.updateCompleteUIState();
      
      // Mark as initialized
      this.isInitialized = true;
      
      console.log("OTTO Interface initialized successfully");
      
    } catch (error) {
      console.error("Failed to initialize OTTO Interface:", error);
      this.handleInitializationError(error);
    }
  }
  
  /**
   * Initialize DOM cache with WeakRef
   */
  initDOMCache() {
    // Cache frequently accessed elements
    const elementsToCache = [
      'tempo-display',
      'play-pause-btn',
      'current-player-number',
      'kit-selected',
      'group-selected',
      'preset-selected',
      'mute-drummer-btn',
      'timeline-handle'
    ];
    
    elementsToCache.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        this.domCache.set(id, new WeakRef(element));
      }
    });
    
    this.domCacheVersion++;
  }
  
  /**
   * Get cached DOM element
   */
  getCachedElement(id) {
    const ref = this.domCache.get(id);
    if (ref) {
      const element = ref.deref();
      if (element && document.contains(element)) {
        return element;
      } else {
        // Element was garbage collected or removed from DOM
        this.domCache.delete(id);
      }
    }
    
    // Fallback to querySelector and cache it
    const element = document.getElementById(id);
    if (element) {
      this.domCache.set(id, new WeakRef(element));
    }
    return element;
  }
  
  /**
   * Load data from storage
   */
  async loadDataFromStorage() {
    try {
      // Load pattern groups
      this.patternGroups = await this.loadFromStorage('patternGroups') || this.getDefaultPatternGroups();
      
      // Load drumkits
      this.drumkits = await this.loadFromStorage('drumkits') || this.getDefaultDrumkits();
      
      // Load presets
      this.presets = await this.loadFromStorage('presets') || this.getDefaultPresets();
      
      // Load app state
      const savedState = await this.loadFromStorage('appState');
      if (savedState) {
        this.mergeAppState(savedState);
      }
      
    } catch (error) {
      console.error("Error loading data from storage:", error);
    }
  }
  
  /**
   * Safe storage operations with error handling
   */
  async loadFromStorage(key) {
    try {
      const fullKey = this.storage.prefix + key;
      const data = localStorage.getItem(fullKey);
      
      if (!data) return null;
      
      // Decompress if needed
      if (this.storage.compression && data.startsWith('LZ:')) {
        const decompressed = this.decompressData(data.substring(3));
        return JSON.parse(decompressed);
      }
      
      return JSON.parse(data);
      
    } catch (error) {
      console.error(`Error loading ${key} from storage:`, error);
      return null;
    }
  }
  
  async saveToStorage(key, data) {
    try {
      const fullKey = this.storage.prefix + key;
      let serialized = JSON.stringify(data);
      
      // Compress if needed and size is significant
      if (this.storage.compression && serialized.length > 1024) {
        serialized = 'LZ:' + this.compressData(serialized);
      }
      
      // Check storage quota
      if (serialized.length > this.storage.maxSize) {
        throw new Error(`Data too large for storage: ${serialized.length} bytes`);
      }
      
      localStorage.setItem(fullKey, serialized);
      return true;
      
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        await this.handleQuotaExceeded();
      }
      console.error(`Error saving ${key} to storage:`, error);
      return false;
    }
  }
  
  /**
   * Handle storage quota exceeded
   */
  async handleQuotaExceeded() {
    console.warn("Storage quota exceeded, attempting cleanup...");
    
    // Get all storage keys and their sizes
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.storage.prefix)) {
        const value = localStorage.getItem(key);
        items.push({
          key,
          size: value ? value.length : 0,
          timestamp: this.getStorageTimestamp(key)
        });
      }
    }
    
    // Sort by timestamp (oldest first) and size (largest first)
    items.sort((a, b) => {
      if (a.timestamp && b.timestamp) {
        return a.timestamp - b.timestamp;
      }
      return b.size - a.size;
    });
    
    // Remove oldest/largest items until we have space
    let removed = 0;
    for (const item of items) {
      // Don't remove critical data
      if (item.key.includes('presets') || item.key.includes('appState')) {
        continue;
      }
      
      localStorage.removeItem(item.key);
      removed++;
      
      if (removed >= 5) break; // Remove up to 5 items at a time
    }
    
    console.log(`Removed ${removed} items from storage`);
  }
  
  /**
   * Simple compression using LZ-string algorithm (simplified version)
   */
  compressData(data) {
    // This is a placeholder - in production, use a proper compression library
    // For now, just return the data as-is
    return data;
  }
  
  decompressData(data) {
    // This is a placeholder - in production, use a proper decompression library
    // For now, just return the data as-is
    return data;
  }
  
  /**
   * Get storage timestamp from key
   */
  getStorageTimestamp(key) {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed._timestamp || 0;
      }
    } catch {
      return 0;
    }
    return 0;
  }
  
  /**
   * Add event listener with automatic cleanup
   */
  addEventListener(element, event, handler, options = {}, group = 'general') {
    if (!element || this.isDestroyed) return null;
    
    return this.eventManager.addEventListener(element, event, handler, options, group);
  }
  
  /**
   * Remove event listener
   */
  removeEventListener(element, event, handler, options = {}) {
    if (!element) return false;
    
    return this.eventManager.removeEventListener(element, event, handler, options);
  }
  
  /**
   * Set timeout with automatic cleanup
   */
  setTimeout(callback, delay, category = 'general', name = null) {
    if (this.isDestroyed) return null;
    
    return this.timerManager.setTimeout(callback, delay, category, name);
  }
  
  /**
   * Set interval with automatic cleanup
   */
  setInterval(callback, delay, category = 'general', name = null) {
    if (this.isDestroyed) return null;
    
    return this.timerManager.setInterval(callback, delay, category, name);
  }
  
  /**
   * Clear timer
   */
  clearTimer(timerId) {
    return this.timerManager.clearTimer(timerId);
  }
  
  /**
   * Update state with validation
   */
  updateState(path, value, options = {}) {
    if (this.isDestroyed) return false;
    
    return this.stateManager.setState(path, value, {
      ...options,
      source: options.source || 'user'
    });
  }
  
  /**
   * Get state value
   */
  getState(path) {
    return this.stateManager.getState(path);
  }
  
  /**
   * Begin state transaction
   */
  beginTransaction(name) {
    return this.stateManager.beginTransaction(name);
  }
  
  /**
   * Commit state transaction
   */
  commitTransaction() {
    return this.stateManager.commitTransaction();
  }
  
  /**
   * Rollback state transaction
   */
  rollbackTransaction() {
    return this.stateManager.rollbackTransaction();
  }
  
  // ============================================
  // UI SETUP METHODS (Simplified examples)
  // ============================================
  
  setupVersion() {
    const versionElement = this.getCachedElement('version-number');
    if (versionElement) {
      versionElement.textContent = this.version;
    }
  }
  
  setupSplashScreen() {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    
    // Hide splash after configured time
    this.setTimeout(() => {
      splash.classList.add('hidden');
    }, this.splashScreenLength, 'animation', 'splash-hide');
  }
  
  setupLogoClick() {
    const logoElement = document.getElementById('logo-version');
    if (!logoElement) return;
    
    this.addEventListener(logoElement, 'click', () => {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.classList.remove('hidden');
        splash.classList.add('show');
        
        this.setTimeout(() => {
          splash.classList.remove('show');
          splash.classList.add('hidden');
        }, this.splashScreenLength, 'animation', 'splash-rehide');
      }
    }, {}, 'ui');
  }
  
  setupPlayerTabs() {
    const tabs = document.querySelectorAll('.player-tab');
    tabs.forEach(tab => {
      this.addEventListener(tab, 'click', () => {
        const player = parseInt(tab.dataset.player);
        if (player && player <= this.numberOfPlayers) {
          this.updateState('global.currentPlayer', player);
        }
      }, {}, 'player');
    });
    
    // Navigation buttons
    const prevBtn = document.getElementById('player-prev-btn');
    const nextBtn = document.getElementById('player-next-btn');
    
    if (prevBtn) {
      this.addEventListener(prevBtn, 'click', () => {
        this.navigatePlayer(-1);
      }, {}, 'player');
    }
    
    if (nextBtn) {
      this.addEventListener(nextBtn, 'click', () => {
        this.navigatePlayer(1);
      }, {}, 'player');
    }
  }
  
  navigatePlayer(direction) {
    const current = this.getState('global.currentPlayer');
    let newPlayer = current + direction;
    
    if (newPlayer < 1) newPlayer = this.numberOfPlayers;
    if (newPlayer > this.numberOfPlayers) newPlayer = 1;
    
    this.updateState('global.currentPlayer', newPlayer);
  }
  
  switchToPlayer(playerNum) {
    if (playerNum < 1 || playerNum > this.numberOfPlayers) return;
    
    // Update UI
    const tabs = document.querySelectorAll('.player-tab');
    tabs.forEach(tab => {
      const tabPlayer = parseInt(tab.dataset.player);
      tab.classList.toggle('active', tabPlayer === playerNum);
    });
    
    // Update player number display
    const numberDisplay = this.getCachedElement('current-player-number');
    if (numberDisplay) {
      numberDisplay.textContent = playerNum;
    }
    
    // Update UI for the new player's state
    this.updateUIForCurrentPlayer(playerNum);
  }
  
  updateUIForCurrentPlayer(playerNum) {
    const playerState = this.getState(`players.${playerNum}`);
    if (!playerState) return;
    
    // Update kit
    const kitElement = this.getCachedElement('kit-selected');
    if (kitElement) {
      kitElement.querySelector('.dropdown-text').textContent = playerState.kitName;
    }
    
    // Update pattern group
    const groupElement = this.getCachedElement('group-selected');
    if (groupElement) {
      groupElement.querySelector('.dropdown-text').textContent = playerState.patternGroup;
    }
    
    // Update toggles
    Object.entries(playerState.toggleStates).forEach(([toggle, active]) => {
      const btn = document.querySelector(`.toggle-btn[data-toggle="${toggle}"]`);
      if (btn) {
        btn.classList.toggle('active', active);
      }
    });
    
    // Update fills
    Object.entries(playerState.fillStates).forEach(([fill, active]) => {
      const btn = document.querySelector(`.fill-btn[data-fill="${fill}"]`);
      if (btn) {
        btn.classList.toggle('active', active);
      }
    });
    
    // Update sliders
    Object.entries(playerState.sliderValues).forEach(([param, value]) => {
      this.updateCustomSlider(param, value);
    });
    
    // Update pattern selection
    const patterns = document.querySelectorAll('.pattern-btn');
    patterns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.pattern === playerState.selectedPattern);
    });
    
    // Update mute state
    this.updateMuteButton(playerState.muted);
  }
  
  updateCustomSlider(param, value) {
    const slider = document.querySelector(`.custom-slider[data-param="${param}"]`);
    if (!slider) return;
    
    const fill = slider.querySelector('.slider-fill');
    const thumb = slider.querySelector('.slider-thumb');
    
    if (fill && thumb) {
      const percentage = value;
      fill.style.height = `${percentage}%`;
      thumb.style.bottom = `${percentage}%`;
    }
  }
  
  updateMuteButton(isMuted) {
    const muteBtn = this.getCachedElement('mute-drummer-btn');
    if (muteBtn) {
      muteBtn.classList.toggle('muted', isMuted);
    }
    
    // Update mute overlay
    const overlay = document.querySelector('.mute-overlay');
    if (overlay) {
      overlay.classList.toggle('active', isMuted);
    }
  }
  
  updateTempoDisplay(tempo) {
    const display = this.getCachedElement('tempo-display');
    if (display && display.textContent !== tempo.toString()) {
      display.textContent = tempo;
    }
  }
  
  updatePlayPauseButton(isPlaying) {
    const btn = this.getCachedElement('play-pause-btn');
    if (!btn) return;
    
    const playIcon = btn.querySelector('.play-icon');
    const pauseIcon = btn.querySelector('.pause-icon');
    
    if (playIcon && pauseIcon) {
      playIcon.style.display = isPlaying ? 'none' : 'block';
      pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
  }
  
  updateSaveButtonVisibility(dirtyState) {
    // Show/hide save buttons based on dirty state
    const presetSaveBtn = document.getElementById('preset-save-btn');
    const drumkitSaveBtn = document.getElementById('drumkit-save-btn');
    const patternGroupSaveBtn = document.getElementById('pattern-group-save-btn');
    
    if (presetSaveBtn) {
      presetSaveBtn.style.display = dirtyState.preset ? 'flex' : 'none';
    }
    
    if (drumkitSaveBtn) {
      drumkitSaveBtn.style.display = dirtyState.drumkit ? 'flex' : 'none';
    }
    
    if (patternGroupSaveBtn) {
      patternGroupSaveBtn.style.display = dirtyState.patternGroup ? 'flex' : 'none';
    }
  }
  
  // ============================================
  // DEFAULT DATA METHODS
  // ============================================
  
  getDefaultPatternGroups() {
    return {
      favorites: {
        name: 'Favorites',
        patterns: [
          'basic', 'bassa', 'busybeat', 'buyoun',
          'chacha', 'funk', 'jazz', 'just-hat',
          'just-kick', 'polka', 'push', 'shuffle',
          'ska', 'surf', 'swing', 'waltz'
        ],
        selectedPattern: 'funk'
      },
      custom: {
        name: 'Custom',
        patterns: Array(16).fill('empty'),
        selectedPattern: 'empty'
      }
    };
  }
  
  getDefaultDrumkits() {
    return {
      acoustic: {
        name: 'Acoustic',
        selectedMixerPreset: 'default',
        mixerPresets: {
          default: {
            name: 'Default',
            levels: {
              kick: 75,
              snare: 70,
              hihat: 65,
              tom1: 70,
              tom2: 70,
              crash: 80,
              ride: 75
            }
          }
        }
      },
      electronic: {
        name: 'Electronic',
        selectedMixerPreset: 'default',
        mixerPresets: {
          default: {
            name: 'Default',
            levels: {
              kick: 80,
              snare: 75,
              hihat: 60,
              tom1: 72,
              tom2: 72,
              crash: 85,
              ride: 70
            }
          }
        }
      }
    };
  }
  
  getDefaultPresets() {
    return {
      default: {
        name: 'Default',
        locked: true,
        players: {}
      }
    };
  }
  
  mergeAppState(savedState) {
    // Carefully merge saved state with current state
    if (savedState.global) {
      Object.entries(savedState.global).forEach(([key, value]) => {
        this.updateState(`global.${key}`, value, { notify: false });
      });
    }
    
    if (savedState.players) {
      Object.entries(savedState.players).forEach(([playerNum, playerState]) => {
        Object.entries(playerState).forEach(([key, value]) => {
          this.updateState(`players.${playerNum}.${key}`, value, { notify: false });
        });
      });
    }
  }
  
  // ============================================
  // GLOBAL ERROR HANDLERS
  // ============================================
  
  setupGlobalErrorHandlers() {
    // Window error handler
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.handleGlobalError(event.error, event.filename, event.lineno, event.colno);
    });
    
    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.handleUnhandledRejection(event.reason);
    });
  }
  
  handleGlobalError(error, filename, lineno, colno) {
    // Log error details
    const errorInfo = {
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      filename,
      lineno,
      colno,
      timestamp: Date.now()
    };
    
    // Store error for debugging (limit storage)
    if (!this.globalErrors) {
      this.globalErrors = [];
    }
    this.globalErrors.push(errorInfo);
    if (this.globalErrors.length > 10) {
      this.globalErrors.shift();
    }
    
    // Attempt recovery if critical
    if (this.isCriticalError(error)) {
      this.attemptErrorRecovery(error);
    }
  }
  
  handleUnhandledRejection(reason) {
    // Similar to global error handler
    const errorInfo = {
      message: reason?.message || reason || 'Unhandled rejection',
      stack: reason?.stack,
      timestamp: Date.now()
    };
    
    if (!this.rejectionErrors) {
      this.rejectionErrors = [];
    }
    this.rejectionErrors.push(errorInfo);
    if (this.rejectionErrors.length > 10) {
      this.rejectionErrors.shift();
    }
  }
  
  isCriticalError(error) {
    // Determine if error is critical and needs recovery
    const criticalPatterns = [
      /Cannot read prop/i,
      /Cannot set prop/i,
      /null is not an object/i,
      /undefined is not an object/i,
      /Maximum call stack/i
    ];
    
    const errorMessage = error?.message || '';
    return criticalPatterns.some(pattern => pattern.test(errorMessage));
  }
  
  attemptErrorRecovery(error) {
    console.log('Attempting error recovery...');
    
    // Clear any problematic timers
    this.timerManager.clearCategory('general');
    
    // Reset UI state if needed
    if (error?.message?.includes('DOM')) {
      this.initDOMCache();
      this.updateCompleteUIState();
    }
    
    // Clear event queue if needed
    if (error?.message?.includes('Maximum call stack')) {
      this.eventManager.removeAll();
      this.setupEventListeners();
    }
  }
  
  handleInitializationError(error) {
    console.error('Initialization failed:', error);
    
    // Show error message to user
    const container = document.querySelector('.interface-container');
    if (container) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h2>OTTO Interface failed to initialize</h2>
          <p>Please refresh the page to try again.</p>
          <p style="color: #888; font-size: 12px;">${error.message}</p>
        </div>
      `;
    }
  }
  
  // Stub methods for missing implementations
  setupPresetControls() { /* TODO: Implement */ }
  setupKitControls() { /* TODO: Implement */ }
  setupPatternGroupControls() { /* TODO: Implement */ }
  setupPatternGrid() { /* TODO: Implement */ }
  setupToggleButtons() { /* TODO: Implement */ }
  setupFillButtons() { /* TODO: Implement */ }
  setupSliders() { /* TODO: Implement */ }
  setupLinkIcons() { /* TODO: Implement */ }
  setupLoopTimeline() { /* TODO: Implement */ }
  setupTopBarControls() { /* TODO: Implement */ }
  setupKeyboardShortcuts() { /* TODO: Implement */ }
  setupSaveButtons() { /* TODO: Implement */ }
  setupAllModals() { /* TODO: Implement */ }
  updateCompleteUIState() { /* TODO: Implement */ }
  setupEventListeners() { /* TODO: Implement */ }
  
  /**
   * Clean destroy method
   */
  destroy() {
    if (this.isDestroyed) return;
    
    console.log('Destroying OTTO Interface...');
    
    // Mark as destroyed first
    this.isDestroyed = true;
    
    // Clear all timers
    if (this.timerManager) {
      this.timerManager.destroy();
    }
    
    // Clear all event listeners
    if (this.eventManager) {
      this.eventManager.destroy();
    }
    
    // Clear state manager
    if (this.stateManager) {
      this.stateManager.destroy();
    }
    
    // Clear window manager
    if (this.windowManager) {
      this.windowManager.destroy();
    }
    
    // Clear DOM cache
    this.domCache.clear();
    
    // Clear all references
    this.patternGroups = null;
    this.drumkits = null;
    this.presets = null;
    
    console.log('OTTO Interface destroyed');
  }
}

// Add unload handler to cleanup
window.addEventListener('beforeunload', () => {
  if (window.OTTOApp) {
    window.OTTOApp.destroy();
  }
});