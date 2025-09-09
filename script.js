/**
 * OTTO - Organic Timing Trigger Orchestrator
 * Accurate Web Interface JavaScript (6-Row Layout)
 * (c) Automagic Art Inc.
 * Larry Seyer - https://LarrySeyer.com
 *
 * Based on actual HISE interface screenshot with correct 6-row structure
 */

class OTTOAccurateInterface {
    constructor() {
        this.version = '1.0.0';  // Dynamic version number
        this.maxPlayers = 8;  // Maximum possible players
        this.numberOfPlayers = 4;  // Default active players (configurable 4-8)
        this.currentPlayer = 1;
        this.splashScreenLength = 1000; // 1 second like original
        this.tempo = 120;
        this.loopPosition = 0;
        this.animationFrame = null;
        this.tapTimes = [];
        this.maxTapTimes = 4;
        this.isPlaying = true;  // Start in playing state to show pause icon
        this.currentPreset = 'default';  // Track current preset

        // Player state tracking for all possible players
        this.playerStates = {};
        for (let i = 1; i <= this.maxPlayers; i++) {
            this.playerStates[i] = {
                presetName: 'Default',
                kitName: 'Acoustic',
                selectedPattern: null,
                kitMixerActive: false,
                muted: false,  // Track mute state
                toggleStates: {
                    auto: i === 1, // Only player 1 starts with Auto active
                    manual: false,
                    stick: false,
                    ride: false,
                    lock: false
                },
                fillStates: {
                    4: false,
                    8: false,
                    16: false,
                    32: false,
                    solo: false
                },
                sliderValues: {
                    swing: 25,
                    energy: 50,
                    volume: 75
                },
                miniSliders: {
                    1: 50,
                    2: 30,
                    3: 80
                }
            };
        }

        this.init();
    }
    initPresetSystem() {
        // Initialize preset storage
        this.presets = this.loadPresetsFromStorage() || {
            'default': this.createPresetFromCurrentState('Default'),
            'rock-ballad': this.createPresetFromCurrentState('Rock Ballad'),
            'jazz-combo': this.createPresetFromCurrentState('Jazz Combo'),
            'funk-groove': this.createPresetFromCurrentState('Funk Groove'),
            'latin-rhythm': this.createPresetFromCurrentState('Latin Rhythm'),
            'electronic-pulse': this.createPresetFromCurrentState('Electronic Pulse'),
            'acoustic-folk': this.createPresetFromCurrentState('Acoustic Folk'),
            'blues-shuffle': this.createPresetFromCurrentState('Blues Shuffle'),
            'pop-modern': this.createPresetFromCurrentState('Pop Modern'),
            'world-fusion': this.createPresetFromCurrentState('World Fusion')
        };
        
        // Initialize preset lock states (default all unlocked)
        this.presetLocks = this.loadPresetLocksFromStorage() || {};
        
        // Setup auto-save functionality
        this.setupAutoSave();
        
        // Setup preset management UI
        this.setupPresetManagement();
    }

    initAppState() {
        // Load saved app state or create default
        const savedState = this.loadAppStateFromStorage();
        
        if (savedState) {
            // Restore saved application state
            this.currentPreset = savedState.currentPreset || 'default';
            this.isPlaying = savedState.isPlaying !== undefined ? savedState.isPlaying : true;
            this.tempo = savedState.tempo || 120;
            this.currentPlayer = savedState.currentPlayer || 1;
            this.numberOfPlayers = savedState.numberOfPlayers || 4;
            this.loopPosition = savedState.loopPosition || 0;
            
            console.log('Restored app state:', {
                preset: this.currentPreset,
                playing: this.isPlaying,
                tempo: this.tempo,
                player: this.currentPlayer,
                numPlayers: this.numberOfPlayers
            });
        }
        
        // Setup auto-save for app state
        this.setupAppStateAutoSave();
    }

    setupAppStateAutoSave() {
        // Save app state on key changes
        this.appStateAutoSaveTimer = null;
        this.appStateAutoSaveDelay = 1000; // 1 second delay
    }

    triggerAppStateSave() {
        // Clear existing timer
        if (this.appStateAutoSaveTimer) {
            clearTimeout(this.appStateAutoSaveTimer);
        }
        
        // Set new timer
        this.appStateAutoSaveTimer = setTimeout(() => {
            this.saveAppStateToStorage();
            console.log('Auto-saved app state');
        }, this.appStateAutoSaveDelay);
    }

    saveAppStateToStorage() {
        const appState = {
            currentPreset: this.currentPreset,
            isPlaying: this.isPlaying,
            tempo: this.tempo,
            currentPlayer: this.currentPlayer,
            numberOfPlayers: this.numberOfPlayers,
            loopPosition: this.loopPosition,
            timestamp: Date.now(),
            version: this.version
        };
        
        try {
            localStorage.setItem('otto_app_state', JSON.stringify(appState));
        } catch (e) {
            console.error('Failed to save app state:', e);
        }
    }

    loadAppStateFromStorage() {
        try {
            const stored = localStorage.getItem('otto_app_state');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load app state:', e);
        }
        return null;
    }

    createPresetFromCurrentState(name) {
        return {
            name: name,
            timestamp: Date.now(),
            // Store complete state of all players
            playerStates: JSON.parse(JSON.stringify(this.playerStates)),
            // Store link states
            linkStates: this.linkStates ? JSON.parse(JSON.stringify(this.linkStates)) : null,
            // Store global settings
            tempo: this.tempo,
            numberOfPlayers: this.numberOfPlayers,
            loopPosition: this.loopPosition
        };
    }

    setupAutoSave() {
        // Debounce timer for auto-save
        this.autoSaveTimer = null;
        this.autoSaveDelay = 500; // 500ms delay
        
        // Track if we should auto-save
        this.enableAutoSave = true;
    }

    triggerAutoSave() {
        // Don't auto-save if current preset is locked or auto-save is disabled
        if (!this.enableAutoSave || this.isPresetLocked(this.currentPreset)) {
            return;
        }
        
        // Clear existing timer
        if (this.autoSaveTimer) {
            clearTimeout(this.autoSaveTimer);
        }
        
        // Set new timer
        this.autoSaveTimer = setTimeout(() => {
            this.savePreset();
            console.log(`Auto-saved preset: ${this.currentPreset}`);
        }, this.autoSaveDelay);
    }

    isPresetLocked(presetKey) {
        return this.presetLocks[presetKey] === true;
    }
    
    presetExists(name) {
        const key = name.toLowerCase().replace(/\s+/g, '-');
        return this.presets.hasOwnProperty(key);
    }

    togglePresetLock(presetKey) {
        this.presetLocks[presetKey] = !this.presetLocks[presetKey];
        this.savePresetLocksToStorage();
        this.updatePresetLockDisplay();
        this.refreshPresetList();
        
        const isLocked = this.presetLocks[presetKey];
        const presetName = this.presets[presetKey]?.name || presetKey;
        this.showNotification(`Preset "${presetName}" ${isLocked ? 'locked' : 'unlocked'}`);
    }

    savePresetLocksToStorage() {
        try {
            localStorage.setItem('otto_preset_locks', JSON.stringify(this.presetLocks));
        } catch (e) {
            console.error('Failed to save preset locks:', e);
        }
    }

    loadPresetLocksFromStorage() {
        try {
            const stored = localStorage.getItem('otto_preset_locks');
            return stored ? JSON.parse(stored) : {};
        } catch (e) {
            console.error('Failed to load preset locks:', e);
            return {};
        }
    }

    updatePresetLockDisplay() {
        // Update main dropdown lock icon
        const lockIndicator = document.getElementById('preset-lock-indicator');
        if (lockIndicator) {
            const isLocked = this.isPresetLocked(this.currentPreset);
            lockIndicator.style.display = isLocked ? 'flex' : 'none';
        }
    }

    setupPresetManagement() {
        const presetEditBtn = document.getElementById('preset-edit-btn');
        const presetModal = document.getElementById('preset-modal');
        const presetModalClose = document.getElementById('preset-modal-close');
        const presetUndoBtn = document.getElementById('preset-undo-btn');
        const presetNameInput = document.getElementById('preset-name-input');
        
        // Track preset history for undo functionality
        this.presetHistory = [];
        this.maxHistorySize = 20;
        
        // Open preset modal
        if (presetEditBtn) {
            presetEditBtn.addEventListener('click', (e) => {
                e.stopPropagation();  // Prevent dropdown from triggering
                this.openPresetModal();
            });
        }
        
        // Close preset modal
        if (presetModalClose) {
            presetModalClose.addEventListener('click', () => {
                this.closePresetModal();
            });
        }
        
        // Close modal when clicking outside
        if (presetModal) {
            presetModal.addEventListener('click', (e) => {
                if (e.target === presetModal) {
                    this.closePresetModal();
                }
            });
        }
        
        // Undo button
        if (presetUndoBtn) {
            presetUndoBtn.addEventListener('click', () => {
                this.undoPresetChange();
            });
        }
        
        // Add preset creation on Enter key or when input loses focus with new value
        if (presetNameInput) {
            presetNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const name = presetNameInput.value.trim();
                    if (name && !this.presetExists(name)) {
                        this.savePresetAs(name);
                        presetNameInput.value = '';
                    }
                }
            });
        }
    }

    openPresetModal() {
        const modal = document.getElementById('preset-modal');
        if (modal) {
            modal.classList.add('active');
            this.renderPresetList();
            
            // Set input to current preset name
            const presetNameInput = document.getElementById('preset-name-input');
            if (presetNameInput) {
                presetNameInput.value = this.currentPreset.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            }
        }
    }

    closePresetModal() {
        const modal = document.getElementById('preset-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    renderPresetList() {
        const presetList = document.getElementById('preset-list');
        if (!presetList) return;
        
        presetList.innerHTML = '';
        
        // Also update the dropdown whenever we render the preset list
        this.updatePresetDropdown();
        
        for (const [key, preset] of Object.entries(this.presets)) {
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item';
            
            const presetName = document.createElement('div');
            presetName.className = 'preset-item-name';
            presetName.textContent = preset.name;
            
            // Add lock icon next to name if locked
            if (this.isPresetLocked(key)) {
                const lockIcon = document.createElement('i');
                lockIcon.className = 'ph-thin ph-lock preset-lock-icon';
                lockIcon.style.marginLeft = '8px';
                lockIcon.style.color = 'var(--text-primary)';  // White for locked
                presetName.appendChild(lockIcon);
            }
            
            // Auto-load preset when clicking on name
            presetName.addEventListener('click', () => {
                this.saveToHistory(); // Save current state before loading
                this.loadPreset(key);
                this.closePresetModal(); // Close modal after loading
            });
            
            const presetActions = document.createElement('div');
            presetActions.className = 'preset-item-actions';
            
            // Rename button
            const renameBtn = document.createElement('button');
            renameBtn.className = 'preset-item-btn';
            renameBtn.innerHTML = '<i class="ph-thin ph-pencil-simple"></i>';
            renameBtn.title = 'Rename Preset';
            renameBtn.addEventListener('click', () => {
                this.renamePreset(key);
            });
            
            // Duplicate button
            const duplicateBtn = document.createElement('button');
            duplicateBtn.className = 'preset-item-btn';
            duplicateBtn.innerHTML = '<i class="ph-thin ph-copy"></i>';
            duplicateBtn.title = 'Duplicate Preset';
            duplicateBtn.addEventListener('click', () => {
                this.duplicatePreset(key);
            });
            
            // Lock/Unlock button - instant toggle
            const lockBtn = document.createElement('button');
            const isLocked = this.isPresetLocked(key);
            lockBtn.className = isLocked ? 'preset-item-btn locked' : 'preset-item-btn unlocked';
            lockBtn.innerHTML = isLocked ? 
                '<i class="ph-thin ph-lock"></i>' :   // Show lock icon when locked
                '<i class="ph-thin ph-lock-open"></i>'; // Show lock-open when unlocked
            lockBtn.title = isLocked ? 'Unlock Preset' : 'Lock Preset';
            lockBtn.addEventListener('click', () => {
                this.togglePresetLock(key);
                // Instant toggle - no confirmation needed
            });
            
            // Export button (formerly Load button)
            const exportBtn = document.createElement('button');
            exportBtn.className = 'preset-item-btn';
            exportBtn.innerHTML = '<i class="ph-thin ph-download-simple"></i>';
            exportBtn.title = 'Export Preset';
            exportBtn.addEventListener('click', () => {
                this.exportPreset(key);
            });
            
            // Delete button (not for default) - instant delete
            if (key !== 'default') {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'preset-item-btn delete';
                deleteBtn.innerHTML = '<i class="ph-thin ph-trash"></i>';
                deleteBtn.title = 'Delete Preset';
                deleteBtn.addEventListener('click', () => {
                    // Instant delete - no confirmation
                    this.saveToHistory(); // Save state before delete
                    this.deletePreset(key);
                });
                presetActions.appendChild(deleteBtn);
            }
            
            presetActions.appendChild(renameBtn);
            presetActions.appendChild(duplicateBtn);
            presetActions.appendChild(lockBtn);
            presetActions.appendChild(exportBtn);
            presetItem.appendChild(presetName);
            presetItem.appendChild(presetActions);
            presetList.appendChild(presetItem);
        }
    }

    savePreset() {
        const preset = this.createPresetFromCurrentState(this.presets[this.currentPreset]?.name || 'Untitled');
        this.presets[this.currentPreset] = preset;
        this.savePresetsToStorage();
        return preset;
    }

    saveCurrentPreset() {
        const preset = this.savePreset();
        this.showNotification(`Preset "${preset.name}" saved`);
        this.renderPresetList();
    }

    savePresetAs(name) {
        const key = name.toLowerCase().replace(/\s+/g, '-');
        const preset = this.createPresetFromCurrentState(name);
        this.presets[key] = preset;
        this.currentPreset = key;
        
        this.savePresetsToStorage();
        this.showNotification(`Preset "${name}" created`);
        this.renderPresetList(); // This will also update the dropdown
        
        // Update the dropdown selected text to show the new preset
        const dropdownText = document.querySelector('#preset-dropdown .dropdown-text');
        if (dropdownText) {
            dropdownText.textContent = name;
        }
    }

    loadPreset(key) {
        const preset = this.presets[key];
        if (!preset) return;
        
        // Restore all player states
        this.playerStates = JSON.parse(JSON.stringify(preset.playerStates));
        
        // Restore link states
        if (preset.linkStates) {
            this.linkStates = JSON.parse(JSON.stringify(preset.linkStates));
            // Convert Sets back from arrays
            if (this.linkStates) {
                for (const param of ['swing', 'energy', 'volume']) {
                    if (this.linkStates[param] && Array.isArray(this.linkStates[param].slaves)) {
                        this.linkStates[param].slaves = new Set(this.linkStates[param].slaves);
                    }
                }
            }
        }
        
        // Restore global settings
        this.tempo = preset.tempo || 120;
        this.numberOfPlayers = preset.numberOfPlayers || 4;
        this.loopPosition = preset.loopPosition || 0;
        
        // Update current preset reference
        this.currentPreset = key;
        
        // Update UI
        this.updateUIForCurrentPlayer();
        this.setTempo(this.tempo);
        this.setLoopPosition(this.loopPosition);
        
        // Update preset dropdown display text
        const dropdownText = document.querySelector('#preset-dropdown .dropdown-text');
        if (dropdownText) {
            dropdownText.textContent = preset.name;
        }
        
        // Update the selected state in the dropdown options
        const dropdownOptions = document.getElementById('preset-options');
        if (dropdownOptions) {
            dropdownOptions.querySelectorAll('.dropdown-option').forEach(opt => {
                if (opt.dataset.value === key) {
                    opt.classList.add('selected');
                } else {
                    opt.classList.remove('selected');
                }
            });
        }
        
        // Update lock display
        this.updatePresetLockDisplay();
        
        this.triggerAppStateSave();  // Save app state with new preset selection
        this.showNotification(`Loaded preset "${preset.name}"`);
    }

    deletePreset(key) {
        if (key === 'default') return; // Can't delete default
        
        const name = this.presets[key]?.name;
        delete this.presets[key];
        
        // If we deleted the current preset, switch to default
        if (this.currentPreset === key) {
            this.loadPreset('default');
        }
        
        this.updatePresetDropdown();
        this.savePresetsToStorage();
        this.showNotification(`Deleted preset "${name}"`);
        this.renderPresetList();
    }
    
    duplicatePreset(key) {
        const originalPreset = this.presets[key];
        if (!originalPreset) return;
        
        // Create a new name for the duplicate
        let copyNumber = 1;
        let newName = `${originalPreset.name} Copy`;
        let newKey = newName.toLowerCase().replace(/\s+/g, '-');
        
        // Find a unique name
        while (this.presets[newKey]) {
            copyNumber++;
            newName = `${originalPreset.name} Copy ${copyNumber}`;
            newKey = newName.toLowerCase().replace(/\s+/g, '-');
        }
        
        // Create the duplicate
        const duplicatedPreset = JSON.parse(JSON.stringify(originalPreset));
        duplicatedPreset.name = newName;
        duplicatedPreset.timestamp = Date.now();
        
        // Rebuild presets object to maintain order (insert after original)
        const newPresets = {};
        for (const [k, v] of Object.entries(this.presets)) {
            newPresets[k] = v;
            if (k === key) {
                // Insert the duplicate right after the original
                newPresets[newKey] = duplicatedPreset;
            }
        }
        
        this.presets = newPresets;
        this.savePresetsToStorage();
        this.updatePresetDropdown();
        this.renderPresetList();
        this.showNotification(`Created duplicate: "${newName}"`);
    }
    
    renamePreset(key) {
        const preset = this.presets[key];
        if (!preset) return;
        
        // Create a prompt for the new name
        const newName = prompt(`Rename preset "${preset.name}" to:`, preset.name);
        
        if (newName && newName.trim() && newName !== preset.name) {
            const trimmedName = newName.trim();
            const newKey = trimmedName.toLowerCase().replace(/\s+/g, '-');
            
            // Check if the new key already exists
            if (this.presets[newKey] && newKey !== key) {
                this.showNotification(`A preset named "${trimmedName}" already exists`);
                return;
            }
            
            // Save to history before renaming
            this.saveToHistory();
            
            // If the key is changing, we need to recreate the presets object
            if (newKey !== key) {
                const newPresets = {};
                for (const [k, v] of Object.entries(this.presets)) {
                    if (k === key) {
                        // Replace the old key with the new key
                        v.name = trimmedName;
                        newPresets[newKey] = v;
                    } else {
                        newPresets[k] = v;
                    }
                }
                
                this.presets = newPresets;
                
                // Update current preset if it was the renamed one
                if (this.currentPreset === key) {
                    this.currentPreset = newKey;
                }
                
                // Update locks if the preset was locked
                if (this.presetLocks[key]) {
                    this.presetLocks[newKey] = this.presetLocks[key];
                    delete this.presetLocks[key];
                    this.savePresetLocksToStorage();
                }
            } else {
                // Just update the name
                preset.name = trimmedName;
            }
            
            this.savePresetsToStorage();
            this.updatePresetDropdown();
            this.renderPresetList();
            
            // Update dropdown text if this is the current preset
            if (this.currentPreset === newKey || this.currentPreset === key) {
                const dropdownText = document.querySelector('#preset-dropdown .dropdown-text');
                if (dropdownText) {
                    dropdownText.textContent = trimmedName;
                }
            }
            
            this.showNotification(`Renamed to "${trimmedName}"`);
        }
    }
    
    exportPreset(key) {
        const preset = this.presets[key];
        if (!preset) return;
        
        // Create a blob with the preset data
        const dataStr = JSON.stringify(preset, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `otto-preset-${preset.name.toLowerCase().replace(/\s+/g, '-')}.json`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification(`Exported preset: "${preset.name}"`);
    }
    
    saveToHistory() {
        // Save current state to history
        const historyEntry = {
            presets: JSON.parse(JSON.stringify(this.presets)),
            currentPreset: this.currentPreset,
            presetLocks: JSON.parse(JSON.stringify(this.presetLocks)),
            timestamp: Date.now()
        };
        
        this.presetHistory.push(historyEntry);
        
        // Limit history size
        if (this.presetHistory.length > this.maxHistorySize) {
            this.presetHistory.shift();
        }
    }
    
    undoPresetChange() {
        if (this.presetHistory.length === 0) {
            this.showNotification('No changes to undo');
            return;
        }
        
        // Get the last history entry
        const lastState = this.presetHistory.pop();
        
        // Restore the state
        this.presets = lastState.presets;
        this.currentPreset = lastState.currentPreset;
        this.presetLocks = lastState.presetLocks;
        
        // Update storage and UI
        this.savePresetsToStorage();
        this.savePresetLocksToStorage();
        this.updatePresetDropdown();
        this.renderPresetList();
        this.updatePresetLockDisplay();
        
        // Update dropdown text
        const dropdownText = document.querySelector('#preset-dropdown .dropdown-text');
        if (dropdownText && this.presets[this.currentPreset]) {
            dropdownText.textContent = this.presets[this.currentPreset].name;
        }
        
        this.showNotification('Undo successful');
    }

    updatePresetDropdown() {
        const presetOptions = document.getElementById('preset-options');
        const dropdown = document.getElementById('preset-dropdown');
        const dropdownText = dropdown?.querySelector('.dropdown-text');
        
        if (!presetOptions) return;
        
        presetOptions.innerHTML = '';
        
        for (const [key, preset] of Object.entries(this.presets)) {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = key;
            option.textContent = preset.name;
            
            // Mark as selected if it's the current preset
            if (key === this.currentPreset) {
                option.classList.add('selected');
            }
            
            // Add click handler directly to each option
            option.addEventListener('click', (e) => {
                e.stopPropagation();

                // Update selected text
                if (dropdownText) {
                    dropdownText.textContent = preset.name;
                }

                // Update selected state
                presetOptions.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                // Close dropdown
                dropdown.classList.remove('open');

                // Load the preset
                this.loadPreset(key);
            });
            
            presetOptions.appendChild(option);
        }
        
        // Don't call setupPresetControls here as it rebuilds the dropdown structure
        // The dropdown toggle handler should already be set up once during initialization
    }

    savePresetsToStorage() {
        // Convert Sets to arrays for storage
        const presetsToStore = {};
        for (const [key, preset] of Object.entries(this.presets)) {
            const presetCopy = JSON.parse(JSON.stringify(preset));
            if (presetCopy.linkStates) {
                for (const param of ['swing', 'energy', 'volume']) {
                    if (presetCopy.linkStates[param] && presetCopy.linkStates[param].slaves) {
                        presetCopy.linkStates[param].slaves = Array.from(presetCopy.linkStates[param].slaves);
                    }
                }
            }
            presetsToStore[key] = presetCopy;
        }
        localStorage.setItem('otto_presets', JSON.stringify(presetsToStore));
    }

    loadPresetsFromStorage() {
        try {
            const stored = localStorage.getItem('otto_presets');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('Failed to load presets from storage:', e);
        }
        return null;
    }

    init() {
        this.initAppState();      // Initialize app state FIRST to restore saved values
        this.initPresetSystem();  // Initialize preset system second
        this.setupVersion();
        this.setupSplashScreen();
        this.setupPlayerTabs();
        this.setupPresetControls();
        this.setupKitControls();
        this.setupPatternGroupControls();
        this.setupPatternGrid();
        this.setupToggleButtons();
        this.setupFillButtons();
        this.setupSliders();
        this.setupLinkIcons();  // Initialize link icons after sliders
        this.setupTopBarControls();
        this.setupLoopTimeline();
        this.setupKeyboardShortcuts();
        this.setupLogoClick();
        this.startLoopAnimation();

        // Initialize UI for saved or default player
        this.updateUIForCurrentPlayer();
        
        // Load the saved preset if it exists
        if (this.currentPreset && this.presets[this.currentPreset]) {
            this.loadPreset(this.currentPreset);
        }
        
        // Update play/pause button to match saved state
        this.updatePlayPauseButton();

        console.log('OTTO Accurate Interface initialized with', this.numberOfPlayers, 'active players (max:', this.maxPlayers, ')');
    }

    // Method to change number of active players
    updatePlayPauseButton() {
        // Update play/pause button visual state based on saved state
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            const playIcon = playPauseBtn.querySelector('.play-icon');
            const pauseIcon = playPauseBtn.querySelector('.pause-icon');
            
            if (this.isPlaying) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'inline-block';
            } else {
                playIcon.style.display = 'inline-block';
                pauseIcon.style.display = 'none';
            }
        }
    }

    setNumberOfPlayers(num) {
        if (num >= 4 && num <= 8) {
            this.numberOfPlayers = num;
            this.setupPlayerTabs();  // Refresh the player tabs and spacing

            // If current player is beyond the new limit, switch to player 1
            if (this.currentPlayer > num) {
                this.switchToPlayer(1);
            }

            this.triggerAppStateSave();  // Save app state
            console.log('Number of active players set to:', num);
        } else {
            console.error('Number of players must be between 4 and 8');
        }
    }

    setupVersion() {
        // Set the version number dynamically
        const versionNumber = document.getElementById('version-number');
        if (versionNumber) {
            versionNumber.textContent = this.version;
        }
    }

    setupLogoClick() {
        // Setup logo/version click to show splash screen
        const logoVersion = document.getElementById('logo-version');
        const splashScreen = document.getElementById('splash-screen');

        if (logoVersion && splashScreen) {
            logoVersion.addEventListener('click', () => {
                // Show splash screen
                splashScreen.style.display = 'flex';
                splashScreen.classList.remove('hidden');
                splashScreen.classList.add('show');

                // Hide it again after a delay
                setTimeout(() => {
                    splashScreen.classList.remove('show');
                    splashScreen.classList.add('hidden');
                    setTimeout(() => {
                        splashScreen.style.display = 'none';
                    }, 500);
                }, this.splashScreenLength * 2);  // Show for 2 seconds when clicked
            });
        }
    }

    setupSplashScreen() {
        const splashScreen = document.getElementById('splash-screen');

        setTimeout(() => {
            if (splashScreen) {
                splashScreen.classList.add('hidden');
                setTimeout(() => {
                    splashScreen.style.display = 'none';
                }, 500);
            }
        }, this.splashScreenLength);
    }

    setupPlayerTabs() {
        // Calculate spacing based on number of players
        // Reduced gaps to accommodate chevrons within interface bounds
        const gaps = {
            8: 2,    // Minimal gap for 8 players to fit with chevrons
            7: 4,    // Slightly more for 7 players
            6: 8,    // More spacing for 6 players
            5: 12,   // Even more for 5 players
            4: 20,   // Generous spacing for 4 players
            3: 30,   // Extra spacing for 3 players
            2: 40    // Maximum spacing for 2 players
        };
        const gap = gaps[this.numberOfPlayers] || 2;

        // Set the CSS variable for dynamic spacing
        document.documentElement.style.setProperty('--player-tab-gap', `${gap}px`);
        console.log(`Setting player tab gap to ${gap}px for ${this.numberOfPlayers} players`);

        // Hide tabs beyond the configured number of players
        document.querySelectorAll('.player-tab').forEach((tab, index) => {
            const playerNumber = index + 1;

            if (playerNumber <= this.numberOfPlayers) {
                tab.style.display = 'flex';  // Show active players
                if (!tab.hasAttribute('data-listener-added')) {
                    tab.addEventListener('click', () => {
                        this.switchToPlayer(playerNumber);
                    });
                    tab.setAttribute('data-listener-added', 'true');
                }
            } else {
                tab.style.display = 'none';  // Hide inactive players
            }
        });

        // Setup player navigation chevrons
        const playerPrevBtn = document.querySelector('.player-nav-prev');
        const playerNextBtn = document.querySelector('.player-nav-next');

        if (playerPrevBtn && !playerPrevBtn.hasAttribute('data-listener-added')) {
            playerPrevBtn.addEventListener('click', () => {
                this.navigatePlayer(-1);
            });
            playerPrevBtn.setAttribute('data-listener-added', 'true');
        }

        if (playerNextBtn && !playerNextBtn.hasAttribute('data-listener-added')) {
            playerNextBtn.addEventListener('click', () => {
                this.navigatePlayer(1);
            });
            playerNextBtn.setAttribute('data-listener-added', 'true');
        }
    }

    navigatePlayer(direction) {
        let newPlayer = this.currentPlayer + direction;
        
        // Wrap around navigation
        if (newPlayer < 1) {
            newPlayer = this.numberOfPlayers;  // Go to last active player
        } else if (newPlayer > this.numberOfPlayers) {
            newPlayer = 1;  // Go to first player
        }
        
        this.switchToPlayer(newPlayer);
        console.log(`Navigated to Player ${newPlayer} via chevron`);
    }

    setupPresetControls() {
        // Custom dropdown functionality
        const dropdown = document.getElementById('preset-dropdown');
        const dropdownSelected = document.getElementById('preset-selected');
        const dropdownOptions = document.getElementById('preset-options');
        const dropdownText = dropdown?.querySelector('.dropdown-text');

        // Remove old event listeners by cloning
        if (dropdownSelected) {
            const newDropdownSelected = dropdownSelected.cloneNode(true);
            dropdownSelected.parentNode.replaceChild(newDropdownSelected, dropdownSelected);
            
            // Toggle dropdown on click
            newDropdownSelected.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });
        }

        // Re-add option selection handlers
        if (dropdownOptions) {
            dropdownOptions.innerHTML = '';
            
            // Add options from presets
            for (const [key, preset] of Object.entries(this.presets)) {
                const option = document.createElement('div');
                option.className = 'dropdown-option';
                option.dataset.value = key;
                option.textContent = preset.name;
                
                // Mark as selected if it's the current preset
                if (key === this.currentPreset) {
                    option.classList.add('selected');
                }
                
                option.addEventListener('click', (e) => {
                    e.stopPropagation();

                    // Update selected text
                    if (dropdownText) {
                        dropdownText.textContent = preset.name;
                    }

                    // Update selected state
                    dropdownOptions.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
                    option.classList.add('selected');

                    // Close dropdown
                    dropdown.classList.remove('open');

                    // Load the preset
                    this.loadPreset(key);
                });
                
                dropdownOptions.appendChild(option);
            }
        }

        // Close dropdown when clicking outside (only add once)
        if (!this.presetDropdownCloseHandler) {
            this.presetDropdownCloseHandler = (e) => {
                if (dropdown && !dropdown.contains(e.target)) {
                    dropdown.classList.remove('open');
                }
            };
            document.addEventListener('click', this.presetDropdownCloseHandler);
        }
    }

    navigatePreset(direction) {
        // these should eventually come from our INI storage system.
        const presets = ['Default', 'Rock Ballad', 'Jazz Combo', 'Funk Groove', 'Latin Rhythm', 'Electronic Pulse', 'Acoustic Folk', 'Blues Shuffle', 'Pop Modern', 'World Fusion'];
        const state = this.playerStates[this.currentPlayer];
        const currentIndex = presets.indexOf(state.presetName);
        let newIndex = currentIndex + direction;

        if (newIndex < 0) newIndex = presets.length - 1;
        if (newIndex >= presets.length) newIndex = 0;

        state.presetName = presets[newIndex];
        this.updateUIForCurrentPlayer();

        // Update custom dropdown
        const dropdownText = document.querySelector('.dropdown-text');
        if (dropdownText) {
            dropdownText.textContent = state.presetName;
        }

        // Update selected state on options
        const options = document.querySelectorAll('.dropdown-option');
        const presetValue = state.presetName.toLowerCase().replace(/\s+/g, '-');
        options.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === presetValue) {
                option.classList.add('selected');
            }
        });

        this.onPresetChanged(this.currentPlayer, state.presetName);
        console.log(`Player ${this.currentPlayer} preset: ${state.presetName}`);
    }

    switchToPlayer(playerNumber) {
        if (playerNumber < 1 || playerNumber > this.numberOfPlayers) return;

        this.currentPlayer = playerNumber;

        // Update tab states
        document.querySelectorAll('.player-tab').forEach((tab, index) => {
            tab.classList.remove('active');
            if (index + 1 === playerNumber) {
                tab.classList.add('active');
                tab.classList.add('fade-in');
            }
        });

        // Update UI to reflect current player state
        this.updateUIForCurrentPlayer();
        
        this.triggerAppStateSave();  // Save app state
        console.log(`Switched to Player ${playerNumber}`);
        this.onPlayerChanged(playerNumber);
    }

    updateUIForCurrentPlayer() {
        const state = this.playerStates[this.currentPlayer];

        // Update player number display
        const playerNumberDisplay = document.getElementById('current-player-number');
        if (playerNumberDisplay) {
            playerNumberDisplay.textContent = this.currentPlayer;
        }

        // Update preset select dropdown
        const programSelect = document.querySelector('.program-select');
        if (programSelect) {
            const presetValue = state.presetName.toLowerCase().replace(/\s+/g, '-');
            programSelect.value = presetValue;
        }

        // Update kit name display (legacy - kept for compatibility)
        const kitNameDisplay = document.getElementById('current-kit-name');
        if (kitNameDisplay) {
            kitNameDisplay.textContent = state.kitName;
        }

        // Update kit dropdown
        const kitDropdownText = document.querySelector('#kit-dropdown .dropdown-text');
        if (kitDropdownText) {
            kitDropdownText.textContent = state.kitName;
        }
        
        // Update selected state on kit options
        const kitOptions = document.querySelectorAll('#kit-dropdown .dropdown-option');
        kitOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === state.kitName.toLowerCase()) {
                option.classList.add('selected');
            }
        });

        // Kit mixer button no longer has active state
        // const kitMixerBtn = document.getElementById('kit-mixer-btn');
        // if (kitMixerBtn) {
        //     kitMixerBtn.classList.toggle('active', state.kitMixerActive);
        // }

        // Update mute drummer button state
        const muteDrummerBtn = document.getElementById('mute-drummer-btn');
        if (muteDrummerBtn) {
            muteDrummerBtn.classList.toggle('muted', state.muted);
        }

        // Update toggle button states
        Object.keys(state.toggleStates).forEach(toggleKey => {
            const button = document.querySelector(`[data-toggle="${toggleKey}"]`);
            if (button) {
                button.classList.toggle('active', state.toggleStates[toggleKey]);
            }
        });

        // Update fill button states
        Object.keys(state.fillStates).forEach(fillKey => {
            const button = document.querySelector(`[data-fill="${fillKey}"]`);
            if (button) {
                button.classList.toggle('active', state.fillStates[fillKey]);
            }
        });

        // Update pattern selection
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.pattern === state.selectedPattern) {
                btn.classList.add('active');
            }
        });

        // Update custom sliders
        Object.keys(state.sliderValues).forEach(sliderKey => {
            const slider = document.querySelector(`.custom-slider[data-param="${sliderKey}"]`);
            if (slider) {
                const value = state.sliderValues[sliderKey];
                this.updateCustomSlider(slider, value);
            }
        });

        // Update mini sliders
        const miniSliders = document.querySelectorAll('.mini-slider');
        miniSliders.forEach((slider, index) => {
            const sliderIndex = index + 1;
            slider.value = state.miniSliders[sliderIndex] || 50;
        });

        // Update link icon states for current player
        if (this.linkStates) {
            this.updateLinkIconStates();
        }

        // Update mute overlay based on current player's mute state
        this.updateMuteOverlay();
        
        // Update all player tabs' muted visual state
        for (let i = 1; i <= this.maxPlayers; i++) {
            const tab = document.querySelector(`.player-tab[data-player="${i}"]`);
            if (tab && this.playerStates[i]) {
                tab.classList.toggle('muted', this.playerStates[i].muted);
            }
        }
    }

    setupKitControls() {
        // Kit navigation buttons
        const kitPrev = document.querySelector('.kit-prev');
        const kitNext = document.querySelector('.kit-next');

        if (kitPrev) {
            kitPrev.addEventListener('click', () => {
                this.navigateKit(-1);
            });
        }

        if (kitNext) {
            kitNext.addEventListener('click', () => {
                this.navigateKit(1);
            });
        }

        // Kit dropdown functionality
        const kitDropdown = document.getElementById('kit-dropdown');
        const kitDropdownSelected = document.getElementById('kit-selected');
        const kitDropdownOptions = document.getElementById('kit-options');
        const kitDropdownText = kitDropdown?.querySelector('.dropdown-text');

        // Toggle kit dropdown on click
        if (kitDropdownSelected) {
            kitDropdownSelected.addEventListener('click', (e) => {
                e.stopPropagation();
                kitDropdown.classList.toggle('open');
            });
        }

        // Handle kit option selection
        const kitOptions = kitDropdown?.querySelectorAll('.dropdown-option');
        kitOptions?.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();

                // Update selected text
                const selectedText = option.textContent;
                if (kitDropdownText) {
                    kitDropdownText.textContent = selectedText;
                }

                // Update selected state
                kitOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                // Close dropdown
                kitDropdown.classList.remove('open');

                // Update player state
                this.playerStates[this.currentPlayer].kitName = selectedText;
                this.onKitChanged(this.currentPlayer, selectedText);
                this.triggerAutoSave();
                console.log(`Player ${this.currentPlayer} kit changed to: ${selectedText}`);
            });
        });
        
        // Close kit dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (kitDropdown && !kitDropdown.contains(e.target)) {
                kitDropdown.classList.remove('open');
            }
        });

        // Kit mixer button
        const kitMixerBtn = document.getElementById('kit-mixer-btn');
        if (kitMixerBtn) {
            kitMixerBtn.addEventListener('click', () => {
                // No longer toggling state - just call the function
                this.onKitMixerToggle(this.currentPlayer, true);
                console.log(`Player ${this.currentPlayer} kit mixer clicked`);
            });
        }

        // Edit button
        document.querySelectorAll('.edit-btn').forEach(editBtn => {
            editBtn.addEventListener('click', () => {
                this.onEditKit(this.currentPlayer);
                console.log(`Edit kit for Player ${this.currentPlayer}`);
            });
        });

        // Mute drummer button
        const muteDrummerBtn = document.getElementById('mute-drummer-btn');
        if (muteDrummerBtn) {
            muteDrummerBtn.addEventListener('click', () => {
                const state = this.playerStates[this.currentPlayer];
                state.muted = !state.muted;
                muteDrummerBtn.classList.toggle('muted', state.muted);
                
                // Update player tab muted state
                const playerTab = document.querySelector(`.player-tab[data-player="${this.currentPlayer}"]`);
                if (playerTab) {
                    playerTab.classList.toggle('muted', state.muted);
                }
                
                // Update overlay visibility
                this.updateMuteOverlay();
                
                this.onMuteDrummer(this.currentPlayer, state.muted);
                this.triggerAutoSave();
                console.log(`Player ${this.currentPlayer} drummer muted: ${state.muted}`);
            });
        }
    }

    navigateKit(direction) {
        // these should eventually come from our INI storage system.
        const kits = ['Acoustic', 'Electronic', 'Rock', 'Jazz', 'Pop', 'Funk', 'Latin', 'Vintage'];
        const state = this.playerStates[this.currentPlayer];
        const currentIndex = kits.indexOf(state.kitName);
        let newIndex = currentIndex + direction;

        if (newIndex < 0) newIndex = kits.length - 1;
        if (newIndex >= kits.length) newIndex = 0;

        state.kitName = kits[newIndex];
        this.updateUIForCurrentPlayer();

        // Update kit dropdown
        const kitDropdownText = document.querySelector('#kit-dropdown .dropdown-text');
        if (kitDropdownText) {
            kitDropdownText.textContent = state.kitName;
        }
        
        // Update selected state on kit options
        const kitOptions = document.querySelectorAll('#kit-dropdown .dropdown-option');
        kitOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === state.kitName.toLowerCase()) {
                option.classList.add('selected');
            }
        });

        this.onKitChanged(this.currentPlayer, state.kitName);
        console.log(`Player ${this.currentPlayer} kit: ${state.kitName}`);
    }

    setupPatternGroupControls() {
        const groupPrev = document.querySelector('.group-prev');
        const groupNext = document.querySelector('.group-next');

        if (groupPrev) {
            groupPrev.addEventListener('click', () => {
                this.navigatePatternGroup(-1);
            });
        }

        if (groupNext) {
            groupNext.addEventListener('click', () => {
                this.navigatePatternGroup(1);
            });
        }

        // Setup group dropdown
        const groupDropdown = document.getElementById('group-dropdown');
        const groupSelected = document.getElementById('group-selected');
        const groupOptions = document.getElementById('group-options');

        if (groupDropdown && groupSelected) {
            // Toggle dropdown on click
            groupSelected.addEventListener('click', (e) => {
                e.stopPropagation();
                groupDropdown.classList.toggle('active');
            });

            // Handle option selection
            if (groupOptions) {
                groupOptions.querySelectorAll('.dropdown-option').forEach(option => {
                    option.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const value = option.dataset.value;
                        const text = option.textContent;
                        
                        // Update selected text
                        groupSelected.querySelector('.dropdown-text').textContent = text;
                        
                        // Close dropdown
                        groupDropdown.classList.remove('active');
                        
                        // Trigger callback
                        this.onPatternGroupChanged(this.currentPlayer, value);
                        console.log(`Player ${this.currentPlayer} pattern group: ${value}`);
                    });
                });
            }

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!groupDropdown.contains(e.target)) {
                    groupDropdown.classList.remove('active');
                }
            });
        }
    }

    navigatePatternGroup(direction) {
        // these should eventually come from our INI storage system.
        const groups = ['favorites', 'all', 'custom'];
        const groupDropdown = document.getElementById('group-dropdown');
        const groupSelected = document.getElementById('group-selected');
        const groupOptions = document.getElementById('group-options');
        
        if (!groupDropdown || !groupSelected) return;

        // Get current selection
        const currentText = groupSelected.querySelector('.dropdown-text').textContent.toLowerCase();
        const currentIndex = groups.findIndex(g => 
            g === currentText || 
            (g === 'all' && currentText === 'all patterns') ||
            (g === 'favorites' && currentText === 'favorites') ||
            (g === 'custom' && currentText === 'custom')
        );
        
        let newIndex = currentIndex + direction;
        
        // Wrap around
        if (newIndex < 0) newIndex = groups.length - 1;
        if (newIndex >= groups.length) newIndex = 0;
        
        // Get the option element and trigger click
        const newValue = groups[newIndex];
        const optionToSelect = groupOptions.querySelector(`[data-value="${newValue}"]`);
        
        if (optionToSelect) {
            const text = optionToSelect.textContent;
            groupSelected.querySelector('.dropdown-text').textContent = text;
            this.onPatternGroupChanged(this.currentPlayer, newValue);
            console.log(`Player ${this.currentPlayer} pattern group: ${newValue}`);
        }
    }

    setupPatternGrid() {
        document.querySelectorAll('.pattern-btn').forEach(patternBtn => {
            patternBtn.addEventListener('click', (e) => {
                const patternName = patternBtn.dataset.pattern;

                // Clear other pattern selections
                document.querySelectorAll('.pattern-btn').forEach(btn => {
                    btn.classList.remove('active');
                });

                // Activate clicked pattern
                patternBtn.classList.add('active');

                this.playerStates[this.currentPlayer].selectedPattern = patternName;
                this.onPatternSelected(this.currentPlayer, patternName);
                this.triggerAutoSave();

                console.log(`Player ${this.currentPlayer} selected pattern: ${patternName}`);
            });
        });
    }

    setupToggleButtons() {
        document.querySelectorAll('.toggle-btn').forEach(toggleBtn => {
            toggleBtn.addEventListener('click', (e) => {
                const toggleType = toggleBtn.dataset.toggle;
                const state = this.playerStates[this.currentPlayer];

                // Handle radio group behavior for Auto/Manual
                if (toggleType === 'auto' || toggleType === 'manual') {
                    // Clear both
                    state.toggleStates.auto = false;
                    state.toggleStates.manual = false;

                    // Set the clicked one
                    state.toggleStates[toggleType] = true;

                    // Update all Auto/Manual buttons
                    document.querySelectorAll('[data-toggle="auto"], [data-toggle="manual"]').forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.dataset.toggle === toggleType) {
                            btn.classList.add('active');
                        }
                    });
                } else {
                    // Toggle individual buttons
                    const isActive = toggleBtn.classList.contains('active');
                    toggleBtn.classList.toggle('active');
                    state.toggleStates[toggleType] = !isActive;
                }

                this.onToggleChanged(this.currentPlayer, toggleType, state.toggleStates[toggleType]);
                this.triggerAutoSave();
                console.log(`Player ${this.currentPlayer} toggle ${toggleType}: ${state.toggleStates[toggleType]}`);
            });
        });
    }

    setupFillButtons() {
        document.querySelectorAll('.fill-btn').forEach(fillBtn => {
            fillBtn.addEventListener('click', (e) => {
                const fillType = fillBtn.dataset.fill;
                const state = this.playerStates[this.currentPlayer];

                const isActive = fillBtn.classList.contains('active');
                fillBtn.classList.toggle('active');

                state.fillStates[fillType] = !isActive;
                this.onFillChanged(this.currentPlayer, fillType, !isActive);
                this.triggerAutoSave();

                console.log(`Player ${this.currentPlayer} fill ${fillType}: ${!isActive}`);
            });
        });
    }

    setupSliders() {
        // Custom vertical sliders
        document.querySelectorAll('.custom-slider').forEach(slider => {
            const track = slider.querySelector('.slider-track');
            const fill = slider.querySelector('.slider-fill');
            const thumb = slider.querySelector('.slider-thumb');
            
            // Get initial values from data attributes
            let min = parseInt(slider.dataset.min) || 0;
            let max = parseInt(slider.dataset.max) || 100;
            let value = parseInt(slider.dataset.value) || 50;
            const param = slider.dataset.param;
            
            // Initialize visual state
            this.updateCustomSlider(slider, value);
            
            // Handle mouse down on thumb
            let isDragging = false;
            let startY = 0;
            let startValue = 0;
            
            const startDrag = (e) => {
                isDragging = true;
                slider.classList.add('dragging');
                startY = e.clientY;
                startValue = value;
                e.preventDefault();
            };
            
            const doDrag = (e) => {
                if (!isDragging) return;
                
                const deltaY = startY - e.clientY;  // Inverted for vertical slider
                const trackHeight = track.offsetHeight;
                const range = max - min;
                const deltaValue = (deltaY / trackHeight) * range;
                
                value = Math.max(min, Math.min(max, startValue + deltaValue));
                value = Math.round(value);  // Round to integer
                
                // Update visual state
                this.updateCustomSlider(slider, value);
                
                // Update player state
                this.playerStates[this.currentPlayer].sliderValues[param] = value;
                this.onSliderChanged(this.currentPlayer, param, value);
                this.triggerAutoSave();
                
                // Check if this player is a master and propagate value
                if (this.linkStates && this.linkStates[param]) {
                    const linkState = this.linkStates[param];
                    if (linkState.master === this.currentPlayer) {
                        this.propagateSliderValue(param, value, this.currentPlayer);
                    }
                }
                
                console.log(`Player ${this.currentPlayer} ${param} slider: ${value}`);
            };
            
            const endDrag = () => {
                if (isDragging) {
                    isDragging = false;
                    slider.classList.remove('dragging');
                }
            };
            
            // Handle click on track
            track.addEventListener('click', (e) => {
                if (e.target === thumb) return;  // Don't handle if clicking thumb
                
                const rect = track.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const percentage = 1 - (clickY / rect.height);  // Inverted for vertical
                
                value = Math.round(min + (percentage * (max - min)));
                
                // Update visual state
                this.updateCustomSlider(slider, value);
                
                // Update player state
                this.playerStates[this.currentPlayer].sliderValues[param] = value;
                this.onSliderChanged(this.currentPlayer, param, value);
                this.triggerAutoSave();
                
                // Handle link propagation
                if (this.linkStates && this.linkStates[param]) {
                    const linkState = this.linkStates[param];
                    if (linkState.master === this.currentPlayer) {
                        this.propagateSliderValue(param, value, this.currentPlayer);
                    }
                }
                
                console.log(`Player ${this.currentPlayer} ${param} slider: ${value}`);
            });
            
            // Attach drag event listeners
            thumb.addEventListener('mousedown', startDrag);
            document.addEventListener('mousemove', doDrag);
            document.addEventListener('mouseup', endDrag);
            
            // Store value for updates
            slider.currentValue = value;
        });

        // Mini sliders in kit section (keeping original for now)
        document.querySelectorAll('.mini-slider').forEach((slider, index) => {
            slider.addEventListener('input', (e) => {
                const sliderIndex = index + 1;
                const value = parseInt(e.target.value);

                this.playerStates[this.currentPlayer].miniSliders[sliderIndex] = value;
                this.onMiniSliderChanged(this.currentPlayer, sliderIndex, value);
                this.triggerAutoSave();

                console.log(`Player ${this.currentPlayer} mini slider ${sliderIndex}: ${value}`);
            });
        });
    }
    
    updateCustomSlider(slider, value) {
        const fill = slider.querySelector('.slider-fill');
        const thumb = slider.querySelector('.slider-thumb');
        
        const min = parseInt(slider.dataset.min) || 0;
        const max = parseInt(slider.dataset.max) || 100;
        const percentage = ((value - min) / (max - min)) * 100;
        
        // Update fill height (light grey below thumb)
        fill.style.height = `${percentage}%`;
        
        // Update thumb position
        thumb.style.bottom = `${percentage}%`;
        
        // Store current value
        slider.currentValue = value;
        slider.dataset.value = value;
    }

    setupLinkIcons() {
        // Track link states for each parameter
        this.linkStates = {
            swing: { master: null, slaves: new Set() },
            energy: { master: null, slaves: new Set() },
            volume: { master: null, slaves: new Set() }
        };

        // Setup link icon click handlers
        document.querySelectorAll('.link-icon').forEach(linkIcon => {
            const param = linkIcon.dataset.param;
            
            linkIcon.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLinkToggle(param, linkIcon);
            });
        });
    }

    handleLinkToggle(param, linkIcon) {
        const currentPlayer = this.currentPlayer;
        const linkState = this.linkStates[param];
        
        // Determine current state of this link icon
        const isMaster = linkState.master === currentPlayer;
        const isSlave = linkState.slaves.has(currentPlayer);
        
        if (!isMaster && !isSlave) {
            // Currently unlinked - make it master
            // Clear any existing master
            if (linkState.master !== null) {
                // Convert existing master to slave
                linkState.slaves.add(linkState.master);
            }
            
            linkState.master = currentPlayer;
            linkIcon.classList.add('master');
            linkIcon.classList.remove('linked');
            
            // Propagate this player's value to all other players
            const masterValue = this.playerStates[currentPlayer].sliderValues[param];
            this.propagateSliderValue(param, masterValue, currentPlayer);
            
            // Update all other players to be slaves
            for (let i = 1; i <= this.numberOfPlayers; i++) {
                if (i !== currentPlayer) {
                    linkState.slaves.add(i);
                }
            }
            
            console.log(`Player ${currentPlayer} is now master for ${param}, value: ${masterValue}`);
            
        } else if (isMaster) {
            // Currently master - unlink all
            linkState.master = null;
            linkState.slaves.clear();
            linkIcon.classList.remove('master');
            
            console.log(`Player ${currentPlayer} unlinked ${param} (was master)`);
            
        } else if (isSlave) {
            // Currently slave - unlink just this player
            linkState.slaves.delete(currentPlayer);
            linkIcon.classList.remove('linked');
            
            // If no more slaves and no master, clear everything
            if (linkState.slaves.size === 0 && linkState.master === null) {
                // Already cleared
            }
            
            console.log(`Player ${currentPlayer} unlinked from ${param} (was slave)`);
        }
        
        // Update link icon states for all players when switching
        this.updateLinkIconStates();
    }

    propagateSliderValue(param, value, fromPlayer) {
        const linkState = this.linkStates[param];
        
        // Update all slave players
        linkState.slaves.forEach(playerNum => {
            if (playerNum !== fromPlayer) {
                this.playerStates[playerNum].sliderValues[param] = value;
                console.log(`Propagated ${param} value ${value} to Player ${playerNum}`);
            }
        });
        
        // If we're currently viewing a slave player, update the UI
        if (linkState.slaves.has(this.currentPlayer)) {
            const slider = document.querySelector(`.custom-slider[data-param="${param}"]`);
            if (slider) {
                this.updateCustomSlider(slider, value);
            }
        }
    }

    updateLinkIconStates() {
        // Update link icon visual states based on current player
        document.querySelectorAll('.link-icon').forEach(linkIcon => {
            const param = linkIcon.dataset.param;
            const linkState = this.linkStates[param];
            
            linkIcon.classList.remove('master', 'linked');
            
            if (linkState.master === this.currentPlayer) {
                linkIcon.classList.add('master');
            } else if (linkState.slaves.has(this.currentPlayer)) {
                linkIcon.classList.add('linked');
            }
        });
    }

    updateMuteOverlay() {
        const overlay = document.querySelector('.mute-overlay');
        const state = this.playerStates[this.currentPlayer];
        
        if (overlay) {
            // Show overlay if current player is muted
            overlay.classList.toggle('active', state.muted);
        }
    }

    setupTopBarControls() {
        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.onSettingsClicked();
                console.log('Settings clicked');
            });
        }

        // Link button
        const linkBtn = document.getElementById('link-btn');
        if (linkBtn) {
            linkBtn.addEventListener('click', () => {
                this.onLinkClicked();
                console.log('Link clicked');
            });
        }

        // Upload button
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.onUploadClicked();
                console.log('Upload clicked');
            });
        }

        // Play/Pause button
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                this.togglePlayPause();
            });
        }

        // Tempo display - dual function (tap tempo & edit)
        const tempoDisplay = document.getElementById('tempo-display');
        if (tempoDisplay) {
            let clickTimer = null;
            let clickCount = 0;
            let isEditing = false;

            // Single click for tap tempo
            tempoDisplay.addEventListener('click', (e) => {
                if (isEditing) return;  // Don't tap while editing

                clickCount++;

                if (clickCount === 1) {
                    clickTimer = setTimeout(() => {
                        // Single click - tap tempo
                        this.handleTapTempo();
                        tempoDisplay.classList.add('tapped');
                        setTimeout(() => {
                            tempoDisplay.classList.remove('tapped');
                        }, 200);
                        console.log('Tap tempo triggered');
                        clickCount = 0;
                    }, 180);  // Reduced to 180ms to allow fast tempo tapping up to 333 BPM
                } else if (clickCount === 2) {
                    // Double click - enter edit mode
                    clearTimeout(clickTimer);
                    clickCount = 0;
                    this.enterEditMode(tempoDisplay);
                }
            });

            // Handle editing
            tempoDisplay.addEventListener('blur', () => {
                if (!isEditing) return;

                const newTempo = parseInt(tempoDisplay.textContent);
                if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 300) {
                    this.setTempo(newTempo);
                } else {
                    // Reset to current tempo if invalid
                    tempoDisplay.textContent = this.tempo;
                }
                this.exitEditMode(tempoDisplay);
            });

            tempoDisplay.addEventListener('keydown', (e) => {
                if (!isEditing) {
                    e.preventDefault();
                    return;
                }

                if (e.key === 'Enter') {
                    tempoDisplay.blur();
                    e.preventDefault();
                } else if (e.key === 'Escape') {
                    tempoDisplay.textContent = this.tempo;
                    tempoDisplay.blur();
                    e.preventDefault();
                } else {
                    // Allow only numbers and navigation keys
                    const allowedKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
                                       'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
                    if (!allowedKeys.includes(e.key)) {
                        e.preventDefault();
                    }
                }
            });

            // Helper functions for edit mode
            this.enterEditMode = (element) => {
                isEditing = true;
                element.contentEditable = 'true';
                element.classList.add('editing');
                element.focus();

                // Select all text
                const range = document.createRange();
                range.selectNodeContents(element);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
            };

            this.exitEditMode = (element) => {
                isEditing = false;
                element.contentEditable = 'false';
                element.classList.remove('editing');
                element.blur();  // Remove focus to hide cursor
                // Force cursor style reset
                element.style.cursor = 'pointer';
                window.getSelection().removeAllRanges();  // Clear any text selection
            };
        }

        // Program select is now handled by setupPresetControls()
    }

    setupLoopTimeline() {
        const timelineHandle = document.getElementById('timeline-handle');
        if (timelineHandle) {
            let isDragging = false;

            timelineHandle.addEventListener('mousedown', (e) => {
                isDragging = true;
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const timelineTrack = timelineHandle.parentElement;
                const rect = timelineTrack.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = Math.max(0, Math.min(1, x / rect.width));

                this.setLoopPosition(percentage);
                this.onLoopPositionChanged(percentage);
                this.triggerAutoSave();
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Check if we're editing any text field
            const isEditingText = e.target.matches('input, select, textarea, [contenteditable="true"]') ||
                                 e.target.classList.contains('editing') ||
                                 document.querySelector('.tempo-display.editing');

            // Don't process shortcuts if editing text
            if (isEditingText) {
                return;
            }

            // Player selection (1-8)
            if (e.key >= '1' && e.key <= '8') {
                const playerNumber = parseInt(e.key);
                if (playerNumber <= this.numberOfPlayers) {
                    this.switchToPlayer(playerNumber);
                }
            }

            // Arrow keys removed - we don't use them for player navigation

            // Spacebar for play/pause
            if (e.key === ' ') {
                e.preventDefault();
                this.togglePlayPause();
            }

            // Kit navigation
            if (e.key === '[') {
                this.navigateKit(-1);
            }
            if (e.key === ']') {
                this.navigateKit(1);
            }
        });
    }

    startLoopAnimation() {
        const animate = () => {
            // Animate the loop position when playing
            if (this.isPlaying) {
                this.loopPosition += 0.003; // Adjust speed as needed
                if (this.loopPosition > 1) {
                    this.loopPosition = 0;
                }
            }

            this.updateLoopTimelineDisplay();
            this.animationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    updateLoopTimelineDisplay() {
        const handle = document.getElementById('timeline-handle');
        if (handle) {
            handle.style.left = `${this.loopPosition * 100}%`;
        }
    }

    setLoopPosition(position) {
        this.loopPosition = Math.max(0, Math.min(1, position));
        this.updateLoopTimelineDisplay();
        // Don't save app state here as it's called frequently during animation
    }

    setTempo(bpm) {
        this.tempo = bpm;
        const tempoDisplay = document.getElementById('tempo-display');
        if (tempoDisplay) {
            tempoDisplay.textContent = Math.round(bpm);
        }
        this.onTempoChanged(bpm);
        this.triggerAutoSave();
        this.triggerAppStateSave();  // Save app state
    }

    handleTapTempo() {
        const now = Date.now();
        this.tapTimes.push(now);

        // Remove old taps (older than 3 seconds)
        this.tapTimes = this.tapTimes.filter(time => now - time < 3000);

        // Keep only the last maxTapTimes taps
        if (this.tapTimes.length > this.maxTapTimes) {
            this.tapTimes = this.tapTimes.slice(-this.maxTapTimes);
        }

        // Calculate tempo if we have at least 2 taps
        if (this.tapTimes.length >= 2) {
            const intervals = [];
            for (let i = 1; i < this.tapTimes.length; i++) {
                intervals.push(this.tapTimes[i] - this.tapTimes[i - 1]);
            }

            // Average interval in milliseconds
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

            // Convert to BPM (60000 ms = 1 minute)
            const newTempo = Math.round(60000 / avgInterval);

            // Validate tempo range
            if (newTempo >= 60 && newTempo <= 200) {
                this.setTempo(newTempo);
                console.log(`Tap tempo calculated: ${newTempo} BPM (${this.tapTimes.length} taps)`);
            }
        }

        console.log(`Tap registered (${this.tapTimes.length} taps)`);
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;

        // Update button visual state
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            const playIcon = playPauseBtn.querySelector('.play-icon');
            const pauseIcon = playPauseBtn.querySelector('.pause-icon');

            if (this.isPlaying) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'inline-block';
            } else {
                playIcon.style.display = 'inline-block';
                pauseIcon.style.display = 'none';
            }
        }

        // Notify JUCE backend if available
        if (window.juce?.onPlayPauseChanged) {
            window.juce.onPlayPauseChanged(this.isPlaying);
        }
        
        this.triggerAppStateSave();  // Save app state
        console.log(`Playback ${this.isPlaying ? 'started' : 'paused'}`);
    }

    // JUCE Integration Callbacks
    onPlayerChanged(playerNumber) {
        if (window.juce?.onPlayerChanged) {
            window.juce.onPlayerChanged(playerNumber);
        }
    }

    onKitChanged(playerNumber, kitName) {
        if (window.juce?.onKitChanged) {
            window.juce.onKitChanged(playerNumber, kitName);
        }
    }

    onPatternSelected(playerNumber, patternName) {
        if (window.juce?.onPatternSelected) {
            window.juce.onPatternSelected(playerNumber, patternName);
        }
    }

    onPatternGroupChanged(playerNumber, groupName) {
        if (window.juce?.onPatternGroupChanged) {
            window.juce.onPatternGroupChanged(playerNumber, groupName);
        }
    }

    onToggleChanged(playerNumber, toggleType, isActive) {
        if (window.juce?.onToggleChanged) {
            window.juce.onToggleChanged(playerNumber, toggleType, isActive);
        }
    }

    onFillChanged(playerNumber, fillType, isActive) {
        if (window.juce?.onFillChanged) {
            window.juce.onFillChanged(playerNumber, fillType, isActive);
        }
    }

    onSliderChanged(playerNumber, sliderType, value) {
        if (window.juce?.onSliderChanged) {
            window.juce.onSliderChanged(playerNumber, sliderType, value);
        }
    }

    onMiniSliderChanged(playerNumber, sliderIndex, value) {
        if (window.juce?.onMiniSliderChanged) {
            window.juce.onMiniSliderChanged(playerNumber, sliderIndex, value);
        }
    }

    onEditKit(playerNumber) {
        if (window.juce?.onEditKit) {
            window.juce.onEditKit(playerNumber);
        }
    }

    onKitMixerToggle(playerNumber, isActive) {
        if (window.juce?.onKitMixerToggle) {
            window.juce.onKitMixerToggle(playerNumber, isActive);
        }
    }

    onMuteDrummer(playerNumber, isMuted) {
        if (window.juce?.onMuteDrummer) {
            window.juce.onMuteDrummer(playerNumber, isMuted);
        }
    }

    onPresetChanged(playerNumber, presetName) {
        if (window.juce?.onPresetChanged) {
            window.juce.onPresetChanged(playerNumber, presetName);
        }
    }

    onTempoChanged(bpm) {
        if (window.juce?.onTempoChanged) {
            window.juce.onTempoChanged(bpm);
        }
    }

    onSettingsClicked() {
        if (window.juce?.onSettingsClicked) {
            window.juce.onSettingsClicked();
        }
    }

    onLinkClicked() {
        if (window.juce?.onLinkClicked) {
            window.juce.onLinkClicked();
        }
    }

    onUploadClicked() {
        if (window.juce?.onUploadClicked) {
            window.juce.onUploadClicked();
        }
    }

    onPauseClicked() {
        if (window.juce?.onPauseClicked) {
            window.juce.onPauseClicked();
        }
    }

    onProgramChanged(programValue) {
        if (window.juce?.onProgramChanged) {
            window.juce.onProgramChanged(programValue);
        }
    }

    onLoopPositionChanged(position) {
        if (window.juce?.onLoopPositionChanged) {
            window.juce.onLoopPositionChanged(position);
        }
    }

    // Public API methods for JUCE to call
    setPlayerKitName(playerNumber, kitName) {
        if (this.playerStates[playerNumber]) {
            this.playerStates[playerNumber].kitName = kitName;
            if (playerNumber === this.currentPlayer) {
                this.updateUIForCurrentPlayer();
            }
        }
    }

    setPlayerPattern(playerNumber, patternName) {
        if (this.playerStates[playerNumber]) {
            this.playerStates[playerNumber].selectedPattern = patternName;
            if (playerNumber === this.currentPlayer) {
                this.updateUIForCurrentPlayer();
            }
        }
    }

    setPlayerToggle(playerNumber, toggleType, isActive) {
        if (this.playerStates[playerNumber]) {
            this.playerStates[playerNumber].toggleStates[toggleType] = isActive;
            if (playerNumber === this.currentPlayer) {
                this.updateUIForCurrentPlayer();
            }
        }
    }

    setPlayerSlider(playerNumber, sliderType, value) {
        if (this.playerStates[playerNumber]) {
            this.playerStates[playerNumber].sliderValues[sliderType] = value;
            if (playerNumber === this.currentPlayer) {
                this.updateUIForCurrentPlayer();
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            z-index: 2000;
            font-family: 'Playfair Display', serif;
            animation: fadeIn 0.3s ease;
            box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
}

// Initialize the interface when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.ottoInterface = new OTTOAccurateInterface();

    // Make interface available globally for JUCE integration
    window.OTTO = window.ottoInterface;

    console.log('OTTO Accurate Web Interface (6-Row Layout) loaded successfully');
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.ottoInterface) {
        window.ottoInterface.destroy();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OTTOAccurateInterface;
}
