/**
 * InterfaceAdapter.js
 * Adapts the existing OTTO interface to work with JUCE backend
 * Phase 6 Implementation
 */

class InterfaceAdapter {
  constructor(ottoInterface) {
    this.otto = ottoInterface;
    this.bridge = new JUCEBridge();
    this.protocol = new MessageProtocol();
    
    // State synchronization
    this.syncEnabled = true;
    this.lastSyncTime = 0;
    this.syncInterval = 100; // ms
    
    // Pending operations
    this.pendingOperations = new Map();
    
    // Initialize adapter
    this.initialize();
  }
  
  /**
   * Initialize the adapter
   */
  initialize() {
    // Hook into OTTO interface methods
    this.hookInterfaceMethods();
    
    // Setup bridge event handlers
    this.setupBridgeHandlers();
    
    // Start state synchronization
    this.startStateSync();
    
    console.log('JUCE Interface Adapter initialized');
  }
  
  /**
   * Hook into OTTO interface methods to intercept calls
   */
  hookInterfaceMethods() {
    // Store original methods
    const original = {
      onToggleChanged: this.otto.onToggleChanged.bind(this.otto),
      onFillChanged: this.otto.onFillChanged.bind(this.otto),
      onSliderChanged: this.otto.onSliderChanged.bind(this.otto),
      onPatternSelected: this.otto.onPatternSelected.bind(this.otto),
      onKitChanged: this.otto.onKitChanged.bind(this.otto),
      onPresetChanged: this.otto.onPresetChanged.bind(this.otto),
      onTempoChanged: this.otto.onTempoChanged.bind(this.otto),
      onTransportToggle: this.otto.onTransportToggle.bind(this.otto)
    };
    
    // Override with wrapped versions
    this.otto.onToggleChanged = (player, toggle, state) => {
      original.onToggleChanged(player, toggle, state);
      this.sendToggleChange(player, toggle, state);
    };
    
    this.otto.onFillChanged = (player, fill, state) => {
      original.onFillChanged(player, fill, state);
      this.sendFillChange(player, fill, state);
    };
    
    this.otto.onSliderChanged = (player, param, value) => {
      original.onSliderChanged(player, param, value);
      this.sendSliderChange(player, param, value);
    };
    
    this.otto.onPatternSelected = (player, pattern) => {
      original.onPatternSelected(player, pattern);
      this.sendPatternSelection(player, pattern);
    };
    
    this.otto.onKitChanged = (player, kit) => {
      original.onKitChanged(player, kit);
      this.sendKitChange(player, kit);
    };
    
    this.otto.onPresetChanged = (player, preset) => {
      original.onPresetChanged(player, preset);
      this.sendPresetChange(player, preset);
    };
    
    this.otto.onTempoChanged = (tempo) => {
      original.onTempoChanged(tempo);
      this.sendTempoChange(tempo);
    };
    
    this.otto.onTransportToggle = () => {
      original.onTransportToggle();
      this.sendTransportToggle(this.otto.isPlaying);
    };
  }
  
  /**
   * Setup bridge event handlers
   */
  setupBridgeHandlers() {
    // Handle state updates from JUCE
    window.onJUCEStateUpdate = (state) => {
      this.handleJUCEStateUpdate(state);
    };
    
    // Handle parameter updates from JUCE
    window.onJUCEParameterUpdate = (player, param, value) => {
      this.handleJUCEParameterUpdate(player, param, value);
    };
    
    // Handle preset list updates
    window.onJUCEPresetListUpdate = (presets) => {
      this.handleJUCEPresetListUpdate(presets);
    };
    
    // Handle error messages
    window.onJUCEError = (error) => {
      this.handleJUCEError(error);
    };
  }
  
  /**
   * Send toggle change to JUCE
   */
  sendToggleChange(player, toggle, state) {
    const message = this.protocol.createCommand(
      this.protocol.commands.SET_STATE,
      {
        player,
        toggles: { [toggle]: state }
      }
    );
    
    this.bridge.sendMessage(message.type, message.data);
  }
  
  /**
   * Send fill change to JUCE
   */
  sendFillChange(player, fill, state) {
    const message = this.protocol.createCommand(
      this.protocol.commands.SET_STATE,
      {
        player,
        fills: { [fill]: state }
      }
    );
    
    this.bridge.sendMessage(message.type, message.data);
  }
  
  /**
   * Send slider change to JUCE
   */
  sendSliderChange(player, param, value) {
    // Throttle slider updates
    const key = `slider_${player}_${param}`;
    if (this.pendingOperations.has(key)) {
      clearTimeout(this.pendingOperations.get(key));
    }
    
    const timeout = setTimeout(() => {
      this.bridge.sendParameterChange(player, param, value);
      this.pendingOperations.delete(key);
    }, 50);
    
    this.pendingOperations.set(key, timeout);
  }
  
  /**
   * Send pattern selection to JUCE
   */
  sendPatternSelection(player, pattern) {
    const message = this.protocol.createCommand(
      this.protocol.commands.SELECT_PATTERN,
      { player, pattern }
    );
    
    this.bridge.sendMessage(message.type, message.data);
  }
  
  /**
   * Send kit change to JUCE
   */
  sendKitChange(player, kit) {
    this.bridge.sendKitChange(player, kit);
  }
  
  /**
   * Send preset change to JUCE
   */
  sendPresetChange(player, preset) {
    const message = this.protocol.createCommand(
      this.protocol.commands.LOAD_PRESET,
      { player, preset }
    );
    
    this.bridge.sendMessage(message.type, message.data);
  }
  
  /**
   * Send tempo change to JUCE
   */
  sendTempoChange(tempo) {
    const message = this.protocol.createCommand(
      this.protocol.commands.SET_STATE,
      { tempo }
    );
    
    this.bridge.sendMessage(message.type, message.data);
  }
  
  /**
   * Send transport toggle to JUCE
   */
  sendTransportToggle(isPlaying) {
    const command = isPlaying ? 
      this.protocol.commands.PLAY : 
      this.protocol.commands.PAUSE;
    
    const message = this.protocol.createCommand(command);
    this.bridge.sendMessage(message.type, message.data);
  }
  
  /**
   * Handle state update from JUCE
   */
  handleJUCEStateUpdate(state) {
    if (!this.syncEnabled) return;
    
    // Update player states
    if (state.players) {
      Object.entries(state.players).forEach(([num, playerState]) => {
        const playerNum = parseInt(num);
        if (this.otto.playerStates[playerNum]) {
          // Update without triggering callbacks
          this.syncEnabled = false;
          Object.assign(this.otto.playerStates[playerNum], playerState);
          this.syncEnabled = true;
        }
      });
    }
    
    // Update tempo
    if (state.tempo !== undefined) {
      this.otto.tempo = state.tempo;
      const tempoDisplay = document.getElementById('tempo-display');
      if (tempoDisplay) {
        tempoDisplay.textContent = state.tempo;
      }
    }
    
    // Update transport
    if (state.isPlaying !== undefined) {
      this.otto.isPlaying = state.isPlaying;
      this.otto.updatePlayPauseButton();
    }
    
    // Update UI if needed
    this.otto.updateUIForCurrentPlayer();
  }
  
  /**
   * Handle parameter update from JUCE
   */
  handleJUCEParameterUpdate(player, param, value) {
    if (!this.syncEnabled) return;
    
    // Update without triggering callbacks
    this.syncEnabled = false;
    
    if (this.otto.playerStates[player]) {
      if (this.otto.playerStates[player].sliderValues) {
        this.otto.playerStates[player].sliderValues[param] = value;
      }
      
      // Update UI if this is the current player
      if (player === this.otto.currentPlayer) {
        const slider = document.querySelector(`.custom-slider[data-param="${param}"]`);
        if (slider) {
          const fill = slider.querySelector('.slider-fill');
          const thumb = slider.querySelector('.slider-thumb');
          const valueDisplay = slider.querySelector('.slider-value');
          
          if (fill) fill.style.height = `${value}%`;
          if (thumb) thumb.style.bottom = `${value}%`;
          if (valueDisplay) valueDisplay.textContent = Math.round(value);
        }
      }
    }
    
    this.syncEnabled = true;
  }
  
  /**
   * Handle preset list update from JUCE
   */
  handleJUCEPresetListUpdate(presets) {
    this.otto.presets = presets;
    this.otto.renderPresetList();
  }
  
  /**
   * Handle error from JUCE
   */
  handleJUCEError(error) {
    console.error('JUCE Error:', error);
    
    const errorMessage = this.protocol.getErrorMessage(error.code) || error.message;
    this.otto.showNotification(errorMessage, 'error');
  }
  
  /**
   * Start state synchronization
   */
  startStateSync() {
    // Request initial state
    this.requestFullState();
    
    // Setup periodic sync if needed
    if (this.syncInterval > 0) {
      setInterval(() => {
        if (Date.now() - this.lastSyncTime > this.syncInterval) {
          this.requestIncrementalUpdate();
        }
      }, this.syncInterval);
    }
  }
  
  /**
   * Request full state from JUCE
   */
  requestFullState() {
    const message = this.protocol.createCommand(
      this.protocol.commands.GET_STATE
    );
    
    this.bridge.sendMessage(message.type, message.data, (response) => {
      if (response) {
        this.handleJUCEStateUpdate(response);
        this.lastSyncTime = Date.now();
      }
    });
  }
  
  /**
   * Request incremental update
   */
  requestIncrementalUpdate() {
    const message = this.protocol.createCommand(
      this.protocol.commands.GET_STATE,
      { 
        incremental: true,
        since: this.lastSyncTime
      }
    );
    
    this.bridge.sendMessage(message.type, message.data, (response) => {
      if (response && response.changes) {
        this.applyIncrementalChanges(response.changes);
        this.lastSyncTime = Date.now();
      }
    });
  }
  
  /**
   * Apply incremental changes
   */
  applyIncrementalChanges(changes) {
    changes.forEach(change => {
      switch (change.type) {
        case 'player_state':
          if (this.otto.playerStates[change.player]) {
            Object.assign(this.otto.playerStates[change.player], change.data);
          }
          break;
          
        case 'parameter':
          this.handleJUCEParameterUpdate(change.player, change.param, change.value);
          break;
          
        case 'tempo':
          this.otto.tempo = change.value;
          break;
          
        case 'transport':
          this.otto.isPlaying = change.value;
          break;
      }
    });
  }
  
  /**
   * Enable/disable synchronization
   */
  setSyncEnabled(enabled) {
    this.syncEnabled = enabled;
  }
  
  /**
   * Get bridge metrics
   */
  getMetrics() {
    return {
      bridge: this.bridge.getMetrics(),
      pendingOperations: this.pendingOperations.size,
      syncEnabled: this.syncEnabled,
      lastSyncTime: this.lastSyncTime
    };
  }
  
  /**
   * Destroy adapter
   */
  destroy() {
    // Clear pending operations
    for (const timeout of this.pendingOperations.values()) {
      clearTimeout(timeout);
    }
    this.pendingOperations.clear();
    
    // Destroy bridge
    this.bridge.destroy();
    
    // Remove handlers
    window.onJUCEStateUpdate = null;
    window.onJUCEParameterUpdate = null;
    window.onJUCEPresetListUpdate = null;
    window.onJUCEError = null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = InterfaceAdapter;
}