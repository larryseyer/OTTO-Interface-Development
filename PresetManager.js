/**
 * PresetManager.js
 * Manages presets with version control and lock states
 * Phase 2 Implementation
 */

class PresetManager {
  constructor(playerStateManager, patternGroupManager, drumkitManager, storageManager) {
    this.playerStateManager = playerStateManager;
    this.patternGroupManager = patternGroupManager;
    this.drumkitManager = drumkitManager;
    this.storageManager = storageManager;
    
    // Preset configuration
    this.MAX_PRESET_NAME_LENGTH = 50;
    this.MAX_HISTORY_SIZE = 10;
    this.DEFAULT_PRESET_NAME = 'Default';
    
    // Preset storage
    this.presets = new Map();
    
    // Current preset tracking
    this.currentPresetKey = 'default';
    
    // Preset lock states
    this.lockedPresets = new Set(['default']); // Default is always locked
    
    // History for undo
    this.history = [];
    this.historyIndex = -1;
    
    // Listeners
    this.listeners = new Map();
    
    // Initialize with defaults
    this.initialize();
  }
  
  /**
   * Initialize with default preset
   */
  initialize() {
    // Create default preset
    this.presets.set('default', {
      name: this.DEFAULT_PRESET_NAME,
      locked: true,
      version: '1.0.0',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      metadata: {
        author: 'OTTO',
        description: 'Factory default preset',
        tags: ['default', 'factory']
      },
      data: this.captureCurrentState()
    });
    
    // Load saved presets from storage
    this.loadFromStorage();
  }
  
  /**
   * Capture current state from all managers
   */
  captureCurrentState() {
    return {
      players: this.playerStateManager ? this.playerStateManager.exportStates() : {},
      patternGroups: {
        current: this.patternGroupManager ? this.patternGroupManager.currentGroupKey : 'favorites',
        // Note: We only store the reference, not the actual patterns
      },
      drumkits: {
        // Store player->kit assignments only, not the actual kit data
        playerKits: this.drumkitManager ? 
          Array.from(this.drumkitManager.playerKits.entries()).reduce((acc, [player, kit]) => {
            acc[player] = kit;
            return acc;
          }, {}) : {}
      },
      global: {
        tempo: 120,
        isPlaying: true,
        loopPosition: 0
      },
      timestamp: Date.now()
    };
  }
  
  /**
   * Create new preset
   */
  createPreset(name, data = null) {
    // Validate name
    if (!this.validatePresetName(name)) {
      throw new Error(`Invalid preset name: ${name}`);
    }
    
    // Generate key
    const key = this.generatePresetKey(name);
    
    // Check if already exists
    if (this.presets.has(key)) {
      throw new Error(`Preset already exists: ${name}`);
    }
    
    // Capture current state or use provided data
    const presetData = data || this.captureCurrentState();
    
    // Create preset
    const preset = {
      name: name,
      locked: false,
      version: '1.0.0',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      metadata: {
        author: 'User',
        description: '',
        tags: []
      },
      data: presetData
    };
    
    // Store preset
    this.presets.set(key, preset);
    
    // Add to history
    this.addToHistory({
      action: 'create',
      preset: key,
      data: preset
    });
    
    // Save to storage
    this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners('create', key, preset);
    
    return key;
  }
  
  /**
   * Save current state to preset
   */
  savePreset(key = null) {
    const presetKey = key || this.currentPresetKey;
    const preset = this.presets.get(presetKey);
    
    if (!preset) {
      throw new Error(`Preset not found: ${presetKey}`);
    }
    
    if (preset.locked && presetKey !== 'default') {
      throw new Error(`Preset is locked: ${presetKey}`);
    }
    
    // Special handling for default preset
    if (presetKey === 'default') {
      // For default preset, we allow saving but warn
      console.warn('Saving to default preset - this will affect all new presets');
    }
    
    // Capture current state
    const currentState = this.captureCurrentState();
    
    // Update preset
    const updatedPreset = {
      ...preset,
      data: currentState,
      modifiedAt: Date.now(),
      version: this.incrementVersion(preset.version)
    };
    
    // Store updated preset
    this.presets.set(presetKey, updatedPreset);
    
    // Add to history
    this.addToHistory({
      action: 'save',
      preset: presetKey,
      previousData: preset.data,
      newData: currentState
    });
    
    // Save to storage
    this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners('save', presetKey, updatedPreset, preset);
    
    return updatedPreset;
  }
  
  /**
   * Load preset
   */
  loadPreset(key) {
    const preset = this.presets.get(key);
    
    if (!preset) {
      throw new Error(`Preset not found: ${key}`);
    }
    
    // Store current state for undo
    const currentState = this.captureCurrentState();
    
    try {
      // Apply preset data to managers
      this.applyPresetData(preset.data);
      
      // Update current preset
      this.currentPresetKey = key;
      
      // Add to history
      this.addToHistory({
        action: 'load',
        preset: key,
        previousState: currentState,
        previousPreset: this.currentPresetKey
      });
      
      // Notify listeners
      this.notifyListeners('load', key, preset);
      
      return preset;
      
    } catch (error) {
      console.error('Error loading preset:', error);
      // Try to restore previous state
      this.applyPresetData(currentState);
      throw error;
    }
  }
  
  /**
   * Apply preset data to managers
   */
  applyPresetData(data) {
    if (!data) return;
    
    // Apply player states
    if (data.players && this.playerStateManager) {
      this.playerStateManager.importStates(data.players);
    }
    
    // Apply pattern group selection
    if (data.patternGroups && this.patternGroupManager) {
      if (data.patternGroups.current && this.patternGroupManager.groups.has(data.patternGroups.current)) {
        this.patternGroupManager.currentGroupKey = data.patternGroups.current;
      }
    }
    
    // Apply drumkit assignments
    if (data.drumkits && data.drumkits.playerKits && this.drumkitManager) {
      Object.entries(data.drumkits.playerKits).forEach(([player, kitKey]) => {
        const playerNum = parseInt(player);
        if (this.drumkitManager.drumkits.has(kitKey)) {
          this.drumkitManager.setPlayerKit(playerNum, kitKey);
        }
      });
    }
    
    // Apply global settings
    if (data.global) {
      // This would be applied through the main app state manager
      // For now, just log it
      console.log('Global settings to apply:', data.global);
    }
  }
  
  /**
   * Delete preset
   */
  deletePreset(key) {
    const preset = this.presets.get(key);
    
    if (!preset) {
      throw new Error(`Preset not found: ${key}`);
    }
    
    if (preset.locked) {
      throw new Error(`Cannot delete locked preset: ${key}`);
    }
    
    if (key === 'default') {
      throw new Error('Cannot delete default preset');
    }
    
    // Don't allow deleting last preset
    if (this.presets.size <= 1) {
      throw new Error('Cannot delete the last preset');
    }
    
    // Remove preset
    this.presets.delete(key);
    
    // If this was current preset, switch to default
    if (this.currentPresetKey === key) {
      this.currentPresetKey = 'default';
    }
    
    // Add to history
    this.addToHistory({
      action: 'delete',
      preset: key,
      data: preset
    });
    
    // Save to storage
    this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners('delete', key, null, preset);
    
    return true;
  }
  
  /**
   * Rename preset
   */
  renamePreset(key, newName) {
    const preset = this.presets.get(key);
    
    if (!preset) {
      throw new Error(`Preset not found: ${key}`);
    }
    
    if (preset.locked) {
      throw new Error(`Cannot rename locked preset: ${key}`);
    }
    
    if (!this.validatePresetName(newName)) {
      throw new Error(`Invalid preset name: ${newName}`);
    }
    
    // Generate new key
    const newKey = this.generatePresetKey(newName);
    
    // Check if new key would conflict
    if (newKey !== key && this.presets.has(newKey)) {
      throw new Error(`Preset with similar name already exists: ${newName}`);
    }
    
    // Update preset
    const updatedPreset = {
      ...preset,
      name: newName,
      modifiedAt: Date.now()
    };
    
    // If key changes, recreate entry
    if (newKey !== key) {
      this.presets.set(newKey, updatedPreset);
      this.presets.delete(key);
      
      // Update current preset key if needed
      if (this.currentPresetKey === key) {
        this.currentPresetKey = newKey;
      }
      
      // Add to history
      this.addToHistory({
        action: 'rename',
        oldKey: key,
        newKey: newKey,
        oldName: preset.name,
        newName: newName
      });
      
      // Save and notify
      this.saveToStorage();
      this.notifyListeners('rename', newKey, updatedPreset, { ...preset, key });
      
      return newKey;
    } else {
      // Just update name
      this.presets.set(key, updatedPreset);
      this.saveToStorage();
      this.notifyListeners('update', key, updatedPreset, preset);
      return key;
    }
  }
  
  /**
   * Duplicate preset
   */
  duplicatePreset(key, newName = null) {
    const preset = this.presets.get(key);
    
    if (!preset) {
      throw new Error(`Preset not found: ${key}`);
    }
    
    // Generate new name
    const baseName = newName || `${preset.name} Copy`;
    let finalName = baseName;
    let counter = 1;
    
    // Find unique name
    while (this.presets.has(this.generatePresetKey(finalName))) {
      finalName = `${baseName} ${counter}`;
      counter++;
    }
    
    // Create duplicate
    return this.createPreset(finalName, preset.data);
  }
  
  /**
   * Lock/unlock preset
   */
  setPresetLock(key, locked) {
    const preset = this.presets.get(key);
    
    if (!preset) {
      throw new Error(`Preset not found: ${key}`);
    }
    
    if (key === 'default') {
      throw new Error('Cannot unlock default preset');
    }
    
    // Update lock state
    preset.locked = !!locked;
    preset.modifiedAt = Date.now();
    
    // Update locked set
    if (locked) {
      this.lockedPresets.add(key);
    } else {
      this.lockedPresets.delete(key);
    }
    
    // Save to storage
    this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners('lock-change', key, locked);
    
    return preset;
  }
  
  /**
   * Export preset
   */
  exportPreset(key) {
    const preset = this.presets.get(key);
    
    if (!preset) {
      throw new Error(`Preset not found: ${key}`);
    }
    
    return {
      ...preset,
      exportDate: new Date().toISOString(),
      exportVersion: '1.0.0'
    };
  }
  
  /**
   * Import preset
   */
  importPreset(presetData, overwrite = false) {
    if (!presetData || !presetData.name) {
      throw new Error('Invalid preset data');
    }
    
    const key = this.generatePresetKey(presetData.name);
    
    // Check if already exists
    if (this.presets.has(key) && !overwrite) {
      throw new Error(`Preset already exists: ${presetData.name}`);
    }
    
    // Create preset structure
    const preset = {
      name: presetData.name,
      locked: false,
      version: presetData.version || '1.0.0',
      createdAt: presetData.createdAt || Date.now(),
      modifiedAt: Date.now(),
      metadata: presetData.metadata || {
        author: 'Imported',
        description: '',
        tags: ['imported']
      },
      data: presetData.data || presetData,
      importedAt: Date.now()
    };
    
    // Store preset
    this.presets.set(key, preset);
    
    // Add to history
    this.addToHistory({
      action: 'import',
      preset: key,
      data: preset
    });
    
    // Save to storage
    this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners('import', key, preset);
    
    return key;
  }
  
  /**
   * Get preset
   */
  getPreset(key) {
    return this.presets.get(key);
  }
  
  /**
   * Get all presets
   */
  getAllPresets() {
    const presets = {};
    this.presets.forEach((preset, key) => {
      presets[key] = { ...preset };
    });
    return presets;
  }
  
  /**
   * Get preset list for UI
   */
  getPresetList() {
    const list = [];
    this.presets.forEach((preset, key) => {
      list.push({
        key: key,
        name: preset.name,
        locked: preset.locked,
        modified: preset.modifiedAt,
        current: key === this.currentPresetKey
      });
    });
    return list.sort((a, b) => {
      // Default first, then alphabetical
      if (a.key === 'default') return -1;
      if (b.key === 'default') return 1;
      return a.name.localeCompare(b.name);
    });
  }
  
  /**
   * Reset to factory defaults
   */
  resetToFactoryDefaults() {
    // Recreate default preset with factory settings
    const defaultPreset = {
      name: this.DEFAULT_PRESET_NAME,
      locked: true,
      version: '1.0.0',
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      metadata: {
        author: 'OTTO',
        description: 'Factory default preset (reset)',
        tags: ['default', 'factory', 'reset']
      },
      data: this.createFactoryDefaultState()
    };
    
    // Store preset
    this.presets.set('default', defaultPreset);
    
    // Load it
    this.loadPreset('default');
    
    // Save to storage
    this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners('factory-reset', 'default', defaultPreset);
    
    return defaultPreset;
  }
  
  /**
   * Create factory default state
   */
  createFactoryDefaultState() {
    return {
      players: {
        currentPlayer: 1,
        activePlayerCount: 4, // Correctly set to 4, not 8
        players: {}
      },
      patternGroups: {
        current: 'favorites'
      },
      drumkits: {
        playerKits: {
          1: 'acoustic',
          2: 'acoustic',
          3: 'acoustic',
          4: 'acoustic'
        }
      },
      global: {
        tempo: 120,
        isPlaying: true,
        loopPosition: 0
      },
      timestamp: Date.now()
    };
  }
  
  /**
   * Undo last action
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const entry = this.history[this.historyIndex];
      
      // Apply previous state
      if (entry.previousState) {
        this.applyPresetData(entry.previousState);
      }
      
      // Notify listeners
      this.notifyListeners('undo', entry);
      
      return entry;
    }
    
    return null;
  }
  
  /**
   * Redo last undone action
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const entry = this.history[this.historyIndex];
      
      // Apply the state from this entry
      if (entry.newData) {
        this.applyPresetData(entry.newData);
      }
      
      // Notify listeners
      this.notifyListeners('redo', entry);
      
      return entry;
    }
    
    return null;
  }
  
  /**
   * Add to history
   */
  addToHistory(entry) {
    // Remove any entries after current index
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add new entry
    this.history.push({
      ...entry,
      timestamp: Date.now()
    });
    
    // Trim history if too long
    if (this.history.length > this.MAX_HISTORY_SIZE) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }
  
  /**
   * Validate preset name
   */
  validatePresetName(name) {
    if (!name || typeof name !== 'string') return false;
    if (name.length === 0 || name.length > this.MAX_PRESET_NAME_LENGTH) return false;
    
    // Check for valid characters
    const validPattern = /^[a-zA-Z0-9\s\-_()]+$/;
    return validPattern.test(name);
  }
  
  /**
   * Generate preset key
   */
  generatePresetKey(name) {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  }
  
  /**
   * Increment version
   */
  incrementVersion(version) {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || 0) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
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
          console.error(`Error in preset listener (${event}):`, error);
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
          console.error('Error in wildcard preset listener:', error);
        }
      });
    }
  }
  
  /**
   * Load from storage
   */
  async loadFromStorage() {
    if (!this.storageManager) return;
    
    try {
      const data = await this.storageManager.load('presets');
      if (data && data.presets) {
        Object.entries(data.presets).forEach(([key, preset]) => {
          // Don't overwrite default unless it's user-modified
          if (key === 'default' && !preset.userModified) {
            return;
          }
          
          this.presets.set(key, {
            ...preset,
            loadedAt: Date.now()
          });
        });
      }
      
      // Load current preset
      if (data && data.currentPresetKey && this.presets.has(data.currentPresetKey)) {
        this.currentPresetKey = data.currentPresetKey;
      }
      
      // Load locked presets
      if (data && data.lockedPresets) {
        this.lockedPresets = new Set(data.lockedPresets);
        // Ensure default is always locked
        this.lockedPresets.add('default');
      }
    } catch (error) {
      console.error('Error loading presets:', error);
    }
  }
  
  /**
   * Save to storage
   */
  async saveToStorage() {
    if (!this.storageManager) return;
    
    try {
      const data = {
        presets: {},
        currentPresetKey: this.currentPresetKey,
        lockedPresets: Array.from(this.lockedPresets),
        version: '1.0.0'
      };
      
      this.presets.forEach((preset, key) => {
        data.presets[key] = { ...preset };
      });
      
      await this.storageManager.save('presets', data);
    } catch (error) {
      console.error('Error saving presets:', error);
    }
  }
  
  /**
   * Get statistics
   */
  getStats() {
    return {
      presetCount: this.presets.size,
      lockedCount: this.lockedPresets.size,
      currentPreset: this.currentPresetKey,
      historySize: this.history.length,
      historyIndex: this.historyIndex
    };
  }
  
  /**
   * Destroy manager
   */
  destroy() {
    this.presets.clear();
    this.lockedPresets.clear();
    this.history = [];
    this.listeners.clear();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PresetManager;
}