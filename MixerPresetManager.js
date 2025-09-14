class MixerPresetManager {
  constructor(storageManager, drumkitManager) {
    this.storageManager = storageManager;
    this.drumkitManager = drumkitManager;
    this.globalPresets = new Map();
    this.currentGlobalPreset = null;
    this.listeners = new Map();

    // Track whether we're using global or kit-specific settings
    this.useGlobalPresets = false;

    // Default channel structure
    this.channelNames = [
      "kick",
      "snare",
      "sideStick",
      "hiHat",
      "tom1",
      "tom2",
      "tom3",
      "tom4",
      "tom5",
      "crash1",
      "crash2",
      "crash3",
      "ride",
      "bell",
      "splash",
      "room",
      "reverb1",
      "reverb2",
      "delay",
      "master",
    ];

    this.initialize();
  }

  async initialize() {
    // Load global presets from storage
    await this.loadFromStorage();

    // Create default global presets if none exist
    if (this.globalPresets.size === 0) {
      this.createDefaultGlobalPresets();
    }
  }

  createDefaultGlobalPresets() {
    // Create factory default global presets
    const defaultPresets = [
      { name: "Default", id: "global_default" },
      { name: "Live", id: "global_live" },
      { name: "Studio", id: "global_studio" },
      { name: "Punchy", id: "global_punchy" },
      { name: "Ambient", id: "global_ambient" },
    ];

    defaultPresets.forEach((preset) => {
      const presetData = this.createPresetData(preset.name);
      presetData.isFactory = true;
      presetData.id = preset.id;
      presetData.isGlobal = true;

      // Apply preset-specific settings
      switch (preset.id) {
        case "global_live":
          this.applyLiveSettings(presetData);
          break;
        case "global_studio":
          this.applyStudioSettings(presetData);
          break;
        case "global_punchy":
          this.applyPunchySettings(presetData);
          break;
        case "global_ambient":
          this.applyAmbientSettings(presetData);
          break;
      }

      this.globalPresets.set(preset.id, presetData);
    });

    // Set default as current
    this.currentGlobalPreset = "global_default";
  }

  createPresetData(name) {
    const channels = {};

    this.channelNames.forEach((channel) => {
      channels[channel] = {
        level: 75,
        pan: 0,
        mute: false,
        solo: false,
        sends: { room: 0, reverb1: 0, reverb2: 0, delay: 0 },
        fx: { eq: false, gate: false, compressor: false, saturation: false },
      };
    });

    return {
      name: name,
      channels: channels,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      isFactory: false,
      isGlobal: false,
    };
  }

  applyLiveSettings(preset) {
    // Live performance settings - more punch and presence
    preset.channels.kick.level = 85;
    preset.channels.kick.fx.compressor = true;
    preset.channels.kick.fx.gate = true;

    preset.channels.snare.level = 80;
    preset.channels.snare.sends.room = 30;
    preset.channels.snare.fx.compressor = true;

    preset.channels.hiHat.level = 60;
    preset.channels.crash1.level = 85;
    preset.channels.crash2.level = 85;
    preset.channels.ride.level = 70;

    preset.channels.room.level = 45;
    preset.channels.reverb1.level = 35;
    preset.channels.master.level = 90;
    preset.channels.master.fx.compressor = true;
  }

  applyStudioSettings(preset) {
    // Studio settings - balanced and clean
    preset.channels.kick.level = 72;
    preset.channels.kick.sends.room = 5;

    preset.channels.snare.level = 68;
    preset.channels.snare.sends.reverb1 = 15;
    preset.channels.snare.fx.saturation = true;

    preset.channels.hiHat.level = 58;
    preset.channels.hiHat.pan = -25;

    // Pan toms
    preset.channels.tom1.pan = -35;
    preset.channels.tom2.pan = -20;
    preset.channels.tom3.pan = 0;
    preset.channels.tom4.pan = 20;
    preset.channels.tom5.pan = 35;

    preset.channels.ride.pan = 45;
    preset.channels.room.level = 25;
    preset.channels.reverb1.level = 45;
    preset.channels.reverb2.level = 30;
    preset.channels.delay.level = 20;
    preset.channels.master.level = 80;
  }

  applyPunchySettings(preset) {
    // Punchy settings - aggressive compression and saturation
    preset.channels.kick.level = 90;
    preset.channels.kick.fx.compressor = true;
    preset.channels.kick.fx.gate = true;
    preset.channels.kick.fx.saturation = true;

    preset.channels.snare.level = 85;
    preset.channels.snare.fx.compressor = true;
    preset.channels.snare.fx.gate = true;
    preset.channels.snare.fx.saturation = true;
    preset.channels.snare.sends.room = 15;

    preset.channels.hiHat.level = 55;
    preset.channels.hiHat.fx.compressor = true;

    // Heavy processing on toms
    ["tom1", "tom2", "tom3", "tom4", "tom5"].forEach((tom) => {
      preset.channels[tom].level = 80;
      preset.channels[tom].fx.gate = true;
      preset.channels[tom].fx.compressor = true;
      preset.channels[tom].sends.room = 10;
    });

    preset.channels.room.level = 20;
    preset.channels.reverb1.level = 25;
    preset.channels.master.level = 88;
    preset.channels.master.fx.compressor = true;
    preset.channels.master.fx.saturation = true;
  }

  applyAmbientSettings(preset) {
    // Ambient settings - spacious and reverb-heavy
    preset.channels.kick.level = 65;
    preset.channels.kick.sends.reverb2 = 20;

    preset.channels.snare.level = 60;
    preset.channels.snare.sends.reverb1 = 30;
    preset.channels.snare.sends.reverb2 = 25;
    preset.channels.snare.sends.delay = 15;

    preset.channels.hiHat.level = 50;
    preset.channels.hiHat.sends.delay = 10;
    preset.channels.hiHat.pan = -30;

    // Soft toms with reverb
    ["tom1", "tom2", "tom3", "tom4", "tom5"].forEach((tom) => {
      preset.channels[tom].level = 65;
      preset.channels[tom].sends.reverb1 = 20;
      preset.channels[tom].sends.reverb2 = 15;
    });

    // Heavy reverb on cymbals
    preset.channels.crash1.sends.reverb2 = 35;
    preset.channels.crash1.sends.delay = 20;
    preset.channels.crash2.sends.reverb2 = 35;
    preset.channels.crash2.sends.delay = 20;
    preset.channels.ride.sends.reverb1 = 25;
    preset.channels.ride.sends.delay = 15;

    preset.channels.room.level = 50;
    preset.channels.reverb1.level = 55;
    preset.channels.reverb2.level = 60;
    preset.channels.delay.level = 45;
    preset.channels.master.level = 75;
  }

  // ========== GLOBAL PRESET METHODS ==========

  // Create a new global preset
  createGlobalPreset(name, basePresetId = null) {
    // Generate unique ID
    const id = "global_preset_" + Date.now();

    let presetData;
    if (basePresetId && this.globalPresets.has(basePresetId)) {
      // Clone existing preset
      const basePreset = this.globalPresets.get(basePresetId);
      presetData = JSON.parse(JSON.stringify(basePreset));
      presetData.name = name;
      presetData.isFactory = false;
      presetData.id = id;
      presetData.isGlobal = true;
      presetData.createdAt = Date.now();
      presetData.modifiedAt = Date.now();
    } else {
      // Create new preset from scratch
      presetData = this.createPresetData(name);
      presetData.id = id;
      presetData.isGlobal = true;
    }

    this.globalPresets.set(id, presetData);
    this.saveToStorage();
    this.notifyListeners("global-preset-created", { id, preset: presetData });

    return id;
  }

  // Update global preset
  updateGlobalPreset(id, updates) {
    const preset = this.globalPresets.get(id);
    if (!preset) {
      throw new Error(`Global preset not found: ${id}`);
    }

    // Don't allow modifying factory presets
    if (preset.isFactory) {
      throw new Error("Cannot modify factory presets");
    }

    // Apply updates
    if (updates.name !== undefined) {
      preset.name = updates.name;
    }
    if (updates.channels !== undefined) {
      preset.channels = updates.channels;
    }

    preset.modifiedAt = Date.now();

    this.saveToStorage();
    this.notifyListeners("global-preset-updated", { id, preset });

    return preset;
  }

  // Rename global preset
  renameGlobalPreset(id, newName) {
    return this.updateGlobalPreset(id, { name: newName });
  }

  // Delete global preset
  deleteGlobalPreset(id) {
    const preset = this.globalPresets.get(id);
    if (!preset) {
      throw new Error(`Global preset not found: ${id}`);
    }

    // Don't allow deleting factory presets
    if (preset.isFactory) {
      throw new Error("Cannot delete factory presets");
    }

    this.globalPresets.delete(id);

    // If this was the current preset, switch to default
    if (this.currentGlobalPreset === id) {
      this.currentGlobalPreset = "global_default";
    }

    this.saveToStorage();
    this.notifyListeners("global-preset-deleted", { id });

    return true;
  }

  // Get global preset
  getGlobalPreset(id) {
    return this.globalPresets.get(id);
  }

  // Get all global presets
  getAllGlobalPresets() {
    const presetList = [];
    this.globalPresets.forEach((preset, id) => {
      presetList.push({
        id: id,
        name: preset.name,
        isFactory: preset.isFactory,
        isGlobal: true,
        createdAt: preset.createdAt,
        modifiedAt: preset.modifiedAt,
      });
    });

    // Sort by factory first, then by name
    return presetList.sort((a, b) => {
      if (a.isFactory && !b.isFactory) return -1;
      if (!a.isFactory && b.isFactory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  // Set current global preset
  setCurrentGlobalPreset(id) {
    if (!this.globalPresets.has(id)) {
      throw new Error(`Global preset not found: ${id}`);
    }

    this.currentGlobalPreset = id;
    this.useGlobalPresets = true;
    this.saveToStorage();
    this.notifyListeners("global-preset-selected", {
      id,
      preset: this.globalPresets.get(id),
    });

    return this.globalPresets.get(id);
  }

  // ========== KIT-SPECIFIC PRESET METHODS ==========

  // Get kit-specific preset (delegates to DrumkitManager)
  getKitPreset(kitKey, presetName = null) {
    if (!this.drumkitManager) return null;
    return this.drumkitManager.getMixerPreset(kitKey, presetName);
  }

  // Set kit-specific preset (delegates to DrumkitManager)
  setKitPreset(kitKey, presetName, presetData) {
    if (!this.drumkitManager) return null;
    this.useGlobalPresets = false;
    return this.drumkitManager.setMixerPreset(kitKey, presetName, presetData);
  }

  // Create kit-specific preset
  createKitPreset(kitKey, presetName, basePresetData = null) {
    if (!this.drumkitManager) return null;

    // If basePresetData is a global preset ID, get its data
    if (
      typeof basePresetData === "string" &&
      this.globalPresets.has(basePresetData)
    ) {
      const globalPreset = this.globalPresets.get(basePresetData);
      basePresetData = JSON.parse(JSON.stringify(globalPreset));
      basePresetData.isGlobal = false;
      basePresetData.isFactory = false;
    }

    this.useGlobalPresets = false;
    return this.drumkitManager.createMixerPreset(
      kitKey,
      presetName,
      basePresetData,
    );
  }

  // Apply global preset to current kit
  applyGlobalPresetToKit(globalPresetId, kitKey) {
    const globalPreset = this.globalPresets.get(globalPresetId);
    if (!globalPreset) {
      throw new Error(`Global preset not found: ${globalPresetId}`);
    }

    // Create a copy of the global preset for the kit
    const kitPresetData = JSON.parse(JSON.stringify(globalPreset));
    kitPresetData.isGlobal = false;
    kitPresetData.isFactory = false;
    kitPresetData.name = globalPreset.name + " (Kit)";

    // Generate a unique name for the kit preset
    const presetName = globalPreset.name + "_" + Date.now();

    this.useGlobalPresets = false;
    return this.drumkitManager.setMixerPreset(
      kitKey,
      presetName,
      kitPresetData,
    );
  }

  // ========== UNIFIED METHODS ==========

  // Get current preset (either global or kit-specific)
  getCurrentPreset(kitKey = null) {
    if (this.useGlobalPresets) {
      return this.globalPresets.get(this.currentGlobalPreset);
    } else if (kitKey && this.drumkitManager) {
      return this.drumkitManager.getMixerPreset(kitKey);
    }
    return null;
  }

  // Toggle between global and kit presets
  togglePresetMode(useGlobal) {
    this.useGlobalPresets = useGlobal;
    this.saveToStorage();
    this.notifyListeners("preset-mode-changed", { useGlobal });
  }

  // Update channel in current preset
  updateChannel(channel, updates, kitKey = null) {
    if (this.useGlobalPresets) {
      // Update global preset
      const preset = this.globalPresets.get(this.currentGlobalPreset);
      if (!preset) return;

      // Don't modify factory presets directly
      if (preset.isFactory) {
        // Create a copy of the factory preset
        const newId = this.createGlobalPreset(
          preset.name + " (Modified)",
          preset.id,
        );
        this.setCurrentGlobalPreset(newId);
        return this.updateChannel(channel, updates, kitKey);
      }

      if (!preset.channels[channel]) {
        preset.channels[channel] = {};
      }

      Object.assign(preset.channels[channel], updates);
      preset.modifiedAt = Date.now();

      this.saveToStorage();
      this.notifyListeners("channel-updated", { channel, updates, preset });

      return preset.channels[channel];
    } else if (kitKey && this.drumkitManager) {
      // Update kit-specific preset
      const preset = this.drumkitManager.getMixerPreset(kitKey);
      if (!preset) return;

      if (!preset.channels[channel]) {
        preset.channels[channel] = {};
      }

      Object.assign(preset.channels[channel], updates);
      preset.modifiedAt = Date.now();

      this.drumkitManager.setMixerPreset(
        kitKey,
        preset.name || "default",
        preset,
      );
      this.notifyListeners("channel-updated", {
        channel,
        updates,
        preset,
        kitKey,
      });

      return preset.channels[channel];
    }

    return null;
  }

  // Export preset
  exportPreset(id = null, kitKey = null) {
    let preset;

    if (id && this.globalPresets.has(id)) {
      preset = this.globalPresets.get(id);
    } else if (kitKey && this.drumkitManager) {
      preset = this.drumkitManager.getMixerPreset(kitKey);
    } else {
      throw new Error("No preset specified for export");
    }

    if (!preset) {
      throw new Error("Preset not found");
    }

    return {
      ...preset,
      exportDate: new Date().toISOString(),
      version: "1.0.0",
    };
  }

  // Import preset
  importPreset(presetData, asGlobal = true) {
    if (!presetData || !presetData.name) {
      throw new Error("Invalid preset data");
    }

    if (asGlobal) {
      const id = "global_preset_" + Date.now();
      const preset = {
        ...presetData,
        id: id,
        isFactory: false,
        isGlobal: true,
        importedAt: Date.now(),
        modifiedAt: Date.now(),
      };

      this.globalPresets.set(id, preset);
      this.saveToStorage();
      this.notifyListeners("global-preset-imported", { id, preset });

      return id;
    } else {
      // Import as kit preset would be handled through DrumkitManager
      throw new Error(
        "Kit preset import should be done through DrumkitManager",
      );
    }
  }

  // Storage methods
  async loadFromStorage() {
    if (!this.storageManager) return;

    try {
      const data = await this.storageManager.load("mixerPresets");
      if (data) {
        if (data.globalPresets) {
          Object.entries(data.globalPresets).forEach(([id, preset]) => {
            this.globalPresets.set(id, preset);
          });
        }
        if (data.currentGlobalPreset) {
          this.currentGlobalPreset = data.currentGlobalPreset;
        }
        if (data.useGlobalPresets !== undefined) {
          this.useGlobalPresets = data.useGlobalPresets;
        }
      }
    } catch (error) {
      console.error("Error loading mixer presets:", error);
    }
  }

  async saveToStorage() {
    if (!this.storageManager) return;

    try {
      const data = {
        globalPresets: {},
        currentGlobalPreset: this.currentGlobalPreset,
        useGlobalPresets: this.useGlobalPresets,
        version: "1.0.0",
      };

      this.globalPresets.forEach((preset, id) => {
        data.globalPresets[id] = preset;
      });

      await this.storageManager.save("mixerPresets", data);
    } catch (error) {
      console.error("Error saving mixer presets:", error);
    }
  }

  // Event listeners
  addListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => this.removeListener(event, callback);
  }

  removeListener(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  notifyListeners(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in mixer preset listener (${event}):`, error);
        }
      });
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach((callback) => {
        try {
          callback(event, data);
        } catch (error) {
          console.error("Error in wildcard mixer preset listener:", error);
        }
      });
    }
  }

  // Get statistics
  getStats() {
    let globalFactoryCount = 0;
    let globalCustomCount = 0;

    this.globalPresets.forEach((preset) => {
      if (preset.isFactory) {
        globalFactoryCount++;
      } else {
        globalCustomCount++;
      }
    });

    return {
      globalTotal: this.globalPresets.size,
      globalFactory: globalFactoryCount,
      globalCustom: globalCustomCount,
      currentGlobalPreset: this.currentGlobalPreset,
      useGlobalPresets: this.useGlobalPresets,
      kitPresetStats: this.drumkitManager
        ? this.drumkitManager.getStats()
        : null,
    };
  }

  // Cleanup
  destroy() {
    this.globalPresets.clear();
    this.listeners.clear();
    this.currentGlobalPreset = null;
    this.useGlobalPresets = false;
  }
}
