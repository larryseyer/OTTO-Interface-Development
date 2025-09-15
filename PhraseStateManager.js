/**
 * PhraseStateManager.js
 * Manages individual Phrase states and synchronization
 * Phase 2 Implementation
 */

class PhraseStateManager {
  constructor(stateManager, maxPhrases = 8) {
    this.stateManager = stateManager;
    this.maxPhrases = maxPhrases;
    this.activePhraseCount = 8; // Default 4 Phrases active
    this.currentPhrase = 1;

    // Default Phrase configuration
    this.defaultPhraseState = {
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

    // Phrase state cache for quick access
    this.PhraseCache = new Map();

    // Listeners for Phrase changes
    this.listeners = new Map();

    // Initialize Phrase states
    this.initializePhrases();
  }

  /**
   * Initialize all Phrase states
   */
  initializePhrases() {
    for (let i = 1; i <= this.maxPhrases; i++) {
      const PhraseState = this.deepClone(this.defaultPhraseState);

      // Store in state manager
      this.stateManager.setState(`Phrases.${i}`, PhraseState, {
        validate: false,
        notify: false,
      });

      // Cache for quick access
      this.PhraseCache.set(i, PhraseState);
    }
  }

  /**
   * Get Phrase state
   */
  getPhraseState(PhraseNum) {
    if (PhraseNum < 1 || PhraseNum > this.maxPhrases) {
      console.error(`Invalid Phrase number: ${PhraseNum}`);
      return null;
    }

    // Try cache first
    if (this.PhraseCache.has(PhraseNum)) {
      return this.PhraseCache.get(PhraseNum);
    }

    // Fallback to state manager
    const state = this.stateManager.getState(`Phrases.${PhraseNum}`);
    if (state) {
      this.PhraseCache.set(PhraseNum, state);
    }
    return state;
  }

  /**
   * Update Phrase state
   */
  updatePhraseState(PhraseNum, updates, options = {}) {
    if (PhraseNum < 1 || PhraseNum > this.maxPhrases) {
      console.error(`Invalid Phrase number: ${PhraseNum}`);
      return false;
    }

    const currentState = this.getPhraseState(PhraseNum);
    if (!currentState) return false;

    // Merge updates
    const newState = this.mergeDeep(currentState, updates);

    // Validate if needed
    if (options.validate !== false) {
      if (!this.validatePhraseState(newState)) {
        console.error("Phrase state validation failed");
        return false;
      }
    }

    // Update in state manager
    this.stateManager.setState(`Phrases.${PhraseNum}`, newState, options);

    // Update cache
    this.PhraseCache.set(PhraseNum, newState);

    // Notify listeners
    if (options.notify !== false) {
      this.notifyListeners(PhraseNum, newState, currentState);
    }

    return true;
  }

  /**
   * Set current Phrase
   */
  setCurrentPhrase(PhraseNum) {
    if (PhraseNum < 1 || PhraseNum > this.activePhraseCount) {
      console.error(`Invalid Phrase number: ${PhraseNum}`);
      return false;
    }

    const previousPhrase = this.currentPhrase;
    this.currentPhrase = PhraseNum;

    // Update global state
    this.stateManager.setState("global.currentPhrase", PhraseNum);

    // Notify Phrase change
    this.notifyPhraseChange(PhraseNum, previousPhrase);

    return true;
  }

  /**
   * Set number of active Phrases
   */
  setActivePhraseCount(count) {
    if (count < 1 || count > this.maxPhrases) {
      console.error(`Invalid Phrase count: ${count}`);
      return false;
    }

    this.activePhraseCount = count;

    // Update global state
    this.stateManager.setState("global.numberOfPhrases", count);

    // Adjust current Phrase if needed
    if (this.currentPhrase > count) {
      this.setCurrentPhrase(1);
    }

    return true;
  }

  /**
   * Update kit for a Phrase
   */
  setPhraseKit(PhraseNum, kitName) {
    return this.updatePhraseState(PhraseNum, {
      kitName: kitName,
    });
  }

  /**
   * Update pattern for a Phrase
   */
  setPhrasePattern(PhraseNum, patternName) {
    return this.updatePhraseState(PhraseNum, {
      selectedPattern: patternName,
    });
  }

  /**
   * Update pattern group for a Phrase
   */
  setPhrasePatternGroup(PhraseNum, groupName) {
    return this.updatePhraseState(PhraseNum, {
      patternGroup: groupName,
    });
  }

  /**
   * Update toggle state for a Phrase
   */
  setToggleState(PhraseNum, toggleName, value) {
    const state = this.getPhraseState(PhraseNum);
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

    return this.updatePhraseState(PhraseNum, {
      toggleStates: newToggleStates,
    });
  }

  /**
   * Update fill state for a Phrase
   */
  setFillState(PhraseNum, fillName, value) {
    const state = this.getPhraseState(PhraseNum);
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

    return this.updatePhraseState(PhraseNum, {
      fillStates: newFillStates,
    });
  }

  /**
   * Update slider value for a Phrase
   */
  setSliderValue(PhraseNum, sliderName, value) {
    // Validate range
    if (value < 0 || value > 100) {
      console.error(`Invalid slider value: ${value}`);
      return false;
    }

    const state = this.getPhraseState(PhraseNum);
    if (!state) return false;

    const newSliderValues = { ...state.sliderValues };
    newSliderValues[sliderName] = value;

    return this.updatePhraseState(PhraseNum, {
      sliderValues: newSliderValues,
    });
  }

  /**
   * Toggle mute state for a Phrase
   */
  togglePhraseMute(PhraseNum) {
    const state = this.getPhraseState(PhraseNum);
    if (!state) return false;

    return this.updatePhraseState(PhraseNum, {
      muted: !state.muted,
    });
  }

  /**
   * Set link state for a parameter
   */
  setLinkState(PhraseNum, paramName, linked) {
    const state = this.getPhraseState(PhraseNum);
    if (!state) return false;

    const newLinkStates = { ...state.linkStates };
    newLinkStates[paramName] = linked;

    return this.updatePhraseState(PhraseNum, {
      linkStates: newLinkStates,
    });
  }

  /**
   * Copy Phrase state to another Phrase
   */
  copyPhraseState(fromPhrase, toPhrase) {
    const sourceState = this.getPhraseState(fromPhrase);
    if (!sourceState) return false;

    // Deep clone the state
    const copiedState = this.deepClone(sourceState);

    // Update the target Phrase
    return this.updatePhraseState(toPhrase, copiedState);
  }

  /**
   * Reset Phrase to default state
   */
  resetPhrase(PhraseNum) {
    const defaultState = this.deepClone(this.defaultPhraseState);
    return this.updatePhraseState(PhraseNum, defaultState);
  }

  /**
   * Get all active Phrase states
   */
  getAllActiveStates() {
    const states = {};
    for (let i = 1; i <= this.activePhraseCount; i++) {
      states[i] = this.getPhraseState(i);
    }
    return states;
  }

  /**
   * Batch update multiple Phrases
   */
  batchUpdate(updates) {
    const results = [];

    // Start transaction
    this.stateManager.beginTransaction("batch-Phrase-update");

    for (const [PhraseNum, PhraseUpdates] of Object.entries(updates)) {
      const success = this.updatePhraseState(
        parseInt(PhraseNum),
        PhraseUpdates,
        { notify: false },
      );
      results.push({ Phrase: PhraseNum, success });
    }

    // Commit transaction
    this.stateManager.commitTransaction();

    // Notify all changes at once
    this.notifyBatchUpdate(updates);

    return results;
  }

  /**
   * Validate Phrase state
   */
  validatePhraseState(state) {
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
   * Add listener for Phrase changes
   */
  addListener(PhraseNum, listener) {
    if (!this.listeners.has(PhraseNum)) {
      this.listeners.set(PhraseNum, new Set());
    }
    this.listeners.get(PhraseNum).add(listener);

    return () => this.removeListener(PhraseNum, listener);
  }

  /**
   * Remove listener
   */
  removeListener(PhraseNum, listener) {
    const PhraseListeners = this.listeners.get(PhraseNum);
    if (PhraseListeners) {
      PhraseListeners.delete(listener);
    }
  }

  /**
   * Notify listeners of Phrase changes
   */
  notifyListeners(PhraseNum, newState, oldState) {
    // Notify specific Phrase listeners
    const PhraseListeners = this.listeners.get(PhraseNum);
    if (PhraseListeners) {
      PhraseListeners.forEach((listener) => {
        try {
          listener(newState, oldState, PhraseNum);
        } catch (error) {
          console.error("Error in Phrase listener:", error);
        }
      });
    }

    // Notify global listeners
    const globalListeners = this.listeners.get("*");
    if (globalListeners) {
      globalListeners.forEach((listener) => {
        try {
          listener(newState, oldState, PhraseNum);
        } catch (error) {
          console.error("Error in global Phrase listener:", error);
        }
      });
    }
  }

  /**
   * Notify Phrase change
   */
  notifyPhraseChange(newPhrase, oldPhrase) {
    const changeListeners = this.listeners.get("Phrase-change");
    if (changeListeners) {
      changeListeners.forEach((listener) => {
        try {
          listener(newPhrase, oldPhrase);
        } catch (error) {
          console.error("Error in Phrase change listener:", error);
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
   * Export Phrase states for saving
   */
  exportStates() {
    const exported = {
      currentPhrase: this.currentPhrase,
      activePhraseCount: this.activePhraseCount,
      Phrases: {},
    };

    for (let i = 1; i <= this.maxPhrases; i++) {
      exported.Phrases[i] = this.getPhraseState(i);
    }

    return exported;
  }

  /**
   * Import Phrase states
   */
  importStates(data) {
    if (!data || !data.Phrases) {
      console.error("Invalid import data");
      return false;
    }

    // Start transaction
    this.stateManager.beginTransaction("import-Phrases");

    try {
      // Set global values
      if (data.currentPhrase) {
        this.currentPhrase = data.currentPhrase;
      }
      if (data.activePhraseCount) {
        this.activePhraseCount = data.activePhraseCount;
      }

      // Import Phrase states
      for (const [PhraseNum, state] of Object.entries(data.Phrases)) {
        const num = parseInt(PhraseNum);
        if (num >= 1 && num <= this.maxPhrases) {
          this.updatePhraseState(num, state, { notify: false });
        }
      }

      // Commit transaction
      this.stateManager.commitTransaction();

      // Notify all changes
      this.notifyBatchUpdate(data.Phrases);

      return true;
    } catch (error) {
      console.error("Error importing Phrase states:", error);
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
      maxPhrases: this.maxPhrases,
      activePhraseCount: this.activePhraseCount,
      currentPhrase: this.currentPhrase,
      cacheSize: this.PhraseCache.size,
      listenerCount: this.listeners.size,
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.PhraseCache.clear();
  }

  /**
   * Destroy manager
   */
  destroy() {
    this.PhraseCache.clear();
    this.listeners.clear();
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PhraseStateManager;
}
