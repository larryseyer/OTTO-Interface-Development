/**
 * LinkManager.js
 * Manages parameter linking between players
 * Phase 2 Implementation
 */

class LinkManager {
  constructor(playerStateManager) {
    this.playerStateManager = playerStateManager;
    
    // Link configuration
    this.linkableParameters = ['swing', 'energy', 'volume'];
    
    // Link groups - each group contains linked players for a parameter
    this.linkGroups = new Map();
    this.linkableParameters.forEach(param => {
      this.linkGroups.set(param, new Map());
    });
    
    // Master/slave relationships
    this.masters = new Map(); // parameter -> master player
    
    // Link states per player
    this.playerLinkStates = new Map();
    
    // Propagation tracking to prevent loops
    this.propagating = false;
    this.propagationStack = [];
    
    // Listeners
    this.listeners = new Map();
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize link manager
   */
  initialize() {
    // Set up player link states for all players
    for (let i = 1; i <= 8; i++) {
      this.playerLinkStates.set(i, {
        swing: false,
        energy: false,
        volume: false
      });
    }
    
    // Listen for player state changes
    if (this.playerStateManager) {
      this.playerStateManager.addListener('*', (newState, oldState, playerNum) => {
        this.handlePlayerStateChange(playerNum, newState, oldState);
      });
    }
  }
  
  /**
   * Toggle link state for a player parameter
   */
  toggleLink(playerNum, parameter) {
    if (!this.linkableParameters.includes(parameter)) {
      throw new Error(`Invalid parameter: ${parameter}`);
    }
    
    const linkState = this.playerLinkStates.get(playerNum);
    if (!linkState) {
      throw new Error(`Invalid player: ${playerNum}`);
    }
    
    const wasLinked = linkState[parameter];
    linkState[parameter] = !wasLinked;
    
    if (linkState[parameter]) {
      // Add to link group
      this.addToLinkGroup(playerNum, parameter);
    } else {
      // Remove from link group
      this.removeFromLinkGroup(playerNum, parameter);
    }
    
    // Notify listeners
    this.notifyListeners('link-toggle', playerNum, parameter, !wasLinked);
    
    return !wasLinked;
  }
  
  /**
   * Add player to link group
   */
  addToLinkGroup(playerNum, parameter) {
    const group = this.linkGroups.get(parameter);
    if (!group) return;
    
    // If this is the first in the group, make it master
    if (group.size === 0) {
      this.masters.set(parameter, playerNum);
    }
    
    // Get current master's value
    const master = this.masters.get(parameter);
    let masterValue = null;
    
    if (master && this.playerStateManager) {
      const masterState = this.playerStateManager.getPlayerState(master);
      if (masterState && masterState.sliderValues) {
        masterValue = masterState.sliderValues[parameter];
      }
    }
    
    // Add to group
    group.set(playerNum, {
      joinedAt: Date.now(),
      isMaster: group.size === 0,
      syncValue: masterValue
    });
    
    // Sync the new player to master value if not master
    if (masterValue !== null && playerNum !== master) {
      this.propagateValue(parameter, masterValue, master, [playerNum]);
    }
    
    // Update UI to show linked state
    this.updateLinkUI(playerNum, parameter, true);
  }
  
  /**
   * Remove player from link group
   */
  removeFromLinkGroup(playerNum, parameter) {
    const group = this.linkGroups.get(parameter);
    if (!group) return;
    
    const wasInGroup = group.has(playerNum);
    group.delete(playerNum);
    
    // If this was the master, assign new master
    if (this.masters.get(parameter) === playerNum && group.size > 0) {
      const newMaster = group.keys().next().value;
      this.masters.set(parameter, newMaster);
      group.get(newMaster).isMaster = true;
      
      // Notify master change
      this.notifyListeners('master-change', parameter, newMaster, playerNum);
    } else if (group.size === 0) {
      // No players left in group
      this.masters.delete(parameter);
    }
    
    // Update UI to show unlinked state
    if (wasInGroup) {
      this.updateLinkUI(playerNum, parameter, false);
    }
  }
  
  /**
   * Handle player state change
   */
  handlePlayerStateChange(playerNum, newState, oldState) {
    // Check if we're already propagating to prevent loops
    if (this.propagating) {
      // Check if this is an expected propagation
      const expected = this.propagationStack.find(p => 
        p.player === playerNum && p.timestamp > Date.now() - 1000
      );
      if (expected) {
        return; // This is an expected change from propagation
      }
    }
    
    // Check for slider value changes
    if (newState && oldState && newState.sliderValues && oldState.sliderValues) {
      this.linkableParameters.forEach(param => {
        const newValue = newState.sliderValues[param];
        const oldValue = oldState.sliderValues[param];
        
        if (newValue !== oldValue) {
          // Check if this player is linked
          const linkState = this.playerLinkStates.get(playerNum);
          if (linkState && linkState[param]) {
            // This player is linked, propagate the change
            this.handleLinkedValueChange(playerNum, param, newValue);
          }
        }
      });
    }
  }
  
  /**
   * Handle linked value change
   */
  handleLinkedValueChange(sourcePlayer, parameter, value) {
    const group = this.linkGroups.get(parameter);
    if (!group || !group.has(sourcePlayer)) return;
    
    // Get all linked players except source
    const linkedPlayers = Array.from(group.keys()).filter(p => p !== sourcePlayer);
    
    if (linkedPlayers.length > 0) {
      // Propagate to all linked players
      this.propagateValue(parameter, value, sourcePlayer, linkedPlayers);
    }
    
    // Update master if needed
    const currentMaster = this.masters.get(parameter);
    if (!currentMaster || !group.has(currentMaster)) {
      // Make the source player the new master
      this.masters.set(parameter, sourcePlayer);
      group.get(sourcePlayer).isMaster = true;
    }
  }
  
  /**
   * Propagate value to linked players
   */
  propagateValue(parameter, value, sourcePlayer, targetPlayers) {
    // Prevent circular propagation
    if (this.propagating) {
      console.warn('LinkManager: Circular propagation detected');
      return;
    }
    
    this.propagating = true;
    
    // Track propagation
    targetPlayers.forEach(player => {
      this.propagationStack.push({
        player,
        parameter,
        value,
        source: sourcePlayer,
        timestamp: Date.now()
      });
    });
    
    // Clean old propagation entries
    const now = Date.now();
    this.propagationStack = this.propagationStack.filter(p => 
      now - p.timestamp < 2000
    );
    
    // Propagate to each target player
    targetPlayers.forEach(playerNum => {
      if (this.playerStateManager) {
        // Update the player's slider value
        this.playerStateManager.setSliderValue(playerNum, parameter, value);
        
        // Update UI if this is the current player
        this.updateSliderUI(playerNum, parameter, value);
      }
    });
    
    // Notify listeners
    this.notifyListeners('value-propagated', parameter, value, sourcePlayer, targetPlayers);
    
    // Reset propagation flag after a delay
    setTimeout(() => {
      this.propagating = false;
    }, 100);
  }
  
  /**
   * Get link group for parameter
   */
  getLinkGroup(parameter) {
    const group = this.linkGroups.get(parameter);
    if (!group) return [];
    
    return Array.from(group.keys());
  }
  
  /**
   * Get all linked parameters for a player
   */
  getPlayerLinks(playerNum) {
    const linkState = this.playerLinkStates.get(playerNum);
    if (!linkState) return [];
    
    return this.linkableParameters.filter(param => linkState[param]);
  }
  
  /**
   * Check if parameter is linked for player
   */
  isLinked(playerNum, parameter) {
    const linkState = this.playerLinkStates.get(playerNum);
    return linkState ? linkState[parameter] : false;
  }
  
  /**
   * Get master player for parameter
   */
  getMaster(parameter) {
    return this.masters.get(parameter);
  }
  
  /**
   * Set master player for parameter
   */
  setMaster(parameter, playerNum) {
    const group = this.linkGroups.get(parameter);
    if (!group || !group.has(playerNum)) {
      throw new Error(`Player ${playerNum} is not in link group for ${parameter}`);
    }
    
    const oldMaster = this.masters.get(parameter);
    
    // Update master
    this.masters.set(parameter, playerNum);
    
    // Update group info
    group.forEach((info, player) => {
      info.isMaster = player === playerNum;
    });
    
    // Get master value and sync others
    if (this.playerStateManager) {
      const masterState = this.playerStateManager.getPlayerState(playerNum);
      if (masterState && masterState.sliderValues) {
        const value = masterState.sliderValues[parameter];
        const otherPlayers = Array.from(group.keys()).filter(p => p !== playerNum);
        if (otherPlayers.length > 0) {
          this.propagateValue(parameter, value, playerNum, otherPlayers);
        }
      }
    }
    
    // Notify listeners
    this.notifyListeners('master-change', parameter, playerNum, oldMaster);
  }
  
  /**
   * Break all links for a player
   */
  unlinkPlayer(playerNum) {
    const linkState = this.playerLinkStates.get(playerNum);
    if (!linkState) return;
    
    this.linkableParameters.forEach(param => {
      if (linkState[param]) {
        this.removeFromLinkGroup(playerNum, param);
        linkState[param] = false;
      }
    });
    
    // Notify listeners
    this.notifyListeners('player-unlinked', playerNum);
  }
  
  /**
   * Break all links for a parameter
   */
  unlinkParameter(parameter) {
    const group = this.linkGroups.get(parameter);
    if (!group) return;
    
    const players = Array.from(group.keys());
    
    // Clear the group
    group.clear();
    this.masters.delete(parameter);
    
    // Update player states
    players.forEach(playerNum => {
      const linkState = this.playerLinkStates.get(playerNum);
      if (linkState) {
        linkState[parameter] = false;
      }
      this.updateLinkUI(playerNum, parameter, false);
    });
    
    // Notify listeners
    this.notifyListeners('parameter-unlinked', parameter, players);
  }
  
  /**
   * Update link UI
   */
  updateLinkUI(playerNum, parameter, linked) {
    // This would update the link icon UI
    // Implementation depends on how UI is structured
    const linkIcon = document.querySelector(
      `.player-${playerNum} .link-icon[data-param="${parameter}"]`
    );
    
    if (linkIcon) {
      linkIcon.classList.toggle('linked', linked);
    }
  }
  
  /**
   * Update slider UI
   */
  updateSliderUI(playerNum, parameter, value) {
    // This would update the slider UI if needed
    // Implementation depends on current player display
    const currentPlayer = this.playerStateManager?.currentPlayer;
    if (currentPlayer === playerNum) {
      const slider = document.querySelector(`.custom-slider[data-param="${parameter}"]`);
      if (slider) {
        const fill = slider.querySelector('.slider-fill');
        const thumb = slider.querySelector('.slider-thumb');
        if (fill && thumb) {
          fill.style.height = `${value}%`;
          thumb.style.bottom = `${value}%`;
        }
      }
    }
  }
  
  /**
   * Export link states
   */
  exportStates() {
    const exported = {
      linkGroups: {},
      masters: {},
      playerLinkStates: {}
    };
    
    // Export link groups
    this.linkGroups.forEach((group, param) => {
      exported.linkGroups[param] = Array.from(group.entries()).map(([player, info]) => ({
        player,
        ...info
      }));
    });
    
    // Export masters
    this.masters.forEach((player, param) => {
      exported.masters[param] = player;
    });
    
    // Export player link states
    this.playerLinkStates.forEach((state, player) => {
      exported.playerLinkStates[player] = { ...state };
    });
    
    return exported;
  }
  
  /**
   * Import link states
   */
  importStates(data) {
    if (!data) return;
    
    // Clear current state
    this.linkGroups.forEach(group => group.clear());
    this.masters.clear();
    
    // Import link groups
    if (data.linkGroups) {
      Object.entries(data.linkGroups).forEach(([param, players]) => {
        const group = this.linkGroups.get(param);
        if (group) {
          players.forEach(info => {
            group.set(info.player, {
              joinedAt: info.joinedAt || Date.now(),
              isMaster: info.isMaster || false,
              syncValue: info.syncValue
            });
          });
        }
      });
    }
    
    // Import masters
    if (data.masters) {
      Object.entries(data.masters).forEach(([param, player]) => {
        this.masters.set(param, player);
      });
    }
    
    // Import player link states
    if (data.playerLinkStates) {
      Object.entries(data.playerLinkStates).forEach(([player, state]) => {
        this.playerLinkStates.set(parseInt(player), { ...state });
      });
    }
    
    // Update UI
    this.playerLinkStates.forEach((state, player) => {
      this.linkableParameters.forEach(param => {
        this.updateLinkUI(player, param, state[param]);
      });
    });
  }
  
  /**
   * Add listener
   */
  addListener(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(listener);
    
    return () => this.removeListener(event, listener);
  }
  
  /**
   * Remove listener
   */
  removeListener(event, listener) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }
  
  /**
   * Notify listeners
   */
  notifyListeners(event, ...args) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in link listener (${event}):`, error);
        }
      });
    }
    
    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(listener => {
        try {
          listener(event, ...args);
        } catch (error) {
          console.error('Error in wildcard link listener:', error);
        }
      });
    }
  }
  
  /**
   * Get statistics
   */
  getStats() {
    const stats = {
      linkedParameters: {},
      totalLinks: 0,
      masters: {}
    };
    
    this.linkGroups.forEach((group, param) => {
      stats.linkedParameters[param] = group.size;
      stats.totalLinks += group.size;
      
      const master = this.masters.get(param);
      if (master) {
        stats.masters[param] = master;
      }
    });
    
    return stats;
  }
  
  /**
   * Destroy manager
   */
  destroy() {
    this.linkGroups.forEach(group => group.clear());
    this.masters.clear();
    this.playerLinkStates.clear();
    this.listeners.clear();
    this.propagationStack = [];
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LinkManager;
}