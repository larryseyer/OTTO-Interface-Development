class MixerComponent {
  constructor(otto) {
    this.otto = otto;
    this.currentKit = null;
    this.presetManager = null;
    this.soloChannels = new Set();
    this.channelElements = {};
    this.fxWindows = {};

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

    this.channelLabels = {
      kick: "Kick",
      snare: "Snare",
      sideStick: "Side Stick",
      hiHat: "Hi-Hat",
      tom1: "Tom 1",
      tom2: "Tom 2",
      tom3: "Tom 3",
      tom4: "Tom 4",
      tom5: "Tom 5",
      crash1: "Crash 1",
      crash2: "Crash 2",
      crash3: "Crash 3",
      ride: "Ride",
      bell: "Bell",
      splash: "Splash",
      room: "Room FX",
      reverb1: "Reverb 1",
      reverb2: "Reverb 2",
      delay: "Delay FX",
      master: "Master Out",
    };

    this.fxTypes = ["eq", "gate", "compressor", "saturation"];
    this.fxLabels = {
      eq: "EQ",
      gate: "Gate",
      compressor: "Comp",
      saturation: "Tape",
    };

    // Initialize synchronously so presetManager is available immediately
    this.initializePresetManager();

    // Initialize the volume slider with the current volume after DOM is ready
    // Use requestAnimationFrame to ensure DOM updates are complete
    requestAnimationFrame(() => {
      setTimeout(() => {
        this.initializeVolumeSlider();
      }, 50);
    });
  }
  initializeVolumeSlider() {
    if (this.otto && this.otto.playerStates && this.otto.currentPlayer) {
      const currentVolume = this.otto.playerStates[this.otto.currentPlayer]?.sliderValues?.volume || 75;
      console.log('Initializing volume slider with value:', currentVolume);
      this.updateMasterVolumeSlider(currentVolume);
    }
  }

  initializeVolumeSlider() {
    if (this.otto && this.otto.playerStates && this.otto.currentPlayer) {
      const currentVolume = this.otto.playerStates[this.otto.currentPlayer]?.sliderValues?.volume || 75;
      console.log('Initializing volume slider with value:', currentVolume);
      this.updateMasterVolumeSlider(currentVolume);
    }
  }

  initializePresetManager() {
    // Initialize preset manager synchronously
    if (this.otto.storageManager && this.otto.drumkitManager) {
      console.log("Initializing MixerPresetManager with:", {
        storageManager: !!this.otto.storageManager,
        drumkitManager: !!this.otto.drumkitManager,
      });

      this.presetManager = new MixerPresetManager(
        this.otto.storageManager,
        this.otto.drumkitManager,
      );

      // Initialize asynchronously but don't wait
      this.presetManager
        .initialize()
        .then(() => {
          console.log("MixerPresetManager initialized successfully");
          // Update dropdown after initialization
          if (document.querySelector("#mixer-preset-dropdown")) {
            this.updatePresetDropdown();
          }
        })
        .catch((error) => {
          console.error("Error initializing MixerPresetManager:", error);
        });

      // Listen for preset changes
      this.presetManager.addListener("*", (event, data) => {
        this.handlePresetEvent(event, data);
      });
    } else {
      console.warn(
        "Cannot initialize MixerPresetManager - missing dependencies:",
        {
          storageManager: !!this.otto.storageManager,
          drumkitManager: !!this.otto.drumkitManager,
        },
      );
    }
  }

  handlePresetEvent(event, data) {
    switch (event) {
      case "global-preset-selected":
      case "preset-mode-changed":
      case "channel-updated":
        // Reload the current mixer settings
        this.loadCurrentKitMixer();
        break;
      case "global-preset-created":
      case "global-preset-deleted":
      case "global-preset-updated":
        // Update preset dropdown if it exists
        this.updatePresetDropdown();
        break;
    }
  }

  createMixerUI() {
    const container = document.getElementById("mixer-container");
    if (!container) return;

    container.innerHTML = "";

    // Try to initialize preset manager again if it wasn't initialized yet
    if (
      !this.presetManager &&
      this.otto.storageManager &&
      this.otto.drumkitManager
    ) {
      console.log("Attempting to initialize presetManager in createMixerUI");
      this.initializePresetManager();
    }

    // Create preset controls at the top
    const presetControls = this.createPresetControls();
    container.appendChild(presetControls);

    // Create mixer channels
    const channelsWrapper = document.createElement("div");
    channelsWrapper.className = "mixer-channels-wrapper";

    this.channelNames.forEach((channelName) => {
      const channel = this.createChannelStrip(channelName);
      channelsWrapper.appendChild(channel);
      this.channelElements[channelName] = channel;
    });

    container.appendChild(channelsWrapper);
  }

  createPresetControls() {
    const container = document.createElement("div");
    container.className = "mixer-preset-controls";

    // Preset selector dropdown - made wider for longer names
    const presetSelector = document.createElement("div");
    presetSelector.className = "preset-selector";
    presetSelector.innerHTML = `
      <select class="preset-dropdown" id="mixer-preset-dropdown">
        <option value="">Select Preset...</option>
      </select>
    `;

    // Preset actions
    const presetActions = document.createElement("div");
    presetActions.className = "preset-actions";
    presetActions.innerHTML = `
      <button class="preset-btn" id="save-preset-btn" title="Save Preset">
        <span>📾 Save</span>
      </button>
      <button class="preset-btn" id="save-as-preset-btn" title="Save As...">
        <span>📾+ Save As</span>
      </button>
      <button class="preset-btn" id="rename-preset-btn" title="Rename Preset">
        <span>✏️ Rename</span>
      </button>
      <button class="preset-btn" id="delete-preset-btn" title="Delete Preset">
        <span>🗑️ Delete</span>
      </button>
      <button class="preset-btn" id="export-preset-btn" title="Export Preset">
        <span>📤 Export</span>
      </button>
      <button class="preset-btn" id="import-preset-btn" title="Import Preset">
        <span>📥 Import</span>
      </button>
    `;

    container.appendChild(presetSelector);
    container.appendChild(presetActions);

    // Attach preset control events
    this.attachPresetControlEvents(container);

    return container;
  }

  attachPresetControlEvents(container) {
    // Preset dropdown - now handles both global and kit presets
    const dropdown = container.querySelector("#mixer-preset-dropdown");
    dropdown.addEventListener("change", (e) => {
      if (e.target.value && this.presetManager) {
        const [type, id] = e.target.value.split(":");

        if (type === "global") {
          // Handle global preset selection
          this.presetManager.togglePresetMode(true); // Switch to global mode
          this.presetManager.setCurrentGlobalPreset(id);
          this.loadCurrentKitMixer();
        } else if (type === "kit" && this.currentKit) {
          // Handle kit preset selection
          this.presetManager.togglePresetMode(false); // Switch to kit mode
          const drumkitManager = this.otto.drumkitManager;
          const kit = drumkitManager.getDrumkit(this.currentKit);
          if (kit) {
            kit.selectedMixerPreset = id;
            drumkitManager.saveToStorage();
            this.loadCurrentKitMixer();
          }
        }
      }
    });

    // Save button
    container
      .querySelector("#save-preset-btn")
      .addEventListener("click", () => {
        this.saveCurrentPreset();
      });

    // Save As button
    container
      .querySelector("#save-as-preset-btn")
      .addEventListener("click", () => {
        this.saveAsNewPreset();
      });

    // Rename button
    container
      .querySelector("#rename-preset-btn")
      .addEventListener("click", () => {
        this.renameCurrentPreset();
      });

    // Delete button
    container
      .querySelector("#delete-preset-btn")
      .addEventListener("click", () => {
        this.deleteCurrentPreset();
      });

    // Export button
    container
      .querySelector("#export-preset-btn")
      .addEventListener("click", () => {
        this.exportCurrentPreset();
      });

    // Import button
    container
      .querySelector("#import-preset-btn")
      .addEventListener("click", () => {
        this.importPreset();
      });
  }

  updatePresetDropdown() {
    const dropdown = document.querySelector("#mixer-preset-dropdown");
    if (!dropdown || !this.presetManager) {
      console.log("Dropdown or presetManager not found");
      return;
    }

    dropdown.innerHTML = '<option value="">Select Preset...</option>';

    console.log("Updating unified preset dropdown");

    // Get all global presets
    const globalPresets = this.presetManager.getAllGlobalPresets();
    console.log("Global presets found:", globalPresets);

    // Add factory global presets (App Presets)
    const factoryPresets = globalPresets.filter((p) => p.isFactory);
    if (factoryPresets.length > 0) {
      const factoryGroup = document.createElement("optgroup");
      factoryGroup.label = "━━━ App Presets ━━━";
      factoryPresets.forEach((preset) => {
        const option = document.createElement("option");
        option.value = `global:${preset.id}`;
        option.textContent = preset.name;
        // Check if this is the selected preset
        if (
          this.presetManager.useGlobalPresets &&
          preset.id === this.presetManager.currentGlobalPreset
        ) {
          option.selected = true;
        }
        factoryGroup.appendChild(option);
      });
      dropdown.appendChild(factoryGroup);
    }

    // Add custom global presets (User Presets)
    const customGlobalPresets = globalPresets.filter((p) => !p.isFactory);
    if (customGlobalPresets.length > 0) {
      const customGroup = document.createElement("optgroup");
      customGroup.label = "━━━ User Presets ━━━";
      customGlobalPresets.forEach((preset) => {
        const option = document.createElement("option");
        option.value = `global:${preset.id}`;
        option.textContent = preset.name;
        // Check if this is the selected preset
        if (
          this.presetManager.useGlobalPresets &&
          preset.id === this.presetManager.currentGlobalPreset
        ) {
          option.selected = true;
        }
        customGroup.appendChild(option);
      });
      dropdown.appendChild(customGroup);
    }

    // Add kit-specific presets
    if (this.currentKit) {
      const kit = this.otto.drumkitManager?.getDrumkit(this.currentKit);
      console.log("Current kit:", this.currentKit, "Kit data:", kit);
      if (kit && kit.mixerPresets && Object.keys(kit.mixerPresets).length > 0) {
        const kitGroup = document.createElement("optgroup");
        kitGroup.label = `━━━ ${kit.name || this.currentKit} Kit Presets ━━━`;
        Object.keys(kit.mixerPresets).forEach((presetName) => {
          const option = document.createElement("option");
          option.value = `kit:${presetName}`;
          option.textContent = kit.mixerPresets[presetName].name || presetName;
          // Check if this is the selected preset
          if (
            !this.presetManager.useGlobalPresets &&
            presetName === kit.selectedMixerPreset
          ) {
            option.selected = true;
          }
          kitGroup.appendChild(option);
        });
        dropdown.appendChild(kitGroup);
      }
    }

    // If no preset is selected, check if we should auto-select one
    if (dropdown.value === "" && factoryPresets.length > 0) {
      // Default to the first factory preset if nothing is selected
      dropdown.value = `global:${factoryPresets[0].id}`;
    }
  }

  saveCurrentPreset() {
    if (!this.presetManager) return;

    if (this.presetManager.useGlobalPresets) {
      const currentPreset = this.presetManager.getCurrentPreset();
      if (currentPreset && !currentPreset.isFactory) {
        // Get current mixer state
        const mixerState = this.getCurrentMixerState();
        this.presetManager.updateGlobalPreset(currentPreset.id, {
          channels: mixerState,
        });
        alert("Preset saved successfully!");
      } else {
        alert("Cannot overwrite factory presets. Use Save As instead.");
      }
    } else {
      // Kit presets are automatically saved
      alert("Kit presets are automatically saved with the drumkit.");
    }
  }

  async saveAsNewPreset() {
    const name = prompt("Enter preset name:");
    if (!name) return;

    if (!this.presetManager) {
      console.error("No preset manager available");
      return;
    }

    // Ask user whether to save as User Preset (global) or Kit-specific preset
    let saveAsGlobal = true; // Default to User Preset

    if (this.currentKit) {
      const choice = confirm(
        "Save as User Preset (available for all kits)?\n\n" +
          "OK = User Preset (Global)\n" +
          "Cancel = Kit-specific Preset",
      );
      saveAsGlobal = choice;
    }

    const mixerState = this.getCurrentMixerState();
    console.log(
      "Saving preset:",
      name,
      "Type:",
      saveAsGlobal ? "global" : "kit",
    );

    if (saveAsGlobal) {
      // Save as global User Preset
      const newId = this.presetManager.createGlobalPreset(name);
      console.log("Created global preset with ID:", newId);
      this.presetManager.updateGlobalPreset(newId, { channels: mixerState });
      this.presetManager.setCurrentGlobalPreset(newId);
      // Force save to storage
      await this.presetManager.saveToStorage();
      console.log(
        "Global presets after save:",
        this.presetManager.getAllGlobalPresets(),
      );
    } else if (this.currentKit && this.otto.drumkitManager) {
      // Save as kit-specific preset
      const presetData = this.presetManager.createPresetData(name);
      presetData.channels = mixerState;
      // Create the preset and select it
      this.presetManager.createKitPreset(this.currentKit, name, presetData);
      // Select the new preset
      const kit = this.otto.drumkitManager.getDrumkit(this.currentKit);
      if (kit) {
        kit.selectedMixerPreset = name;
        await this.otto.drumkitManager.saveToStorage();
        console.log("Kit presets after save:", kit.mixerPresets);
      }
    }

    // Small delay to ensure storage is complete
    setTimeout(() => {
      this.updatePresetDropdown();
      alert('Preset saved as "' + name + '"');
    }, 100);
  }

  renameCurrentPreset() {
    if (!this.presetManager) return;

    if (this.presetManager.useGlobalPresets) {
      const currentPreset = this.presetManager.getCurrentPreset();
      if (!currentPreset) return;

      if (currentPreset.isFactory) {
        alert("Cannot rename factory presets.");
        return;
      }

      const newName = prompt("Enter new name:", currentPreset.name);
      if (newName) {
        this.presetManager.renameGlobalPreset(currentPreset.id, newName);
        this.updatePresetDropdown();
      }
    } else {
      // For kit presets
      if (this.currentKit && this.otto.drumkitManager) {
        const kit = this.otto.drumkitManager.getDrumkit(this.currentKit);
        if (kit && kit.selectedMixerPreset !== "default") {
          const currentPreset = kit.mixerPresets[kit.selectedMixerPreset];
          if (currentPreset) {
            const newName = prompt("Enter new name:", currentPreset.name);
            if (newName) {
              currentPreset.name = newName;
              this.otto.drumkitManager.saveToStorage();
              this.updatePresetDropdown();
            }
          }
        } else {
          alert("Cannot rename default preset.");
        }
      }
    }
  }

  deleteCurrentPreset() {
    if (!this.presetManager) return;

    if (this.presetManager.useGlobalPresets) {
      const currentPreset = this.presetManager.getCurrentPreset();
      if (!currentPreset) return;

      if (currentPreset.isFactory) {
        alert("Cannot delete factory presets.");
        return;
      }

      if (confirm('Delete preset "' + currentPreset.name + '"?')) {
        this.presetManager.deleteGlobalPreset(currentPreset.id);
        this.updatePresetDropdown();
      }
    } else {
      // For kit presets
      if (this.currentKit && this.otto.drumkitManager) {
        const kit = this.otto.drumkitManager.getDrumkit(this.currentKit);
        if (kit && kit.selectedMixerPreset !== "default") {
          if (confirm("Delete current kit preset?")) {
            this.otto.drumkitManager.deleteMixerPreset(
              this.currentKit,
              kit.selectedMixerPreset,
            );
            this.updatePresetDropdown();
            this.loadCurrentKitMixer();
          }
        } else {
          alert("Cannot delete default preset.");
        }
      }
    }
  }

  exportCurrentPreset() {
    if (!this.presetManager) {
      alert("Preset manager not initialized");
      return;
    }

    try {
      let preset;
      let filename;

      if (this.presetManager.useGlobalPresets) {
        const currentPreset = this.presetManager.getCurrentPreset();
        if (!currentPreset) {
          alert("No preset selected to export");
          return;
        }
        preset = this.presetManager.exportPreset(currentPreset.id, null);
        filename = `${currentPreset.name}_global_mixer_preset.json`;
      } else if (this.currentKit) {
        const kit = this.otto.drumkitManager?.getDrumkit(this.currentKit);
        if (!kit || !kit.selectedMixerPreset) {
          alert("No kit preset selected to export");
          return;
        }
        preset = this.presetManager.exportPreset(null, this.currentKit);
        filename = `${this.currentKit}_${kit.selectedMixerPreset}_mixer_preset.json`;
      } else {
        alert("No preset available to export");
        return;
      }

      // Create download link
      const dataStr = JSON.stringify(preset, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", filename);
      linkElement.click();

      console.log("Exported preset:", filename);
    } catch (error) {
      console.error("Error exporting preset:", error);
      alert("Error exporting preset: " + error.message);
    }
  }

  importPreset() {
    if (!this.presetManager) {
      alert("Preset manager not initialized");
      return;
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const presetData = JSON.parse(event.target.result);

          // Validate preset data
          if (!presetData.name || !presetData.channels) {
            throw new Error("Invalid preset file format");
          }

          // Ask user how to import
          const importMode = this.presetManager.useGlobalPresets
            ? "global"
            : "kit";
          const confirmMsg =
            importMode === "global"
              ? `Import "${presetData.name}" as a global preset?`
              : `Import "${presetData.name}" as a kit preset for ${this.currentKit}?`;

          if (!confirm(confirmMsg)) return;

          if (importMode === "global") {
            // Import as global preset
            const newId = await this.presetManager.importPreset(
              presetData,
              true,
            );
            await this.presetManager.saveToStorage();
            console.log("Imported global preset with ID:", newId);
          } else if (this.currentKit) {
            // Import as kit preset
            const uniqueName = presetData.name + "_imported_" + Date.now();
            await this.presetManager.createKitPreset(
              this.currentKit,
              uniqueName,
              presetData,
            );
            console.log("Imported kit preset:", uniqueName);
          }

          // Update dropdown
          setTimeout(() => {
            this.updatePresetDropdown();
            alert("Preset imported successfully!");
          }, 100);
        } catch (error) {
          console.error("Error importing preset:", error);
          alert("Error importing preset: " + error.message);
        }
      };

      reader.readAsText(file);
    };

    input.click();
  }

  getCurrentMixerState() {
    const state = {};

    this.channelNames.forEach((channel) => {
      const strip = this.channelElements[channel];
      if (!strip) return;

      state[channel] = {
        level: parseFloat(
          strip.querySelector(".fader-value")?.textContent || 75,
        ),
        pan: this.getPanValue(strip),
        mute:
          strip
            .querySelector(".channel-mute-btn")
            ?.classList.contains("active") || false,
        solo:
          strip
            .querySelector(".channel-solo-btn")
            ?.classList.contains("active") || false,
        sends: this.getSendValues(strip),
        fx: this.getFXStates(strip),
      };
    });

    return state;
  }

  getPanValue(strip) {
    const panValue = strip.querySelector(".pan-value")?.textContent;
    if (!panValue) return 0;
    if (panValue === "C") return 0;
    if (panValue.startsWith("L")) return -parseInt(panValue.slice(1));
    if (panValue.startsWith("R")) return parseInt(panValue.slice(1));
    return 0;
  }

  getSendValues(strip) {
    const sends = {};
    ["room", "reverb1", "reverb2", "delay"].forEach((send) => {
      const sendKnob = strip.querySelector(`.send-knob[data-send="${send}"]`);
      const sendValue = sendKnob?.parentElement.querySelector(".send-value");
      sends[send] = parseInt(sendValue?.textContent || 0);
    });
    return sends;
  }

  getFXStates(strip) {
    const fx = {};
    this.fxTypes.forEach((fxType) => {
      const fxBtn = strip.querySelector(`.fx-insert-btn[data-fx="${fxType}"]`);
      fx[fxType] = fxBtn?.classList.contains("active") || false;
    });
    return fx;
  }

  createChannelStrip(channelName) {
    const strip = document.createElement("div");
    strip.className = "mixer-channel-strip";
    strip.dataset.channel = channelName;

    // Channel label
    const label = document.createElement("div");
    label.className = "channel-label";
    label.textContent = this.channelLabels[channelName];
    strip.appendChild(label);

    // FX Insert buttons (not for FX channels)
    if (!["room", "reverb1", "reverb2", "delay"].includes(channelName)) {
      const fxSection = document.createElement("div");
      fxSection.className = "channel-fx-section";

      this.fxTypes.forEach((fxType) => {
        const fxBtn = document.createElement("button");
        fxBtn.className = "fx-insert-btn";
        fxBtn.dataset.fx = fxType;
        fxBtn.dataset.channel = channelName;
        fxBtn.textContent = this.fxLabels[fxType];
        fxBtn.title = `${this.fxLabels[fxType]} for ${this.channelLabels[channelName]}`;
        fxSection.appendChild(fxBtn);
      });

      strip.appendChild(fxSection);
    } else {
      // Add spacer for FX channels
      const spacer = document.createElement("div");
      spacer.className = "channel-fx-spacer";
      strip.appendChild(spacer);
    }

    // Send knobs (not for FX and master channels)
    if (
      !["room", "reverb1", "reverb2", "delay", "master"].includes(channelName)
    ) {
      const sendsSection = document.createElement("div");
      sendsSection.className = "channel-sends-section";

      ["room", "reverb1", "reverb2", "delay"].forEach((send, index) => {
        const sendControl = document.createElement("div");
        sendControl.className = "send-control";

        const sendLabel = document.createElement("span");
        sendLabel.className = "send-label";
        sendLabel.textContent = `S${index + 1}`;

        const sendKnob = document.createElement("div");
        sendKnob.className = "send-knob";
        sendKnob.dataset.send = send;
        sendKnob.dataset.channel = channelName;

        const sendValue = document.createElement("div");
        sendValue.className = "send-value";
        sendValue.textContent = "0";

        sendControl.appendChild(sendLabel);
        sendControl.appendChild(sendKnob);
        sendControl.appendChild(sendValue);
        sendsSection.appendChild(sendControl);
      });

      strip.appendChild(sendsSection);
    } else {
      // Add spacer for channels without sends
      const spacer = document.createElement("div");
      // Master channel needs different spacing than FX returns
      spacer.className =
        channelName === "master"
          ? "master-sends-spacer"
          : "channel-sends-spacer";
      strip.appendChild(spacer);
    }

    // Pan knob
    const panSection = document.createElement("div");
    panSection.className = "channel-pan-section";

    const panKnob = document.createElement("div");
    panKnob.className = "pan-knob";
    panKnob.dataset.channel = channelName;

    const panValue = document.createElement("div");
    panValue.className = "pan-value";
    panValue.textContent = "C";

    panSection.appendChild(panKnob);
    panSection.appendChild(panValue);
    strip.appendChild(panSection);

    // Solo/Mute buttons
    const buttonsSection = document.createElement("div");
    buttonsSection.className = "channel-buttons-section";

    const soloBtn = document.createElement("button");
    soloBtn.className = "channel-solo-btn";
    soloBtn.dataset.channel = channelName;
    soloBtn.textContent = "S";
    soloBtn.title = `Solo ${this.channelLabels[channelName]}`;

    const muteBtn = document.createElement("button");
    muteBtn.className = "channel-mute-btn";
    muteBtn.dataset.channel = channelName;
    muteBtn.textContent = "M";
    muteBtn.title = `Mute ${this.channelLabels[channelName]}`;

    buttonsSection.appendChild(soloBtn);
    buttonsSection.appendChild(muteBtn);
    strip.appendChild(buttonsSection);

    // Fader section
    const faderSection = document.createElement("div");
    faderSection.className = "channel-fader-section";

    const faderTrack = document.createElement("div");
    faderTrack.className = "fader-track";

    const faderThumb = document.createElement("div");
    faderThumb.className = "fader-thumb";
    faderThumb.dataset.channel = channelName;

    const faderValue = document.createElement("div");
    faderValue.className = "fader-value";
    faderValue.textContent = "0.0";

    // Bottom channel label (duplicate of top label)
    const bottomLabel = document.createElement("div");
    bottomLabel.className = "channel-bottom-label";
    bottomLabel.textContent = this.channelLabels[channelName];

    faderTrack.appendChild(faderThumb);
    faderSection.appendChild(faderTrack);
    faderSection.appendChild(faderValue);
    faderSection.appendChild(bottomLabel);
    strip.appendChild(faderSection);

    return strip;
  }

  attachEventListeners() {
    const container = document.getElementById("mixer-container");
    if (!container) return;

    // Fader controls
    container.querySelectorAll(".fader-thumb").forEach((fader) => {
      this.setupFaderControl(fader);
    });

    // Pan knobs
    container.querySelectorAll(".pan-knob").forEach((knob) => {
      this.setupKnobControl(knob, "pan", -100, 100);
    });

    // Send knobs
    container.querySelectorAll(".send-knob").forEach((knob) => {
      this.setupKnobControl(knob, "send", 0, 100);
    });

    // Solo buttons
    container.querySelectorAll(".channel-solo-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.toggleSolo(btn.dataset.channel));
    });

    // Mute buttons
    container.querySelectorAll(".channel-mute-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.toggleMute(btn.dataset.channel));
    });

    // FX insert buttons
    container.querySelectorAll(".fx-insert-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.toggleFX(btn.dataset.channel, btn.dataset.fx);
        this.openFXWindow(btn.dataset.channel, btn.dataset.fx);
      });
    });
  }

  setupFaderControl(fader) {
    const track = fader.parentElement;
    const valueDisplay = track.nextElementSibling;
    const channel = fader.dataset.channel;
    let isDragging = false;

    const updateFader = (e) => {
      if (!isDragging) return;

      const rect = track.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, rect.bottom - e.clientY));
      const value = (y / rect.height) * 100;

      fader.style.bottom = `${y - 10}px`;
      valueDisplay.textContent = value.toFixed(1);

      this.updateChannelLevel(channel, value);

      // Update master volume slider if this is the master channel
      if (channel === "master") {
        this.updateMasterVolumeSlider(value);
      }
    };

    fader.addEventListener("mousedown", (e) => {
      isDragging = true;
      e.preventDefault();
    });

    document.addEventListener("mousemove", updateFader);
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  setupKnobControl(knob, type, min, max) {
    const valueDisplay =
      knob.nextElementSibling ||
      knob.parentElement.querySelector(".send-value");
    const channel = knob.dataset.channel;
    const send = knob.dataset.send;
    let isDragging = false;
    let startY = 0;
    let startValue = 0;

    const updateKnob = (e) => {
      if (!isDragging) return;

      const deltaY = startY - e.clientY;
      const range = max - min;
      const value = Math.max(
        min,
        Math.min(max, startValue + (deltaY / 100) * range),
      );
      const rotation = ((value - min) / range) * 270 - 135;

      knob.style.transform = `rotate(${rotation}deg)`;

      if (type === "pan") {
        valueDisplay.textContent =
          value === 0 ? "C" : value < 0 ? `L${Math.abs(value)}` : `R${value}`;
        this.updateChannelPan(channel, value);
      } else if (type === "send") {
        valueDisplay.textContent = Math.round(value);
        this.updateChannelSend(channel, send, value);
      }
    };

    knob.addEventListener("mousedown", (e) => {
      isDragging = true;
      startY = e.clientY;
      startValue = type === "pan" ? 0 : 0; // Get current value from model
      e.preventDefault();
    });

    document.addEventListener("mousemove", updateKnob);
    document.addEventListener("mouseup", () => {
      isDragging = false;
    });
  }

  loadCurrentKitMixer() {
    // First ensure the UI is created
    const container = document.getElementById("mixer-container");
    if (!container) {
      console.error("Mixer container not found");
      return;
    }

    if (container.children.length === 0) {
      this.createMixerUI();
      this.attachEventListeners();
    }

    // Update preset dropdown
    this.updatePresetDropdown();

    const drumkitManager = this.otto.drumkitManager;
    if (!drumkitManager) {
      return;
    }

    // For now, use the current player's kit name
    const currentKitName =
      this.otto.playerStates?.[this.otto.currentPlayer]?.kitName || "Acoustic";
    this.currentKit = currentKitName;

    let mixerPreset = null;

    // Get preset based on current mode
    if (this.presetManager) {
      if (this.presetManager.useGlobalPresets) {
        // Use global preset
        mixerPreset = this.presetManager.getCurrentPreset();
      } else {
        // Use kit-specific preset
        mixerPreset = drumkitManager.getMixerPreset(currentKitName, null);

        if (!mixerPreset) {
          // Create default preset if none exists
          const defaultPreset =
            drumkitManager.createDefaultMixerPreset("default");
          if (defaultPreset) {
            drumkitManager.setMixerPreset(
              currentKitName,
              "default",
              defaultPreset,
            );
            mixerPreset = defaultPreset;
          }
        }
      }
    } else {
      // Fallback to drumkit manager
      mixerPreset = drumkitManager.getMixerPreset(currentKitName, "default");

      if (!mixerPreset) {
        // Create default preset if none exists
        const defaultPreset =
          drumkitManager.createDefaultMixerPreset("default");
        if (defaultPreset) {
          drumkitManager.setMixerPreset(
            currentKitName,
            "default",
            defaultPreset,
          );
          mixerPreset = defaultPreset;
        }
      }
    }

    if (mixerPreset && mixerPreset.channels) {
      this.updateMixerUI(mixerPreset.channels);
    }

    // Sync the mixer's master fader with the current volume slider value
    // They represent the same thing - the master output level
    if (this.otto && this.otto.playerStates && this.otto.currentPlayer) {
      const currentVolume = this.otto.playerStates[this.otto.currentPlayer]?.sliderValues?.volume || 75;

      // Update the master channel in the mixer to match the volume slider
      const masterStrip = this.channelElements["master"];
      if (masterStrip) {
        const fader = masterStrip.querySelector(".fader-thumb");
        const faderValue = masterStrip.querySelector(".fader-value");

        if (fader && faderValue) {
          const track = fader.parentElement;
          const y = (currentVolume / 100) * track.offsetHeight;
          fader.style.bottom = `${y - 10}px`;
          faderValue.textContent = currentVolume.toFixed(1);
        }
      }

      // Also ensure the volume slider visual is correct
      this.updateMasterVolumeSlider(currentVolume);
    }
  }

  updateMixerUI(channels) {
    Object.keys(channels).forEach((channelName) => {
      const channelData = channels[channelName];
      const strip = this.channelElements[channelName];
      if (!strip) return;

      // Update fader
      const fader = strip.querySelector(".fader-thumb");
      const faderValue = strip.querySelector(".fader-value");
      if (fader && faderValue) {
        const track = fader.parentElement;
        const y = (channelData.level / 100) * track.offsetHeight;
        fader.style.bottom = `${y - 10}px`;
        faderValue.textContent = channelData.level.toFixed(1);
      }

      // Update pan
      const panKnob = strip.querySelector(".pan-knob");
      const panValue = strip.querySelector(".pan-value");
      if (panKnob && panValue) {
        const rotation = ((channelData.pan + 100) / 200) * 270 - 135;
        panKnob.style.transform = `rotate(${rotation}deg)`;
        panValue.textContent =
          channelData.pan === 0
            ? "C"
            : channelData.pan < 0
              ? `L${Math.abs(channelData.pan)}`
              : `R${channelData.pan}`;
      }

      // Update sends
      if (channelData.sends) {
        Object.keys(channelData.sends).forEach((sendName) => {
          const sendKnob = strip.querySelector(
            `.send-knob[data-send="${sendName}"]`,
          );
          const sendValue =
            sendKnob?.parentElement.querySelector(".send-value");
          if (sendKnob && sendValue) {
            const rotation = (channelData.sends[sendName] / 100) * 270 - 135;
            sendKnob.style.transform = `rotate(${rotation}deg)`;
            sendValue.textContent = Math.round(channelData.sends[sendName]);
          }
        });
      }

      // Update mute/solo
      const muteBtn = strip.querySelector(".channel-mute-btn");
      const soloBtn = strip.querySelector(".channel-solo-btn");
      if (muteBtn) {
        muteBtn.classList.toggle("active", channelData.mute);
      }
      if (soloBtn) {
        soloBtn.classList.toggle("active", channelData.solo);
      }

      // Update FX buttons
      if (channelData.fx) {
        Object.keys(channelData.fx).forEach((fxType) => {
          const fxBtn = strip.querySelector(
            `.fx-insert-btn[data-fx="${fxType}"]`,
          );
          if (fxBtn) {
            fxBtn.classList.toggle("active", channelData.fx[fxType]);
          }
        });
      }
    });
  }

  updateChannelLevel(channel, value) {
    if (!this.currentKit) return;

    const drumkitManager = this.otto.drumkitManager;
    if (drumkitManager) {
      drumkitManager.updateChannelLevel(
        this.currentKit,
        "default",
        channel,
        value,
      );
    }
  }

  updateChannelPan(channel, value) {
    if (!this.currentKit) return;

    const drumkitManager = this.otto.drumkitManager;
    if (drumkitManager) {
      drumkitManager.updateChannelPanning(
        this.currentKit,
        "default",
        channel,
        value,
      );
    }
  }

  updateChannelSend(channel, send, value) {
    if (!this.currentKit) return;

    const drumkitManager = this.otto.drumkitManager;
    if (drumkitManager) {
      const preset = drumkitManager.getMixerPreset(this.currentKit, "default");
      if (preset && preset.channels && preset.channels[channel]) {
        preset.channels[channel].sends[send] = value;
        drumkitManager.setMixerPreset(this.currentKit, "default", preset);
      }
    }
  }

  toggleSolo(channel) {
    const strip = this.channelElements[channel];
    const soloBtn = strip?.querySelector(".channel-solo-btn");
    if (!soloBtn) return;

    const isActive = soloBtn.classList.toggle("active");

    if (isActive) {
      this.soloChannels.add(channel);
    } else {
      this.soloChannels.delete(channel);
    }

    // Update all mute states based on solo
    this.updateSoloMuteStates();
  }

  toggleMute(channel) {
    const strip = this.channelElements[channel];
    const muteBtn = strip?.querySelector(".channel-mute-btn");
    if (!muteBtn) return;

    const isActive = muteBtn.classList.toggle("active");

    if (this.currentKit) {
      const drumkitManager = this.otto.drumkitManager;
      if (drumkitManager) {
        const preset = drumkitManager.getMixerPreset(
          this.currentKit,
          "default",
        );
        if (preset && preset.channels && preset.channels[channel]) {
          preset.channels[channel].mute = isActive;
          drumkitManager.setMixerPreset(this.currentKit, "default", preset);
        }
      }
    }
  }

  toggleFX(channel, fxType) {
    if (!this.currentKit) return;

    const drumkitManager = this.otto.drumkitManager;
    if (drumkitManager) {
      const preset = drumkitManager.getMixerPreset(this.currentKit, "default");
      if (preset && preset.channels && preset.channels[channel]) {
        preset.channels[channel].fx[fxType] =
          !preset.channels[channel].fx[fxType];
        drumkitManager.setMixerPreset(this.currentKit, "default", preset);
      }
    }
  }

  openFXWindow(channel, fxType) {
    const windowId = `fx-${channel}-${fxType}`;

    // Create FX window if it doesn't exist
    if (!this.fxWindows[windowId]) {
      this.createFXWindow(channel, fxType, windowId);
    }

    // Toggle window visibility
    const fxWindow = document.getElementById(windowId);
    if (fxWindow) {
      fxWindow.classList.toggle("active");
    }
  }

  createFXWindow(channel, fxType, windowId) {
    const fxWindow = document.createElement("div");
    fxWindow.id = windowId;
    fxWindow.className = "fx-window";

    const header = document.createElement("div");
    header.className = "fx-window-header";
    header.innerHTML = `
      <h3>${this.fxLabels[fxType]} - ${this.channelLabels[channel]}</h3>
      <button class="fx-window-close" data-window="${windowId}">×</button>
    `;

    const body = document.createElement("div");
    body.className = "fx-window-body";
    body.innerHTML = this.getFXControls(fxType);

    fxWindow.appendChild(header);
    fxWindow.appendChild(body);
    document.body.appendChild(fxWindow);

    // Make window draggable
    this.makeDraggable(fxWindow, header);

    // Close button
    header.querySelector(".fx-window-close").addEventListener("click", () => {
      fxWindow.classList.remove("active");
    });

    this.fxWindows[windowId] = fxWindow;
  }

  getFXControls(fxType) {
    switch (fxType) {
      case "eq":
        return `
          <div class="fx-eq-controls">
            <div class="eq-band">
              <label>Low</label>
              <input type="range" class="eq-slider" min="-12" max="12" value="0">
              <span>0 dB</span>
            </div>
            <div class="eq-band">
              <label>Low Mid</label>
              <input type="range" class="eq-slider" min="-12" max="12" value="0">
              <span>0 dB</span>
            </div>
            <div class="eq-band">
              <label>High Mid</label>
              <input type="range" class="eq-slider" min="-12" max="12" value="0">
              <span>0 dB</span>
            </div>
            <div class="eq-band">
              <label>High</label>
              <input type="range" class="eq-slider" min="-12" max="12" value="0">
              <span>0 dB</span>
            </div>
          </div>
        `;
      case "gate":
        return `
          <div class="fx-gate-controls">
            <div class="fx-control">
              <label>Threshold</label>
              <input type="range" class="gate-slider" min="-60" max="0" value="-30">
              <span>-30 dB</span>
            </div>
            <div class="fx-control">
              <label>Attack</label>
              <input type="range" class="gate-slider" min="0" max="100" value="10">
              <span>10 ms</span>
            </div>
            <div class="fx-control">
              <label>Hold</label>
              <input type="range" class="gate-slider" min="0" max="500" value="50">
              <span>50 ms</span>
            </div>
            <div class="fx-control">
              <label>Release</label>
              <input type="range" class="gate-slider" min="0" max="1000" value="100">
              <span>100 ms</span>
            </div>
          </div>
        `;
      case "compressor":
        return `
          <div class="fx-comp-controls">
            <div class="fx-control">
              <label>Threshold</label>
              <input type="range" class="comp-slider" min="-40" max="0" value="-10">
              <span>-10 dB</span>
            </div>
            <div class="fx-control">
              <label>Ratio</label>
              <input type="range" class="comp-slider" min="1" max="20" value="4">
              <span>4:1</span>
            </div>
            <div class="fx-control">
              <label>Attack</label>
              <input type="range" class="comp-slider" min="0" max="100" value="10">
              <span>10 ms</span>
            </div>
            <div class="fx-control">
              <label>Release</label>
              <input type="range" class="comp-slider" min="0" max="1000" value="100">
              <span>100 ms</span>
            </div>
            <div class="fx-control">
              <label>Makeup Gain</label>
              <input type="range" class="comp-slider" min="0" max="20" value="0">
              <span>0 dB</span>
            </div>
          </div>
        `;
      case "saturation":
        return `
          <div class="fx-sat-controls">
            <div class="fx-control">
              <label>Drive</label>
              <input type="range" class="sat-slider" min="0" max="100" value="30">
              <span>30%</span>
            </div>
            <div class="fx-control">
              <label>Mix</label>
              <input type="range" class="sat-slider" min="0" max="100" value="50">
              <span>50%</span>
            </div>
            <div class="fx-control">
              <label>Tone</label>
              <input type="range" class="sat-slider" min="0" max="100" value="50">
              <span>50%</span>
            </div>
          </div>
        `;
      default:
        return "<p>FX controls coming soon...</p>";
    }
  }

  makeDraggable(element, handle) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    handle.addEventListener("mousedown", dragStart);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === handle || handle.contains(e.target)) {
        isDragging = true;
      }
    }

    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        element.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    }

    document.addEventListener("mousemove", drag);
    document.addEventListener("mouseup", dragEnd);
  }

  updateSoloMuteStates() {
    const hasSolo = this.soloChannels.size > 0;

    this.channelNames.forEach((channel) => {
      const strip = this.channelElements[channel];
      if (!strip) return;

      if (hasSolo && !this.soloChannels.has(channel)) {
        strip.classList.add("implicit-mute");
      } else {
        strip.classList.remove("implicit-mute");
      }
    });
  }

  updateMasterVolumeSlider(value) {
    // Simply update the volume slider to reflect the master channel value
    const volumeSlider = document.querySelector(
      '.row6-right-area5 .custom-slider[data-param="volume"]',
    );

    if (volumeSlider) {
      // Update the data attributes to keep them in sync
      volumeSlider.dataset.value = value;
      volumeSlider.currentValue = value;

      // Update the visual elements
      const fill = volumeSlider.querySelector(".slider-fill");
      const thumb = volumeSlider.querySelector(".slider-thumb");

      // Calculate percentage for positioning
      const min = parseInt(volumeSlider.dataset.min) || 0;
      const max = parseInt(volumeSlider.dataset.max) || 100;
      const percentage = ((value - min) / (max - min)) * 100;

      if (fill) {
        fill.style.height = `${percentage}%`;
      }

      if (thumb) {
        thumb.style.bottom = `${percentage}%`;
        // Keep the centering transform from CSS
        thumb.style.transform = 'translateX(-50%) translateY(50%)';
        // Ensure thumb is visible
        thumb.style.display = 'block';
        thumb.style.opacity = '1';
        thumb.style.visibility = 'visible';
      }

      // Update the player state to keep it in sync
      // This represents the master output level for the current player
      if (this.otto && this.otto.playerStates && this.otto.currentPlayer) {
        this.otto.playerStates[this.otto.currentPlayer].sliderValues.volume = value;
      }
    }
  }

  updateMixerMasterFromMainVolume(value) {
    // Update the mixer's master channel fader when main volume changes
    const masterStrip = this.channelElements["master"];
    if (!masterStrip) return;

    const fader = masterStrip.querySelector(".fader-thumb");
    const faderValue = masterStrip.querySelector(".fader-value");

    if (fader && faderValue) {
      const track = fader.parentElement;
      const y = (value / 100) * track.offsetHeight;
      fader.style.bottom = `${y - 10}px`;
      faderValue.textContent = value.toFixed(1);

      // Also update the model
      this.updateChannelLevel("master", value);
    }
  }

  onKitChange(newKit) {
    this.currentKit = newKit;
    this.loadCurrentKitMixer();
  }

  destroy() {
    // Clean up event listeners and FX windows
    Object.values(this.fxWindows).forEach((window) => {
      if (window && window.parentNode) {
        window.parentNode.removeChild(window);
      }
    });

    this.fxWindows = {};
    this.channelElements = {};
    this.soloChannels.clear();
  }
}

// Export for use in main script
if (typeof module !== "undefined" && module.exports) {
  module.exports = MixerComponent;
}
