class DrumMapUI {
  constructor(drumMapManager, sfzEditor, midiTranslator) {
    this.drumMapManager = drumMapManager;
    this.sfzEditor = sfzEditor;
    this.midiTranslator = midiTranslator;

    this.selectedNote = null;
    this.draggedElement = null;
    this.midiLearnActive = false;
    this.midiLearnTarget = null;

    this.initialized = false;
  }

  initialize() {
    console.log(
      "DrumMapUI.initialize() called, initialized:",
      this.initialized,
    );
    
    // Always refresh the UI when the panel opens
    console.log("Creating/refreshing UI structure...");
    this.createUIStructure();
    
    // Always re-attach event listeners since we recreated the DOM
    console.log("Attaching event listeners...");
    this.attachEventListeners();
    
    if (!this.initialized) {
      this.initialized = true;
    }
    
    console.log("Loading current map...");
    this.loadCurrentMap();
    console.log("DrumMapUI initialization/refresh complete");
  }

  createUIStructure() {
    const panel = document.getElementById("kit-edit-panel");
    console.log("createUIStructure - panel found:", !!panel);
    if (!panel) return;

    const panelBody = panel.querySelector(".panel-body");
    console.log("createUIStructure - panelBody found:", !!panelBody);
    console.log("createUIStructure - panelBody current content:", panelBody?.innerHTML?.substring(0, 100));
    if (!panelBody) return;

    // Clear placeholder content
    panelBody.innerHTML = "";
    console.log("createUIStructure - cleared panelBody");

    // Create main container
    const container = document.createElement("div");
    container.className = "drum-map-container";
    container.innerHTML = `
      <div class="drum-map-header">
        <div class="map-selector-group">
          <label>Drum Map:</label>
          <select id="drum-map-selector" class="drum-map-select">
            <option value="">Loading...</option>
          </select>
          <button id="new-map-btn" class="btn-icon" title="Create New Map">
            <i class="ph-thin ph-plus"></i>
          </button>
          <button id="duplicate-map-btn" class="btn-icon" title="Duplicate Current Map">
            <i class="ph-thin ph-copy"></i>
          </button>
          <button id="delete-map-btn" class="btn-icon" title="Delete Current Map">
            <i class="ph-thin ph-trash"></i>
          </button>
        </div>
        <div class="map-actions-group">
          <button id="import-map-btn" class="btn-secondary">Import Map</button>
          <button id="export-map-btn" class="btn-secondary">Export Map</button>
          <button id="midi-learn-btn" class="btn-secondary">MIDI Learn</button>
        </div>
      </div>

      <div class="drum-map-main">
        <!-- Left Panel: Note Grid -->
        <div class="note-grid-panel">
          <div class="panel-title">MIDI Note Assignment</div>
          <div class="note-grid-controls">
            <button id="grid-view-btn" class="view-btn active">Grid</button>
            <button id="list-view-btn" class="view-btn">List</button>
            <button id="piano-view-btn" class="view-btn">Piano</button>
          </div>
          <div id="note-grid-container" class="note-grid-container">
            <!-- Grid will be generated here -->
          </div>
          <div class="note-info-display">
            <span id="selected-note-info">No note selected</span>
          </div>
        </div>

        <!-- Center Panel: Mapping Connections -->
        <div class="mapping-panel">
          <div class="panel-title">Channel Assignment</div>
          <div class="mapping-canvas-container">
            <canvas id="mapping-canvas"></canvas>
            <div id="mapping-assignments" class="mapping-assignments">
              <!-- Current mappings will be displayed here -->
            </div>
          </div>
          <div class="sample-browser">
            <div class="browser-title">Sample Library</div>
            <div id="sample-list" class="sample-list">
              <!-- Sample files will be listed here -->
            </div>
          </div>
        </div>

        <!-- Right Panel: Mixer Channels -->
        <div class="mixer-channels-panel">
          <div class="panel-title">Mixer Channels</div>
          <div id="mixer-channels" class="mixer-channels">
            <!-- Channels will be generated here -->
          </div>
          <div class="channel-info">
            <div id="channel-stats" class="channel-stats">
              <!-- Channel statistics -->
            </div>
          </div>
        </div>
      </div>

      <div class="drum-map-footer">
        <div class="status-bar">
          <span id="map-status">Ready</span>
        </div>
        <div class="preview-controls">
          <button id="preview-note-btn" class="btn-primary">Preview Note</button>
          <input type="range" id="preview-velocity" min="0" max="127" value="100" />
          <span id="velocity-display">100</span>
        </div>
      </div>
    `;

    panelBody.appendChild(container);
    console.log("createUIStructure - container added to panelBody");

    // Generate UI elements
    console.log("createUIStructure - generating note grid...");
    this.generateNoteGrid();
    console.log("createUIStructure - generating mixer channels...");
    this.generateMixerChannels();
    console.log("createUIStructure - updating map selector...");
    this.updateMapSelector();
    console.log("createUIStructure - populating sample library...");
    this.populateSampleLibrary();
    console.log("createUIStructure - complete!");
  }

  generateNoteGrid() {
    const container = document.getElementById("note-grid-container");
    if (!container) return;

    // Create 128 note buttons (8x16 grid)
    const grid = document.createElement("div");
    grid.className = "note-grid";

    for (let note = 0; note < 128; note++) {
      const noteBtn = document.createElement("button");
      noteBtn.className = "note-btn";
      noteBtn.dataset.note = note;
      noteBtn.title = this.getNoteDisplay(note);
      noteBtn.draggable = true; // Make the button draggable

      // Add note number display
      const noteNum = document.createElement("span");
      noteNum.className = "note-number";
      noteNum.textContent = note;

      // Add note name display
      const noteName = document.createElement("span");
      noteName.className = "note-name";
      noteName.textContent = this.getNoteName(note);

      noteBtn.appendChild(noteNum);
      noteBtn.appendChild(noteName);

      // Color code based on current mapping
      this.updateNoteButtonStyle(noteBtn, note);

      grid.appendChild(noteBtn);
    }

    container.innerHTML = "";
    container.appendChild(grid);
  }

  generateMixerChannels() {
    const container = document.getElementById("mixer-channels");
    console.log("generateMixerChannels - container found:", !!container);
    if (!container) return;

    container.innerHTML = "";

    this.drumMapManager.standardChannels.forEach((channel) => {
      const channelDiv = document.createElement("div");
      channelDiv.className = "mixer-channel";
      channelDiv.dataset.channel = channel;

      const color = this.drumMapManager.channelColors[channel];
      const channelName = this.formatChannelName(channel);
      
      // Create a simple colored bar with text overlay
      channelDiv.style.cssText = `
        background: linear-gradient(90deg, ${color}cc, ${color}88);
        border: 2px solid ${color};
        border-radius: 6px;
        min-height: 40px;
        margin-bottom: 4px;
        position: relative;
        display: flex;
        align-items: center;
        padding: 0 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      `;

      // Add the channel name as white text directly
      const nameSpan = document.createElement("span");
      nameSpan.textContent = channelName;
      nameSpan.style.cssText = `
        color: white;
        font-weight: bold;
        font-size: 14px;
        text-shadow: 1px 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.5);
        text-transform: uppercase;
        letter-spacing: 1px;
        z-index: 10;
        pointer-events: none;
      `;
      
      // Add note count badge
      const countSpan = document.createElement("span");
      countSpan.className = "channel-note-count";
      countSpan.textContent = "0";
      countSpan.style.cssText = `
        position: absolute;
        right: 12px;
        background: rgba(0,0,0,0.5);
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 11px;
        pointer-events: none;
      `;
      
      channelDiv.appendChild(nameSpan);
      channelDiv.appendChild(countSpan);
      
      // Store the channel name for drag/drop
      channelDiv.dataset.channel = channel;

      container.appendChild(channelDiv);
      console.log(`Added channel ${channel}: ${channelName} with color ${color}`);
    });

    this.updateChannelDisplay();
  }

  attachEventListeners() {
    // Close button handler
    const closeBtn = document.getElementById("kit-edit-panel-close");
    if (closeBtn) {
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const panel = document.getElementById("kit-edit-panel");
        if (panel) {
          panel.classList.remove("active");
        }
      };
    }

    // Map selector
    const mapSelector = document.getElementById("drum-map-selector");
    if (mapSelector) {
      mapSelector.onchange = (e) => this.onMapSelected(e.target.value);
    }

    // Map action buttons
    const newMapBtn = document.getElementById("new-map-btn");
    if (newMapBtn) {
      newMapBtn.onclick = () => this.createNewMap();
    }

    const duplicateBtn = document.getElementById("duplicate-map-btn");
    if (duplicateBtn) {
      duplicateBtn.onclick = () => this.duplicateCurrentMap();
    }

    const deleteBtn = document.getElementById("delete-map-btn");
    if (deleteBtn) {
      deleteBtn.onclick = () => this.deleteCurrentMap();
    }

    const importBtn = document.getElementById("import-map-btn");
    if (importBtn) {
      importBtn.onclick = () => this.importMap();
    }

    const exportBtn = document.getElementById("export-map-btn");
    if (exportBtn) {
      exportBtn.onclick = () => this.exportMap();
    }

    const midiLearnBtn = document.getElementById("midi-learn-btn");
    if (midiLearnBtn) {
      midiLearnBtn.onclick = () => this.toggleMidiLearn();
    }

    // View mode buttons
    const gridViewBtn = document.getElementById("grid-view-btn");
    if (gridViewBtn) {
      gridViewBtn.onclick = () => this.setViewMode("grid");
    }

    const listViewBtn = document.getElementById("list-view-btn");
    if (listViewBtn) {
      listViewBtn.onclick = () => this.setViewMode("list");
    }

    const pianoViewBtn = document.getElementById("piano-view-btn");
    if (pianoViewBtn) {
      pianoViewBtn.onclick = () => this.setViewMode("piano");
    }

    // Note grid interactions - use event delegation for dynamically created elements
    const noteGrid = document.getElementById("note-grid-container");
    if (noteGrid) {
      // Click handler for note selection
      noteGrid.onclick = (e) => {
        const noteBtn = e.target.closest(".note-btn");
        if (noteBtn) {
          const noteNumber = parseInt(noteBtn.dataset.note);
          this.selectNote(noteNumber);
        }
      };

      // Drag and drop for notes
      noteGrid.ondragstart = (e) => {
        const noteBtn = e.target.closest(".note-btn");
        if (noteBtn) {
          this.draggedElement = {
            type: "note",
            note: parseInt(noteBtn.dataset.note),
          };
          e.dataTransfer.effectAllowed = "copy";
          e.dataTransfer.setData("text/plain", noteBtn.dataset.note);
          console.log("Dragging note:", this.draggedElement.note);
        }
      };

      noteGrid.ondragend = (e) => {
        this.draggedElement = null;
      };
    }

    // Mixer channel interactions
    const mixerChannels = document.getElementById("mixer-channels");
    if (mixerChannels) {
      // Allow drop on mixer channels
      mixerChannels.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        
        // Highlight the channel being hovered
        const channel = e.target.closest(".mixer-channel");
        if (channel) {
          channel.style.opacity = "0.8";
          channel.style.transform = "scale(1.02)";
        }
      };

      mixerChannels.ondragleave = (e) => {
        const channel = e.target.closest(".mixer-channel");
        if (channel) {
          channel.style.opacity = "1";
          channel.style.transform = "scale(1)";
        }
      };

      mixerChannels.ondrop = (e) => {
        e.preventDefault();
        const channel = e.target.closest(".mixer-channel");
        if (channel) {
          channel.style.opacity = "1";
          channel.style.transform = "scale(1)";
          
          if (this.draggedElement && this.draggedElement.type === "note") {
            const channelName = channel.dataset.channel;
            console.log("Dropping note", this.draggedElement.note, "on channel", channelName);
            this.assignNoteToChannel(this.draggedElement.note, channelName);
          }
        }
        this.draggedElement = null;
      };

      // Clear channel buttons
      mixerChannels.onclick = (e) => {
        if (e.target.classList.contains("clear-channel")) {
          this.clearChannel(e.target.dataset.channel);
        }
      };
    }

    // Preview controls
    const previewBtn = document.getElementById("preview-note-btn");
    if (previewBtn) {
      previewBtn.onclick = () => this.previewSelectedNote();
    }

    const velocitySlider = document.getElementById("preview-velocity");
    if (velocitySlider) {
      velocitySlider.oninput = (e) => {
        const display = document.getElementById("velocity-display");
        if (display) {
          display.textContent = e.target.value;
        }
      };
    }

    // Keyboard shortcuts
    this.attachKeyboardShortcuts();

    // Listen to drum map manager events (only if not already listening)
    if (!this.initialized) {
      this.drumMapManager.addListener((event, data) =>
        this.handleMapEvent(event, data),
      );
    }
  }

  attachButtonListener(id, handler) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener("click", handler);
    }
  }

  attachKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Only handle shortcuts when drum editor is open
      const panel = document.getElementById("kit-edit-panel");
      if (!panel || !panel.classList.contains("active")) return;

      // Prevent shortcuts when typing in input fields
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;

      // Handle shortcuts
      switch (true) {
        case key === " " && !ctrl:
          e.preventDefault();
          this.previewSelectedNote();
          break;

        case key === "1" && !ctrl:
          e.preventDefault();
          this.setViewMode("grid");
          break;

        case key === "2" && !ctrl:
          e.preventDefault();
          this.setViewMode("list");
          break;

        case key === "3" && !ctrl:
          e.preventDefault();
          this.setViewMode("piano");
          break;

        case key === "delete" && !ctrl:
          e.preventDefault();
          if (this.selectedNote !== null) {
            this.drumMapManager.removeNoteAssignment(this.selectedNote);
          }
          break;

        case key === "s" && ctrl:
          e.preventDefault();
          this.drumMapManager.saveCustomMaps();
          this.updateStatus("Map saved");
          break;

        case key === "d" && ctrl:
          e.preventDefault();
          this.duplicateCurrentMap();
          break;

        case key === "z" && ctrl:
          e.preventDefault();
          // Undo functionality would need to be implemented
          this.updateStatus("Undo not yet implemented");
          break;

        case key === "y" && ctrl:
          e.preventDefault();
          // Redo functionality would need to be implemented
          this.updateStatus("Redo not yet implemented");
          break;

        case key === "tab" && !ctrl:
          e.preventDefault();
          this.cyclePanel();
          break;

        case key === "escape":
          e.preventDefault();
          // Close the drum editor panel
          if (window.otto && window.otto.windowManager) {
            window.otto.windowManager.closeWindow("kit-edit");
          }
          break;

        case key === "a" && !ctrl:
          if (window.otto && window.otto.drumMapAdvanced) {
            if (window.otto.drumMapAdvanced.comparisonMode) {
              e.preventDefault();
              const active = window.otto.drumMapAdvanced.switchComparison();
              this.updateStatus(`Switched to Map ${active}`);
            }
          }
          break;

        case key === "b" && !ctrl:
          if (window.otto && window.otto.drumMapAdvanced) {
            if (window.otto.drumMapAdvanced.comparisonMode) {
              e.preventDefault();
              const active = window.otto.drumMapAdvanced.switchComparison();
              this.updateStatus(`Switched to Map ${active}`);
            }
          }
          break;

        case key === "m" && !ctrl:
          e.preventDefault();
          this.toggleMidiLearn();
          break;

        case key === "arrowup":
          e.preventDefault();
          this.selectAdjacentNote(-8); // Move up in grid
          break;

        case key === "arrowdown":
          e.preventDefault();
          this.selectAdjacentNote(8); // Move down in grid
          break;

        case key === "arrowleft":
          e.preventDefault();
          this.selectAdjacentNote(-1); // Move left in grid
          break;

        case key === "arrowright":
          e.preventDefault();
          this.selectAdjacentNote(1); // Move right in grid
          break;
      }
    });
  }

  cyclePanel() {
    // Cycle focus between the three panels
    const panels = ["note-grid-panel", "mapping-panel", "mixer-channels-panel"];
    const activeElement = document.activeElement;
    let currentPanel = null;

    // Find current panel
    panels.forEach((panelId) => {
      const panel = document.querySelector(`.${panelId}`);
      if (panel && panel.contains(activeElement)) {
        currentPanel = panelId;
      }
    });

    // Move to next panel
    const currentIndex = panels.indexOf(currentPanel);
    const nextIndex = (currentIndex + 1) % panels.length;
    const nextPanel = document.querySelector(`.${panels[nextIndex]}`);

    if (nextPanel) {
      const firstFocusable = nextPanel.querySelector("button, input, select");
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }
  }

  selectAdjacentNote(offset) {
    if (this.selectedNote === null) {
      this.selectNote(0);
      return;
    }

    const newNote = Math.max(0, Math.min(127, this.selectedNote + offset));
    this.selectNote(newNote);
  }

  updateMapSelector() {
    const selector = document.getElementById("drum-map-selector");
    if (!selector) return;

    const maps = this.drumMapManager.getAllMaps();
    const currentMap = this.drumMapManager.getCurrentMap();

    selector.innerHTML = "";

    // Add factory maps
    const factoryGroup = document.createElement("optgroup");
    factoryGroup.label = "Factory Presets";
    maps
      .filter((m) => m.type === "factory")
      .forEach((map) => {
        const option = document.createElement("option");
        option.value = `${map.type}:${map.id}`;
        option.textContent = `${map.name} (${map.vendor})`;
        if (
          currentMap &&
          currentMap.id === map.id &&
          currentMap.type === map.type
        ) {
          option.selected = true;
        }
        factoryGroup.appendChild(option);
      });
    selector.appendChild(factoryGroup);

    // Add custom maps
    const customMaps = maps.filter((m) => m.type === "custom");
    if (customMaps.length > 0) {
      const customGroup = document.createElement("optgroup");
      customGroup.label = "Custom Maps";
      customMaps.forEach((map) => {
        const option = document.createElement("option");
        option.value = `${map.type}:${map.id}`;
        option.textContent = map.name;
        if (
          currentMap &&
          currentMap.id === map.id &&
          currentMap.type === map.type
        ) {
          option.selected = true;
        }
        customGroup.appendChild(option);
      });
      selector.appendChild(customGroup);
    }
  }

  onMapSelected(value) {
    if (!value) return;

    const [type, id] = value.split(":");
    this.drumMapManager.setActiveMap(id, type);
    this.loadCurrentMap();
  }

  loadCurrentMap() {
    const map = this.drumMapManager.getCurrentMap();
    if (!map) return;

    // Update UI to reflect current map
    this.updateNoteGrid();
    this.updateChannelDisplay();
    this.drawMappingConnections(); // Update middle area visualization
    this.updateStatus(`Loaded: ${map.name}`);

    // Enable/disable edit controls based on map type
    const isEditable = map.type === "custom";
    this.setEditableState(isEditable);
  }

  updateNoteGrid() {
    const map = this.drumMapManager.getCurrentMap();
    if (!map) return;

    // Update each note button
    document.querySelectorAll(".note-btn").forEach((btn) => {
      const note = parseInt(btn.dataset.note);
      this.updateNoteButtonStyle(btn, note);
    });
  }

  updateNoteButtonStyle(btn, note) {
    const map = this.drumMapManager.getCurrentMap();
    if (!map || !map.mapping[note]) {
      btn.className = "note-btn";
      return;
    }

    const mapping = map.mapping[note];
    const channel = mapping.mixerChannel;
    const color = this.drumMapManager.channelColors[channel];

    btn.className = "note-btn mapped";
    btn.style.backgroundColor = color + "40";
    btn.style.borderColor = color;
  }

  updateChannelDisplay() {
    const map = this.drumMapManager.getCurrentMap();
    if (!map) return;

    // Clear all channel displays
    document.querySelectorAll(".channel-notes").forEach((container) => {
      container.innerHTML = "";
    });

    document.querySelectorAll(".channel-note-count").forEach((count) => {
      count.textContent = "0";
    });

    // Update each channel
    Object.entries(map.mixerChannels).forEach(([channel, data]) => {
      const container = document.querySelector(
        `.channel-notes[data-channel="${channel}"]`,
      );
      const countElement = document.querySelector(
        `.mixer-channel[data-channel="${channel}"] .channel-note-count`,
      );

      if (container && data.notes.length > 0) {
        data.notes.forEach((note) => {
          const noteTag = document.createElement("span");
          noteTag.className = "note-tag";
          noteTag.textContent = `${note} (${this.getNoteName(note)})`;
          noteTag.dataset.note = note;
          container.appendChild(noteTag);
        });
      }

      if (countElement) {
        countElement.textContent = data.notes.length;
      }
    });
  }

  populateSampleLibrary() {
    const sampleList = document.getElementById("sample-list");
    if (!sampleList) return;

    // For now, show a list of common drum samples
    const samples = [
      "kick.wav", "kick2.wav", "snare.wav", "snare2.wav",
      "hihat_closed.wav", "hihat_open.wav", "hihat_pedal.wav",
      "tom_high.wav", "tom_mid.wav", "tom_low.wav",
      "crash.wav", "crash2.wav", "ride.wav", "ride_bell.wav",
      "clap.wav", "cowbell.wav", "tambourine.wav", "splash.wav"
    ];

    sampleList.innerHTML = "";
    samples.forEach(sample => {
      const sampleItem = document.createElement("div");
      sampleItem.className = "sample-item";
      sampleItem.style.cssText = "padding: 5px 10px; cursor: pointer; color: var(--text-secondary); font-size: 12px; hover: background: var(--bg-secondary);";
      sampleItem.textContent = sample;
      sampleItem.onclick = () => {
        console.log("Selected sample:", sample);
        this.updateStatus(`Selected: ${sample}`);
      };
      sampleList.appendChild(sampleItem);
    });
  }

  drawMappingConnections() {
    const map = this.drumMapManager.getCurrentMap();
    if (!map) return;

    const mappingAssignments = document.getElementById("mapping-assignments");
    if (!mappingAssignments) return;

    // Clear existing connections display
    mappingAssignments.innerHTML = "";

    // Create a summary of all mappings
    const mappingSummary = document.createElement("div");
    mappingSummary.className = "mapping-summary";
    
    // Group mappings by channel
    Object.entries(map.mixerChannels).forEach(([channel, data]) => {
      if (data.notes.length > 0) {
        const channelGroup = document.createElement("div");
        channelGroup.className = "mapping-group";
        
        const channelHeader = document.createElement("div");
        channelHeader.className = "mapping-group-header";
        channelHeader.style.borderLeft = `4px solid ${this.drumMapManager.channelColors[channel]}`;
        channelHeader.innerHTML = `
          <strong>${this.formatChannelName(channel)}</strong>
          <span class="mapping-count">${data.notes.length} notes</span>
        `;
        
        const notesList = document.createElement("div");
        notesList.className = "mapping-notes-list";
        
        data.notes.forEach(note => {
          const noteItem = document.createElement("div");
          noteItem.className = "mapping-note-item";
          noteItem.innerHTML = `
            <span class="note-label">Note ${note}</span>
            <span class="note-name">${this.getNoteName(note)}</span>
          `;
          notesList.appendChild(noteItem);
        });
        
        channelGroup.appendChild(channelHeader);
        channelGroup.appendChild(notesList);
        mappingSummary.appendChild(channelGroup);
      }
    });

    if (mappingSummary.children.length === 0) {
      mappingSummary.innerHTML = '<div class="no-mappings">No mappings configured yet. Drag notes from the left panel to mixer channels on the right.</div>';
    }

    mappingAssignments.appendChild(mappingSummary);
  }

  selectNote(note) {
    // Deselect previous
    if (this.selectedNote !== null) {
      const prevBtn = document.querySelector(
        `.note-btn[data-note="${this.selectedNote}"]`,
      );
      if (prevBtn) prevBtn.classList.remove("selected");
    }

    // Select new
    this.selectedNote = note;
    const btn = document.querySelector(`.note-btn[data-note="${note}"]`);
    if (btn) btn.classList.add("selected");

    // Update info display
    const map = this.drumMapManager.getCurrentMap();
    const mapping = map && map.mapping[note];
    const info = mapping
      ? `Note ${note} (${this.getNoteDisplay(note)}) → ${mapping.mixerChannel} | ${mapping.samplePath || "No sample"}`
      : `Note ${note} (${this.getNoteDisplay(note)}) - Not mapped`;

    document.getElementById("selected-note-info").textContent = info;

    // Trigger MIDI learn if active
    if (this.midiLearnActive && this.midiLearnTarget) {
      this.learnMidiNote(note);
    }
  }

  assignNoteToChannel(note, channel) {
    const success = this.drumMapManager.assignNoteToChannel(note, channel);
    if (success) {
      this.updateNoteGrid();
      this.updateChannelDisplay();
      this.drawMappingConnections(); // Update middle area visualization
      this.updateStatus(`Assigned note ${note} to ${channel}`);
    }
  }

  clearChannel(channel) {
    const map = this.drumMapManager.getCurrentMap();
    if (!map || map.type !== "custom") return;

    const notes = map.mixerChannels[channel].notes.slice();
    notes.forEach((note) => {
      this.drumMapManager.removeNoteAssignment(note);
    });

    this.updateNoteGrid();
    this.updateChannelDisplay();
    this.drawMappingConnections(); // Update middle area visualization
    this.updateStatus(`Cleared channel: ${channel}`);
  }

  createNewMap() {
    const name = prompt("Enter name for new drum map:");
    if (!name) return;

    const id = this.drumMapManager.createCustomMap(name);
    if (id) {
      this.updateMapSelector();
      this.drumMapManager.setActiveMap(id, "custom");
      this.loadCurrentMap();
      this.updateStatus(`Created new map: ${name}`);
    }
  }

  duplicateCurrentMap() {
    const currentMap = this.drumMapManager.getCurrentMap();
    if (!currentMap) return;

    const name = prompt(
      "Enter name for duplicated map:",
      currentMap.name + " Copy",
    );
    if (!name) return;

    const id = this.drumMapManager.createCustomMap(name, currentMap.id);
    if (id) {
      this.updateMapSelector();
      this.drumMapManager.setActiveMap(id, "custom");
      this.loadCurrentMap();
      this.updateStatus(`Duplicated map: ${name}`);
    }
  }

  deleteCurrentMap() {
    const currentMap = this.drumMapManager.getCurrentMap();
    if (!currentMap || currentMap.type !== "custom") {
      alert("Cannot delete factory presets");
      return;
    }

    if (confirm(`Delete map "${currentMap.name}"?`)) {
      this.drumMapManager.deleteCustomMap(currentMap.id);
      this.updateMapSelector();
      this.loadCurrentMap();
      this.updateStatus("Map deleted");
    }
  }

  importMap() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const id = this.drumMapManager.importMap(event.target.result);
        if (id) {
          this.updateMapSelector();
          this.drumMapManager.setActiveMap(id, "custom");
          this.loadCurrentMap();
          this.updateStatus("Map imported successfully");
        } else {
          alert("Failed to import map");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  exportMap() {
    const currentMap = this.drumMapManager.getCurrentMap();
    if (!currentMap) return;

    const json = this.drumMapManager.exportMap(currentMap.id, currentMap.type);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${currentMap.name.replace(/[^a-z0-9]/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.updateStatus("Map exported");
  }

  toggleMidiLearn() {
    this.midiLearnActive = !this.midiLearnActive;
    const btn = document.getElementById("midi-learn-btn");
    if (btn) {
      btn.classList.toggle("active", this.midiLearnActive);
      btn.textContent = this.midiLearnActive
        ? "MIDI Learn (Active)"
        : "MIDI Learn";
    }
    this.updateStatus(
      this.midiLearnActive ? "MIDI Learn activated" : "MIDI Learn deactivated",
    );
  }

  learnMidiNote(note) {
    if (!this.midiLearnTarget) return;

    // Assign the learned note to the target
    if (this.midiLearnTarget.type === "channel") {
      this.assignNoteToChannel(note, this.midiLearnTarget.channel);
    }

    this.midiLearnTarget = null;
    this.toggleMidiLearn();
  }

  previewSelectedNote() {
    if (this.selectedNote === null) return;

    const velocity = parseInt(
      document.getElementById("preview-velocity").value,
    );

    // Trigger preview through audio system
    if (window.otto && window.otto.audioScheduler) {
      window.otto.audioScheduler.triggerDrumNote(this.selectedNote, velocity);
    }

    this.updateStatus(`Preview note ${this.selectedNote} vel ${velocity}`);
  }

  setViewMode(mode) {
    // Update button states
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.getElementById(`${mode}-view-btn`).classList.add("active");

    // Update grid display
    const container = document.getElementById("note-grid-container");
    if (!container) return;

    container.className = `note-grid-container ${mode}-view`;

    if (mode === "list") {
      this.generateListView();
    } else if (mode === "piano") {
      this.generatePianoView();
    } else {
      this.generateNoteGrid();
    }
  }

  generateListView() {
    const container = document.getElementById("note-grid-container");
    if (!container) return;

    const map = this.drumMapManager.getCurrentMap();
    const list = document.createElement("div");
    list.className = "note-list";

    // Only show mapped notes in list view
    if (map && map.mapping) {
      Object.entries(map.mapping).forEach(([note, data]) => {
        const item = document.createElement("div");
        item.className = "note-list-item";
        item.dataset.note = note;

        const color = this.drumMapManager.channelColors[data.mixerChannel];
        item.style.borderLeft = `4px solid ${color}`;

        item.innerHTML = `
          <span class="list-note-num">${note}</span>
          <span class="list-note-name">${this.getNoteDisplay(note)}</span>
          <span class="list-channel">${data.mixerChannel}</span>
          <span class="list-sample">${data.samplePath || "No sample"}</span>
        `;

        list.appendChild(item);
      });
    }

    container.innerHTML = "";
    container.appendChild(list);
  }

  generatePianoView() {
    const container = document.getElementById("note-grid-container");
    if (!container) return;

    const piano = document.createElement("div");
    piano.className = "piano-roll";

    // Generate piano keys for all octaves
    for (let octave = -1; octave < 10; octave++) {
      const octaveDiv = document.createElement("div");
      octaveDiv.className = "piano-octave";

      const notes = [
        "C",
        "C#",
        "D",
        "D#",
        "E",
        "F",
        "F#",
        "G",
        "G#",
        "A",
        "A#",
        "B",
      ];
      notes.forEach((noteName, index) => {
        const noteNum = (octave + 1) * 12 + index;
        if (noteNum >= 0 && noteNum < 128) {
          const key = document.createElement("button");
          key.className = noteName.includes("#")
            ? "piano-key black"
            : "piano-key white";
          key.dataset.note = noteNum;
          key.title = `${noteName}${octave} (${noteNum})`;

          this.updateNoteButtonStyle(key, noteNum);
          octaveDiv.appendChild(key);
        }
      });

      piano.appendChild(octaveDiv);
    }

    container.innerHTML = "";
    container.appendChild(piano);
  }

  getNoteDisplay(note) {
    const noteInfo = this.drumMapManager.getMidiNoteInfo(note);
    return `${noteInfo.name} (${note})`;
  }

  getNoteName(note) {
    const noteInfo = this.drumMapManager.getMidiNoteInfo(note);
    return noteInfo.name;
  }

  formatChannelName(channel) {
    // Convert camelCase to Title Case
    return channel
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  }

  setEditableState(editable) {
    const controls = ["delete-map-btn", "preview-note-btn", "midi-learn-btn"];

    controls.forEach((id) => {
      const element = document.getElementById(id);
      if (element) {
        element.disabled = !editable;
      }
    });

    // Update drag and drop
    document.querySelectorAll(".note-btn").forEach((btn) => {
      btn.draggable = editable;
    });
  }

  updateStatus(message) {
    const statusElement = document.getElementById("map-status");
    if (statusElement) {
      statusElement.textContent = message;
      // Clear status after 3 seconds
      setTimeout(() => {
        statusElement.textContent = "Ready";
      }, 3000);
    }
  }

  handleMapEvent(event, data) {
    switch (event) {
      case "mapChanged":
        this.loadCurrentMap();
        break;
      case "noteAssigned":
      case "noteRemoved":
        this.updateNoteGrid();
        this.updateChannelDisplay();
        break;
      case "mapCreated":
      case "mapDeleted":
        this.updateMapSelector();
        break;
    }
  }

  destroy() {
    this.initialized = false;
    this.selectedNote = null;
    this.draggedElement = null;
    this.midiLearnActive = false;
    this.midiLearnTarget = null;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = DrumMapUI;
}
