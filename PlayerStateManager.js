/**
 * PlayerStateManager.js
 * Manages individual player states and synchronization
 * Phase 2 Implementation
 */

class PlayerStateManager {
  constructor(stateManager, maxPlayers = 8) {
    this.stateManager = stateManager;
    this.maxPlayers = maxPlayers;
    this.activePlayerCount = 4; // Default 4 players active
    this.currentPlayer = 1;

    // Default player configuration
    this.defaultPlayerState = {
      presetName: "Default",
      kitName: "Acoustic",
      patternGroup: "favorites",
      selectedPattern: "basic",
      kitMixerActive: false,
      muted: false,
      tempoMultiplier: 1.0, // 1.0 = normal, 2.0 = double time, 0.5 = half time
      toggleStates: {
        none: false,
        auto: true,
        manual: false,
        stick: false,
        ride: false,
        lock: false,
      },
      fillStates: {
        now: false,
        4: false,
        8: false,
        16: true,
        32: false,
        solo: false,
      },
      sliderValues: {
        swing: 10,
        energy: 50,
        volume: 75,
      },
      linkStates: {
        swing: false,
        energy: false,
        volume: false,
      },
    };

    // Player state cache for quick access
    this.playerCache = new Map();

    // Listeners for player changes
    this.listeners = new Map();

    // Initialize player states
    this.initializePlayers();
  }

  /**
   * Initialize all player states
   */
  initializePlayers() {
    for (let i = 1; i <= this.maxPlayers; i++) {
      const playerState = this.deepClone(this.defaultPlayerState);

      // Store in state manager
      this.stateManager.setState(`players.${i}`, playerState, {
        validate: false,
        notify: false,
      });

      // Cache for quick access
      this.playerCache.set(i, playerState);
    }
  }

  /**
   * Get player state
   */
  getPlayerState(playerNum) {
    if (playerNum < 1 || playerNum > this.maxPlayers) {
      console.error(`Invalid player number: ${playerNum}`);
      return null;
    }

    // Try cache first
    if (this.playerCache.has(playerNum)) {
      return this.playerCache.get(playerNum);
    }

    // Fallback to state manager
    const state = this.stateManager.getState(`players.${playerNum}`);
    if (state) {
      this.playerCache.set(playerNum, state);
    }
    return state;
  }

  /**
   * Update player state
   */
  updatePlayerState(playerNum, updates, options = {}) {
    if (playerNum < 1 || playerNum > this.maxPlayers) {
      console.error(`Invalid player number: ${playerNum}`);
      return false;
    }

    const currentState = this.getPlayerState(playerNum);
    if (!currentState) return false;

    // Merge updates
    const newState = this.mergeDeep(currentState, updates);

    // Validate if needed
    if (options.validate !== false) {
      if (!this.validatePlayerState(newState)) {
        console.error("Player state validation failed");
        return false;
      }
    }

    // Update in state manager
    this.stateManager.setState(`players.${playerNum}`, newState, options);

    // Update cache
    this.playerCache.set(playerNum, newState);

    // Notify listeners
    if (options.notify !== false) {
      this.notifyListeners(playerNum, newState, currentState);
    }

    return true;
  }

  /**
   * Set current player
   */
  setCurrentPlayer(playerNum) {
    if (playerNum < 1 || playerNum > this.activePlayerCount) {
      console.error(`Invalid player number: ${playerNum}`);
      return false;
    }

    const previousPlayer = this.currentPlayer;
    this.currentPlayer = playerNum;

    // Update global state
    this.stateManager.setState("global.currentPlayer", playerNum);

    // Notify player change
    this.notifyPlayerChange(playerNum, previousPlayer);

    return true;
  }

  /**
   * Set number of active players
   */
  setActivePlayerCount(count) {
    if (count < 1 || count > this.maxPlayers) {
      console.error(`Invalid player count: ${count}`);
      return false;
    }

    this.activePlayerCount = count;

    // Update global state
    this.stateManager.setState("global.numberOfPlayers", count);

    // Adjust current player if needed
    if (this.currentPlayer > count) {
      this.setCurrentPlayer(1);
    }

    return true;
  }

  /**
   * Update kit for a player
   */
  setPlayerKit(playerNum, kitName) {
    return this.updatePlayerState(playerNum, {
      kitName: kitName,
    });
  }

  /**
   * Update pattern for a player
   */
  setPlayerPattern(playerNum, patternName) {
    return this.updatePlayerState(playerNum, {
      selectedPattern: patternName,
    });
  }

  /**
   * Update pattern group for a player
   */
  setPlayerPatternGroup(playerNum, groupName) {
    return this.updatePlayerState(playerNum, {
      patternGroup: groupName,
    });
  }

  /**
   * Update toggle state for a player
   */
  setToggleState(playerNum, toggleName, value) {
    const state = this.getPlayerState(playerNum);
    if (!state) return false;

    // Handle radio button behavior for auto/manual/none
    const radioToggles = ["none", "auto", "manual"];
    const newToggleStates = { ...state.toggleStates };

    if (radioToggles.includes(toggleName) && value) {
      // Turn off other radio toggles
      radioToggles.forEach((toggle) => {
        newToggleStates[toggle] = toggle === toggleName;
      });
    } else {
      newToggleStates[toggleName] = value;
    }

    return this.updatePlayerState(playerNum, {
      toggleStates: newToggleStates,
    });
  }

  /**
   * Update fill state for a player
   */
  setFillState(playerNum, fillName, value) {
    const state = this.getPlayerState(playerNum);
    if (!state) return false;

    const newFillStates = { ...state.fillStates };

    // Only one fill can be active at a time (except 'now' and 'solo')
    const exclusiveFills = ["4", "8", "16", "32"];

    if (exclusiveFills.includes(fillName) && value) {
      exclusiveFills.forEach((fill) => {
        newFillStates[fill] = fill === fillName;
      });
    } else {
      newFillStates[fillName] = value;
    }

    return this.updatePlayerState(playerNum, {
      fillStates: newFillStates,
    });
  }

  /**
   * Update slider value for a player
   */
  setSliderValue(playerNum, sliderName, value) {
    // Validate range
    if (value < 0 || value > 100) {
      console.error(`Invalid slider value: ${value}`);
      return false;
    }

    const state = this.getPlayerState(playerNum);
    if (!state) return false;

    const newSliderValues = { ...state.sliderValues };
    newSliderValues[sliderName] = value;

    return this.updatePlayerState(playerNum, {
      sliderValues: newSliderValues,
    });
  }

  /**
   * Toggle mute state for a player
   */
  togglePlayerMute(playerNum) {
    const state = this.getPlayerState(playerNum);
    if (!state) return false;

    return this.updatePlayerState(playerNum, {
      muted: !state.muted,
    });
  }

  /**
   * Set tempo multiplier for a player
   * @param {number} playerNum - Player number (1-8)
   * @param {number} multiplier - Tempo multiplier (0.5 for half, 1.0 for normal, 2.0 for double)
   * @returns {boolean} Success status
   */
  setPlayerTempoMultiplier(playerNum, multiplier) {
    if (multiplier <= 0) return false;
    
    return this.updatePlayerState(playerNum, {
      tempoMultiplier: multiplier,
    });
  }

  /**
   * Get tempo multiplier for a player
   * @param {number} playerNum - Player number (1-8)
   * @returns {number} Tempo multiplier
   */
  getPlayerTempoMultiplier(playerNum) {
    const state = this.getPlayerState(playerNum);
    return state ? state.tempoMultiplier || 1.0 : 1.0;
  }

  /**
   * Double the tempo for a player
   * @param {number} playerNum - Player number (1-8)
   * @returns {boolean} Success status
   */
  doublePlayerTempo(playerNum) {
    const currentMultiplier = this.getPlayerTempoMultiplier(playerNum);
    const newMultiplier = currentMultiplier * 2.0;
    
    // Limit max multiplier to 4x
    if (newMultiplier > 4.0) return false;
    
    return this.setPlayerTempoMultiplier(playerNum, newMultiplier);
  }

  /**
   * Half the tempo for a player
   * @param {number} playerNum - Player number (1-8)
   * @returns {boolean} Success status
   */
  halfPlayerTempo(playerNum) {
    const currentMultiplier = this.getPlayerTempoMultiplier(playerNum);
    const newMultiplier = currentMultiplier * 0.5;
    
    // Limit min multiplier to 0.25x
    if (newMultiplier < 0.25) return false;
    
    return this.setPlayerTempoMultiplier(playerNum, newMultiplier);
  }

  /**
   * Reset tempo multiplier to normal for a player
   * @param {number} playerNum - Player number (1-8)
   * @returns {boolean} Success status
   */
  resetPlayerTempo(playerNum) {
    return this.setPlayerTempoMultiplier(playerNum, 1.0);
  }

  /**
   * Set link state for a parameter
   */
  setLinkState(playerNum, paramName, linked) {
    const state = this.getPlayerState(playerNum);
    if (!state) return false;

    const newLinkStates = { ...state.linkStates };
    newLinkStates[paramName] = linked;

    return this.updatePlayerState(playerNum, {
      linkStates: newLinkStates,
    });
  }

  /**
   * Copy player state to another player
   */
  copyPlayerState(fromPlayer, toPlayer) {
    const sourceState = this.getPlayerState(fromPlayer);
    if (!sourceState) return false;

    // Deep clone the state
    const copiedState = this.deepClone(sourceState);

    // Update the target player
    return this.updatePlayerState(toPlayer, copiedState);
  }

  /**
   * Reset player to default state
   */
  resetPlayer(playerNum) {
    const defaultState = this.deepClone(this.defaultPlayerState);
    return this.updatePlayerState(playerNum, defaultState);
  }

  /**
   * Get all active player states
   */
  getAllActiveStates() {
    const states = {};
    for (let i = 1; i <= this.activePlayerCount; i++) {
      states[i] = this.getPlayerState(i);
    }
    return states;
  }

  /**
   * Batch update multiple players
   */
  batchUpdate(updates) {
    const results = [];

    // Start transaction
    this.stateManager.beginTransaction("batch-player-update");

    for (const [playerNum, playerUpdates] of Object.entries(updates)) {
      const success = this.updatePlayerState(
        parseInt(playerNum),
        playerUpdates,
        { notify: false },
      );
      results.push({ player: playerNum, success });
    }

    // Commit transaction
    this.stateManager.commitTransaction();

    // Notify all changes at once
    this.notifyBatchUpdate(updates);

    return results;
  }

  /**
   * Validate player state
   */
  validatePlayerState(state) {
    // Check required fields
    const requiredFields = ["kitName", "patternGroup", "selectedPattern"];
    for (const field of requiredFields) {
      if (!state[field]) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
    }

    // Validate slider values
    if (state.sliderValues) {
      for (const [param, value] of Object.entries(state.sliderValues)) {
        if (typeof value !== "number" || value < 0 || value > 100) {
          console.error(`Invalid slider value for ${param}: ${value}`);
          return false;
        }
      }
    }

    // Validate toggle states
    if (state.toggleStates) {
      const radioToggles = ["none", "auto", "manual"];
      const activeRadio = radioToggles.filter((t) => state.toggleStates[t]);
      if (activeRadio.length !== 1) {
        console.error("Exactly one radio toggle must be active");
        return false;
      }
    }

    return true;
  }

  /**
   * Add listener for player changes
   */
  addListener(playerNum, listener) {
    if (!this.listeners.has(playerNum)) {
      this.listeners.set(playerNum, new Set());
    }
    this.listeners.get(playerNum).add(listener);

    return () => this.removeListener(playerNum, listener);
  }

  /**
   * Remove listener
   */
  removeListener(playerNum, listener) {
    const playerListeners = this.listeners.get(playerNum);
    if (playerListeners) {
      playerListeners.delete(listener);
    }
  }

  /**
   * Notify listeners of player changes
   */
  notifyListeners(playerNum, newState, oldState) {
    // Notify specific player listeners
    const playerListeners = this.listeners.get(playerNum);
    if (playerListeners) {
      playerListeners.forEach((listener) => {
        try {
          listener(newState, oldState, playerNum);
        } catch (error) {
          console.error("Error in player listener:", error);
        }
      });
    }

    // Notify global listeners
    const globalListeners = this.listeners.get("*");
    if (globalListeners) {
      globalListeners.forEach((listener) => {
        try {
          listener(newState, oldState, playerNum);
        } catch (error) {
          console.error("Error in global player listener:", error);
        }
      });
    }
  }

  /**
   * Notify player change
   */
  notifyPlayerChange(newPlayer, oldPlayer) {
    const changeListeners = this.listeners.get("player-change");
    if (changeListeners) {
      changeListeners.forEach((listener) => {
        try {
          listener(newPlayer, oldPlayer);
        } catch (error) {
          console.error("Error in player change listener:", error);
        }
      });
    }
  }

  /**
   * Notify batch update
   */
  notifyBatchUpdate(updates) {
    const batchListeners = this.listeners.get("batch-update");
    if (batchListeners) {
      batchListeners.forEach((listener) => {
        try {
          listener(updates);
        } catch (error) {
          console.error("Error in batch update listener:", error);
        }
      });
    }
  }

  /**
   * Export player states for saving
   */
  exportStates() {
    const exported = {
      currentPlayer: this.currentPlayer,
      activePlayerCount: this.activePlayerCount,
      players: {},
    };

    for (let i = 1; i <= this.maxPlayers; i++) {
      exported.players[i] = this.getPlayerState(i);
    }

    return exported;
  }

  /**
   * Import player states
   */
  importStates(data) {
    if (!data || !data.players) {
      console.error("Invalid import data");
      return false;
    }

    // Start transaction
    this.stateManager.beginTransaction("import-players");

    try {
      // Set global values
      if (data.currentPlayer) {
        this.currentPlayer = data.currentPlayer;
      }
      if (data.activePlayerCount) {
        this.activePlayerCount = data.activePlayerCount;
      }

      // Import player states
      for (const [playerNum, state] of Object.entries(data.players)) {
        const num = parseInt(playerNum);
        if (num >= 1 && num <= this.maxPlayers) {
          this.updatePlayerState(num, state, { notify: false });
        }
      }

      // Commit transaction
      this.stateManager.commitTransaction();

      // Notify all changes
      this.notifyBatchUpdate(data.players);

      return true;
    } catch (error) {
      console.error("Error importing player states:", error);
      this.stateManager.rollbackTransaction();
      return false;
    }
  }

  /**
   * Deep clone helper
   */
  deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * Deep merge helper
   */
  mergeDeep(target, source) {
    const output = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        if (
          target[key] &&
          typeof target[key] === "object" &&
          !Array.isArray(target[key])
        ) {
          output[key] = this.mergeDeep(target[key], source[key]);
        } else {
          output[key] = source[key];
        }
      } else {
        output[key] = source[key];
      }
    }

    return output;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      maxPlayers: this.maxPlayers,
      activePlayerCount: this.activePlayerCount,
      currentPlayer: this.currentPlayer,
      cacheSize: this.playerCache.size,
      listenerCount: this.listeners.size,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.playerCache.clear();
  }

  /**
   * Destroy manager
   */
  destroy() {
    this.playerCache.clear();
    this.listeners.clear();
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PlayerStateManager;
}
