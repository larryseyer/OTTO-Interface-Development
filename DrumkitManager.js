/**
 * DrumkitManager.js
 * Manages drumkits and their mixer presets
 * Phase 2 Implementation
 */

class DrumkitManager {
  constructor(storageManager) {
    this.storageManager = storageManager;

    // Drumkit configuration
    this.DEFAULT_MIXER_PRESET = "default";
    this.MAX_PRESET_NAME_LENGTH = 50;

    // Drumkit storage
    this.drumkits = new Map();

    // Current kit tracking per player
    this.playerKits = new Map();

    // Mixer channel definitions
    this.mixerChannels = [
      "kick",
      "snare",
      "hihat",
      "tom1",
      "tom2",
      "crash",
      "ride",
      "percussion",
      "room",
      "overhead",
    ];

    // Listeners
    this.listeners = new Map();

    // Initialize with defaults
    this.initialize();
  }

  /**
   * Initialize with default kits
   */
  initialize() {
    // Don't add any hardcoded kits - let them be loaded dynamically
    // Just load any saved custom settings from storage
    this.loadFromStorage();
  }

  /**
   * Create default mixer preset
   */
  createDefaultMixerPreset(name) {
    return {
      name: name,
      channels: {
        kick: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        snare: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        sideStick: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        hiHat: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        tom1: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        tom2: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        tom3: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        tom4: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        tom5: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        crash1: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        crash2: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        crash3: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        ride: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        bell: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        splash: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        room: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        reverb1: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        reverb2: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        delay: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
        master: {
          level: 75,
          pan: 0,
          mute: false,
          solo: false,
          sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
          fx: { eq: false, gate: false, compressor: false, saturation: false },
        },
      },
    };
  }

  /**
   * Create live mixer preset
   */
  createLiveMixerPreset(name) {
    const preset = this.createDefaultMixerPreset(name);

    // Adjust for live performance - more punch, presence, and room
    // preset.channels.kick.level = 75;
    // preset.channels.kick.fx.compressor = false;
    // preset.channels.kick.fx.gate = false;

    // preset.channels.snare.level = 80;
    // preset.channels.snare.sends.room = 30;
    // preset.channels.snare.fx.compressor = true;

    // preset.channels.hiHat.level = 60;
    // preset.channels.tom1.level = 75;
    // preset.channels.tom2.level = 75;
    // preset.channels.tom3.level = 75;
    // preset.channels.tom4.level = 75;
    // preset.channels.tom5.level = 75;

    // preset.channels.crash1.level = 85;
    // preset.channels.crash2.level = 85;
    // preset.channels.crash3.level = 85;
    // preset.channels.ride.level = 70;

    // preset.channels.room.level = 45;
    // preset.channels.reverb1.level = 35;
    // preset.channels.master.level = 90;
    // preset.channels.master.fx.compressor = true;

    return preset;
  }

  /**
   * Create studio mixer preset
   */
  createStudioMixerPreset(name) {
    const preset = this.createDefaultMixerPreset(name);

    // Studio settings - balanced, clean, with subtle effects
    // preset.channels.kick.level = 72;
    // preset.channels.kick.sends.room = 5;

    // preset.channels.snare.level = 68;
    // preset.channels.snare.sends.reverb1 = 15;
    // preset.channels.snare.fx.saturation = true;

    // preset.channels.hiHat.level = 58;
    // preset.channels.hiHat.pan = -25;

    // preset.channels.tom1.pan = -35;
    // preset.channels.tom2.pan = -20;
    // preset.channels.tom3.pan = 0;
    // preset.channels.tom4.pan = 20;
    // preset.channels.tom5.pan = 35;

    // preset.channels.crash1.level = 75;
    // preset.channels.crash2.level = 75;
    // preset.channels.ride.level = 70;
    // preset.channels.ride.pan = 45;

    // preset.channels.room.level = 25;
    // preset.channels.reverb1.level = 45;
    // preset.channels.reverb2.level = 30;
    // preset.channels.delay.level = 20;

    // preset.channels.master.level = 80;
    // preset.channels.master.fx.saturation = true;

    return preset;
  }

  /**
   * Create punchy mixer preset
   */
  createPunchyMixerPreset(name) {
    const preset = this.createDefaultMixerPreset(name);

    // Punchy settings - aggressive compression, gating, and saturation
    // preset.channels.kick.level = 90;
    // preset.channels.kick.fx.compressor = true;
    // preset.channels.kick.fx.gate = true;
    // preset.channels.kick.fx.saturation = true;
    // preset.channels.kick.sends.room = 5;

    // preset.channels.snare.level = 85;
    // preset.channels.snare.fx.compressor = true;
    // preset.channels.snare.fx.gate = true;
    // preset.channels.snare.fx.saturation = true;
    // preset.channels.snare.sends.room = 15;

    // preset.channels.hiHat.level = 55;
    // preset.channels.hiHat.fx.compressor = true;

    // // Toms with heavy processing
    // Object.keys(preset.channels).forEach(key => {
    //   if (key.startsWith('tom')) {
    //     preset.channels[key].level = 80;
    //     preset.channels[key].fx.gate = true;
    //     preset.channels[key].fx.compressor = true;
    //     preset.channels[key].sends.room = 10;
    //   }
    // });

    // preset.channels.room.level = 20;
    // preset.channels.reverb1.level = 25;
    // preset.channels.master.level = 88;
    // preset.channels.master.fx.compressor = true;
    // preset.channels.master.fx.saturation = true;

    return preset;
  }

  /**
   * Create ambient mixer preset
   */
  createAmbientMixerPreset(name) {
    const preset = this.createDefaultMixerPreset(name);

    // Ambient settings - spacious, reverb-heavy, soft dynamics
    // preset.channels.kick.level = 65;
    // preset.channels.kick.sends.reverb2 = 20;
    // preset.channels.kick.fx.compressor = false;

    // preset.channels.snare.level = 60;
    // preset.channels.snare.sends.reverb1 = 30;
    // preset.channels.snare.sends.reverb2 = 25;
    // preset.channels.snare.sends.delay = 15;
    // preset.channels.snare.fx.gate = false;

    // preset.channels.hiHat.level = 50;
    // preset.channels.hiHat.sends.delay = 10;
    // preset.channels.hiHat.pan = -30;

    // // Soft toms with lots of space
    // Object.keys(preset.channels).forEach(key => {
    //   if (key.startsWith('tom')) {
    //     preset.channels[key].level = 65;
    //     preset.channels[key].sends.reverb1 = 20;
    //     preset.channels[key].sends.reverb2 = 15;
    //     preset.channels[key].fx.gate = false;
    //   }
    // });

    // // Cymbals with heavy reverb and delay
    // preset.channels.crash1.sends.reverb2 = 35;
    // preset.channels.crash1.sends.delay = 20;
    // preset.channels.crash2.sends.reverb2 = 35;
    // preset.channels.crash2.sends.delay = 20;
    // preset.channels.ride.sends.reverb1 = 25;
    // preset.channels.ride.sends.delay = 15;

    // preset.channels.room.level = 50;
    // preset.channels.reverb1.level = 55;
    // preset.channels.reverb2.level = 60;
    // preset.channels.delay.level = 45;
    // preset.channels.master.level = 75;

    return preset;
  }

  /**
   * Get drumkit
   */
  getDrumkit(kitKey) {
    return this.drumkits.get(kitKey);
  }

  /**
   * Get all drumkits
   */
  getAllDrumkits() {
    const kits = {};
    this.drumkits.forEach((kit, key) => {
      kits[key] = { ...kit };
    });
    return kits;
  }

  /**
   * Get drumkit list for UI
   */
  getDrumkitList() {
    const list = [];
    this.drumkits.forEach((kit, key) => {
      list.push({
        key: key,
        name: kit.displayName || kit.name,
        category: kit.metadata?.category || "unknown",
      });
    });
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get mixer preset for a kit
   */
  getMixerPreset(kitKey, presetName = null) {
    const kit = this.drumkits.get(kitKey);
    if (!kit) return null;

    const presetKey = presetName || kit.selectedMixerPreset;
    return kit.mixerPresets[presetKey];
  }

  /**
   * Set mixer preset for a kit
   */
  setMixerPreset(kitKey, presetName, presetData) {
    // Create kit if it doesn't exist
    if (!this.drumkits.has(kitKey)) {
      // Create a new kit entry
      this.drumkits.set(kitKey, {
        key: kitKey,
        name: kitKey,
        category: "custom",
        player: 1,
        metadata: {
          addedAt: Date.now(),
          modifiedAt: Date.now(),
          source: "auto-created",
        },
        mixerPresets: {},
        selectedMixerPreset: presetName,
      });
    }

    const kit = this.drumkits.get(kitKey);

    // If presetData is provided, set/update the preset
    if (presetData) {
      kit.mixerPresets[presetName] = presetData;
      kit.selectedMixerPreset = presetName;
      kit.metadata.modifiedAt = Date.now();
    } else {
      // Just select existing preset
      if (!kit.mixerPresets[presetName]) {
        throw new Error(`Mixer preset not found: ${presetName}`);
      }
      kit.selectedMixerPreset = presetName;
    }

    this.saveToStorage();
    this.notifyListeners("mixer-preset-change", kitKey, presetName);

    return kit.mixerPresets[presetName];
  }

  /**
   * Create new mixer preset
   */
  createMixerPreset(kitKey, presetName, presetData = null) {
    const kit = this.drumkits.get(kitKey);
    if (!kit) {
      throw new Error(`Drumkit not found: ${kitKey}`);
    }

    if (kit.mixerPresets[presetName]) {
      throw new Error(`Mixer preset already exists: ${presetName}`);
    }

    // Create preset with defaults or provided data
    const preset = presetData || this.createDefaultMixerPreset(presetName);
    preset.name = presetName;
    preset.createdAt = Date.now();

    kit.mixerPresets[presetName] = preset;
    kit.metadata.modifiedAt = Date.now();

    this.saveToStorage();
    this.notifyListeners("mixer-preset-create", kitKey, preset);

    return preset;
  }

  /**
   * Update mixer preset
   */
  updateMixerPreset(kitKey, presetName, updates) {
    const kit = this.drumkits.get(kitKey);
    if (!kit) {
      throw new Error(`Drumkit not found: ${kitKey}`);
    }

    const preset = kit.mixerPresets[presetName];
    if (!preset) {
      throw new Error(`Mixer preset not found: ${presetName}`);
    }

    // Don't allow updating default preset
    if (presetName === "default" && kit.metadata.manufacturer === "OTTO") {
      throw new Error("Cannot modify default factory preset");
    }

    // Apply updates
    Object.assign(preset, updates);
    preset.modifiedAt = Date.now();
    kit.metadata.modifiedAt = Date.now();

    this.saveToStorage();
    this.notifyListeners("mixer-preset-update", kitKey, preset);

    return preset;
  }

  /**
   * Delete mixer preset
   */
  deleteMixerPreset(kitKey, presetName) {
    const kit = this.drumkits.get(kitKey);
    if (!kit) {
      throw new Error(`Drumkit not found: ${kitKey}`);
    }

    if (presetName === "default") {
      throw new Error("Cannot delete default preset");
    }

    if (!kit.mixerPresets[presetName]) {
      throw new Error(`Mixer preset not found: ${presetName}`);
    }

    // If this is the selected preset, switch to default
    if (kit.selectedMixerPreset === presetName) {
      kit.selectedMixerPreset = "default";
    }

    delete kit.mixerPresets[presetName];
    kit.metadata.modifiedAt = Date.now();

    this.saveToStorage();
    this.notifyListeners("mixer-preset-delete", kitKey, presetName);

    return true;
  }

  /**
   * Update mixer channel level
   */
  updateChannelLevel(kitKey, presetName, channel, level) {
    if (level < 0 || level > 100) {
      throw new Error(`Invalid level: ${level}`);
    }

    const kit = this.drumkits.get(kitKey);
    if (!kit) {
      throw new Error(`Drumkit not found: ${kitKey}`);
    }

    const preset = kit.mixerPresets[presetName];
    if (!preset) {
      throw new Error(`Mixer preset not found: ${presetName}`);
    }

    // Update to new structure
    if (!preset.channels) preset.channels = {};
    if (!preset.channels[channel]) preset.channels[channel] = {};
    preset.channels[channel].level = level;
    preset.modifiedAt = Date.now();

    this.saveToStorage();
    this.notifyListeners("channel-level-change", kitKey, {
      preset: presetName,
      channel,
      level,
    });

    return true;
  }

  /**
   * Update mixer channel panning
   */
  updateChannelPanning(kitKey, presetName, channel, pan) {
    if (pan < -100 || pan > 100) {
      throw new Error(`Invalid pan value: ${pan}`);
    }

    const kit = this.drumkits.get(kitKey);
    if (!kit) {
      throw new Error(`Drumkit not found: ${kitKey}`);
    }

    const preset = kit.mixerPresets[presetName];
    if (!preset) {
      throw new Error(`Mixer preset not found: ${presetName}`);
    }

    // Update to new structure
    if (!preset.channels) preset.channels = {};
    if (!preset.channels[channel]) preset.channels[channel] = {};
    preset.channels[channel].pan = pan;
    preset.modifiedAt = Date.now();

    this.saveToStorage();
    this.notifyListeners("channel-pan-change", kitKey, {
      preset: presetName,
      channel,
      pan,
    });

    return true;
  }

  /**
   * Set player kit assignment
   */
  setPlayerKit(playerNum, kitKey) {
    const kit = this.drumkits.get(kitKey);
    if (!kit) {
      throw new Error(`Drumkit not found: ${kitKey}`);
    }

    this.playerKits.set(playerNum, kitKey);
    this.notifyListeners("player-kit-change", playerNum, kitKey);

    return kit;
  }

  /**
   * Get player kit
   */
  getPlayerKit(playerNum) {
    const kitKey = this.playerKits.get(playerNum);
    return kitKey ? this.drumkits.get(kitKey) : null;
  }

  /**
   * Import drumkit
   */
  importDrumkit(kitData) {
    if (!kitData || !kitData.name) {
      throw new Error("Invalid drumkit data");
    }

    const key = this.generateKitKey(kitData.name);

    // Check if already exists
    if (this.drumkits.has(key)) {
      throw new Error(`Drumkit already exists: ${kitData.name}`);
    }

    // Create kit structure
    const kit = {
      name: kitData.name,
      displayName: kitData.displayName || kitData.name,
      description: kitData.description || "",
      selectedMixerPreset: kitData.selectedMixerPreset || "default",
      mixerPresets: kitData.mixerPresets || {
        default: this.createDefaultMixerPreset(`${kitData.name} Default`),
      },
      metadata: {
        ...kitData.metadata,
        importedAt: Date.now(),
        modifiedAt: Date.now(),
      },
    };

    this.drumkits.set(key, kit);
    this.saveToStorage();
    this.notifyListeners("kit-import", key, kit);

    return key;
  }

  /**
   * Export drumkit
   */
  exportDrumkit(kitKey) {
    const kit = this.drumkits.get(kitKey);
    if (!kit) {
      throw new Error(`Drumkit not found: ${kitKey}`);
    }

    return {
      ...kit,
      exportDate: new Date().toISOString(),
      version: "1.0.0",
    };
  }

  /**
   * Generate kit key from name
   */
  generateKitKey(name) {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
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
      eventListeners.forEach((listener) => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in drumkit listener (${event}):`, error);
        }
      });
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => {
        try {
          listener(event, ...args);
        } catch (error) {
          console.error("Error in wildcard drumkit listener:", error);
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
      const data = await this.storageManager.load("drumkits");
      if (data && data.kits) {
        Object.entries(data.kits).forEach(([key, kit]) => {
          // Don't overwrite factory defaults unless modified
          if (
            this.drumkits.has(key) &&
            kit.metadata?.manufacturer === "OTTO" &&
            !kit.metadata?.userModified
          ) {
            return;
          }

          this.drumkits.set(key, {
            ...kit,
            metadata: {
              ...kit.metadata,
              loadedAt: Date.now(),
            },
          });
        });
      }

      // Load player assignments
      if (data && data.playerKits) {
        Object.entries(data.playerKits).forEach(([player, kitKey]) => {
          this.playerKits.set(parseInt(player), kitKey);
        });
      }
    } catch (error) {
      console.error("Error loading drumkits:", error);
    }
  }

  /**
   * Save to storage
   */
  async saveToStorage() {
    if (!this.storageManager) return;

    try {
      const data = {
        kits: {},
        playerKits: {},
        version: "1.0.0",
      };

      this.drumkits.forEach((kit, key) => {
        data.kits[key] = { ...kit };
      });

      this.playerKits.forEach((kitKey, player) => {
        data.playerKits[player] = kitKey;
      });

      await this.storageManager.save("drumkits", data);
    } catch (error) {
      console.error("Error saving drumkits:", error);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalPresets = 0;
    let customPresets = 0;

    this.drumkits.forEach((kit) => {
      const presetCount = Object.keys(kit.mixerPresets).length;
      totalPresets += presetCount;
      customPresets += presetCount - 1; // Subtract default preset
    });

    return {
      kitCount: this.drumkits.size,
      totalPresets,
      customPresets,
      playerAssignments: this.playerKits.size,
      categories: this.getCategoryStats(),
    };
  }

  /**
   * Get category statistics
   */
  getCategoryStats() {
    const categories = {};

    this.drumkits.forEach((kit) => {
      const category = kit.metadata?.category || "unknown";
      categories[category] = (categories[category] || 0) + 1;
    });

    return categories;
  }

  /**
   * Destroy manager
   */
  destroy() {
    this.drumkits.clear();
    this.playerKits.clear();
    this.listeners.clear();
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = DrumkitManager;
}
