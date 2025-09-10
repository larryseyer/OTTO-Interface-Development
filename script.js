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

        // Track all event listeners for cleanup
        this.eventListeners = [];
        this.sliderListeners = [];
        this.dropdownListeners = [];
        this.modalListeners = [];
        this.documentListeners = [];

        // Storage error tracking
        this.storageErrors = [];
        this.maxStorageErrors = 10;  // Keep last 10 errors for debugging
        
        // Centralized state management
        this.stateUpdateQueue = [];
        this.isProcessingStateUpdate = false;
        this.stateUpdateTimer = null;
        this.stateUpdateDelay = 50; // 50ms batch delay
        
        // Save management - single source of truth
        this.saveTimers = {
            preset: null,
            appState: null,
            patternGroups: null
        };
        this.saveDelays = {
            preset: 500,      // 500ms for preset changes
            appState: 1000,   // 1s for app state changes
            patternGroups: 300 // 300ms for pattern group changes
        };
        this.pendingSaves = new Set(); // Track what needs saving

        // Player state tracking for all possible players
        this.playerStates = {};
        for (let i = 1; i <= this.maxPlayers; i++) {
            this.playerStates[i] = {
                presetName: 'Default',
                kitName: 'Acoustic',
                patternGroup: 'favorites',  // Default pattern group
                selectedPattern: 'basic',  // Pattern 1 is "Basic"
                kitMixerActive: false,
                muted: false,  // Track mute state
                toggleStates: {
                    none: false,
                    auto: true,  // All players now start with Auto active
                    manual: false,
                    stick: false,
                    ride: false,
                    lock: false
                },
                fillStates: {
                    now: false,
                    4: false,
                    8: false,
                    16: true,  // Fill 16 selected by default
                    32: false,
                    solo: false
                },
                sliderValues: {
                    swing: 10,  // Changed from 25 to 10
                    energy: 50,
                    volume: 75
                },
                // Note: These appear to be mini sliders in row 3 that haven't been implemented yet
                // Keeping them for now but they should be clarified/removed if not needed
                miniSliders: {
                    1: 50,
                    2: 30,
                    3: 80
                }
            };
        }

        this.init();
    }
    
    // Centralized State Management System
    updatePlayerState(playerNumber, updates, callback = null) {
        // Queue the state update
        this.stateUpdateQueue.push({
            type: 'player',
            playerNumber,
            updates,
            callback,
            timestamp: Date.now()
        });
        
        this.processStateUpdateQueue();
    }
    
    updateGlobalState(updates, callback = null) {
        // Queue global state updates (tempo, isPlaying, etc.)
        this.stateUpdateQueue.push({
            type: 'global',
            updates,
            callback,
            timestamp: Date.now()
        });
        
        this.processStateUpdateQueue();
    }
    
    processStateUpdateQueue() {
        // Prevent concurrent processing
        if (this.isProcessingStateUpdate) {
            return;
        }
        
        // Clear existing timer
        if (this.stateUpdateTimer) {
            clearTimeout(this.stateUpdateTimer);
        }
        
        // Batch process updates after delay
        this.stateUpdateTimer = setTimeout(() => {
            this.isProcessingStateUpdate = true;
            
            // Process all queued updates
            const updates = [...this.stateUpdateQueue];
            this.stateUpdateQueue = [];
            
            // Group updates by type for efficiency
            const playerUpdates = {};
            const globalUpdates = {};
            const callbacks = [];
            
            updates.forEach(update => {
                if (update.type === 'player') {
                    if (!playerUpdates[update.playerNumber]) {
                        playerUpdates[update.playerNumber] = {};
                    }
                    Object.assign(playerUpdates[update.playerNumber], update.updates);
                } else if (update.type === 'global') {
                    Object.assign(globalUpdates, update.updates);
                }
                
                if (update.callback) {
                    callbacks.push(update.callback);
                }
            });
            
            // Apply player state updates
            for (const [playerNum, updates] of Object.entries(playerUpdates)) {
                this.applyPlayerStateUpdates(parseInt(playerNum), updates);
            }
            
            // Apply global state updates
            this.applyGlobalStateUpdates(globalUpdates);
            
            // Execute callbacks
            callbacks.forEach(cb => {
                try {
                    cb();
                } catch (e) {
                    console.error('Error in state update callback:', e);
                }
            });
            
            // Trigger saves as needed
            this.processPendingSaves();
            
            this.isProcessingStateUpdate = false;
            
            // Process any new updates that came in while we were processing
            if (this.stateUpdateQueue.length > 0) {
                this.processStateUpdateQueue();
            }
        }, this.stateUpdateDelay);
    }
    
    applyPlayerStateUpdates(playerNumber, updates) {
        if (!this.playerStates[playerNumber]) {
            console.error(`Player ${playerNumber} does not exist`);
            return;
        }
        
        // Deep merge updates
        for (const [key, value] of Object.entries(updates)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                // Merge nested objects
                this.playerStates[playerNumber][key] = {
                    ...this.playerStates[playerNumber][key],
                    ...value
                };
            } else {
                // Direct assignment for primitives and arrays
                this.playerStates[playerNumber][key] = value;
            }
        }
        
        // Mark preset as needing save
        this.pendingSaves.add('preset');
    }
    
    applyGlobalStateUpdates(updates) {
        for (const [key, value] of Object.entries(updates)) {
            this[key] = value;
        }
        
        // Mark app state as needing save
        if (Object.keys(updates).length > 0) {
            this.pendingSaves.add('appState');
        }
    }
    
    // Unified save system - prevents race conditions
    scheduleSave(saveType, forceImmediate = false) {
        // Clear existing timer for this save type
        if (this.saveTimers[saveType]) {
            clearTimeout(this.saveTimers[saveType]);
        }
        
        // Add to pending saves
        this.pendingSaves.add(saveType);
        
        const delay = forceImmediate ? 0 : this.saveDelays[saveType];
        
        // Schedule the save
        this.saveTimers[saveType] = setTimeout(() => {
            this.executeSave(saveType);
            this.pendingSaves.delete(saveType);
            this.saveTimers[saveType] = null;
        }, delay);
    }
    
    executeSave(saveType) {
        switch (saveType) {
            case 'preset':
                if (!this.isPresetLocked(this.currentPreset)) {
                    this.savePreset();
                    console.log(`Saved preset: ${this.currentPreset}`);
                }
                break;
                
            case 'appState':
                this.saveAppStateToStorage();
                console.log('Saved app state');
                break;
                
            case 'patternGroups':
                this.savePatternGroups();
                console.log('Saved pattern groups');
                break;
                
            default:
                console.warn(`Unknown save type: ${saveType}`);
        }
    }
    
    processPendingSaves() {
        // Schedule all pending saves
        this.pendingSaves.forEach(saveType => {
            this.scheduleSave(saveType);
        });
    }

    // Safe localStorage wrapper methods
    safeLocalStorageSet(key, value) {
        try {
            // Check if localStorage is available
            if (typeof(Storage) === "undefined") {
                throw new Error('localStorage not supported');
            }

            // Try to serialize the value first
            const serialized = JSON.stringify(value);

            // Check approximate size (2 bytes per character for UTF-16)
            const approxSize = serialized.length * 2;
            const fiveMB = 5 * 1024 * 1024; // 5MB typical limit

            if (approxSize > fiveMB) {
                console.warn(`Data size (${(approxSize / 1024 / 1024).toFixed(2)}MB) may exceed localStorage limit`);
                // Try to clear old data if needed
                this.clearOldStorageData();
            }

            localStorage.setItem(key, serialized);
            return true;

        } catch (e) {
            // Handle different error types
            let errorMessage = '';
            let errorType = 'UNKNOWN';

            if (e.name === 'QuotaExceededError' ||
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                (e.code && e.code === 22)) {
                errorType = 'QUOTA_EXCEEDED';
                errorMessage = 'Storage quota exceeded';

                // Try to free up space
                if (this.handleQuotaExceeded(key, value)) {
                    return true; // Successfully saved after cleanup
                }

            } else if (e.message && e.message.includes('circular')) {
                errorType = 'CIRCULAR_REFERENCE';
                errorMessage = 'Data contains circular references';

            } else if (e.name === 'SecurityError') {
                errorType = 'SECURITY_ERROR';
                errorMessage = 'localStorage access denied (private browsing?)';

            } else {
                errorMessage = e.message || 'Unknown storage error';
            }

            // Log the error
            this.logStorageError(key, errorType, errorMessage);

            // Show user notification for critical errors (only if method is available)
            if ((errorType === 'QUOTA_EXCEEDED' || errorType === 'SECURITY_ERROR') && this.showNotification) {
                this.showNotification(`Storage error: ${errorMessage}. Some settings may not be saved.`, 'error');
            }

            return false;
        }
    }

    safeLocalStorageGet(key, defaultValue = null) {
        try {
            // Check if localStorage is available
            if (typeof(Storage) === "undefined") {
                console.warn('localStorage not supported');
                return defaultValue;
            }

            const stored = localStorage.getItem(key);
            if (stored === null) {
                return defaultValue;
            }

            // Try to parse the stored value
            const parsed = JSON.parse(stored);

            // Validate the parsed data isn't corrupted
            if (this.validateStoredData(key, parsed)) {
                return parsed;
            } else {
                console.warn(`Corrupted data detected for key: ${key}`);
                // Try to recover or return default
                return this.recoverCorruptedData(key, defaultValue);
            }

        } catch (e) {
            // Handle JSON parse errors
            if (e instanceof SyntaxError) {
                console.error(`Failed to parse stored data for key: ${key}`, e);
                this.logStorageError(key, 'PARSE_ERROR', 'Corrupted data in storage');

                // Try to clear the corrupted data
                try {
                    localStorage.removeItem(key);
                    console.log(`Removed corrupted data for key: ${key}`);
                } catch (removeError) {
                    console.error('Failed to remove corrupted data:', removeError);
                }

                // Notify user if this is important data (only if method is available)
                if ((key.includes('preset') || key.includes('state')) && this.showNotification) {
                    this.showNotification('Some saved data was corrupted and has been reset.', 'warning');
                }
            } else {
                console.error(`Storage error for key: ${key}`, e);
                this.logStorageError(key, 'ACCESS_ERROR', e.message);
            }

            return defaultValue;
        }
    }

    validateStoredData(key, data) {
        // Validate based on the key type
        if (key === 'otto_presets') {
            return data && typeof data === 'object';
        } else if (key === 'otto_app_state') {
            return data && typeof data === 'object' &&
                   typeof data.currentPreset === 'string' &&
                   typeof data.tempo === 'number';
        } else if (key === 'ottoPatternGroups') {
            return data && typeof data === 'object';
        } else if (key === 'otto_preset_locks') {
            return data && typeof data === 'object';
        }

        // Default validation - just check it's not null/undefined
        return data !== null && data !== undefined;
    }

    recoverCorruptedData(key, defaultValue) {
        // Try to recover based on key type
        console.log(`Attempting to recover data for key: ${key}`);

        // For presets, try to at least save a default preset
        if (key === 'otto_presets') {
            const recovered = {
                'default': this.createPresetFromCurrentState('Default')
            };
            this.safeLocalStorageSet(key, recovered);
            return recovered;
        }

        // For other data, return the default
        return defaultValue;
    }

    handleQuotaExceeded(key, value) {
        console.log('Attempting to handle quota exceeded error...');

        // Try different strategies to free up space

        // Strategy 1: Clear old error logs
        this.storageErrors = [];

        // Strategy 2: Remove old backup data if it exists
        const backupKeys = ['otto_backup', 'otto_history', 'otto_temp'];
        backupKeys.forEach(backupKey => {
            try {
                localStorage.removeItem(backupKey);
                console.log(`Removed backup data: ${backupKey}`);
            } catch (e) {
                // Ignore errors when removing
            }
        });

        // Strategy 3: Compress preset data by removing timestamps
        if (key === 'otto_presets' && value) {
            const compressed = {};
            for (const [presetKey, preset] of Object.entries(value)) {
                compressed[presetKey] = {
                    ...preset,
                    timestamp: undefined  // Remove timestamps to save space
                };
            }

            try {
                localStorage.setItem(key, JSON.stringify(compressed));
                console.log('Successfully saved compressed data');
                return true;
            } catch (e) {
                console.error('Still unable to save after compression:', e);
            }
        }

        // Strategy 4: As last resort, clear least important data
        if (confirm('Storage is full. Clear pattern groups to make space? (Presets will be preserved)')) {
            try {
                localStorage.removeItem('ottoPatternGroups');
                localStorage.setItem(key, JSON.stringify(value));
                if (this.showNotification) {
                    this.showNotification('Storage cleared. Pattern groups have been reset.', 'warning');
                }
                return true;
            } catch (e) {
                console.error('Unable to save even after clearing pattern groups:', e);
            }
        }

        return false;
    }

    clearOldStorageData() {
        // Clear old or temporary data to free up space
        const tempKeys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('_temp') || key.includes('_old') || key.includes('_backup'))) {
                tempKeys.push(key);
            }
        }

        tempKeys.forEach(key => {
            try {
                localStorage.removeItem(key);
                console.log(`Cleared old data: ${key}`);
            } catch (e) {
                console.error(`Failed to clear ${key}:`, e);
            }
        });
    }

    logStorageError(key, errorType, message) {
        const error = {
            key,
            errorType,
            message,
            timestamp: Date.now()
        };

        this.storageErrors.push(error);

        // Keep only last N errors
        if (this.storageErrors.length > this.maxStorageErrors) {
            this.storageErrors.shift();
        }

        console.error(`Storage Error [${errorType}] for key '${key}': ${message}`);
    }

    getStorageStatus() {
        // Get current storage usage estimate
        if (navigator.storage && navigator.storage.estimate) {
            return navigator.storage.estimate().then(estimate => {
                const percentUsed = (estimate.usage / estimate.quota * 100).toFixed(2);
                console.log(`Storage: ${percentUsed}% used (${estimate.usage} of ${estimate.quota} bytes)`);
                return {
                    usage: estimate.usage,
                    quota: estimate.quota,
                    percentUsed: parseFloat(percentUsed)
                };
            });
        }

        // Fallback: estimate based on localStorage content
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }

        const estimatedQuota = 5 * 1024 * 1024; // 5MB typical limit
        const percentUsed = (totalSize / estimatedQuota * 100).toFixed(2);

        return Promise.resolve({
            usage: totalSize * 2, // Approximate bytes (UTF-16)
            quota: estimatedQuota,
            percentUsed: parseFloat(percentUsed)
        });
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

        // Initialize preset lock states - lock Default preset by default to protect it
        this.presetLocks = this.loadPresetLocksFromStorage() || {
            'default': true  // Lock the Default preset to prevent auto-save modifications
        };

        // Enable auto-save for presets
        this.enableAutoSave = true;

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

        // App state auto-save is handled by centralized system
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

        // Use safe wrapper with error handling
        this.safeLocalStorageSet('otto_app_state', appState);
    }

    loadAppStateFromStorage() {
        // Use safe wrapper with error handling and validation
        return this.safeLocalStorageGet('otto_app_state', null);
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
        // Use safe wrapper with error handling
        this.safeLocalStorageSet('otto_preset_locks', this.presetLocks);
    }

    loadPresetLocksFromStorage() {
        // Use safe wrapper with error handling and validation
        return this.safeLocalStorageGet('otto_preset_locks', {});
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
        // Preset modal controls
        const presetEditBtn = document.getElementById('preset-edit-btn');
        const presetModal = document.getElementById('preset-modal');
        const presetModalClose = document.getElementById('preset-modal-close');
        const presetList = document.getElementById('preset-list');
        const presetUndoBtn = document.getElementById('preset-undo-btn');
        const presetNewBtn = document.getElementById('preset-new-btn');
        const factoryResetBtn = document.getElementById('factory-reset-btn');
        const presetNameInput = document.getElementById('preset-name-input');

        // Clean up existing preset management listeners
        this.modalListeners = this.modalListeners.filter(({ element }) => {
            return element !== presetEditBtn &&
                   element !== presetModalClose &&
                   element !== presetModal &&
                   element !== presetUndoBtn &&
                   element !== presetNewBtn &&
                   element !== factoryResetBtn &&
                   element !== presetNameInput;
        });

        // Open preset modal
        if (presetEditBtn) {
            const editHandler = (e) => {
                e.stopPropagation();  // Prevent dropdown from triggering
                this.openPresetModal();
            };
            this.addEventListener(presetEditBtn, 'click', editHandler, this.modalListeners);
        }

        // Close preset modal
        if (presetModalClose) {
            const closeHandler = () => {
                this.closePresetModal();
            };
            this.addEventListener(presetModalClose, 'click', closeHandler, this.modalListeners);
        }

        // Click outside to close
        if (presetModal) {
            const outsideClickHandler = (e) => {
                if (e.target === presetModal) {
                    this.closePresetModal();
                }
            };
            this.addEventListener(presetModal, 'click', outsideClickHandler, this.modalListeners);
        }

        // Undo button
        if (presetUndoBtn) {
            const undoHandler = () => {
                this.undoPresetChange();
            };
            this.addEventListener(presetUndoBtn, 'click', undoHandler, this.modalListeners);
        }

        // New preset button
        if (presetNewBtn) {
            const newHandler = () => {
                this.createNewDefaultPreset();
            };
            this.addEventListener(presetNewBtn, 'click', newHandler, this.modalListeners);
        }

        // Factory reset button
        if (factoryResetBtn) {
            const resetHandler = () => {
                this.resetToFactoryDefaults();
            };
            this.addEventListener(factoryResetBtn, 'click', resetHandler, this.modalListeners);
        }

        // Handle enter key in preset name input
        if (presetNameInput) {
            const keypressHandler = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.savePresetAs(presetNameInput.value);
                    presetNameInput.value = '';
                }
            };
            this.addEventListener(presetNameInput, 'keypress', keypressHandler, this.modalListeners);
        }

        // Initial render of preset list
        this.renderPresetList();
    }

    setupSettingsWindow() {
        const settingsModal = document.getElementById('settings-modal');
        const settingsModalClose = document.getElementById('settings-modal-close');
        const settingsFactoryResetBtn = document.getElementById('settings-factory-reset-btn');

        // Close settings modal
        if (settingsModalClose) {
            settingsModalClose.addEventListener('click', () => {
                if (settingsModal) {
                    settingsModal.classList.remove('active');
                }
            });
        }

        // Close modal when clicking outside
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    settingsModal.classList.remove('active');
                }
            });
        }

        // Factory reset button in settings
        if (settingsFactoryResetBtn) {
            settingsFactoryResetBtn.addEventListener('click', () => {
                this.resetToFactoryDefaults();
                // Close settings modal after reset
                if (settingsModal) {
                    settingsModal.classList.remove('active');
                }
            });
        }
    }

    setupAllModals() {
        // Setup Link Modal
        this.setupModalWindow('link-modal', 'link-modal-close');

        // Setup Mixer Modal
        this.setupModalWindow('mixer-modal', 'mixer-modal-close');

        // Setup Kit Edit Modal
        this.setupModalWindow('kit-edit-modal', 'kit-edit-modal-close');

        // Setup Favorites Modal
        this.setupModalWindow('favorites-modal', 'favorites-modal-close');

        // Setup Cloud Modal
        this.setupModalWindow('cloud-modal', 'cloud-modal-close');
    }

    setupModalWindow(modalId) {
        const modal = document.getElementById(modalId);
        const closeBtn = modal?.querySelector('.modal-close');

        if (modal && closeBtn) {
            // Close button click
            const closeHandler = () => {
                modal.classList.remove('active');
            };
            this.addEventListener(closeBtn, 'click', closeHandler, this.modalListeners);

            // Click outside to close
            const outsideClickHandler = (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            };
            this.addEventListener(modal, 'click', outsideClickHandler, this.modalListeners);
        }
    }

    openLinkModal() {
        const modal = document.getElementById('link-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    openCloudModal() {
        const modal = document.getElementById('cloud-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    openMixerModal() {
        const modal = document.getElementById('mixer-modal');
        const kitName = document.getElementById('mixer-kit-name');
        if (modal) {
            modal.classList.add('active');
            // Update kit name in title - mixer belongs to the kit, not the player
            if (kitName) {
                const currentKitName = this.playerStates[this.currentPlayer].kitName;
                kitName.textContent = currentKitName;
            }
        }
    }

    openKitEditModal() {
        const modal = document.getElementById('kit-edit-modal');
        if (modal) {
            modal.classList.add('active');
            // Note: Kit editing is global - editing a kit affects all players using it
        }
    }

    togglePatternEditMode() {
        this.isEditMode = !this.isEditMode;
        const panel = document.getElementById('pattern-edit-panel');
        const deleteBtn = document.getElementById('group-delete-btn');
        const editBtn = document.querySelector('.edit-pattern-btn');

        if (this.isEditMode) {
            // Enter edit mode
            panel.classList.add('active');
            deleteBtn.style.display = 'flex';
            editBtn.classList.add('active');

            // Load available patterns
            this.loadAvailablePatterns();

            // Setup drag and drop for existing pattern buttons
            this.enablePatternEditDragDrop();

            // Setup new group control buttons
            this.setupPatternPanelControls();
        } else {
            // Exit edit mode
            panel.classList.remove('active');
            deleteBtn.style.display = 'none';
            editBtn.classList.remove('active');

            // Disable drag and drop
            this.disablePatternEditDragDrop();
        }
    }

    enablePatternEditDragDrop() {
        // Make existing pattern buttons drop targets
        const patternButtons = document.querySelectorAll('.pattern-btn');
        patternButtons.forEach(button => {
            button.addEventListener('dragover', this.handleDragOver);
            button.addEventListener('dragleave', this.handleDragLeave);
            button.addEventListener('drop', this.handlePatternDrop.bind(this));
            button.classList.add('edit-mode');
        });
    }

    disablePatternEditDragDrop() {
        // Remove drag-drop from pattern buttons
        const patternButtons = document.querySelectorAll('.pattern-btn');
        patternButtons.forEach(button => {
            button.removeEventListener('dragover', this.handleDragOver);
            button.removeEventListener('dragleave', this.handleDragLeave);
            button.removeEventListener('drop', this.handlePatternDrop.bind(this));
            button.classList.remove('edit-mode');
        });
    }

    setupPatternPanelControls() {
        // Add new group button
        const addGroupBtn = document.getElementById('add-group-btn');
        const renameGroupBtn = document.getElementById('rename-group-btn');

        // Remove existing listeners to avoid duplicates
        if (this.addGroupHandler) {
            addGroupBtn.removeEventListener('click', this.addGroupHandler);
        }
        if (this.renameGroupHandler) {
            renameGroupBtn.removeEventListener('click', this.renameGroupHandler);
        }

        // Create new handlers
        this.addGroupHandler = () => {
            const groupName = prompt('Enter new group name:');
            if (!groupName || !groupName.trim()) return;

            const trimmedName = groupName.trim();
            const groupKey = trimmedName.toLowerCase().replace(/\s+/g, '-');

            // Check if group already exists
            if (this.patternGroups[groupKey]) {
                alert('A group with this name already exists');
                return;
            }

            // Create new group with empty patterns array
            this.patternGroups[groupKey] = {
                name: trimmedName,
                patterns: Array(16).fill(''),  // Initialize with 16 empty slots for 4x4 grid
                selectedPattern: null
            };

            // Save to storage
            this.savePatternGroups();

            // Update dropdown
            this.updatePatternGroupDropdown();

            // Select the new group in the dropdown
            const groupSelected = document.getElementById('group-selected');
            if (groupSelected) {
                groupSelected.querySelector('.dropdown-text').textContent = trimmedName;
            }

            // Switch the current player to use the new group
            this.playerStates[this.currentPlayer].patternGroup = groupKey;

            // Update the pattern grid to show the new (empty) group
            this.updateMainPatternGrid(this.patternGroups[groupKey].patterns);

            // Save the state
            this.scheduleSave('preset');

            // Show notification
            this.showNotification(`Group "${trimmedName}" created successfully`);
        };

        this.renameGroupHandler = () => {
            const currentGroup = this.playerStates[this.currentPlayer].patternGroup;

            // Don't allow renaming default groups
            if (currentGroup === 'favorites') {
                alert('Cannot rename the Favorites group');
                return;
            }

            const currentGroupData = this.patternGroups[currentGroup];
            if (!currentGroupData) {
                alert('No group selected');
                return;
            }

            const newName = prompt('Enter new name for group:', currentGroupData.name);
            if (!newName || !newName.trim()) return;

            const trimmedName = newName.trim();
            const newKey = trimmedName.toLowerCase().replace(/\s+/g, '-');

            // If the key changes, we need to handle that
            if (newKey !== currentGroup) {
                // Check if new key already exists
                if (this.patternGroups[newKey]) {
                    alert('A group with this name already exists');
                    return;
                }

                // Copy the group with new key
                this.patternGroups[newKey] = {
                    ...currentGroupData,
                    name: trimmedName
                };

                // Delete old group
                delete this.patternGroups[currentGroup];

                // Update any players using the old group
                Object.values(this.playerStates).forEach(state => {
                    if (state.patternGroup === currentGroup) {
                        state.patternGroup = newKey;
                    }
                });

                // Update the dropdown selected text if this is the current group
                const groupSelected = document.getElementById('group-selected');
                if (groupSelected) {
                    groupSelected.querySelector('.dropdown-text').textContent = trimmedName;
                }
            } else {
                // Just update the display name
                currentGroupData.name = trimmedName;

                // Update the dropdown selected text
                const groupSelected = document.getElementById('group-selected');
                if (groupSelected) {
                    groupSelected.querySelector('.dropdown-text').textContent = trimmedName;
                }
            }

            // Save to storage
            this.savePatternGroups();

            // Update dropdown
            this.updatePatternGroupDropdown();

            // Save the state
            this.scheduleSave('preset');

            // Show notification
            this.showNotification(`Group renamed to "${trimmedName}"`);
        };

        // Add the event listeners
        addGroupBtn.addEventListener('click', this.addGroupHandler);
        renameGroupBtn.addEventListener('click', this.renameGroupHandler);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        e.currentTarget.classList.add('drag-over');
    }


    handleDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    handlePatternDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');

        const patternName = e.dataTransfer.getData('text/plain');
        const buttonIndex = Array.from(e.currentTarget.parentElement.children).indexOf(e.currentTarget) + 1;

        // Update button text with first 8 characters
        const shortName = patternName.substring(0, 8);
        e.currentTarget.textContent = shortName;

        // Save to current pattern group
        const currentGroup = this.playerStates[this.currentPlayer].patternGroup;
        this.savePatternToGroup(currentGroup, buttonIndex, patternName);

        // Update the player's state
        const patternKey = shortName.toLowerCase().replace(/\s+/g, '-');
        e.currentTarget.dataset.pattern = patternKey;
    }

    filterPatterns(searchTerm) {
        const patterns = document.querySelectorAll('.pattern-list-item');
        patterns.forEach(pattern => {
            const name = pattern.textContent.toLowerCase();
            if (name.includes(searchTerm.toLowerCase())) {
                pattern.style.display = 'block';
            } else {
                pattern.style.display = 'none';
            }
        });
    }

    deleteCurrentPatternGroup() {
        const currentGroup = this.playerStates[this.currentPlayer].patternGroup;
        if (currentGroup === 'favorites') {
            alert('Cannot delete the Favorites group');
            return;
        }

        if (confirm(`Delete pattern group "${currentGroup}"?`)) {
            // Remove from storage using safe wrapper
            const groups = this.safeLocalStorageGet('ottoPatternGroups', {});
            delete groups[currentGroup];
            this.safeLocalStorageSet('ottoPatternGroups', groups);

            // Switch to favorites
            this.playerStates[this.currentPlayer].patternGroup = 'favorites';
            this.updatePatternGrid();

            // Exit edit mode
            this.togglePatternEditMode();
        }
    }

    savePatternToGroup(groupName, buttonIndex, patternName) {
        const groups = this.safeLocalStorageGet('ottoPatternGroups', {});

        if (!groups[groupName]) {
            groups[groupName] = {
                name: groupName,
                patterns: {},
                selectedPattern: null
            };
        }

        groups[groupName].patterns[buttonIndex] = patternName;
        this.safeLocalStorageSet('ottoPatternGroups', groups);

        console.log(`Saved pattern "${patternName}" to group "${groupName}" at position ${buttonIndex}`);
    }

    initializePatternGroupEditor() {
        // Load pattern groups from storage
        this.loadPatternGroups();

        // Load available MIDI patterns
        this.loadAvailablePatterns();

        // Setup drag and drop AFTER patterns are loaded
        setTimeout(() => {
            this.setupPatternDragDrop();
        }, 100);

        // Setup group management controls
        this.setupGroupManagementControls();

        // Load current group into editor
        this.loadGroupIntoEditor(this.playerStates[this.currentPlayer].patternGroup);
    }

    loadPatternGroups() {
        // Load saved pattern groups from localStorage with error handling
        const savedGroups = this.safeLocalStorageGet('ottoPatternGroups', null);
        if (savedGroups) {
            this.patternGroups = savedGroups;
        } else {
            // Initialize with default groups
            this.patternGroups = {
                'favorites': {
                    name: 'Favorites',
                    patterns: [
                        'Basic', 'Bassa', 'BusyBeat', 'Buyoun',
                        'ChaCha', 'Funk', 'Jazz', 'Just Hat',
                        'Just Kick', 'Polka', 'Push', 'Shuffle',
                        'Ska', 'Surf', 'Swing', 'Waltz'
                    ],
                    selectedPattern: 'Funk'
                }
            };
        }
    }

    loadAvailablePatterns() {
        // Simulated list of MIDI files from Assets/MidiFiles/Grooves
        // In production, this would be fetched from the server
        const midiFiles = [
            'Afro Cuban Pop', 'Afro Fusion', 'Ain\'t it Sad Country', 'Alt Country',
            'Alt Rock', 'Bad News Country', 'Badu Beat', 'Basic House', 'Basic Reggae',
            'Basic Swing', 'Basic', 'Big Funk', 'Boogie Disco', 'Boogie Woogie',
            'Bossa Fusion', 'Bossa Straight', 'Brazilian Ballad', 'Brazilian Carnival',
            'British Ballad', 'Busy Bossa', 'BusyBeat', 'Buyoun', 'ChaCha', 'Chicago Blues',
            'Classic Country', 'Classic Motown', 'Classic Soul', 'Cool Jazz', 'Country Ballad',
            'Country Rock', 'Country Shuffle', 'Country Train', 'Crescent City', 'DC Funk',
            'Deep House', 'Detroit Funk', 'Disco', 'Dixieland', 'Doo Wop', 'Dream Pop',
            'Dubstep', 'Easy Swing', 'Electro Pop', 'Emo', 'Ethereal', 'Funk', 'Funk Rock',
            'Garage Rock', 'Gospel', 'Grunge', 'Hard Rock', 'Hip Hop', 'House', 'Indie Pop',
            'Indie Rock', 'Island Reggae', 'Jazz', 'Jazz Fusion', 'Just Hat', 'Just Kick',
            'Latin Jazz', 'Latin Pop', 'Light Funk', 'Linear Funk', 'Memphis Soul', 'Metal',
            'Modern Country', 'Modern Jazz', 'Modern RnB', 'Motown', 'Neo Soul', 'New Wave',
            'Old School Hip Hop', 'Outlaw Country', 'Polka', 'Pop Ballad', 'Pop Punk',
            'Pop Rock', 'Power Ballad', 'Progressive Rock', 'Psychedelic Rock', 'Punk',
            'Push', 'Reggae', 'Reggaeton', 'Retro', 'RnB', 'Rock Ballad', 'Rockabilly',
            'Salsa', 'Samba', 'Shuffle', 'Ska', 'Slow Blues', 'Slow Jam', 'Smooth Jazz',
            'Soul', 'Southern Rock', 'Stadium Rock', 'Surf', 'Swing', 'Synth Pop',
            'Tech House', 'Techno', 'Trap', 'Trip Hop', 'Waltz', 'West Coast Jazz'
        ];

        // Populate the available patterns list
        const patternsList = document.getElementById('available-patterns-list');
        if (patternsList) {
            patternsList.innerHTML = '';
            midiFiles.forEach(file => {
                const patternItem = document.createElement('div');
                patternItem.className = 'pattern-list-item';
                patternItem.textContent = file; // Show full name in the list
                patternItem.dataset.fullName = file;
                patternItem.dataset.shortName = file.substring(0, 8); // Store 8-char version
                patternItem.draggable = true;

                // Add drag event listeners
                patternItem.addEventListener('dragstart', (e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('text/plain', file);
                    patternItem.classList.add('dragging');
                });

                patternItem.addEventListener('dragend', () => {
                    patternItem.classList.remove('dragging');
                });

                patternsList.appendChild(patternItem);
            });
        }

        // Update the 'all' group with all patterns
        if (this.patternGroups && this.patternGroups.all) {
            this.patternGroups.all.patterns = midiFiles.map(f => f.substring(0, 8));
        }
    }

    setupPatternDragDrop() {
        const patternItems = document.querySelectorAll('.pattern-item');
        const dropZones = document.querySelectorAll('.pattern-drop-zone');

        // Clean up existing drag-drop listeners
        this.eventListeners = this.eventListeners.filter(({ element }) => {
            const isPatternItem = element && element.classList && element.classList.contains('pattern-item');
            const isDropZone = element && element.classList && element.classList.contains('pattern-drop-zone');
            return !isPatternItem && !isDropZone;
        });

        // Make pattern items draggable
        patternItems.forEach(item => {
            const dragStartHandler = (e) => {
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', item.dataset.pattern);
                item.classList.add('dragging');
            };

            const dragEndHandler = () => {
                item.classList.remove('dragging');
            };

            this.addEventListener(item, 'dragstart', dragStartHandler);
            this.addEventListener(item, 'dragend', dragEndHandler);
        });

        // Set up drop zones
        dropZones.forEach((zone, index) => {
            const dragOverHandler = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                zone.classList.add('drag-over');
            };

            const dragLeaveHandler = () => {
                zone.classList.remove('drag-over');
            };

            const dropHandler = (e) => {
                e.preventDefault();
                zone.classList.remove('drag-over');

                const patternName = e.dataTransfer.getData('text/plain');
                if (patternName) {
                    // Add pattern to this slot
                    zone.classList.add('has-pattern');
                    zone.dataset.pattern = patternName;
                    zone.querySelector('.pattern-name').textContent = patternName;

                    // Add remove button if not present
                    if (!zone.querySelector('.pattern-remove')) {
                        const removeBtn = document.createElement('button');
                        removeBtn.className = 'pattern-remove';
                        removeBtn.innerHTML = '×';

                        const removeBtnHandler = (e) => {
                            e.stopPropagation();
                            zone.classList.remove('has-pattern');
                            zone.dataset.pattern = '';
                            zone.querySelector('.pattern-name').textContent = `Pattern ${index + 1}`;
                            removeBtn.remove();

                            // Update the pattern group
                            this.savePatternToGroup(index, '');
                        };

                        this.addEventListener(removeBtn, 'click', removeBtnHandler);
                        zone.appendChild(removeBtn);
                    }

                    // Save to current pattern group
                    this.savePatternToGroup(index, patternName);
                }
            };

            // Click to clear
            const clickHandler = () => {
                if (!zone.classList.contains('has-pattern')) return;

                zone.classList.remove('has-pattern');
                zone.dataset.pattern = '';
                zone.querySelector('.pattern-name').textContent = `Pattern ${index + 1}`;
                const removeBtn = zone.querySelector('.pattern-remove');
                if (removeBtn) removeBtn.remove();

                // Update the pattern group
                this.savePatternToGroup(index, '');
            };

            this.addEventListener(zone, 'dragover', dragOverHandler);
            this.addEventListener(zone, 'dragleave', dragLeaveHandler);
            this.addEventListener(zone, 'drop', dropHandler);
            this.addEventListener(zone, 'click', clickHandler);
        });
    }

    setupGroupManagementControls() {
        const createBtn = document.getElementById('create-group-btn');
        const deleteBtn = document.getElementById('delete-group-btn');
        const newGroupInput = document.getElementById('new-group-name');

        // New editor dropdown elements
        const editorDropdown = document.getElementById('editor-group-dropdown');
        const editorSelected = document.getElementById('editor-group-selected');
        const editorOptions = document.getElementById('editor-group-options');
        const editorPrevBtn = document.querySelector('.editor-group-prev');
        const editorNextBtn = document.querySelector('.editor-group-next');

        // Keep track of current group in editor
        this.currentEditorGroup = this.playerStates[this.currentPlayer].patternGroup || 'favorites';

        // Create new group
        if (createBtn && newGroupInput) {
            createBtn.addEventListener('click', () => {
                const groupName = newGroupInput.value.trim();
                if (!groupName) {
                    alert('Please enter a group name');
                    return;
                }

                // Create sanitized key from name
                const groupKey = groupName.toLowerCase().replace(/\s+/g, '-');

                if (this.patternGroups[groupKey]) {
                    alert('A group with this name already exists');
                    return;
                }

                // Create new group
                this.patternGroups[groupKey] = {
                    name: groupName,
                    patterns: [],
                    selectedPattern: null
                };

                // Select the new group in editor
                this.switchEditorGroup(groupKey);

                // Clear input
                newGroupInput.value = '';

                // Save to storage
                this.savePatternGroups();

                // Update both dropdowns
                this.updateEditorGroupDropdown();
                this.updatePatternGroupDropdown();
            });
        }

        // Delete group button (now the trash icon)
        const deleteIconBtn = document.getElementById('editor-group-delete-btn');
        if (deleteIconBtn) {
            deleteIconBtn.addEventListener('click', () => {
                const currentGroup = this.currentEditorGroup;

                if (currentGroup === 'favorites') {
                    alert('Cannot delete the Favorites group');
                    return;
                }

                if (confirm(`Delete group "${this.patternGroups[currentGroup].name}"?`)) {
                    delete this.patternGroups[currentGroup];

                    // Switch to favorites
                    this.switchEditorGroup('favorites');

                    // Save to storage
                    this.savePatternGroups();

                    // Update both dropdowns
                    this.updateEditorGroupDropdown();
                    this.updatePatternGroupDropdown();
                }
            });
        }

        // Setup editor dropdown and navigation
        if (editorDropdown && editorSelected && editorOptions) {
            // Populate dropdown options
            this.updateEditorGroupDropdown();

            // Toggle dropdown on click
            editorSelected.addEventListener('click', (e) => {
                e.stopPropagation();
                editorDropdown.classList.toggle('active');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!editorDropdown.contains(e.target)) {
                    editorDropdown.classList.remove('active');
                }
            });
        }

        // Setup chevron navigation
        if (editorPrevBtn) {
            editorPrevBtn.addEventListener('click', () => {
                const groups = Object.keys(this.patternGroups);
                const currentIndex = groups.indexOf(this.currentEditorGroup);
                const newIndex = currentIndex > 0 ? currentIndex - 1 : groups.length - 1;
                this.switchEditorGroup(groups[newIndex]);
            });
        }

        if (editorNextBtn) {
            editorNextBtn.addEventListener('click', () => {
                const groups = Object.keys(this.patternGroups);
                const currentIndex = groups.indexOf(this.currentEditorGroup);
                const newIndex = currentIndex < groups.length - 1 ? currentIndex + 1 : 0;
                this.switchEditorGroup(groups[newIndex]);
            });
        }

        // Done button
        const doneBtn = document.getElementById('pattern-group-done-btn');
        if (doneBtn) {
            doneBtn.addEventListener('click', () => {
                const modal = document.getElementById('favorites-modal');
                if (modal) {
                    modal.classList.remove('active');
                }
            });
        }

        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('favorites-modal');
                if (modal && modal.classList.contains('active')) {
                    modal.classList.remove('active');
                }
            }
        });
    }

    loadGroupIntoEditor(groupKey) {
        const group = this.patternGroups[groupKey];
        if (!group) return;

        const dropZones = document.querySelectorAll('.pattern-drop-zone');

        // Clear all zones
        dropZones.forEach(zone => {
            zone.textContent = '';
            zone.classList.remove('has-pattern');
            delete zone.dataset.pattern;
            delete zone.dataset.fullName;
        });

        // Load patterns into zones
        group.patterns.forEach((pattern, index) => {
            if (index < dropZones.length) {
                const zone = dropZones[index];
                zone.textContent = pattern;
                zone.classList.add('has-pattern');
                zone.dataset.pattern = pattern;

                // Add remove button
                const removeBtn = document.createElement('span');
                removeBtn.className = 'remove-pattern';
                removeBtn.innerHTML = '×';
                removeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    zone.textContent = '';
                    zone.classList.remove('has-pattern');
                    delete zone.dataset.pattern;
                    this.saveCurrentGroupState();
                });
                zone.appendChild(removeBtn);
            }
        });

        // Update dropdown display
        const editorSelected = document.getElementById('editor-group-selected');
        if (editorSelected && this.patternGroups[groupKey]) {
            editorSelected.querySelector('.dropdown-text').textContent = this.patternGroups[groupKey].name;
        }

        // Update current editor group
        this.currentEditorGroup = groupKey;
    }

    updateEditorGroupDropdown() {
        const editorOptions = document.getElementById('editor-group-options');
        if (!editorOptions) return;

        // Clear existing options
        editorOptions.innerHTML = '';

        // Add all groups
        Object.keys(this.patternGroups).forEach(key => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = key;
            option.textContent = this.patternGroups[key].name;

            if (key === this.currentEditorGroup) {
                option.classList.add('selected');
            }

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                this.switchEditorGroup(key);

                // Close dropdown
                const dropdown = document.getElementById('editor-group-dropdown');
                if (dropdown) {
                    dropdown.classList.remove('active');
                }
            });

            editorOptions.appendChild(option);
        });
    }

    switchEditorGroup(groupKey) {
        this.currentEditorGroup = groupKey;

        // Update dropdown display
        const editorSelected = document.getElementById('editor-group-selected');
        if (editorSelected) {
            editorSelected.querySelector('.dropdown-text').textContent = this.patternGroups[groupKey].name;
        }

        // Load the group
        this.loadGroupIntoEditor(groupKey);

        // Update selected state in dropdown
        this.updateEditorGroupDropdown();
    }

    saveCurrentGroupState() {
        const groupSelector = document.getElementById('pattern-group-selector');
        if (!groupSelector) return;

        const currentGroup = groupSelector.value;
        const dropZones = document.querySelectorAll('.pattern-drop-zone');

        // Collect patterns from drop zones
        const patterns = [];
        dropZones.forEach(zone => {
            if (zone.dataset.pattern) {
                patterns.push(zone.dataset.pattern);
            }
        });

        // Update the group
        if (this.patternGroups[currentGroup]) {
            this.patternGroups[currentGroup].patterns = patterns;

            // Update the main interface if this is the current player's group
            if (this.playerStates[this.currentPlayer].patternGroup === currentGroup) {
                this.updateMainPatternGrid(patterns);
            }

            // Save to storage
            this.savePatternGroups();
        }
    }

    savePatternGroups() {
        // Use safe wrapper with error handling
        this.safeLocalStorageSet('ottoPatternGroups', this.patternGroups);
    }

    updateMainPatternGrid(patterns) {
        const patternButtons = document.querySelectorAll('.pattern-grid .pattern-btn');

        patternButtons.forEach((btn, index) => {
            if (index < patterns.length && patterns[index]) {
                // Only show first 8 characters on the button
                btn.textContent = patterns[index].substring(0, 8);
                btn.dataset.pattern = patterns[index].toLowerCase().replace(/\s+/g, '-');
                btn.style.display = 'flex';
            } else {
                // Show empty button slot
                btn.textContent = '';
                btn.dataset.pattern = '';
                btn.style.display = 'flex';  // Keep button visible but empty
            }
        });
    }

    updatePatternGroupDropdown() {
        const groupOptions = document.getElementById('group-options');
        if (!groupOptions) return;

        // Clear existing options
        groupOptions.innerHTML = '';

        // Add all groups
        Object.keys(this.patternGroups).forEach(key => {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = key;
            option.textContent = this.patternGroups[key].name;

            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('group-dropdown');
                const selected = document.getElementById('group-selected');

                if (selected) {
                    selected.querySelector('.dropdown-text').textContent = option.textContent;
                }

                if (dropdown) {
                    dropdown.classList.remove('active');
                }

                this.onPatternGroupChanged(this.currentPlayer, key);
                this.scheduleSave('preset');
            });

            groupOptions.appendChild(option);
        });
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
        if (!preset) {
            console.error(`Preset "${key}" not found`);
            return;
        }

        console.log(`Loading preset: ${preset.name}`);

        // STEP 1: Complete state restoration
        // Deep clone all player states to avoid reference issues
        this.playerStates = JSON.parse(JSON.stringify(preset.playerStates));

        // Restore link states if they exist
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
        } else {
            // Clear link states if not in preset
            this.linkStates = null;
        }

        // Restore global settings
        this.tempo = preset.tempo || 120;
        this.numberOfPlayers = preset.numberOfPlayers || 4;
        this.loopPosition = preset.loopPosition || 0;

        // Update current preset reference
        this.currentPreset = key;

        // STEP 2: Complete UI refresh for ALL players
        // First, update all player tab visual states (muted/unmuted)
        for (let i = 1; i <= this.maxPlayers; i++) {
            const tab = document.querySelector(`.player-tab[data-player="${i}"]`);
            if (tab) {
                // Remove all state classes first
                tab.classList.remove('muted', 'active');

                // Add back appropriate states
                if (this.playerStates[i]) {
                    if (this.playerStates[i].muted) {
                        tab.classList.add('muted');
                    }
                }

                // Mark current player as active
                if (i === this.currentPlayer) {
                    tab.classList.add('active');
                }
            }
        }

        // STEP 3: Force complete UI update for current player
        // This updates all controls for the currently visible player
        this.updateCompleteUIState();

        // STEP 4: Update global UI elements
        // Update number of players display
        this.setNumberOfPlayers(this.numberOfPlayers);

        // Update tempo
        this.setTempo(this.tempo);

        // Update loop position
        this.setLoopPosition(this.loopPosition);

        // Update playing state if it's part of the preset
        if (preset.isPlaying !== undefined) {
            this.isPlaying = preset.isPlaying;
            this.updatePlayPauseButton();
        }

        // STEP 5: Update preset dropdown
        const dropdownText = document.querySelector('#preset-dropdown .dropdown-text');
        if (dropdownText) {
            dropdownText.textContent = preset.name;
        }

        // Update the selected state in the dropdown options
        const dropdownOptions = document.getElementById('preset-options');
        if (dropdownOptions) {
            dropdownOptions.querySelectorAll('.dropdown-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.value === key) {
                    opt.classList.add('selected');
                }
            });
        }

        // STEP 6: Update lock display
        this.updatePresetLockDisplay();

        // STEP 7: Update mute overlay based on CURRENT player's state
        // This is critical - must check the current player's mute state
        this.updateMuteOverlay();

        // Save app state with new preset selection
        this.scheduleSave('appState');

        console.log(`Successfully loaded preset "${preset.name}"`);
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

        // Load the newly duplicated preset
        this.loadPreset(newKey);

        this.updatePresetDropdown();
        this.renderPresetList();
        this.showNotification(`Created duplicate: "${newName}"`);

        // Return the new key so it can be used if needed (e.g., for renaming)
        return newKey;
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

            // Load the renamed preset to ensure it's the current one
            this.loadPreset(newKey || key);

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

    createNewDefaultPreset() {
        // Find the next available preset number
        let nextNum = 1;
        const presetKeys = Object.keys(this.presets);

        // Find existing numbered presets to determine next number
        presetKeys.forEach(key => {
            const preset = this.presets[key];
            const match = preset.name.match(/^Preset (\d+)$/);
            if (match) {
                const num = parseInt(match[1]);
                nextNum = Math.max(nextNum, num + 1);
            }
        });

        // Create new preset name and key
        const newPresetName = `Preset ${nextNum}`;
        const newPresetKey = `preset-${nextNum}`;

        // Create fresh preset with all default values
        const freshPreset = {
            name: newPresetName,
            timestamp: Date.now(),
            playerStates: {},
            linkStates: null,
            tempo: 120,
            numberOfPlayers: 4,
            loopPosition: 0
        };

        // Initialize default player states with updated defaults
        for (let i = 1; i <= this.maxPlayers; i++) {
            freshPreset.playerStates[i] = {
                presetName: 'Default',
                kitName: 'Acoustic',
                patternGroup: 'favorites',  // Default pattern group
                selectedPattern: 'basic',    // "Basic" pattern selected
                kitMixerActive: false,
                muted: false,
                toggleStates: {
                    none: false,
                    auto: true,     // All players have Auto active
                    manual: false,
                    stick: false,
                    ride: false,
                    lock: false
                },
                fillStates: {
                    now: false,
                    4: false,
                    8: false,
                    16: true,       // Fill 16 selected
                    32: false,
                    solo: false
                },
                sliderValues: {
                    swing: 10,      // Swing at 10
                    energy: 50,
                    volume: 75
                },
                // Note: These mini sliders may be for future kit mixer implementation
                miniSliders: {
                    1: 50,
                    2: 30,
                    3: 80
                }
            };
        }

        // Save the new preset
        this.presets[newPresetKey] = freshPreset;

        // Reset to Player 1 as the active player
        this.currentPlayer = 1;

        // Load the new preset
        this.loadPreset(newPresetKey);

        // Ensure Player 1 is selected
        this.switchToPlayer(1);

        // Update the preset dropdown
        this.updatePresetDropdown();

        // Render the preset list in the modal
        this.renderPresetList();

        // Save to storage
        this.savePresetsToStorage();

        // Clear the input field if it has text
        const presetNameInput = document.getElementById('preset-name-input');
        if (presetNameInput) {
            presetNameInput.value = '';
        }

        this.showNotification(`Created "${newPresetName}"`);
    }

    resetToFactoryDefaults() {
        // Confirm with user before resetting
        const confirmReset = confirm('This will reset the Default preset to factory settings. Any changes will be lost. Continue?');
        if (!confirmReset) return;

        // Create factory default preset
        const factoryDefault = {
            name: 'Default',
            timestamp: Date.now(),
            playerStates: {},
            linkStates: null,
            tempo: 120,
            numberOfPlayers: 4,
            loopPosition: 0
        };

        // Initialize all player states with factory defaults
        for (let i = 1; i <= this.maxPlayers; i++) {
            factoryDefault.playerStates[i] = {
                presetName: 'Default',
                kitName: 'Acoustic',
                patternGroup: 'favorites',
                selectedPattern: 'basic',
                kitMixerActive: false,
                muted: false,  // Ensure no players are muted
                toggleStates: {
                    none: false,
                    auto: true,     // All players have Auto active
                    manual: false,
                    stick: false,
                    ride: false,
                    lock: false
                },
                fillStates: {
                    now: false,
                    4: false,
                    8: false,
                    16: true,       // Fill 16 selected
                    32: false,
                    solo: false
                },
                sliderValues: {
                    swing: 10,
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

        // Replace the default preset
        this.presets['default'] = factoryDefault;

        // Reset to Player 1 as the active player
        this.currentPlayer = 1;

        // If currently on default preset, reload it
        if (this.currentPreset === 'default') {
            this.loadPreset('default');
        } else {
            // Switch to default preset after reset
            this.loadPreset('default');
        }

        // Ensure Player 1 is selected after reset
        this.switchToPlayer(1);

        // Update the preset dropdown
        this.updatePresetDropdown();

        // Render the preset list in the modal
        this.renderPresetList();

        // Save to storage
        this.savePresetsToStorage();

        // Clear any locks on default preset
        if (this.presetLocks && this.presetLocks['default']) {
            delete this.presetLocks['default'];
            this.savePresetLocksToStorage();
            this.updatePresetLockDisplay();
        }

        this.showNotification('Default preset reset to factory settings');
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
        // Use safe wrapper with error handling
        this.safeLocalStorageSet('otto_presets', presetsToStore);
    }

    loadPresetsFromStorage() {
        // Use safe wrapper with error handling and validation
        return this.safeLocalStorageGet('otto_presets', null);
    }

    init() {
        try {
            this.initAppState();      // Initialize app state FIRST to restore saved values
            this.initPresetSystem();  // Initialize preset system second
            this.loadPatternGroups(); // Load pattern groups early
            this.setupVersion();
            this.setupSplashScreen();
            this.setupPlayerTabs();
            this.setupPresetControls();
            this.setupSettingsWindow();  // Setup settings window
            this.setupAllModals();  // Setup all modal windows
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
        } catch (error) {
            console.error('Error during initialization:', error);
            console.error('Stack trace:', error.stack);

            // Always try to hide splash screen even if there's an error
            const splashScreen = document.getElementById('splash-screen');
            if (splashScreen) {
                splashScreen.style.display = 'none';
                splashScreen.classList.add('hidden');
            }

            // Show error message to user
            setTimeout(() => {
                alert('There was an error initializing the interface. Check the console for details.\n\nError: ' + error.message);
            }, 100);
        }
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

            this.scheduleSave('appState');  // Save app state
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
        const playerTabs = document.querySelectorAll('.player-tab');
        const playerPrevBtn = document.getElementById('player-prev-btn');
        const playerNextBtn = document.getElementById('player-next-btn');

        // Clean up existing player tab listeners
        this.eventListeners = this.eventListeners.filter(({ element }) => {
            return !element || !element.classList || !element.classList.contains('player-tab');
        });

        // Set up initial visibility based on numberOfPlayers
        playerTabs.forEach((tab, index) => {
            const playerNumber = index + 1;

            // Show/hide tabs based on numberOfPlayers
            if (playerNumber <= this.numberOfPlayers) {
                tab.style.display = 'block';
                tab.classList.remove('disabled');
            } else {
                tab.style.display = 'none';
                tab.classList.add('disabled');
            }

            // Set active state for current player
            if (playerNumber === this.currentPlayer) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }

            // Add click handler using tracked event listener
            const clickHandler = () => {
                this.switchToPlayer(playerNumber);
            };

            this.addEventListener(tab, 'click', clickHandler);
        });

        // Navigation buttons with tracked event listeners
        if (playerPrevBtn) {
            const prevHandler = () => {
                this.navigatePlayer(-1);
            };
            this.addEventListener(playerPrevBtn, 'click', prevHandler);
        }

        if (playerNextBtn) {
            const nextHandler = () => {
                this.navigatePlayer(1);
            };
            this.addEventListener(playerNextBtn, 'click', nextHandler);
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

        // Clean up existing dropdown listeners for this dropdown
        this.dropdownListeners = this.dropdownListeners.filter(({ element }) => {
            return element !== dropdownSelected &&
                   (!element || !element.parentElement || element.parentElement !== dropdownOptions);
        });

        if (dropdownSelected) {
            // Toggle dropdown on click
            const toggleHandler = (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            };
            this.addEventListener(dropdownSelected, 'click', toggleHandler, this.dropdownListeners);
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

                const optionHandler = (e) => {
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
                };

                this.addEventListener(option, 'click', optionHandler, this.dropdownListeners);

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
            this.documentListeners.push({
                event: 'click',
                handler: this.presetDropdownCloseHandler
            });
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

        // Use the comprehensive UI update
        this.updateCompleteUIState();

        this.scheduleSave('appState');  // Save app state
        console.log(`Switched to Player ${playerNumber}, muted: ${this.playerStates[playerNumber]?.muted || false}`);
        this.onPlayerChanged(playerNumber);
    }

    updateUIForCurrentPlayer() {
        const state = this.playerStates[this.currentPlayer];

        // Ensure state exists
        if (!state) {
            console.error(`No state found for player ${this.currentPlayer}`);
            return;
        }

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

        // Update pattern group dropdown
        const groupDropdownText = document.querySelector('#group-dropdown .dropdown-text');
        if (groupDropdownText && state.patternGroup) {
            // Convert patternGroup value to display text
            const groupDisplayNames = {
                'favorites': 'Favorites',
                'all': 'All Patterns',
                'custom': 'Custom'
            };
            groupDropdownText.textContent = groupDisplayNames[state.patternGroup] || 'Favorites';
        }

        // Update selected state on group options
        const groupOptions = document.querySelectorAll('#group-dropdown .dropdown-option');
        groupOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === state.patternGroup) {
                option.classList.add('selected');
            }
        });

        // Update kit mixer button state
        const kitMixerBtn = document.getElementById('kit-mixer-btn');
        if (kitMixerBtn) {
            kitMixerBtn.classList.toggle('active', state.kitMixerActive || false);
        }

        // Update mute drummer button state
        const muteDrummerBtn = document.getElementById('mute-drummer-btn');
        if (muteDrummerBtn) {
            muteDrummerBtn.classList.toggle('muted', state.muted || false);
        }

        // Update toggle button states - clear all first, then set active ones
        document.querySelectorAll('[data-toggle]').forEach(button => {
            button.classList.remove('active');
        });
        if (state.toggleStates) {
            Object.keys(state.toggleStates).forEach(toggleKey => {
                const button = document.querySelector(`[data-toggle="${toggleKey}"]`);
                if (button && state.toggleStates[toggleKey]) {
                    button.classList.add('active');
                }
            });
        }

        // Update fill button states - clear all first, then set active ones
        document.querySelectorAll('[data-fill]').forEach(button => {
            button.classList.remove('active');
        });
        if (state.fillStates) {
            Object.keys(state.fillStates).forEach(fillKey => {
                const button = document.querySelector(`[data-fill="${fillKey}"]`);
                if (button && state.fillStates[fillKey]) {
                    button.classList.add('active');
                }
            });
        }

        // Update pattern selection
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.pattern === state.selectedPattern) {
                btn.classList.add('active');
            }
        });

        // Update custom sliders
        if (state.sliderValues) {
            Object.keys(state.sliderValues).forEach(sliderKey => {
                const slider = document.querySelector(`.custom-slider[data-param="${sliderKey}"]`);
                if (slider) {
                    const value = state.sliderValues[sliderKey];
                    this.updateCustomSlider(slider, value);
                }
            });
        }

        // Update mini sliders
        const miniSliders = document.querySelectorAll('.mini-slider');
        miniSliders.forEach((slider, index) => {
            const sliderIndex = index + 1;
            if (state.miniSliders) {
                slider.value = state.miniSliders[sliderIndex] || 50;
            }
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
                tab.classList.toggle('muted', this.playerStates[i].muted || false);
            }
        }
    }

    // Complete UI state update - used when loading presets to ensure everything is in sync
    updateCompleteUIState() {
        const state = this.playerStates[this.currentPlayer];

        if (!state) {
            console.error(`No state found for player ${this.currentPlayer}`);
            return;
        }

        console.log(`Updating complete UI for player ${this.currentPlayer}, muted: ${state.muted}`);

        // Update player number display
        const playerNumberDisplay = document.getElementById('current-player-number');
        if (playerNumberDisplay) {
            playerNumberDisplay.textContent = this.currentPlayer;
        }

        // Update kit dropdown
        const kitDropdownText = document.querySelector('#kit-dropdown .dropdown-text');
        if (kitDropdownText) {
            kitDropdownText.textContent = state.kitName || 'Acoustic';
        }

        // Update kit dropdown options
        const kitOptions = document.querySelectorAll('#kit-dropdown .dropdown-option');
        kitOptions.forEach(option => {
            option.classList.remove('selected');
            const kitValue = (state.kitName || 'Acoustic').toLowerCase();
            if (option.dataset.value === kitValue) {
                option.classList.add('selected');
            }
        });

        // Update pattern group dropdown
        const groupDropdownText = document.querySelector('#group-dropdown .dropdown-text');
        if (groupDropdownText) {
            const groupDisplayNames = {
                'favorites': 'Favorites',
                'all': 'All Patterns',
                'custom': 'Custom'
            };
            const groupValue = state.patternGroup || 'favorites';
            groupDropdownText.textContent = groupDisplayNames[groupValue] || 'Favorites';
        }

        // Update pattern group options
        const groupOptions = document.querySelectorAll('#group-dropdown .dropdown-option');
        groupOptions.forEach(option => {
            option.classList.remove('selected');
            if (option.dataset.value === (state.patternGroup || 'favorites')) {
                option.classList.add('selected');
            }
        });

        // Update kit mixer button
        const kitMixerBtn = document.getElementById('kit-mixer-btn');
        if (kitMixerBtn) {
            kitMixerBtn.classList.remove('active');
            if (state.kitMixerActive) {
                kitMixerBtn.classList.add('active');
            }
        }

        // Update mute drummer button - CRITICAL for the bug fix
        const muteDrummerBtn = document.getElementById('mute-drummer-btn');
        if (muteDrummerBtn) {
            muteDrummerBtn.classList.remove('muted');
            if (state.muted) {
                muteDrummerBtn.classList.add('muted');
            }
        }

        // Clear and update ALL toggle buttons
        document.querySelectorAll('[data-toggle]').forEach(button => {
            button.classList.remove('active');
        });

        if (state.toggleStates) {
            Object.entries(state.toggleStates).forEach(([key, value]) => {
                if (value) {
                    const button = document.querySelector(`[data-toggle="${key}"]`);
                    if (button) {
                        button.classList.add('active');
                    }
                }
            });
        }

        // Clear and update ALL fill buttons
        document.querySelectorAll('[data-fill]').forEach(button => {
            button.classList.remove('active');
        });

        if (state.fillStates) {
            Object.entries(state.fillStates).forEach(([key, value]) => {
                if (value) {
                    const button = document.querySelector(`[data-fill="${key}"]`);
                    if (button) {
                        button.classList.add('active');
                    }
                }
            });
        }

        // Update pattern grid based on current group
        if (this.patternGroups && state.patternGroup && this.patternGroups[state.patternGroup]) {
            this.updateMainPatternGrid(this.patternGroups[state.patternGroup].patterns);
        }

        // Clear and update pattern selection
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (state.selectedPattern) {
            const patternBtn = document.querySelector(`[data-pattern="${state.selectedPattern}"]`);
            if (patternBtn) {
                patternBtn.classList.add('active');
            }
        }

        // Update all sliders
        if (state.sliderValues) {
            ['swing', 'energy', 'volume'].forEach(param => {
                const slider = document.querySelector(`.custom-slider[data-param="${param}"]`);
                if (slider) {
                    const value = state.sliderValues[param] || 0;
                    this.updateCustomSlider(slider, value);
                }
            });
        }

        // Update mini sliders if they exist
        const miniSliders = document.querySelectorAll('.mini-slider');
        if (miniSliders.length > 0 && state.miniSliders) {
            miniSliders.forEach((slider, index) => {
                const sliderIndex = index + 1;
                slider.value = state.miniSliders[sliderIndex] || 50;
            });
        }

        // Update link states
        if (this.linkStates) {
            this.updateLinkIconStates();
        }

        // CRITICAL: Update mute overlay for current player
        const overlay = document.querySelector('.mute-overlay');
        if (overlay) {
            overlay.classList.remove('active');
            if (state.muted) {
                overlay.classList.add('active');
            }
        }

        // Update ALL player tabs to show their muted states
        for (let i = 1; i <= this.maxPlayers; i++) {
            const tab = document.querySelector(`.player-tab[data-player="${i}"]`);
            if (tab && this.playerStates[i]) {
                tab.classList.remove('muted');
                if (this.playerStates[i].muted) {
                    tab.classList.add('muted');
                }
            }
        }
    }

    setupKitControls() {
        const kitDropdown = document.getElementById('kit-dropdown');
        const kitDropdownSelected = document.getElementById('kit-selected');
        const kitDropdownOptions = document.getElementById('kit-options');
        const kitOptions = document.querySelectorAll('#kit-options .dropdown-option');
        const kitPrev = document.getElementById('kit-prev-btn');
        const kitNext = document.getElementById('kit-next-btn');
        const kitMixerBtn = document.getElementById('kit-mixer-btn');
        const muteDrummerBtn = document.getElementById('mute-drummer-btn');

        // Clean up existing kit dropdown listeners
        this.dropdownListeners = this.dropdownListeners.filter(({ element }) => {
            const parent = element && element.parentElement;
            return element !== kitDropdownSelected &&
                   element !== kitPrev &&
                   element !== kitNext &&
                   element !== kitMixerBtn &&
                   element !== muteDrummerBtn &&
                   (!parent || parent.id !== 'kit-options');
        });

        // Navigation buttons
        if (kitPrev) {
            const prevHandler = () => {
                this.navigateKit(-1);
            };
            this.addEventListener(kitPrev, 'click', prevHandler, this.dropdownListeners);
        }

        if (kitNext) {
            const nextHandler = () => {
                this.navigateKit(1);
            };
            this.addEventListener(kitNext, 'click', nextHandler, this.dropdownListeners);
        }

        // Custom dropdown functionality
        const dropdownText = kitDropdown?.querySelector('.dropdown-text');

        // Toggle dropdown
        if (kitDropdownSelected) {
            const toggleHandler = (e) => {
                e.stopPropagation();
                kitDropdown.classList.toggle('open');
            };
            this.addEventListener(kitDropdownSelected, 'click', toggleHandler, this.dropdownListeners);
        }

        // Kit selection from dropdown
        kitOptions?.forEach(option => {
            const optionHandler = (e) => {
                e.stopPropagation();
                const kitName = option.dataset.value;

                // Update selected text
                if (dropdownText) {
                    dropdownText.textContent = kitName;
                }

                // Update selected state
                kitOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');

                // Close dropdown
                kitDropdown.classList.remove('open');

                // Update player state and trigger callback
                this.playerStates[this.currentPlayer].kitName = kitName;
                this.onKitChanged(this.currentPlayer, kitName);
                this.scheduleSave('preset');

                console.log(`Player ${this.currentPlayer} kit changed to: ${kitName}`);
            };
            this.addEventListener(option, 'click', optionHandler, this.dropdownListeners);
        });

        // Close kit dropdown when clicking outside
        if (!this.kitDropdownCloseHandler) {
            this.kitDropdownCloseHandler = (e) => {
                if (kitDropdown && !kitDropdown.contains(e.target)) {
                    kitDropdown.classList.remove('open');
                }
            };
            document.addEventListener('click', this.kitDropdownCloseHandler);
            this.documentListeners.push({
                event: 'click',
                handler: this.kitDropdownCloseHandler
            });
        }

        // Kit mixer button
        if (kitMixerBtn) {
            const mixerHandler = () => {
                // Toggle kit mixer state
                this.playerStates[this.currentPlayer].kitMixerActive =
                    !this.playerStates[this.currentPlayer].kitMixerActive;

                // Update button visual state
                kitMixerBtn.classList.toggle('active',
                    this.playerStates[this.currentPlayer].kitMixerActive);

                // Trigger callback
                this.onKitMixerToggle(this.currentPlayer,
                    this.playerStates[this.currentPlayer].kitMixerActive);
                this.scheduleSave('preset');

                console.log(`Player ${this.currentPlayer} kit mixer: ${this.playerStates[this.currentPlayer].kitMixerActive}`);
            };
            this.addEventListener(kitMixerBtn, 'click', mixerHandler, this.dropdownListeners);
        }

        // Edit kit buttons
        document.querySelectorAll('.edit-btn').forEach(editBtn => {
            const editHandler = () => {
                this.onEditKit(this.currentPlayer);
                console.log(`Edit kit for Player ${this.currentPlayer}`);
            };
            this.addEventListener(editBtn, 'click', editHandler, this.dropdownListeners);
        });

        // Mute Drummer button
        if (muteDrummerBtn) {
            const muteHandler = () => {
                // Get current player state
                const currentState = this.playerStates[this.currentPlayer];

                // Toggle mute state
                currentState.muted = !currentState.muted;

                // Update button visual state
                muteDrummerBtn.classList.toggle('active', currentState.muted);

                // Trigger mute callback
                this.onMuteDrummer(this.currentPlayer, currentState.muted);
                this.scheduleSave('preset');

                // Update mute overlay
                this.updateMuteOverlay();

                console.log(`Player ${this.currentPlayer} muted: ${currentState.muted}`);
            };
            this.addEventListener(muteDrummerBtn, 'click', muteHandler, this.dropdownListeners);
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
        const editPatternBtn = document.querySelector('.edit-pattern-btn');

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

        // Setup edit pattern button to toggle edit mode
        if (editPatternBtn) {
            editPatternBtn.addEventListener('click', () => {
                this.togglePatternEditMode();
            });
        }

        // Setup panel close button
        const panelCloseBtn = document.getElementById('pattern-panel-close');
        if (panelCloseBtn) {
            panelCloseBtn.addEventListener('click', () => {
                this.togglePatternEditMode();
            });
        }

        // Setup delete button
        const deleteBtn = document.getElementById('group-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteCurrentPatternGroup();
            });
        }

        // Setup pattern search
        const searchInput = document.getElementById('pattern-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterPatterns(e.target.value);
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
                        this.scheduleSave('preset');
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
            this.scheduleSave('preset');
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
                this.scheduleSave('preset');

                console.log(`Player ${this.currentPlayer} selected pattern: ${patternName}`);
            });
        });
    }

    setupToggleButtons() {
        document.querySelectorAll('.toggle-btn').forEach(toggleBtn => {
            toggleBtn.addEventListener('click', (e) => {
                const toggleType = toggleBtn.dataset.toggle;
                const state = this.playerStates[this.currentPlayer];

                // Handle 'None' button - turns off all other toggles
                if (toggleType === 'none') {
                    // Turn off all toggles
                    Object.keys(state.toggleStates).forEach(key => {
                        state.toggleStates[key] = false;
                    });

                    // Turn on 'none'
                    state.toggleStates.none = true;

                    // Update UI - remove active from all, add to none
                    document.querySelectorAll('.toggle-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    toggleBtn.classList.add('active');
                }
                // Handle radio group behavior for Auto/Manual
                else if (toggleType === 'auto' || toggleType === 'manual') {
                    // Turn off 'none' if it's active
                    if (state.toggleStates.none) {
                        state.toggleStates.none = false;
                        document.querySelector('[data-toggle="none"]').classList.remove('active');
                    }

                    // Clear both auto/manual
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
                    // Turn off 'none' if it's active
                    if (state.toggleStates.none) {
                        state.toggleStates.none = false;
                        document.querySelector('[data-toggle="none"]').classList.remove('active');
                    }

                    // Toggle individual buttons
                    const isActive = toggleBtn.classList.contains('active');
                    toggleBtn.classList.toggle('active');
                    state.toggleStates[toggleType] = !isActive;
                }

                this.onToggleChanged(this.currentPlayer, toggleType, state.toggleStates[toggleType]);
                this.scheduleSave('preset');
                console.log(`Player ${this.currentPlayer} toggle ${toggleType}: ${state.toggleStates[toggleType]}`);
            });
        });
    }

    setupFillButtons() {
        document.querySelectorAll('.fill-btn').forEach(fillBtn => {
            fillBtn.addEventListener('click', (e) => {
                const fillType = fillBtn.dataset.fill;
                const isActive = fillBtn.classList.contains('active');
                
                // Update state through centralized system
                this.updatePlayerState(this.currentPlayer, {
                    fillStates: { [fillType]: !isActive }
                }, () => {
                    // Update UI and trigger callback after state is updated
                    fillBtn.classList.toggle('active');
                    this.onFillChanged(this.currentPlayer, fillType, !isActive);
                    console.log(`Player ${this.currentPlayer} fill ${fillType}: ${!isActive}`);
                });
            });
        });
    }

    setupSliders() {
        // Clean up existing slider listeners first
        this.sliderListeners.forEach(({ element, event, handler }) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        this.sliderListeners = [];

        // Debounce timer for slider updates
        let sliderDebounceTimers = {};

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

            // Debounced update function
            const debouncedUpdate = (newValue) => {
                // Clear existing timer for this slider
                if (sliderDebounceTimers[param]) {
                    clearTimeout(sliderDebounceTimers[param]);
                }

                // Update visual immediately for responsiveness
                this.updateCustomSlider(slider, newValue);

                // Debounce the actual state update and callbacks
                sliderDebounceTimers[param] = setTimeout(() => {
                    // Update player state
                    this.playerStates[this.currentPlayer].sliderValues[param] = newValue;
                    this.onSliderChanged(this.currentPlayer, param, newValue);
                    this.scheduleSave('preset');

                    // Check if this player is a master and propagate value
                    if (this.linkStates && this.linkStates[param]) {
                        const linkState = this.linkStates[param];
                        if (linkState.master === this.currentPlayer) {
                            this.propagateSliderValue(param, newValue, this.currentPlayer);
                        }
                    }

                    console.log(`Player ${this.currentPlayer} ${param} slider: ${newValue}`);
                }, 100); // 100ms debounce delay
            };

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

                // Use debounced update
                debouncedUpdate(value);
            };

            const endDrag = () => {
                if (isDragging) {
                    isDragging = false;
                    slider.classList.remove('dragging');

                    // Force final update when drag ends
                    if (sliderDebounceTimers[param]) {
                        clearTimeout(sliderDebounceTimers[param]);
                    }

                    // Final update without debounce
                    this.playerStates[this.currentPlayer].sliderValues[param] = value;
                    this.onSliderChanged(this.currentPlayer, param, value);
                    this.scheduleSave('preset');

                    // Handle link propagation
                    if (this.linkStates && this.linkStates[param]) {
                        const linkState = this.linkStates[param];
                        if (linkState.master === this.currentPlayer) {
                            this.propagateSliderValue(param, value, this.currentPlayer);
                        }
                    }
                }
            };

            // Handle click on track
            const trackClickHandler = (e) => {
                if (e.target === thumb) return;  // Don't handle if clicking thumb

                const rect = track.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const percentage = 1 - (clickY / rect.height);  // Inverted for vertical

                value = Math.round(min + (percentage * (max - min)));

                // Update visual state immediately
                this.updateCustomSlider(slider, value);

                // Update player state (no debounce for click)
                this.playerStates[this.currentPlayer].sliderValues[param] = value;
                this.onSliderChanged(this.currentPlayer, param, value);
                this.scheduleSave('preset');

                // Handle link propagation
                if (this.linkStates && this.linkStates[param]) {
                    const linkState = this.linkStates[param];
                    if (linkState.master === this.currentPlayer) {
                        this.propagateSliderValue(param, value, this.currentPlayer);
                    }
                }

                console.log(`Player ${this.currentPlayer} ${param} slider: ${value}`);
            };

            // Attach drag event listeners with tracking
            this.addEventListener(track, 'click', trackClickHandler, this.sliderListeners);
            this.addEventListener(thumb, 'mousedown', startDrag, this.sliderListeners);

            // These need to be on document level for dragging
            if (!slider.dataset.listenersAdded) {
                this.addEventListener(document, 'mousemove', doDrag, this.sliderListeners);
                this.addEventListener(document, 'mouseup', endDrag, this.sliderListeners);
                slider.dataset.listenersAdded = 'true';
            }

            // Store value for updates
            slider.currentValue = value;
        });

        // Mini sliders debounce timer
        let miniSliderDebounceTimer = null;

        // Mini sliders in kit section with proper cleanup and debouncing
        document.querySelectorAll('.mini-slider').forEach((slider, index) => {
            const inputHandler = (e) => {
                const sliderIndex = index + 1;
                const value = parseInt(e.target.value);

                // Clear existing timer
                if (miniSliderDebounceTimer) {
                    clearTimeout(miniSliderDebounceTimer);
                }

                // Debounce the update
                miniSliderDebounceTimer = setTimeout(() => {
                    this.playerStates[this.currentPlayer].miniSliders[sliderIndex] = value;
                    this.onMiniSliderChanged(this.currentPlayer, sliderIndex, value);
                    this.scheduleSave('preset');

                    console.log(`Player ${this.currentPlayer} mini slider ${sliderIndex}: ${value}`);
                }, 100); // 100ms debounce delay
            };

            this.addEventListener(slider, 'input', inputHandler, this.sliderListeners);
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

        if (overlay && state) {
            // Show overlay if current player is muted
            overlay.classList.toggle('active', state.muted === true);
        }
    }

    setupTopBarControls() {
        // Clean up existing top bar listeners
        this.eventListeners = this.eventListeners.filter(({ element }) => {
            return element?.id !== 'settings-btn' &&
                   element?.id !== 'link-btn' &&
                   element?.id !== 'upload-btn' &&
                   element?.id !== 'play-pause-btn' &&
                   element?.id !== 'tempo-display';
        });

        // Settings button
        const settingsBtn = document.getElementById('settings-btn');
        if (settingsBtn) {
            const settingsHandler = () => {
                this.onSettingsClicked();
                console.log('Settings clicked');
            };
            this.addEventListener(settingsBtn, 'click', settingsHandler);
        }

        // Link button
        const linkBtn = document.getElementById('link-btn');
        if (linkBtn) {
            const linkHandler = () => {
                this.onLinkClicked();
                console.log('Link clicked');
            };
            this.addEventListener(linkBtn, 'click', linkHandler);
        }

        // Upload button
        const uploadBtn = document.getElementById('upload-btn');
        if (uploadBtn) {
            const uploadHandler = () => {
                this.onUploadClicked();
                console.log('Upload clicked');
            };
            this.addEventListener(uploadBtn, 'click', uploadHandler);
        }

        // Play/Pause button
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            const playPauseHandler = () => {
                this.togglePlayPause();
            };
            this.addEventListener(playPauseBtn, 'click', playPauseHandler);
        }

        // Tempo display - dual function (tap tempo & edit)
        const tempoDisplay = document.getElementById('tempo-display');
        if (tempoDisplay) {
            let clickTimer = null;
            let clickCount = 0;
            let isEditing = false;

            // Single click for tap tempo
            const clickHandler = (e) => {
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
            };
            this.addEventListener(tempoDisplay, 'click', clickHandler);

            // Handle editing
            const blurHandler = () => {
                if (!isEditing) return;

                const newTempo = parseInt(tempoDisplay.textContent);
                if (!isNaN(newTempo) && newTempo >= 40 && newTempo <= 300) {
                    this.setTempo(newTempo);
                } else {
                    // Reset to current tempo if invalid
                    tempoDisplay.textContent = this.tempo;
                }
                this.exitEditMode(tempoDisplay);
            };
            this.addEventListener(tempoDisplay, 'blur', blurHandler);

            const keydownHandler = (e) => {
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
            };
            this.addEventListener(tempoDisplay, 'keydown', keydownHandler);

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
                this.scheduleSave('preset');
            });

            document.addEventListener('mouseup', () => {
                isDragging = false;
            });
        }
    }

    setupKeyboardShortcuts() {
        // Remove existing keyboard shortcut handler if it exists
        if (this.keyboardShortcutHandler) {
            document.removeEventListener('keydown', this.keyboardShortcutHandler);
        }

        this.keyboardShortcutHandler = (e) => {
            // Check if we're editing any text field
            const activeElement = document.activeElement;
            const isEditing = activeElement && (
                activeElement.tagName === 'INPUT' ||
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.contentEditable === 'true'
            );

            if (isEditing) return;

            // Space bar to toggle play/pause
            if (e.code === 'Space') {
                e.preventDefault();
                this.togglePlayPause();
            }

            // Number keys 1-8 to switch players
            if (e.key >= '1' && e.key <= '8') {
                const playerNum = parseInt(e.key);
                if (playerNum <= this.numberOfPlayers) {
                    this.switchToPlayer(playerNum);
                }
            }

            // Arrow keys for navigation
            if (e.key === 'ArrowLeft' && e.shiftKey) {
                this.navigatePlayer(-1);
            } else if (e.key === 'ArrowRight' && e.shiftKey) {
                this.navigatePlayer(1);
            }
        };

        document.addEventListener('keydown', this.keyboardShortcutHandler);
        this.documentListeners.push({
            event: 'keydown',
            handler: this.keyboardShortcutHandler
        });
    }

    startLoopAnimation() {
        // Don't start a new animation if one is already running
        if (this.animationFrame) {
            return;
        }

        const animate = () => {
            // Only continue animation if playing
            if (!this.isPlaying) {
                // Stop the animation loop when paused
                this.animationFrame = null;
                return;
            }

            // Animate the loop position when playing
            this.loopPosition += 0.003; // Adjust speed as needed
            if (this.loopPosition > 1) {
                this.loopPosition = 0;
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
        // Use centralized state management
        this.updateGlobalState({ tempo: bpm }, () => {
            // Update UI after state is updated
            const tempoDisplay = document.getElementById('tempo-display');
            if (tempoDisplay) {
                tempoDisplay.textContent = Math.round(bpm);
            }
            this.onTempoChanged(bpm);
        });
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
                // Restart animation when playing
                this.startLoopAnimation();
            } else {
                playIcon.style.display = 'inline-block';
                pauseIcon.style.display = 'none';
                // Animation will stop itself when isPlaying is false
            }
        }

        // Notify JUCE backend if available
        if (window.juce?.onPlayPauseChanged) {
            window.juce.onPlayPauseChanged(this.isPlaying);
        }

        this.scheduleSave('appState');  // Save app state
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
        // Save selected pattern to current group
        if (this.playerStates[playerNumber]) {
            const currentGroup = this.playerStates[playerNumber].patternGroup;

            // Save to player state
            this.playerStates[playerNumber].selectedPattern = patternName;

            // Save to pattern group if it exists
            if (this.patternGroups && this.patternGroups[currentGroup]) {
                this.patternGroups[currentGroup].selectedPattern = patternName;
                this.savePatternGroups();
            }
        }

        if (window.juce?.onPatternSelected) {
            window.juce.onPatternSelected(playerNumber, patternName);
        }
    }

    onPatternGroupChanged(playerNumber, groupName) {
        // Save pattern group to player state
        if (this.playerStates[playerNumber]) {
            this.playerStates[playerNumber].patternGroup = groupName;

            // Update the pattern grid if this is the current player
            if (playerNumber === this.currentPlayer && this.patternGroups && this.patternGroups[groupName]) {
                this.updateMainPatternGrid(this.patternGroups[groupName].patterns);

                // Restore the selected pattern for this group
                const selectedPattern = this.patternGroups[groupName].selectedPattern;
                if (selectedPattern) {
                    const patternButtons = document.querySelectorAll('.pattern-grid .pattern-btn');
                    patternButtons.forEach(btn => {
                        btn.classList.remove('active');
                        if (btn.textContent === selectedPattern) {
                            btn.classList.add('active');
                            this.playerStates[playerNumber].selectedPattern = selectedPattern;
                        }
                    });
                }
            }
        }

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
        // Open the Kit Edit modal
        this.openKitEditModal();

        // Also call JUCE if available
        if (window.juce?.onEditKit) {
            window.juce.onEditKit(playerNumber);
        }
    }

    onKitMixerToggle(playerNumber, isActive) {
        // Open the Mixer modal
        this.openMixerModal();

        // Also call JUCE if available
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
        // Open the settings modal
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.classList.add('active');
        }

        // Also call JUCE if available
        if (window.juce?.onSettingsClicked) {
            window.juce.onSettingsClicked();
        }
    }

    onLinkClicked() {
        // Open the Link modal
        this.openLinkModal();

        // Also call JUCE if available
        if (window.juce?.onLinkClicked) {
            window.juce.onLinkClicked();
        }
    }

    onUploadClicked() {
        // Open the cloud modal
        this.openCloudModal();

        // Also call JUCE backend if available
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
        // Cancel animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }

        // Clean up all event listeners
        this.cleanupAllEventListeners();

        // Clear all save timers
        Object.values(this.saveTimers).forEach(timer => {
            if (timer) clearTimeout(timer);
        });
        
        // Clear state update timer
        if (this.stateUpdateTimer) {
            clearTimeout(this.stateUpdateTimer);
        }
        
        // Process any pending saves immediately before cleanup
        this.pendingSaves.forEach(saveType => {
            try {
                this.executeSave(saveType);
            } catch (e) {
                console.error(`Error saving ${saveType} during cleanup:`, e);
            }
        });

        // Clear references
        this.playerStates = null;
        this.presets = null;
        this.patternGroups = null;
        this.linkStates = null;
        this.stateUpdateQueue = null;
        this.pendingSaves = null;
    }

    cleanupAllEventListeners() {
        // Remove all tracked event listeners
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];

        // Remove slider listeners
        this.sliderListeners.forEach(({ element, event, handler }) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        this.sliderListeners = [];

        // Remove dropdown listeners
        this.dropdownListeners.forEach(({ element, event, handler }) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        this.dropdownListeners = [];

        // Remove modal listeners
        this.modalListeners.forEach(({ element, event, handler }) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        this.modalListeners = [];

        // Remove document listeners
        this.documentListeners.forEach(({ event, handler }) => {
            document.removeEventListener(event, handler);
        });
        this.documentListeners = [];

        // Clean up specific handlers
        if (this.presetDropdownCloseHandler) {
            document.removeEventListener('click', this.presetDropdownCloseHandler);
            this.presetDropdownCloseHandler = null;
        }

        if (this.addGroupHandler) {
            const addGroupBtn = document.getElementById('add-group-btn');
            if (addGroupBtn) {
                addGroupBtn.removeEventListener('click', this.addGroupHandler);
            }
            this.addGroupHandler = null;
        }

        if (this.renameGroupHandler) {
            const renameGroupBtn = document.getElementById('rename-group-btn');
            if (renameGroupBtn) {
                renameGroupBtn.removeEventListener('click', this.renameGroupHandler);
            }
            this.renameGroupHandler = null;
        }
    }

    addEventListener(element, event, handler, trackingArray = null) {
        // Helper method to add event listeners with tracking
        if (!element) return;

        element.addEventListener(event, handler);

        // Track the listener for cleanup
        const tracker = trackingArray || this.eventListeners;
        tracker.push({ element, event, handler });
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

