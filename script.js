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

        // Online Store URL - easily configurable
        // Note: Your actual store needs to allow iframe embedding (no X-Frame-Options: DENY)
        this.storeURL = 'https://my-store-1008202.creator-spring.com/';  // Simple test URL that always works in iframes
        // this.storeURL = 'https://LarrySeyer.com';  // May not work due to X-Frame-Options

        // Add destroyed flag to prevent async operations after cleanup
        this.isDestroyed = false;

        // Enhanced Event Listener Management System
        // Use WeakMap to prevent memory leaks with DOM element references
        this.elementHandlerMap = new WeakMap(); // Maps DOM elements to their handlers
        this.documentHandlers = new Map(); // Maps event types to document-level handlers
        
        // Track all event listeners for cleanup with improved structure
        this.eventListenerRegistry = {
            element: [],      // Element-specific listeners
            document: [],     // Document-level listeners
            window: [],       // Window-level listeners
            slider: [],       // Slider-specific listeners
            dropdown: [],     // Dropdown-specific listeners
            modal: [],        // Modal-specific listeners
            pattern: []       // Pattern panel listeners
        };
        
        // Legacy arrays for backward compatibility (will migrate gradually)
        this.eventListeners = [];
        this.sliderListeners = [];
        this.dropdownListeners = [];
        this.modalListeners = [];
        this.documentListeners = [];

        // Track specific handlers for cleanup
        this.specificHandlers = {
            presetDropdownClose: null,
            addGroup: null,
            renameGroup: null,
            keyboardShortcut: null,
            beforeUnload: null
        };

        // Track debounce timers with improved management
        this.debounceTimers = new Map();
        this.miniSliderDebounceTimer = null;
        
        // Timer registry for all timers (not just debounce)
        this.activeTimers = new Set();
        this.notificationTimers = new Set();

        // Storage error tracking
        this.storageErrors = [];
        this.maxStorageErrors = 10;  // Keep last 10 errors for debugging

        // Enhanced State Management with Race Condition Prevention
        this.stateUpdateQueue = [];
        this.isProcessingStateUpdate = false;
        this.stateUpdateTimer = null;
        this.stateUpdateDelay = 50; // 50ms batch delay
        this.stateUpdateInProgress = false; // New flag for atomic operations
        this.stateUpdatePending = false; // Track pending updates
        
        // State versioning for consistency
        this.stateVersion = 0;
        this.stateUpdateHistory = [];
        this.loadingVersion = null;
        
        // State operation locks
        this.stateLocks = new Map();
        this.lockQueue = [];
        this.activeLock = null;

        // Save management - single source of truth
        this.saveTimers = {
            preset: null,
            appState: null,
            patternGroups: null,
            drumkits: null
        };
        this.saveDelays = {
            preset: 500,      // 500ms for preset changes
            appState: 1000,   // 1s for app state changes
            patternGroups: 300, // 300ms for pattern group changes
            drumkits: 300     // 300ms for drumkit changes
        };
        this.pendingSaves = new Set(); // Track what needs saving

        // Initialize drumkit manager
        this.drumkits = null; // Will be loaded from storage or initialized with defaults

        // Dirty flags hierarchy:
        // 1. Pattern -> 2. Pattern Group -> 3. Drumkit -> 4. Player -> 5. Preset
        this.isDirty = {
            pattern: false,      // Level 1
            patternGroup: false, // Level 2
            drumkit: false,      // Level 3
            player: false,       // Level 4
            preset: false        // Level 5
        };
        this.isLoadingPreset = false; // Flag to prevent marking dirty during preset load

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

    async processStateUpdateQueue() {
        // Check if destroyed
        if (this.isDestroyed) return;

        // Use atomic operation to prevent race conditions
        if (this.stateUpdateInProgress) {
            // Queue another process after current one completes
            if (!this.stateUpdatePending) {
                this.stateUpdatePending = true;
                setTimeout(() => {
                    this.stateUpdatePending = false;
                    this.processStateUpdateQueue();
                }, this.stateUpdateDelay * 2);
            }
            return;
        }

        // Clear existing timer
        if (this.stateUpdateTimer) {
            clearTimeout(this.stateUpdateTimer);
            this.stateUpdateTimer = null;
        }

        // Batch process updates after delay
        this.stateUpdateTimer = setTimeout(async () => {
            // Check again if destroyed
            if (this.isDestroyed) {
                this.stateUpdateTimer = null;
                return;
            }

            // Acquire lock for state updates
            this.stateUpdateInProgress = true;

            try {
                // Process within atomic operation
                await this.atomicStateUpdate('state-update', async (version) => {
                    // Process all queued updates
                    const updates = [...this.stateUpdateQueue];
                    this.stateUpdateQueue = [];

                    // Group updates by type for efficiency
                    const playerUpdates = {};
                    const globalUpdates = {};
                    const callbacks = [];

                    updates.forEach(update => {
                        // Skip updates from older versions if loading preset
                        if (this.isLoadingPreset && update.version && update.version < this.loadingVersion) {
                            console.log(`Skipping outdated update from version ${update.version}`);
                            return;
                        }

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
                        if (this.isDestroyed) break;
                        this.applyPlayerStateUpdates(parseInt(playerNum), updates);
                    }

                    // Apply global state updates
                    if (!this.isDestroyed) {
                        this.applyGlobalStateUpdates(globalUpdates);
                    }

                    // Execute callbacks
                    for (const cb of callbacks) {
                        if (this.isDestroyed) break;
                        try {
                            await cb();
                        } catch (e) {
                            console.error('Error in state update callback:', e);
                        }
                    }

                    // Trigger saves as needed
                    if (!this.isDestroyed) {
                        this.processPendingSaves();
                    }

                    return true;
                });
            } catch (error) {
                console.error('Error processing state update queue:', error);
            } finally {
                this.stateUpdateInProgress = false;
                this.stateUpdateTimer = null;

                // Process any new updates that came in while we were processing
                if (!this.isDestroyed && this.stateUpdateQueue.length > 0) {
                    this.processStateUpdateQueue();
                }
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

        // Mark preset as dirty
        this.setDirty('preset', true);
        // Don't auto-save, wait for user to click save button
        // this.pendingSaves.add('preset');
    }

    applyGlobalStateUpdates(updates) {
        for (const [key, value] of Object.entries(updates)) {
            this[key] = value;
        }

        // Mark app state as needing save
        if (Object.keys(updates).length > 0) {
            // Auto-save app state (not user-triggered)
            this.pendingSaves.add('appState');
        }
    }

    // Unified save system - prevents race conditions
    scheduleSave(saveType, forceImmediate = false) {
        // Check if destroyed
        if (this.isDestroyed) return;

        // Clear existing timer for this save type
        if (this.saveTimers[saveType]) {
            clearTimeout(this.saveTimers[saveType]);
        }

        // Add to pending saves
        this.pendingSaves.add(saveType);

        const delay = forceImmediate ? 0 : this.saveDelays[saveType];

        // Schedule the save
        this.saveTimers[saveType] = setTimeout(() => {
            if (this.isDestroyed) {
                this.saveTimers[saveType] = null;
                return;
            }

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
                    // Clear all dirty flags when saving preset (highest level)
                    this.setDirty('preset', false);
                    this.setDirty('player', false);
                    this.setDirty('drumkit', false);
                    this.setDirty('patternGroup', false);
                    this.setDirty('pattern', false);
                }
                break;

            case 'player':
                // Save player state (part of preset)
                this.saveAppStateToStorage();
                console.log('Saved player state');
                // Clear player and lower level dirty flags
                this.setDirty('player', false);
                this.setDirty('drumkit', false);
                this.setDirty('patternGroup', false);
                this.setDirty('pattern', false);
                break;

            case 'appState':
                this.saveAppStateToStorage();
                console.log('Saved app state');
                break;

            case 'patternGroups':
                this.savePatternGroups();
                console.log('Saved pattern groups');
                // Clear pattern group and pattern dirty flags
                this.setDirty('patternGroup', false);
                this.setDirty('pattern', false);
                break;

            case 'drumkits':
                this.saveDrumkits();
                console.log('Saved drumkits');
                this.setDirty('drumkit', false);
                break;

            case 'pattern':
                // Save pattern (part of pattern group)
                this.savePatternGroups();
                console.log('Saved patterns');
                this.setDirty('pattern', false);
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

    // Dirty flag management
    setDirty(level, isDirty = true) {
        // Don't mark dirty during preset loading
        if (this.isLoadingPreset && isDirty) {
            return;
        }

        // Hierarchy levels:
        // 1. pattern -> 2. patternGroup -> 3. drumkit -> 4. player -> 5. preset
        const hierarchy = {
            'pattern': ['patternGroup', 'player', 'preset'],
            'patternGroup': ['player', 'preset'],
            'drumkit': ['player', 'preset'],
            'player': ['preset'],
            'preset': []
        };

        // Set the dirty flag for the specified level
        if (this.isDirty[level] !== isDirty) {
            this.isDirty[level] = isDirty;
            this.updateSaveButtonVisibility(level);

            // If setting to dirty, cascade up the hierarchy
            if (isDirty && hierarchy[level]) {
                hierarchy[level].forEach(higherLevel => {
                    if (this.isDirty[higherLevel] !== true) {
                        this.isDirty[higherLevel] = true;
                        this.updateSaveButtonVisibility(higherLevel);
                    }
                });
            }
        }
    }

    updateSaveButtonVisibility(level) {
        let button = null;

        switch (level) {
            case 'preset':
                button = document.getElementById('preset-save-btn');
                break;
            case 'player':
                button = document.getElementById('player-save-btn');
                break;
            case 'drumkit':
                button = document.getElementById('drumkit-save-btn');
                break;
            case 'patternGroup':
                button = document.getElementById('pattern-group-save-btn');
                break;
            case 'pattern':
                button = document.getElementById('pattern-save-btn');
                break;
        }

        if (button) {
            if (this.isDirty[level]) {
                button.style.display = 'flex';
            } else {
                button.style.display = 'none';
            }
        }
    }

    // Check if anything is dirty
    hasUnsavedChanges() {
        return Object.values(this.isDirty).some(dirty => dirty);
    }

    // Setup save button handlers
    setupSaveButtons() {
        // Preset save button (Level 5 - highest)
        const presetSaveBtn = document.getElementById('preset-save-btn');
        if (presetSaveBtn) {
            presetSaveBtn.addEventListener('click', () => {
                this.scheduleSave('preset', true);
            });
            // Initially hide
            presetSaveBtn.style.display = 'none';
        }

        // Player save button (Level 4)
        const playerSaveBtn = document.getElementById('player-save-btn');
        if (playerSaveBtn) {
            playerSaveBtn.addEventListener('click', () => {
                this.scheduleSave('player', true);
            });
            // Initially hide
            playerSaveBtn.style.display = 'none';
        }

        // Drumkit save button (Level 3)
        const drumkitSaveBtn = document.getElementById('drumkit-save-btn');
        if (drumkitSaveBtn) {
            drumkitSaveBtn.addEventListener('click', () => {
                this.scheduleSave('drumkits', true);
            });
            // Initially hide
            drumkitSaveBtn.style.display = 'none';
        }

        // Pattern group save button (Level 2)
        const patternGroupSaveBtn = document.getElementById('pattern-group-save-btn');
        if (patternGroupSaveBtn) {
            patternGroupSaveBtn.addEventListener('click', () => {
                this.scheduleSave('patternGroups', true);
            });
            // Initially hide
            patternGroupSaveBtn.style.display = 'none';
        }

        // Pattern save button (Level 1 - lowest)
        const patternSaveBtn = document.getElementById('pattern-save-btn');
        if (patternSaveBtn) {
            patternSaveBtn.addEventListener('click', () => {
                this.scheduleSave('pattern', true);
            });
            // Initially hide
            patternSaveBtn.style.display = 'none';
        }
    }

    // Safe localStorage wrapper methods
    safeLocalStorageSet(key, value) {
        try {
            // Validate data before saving
            if (!this.validateStoredDataEnhanced(key, value)) {
                console.error(`Invalid data structure for ${key}, cannot save`);
                this.logStorageError(key, 'set', new Error('Validation failed'));
                return false;
            }

            // Check if compression is beneficial
            const originalSize = JSON.stringify(value).length;
            let dataToSave = value;
            
            // Compress if data is large (over 100KB)
            if (originalSize > 100000) {
                console.log(`Compressing ${key} (${originalSize} bytes)`);
                dataToSave = this.compressData(value);
                dataToSave.compressed = true;
                const compressedSize = JSON.stringify(dataToSave).length;
                console.log(`Compressed to ${compressedSize} bytes (${Math.round((1 - compressedSize/originalSize) * 100)}% reduction)`);
            }

            // Try to save
            localStorage.setItem(key, JSON.stringify(dataToSave));
            return true;

        } catch (error) {
            this.logStorageError(key, 'set', error);

            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError' || 
                error.code === 22 || 
                error.code === 1014) {
                
                console.log('Storage quota exceeded for', key);
                
                // Try to handle quota exceeded
                if (this.handleQuotaExceeded(key, value)) {
                    return true;
                }
                
                // Show user notification
                if (this.showNotification) {
                    this.showNotification('Storage is full. Some data may not be saved.', 'error');
                }
            }

            return false;
        }
    }

    safeLocalStorageGet(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            if (!item) {
                return defaultValue;
            }

            const parsed = JSON.parse(item);
            
            // Use enhanced validation
            if (!this.validateStoredDataEnhanced(key, parsed)) {
                console.warn(`Invalid data structure for ${key}, attempting recovery`);
                
                // Try to recover or return default
                const recovered = this.recoverCorruptedData(key, parsed);
                if (recovered && this.validateStoredDataEnhanced(key, recovered)) {
                    // Save the recovered data
                    localStorage.setItem(key, JSON.stringify(recovered));
                    return recovered;
                }
                
                console.error(`Unable to recover ${key}, using default value`);
                return defaultValue;
            }

            // Check if data needs decompression
            if (parsed.compressed === true) {
                return this.decompressData(parsed);
            }

            return parsed;

        } catch (error) {
            this.logStorageError(key, 'get', error);

            // Try to determine the type of error
            if (error instanceof SyntaxError) {
                console.error(`Corrupted JSON in ${key}, clearing and using default`);
                try {
                    localStorage.removeItem(key);
                } catch (removeError) {
                    console.error(`Unable to remove corrupted ${key}:`, removeError);
                }
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

    // Enhanced data validation with deep structure checking
    validateDataStructure(data, schema) {
        // Recursive validation against a schema
        if (!data || !schema) return false;
        
        for (const [key, rules] of Object.entries(schema)) {
            const value = data[key];
            
            // Check required fields
            if (rules.required && (value === undefined || value === null)) {
                console.error(`Validation failed: Required field "${key}" is missing`);
                return false;
            }
            
            // Skip optional fields if not present
            if (!rules.required && (value === undefined || value === null)) {
                continue;
            }
            
            // Type checking
            if (rules.type) {
                const actualType = Array.isArray(value) ? 'array' : typeof value;
                if (actualType !== rules.type) {
                    console.error(`Validation failed: Field "${key}" should be ${rules.type} but is ${actualType}`);
                    return false;
                }
            }
            
            // Array validation
            if (rules.type === 'array' && rules.itemType) {
                for (const item of value) {
                    const itemType = typeof item;
                    if (itemType !== rules.itemType && rules.itemType !== 'any') {
                        console.error(`Validation failed: Array "${key}" contains invalid item type ${itemType}`);
                        return false;
                    }
                }
            }
            
            // Nested object validation
            if (rules.type === 'object' && rules.schema) {
                if (!this.validateDataStructure(value, rules.schema)) {
                    return false;
                }
            }
            
            // Custom validation function
            if (rules.validate && !rules.validate(value)) {
                console.error(`Validation failed: Custom validation for "${key}" failed`);
                return false;
            }
            
            // Range validation for numbers
            if (rules.type === 'number') {
                if (rules.min !== undefined && value < rules.min) {
                    console.error(`Validation failed: "${key}" value ${value} is below minimum ${rules.min}`);
                    return false;
                }
                if (rules.max !== undefined && value > rules.max) {
                    console.error(`Validation failed: "${key}" value ${value} is above maximum ${rules.max}`);
                    return false;
                }
            }
        }
        
        return true;
    }

    // Define schemas for different data types
    // Define schemas for different data types
    getDataSchemas() {
        return {
            playerState: {
                presetName: { type: 'string', required: true },
                kitName: { type: 'string', required: true },
                patternGroup: { type: 'string', required: true },
                selectedPattern: { type: 'string', required: false },
                kitMixerActive: { type: 'boolean', required: false },
                muted: { type: 'boolean', required: false },
                toggleStates: {
                    type: 'object',
                    required: true,
                    schema: {
                        none: { type: 'boolean', required: false },
                        auto: { type: 'boolean', required: false },
                        manual: { type: 'boolean', required: false },
                        stick: { type: 'boolean', required: false },
                        ride: { type: 'boolean', required: false },
                        lock: { type: 'boolean', required: false }
                    }
                },
                fillStates: {
                    type: 'object',
                    required: true,
                    schema: {
                        now: { type: 'boolean', required: false },
                        4: { type: 'boolean', required: false },
                        8: { type: 'boolean', required: false },
                        16: { type: 'boolean', required: false },
                        32: { type: 'boolean', required: false },
                        solo: { type: 'boolean', required: false }
                    }
                },
                sliderValues: {
                    type: 'object',
                    required: true,
                    schema: {
                        swing: { type: 'number', required: true, min: 0, max: 100 },
                        energy: { type: 'number', required: true, min: 0, max: 100 },
                        volume: { type: 'number', required: true, min: 0, max: 100 }
                    }
                }
            },
            preset: {
                name: { type: 'string', required: true },
                playerStates: { type: 'object', required: true },
                tempo: { type: 'number', required: false, min: 40, max: 300 },
                numberOfPlayers: { type: 'number', required: false, min: 1, max: 8 },
                loopPosition: { type: 'number', required: false, min: 0, max: 100 },
                isPlaying: { type: 'boolean', required: false },
                linkStates: { type: 'object', required: false },
                version: { type: 'string', required: false }
            },
            patternGroup: {
                name: { type: 'string', required: true },
                patterns: { 
                    type: 'array', 
                    required: true,
                    validate: (arr) => {
                        // Pattern groups MUST have exactly 16 patterns for the 4x4 grid
                        // But allow fixing if not exactly 16
                        return Array.isArray(arr);
                    }
                },
                selectedPattern: { type: 'string', required: false }
            },
            appState: {
                currentPreset: { type: 'string', required: true },
                currentPlayer: { type: 'number', required: true, min: 1, max: 8 },
                tempo: { type: 'number', required: true, min: 40, max: 300 },
                numberOfPlayers: { type: 'number', required: true, min: 1, max: 8 },
                isPlaying: { type: 'boolean', required: false },
                version: { type: 'string', required: false }
            }
        };
    }

    // Enhanced validation with deep structure checking
    validateStoredDataEnhanced(key, data) {
        const schemas = this.getDataSchemas();
        
        // Basic validation
        if (data === null || data === undefined) {
            return false;
        }
        
        // Schema-based validation for known keys
        switch(key) {
            case 'otto_presets':
                if (typeof data !== 'object') return false;
                // Validate each preset
                for (const [presetKey, preset] of Object.entries(data)) {
                    if (!this.validateDataStructure(preset, schemas.preset)) {
                        console.error(`Invalid preset: ${presetKey}`);
                        return false;
                    }
                    // Validate player states within preset
                    for (const [playerNum, playerState] of Object.entries(preset.playerStates)) {
                        if (!this.validateDataStructure(playerState, schemas.playerState)) {
                            console.error(`Invalid player state in preset ${presetKey}, player ${playerNum}`);
                            return false;
                        }
                    }
                }
                return true;
                
            case 'otto_app_state':
                return this.validateDataStructure(data, schemas.appState);
                
            case 'ottoPatternGroups':
                if (typeof data !== 'object') return false;
                for (const [groupKey, group] of Object.entries(data)) {
                    if (!this.validateDataStructure(group, schemas.patternGroup)) {
                        console.error(`Invalid pattern group: ${groupKey}`);
                        return false;
                    }
                }
                return true;
                
            case 'ottoDrumkits':
                // Basic validation for drumkits
                return data && typeof data === 'object';
                
            case 'otto_preset_locks':
                // Validate locks are boolean values
                if (typeof data !== 'object') return false;
                for (const value of Object.values(data)) {
                    if (typeof value !== 'boolean') return false;
                }
                return true;
                
            default:
                // Use original validation for unknown keys
                return this.validateStoredData(key, data);
        }
    }

    // Data migration system
    migrateData(key, data, fromVersion, toVersion) {
        console.log(`Migrating ${key} from version ${fromVersion} to ${toVersion}`);
        
        // Define migration paths
        const migrations = {
            'otto_presets': {
                '1.0.0_to_1.1.0': (data) => {
                    // Example: Add new field to all presets
                    for (const preset of Object.values(data)) {
                        if (!preset.version) {
                            preset.version = '1.1.0';
                        }
                        // Ensure linkStates exist
                        if (!preset.linkStates) {
                            preset.linkStates = {
                                swing: { master: null, slaves: [] },
                                energy: { master: null, slaves: [] },
                                volume: { master: null, slaves: [] }
                            };
                        }
                    }
                    return data;
                }
            },
            'otto_app_state': {
                '1.0.0_to_1.1.0': (data) => {
                    // Add version field if missing
                    if (!data.version) {
                        data.version = '1.1.0';
                    }
                    return data;
                }
            },
            'ottoPatternGroups': {
                '1.0.0_to_1.1.0': (data) => {
                    // Ensure all groups have 16 patterns
                    for (const group of Object.values(data)) {
                        if (!Array.isArray(group.patterns)) {
                            group.patterns = Array(16).fill('');
                        } else if (group.patterns.length < 16) {
                            while (group.patterns.length < 16) {
                                group.patterns.push('');
                            }
                        }
                    }
                    return data;
                }
            }
        };
        
        // Apply migrations
        if (migrations[key]) {
            const migrationKey = `${fromVersion}_to_${toVersion}`;
            if (migrations[key][migrationKey]) {
                try {
                    return migrations[key][migrationKey](data);
                } catch (error) {
                    console.error(`Migration failed for ${key}:`, error);
                    return data; // Return unmigrated data on error
                }
            }
        }
        
        return data; // No migration needed
    }

    // Compression utilities
    compressData(data) {
        // Remove unnecessary fields to save space
        const compressed = JSON.parse(JSON.stringify(data)); // Deep clone
        
        // Remove timestamps if they exist
        this.removeFieldRecursive(compressed, 'timestamp');
        this.removeFieldRecursive(compressed, 'lastModified');
        
        // Convert boolean arrays to bit flags where possible
        if (compressed.playerStates) {
            for (const state of Object.values(compressed.playerStates)) {
                // Compress toggle states to bit flags
                if (state.toggleStates) {
                    state.toggleFlags = this.booleanObjectToBitFlags(state.toggleStates);
                    delete state.toggleStates;
                }
                // Compress fill states to bit flags
                if (state.fillStates) {
                    state.fillFlags = this.booleanObjectToBitFlags(state.fillStates);
                    delete state.fillStates;
                }
            }
        }
        
        return compressed;
    }

    decompressData(data) {
        // Restore full format from compressed data
        const decompressed = JSON.parse(JSON.stringify(data)); // Deep clone
        
        // Restore boolean states from bit flags
        if (decompressed.playerStates) {
            for (const state of Object.values(decompressed.playerStates)) {
                // Restore toggle states
                if (state.toggleFlags !== undefined) {
                    state.toggleStates = this.bitFlagsToBooleanObject(state.toggleFlags, 
                        ['none', 'auto', 'manual', 'stick', 'ride', 'lock']);
                    delete state.toggleFlags;
                }
                // Restore fill states
                if (state.fillFlags !== undefined) {
                    state.fillStates = this.bitFlagsToBooleanObject(state.fillFlags,
                        ['now', '4', '8', '16', '32', 'solo']);
                    delete state.fillFlags;
                }
            }
        }
        
        return decompressed;
    }

    booleanObjectToBitFlags(obj) {
        const keys = Object.keys(obj);
        let flags = 0;
        keys.forEach((key, index) => {
            if (obj[key]) {
                flags |= (1 << index);
            }
        });
        return flags;
    }

    bitFlagsToBooleanObject(flags, keys) {
        const obj = {};
        keys.forEach((key, index) => {
            obj[key] = !!(flags & (1 << index));
        });
        return obj;
    }

    removeFieldRecursive(obj, fieldName) {
        if (!obj || typeof obj !== 'object') return;
        
        if (Array.isArray(obj)) {
            obj.forEach(item => this.removeFieldRecursive(item, fieldName));
        } else {
            delete obj[fieldName];
            Object.values(obj).forEach(value => {
                if (typeof value === 'object') {
                    this.removeFieldRecursive(value, fieldName);
                }
            });
        }
    }

    recoverCorruptedData(key, data) {
        console.log(`Attempting to recover data for key: ${key}`);
        
        // Attempt to fix common data corruption issues
        try {
            if (key === 'ottoPatternGroups' && data) {
                // Fix pattern groups that don't have exactly 16 patterns
                const recovered = {};
                for (const [groupKey, group] of Object.entries(data)) {
                    // The "all" group is special and might have different structure
                    if (groupKey === 'all') {
                        // Skip or handle "all" group specially
                        continue;
                    }
                    
                    const fixedGroup = {
                        name: group.name || groupKey,
                        patterns: Array.isArray(group.patterns) ? group.patterns : [],
                        selectedPattern: group.selectedPattern || null
                    };
                    
                    // Ensure exactly 16 patterns for the 4x4 grid
                    if (fixedGroup.patterns.length < 16) {
                        // Pad with empty strings
                        while (fixedGroup.patterns.length < 16) {
                            fixedGroup.patterns.push('');
                        }
                    } else if (fixedGroup.patterns.length > 16) {
                        // Trim to 16
                        fixedGroup.patterns = fixedGroup.patterns.slice(0, 16);
                    }
                    
                    recovered[groupKey] = fixedGroup;
                }
                
                // Ensure at least the favorites group exists
                if (!recovered.favorites) {
                    recovered.favorites = {
                        name: 'Favorites',
                        patterns: Array(16).fill(''),
                        selectedPattern: null
                    };
                }
                
                console.log('Pattern groups recovered successfully');
                return recovered;
            }
            
            // Add recovery for other data types as needed
            
        } catch (error) {
            console.error('Recovery failed:', error);
        }
        
        return null;
    }

    handleQuotaExceeded(key, value) {
        console.log('Storage quota exceeded, implementing advanced cleanup...');

        // Enhanced storage cleanup strategy
        const storageInfo = this.analyzeStorageUsage();
        console.log('Storage analysis:', storageInfo);

        // Priority-based cleanup
        const cleanupPriority = [
            { key: 'otto_backup', description: 'backup data' },
            { key: 'otto_history', description: 'history data' },
            { key: 'otto_temp', description: 'temporary data' },
            { key: 'otto_debug', description: 'debug logs' },
            { key: 'otto_cache', description: 'cached data' }
        ];

        // Clean up low-priority items first
        for (const item of cleanupPriority) {
            try {
                if (localStorage.getItem(item.key)) {
                    localStorage.removeItem(item.key);
                    console.log(`Removed ${item.description}: ${item.key}`);
                    
                    // Try to save again after each cleanup
                    try {
                        localStorage.setItem(key, JSON.stringify(value));
                        console.log('Successfully saved after cleanup');
                        return true;
                    } catch (e) {
                        // Continue cleaning if still not enough space
                    }
                }
            } catch (e) {
                console.error(`Error removing ${item.key}:`, e);
            }
        }

        // Compress the data more aggressively
        if (value && typeof value === 'object') {
            const compressed = this.compressData(value);
            const originalSize = JSON.stringify(value).length;
            const compressedSize = JSON.stringify(compressed).length;
            const saved = originalSize - compressedSize;
            
            console.log(`Compression saved ${saved} bytes (${Math.round(saved/originalSize*100)}%)`);
            
            try {
                localStorage.setItem(key, JSON.stringify(compressed));
                console.log('Successfully saved compressed data');
                return true;
            } catch (e) {
                console.error('Still unable to save after compression:', e);
            }
        }

        // Find and remove the largest non-essential items
        const items = this.getStorageItemsSortedBySize();
        const nonEssential = items.filter(item => 
            !item.key.includes('preset') && 
            !item.key.includes('app_state') &&
            item.key !== key
        );

        if (nonEssential.length > 0) {
            const toRemove = nonEssential[0]; // Remove largest non-essential item
            console.log(`Removing largest non-essential item: ${toRemove.key} (${toRemove.size} bytes)`);
            
            try {
                localStorage.removeItem(toRemove.key);
                localStorage.setItem(key, JSON.stringify(value));
                this.showNotification(`Storage optimized. Removed ${toRemove.key} to make space.`, 'warning');
                return true;
            } catch (e) {
                console.error('Unable to save even after removing largest item:', e);
            }
        }

        // Last resort - user decision
        if (confirm('Storage is critically full. Remove all non-preset data to make space?')) {
            const preserveKeys = ['otto_presets', 'otto_app_state', 'otto_preset_locks'];
            
            Object.keys(localStorage).forEach(storageKey => {
                if (!preserveKeys.includes(storageKey) && storageKey !== key) {
                    try {
                        localStorage.removeItem(storageKey);
                    } catch (e) {
                        // Ignore errors
                    }
                }
            });
            
            try {
                localStorage.setItem(key, JSON.stringify(value));
                this.showNotification('Storage cleared. Only presets preserved.', 'warning');
                return true;
            } catch (e) {
                console.error('Critical: Unable to save even after major cleanup:', e);
                this.showNotification('Storage critically full. Unable to save.', 'error');
            }
        }

        return false;
    }

    analyzeStorageUsage() {
        const usage = {};
        let totalSize = 0;
        
        try {
            for (let key in localStorage) {
                try {
                    const value = localStorage.getItem(key);
                    if (value !== null && value !== undefined) {
                        const size = value.length;
                        usage[key] = size;
                        totalSize += size;
                    }
                } catch (e) {
                    // Skip items that can't be accessed
                    console.warn(`Unable to analyze storage item ${key}:`, e);
                }
            }
        } catch (e) {
            console.error('Error analyzing storage:', e);
        }
        
        return {
            items: usage,
            totalSize: totalSize,
            itemCount: Object.keys(usage).length,
            estimatedLimit: 5 * 1024 * 1024 // 5MB typical limit
        };
    }

    getStorageItemsSortedBySize() {
        const items = [];
        
        try {
            for (let key in localStorage) {
                try {
                    const value = localStorage.getItem(key);
                    if (value !== null && value !== undefined) {
                        items.push({
                            key: key,
                            size: value.length
                        });
                    }
                } catch (e) {
                    // Skip items that can't be accessed
                    console.warn(`Unable to get size of ${key}:`, e);
                }
            }
        } catch (e) {
            console.error('Error getting storage items:', e);
        }
        
        return items.sort((a, b) => b.size - a.size);
    }

    // Storage abstraction layer with fallbacks
    createStorageLayer() {
        return {
            primary: localStorage,
            fallback: null,
            memoryCache: new Map(),
            
            get(key) {
                // Try memory cache first
                if (this.memoryCache.has(key)) {
                    return this.memoryCache.get(key);
                }
                
                // Try primary storage
                try {
                    const value = this.primary.getItem(key);
                    if (value !== null && value !== undefined && value !== '') {
                        const parsed = JSON.parse(value);
                        this.memoryCache.set(key, parsed);
                        return parsed;
                    }
                } catch (e) {
                    console.error(`Error reading ${key} from primary storage:`, e);
                }
                
                // Try fallback storage
                if (this.fallback) {
                    try {
                        return this.fallback.get(key);
                    } catch (e) {
                        console.error(`Error reading ${key} from fallback storage:`, e);
                    }
                }
                
                return null;
            },
            
            set(key, value, options = {}) {
                // Update memory cache
                this.memoryCache.set(key, value);
                
                // Try to save to primary storage
                try {
                    const stringified = JSON.stringify(value);
                    this.primary.setItem(key, stringified);
                    return true;
                } catch (e) {
                    if (e.name === 'QuotaExceededError') {
                        // Try compression and cleanup
                        const compressed = options.compress ? this.compress(value) : value;
                        if (this.handleQuotaExceeded(key, compressed)) {
                            return true;
                        }
                    }
                    
                    console.error(`Error saving ${key} to primary storage:`, e);
                    
                    // Try fallback storage
                    if (this.fallback) {
                        try {
                            this.fallback.set(key, value);
                            return true;
                        } catch (fallbackError) {
                            console.error(`Error saving ${key} to fallback storage:`, fallbackError);
                        }
                    }
                }
                
                return false;
            },
            
            remove(key) {
                // Remove from all storage layers
                this.memoryCache.delete(key);
                
                try {
                    this.primary.removeItem(key);
                } catch (e) {
                    console.error(`Error removing ${key} from primary storage:`, e);
                }
                
                if (this.fallback) {
                    try {
                        this.fallback.remove(key);
                    } catch (e) {
                        console.error(`Error removing ${key} from fallback storage:`, e);
                    }
                }
            },
            
            clear(preserveKeys = []) {
                // Clear memory cache except preserved keys
                for (const key of this.memoryCache.keys()) {
                    if (!preserveKeys.includes(key)) {
                        this.memoryCache.delete(key);
                    }
                }
                
                // Clear primary storage except preserved keys
                const keysToRemove = [];
                try {
                    for (let i = 0; i < this.primary.length; i++) {
                        const key = this.primary.key(i);
                        if (key && !preserveKeys.includes(key)) {
                            keysToRemove.push(key);
                        }
                    }
                } catch (e) {
                    console.error('Error iterating storage keys:', e);
                }
                
                keysToRemove.forEach(key => {
                    try {
                        this.primary.removeItem(key);
                    } catch (e) {
                        console.error(`Error removing ${key}:`, e);
                    }
                });
                
                // Clear fallback storage
                if (this.fallback) {
                    this.fallback.clear(preserveKeys);
                }
            },
            
            getSize() {
                let totalSize = 0;
                
                try {
                    for (let i = 0; i < this.primary.length; i++) {
                        const key = this.primary.key(i);
                        if (key) {
                            try {
                                const value = this.primary.getItem(key);
                                if (value !== null && value !== undefined) {
                                    totalSize += key.length + value.length;
                                }
                            } catch (e) {
                                // Ignore items that can't be accessed
                            }
                        }
                    }
                } catch (e) {
                    console.error('Error calculating storage size:', e);
                }
                
                return totalSize;
            },
            
            compress(data) {
                // Implement compression logic from earlier
                return data; // Simplified for now
            },
            
            handleQuotaExceeded(key, value) {
                // Delegate to main handler
                return false; // Simplified for now
            }
        };
    }

    // Safe DOM manipulation helpers
    safeQuerySelector(selector, parent = document) {
        try {
            const element = parent.querySelector(selector);
            if (!element) {
                console.debug(`Element not found: ${selector}`);
            }
            return element;
        } catch (error) {
            console.error(`Invalid selector: ${selector}`, error);
            return null;
        }
    }

    safeQuerySelectorAll(selector, parent = document) {
        try {
            return parent.querySelectorAll(selector) || [];
        } catch (error) {
            console.error(`Invalid selector: ${selector}`, error);
            return [];
        }
    }

    safeGetElementById(id) {
        const element = document.getElementById(id);
        if (!element) {
            console.debug(`Element with ID not found: ${id}`);
        }
        return element;
    }

    safeSetTextContent(selector, text, parent = document) {
        const element = typeof selector === 'string' ? 
            this.safeQuerySelector(selector, parent) : selector;
        
        if (element && element.textContent !== undefined) {
            element.textContent = text;
            return true;
        }
        return false;
    }

    safeSetAttribute(selector, attribute, value, parent = document) {
        const element = typeof selector === 'string' ? 
            this.safeQuerySelector(selector, parent) : selector;
        
        if (element && typeof element.setAttribute === 'function') {
            element.setAttribute(attribute, value);
            return true;
        }
        return false;
    }

    safeAddClass(selector, className, parent = document) {
        const element = typeof selector === 'string' ? 
            this.safeQuerySelector(selector, parent) : selector;
        
        if (element && element.classList) {
            element.classList.add(className);
            return true;
        }
        return false;
    }

    safeRemoveClass(selector, className, parent = document) {
        const element = typeof selector === 'string' ? 
            this.safeQuerySelector(selector, parent) : selector;
        
        if (element && element.classList) {
            element.classList.remove(className);
            return true;
        }
        return false;
    }

    safeToggleClass(selector, className, condition, parent = document) {
        const element = typeof selector === 'string' ? 
            this.safeQuerySelector(selector, parent) : selector;
        
        if (element && element.classList) {
            element.classList.toggle(className, condition);
            return true;
        }
        return false;
    }

    // Batch DOM updates for efficiency
    batchDOMUpdates(updates) {
        // Use requestAnimationFrame for smoother updates
        requestAnimationFrame(() => {
            updates.forEach(update => {
                try {
                    update();
                } catch (error) {
                    console.error('Error in batch DOM update:', error);
                }
            });
        });
    }

    // Differential DOM updates - only update what changed
    differentialUpdate(selector, updates) {
        const element = typeof selector === 'string' ? 
            this.safeQuerySelector(selector) : selector;
        
        if (!element) return false;
        
        let hasChanges = false;
        
        // Check text content
        if (updates.textContent !== undefined && element.textContent !== updates.textContent) {
            element.textContent = updates.textContent;
            hasChanges = true;
        }
        
        // Check attributes
        if (updates.attributes) {
            for (const [attr, value] of Object.entries(updates.attributes)) {
                if (element.getAttribute(attr) !== value) {
                    element.setAttribute(attr, value);
                    hasChanges = true;
                }
            }
        }
        
        // Check classes to add
        if (updates.addClass) {
            const classes = Array.isArray(updates.addClass) ? updates.addClass : [updates.addClass];
            classes.forEach(className => {
                if (!element.classList.contains(className)) {
                    element.classList.add(className);
                    hasChanges = true;
                }
            });
        }
        
        // Check classes to remove
        if (updates.removeClass) {
            const classes = Array.isArray(updates.removeClass) ? updates.removeClass : [updates.removeClass];
            classes.forEach(className => {
                if (element.classList.contains(className)) {
                    element.classList.remove(className);
                    hasChanges = true;
                }
            });
        }
        
        // Check styles
        if (updates.styles) {
            for (const [prop, value] of Object.entries(updates.styles)) {
                if (element.style[prop] !== value) {
                    element.style[prop] = value;
                    hasChanges = true;
                }
            }
        }
        
        return hasChanges;
    }

    // Cache DOM queries for frequently accessed elements
    initDOMCache() {
        this.domCache = new Map();
        
        // Cache commonly used elements
        const commonSelectors = [
            '#tempo-display',
            '#current-player-number',
            '#kit-dropdown',
            '#group-dropdown',
            '#preset-dropdown',
            '#mute-drummer-btn',
            '#kit-mixer-btn',
            '.pattern-grid',
            '.player-tabs',
            '.mute-overlay'
        ];
        
        commonSelectors.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                this.domCache.set(selector, element);
            }
        });
    }

    // Get cached element or query if not cached
    getCachedElement(selector) {
        if (!this.domCache) {
            this.initDOMCache();
        }
        
        if (this.domCache.has(selector)) {
            return this.domCache.get(selector);
        }
        
        // Not in cache, query and cache if found
        const element = document.querySelector(selector);
        if (element) {
            this.domCache.set(selector, element);
        }
        
        return element;
    }

    // Clear DOM cache when major changes occur
    clearDOMCache() {
        if (this.domCache) {
            this.domCache.clear();
        }
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
        if (this.isDestroyed) return;

        const error = {
            key,
            errorType,
            message,
            timestamp: Date.now()
        };

        this.storageErrors.push(error);

        // Keep only last N errors to prevent memory leak
        while (this.storageErrors.length > this.maxStorageErrors) {
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
        console.log('Initializing app state with enhanced storage...');
        
        // Initialize storage layer
        if (!this.storage) {
            this.storage = this.createStorageLayer();
        }
        
        // Clean up old/invalid storage data first
        this.clearOldStorageData();
        
        // Load app state with validation
        const savedState = this.loadAppStateFromStorage();
        
        if (savedState) {
            // Apply saved state with validation
            if (savedState.currentPlayer && savedState.currentPlayer >= 1 && savedState.currentPlayer <= this.maxPlayers) {
                this.currentPlayer = savedState.currentPlayer;
            }
            if (savedState.tempo && savedState.tempo >= 40 && savedState.tempo <= 300) {
                this.tempo = savedState.tempo;
            }
            if (savedState.numberOfPlayers && savedState.numberOfPlayers >= 1 && savedState.numberOfPlayers <= this.maxPlayers) {
                this.numberOfPlayers = savedState.numberOfPlayers;
            }
            if (savedState.currentPreset) {
                this.currentPreset = savedState.currentPreset;
            }
            if (typeof savedState.isPlaying === 'boolean') {
                this.isPlaying = savedState.isPlaying;
            }
            
            console.log('App state restored from storage');
        } else {
            console.log('No saved app state found, using defaults');
            // Save initial state
            this.saveAppStateToStorage();
        }
        
        // Analyze storage usage on startup
        const storageInfo = this.analyzeStorageUsage();
        console.log(`Storage usage: ${storageInfo.itemCount} items, ${Math.round(storageInfo.totalSize / 1024)}KB used`);
        
        // Warn if storage is getting full
        const usagePercent = (storageInfo.totalSize / storageInfo.estimatedLimit) * 100;
        if (usagePercent > 80) {
            console.warn(`Storage is ${Math.round(usagePercent)}% full`);
            if (this.showNotification) {
                setTimeout(() => {
                    this.showNotification(`Storage is ${Math.round(usagePercent)}% full. Consider cleaning up old data.`, 'warning');
                }, 2000);
            }
        }
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
            numberOfPlayers: this.numberOfPlayers
            // NOTE: Do NOT save loopPosition - it's a real-time transport position
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
        const presetPanel = document.getElementById('preset-panel');
        const presetPanelClose = document.getElementById('preset-panel-close');
        const presetList = document.getElementById('preset-list');
        const presetUndoBtn = document.getElementById('preset-undo-btn');
        const presetNewBtn = document.getElementById('preset-new-btn');
        const factoryResetBtn = document.getElementById('preset-factory-reset-btn');
        const presetNameInput = document.getElementById('preset-name-input');

        // Clean up existing preset management listeners
        this.modalListeners = this.modalListeners.filter(({ element }) => {
            return element !== presetEditBtn &&
                   element !== presetPanelClose &&
                   element !== presetPanel &&
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

        // Close preset panel
        if (presetPanelClose) {
            const closeHandler = () => {
                this.closePresetModal();
            };
            this.addEventListener(presetPanelClose, 'click', closeHandler, this.modalListeners);
        }

        // No click-outside-to-close for panels (they're more intentional)

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
        const settingsPanel = document.getElementById('settings-panel');
        const settingsPanelClose = document.getElementById('settings-panel-close');
        const settingsFactoryResetBtn = document.getElementById('settings-factory-reset-btn');

        // Close settings panel
        if (settingsPanelClose) {
            settingsPanelClose.addEventListener('click', () => {
                if (settingsPanel) {
                    settingsPanel.classList.remove('active');
                    // Remove button active state
                    const btn = document.getElementById('settings-btn');
                    if (btn) {
                        btn.classList.remove('panel-active');
                    }
                }
            });
        }

        // Factory reset button in settings
        if (settingsFactoryResetBtn) {
            settingsFactoryResetBtn.addEventListener('click', () => {
                this.resetToFactoryDefaults();
                // Close settings panel after reset
                if (settingsPanel) {
                    settingsPanel.classList.remove('active');
                    // Also remove panel-active from settings button
                    const settingsBtn = document.getElementById('settings-btn');
                    if (settingsBtn) {
                        settingsBtn.classList.remove('panel-active');
                    }
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

        // Setup Store Modal
        this.setupModalWindow('store-modal', 'store-modal-close');
    }

    setupModalWindow(modalId) {
        // Convert modal ID to panel ID
        const panelId = modalId.replace('-modal', '-panel');
        const panel = document.getElementById(panelId);
        const closeBtn = panel?.querySelector('.panel-close-btn');

        if (panel && closeBtn) {
            // Close button click
            const closeHandler = () => {
                panel.classList.remove('active');

                // Remove panel-active class from corresponding button
                let btnId = null;
                switch(panelId) {
                    case 'link-panel':
                        btnId = 'link-btn';
                        break;
                    case 'cloud-panel':
                        btnId = 'upload-btn';
                        break;
                    case 'mixer-panel':
                        btnId = 'kit-mixer-btn';
                        break;
                    case 'kit-edit-panel':
                        btnId = null; // Multiple edit buttons, handled separately
                        break;
                    case 'settings-panel':
                        btnId = 'settings-btn';
                        break;
                    case 'preset-panel':
                        btnId = 'preset-edit-btn';
                        break;
                }

                if (btnId) {
                    const btn = document.getElementById(btnId);
                    if (btn) {
                        btn.classList.remove('panel-active');
                    }
                }

                // For kit edit panel, remove active from all edit buttons
                if (panelId === 'kit-edit-panel') {
                    document.querySelectorAll('.kit-edit-btn').forEach(btn => {
                        btn.classList.remove('panel-active');
                    });
                }
            };
            this.addEventListener(closeBtn, 'click', closeHandler, this.modalListeners);

            // No click-outside-to-close for panels (they're more intentional)
        }
    }

    openLinkModal() {
        const panel = document.getElementById('link-panel');
        const btn = document.getElementById('link-btn');

        if (panel) {
            panel.classList.toggle('active');

            // Toggle button active state
            if (btn) {
                btn.classList.toggle('panel-active', panel.classList.contains('active'));
            }
        }
    }

    openCloudModal() {
        const panel = document.getElementById('cloud-panel');
        const btn = document.getElementById('upload-btn');

        if (panel) {
            panel.classList.toggle('active');

            // Toggle button active state
            if (btn) {
                btn.classList.toggle('panel-active', panel.classList.contains('active'));
            }
        }
    }

    openMixerModal() {
        const panel = document.getElementById('mixer-panel');
        const btn = document.getElementById('kit-mixer-btn');

        if (panel) {
            // If opening, update the kit name
            if (!panel.classList.contains('active')) {
                const kitNameSpan = panel.querySelector('#mixer-kit-name');
                if (kitNameSpan) {
                    const currentPlayer = this.currentPlayer;
                    const kitName = this.playerStates[currentPlayer]?.kitName || 'Acoustic';
                    kitNameSpan.textContent = kitName;
                }
            }
            panel.classList.toggle('active');

            // Toggle button active state
            if (btn) {
                btn.classList.toggle('panel-active', panel.classList.contains('active'));
            }
        }
    }

    openKitEditModal() {
        const panel = document.getElementById('kit-edit-panel');
        const btn = document.querySelector('.kit-edit-btn');

        if (panel) {
            panel.classList.toggle('active');

            // Toggle button active state
            if (btn) {
                btn.classList.toggle('panel-active', panel.classList.contains('active'));
            }
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
        // Get button elements
        const addGroupBtn = document.getElementById('add-group-btn');
        const renameGroupBtn = document.getElementById('rename-group-btn');

        // Clean up existing handlers before adding new ones
        if (this.specificHandlers.addGroup) {
            if (addGroupBtn) {
                this.removeEventListener(addGroupBtn, 'click', this.specificHandlers.addGroup, 'pattern');
            }
            this.specificHandlers.addGroup = null;
        }
        if (this.specificHandlers.renameGroup) {
            if (renameGroupBtn) {
                this.removeEventListener(renameGroupBtn, 'click', this.specificHandlers.renameGroup, 'pattern');
            }
            this.specificHandlers.renameGroup = null;
        }

        // Create new handlers
        const addGroupHandler = () => {
            if (this.isDestroyed) return;

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

            // Mark as dirty but don't auto-save
            this.setDirty('patternGroup', true);

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
            this.setDirty('preset', true);

            // Show notification
            this.showNotification(`Group "${trimmedName}" created successfully`);
        };

        const renameGroupHandler = () => {
            if (this.isDestroyed) return;

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

                // Mark as dirty
                this.setDirty('patternGroup', true);

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

            // Update dropdown
            this.updatePatternGroupDropdown();

            // Mark preset as dirty
            this.setDirty('preset', true);

            // Show notification
            this.showNotification(`Group renamed to "${trimmedName}"`);
        };

        // Store handlers in specificHandlers for proper cleanup
        this.specificHandlers.addGroup = addGroupHandler;
        this.specificHandlers.renameGroup = renameGroupHandler;

        // Add the event listeners using the enhanced method
        if (addGroupBtn) {
            this.addEventListener(addGroupBtn, 'click', addGroupHandler, 'pattern');
        }

        if (renameGroupBtn) {
            this.addEventListener(renameGroupBtn, 'click', renameGroupHandler, 'pattern');
        }
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
        const patternKey = shortName.toLowerCase().replace(/\\s+/g, '-');
        e.currentTarget.dataset.pattern = patternKey;

        // Mark pattern as dirty (will cascade up to patternGroup, player, and preset)
        this.setDirty('pattern', true);
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

    // Drumkit Management Methods
    loadDrumkits() {
        // Load saved drumkits from localStorage with error handling
        const savedDrumkits = this.safeLocalStorageGet('ottoDrumkits', null);
        if (savedDrumkits) {
            this.drumkits = savedDrumkits;
        } else {
            // Initialize with default drumkits and their mixer presets
            this.drumkits = {
                'Acoustic': {
                    name: 'Acoustic',
                    selectedMixerPreset: 'default',
                    mixerPresets: {
                        'default': {
                            name: 'Default',
                            levels: { kick: 75, snare: 70, hihat: 60, tom: 65, crash: 80, ride: 70 }
                        },
                        'punchy': {
                            name: 'Punchy',
                            levels: { kick: 85, snare: 80, hihat: 55, tom: 70, crash: 75, ride: 65 }
                        }
                    }
                },
                'Electronic': {
                    name: 'Electronic',
                    selectedMixerPreset: 'default',
                    mixerPresets: {
                        'default': {
                            name: 'Default',
                            levels: { kick: 80, snare: 75, hihat: 70, tom: 60, crash: 85, ride: 75 }
                        }
                    }
                },
                'Rock': {
                    name: 'Rock',
                    selectedMixerPreset: 'default',
                    mixerPresets: {
                        'default': {
                            name: 'Default',
                            levels: { kick: 90, snare: 85, hihat: 65, tom: 75, crash: 90, ride: 70 }
                        }
                    }
                },
                'Jazz': {
                    name: 'Jazz',
                    selectedMixerPreset: 'default',
                    mixerPresets: {
                        'default': {
                            name: 'Default',
                            levels: { kick: 60, snare: 65, hihat: 75, tom: 55, crash: 70, ride: 80 }
                        }
                    }
                },
                'Pop': {
                    name: 'Pop',
                    selectedMixerPreset: 'default',
                    mixerPresets: {
                        'default': {
                            name: 'Default',
                            levels: { kick: 75, snare: 80, hihat: 70, tom: 60, crash: 75, ride: 65 }
                        }
                    }
                },
                'Funk': {
                    name: 'Funk',
                    selectedMixerPreset: 'default',
                    mixerPresets: {
                        'default': {
                            name: 'Default',
                            levels: { kick: 85, snare: 90, hihat: 80, tom: 70, crash: 75, ride: 75 }
                        }
                    }
                },
                'Latin': {
                    name: 'Latin',
                    selectedMixerPreset: 'default',
                    mixerPresets: {
                        'default': {
                            name: 'Default',
                            levels: { kick: 70, snare: 75, hihat: 85, tom: 80, crash: 70, ride: 75 }
                        }
                    }
                },
                'Vintage': {
                    name: 'Vintage',
                    selectedMixerPreset: 'default',
                    mixerPresets: {
                        'default': {
                            name: 'Default',
                            levels: { kick: 65, snare: 70, hihat: 60, tom: 65, crash: 75, ride: 70 }
                        }
                    }
                }
            };
            // Save default drumkits
            this.saveDrumkits();
        }
    }

    saveDrumkits() {
        // Use safe wrapper with error handling
        this.safeLocalStorageSet('ottoDrumkits', this.drumkits);
        this.setDirty('drumkit', false);
    }

    getDrumkitMixerPreset(kitName) {
        if (this.drumkits && this.drumkits[kitName]) {
            const kit = this.drumkits[kitName];
            const presetName = kit.selectedMixerPreset || 'default';
            return kit.mixerPresets[presetName] || kit.mixerPresets['default'];
        }
        return null;
    }

    setDrumkitMixerPreset(kitName, presetName) {
        if (this.drumkits && this.drumkits[kitName]) {
            this.drumkits[kitName].selectedMixerPreset = presetName;
            this.setDirty('drumkit', true);
            // Don't auto-save, wait for user to click save button
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

        // Clean up existing drag-drop listeners more thoroughly
        this.eventListeners = this.eventListeners.filter(({ element }) => {
            if (!element || !element.classList) return true;
            const isPatternItem = element.classList.contains('pattern-item');
            const isDropZone = element.classList.contains('pattern-drop-zone');
            const isPatternRemove = element.classList.contains('pattern-remove');
            return !isPatternItem && !isDropZone && !isPatternRemove;
        });

        // Make pattern items draggable
        patternItems.forEach(item => {
            const dragStartHandler = (e) => {
                if (this.isDestroyed) return;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', item.dataset.pattern);
                item.classList.add('dragging');
            };

            const dragEndHandler = () => {
                if (this.isDestroyed) return;
                item.classList.remove('dragging');
            };

            this.addEventListener(item, 'dragstart', dragStartHandler);
            this.addEventListener(item, 'dragend', dragEndHandler);
        });

        // Set up drop zones
        dropZones.forEach((zone, index) => {
            const dragOverHandler = (e) => {
                if (this.isDestroyed) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                zone.classList.add('drag-over');
            };

            const dragLeaveHandler = () => {
                if (this.isDestroyed) return;
                zone.classList.remove('drag-over');
            };

            const dropHandler = (e) => {
                if (this.isDestroyed) return;
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
                            if (this.isDestroyed) return;
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
                if (this.isDestroyed) return;
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

                // Mark as dirty but don't auto-save
                this.setDirty('patternGroup', true);

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

                    // Mark as dirty but don't auto-save
                    this.setDirty('patternGroup', true);

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
                const groups = Object.keys(this.patternGroups).filter(key => key !== 'all');
                const currentIndex = groups.indexOf(this.currentEditorGroup);
                const newIndex = currentIndex > 0 ? currentIndex - 1 : groups.length - 1;
                this.switchEditorGroup(groups[newIndex]);
            });
        }

        if (editorNextBtn) {
            editorNextBtn.addEventListener('click', () => {
                const groups = Object.keys(this.patternGroups).filter(key => key !== 'all');
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

        // Add all groups EXCEPT 'all' - it's internal only
        Object.keys(this.patternGroups).forEach(key => {
            // Skip the 'all' group - it's for internal use only
            if (key === 'all') return;

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

            // Mark as dirty but don't auto-save
            this.setDirty('patternGroup', true);
        }
    }

    savePatternGroups() {
        // Use safe wrapper with error handling
        this.safeLocalStorageSet('ottoPatternGroups', this.patternGroups);
        this.setDirty('patternGroup', false);
    }

    updateMainPatternGrid(patterns) {
        if (!patterns || !Array.isArray(patterns)) {
            console.error('Invalid patterns array provided to updateMainPatternGrid');
            return;
        }

        const patternButtons = this.safeQuerySelectorAll('.pattern-grid .pattern-btn');
        
        if (patternButtons.length === 0) {
            console.warn('No pattern buttons found in grid');
            return;
        }

        // Batch DOM updates for better performance
        const updates = [];
        
        patternButtons.forEach((btn, index) => {
            if (!btn) return;
            
            updates.push(() => {
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
        });
        
        this.batchDOMUpdates(updates);
    }

    updatePatternGroupDropdown() {
        const groupOptions = document.getElementById('group-options');
        if (!groupOptions) return;

        // Remove all existing listeners before rebuilding
        groupOptions.querySelectorAll('.dropdown-option').forEach(option => {
            const handlers = this.elementHandlerMap.get(option);
            if (handlers) {
                Object.keys(handlers).forEach(eventType => {
                    handlers[eventType].forEach(handler => {
                        option.removeEventListener(eventType, handler);
                    });
                });
                this.elementHandlerMap.delete(option);
            }
        });

        // Clear existing options
        groupOptions.innerHTML = '';

        // Add all groups EXCEPT 'all' - it's internal only
        Object.keys(this.patternGroups).forEach(key => {
            // Skip the 'all' group - it's for internal use only
            if (key === 'all') return;

            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = key;
            option.textContent = this.patternGroups[key].name;

            // Mark as selected if it's the current group
            const currentGroup = this.playerStates[this.currentPlayer].patternGroup;
            if (key === currentGroup) {
                option.classList.add('selected');
            }

            const handler = (e) => {
                e.stopPropagation();
                const dropdown = document.getElementById('group-dropdown');
                const selected = document.getElementById('group-selected');

                if (selected) {
                    selected.querySelector('.dropdown-text').textContent = option.textContent;
                }

                // Update selected state
                groupOptions.querySelectorAll('.dropdown-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                option.classList.add('selected');

                if (dropdown) {
                    dropdown.classList.remove('active');
                    dropdown.classList.remove('open'); // Also try removing 'open' in case it was added
                }

                this.onPatternGroupChanged(this.currentPlayer, key);
                this.setDirty('preset', true);
                console.log(`Pattern group changed to ${key} for player ${this.currentPlayer}`);
            };

            // Use enhanced event listener management
            this.addEventListener(option, 'click', handler, 'dropdown');

            groupOptions.appendChild(option);
        });
    }

    debugPatternGroupDropdown() {
        console.log('=== Pattern Group Dropdown Debug ===');
        console.log('Current player:', this.currentPlayer);
        console.log('Current player state:', this.playerStates[this.currentPlayer]);
        console.log('Pattern groups available:', Object.keys(this.patternGroups));
        console.log('Current pattern group:', this.playerStates[this.currentPlayer]?.patternGroup);
        
        const dropdown = document.getElementById('group-dropdown');
        const options = document.getElementById('group-options');
        console.log('Dropdown element:', dropdown);
        console.log('Options container:', options);
        console.log('Options count:', options?.children.length);
        
        if (options) {
            Array.from(options.children).forEach((opt, idx) => {
                console.log(`Option ${idx}: value="${opt.dataset.value}", text="${opt.textContent}", hasHandler=${this.elementHandlerMap.has(opt)}`);
            });
        }
        console.log('=== End Debug ===');
    }

    openPresetModal() {
        const panel = document.getElementById('preset-panel');
        const btn = document.getElementById('preset-edit-btn');

        if (panel) {
            // Toggle the panel
            panel.classList.toggle('active');

            // Toggle button active state
            if (btn) {
                btn.classList.toggle('panel-active', panel.classList.contains('active'));
            }

            // If opening, render list and focus input
            if (panel.classList.contains('active')) {
                this.renderPresetList();

                // Clear and focus the input field
                const nameInput = document.getElementById('preset-name-input');
                if (nameInput) {
                    nameInput.value = '';
                    setTimeout(() => nameInput.focus(), 100);
                }
            }
        }
    }

    closePresetModal() {
        const panel = document.getElementById('preset-panel');
        const btn = document.getElementById('preset-edit-btn');

        if (panel) {
            panel.classList.remove('active');
        }

        // Remove button active state
        if (btn) {
            btn.classList.remove('panel-active');
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

    async loadPreset(key) {
        // Use atomic operation to prevent race conditions
        return this.atomicStateUpdate('preset-load', async (version) => {
            const preset = this.presets[key];
            if (!preset) {
                console.error(`Preset "${key}" not found`);
                return false;
            }

            // Check if we can proceed
            if (!this.canProceedWithOperation('preset-load')) {
                console.warn('Cannot load preset - conflicting operation in progress');
                return false;
            }

            console.log(`Loading preset: ${preset.name} (version ${version})`);

            // Disable dirty tracking during preset load
            this.isLoadingPreset = true;
            this.loadingVersion = version;

            try {
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
                    // Initialize empty link states if not in preset
                    this.linkStates = {
                        swing: { master: null, slaves: new Set() },
                        energy: { master: null, slaves: new Set() },
                        volume: { master: null, slaves: new Set() }
                    };
                }

                // Restore global settings
                this.tempo = preset.tempo || 120;
                this.numberOfPlayers = preset.numberOfPlayers || 4;
                // NOTE: Do NOT restore loopPosition - it's a real-time transport position

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

                // NOTE: Do NOT update loop position - it's controlled by transport

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

                console.log(`Successfully loaded preset "${preset.name}" (version ${version})`);
                this.showNotification(`Loaded preset "${preset.name}"`);

                return true;
            } catch (error) {
                console.error('Error loading preset:', error);
                this.showNotification('Failed to load preset', 'error');
                throw error;
            } finally {
                // Re-enable dirty tracking
                this.isLoadingPreset = false;
                this.loadingVersion = null;

                // Clear all dirty flags since we just loaded a preset
                this.setDirty('preset', false);
                this.setDirty('player', false);
                this.setDirty('drumkit', false);
                this.setDirty('patternGroup', false);
                this.setDirty('pattern', false);
            }
        });
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
                    volume: 70
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
        if (this.isDestroyed) return;

        const presetOptions = document.getElementById('preset-options');
        const dropdown = document.getElementById('preset-dropdown');
        const dropdownText = dropdown?.querySelector('.dropdown-text');

        if (!presetOptions) return;

        // Remove all existing listeners before rebuilding
        // Use the elementHandlerMap to properly clean up
        presetOptions.querySelectorAll('.dropdown-option').forEach(option => {
            const handlers = this.elementHandlerMap.get(option);
            if (handlers) {
                Object.keys(handlers).forEach(eventType => {
                    handlers[eventType].forEach(handler => {
                        option.removeEventListener(eventType, handler);
                    });
                });
                this.elementHandlerMap.delete(option);
            }
            
            // Also clean up legacy _clickHandler if it exists
            if (option._clickHandler) {
                option.removeEventListener('click', option._clickHandler);
                delete option._clickHandler;
            }
        });

        // Clear the HTML
        presetOptions.innerHTML = '';

        // Track all option handlers for this dropdown
        const optionHandlers = [];

        for (const [key, preset] of Object.entries(this.presets)) {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = key;
            option.textContent = preset.name;

            // Mark as selected if it's the current preset
            if (key === this.currentPreset) {
                option.classList.add('selected');
            }

            // Create handler
            const handler = (e) => {
                if (this.isDestroyed) return;

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
            };

            // Add listener using enhanced method
            this.addEventListener(option, 'click', handler, 'dropdown');
            
            // Track for batch cleanup if needed
            optionHandlers.push({ element: option, handler });

            presetOptions.appendChild(option);
        }

        // Store reference to handlers for this specific dropdown (optional, for quick access)
        if (!this.dropdownHandlers) {
            this.dropdownHandlers = new Map();
        }
        this.dropdownHandlers.set('preset', optionHandlers);
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
            this.loadDrumkits();      // Load drumkit manager
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
            this.setupSaveButtons();
            this.startLoopAnimation();

            // Initialize UI for saved or default player
            this.updateUIForCurrentPlayer();

            // Defer preset loading to avoid race condition
            // Use setTimeout to allow initialization to complete first
            if (this.currentPreset && this.presets[this.currentPreset]) {
                setTimeout(() => {
                    if (!this.isDestroyed) {
                        this.loadPreset(this.currentPreset).catch(error => {
                            console.error('Failed to load initial preset:', error);
                        });
                    }
                }, 100); // Small delay to ensure everything is initialized
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
        // Setup logo/version click to show online store
        const logoVersion = document.getElementById('logo-version');
        const storePanel = document.getElementById('store-panel');
        const storeIframe = document.getElementById('store-iframe');
        const loadingMsg = document.getElementById('store-loading');
        const errorMsg = document.getElementById('store-error');

        if (logoVersion && storePanel) {
            logoVersion.addEventListener('click', () => {
                console.log('Logo clicked - toggling store panel');

                // Toggle store panel
                storePanel.classList.toggle('active');

                // Load store URL into iframe when opening
                if (storePanel.classList.contains('active') && storeIframe) {
                    console.log('Store panel is active, checking iframe...');
                    console.log('Current iframe src:', storeIframe.src);
                    console.log('Store URL to load:', this.storeURL);

                    // Check if we need to load the URL
                    if (!storeIframe.hasAttribute('data-loaded')) {
                        console.log('Loading store URL for first time...');

                        // Show loading message
                        if (loadingMsg) loadingMsg.style.display = 'block';
                        if (errorMsg) errorMsg.style.display = 'none';

                        // Set a timeout to detect if iframe doesn't load
                        const loadTimeout = setTimeout(() => {
                            console.warn('Store iframe load timeout - site may block embedding');
                            if (loadingMsg) loadingMsg.style.display = 'none';
                            if (errorMsg) errorMsg.style.display = 'block';
                        }, 5000); // 5 second timeout

                        // Listen for successful load
                        storeIframe.onload = () => {
                            clearTimeout(loadTimeout);
                            console.log('Store iframe loaded successfully');
                            if (loadingMsg) loadingMsg.style.display = 'none';
                            if (errorMsg) errorMsg.style.display = 'none';
                            storeIframe.setAttribute('data-loaded', 'true');
                        };

                        // Listen for errors
                        storeIframe.onerror = (error) => {
                            clearTimeout(loadTimeout);
                            console.error('Store iframe error:', error);
                            if (loadingMsg) loadingMsg.style.display = 'none';
                            if (errorMsg) errorMsg.style.display = 'block';
                        };

                        // Actually set the source
                        console.log('Setting iframe src to:', this.storeURL);
                        storeIframe.src = this.storeURL;

                        // Double-check it was set
                        console.log('Iframe src after setting:', storeIframe.src);
                    } else {
                        console.log('Store already loaded');
                    }
                } else {
                    console.log('Store panel closed');
                }
            });
        } else {
            console.error('Logo or store panel elements not found');
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

        // Clean up existing player tab and navigation button listeners
        this.eventListeners = this.eventListeners.filter(({ element }) => {
            // Remove player tab listeners
            if (element && element.classList && element.classList.contains('player-tab')) {
                return false;
            }
            // Remove player navigation button listeners
            if (element && (element.id === 'player-prev-btn' || element.id === 'player-next-btn')) {
                element.replaceWith(element.cloneNode(true));
                return false;
            }
            return true;
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
        // Re-get the buttons after potential cloning
        const prevBtn = document.getElementById('player-prev-btn');
        const nextBtn = document.getElementById('player-next-btn');

        if (prevBtn) {
            const prevHandler = () => {
                this.navigatePlayer(-1);
            };
            this.addEventListener(prevBtn, 'click', prevHandler);
        }

        if (nextBtn) {
            const nextHandler = () => {
                this.navigatePlayer(1);
            };
            this.addEventListener(nextBtn, 'click', nextHandler);
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

        // Add chevron navigation for presets
        const presetPrev = document.querySelector('.preset-prev');
        const presetNext = document.querySelector('.preset-next');

        if (presetPrev) {
            const prevHandler = () => {
                this.navigatePreset(-1);
            };
            this.addEventListener(presetPrev, 'click', prevHandler, this.dropdownListeners);
        }

        if (presetNext) {
            const nextHandler = () => {
                this.navigatePreset(1);
            };
            this.addEventListener(presetNext, 'click', nextHandler, this.dropdownListeners);
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
        const presetKeys = Object.keys(this.presets);
        const currentIndex = presetKeys.indexOf(this.currentPreset);

        let newIndex = currentIndex + direction;

        // Wrap around
        if (newIndex < 0) {
            newIndex = presetKeys.length - 1;
        } else if (newIndex >= presetKeys.length) {
            newIndex = 0;
        }

        const newPresetKey = presetKeys[newIndex];

        // Load the new preset
        this.loadPreset(newPresetKey);

        console.log(`Navigated to preset: ${this.presets[newPresetKey].name}`);
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

        // Update link icon states for the new current player
        if (this.linkStates) {
            this.updateLinkIconStates();
        }

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
            if (option.textContent === state.kitName) {
                option.classList.add('selected');
            }
        });

        // Update pattern group dropdown - FIXED to use actual group names
        const groupDropdownText = document.querySelector('#group-dropdown .dropdown-text');
        if (groupDropdownText && state.patternGroup) {
            // Get the actual group name from patternGroups
            if (this.patternGroups && this.patternGroups[state.patternGroup]) {
                groupDropdownText.textContent = this.patternGroups[state.patternGroup].name;
            } else {
                // Fallback to default if group doesn't exist
                console.warn(`Pattern group "${state.patternGroup}" not found, using Favorites`);
                groupDropdownText.textContent = 'Favorites';
            }
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

        // Update pattern selection - FIXED: match by data-pattern attribute
        document.querySelectorAll('.pattern-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        if (state.selectedPattern) {
            // Convert selectedPattern to the same format used in data-pattern attribute
            const normalizedPattern = state.selectedPattern.toLowerCase().replace(/\s+/g, '-');

            // Find and activate the matching pattern button
            const selectedBtn = document.querySelector(`.pattern-btn[data-pattern="${normalizedPattern}"]`);
            if (selectedBtn) {
                selectedBtn.classList.add('active');
            } else {
                // Fallback: try to match by text content
                document.querySelectorAll('.pattern-btn').forEach(btn => {
                    if (btn.textContent &&
                        btn.textContent.toLowerCase() === state.selectedPattern.toLowerCase().substring(0, 8)) {
                        btn.classList.add('active');
                    }
                });
            }
        }

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
        // Validate current player state exists
        if (!this.playerStates || !this.playerStates[this.currentPlayer]) {
            console.error(`No state found for player ${this.currentPlayer}`);
            return;
        }

        const state = this.playerStates[this.currentPlayer];
        
        // Batch all DOM updates for efficiency
        const updates = [];

        // Update player number display
        updates.push(() => {
            this.safeSetTextContent('#current-player-number', this.currentPlayer);
        });

        // Update kit dropdown
        updates.push(() => {
            this.safeSetTextContent('#kit-dropdown .dropdown-text', state.kitName);
        });

        // Update kit options selection
        const kitOptions = this.safeQuerySelectorAll('#kit-dropdown .dropdown-option');
        kitOptions.forEach(option => {
            if (!option) return;
            updates.push(() => {
                this.safeRemoveClass(option, 'selected');
                if (option.textContent === state.kitName) {
                    this.safeAddClass(option, 'selected');
                }
            });
        });

        // Update pattern group dropdown
        updates.push(() => {
            const groupText = this.safeQuerySelector('#group-dropdown .dropdown-text');
            if (groupText && state.patternGroup && this.patternGroups) {
                const group = this.patternGroups[state.patternGroup];
                if (group) {
                    groupText.textContent = group.name;
                }
            }
        });

        // Update pattern group options selection
        const groupOptions = this.safeQuerySelectorAll('#group-dropdown .dropdown-option');
        groupOptions.forEach(option => {
            if (!option) return;
            updates.push(() => {
                this.safeRemoveClass(option, 'selected');
                if (option.dataset.value === state.patternGroup) {
                    this.safeAddClass(option, 'selected');
                }
            });
        });

        // Update pattern grid if group exists
        if (state.patternGroup && this.patternGroups && this.patternGroups[state.patternGroup]) {
            const patterns = this.patternGroups[state.patternGroup].patterns;
            if (patterns) {
                this.updateMainPatternGrid(patterns);
            }
        }

        // Update toggle buttons
        const toggleButtons = this.safeQuerySelectorAll('[data-toggle]');
        toggleButtons.forEach(button => {
            if (!button || !button.dataset.toggle) return;
            updates.push(() => {
                const toggleKey = button.dataset.toggle;
                this.safeRemoveClass(button, 'active');
                if (state.toggleStates && state.toggleStates[toggleKey]) {
                    this.safeAddClass(button, 'active');
                }
            });
        });

        // Update fill buttons
        const fillButtons = this.safeQuerySelectorAll('[data-fill]');
        fillButtons.forEach(button => {
            if (!button || !button.dataset.fill) return;
            updates.push(() => {
                const fillKey = button.dataset.fill;
                this.safeRemoveClass(button, 'active');
                if (state.fillStates && state.fillStates[fillKey]) {
                    this.safeAddClass(button, 'active');
                }
            });
        });

        // Update pattern selection
        const patternButtons = this.safeQuerySelectorAll('.pattern-btn');
        patternButtons.forEach(btn => {
            if (!btn) return;
            updates.push(() => {
                this.safeRemoveClass(btn, 'active');
                if (state.selectedPattern) {
                    const normalizedPattern = state.selectedPattern.toLowerCase().replace(/\s+/g, '-');
                    if (btn.dataset.pattern === normalizedPattern || 
                        (btn.textContent && btn.textContent.toLowerCase() === state.selectedPattern.toLowerCase().substring(0, 8))) {
                        this.safeAddClass(btn, 'active');
                    }
                }
            });
        });

        // Update sliders
        if (state.sliderValues) {
            Object.keys(state.sliderValues).forEach(sliderKey => {
                const slider = this.safeQuerySelector(`.custom-slider[data-param="${sliderKey}"]`);
                if (slider) {
                    updates.push(() => {
                        const value = state.sliderValues[sliderKey];
                        this.updateCustomSlider(slider, value);
                    });
                }
            });
        }

        // Update mute button
        const muteDrummerBtn = this.safeGetElementById('mute-drummer-btn');
        if (muteDrummerBtn) {
            updates.push(() => {
                this.safeToggleClass(muteDrummerBtn, 'muted', state.muted || false);
            });
        }

        // Update kit mixer button
        const kitMixerBtn = this.safeGetElementById('kit-mixer-btn');
        if (kitMixerBtn) {
            updates.push(() => {
                this.safeToggleClass(kitMixerBtn, 'active', state.kitMixerActive || false);
            });
        }

        // Update all player tabs' visual state
        for (let i = 1; i <= this.maxPlayers; i++) {
            const tab = this.safeQuerySelector(`.player-tab[data-player="${i}"]`);
            if (tab && this.playerStates[i]) {
                updates.push(() => {
                    this.safeToggleClass(tab, 'muted', this.playerStates[i].muted || false);
                    this.safeToggleClass(tab, 'active', i === this.currentPlayer);
                });
            }
        }

        // Update tempo display
        updates.push(() => {
            this.safeSetTextContent('#tempo-display', this.tempo);
        });

        // Update loop position
        if (this.loopPosition !== undefined) {
            updates.push(() => {
                this.updateLoopTimelineDisplay();
            });
        }

        // Update link states
        if (this.linkStates) {
            updates.push(() => {
                this.updateLinkIconStates();
            });
        }

        // Update mute overlay
        updates.push(() => {
            this.updateMuteOverlay();
        });

        // Execute all updates in a single batch
        this.batchDOMUpdates(updates);
    }

    setupKitControls() {
        const kitDropdown = document.getElementById('kit-dropdown');
        const kitDropdownSelected = document.getElementById('kit-selected');
        const kitDropdownOptions = document.getElementById('kit-options');
        const kitOptions = document.querySelectorAll('#kit-options .dropdown-option');
        const kitPrev = document.querySelector('.kit-prev');
        const kitNext = document.querySelector('.kit-next');
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
                const kitName = option.textContent; // Use the actual text content, not the data-value

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
                this.setDirty('preset', true);  // Mark preset dirty when kit changes
                this.setDirty('drumkit', true);  // Mark drumkit dirty too

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
                this.setDirty('preset', true);

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
                // Use centralized mute management
                this.togglePlayerMute(this.currentPlayer);
            };
            this.addEventListener(muteDrummerBtn, 'click', muteHandler, this.dropdownListeners);
        }
    }

    navigateKit(direction) {
        // Validate player state exists
        if (!this.playerStates || !this.playerStates[this.currentPlayer]) {
            console.error(`No player state for player ${this.currentPlayer}`);
            return;
        }

        // These should eventually come from our INI storage system
        const kits = ['Acoustic', 'Electronic', 'Rock', 'Jazz', 'Pop', 'Funk', 'Latin', 'Vintage'];
        const state = this.playerStates[this.currentPlayer];
        
        // Validate current kit name
        let currentIndex = kits.indexOf(state.kitName);
        if (currentIndex === -1) {
            console.warn(`Current kit "${state.kitName}" not in list, defaulting to first`);
            currentIndex = 0;
        }
        
        let newIndex = currentIndex + direction;

        // Wrap around navigation
        if (newIndex < 0) newIndex = kits.length - 1;
        if (newIndex >= kits.length) newIndex = 0;

        state.kitName = kits[newIndex];
        
        // Safe UI updates
        this.updateUIForCurrentPlayer();

        // Update kit dropdown text safely
        this.safeSetTextContent('#kit-dropdown .dropdown-text', state.kitName);

        // Update selected state on kit options safely
        const kitOptions = this.safeQuerySelectorAll('#kit-dropdown .dropdown-option');
        kitOptions.forEach(option => {
            if (!option) return;
            
            this.safeRemoveClass(option, 'selected');
            if (option.textContent === state.kitName) {
                this.safeAddClass(option, 'selected');
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
            const prevHandler = () => {
                this.navigatePatternGroup(-1);
            };
            this.addEventListener(groupPrev, 'click', prevHandler, 'element');
        }

        if (groupNext) {
            const nextHandler = () => {
                this.navigatePatternGroup(1);
            };
            this.addEventListener(groupNext, 'click', nextHandler, 'element');
        }

        // Setup edit pattern button to toggle edit mode
        if (editPatternBtn) {
            const editHandler = () => {
                this.togglePatternEditMode();
            };
            this.addEventListener(editPatternBtn, 'click', editHandler, 'element');
        }

        // Setup panel close button
        const panelCloseBtn = document.getElementById('pattern-panel-close');
        if (panelCloseBtn) {
            const closeHandler = () => {
                this.togglePatternEditMode();
            };
            this.addEventListener(panelCloseBtn, 'click', closeHandler, 'element');
        }

        // Setup delete button
        const deleteBtn = document.getElementById('group-delete-btn');
        if (deleteBtn) {
            const deleteHandler = () => {
                this.deleteCurrentPatternGroup();
            };
            this.addEventListener(deleteBtn, 'click', deleteHandler, 'element');
        }

        // Setup pattern search
        const searchInput = document.getElementById('pattern-search-input');
        if (searchInput) {
            const searchHandler = (e) => {
                this.filterPatterns(e.target.value);
            };
            this.addEventListener(searchInput, 'input', searchHandler, 'element');
        }

        // Setup group dropdown
        const groupDropdown = document.getElementById('group-dropdown');
        const groupSelected = document.getElementById('group-selected');
        const groupOptions = document.getElementById('group-options');

        if (groupDropdown && groupSelected) {
            // Toggle dropdown on click
            const toggleHandler = (e) => {
                e.stopPropagation();
                // Use consistent class name across all dropdowns
                const isOpen = groupDropdown.classList.contains('active') || groupDropdown.classList.contains('open');
                
                // Close all other dropdowns first
                document.querySelectorAll('.custom-dropdown').forEach(dd => {
                    dd.classList.remove('active', 'open');
                });
                
                // Toggle this dropdown
                if (!isOpen) {
                    groupDropdown.classList.add('active');
                } else {
                    groupDropdown.classList.remove('active');
                }
            };
            this.addEventListener(groupSelected, 'click', toggleHandler, 'dropdown');

            // Close dropdown when clicking outside
            const outsideClickHandler = (e) => {
                if (!groupDropdown.contains(e.target)) {
                    groupDropdown.classList.remove('active', 'open');
                }
            };
            this.addEventListener(document, 'click', outsideClickHandler, 'document');
        }

        // Now populate the dropdown with current groups
        this.updatePatternGroupDropdown();
    }

    navigatePatternGroup(direction) {
        const groupDropdown = document.getElementById('group-dropdown');
        const groupSelected = document.getElementById('group-selected');
        const groupOptions = document.getElementById('group-options');

        if (!groupDropdown || !groupSelected || !this.patternGroups) return;

        // Get actual pattern groups dynamically, excluding 'all'
        const groups = Object.keys(this.patternGroups).filter(key => key !== 'all');
        if (groups.length === 0) return;

        // Get current selection - use the player's current pattern group
        const currentGroup = this.playerStates[this.currentPlayer].patternGroup;
        const currentIndex = groups.indexOf(currentGroup);

        let newIndex = currentIndex + direction;

        // Wrap around properly
        if (newIndex < 0) {
            newIndex = groups.length - 1;
        } else if (newIndex >= groups.length) {
            newIndex = 0;
        }

        // Get the new group
        const newGroupKey = groups[newIndex];
        const newGroupName = this.patternGroups[newGroupKey].name;

        // Update the UI
        groupSelected.querySelector('.dropdown-text').textContent = newGroupName;

        // Update the player state and save
        this.onPatternGroupChanged(this.currentPlayer, newGroupKey);
        this.setDirty('preset', true);

        console.log(`Player ${this.currentPlayer} pattern group: ${newGroupKey}`);
    }

    setupPatternGrid() {
        const patternButtons = document.querySelectorAll('.pattern-btn');
        
        patternButtons.forEach(patternBtn => {
            const clickHandler = (e) => {
                // Prevent if destroyed
                if (this.isDestroyed) return;
                
                // Get the button index to find the full pattern name
                const allButtons = Array.from(document.querySelectorAll('.pattern-btn'));
                const buttonIndex = allButtons.indexOf(patternBtn);
                
                if (buttonIndex === -1) {
                    console.error('Pattern button index not found');
                    return;
                }

                // Get the full pattern name from the pattern group
                const currentGroup = this.playerStates[this.currentPlayer].patternGroup;
                let fullPatternName = patternBtn.textContent || ''; // Default to button text

                if (this.patternGroups && this.patternGroups[currentGroup]) {
                    const patterns = this.patternGroups[currentGroup].patterns;
                    if (patterns && patterns[buttonIndex]) {
                        fullPatternName = patterns[buttonIndex];
                    } else if (!fullPatternName) {
                        console.warn(`No pattern at index ${buttonIndex} in group "${currentGroup}"`);
                        return; // Don't select empty patterns
                    }
                }
                
                // Don't select empty patterns
                if (!fullPatternName || fullPatternName.trim() === '') {
                    console.log('Empty pattern slot clicked, ignoring');
                    return;
                }

                // Clear other pattern selections
                allButtons.forEach(btn => {
                    btn.classList.remove('active');
                });

                // Activate clicked pattern
                patternBtn.classList.add('active');

                // Update player state with full pattern name
                this.playerStates[this.currentPlayer].selectedPattern = fullPatternName;

                // Save selected pattern to the current pattern group
                if (this.patternGroups && this.patternGroups[currentGroup]) {
                    this.patternGroups[currentGroup].selectedPattern = fullPatternName;
                    this.setDirty('patternGroup', true);
                }

                this.onPatternSelected(this.currentPlayer, fullPatternName);
                this.setDirty('preset', true);  // Mark preset as dirty when pattern changes

                console.log(`Player ${this.currentPlayer} selected pattern: ${fullPatternName}`);
            };
            
            // Use enhanced event listener management
            this.addEventListener(patternBtn, 'click', clickHandler, 'element');
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
                this.setDirty('preset', true);
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
        this.eventListenerRegistry.slider.forEach(({ element, event, handler }) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListenerRegistry.slider = [];
        
        // Also clean legacy array
        this.sliderListeners.forEach(({ element, event, handler }) => {
            if (element) {
                element.removeEventListener(event, handler);
            }
        });
        this.sliderListeners = [];

        // Clear any existing debounce timers
        this.debounceTimers.forEach((timer) => clearTimeout(timer));
        this.debounceTimers.clear();

        if (this.miniSliderDebounceTimer) {
            clearTimeout(this.miniSliderDebounceTimer);
            this.miniSliderDebounceTimer = null;
        }

        // Track dragging state globally for all sliders
        const dragState = {
            isDragging: false,
            currentSlider: null,
            currentParam: null,
            startY: 0,
            startValue: 0,
            min: 0,
            max: 100
        };

        // Create single document-level handlers for all sliders
        const documentMouseMoveHandler = (e) => {
            if (!dragState.isDragging || this.isDestroyed) return;

            const deltaY = dragState.startY - e.clientY;  // Inverted for vertical slider
            const track = dragState.currentSlider.querySelector('.slider-track');
            const trackHeight = track.offsetHeight;
            const range = dragState.max - dragState.min;
            const deltaValue = (deltaY / trackHeight) * range;

            let value = Math.max(dragState.min, Math.min(dragState.max, dragState.startValue + deltaValue));
            value = Math.round(value);  // Round to integer

            // Use debounced update
            this.debouncedSliderUpdate(dragState.currentSlider, dragState.currentParam, value);
        };

        const documentMouseUpHandler = () => {
            if (dragState.isDragging && !this.isDestroyed) {
                dragState.isDragging = false;
                if (dragState.currentSlider) {
                    dragState.currentSlider.classList.remove('dragging');

                    // Force final update when drag ends
                    const param = dragState.currentParam;
                    const existingTimer = this.debounceTimers.get(param);
                    if (existingTimer) {
                        clearTimeout(existingTimer);
                        this.debounceTimers.delete(param);
                    }

                    // Final update without debounce
                    const value = parseInt(dragState.currentSlider.dataset.value);
                    this.playerStates[this.currentPlayer].sliderValues[param] = value;
                    this.onSliderChanged(this.currentPlayer, param, value);
                    this.setDirty('preset', true);

                    // Handle link propagation
                    if (this.linkStates && this.linkStates[param]) {
                        const linkState = this.linkStates[param];
                        if (linkState.master === this.currentPlayer) {
                            this.propagateSliderValue(param, value, this.currentPlayer);
                        }
                    }
                }
                
                dragState.currentSlider = null;
                dragState.currentParam = null;
            }
        };

        // Remove old document handlers if they exist
        if (this.documentHandlers.has('mousemove')) {
            this.documentHandlers.get('mousemove').forEach(handler => {
                document.removeEventListener('mousemove', handler);
            });
        }
        if (this.documentHandlers.has('mouseup')) {
            this.documentHandlers.get('mouseup').forEach(handler => {
                document.removeEventListener('mouseup', handler);
            });
        }

        // Add new document handlers
        document.addEventListener('mousemove', documentMouseMoveHandler);
        document.addEventListener('mouseup', documentMouseUpHandler);
        
        // Track document handlers properly
        if (!this.documentHandlers.has('mousemove')) {
            this.documentHandlers.set('mousemove', []);
        }
        if (!this.documentHandlers.has('mouseup')) {
            this.documentHandlers.set('mouseup', []);
        }
        this.documentHandlers.get('mousemove').push(documentMouseMoveHandler);
        this.documentHandlers.get('mouseup').push(documentMouseUpHandler);
        
        // Also track in registry
        this.eventListenerRegistry.document.push(
            { element: document, event: 'mousemove', handler: documentMouseMoveHandler },
            { element: document, event: 'mouseup', handler: documentMouseUpHandler }
        );

        // Debounced update function
        this.debouncedSliderUpdate = (slider, param, value) => {
            if (this.isDestroyed) return;

            // Clear existing timer for this slider
            const existingTimer = this.debounceTimers.get(param);
            if (existingTimer) {
                clearTimeout(existingTimer);
            }

            // Update visual immediately for responsiveness
            this.updateCustomSlider(slider, value);
            slider.dataset.value = value;

            // Debounce the actual state update and callbacks
            const timer = setTimeout(() => {
                if (this.isDestroyed) return;

                // Update player state
                this.playerStates[this.currentPlayer].sliderValues[param] = value;
                this.onSliderChanged(this.currentPlayer, param, value);
                this.setDirty('preset', true);

                // Check if this player is a master and propagate value
                if (this.linkStates && this.linkStates[param]) {
                    const linkState = this.linkStates[param];
                    if (linkState.master === this.currentPlayer) {
                        this.propagateSliderValue(param, value, this.currentPlayer);
                    }
                }

                console.log(`Player ${this.currentPlayer} ${param} slider: ${value}`);

                // Remove timer from map after execution
                this.debounceTimers.delete(param);
            }, 100); // 100ms debounce delay

            this.debounceTimers.set(param, timer);
        };

        // Setup individual sliders
        document.querySelectorAll('.custom-slider').forEach(slider => {
            const track = slider.querySelector('.slider-track');
            const thumb = slider.querySelector('.slider-thumb');

            // Get initial values from data attributes
            let min = parseInt(slider.dataset.min) || 0;
            let max = parseInt(slider.dataset.max) || 100;
            let value = parseInt(slider.dataset.value) || 50;
            const param = slider.dataset.param;

            // Initialize visual state
            this.updateCustomSlider(slider, value);

            // Handle mouse down on thumb
            const startDrag = (e) => {
                if (this.isDestroyed) return;

                // Check if this slider is a slave
                if (this.linkStates && this.linkStates[param]) {
                    const linkState = this.linkStates[param];
                    if (linkState.slaves.has(this.currentPlayer)) {
                        console.log(`Slider ${param} is slave for player ${this.currentPlayer}, ignoring drag`);
                        return; // Don't allow dragging for slave sliders
                    }
                }

                dragState.isDragging = true;
                dragState.currentSlider = slider;
                dragState.currentParam = param;
                dragState.startY = e.clientY;
                dragState.startValue = value;
                dragState.min = min;
                dragState.max = max;
                
                slider.classList.add('dragging');
                e.preventDefault();
            };

            // Handle click on track
            const trackClickHandler = (e) => {
                if (this.isDestroyed) return;
                if (e.target === thumb) return;  // Don't handle if clicking thumb

                // Check if this slider is a slave
                if (this.linkStates && this.linkStates[param]) {
                    const linkState = this.linkStates[param];
                    if (linkState.slaves.has(this.currentPlayer)) {
                        console.log(`Slider ${param} is slave for player ${this.currentPlayer}, ignoring click`);
                        return; // Don't allow clicking for slave sliders
                    }
                }

                const rect = track.getBoundingClientRect();
                const clickY = e.clientY - rect.top;
                const percentage = 1 - (clickY / rect.height);  // Inverted for vertical

                value = Math.round(min + (percentage * (max - min)));

                // Update visual state immediately
                this.updateCustomSlider(slider, value);
                slider.dataset.value = value;

                // Update player state (no debounce for click)
                this.playerStates[this.currentPlayer].sliderValues[param] = value;
                this.onSliderChanged(this.currentPlayer, param, value);
                this.setDirty('preset', true);

                // Handle link propagation
                if (this.linkStates && this.linkStates[param]) {
                    const linkState = this.linkStates[param];
                    if (linkState.master === this.currentPlayer) {
                        this.propagateSliderValue(param, value, this.currentPlayer);
                    }
                }

                console.log(`Player ${this.currentPlayer} ${param} slider: ${value}`);
            };

            // Attach event listeners using enhanced method
            this.addEventListener(track, 'click', trackClickHandler, 'slider');
            this.addEventListener(thumb, 'mousedown', startDrag, 'slider');

            // Store current value on slider for reference
            slider.currentValue = value;
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
        // Initialize link states for each parameter if not already initialized
        if (!this.linkStates) {
            this.linkStates = {
                swing: { master: null, slaves: new Set() },
                energy: { master: null, slaves: new Set() },
                volume: { master: null, slaves: new Set() }
            };
        }

        console.log('Setting up link icons, linkStates:', this.linkStates);

        // Setup link icon click handlers
        document.querySelectorAll('.link-icon').forEach(linkIcon => {
            const param = linkIcon.dataset.param;

            const handler = (e) => {
                if (this.isDestroyed) return;
                e.preventDefault();
                e.stopPropagation();
                console.log(`Link icon clicked for ${param} by player ${this.currentPlayer}`);
                this.handleLinkToggle(param, linkIcon);
            };

            linkIcon.addEventListener('click', handler);
            // Track this listener for cleanup
            this.eventListeners.push({ element: linkIcon, event: 'click', handler });
        });
    }

    async handleLinkToggle(param, linkIcon) {
        // Use atomic operation to prevent race conditions in link state changes
        return this.atomicStateUpdate('link-toggle', async (version) => {
            if (!this.linkStates) {
                console.error('linkStates not initialized!');
                return false;
            }

            const currentPlayer = this.currentPlayer;
            const linkState = this.linkStates[param];

            console.log(`handleLinkToggle called for ${param}, player ${currentPlayer} (v${version})`, linkState);

            // Create a backup of current state for rollback if needed
            const previousState = {
                master: linkState.master,
                slaves: new Set(linkState.slaves)
            };

            try {
                // Determine current state of this link icon
                const isMaster = linkState.master === currentPlayer;
                const isSlave = linkState.slaves.has(currentPlayer);

                if (!isMaster && !isSlave) {
                    // Currently unlinked - make it master
                    // Clear any existing master safely
                    if (linkState.master !== null) {
                        // Verify the master exists before converting
                        if (this.playerStates[linkState.master]) {
                            // Convert existing master to slave
                            linkState.slaves.add(linkState.master);
                        }
                    }

                    linkState.master = currentPlayer;
                    linkIcon.classList.add('master');
                    linkIcon.classList.remove('linked');

                    // Propagate this player's value to all other players
                    const masterValue = this.playerStates[currentPlayer].sliderValues[param];
                    
                    // Clear slaves set and rebuild to ensure consistency
                    linkState.slaves.clear();
                    
                    // Add all other players as slaves
                    for (let i = 1; i <= this.numberOfPlayers; i++) {
                        if (i !== currentPlayer && this.playerStates[i]) {
                            linkState.slaves.add(i);
                        }
                    }

                    // Propagate value after setting up slaves
                    await this.propagateSliderValue(param, masterValue, currentPlayer);

                    console.log(`Player ${currentPlayer} is now master for ${param}, value: ${masterValue}`);

                } else if (isMaster) {
                    // Currently master - unlink all
                    linkState.master = null;
                    linkState.slaves.clear();
                    linkIcon.classList.remove('master');

                    console.log(`Player ${currentPlayer} unlinked ${param} (was master)`);

                } else if (isSlave) {
                    // Currently slave - check if master still exists
                    if (!linkState.master || !this.playerStates[linkState.master]) {
                        // Orphaned slave - clean up state
                        console.warn(`Player ${currentPlayer} was orphaned slave for ${param}, cleaning up`);
                        linkState.slaves.delete(currentPlayer);
                        linkIcon.classList.remove('linked');
                        
                        // If no master and no other slaves, reset completely
                        if (!linkState.master && linkState.slaves.size === 0) {
                            linkState.master = null;
                        }
                    } else {
                        // Valid slave - can't change
                        console.log(`Player ${currentPlayer} is slave for ${param}, cannot change`);
                        return false;
                    }
                }

                // Validate the final state
                if (linkState.master && linkState.slaves.has(linkState.master)) {
                    // Master can't be its own slave - fix this
                    console.error('Detected master as slave - fixing');
                    linkState.slaves.delete(linkState.master);
                }

                // Update link icon states for all players when switching
                this.updateLinkIconStates();
                
                // Mark as dirty for saving
                this.setDirty('preset', true);
                
                return true;
                
            } catch (error) {
                console.error('Error in handleLinkToggle, rolling back:', error);
                // Rollback to previous state
                linkState.master = previousState.master;
                linkState.slaves = previousState.slaves;
                this.updateLinkIconStates();
                throw error;
            }
        });
    }

    async propagateSliderValue(param, value, sourcePlayer) {
        // Ensure atomic propagation to prevent race conditions
        return this.atomicStateUpdate('slider-propagate', async (version) => {
            if (!this.linkStates || !this.linkStates[param]) {
                console.warn('No link state for param:', param);
                return false;
            }

            const linkState = this.linkStates[param];
            
            // Verify source player is the master
            if (linkState.master !== sourcePlayer) {
                console.warn(`Player ${sourcePlayer} is not master for ${param}, cannot propagate`);
                return false;
            }

            console.log(`Propagating ${param} value ${value} from master player ${sourcePlayer} (v${version})`);

            // Track successful updates
            const updatedPlayers = [];
            const failedPlayers = [];

            // Update all slave players
            for (const slavePlayer of linkState.slaves) {
                try {
                    // Verify slave player exists
                    if (!this.playerStates[slavePlayer]) {
                        console.warn(`Slave player ${slavePlayer} doesn't exist, removing from slaves`);
                        linkState.slaves.delete(slavePlayer);
                        continue;
                    }

                    // Update the slave's value
                    this.playerStates[slavePlayer].sliderValues[param] = value;
                    updatedPlayers.push(slavePlayer);

                    // If this slave is currently visible, update its UI
                    if (slavePlayer === this.currentPlayer) {
                        const slider = document.querySelector(`.custom-slider[data-param="${param}"]`);
                        if (slider) {
                            this.updateCustomSlider(slider, value);
                            slider.dataset.value = value;
                        }
                    }
                } catch (error) {
                    console.error(`Failed to update slave player ${slavePlayer}:`, error);
                    failedPlayers.push(slavePlayer);
                }
            }

            // Clean up failed players from slaves
            failedPlayers.forEach(player => {
                linkState.slaves.delete(player);
            });

            console.log(`Propagation complete: ${updatedPlayers.length} updated, ${failedPlayers.length} failed`);

            // Mark as dirty if any updates succeeded
            if (updatedPlayers.length > 0) {
                this.setDirty('preset', true);
            }

            return updatedPlayers.length > 0;
        });
    }

    updateLinkIconStates() {
        // Update link icon visual states based on current player
        document.querySelectorAll('.link-icon').forEach(linkIcon => {
            const param = linkIcon.dataset.param;
            const linkState = this.linkStates[param];
            const slider = document.querySelector(`.custom-slider[data-param="${param}"]`);

            linkIcon.classList.remove('master', 'linked');

            // Also update slider visual states
            if (slider) {
                slider.classList.remove('master', 'slave');
            }

            if (linkState.master === this.currentPlayer) {
                linkIcon.classList.add('master');
                if (slider) {
                    slider.classList.add('master');
                    slider.style.pointerEvents = 'auto'; // Enable interaction
                }
            } else if (linkState.slaves.has(this.currentPlayer)) {
                linkIcon.classList.add('linked');
                if (slider) {
                    slider.classList.add('slave');
                    slider.style.pointerEvents = 'none'; // Disable interaction for slaves
                }
            } else {
                // Unlinked state - ensure slider is interactive
                if (slider) {
                    slider.style.pointerEvents = 'auto';
                }
            }
        });
    }

    updateMuteOverlay() {
        const overlay = document.querySelector('.mute-overlay');
        const state = this.playerStates[this.currentPlayer];

        if (overlay && state) {
            // Show overlay if current player is muted
            const shouldMute = state.muted === true;
            overlay.classList.toggle('active', shouldMute);
            
            // Also update the mute button visual state to stay in sync
            const muteDrummerBtn = document.getElementById('mute-drummer-btn');
            if (muteDrummerBtn) {
                muteDrummerBtn.classList.toggle('muted', shouldMute);
                muteDrummerBtn.classList.toggle('active', shouldMute);
            }
            
            // Update the player tab visual state
            const playerTab = document.querySelector(`.player-tab[data-player="${this.currentPlayer}"]`);
            if (playerTab) {
                playerTab.classList.toggle('muted', shouldMute);
            }
        }
    }

    // Centralized mute state management
    setPlayerMuteState(playerNumber, isMuted) {
        // Validate player number
        if (!this.playerStates[playerNumber]) {
            console.error(`Invalid player number: ${playerNumber}`);
            return false;
        }
        
        // Update the player state
        this.playerStates[playerNumber].muted = isMuted;
        
        // Update visual states if this is the current player
        if (playerNumber === this.currentPlayer) {
            // Update mute overlay
            this.updateMuteOverlay();
        }
        
        // Always update the player tab
        const playerTab = document.querySelector(`.player-tab[data-player="${playerNumber}"]`);
        if (playerTab) {
            playerTab.classList.toggle('muted', isMuted);
        }
        
        // Notify external system
        this.onMuteDrummer(playerNumber, isMuted);
        
        // Mark as dirty
        this.setDirty('preset', true);
        
        console.log(`Player ${playerNumber} mute state set to: ${isMuted}`);
        return true;
    }
    
    togglePlayerMute(playerNumber) {
        if (!this.playerStates[playerNumber]) {
            console.error(`Invalid player number: ${playerNumber}`);
            return false;
        }
        
        const newMuteState = !this.playerStates[playerNumber].muted;
        return this.setPlayerMuteState(playerNumber, newMuteState);
    }
    
    // Synchronize all mute UI elements for current player
    syncMuteUIState() {
        const state = this.playerStates[this.currentPlayer];
        if (!state) return;
        
        const isMuted = state.muted === true;
        
        // Update mute overlay
        const overlay = document.querySelector('.mute-overlay');
        if (overlay) {
            overlay.classList.toggle('active', isMuted);
        }
        
        // Update mute button
        const muteDrummerBtn = document.getElementById('mute-drummer-btn');
        if (muteDrummerBtn) {
            muteDrummerBtn.classList.toggle('muted', isMuted);
            muteDrummerBtn.classList.toggle('active', isMuted);
        }
        
        // Update player tab
        const playerTab = document.querySelector(`.player-tab[data-player="${this.currentPlayer}"]`);
        if (playerTab) {
            playerTab.classList.toggle('muted', isMuted);
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
                this.setDirty('preset', true);
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
        // Cancel any existing animation frame before starting a new one
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        const animate = () => {
            // Check if destroyed
            if (this.isDestroyed) {
                this.animationFrame = null;
                return;
            }

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
        if (this.isDestroyed) return;

        this.isPlaying = !this.isPlaying;

        // Update button visual state
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            const playIcon = playPauseBtn.querySelector('.play-icon');
            const pauseIcon = playPauseBtn.querySelector('.pause-icon');

            if (this.isPlaying) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'inline-block';
                // Restart animation when playing (will cancel any existing first)
                this.startLoopAnimation();
            } else {
                playIcon.style.display = 'inline-block';
                pauseIcon.style.display = 'none';
                // Cancel animation immediately when pausing
                if (this.animationFrame) {
                    cancelAnimationFrame(this.animationFrame);
                    this.animationFrame = null;
                }
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
        // Mark drumkit as dirty (will cascade to player and preset)
        this.setDirty('drumkit', true);

        if (window.juce?.onKitChanged) {
            window.juce.onKitChanged(playerNumber, kitName);
        }
    }

    onPatternSelected(playerNumber, patternName) {
        // Validate inputs
        if (!this.playerStates[playerNumber]) {
            console.error(`Invalid player number: ${playerNumber}`);
            return;
        }
        
        if (!patternName) {
            console.warn('Empty pattern name selected');
            return;
        }

        const currentGroup = this.playerStates[playerNumber].patternGroup;

        // Save to player state
        this.playerStates[playerNumber].selectedPattern = patternName;

        // Save to pattern group if it exists
        if (this.patternGroups && this.patternGroups[currentGroup]) {
            this.patternGroups[currentGroup].selectedPattern = patternName;
            
            // Ensure the pattern is actually in the group
            const patterns = this.patternGroups[currentGroup].patterns;
            let patternFound = false;
            
            // Check if pattern exists in the group (exact or substring match)
            for (let i = 0; i < patterns.length; i++) {
                if (patterns[i] === patternName || 
                    patterns[i].toLowerCase() === patternName.toLowerCase() ||
                    patterns[i].substring(0, 8).toLowerCase() === patternName.substring(0, 8).toLowerCase()) {
                    patternFound = true;
                    break;
                }
            }
            
            if (!patternFound) {
                console.warn(`Pattern "${patternName}" not found in group "${currentGroup}"`);
            }
            
            // Mark pattern as dirty (will cascade up)
            this.setDirty('pattern', true);
        }

        // Notify external system
        if (window.juce?.onPatternSelected) {
            window.juce.onPatternSelected(playerNumber, patternName);
        }
        
        console.log(`Player ${playerNumber} selected pattern: ${patternName}`);
    }

    onPatternGroupChanged(playerNumber, groupName) {
        // Simplified version without async for immediate response
        console.log(`Pattern group change requested: Player ${playerNumber} -> Group "${groupName}"`);
        
        // Validate inputs
        if (!this.playerStates[playerNumber]) {
            console.error(`Player ${playerNumber} doesn't exist`);
            return;
        }

        // Verify the pattern group exists
        if (!this.patternGroups || !this.patternGroups[groupName]) {
            console.error(`Pattern group "${groupName}" doesn't exist`);
            
            // Try to recover by using default group
            const defaultGroup = 'favorites';
            if (this.patternGroups && this.patternGroups[defaultGroup]) {
                console.warn(`Falling back to default group "${defaultGroup}"`);
                groupName = defaultGroup;
            } else {
                // Critical error - can't proceed
                return;
            }
        }

        // Save pattern group to player state
        this.playerStates[playerNumber].patternGroup = groupName;

        // Mark patternGroup as dirty (will cascade to player and preset)
        this.setDirty('patternGroup', true);

        // Update the pattern grid if this is the current player
        if (playerNumber === this.currentPlayer) {
            const group = this.patternGroups[groupName];
            
            // Ensure patterns array exists and is valid
            if (!group.patterns || !Array.isArray(group.patterns)) {
                console.warn(`Invalid patterns array for group "${groupName}", initializing`);
                group.patterns = Array(16).fill('');
            }
            
            this.updateMainPatternGrid(group.patterns);

            // Restore the selected pattern for this group
            const selectedPattern = group.selectedPattern;
            if (selectedPattern) {
                const patternButtons = document.querySelectorAll('.pattern-grid .pattern-btn');
                let patternFound = false;
                
                patternButtons.forEach(btn => {
                    btn.classList.remove('active');
                    // Check both full name and first 8 characters
                    if (btn.textContent === selectedPattern ||
                        btn.textContent === selectedPattern.substring(0, 8)) {
                        btn.classList.add('active');
                        this.playerStates[playerNumber].selectedPattern = selectedPattern;
                        patternFound = true;
                    }
                });
                
                // If pattern wasn't found, clear the selection
                if (!patternFound) {
                    console.warn(`Selected pattern "${selectedPattern}" not found in grid`);
                    group.selectedPattern = null;
                }
            }
        }

        // Notify external system if available
        if (window.juce?.onPatternGroupChanged) {
            try {
                window.juce.onPatternGroupChanged(playerNumber, groupName);
            } catch (error) {
                console.error('Error notifying juce of pattern group change:', error);
            }
        }

        console.log(`Pattern group changed to "${groupName}" for player ${playerNumber}`);
    }

    onToggleChanged(playerNumber, toggleType, isActive) {
        // Mark player as dirty (will cascade to preset)
        this.setDirty('player', true);

        if (window.juce?.onToggleChanged) {
            window.juce.onToggleChanged(playerNumber, toggleType, isActive);
        }
    }

    onFillChanged(playerNumber, fillType, isActive) {
        // Mark player as dirty (will cascade to preset)
        this.setDirty('player', true);

        if (window.juce?.onFillChanged) {
            window.juce.onFillChanged(playerNumber, fillType, isActive);
        }
    }

    onSliderChanged(playerNumber, sliderType, value) {
        // Mark player as dirty (will cascade to preset)
        this.setDirty('player', true);

        if (window.juce?.onSliderChanged) {
            window.juce.onSliderChanged(playerNumber, sliderType, value);
        }
    }

    onMiniSliderChanged(playerNumber, sliderIndex, value) {
        // Mark player as dirty (will cascade to preset)
        this.setDirty('player', true);

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
        // Toggle the settings panel
        const settingsPanel = document.getElementById('settings-panel');
        const btn = document.getElementById('settings-btn');

        if (settingsPanel) {
            settingsPanel.classList.toggle('active');

            // Toggle button active state
            if (btn) {
                btn.classList.toggle('panel-active', settingsPanel.classList.contains('active'));
            }
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
        if (this.isDestroyed) return;

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

        // Store timer reference for cleanup if needed
        const timer1 = setTimeout(() => {
            if (this.isDestroyed) {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
                return;
            }

            notification.style.animation = 'fadeOut 0.3s ease';
            const timer2 = setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);

            // Store timer for potential cleanup
            if (!this.notificationTimers) this.notificationTimers = new Set();
            this.notificationTimers.add(timer2);
            setTimeout(() => this.notificationTimers?.delete(timer2), 350);
        }, 3000);

        // Store timer for potential cleanup
        if (!this.notificationTimers) this.notificationTimers = new Set();
        this.notificationTimers.add(timer1);
        setTimeout(() => this.notificationTimers?.delete(timer1), 3050);
    }

    destroy() {
        console.log('Destroying OTTO Interface...');
        
        // Set destroyed flag immediately to prevent any async operations
        this.isDestroyed = true;

        // Clear all timers first (prevents any callbacks from firing during cleanup)
        this.clearAllTimers();

        // Stop any animations
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Process any pending saves before cleanup
        try {
            this.processPendingSaves();
        } catch (error) {
            console.error('Error processing pending saves during destroy:', error);
        }

        // Clean up all event listeners using the enhanced cleanup
        this.cleanupAllEventListeners();

        // Clear all state update operations
        this.stateUpdateQueue = [];
        this.isProcessingStateUpdate = false;

        // Clear all pending saves
        this.pendingSaves.clear();

        // Clear link states to break circular references
        if (this.linkStates) {
            Object.keys(this.linkStates).forEach(param => {
                if (this.linkStates[param]) {
                    this.linkStates[param].slaves.clear();
                    this.linkStates[param].master = null;
                }
            });
            this.linkStates = null;
        }

        // Clear player states to free memory
        this.playerStates = null;

        // Clear pattern groups
        this.patternGroups = null;

        // Clear drumkits
        this.drumkits = null;

        // Clear presets
        this.presets = null;

        // Clear preset history
        if (this.presetHistory) {
            this.presetHistory = [];
        }

        // Clear storage errors
        this.storageErrors = [];

        // Clear any remaining references
        this.elementHandlerMap = new WeakMap();
        this.documentHandlers = new Map();
        
        if (this.dropdownHandlers) {
            this.dropdownHandlers.clear();
            this.dropdownHandlers = null;
        }

        // Clear dirty flags
        Object.keys(this.isDirty).forEach(key => {
            this.isDirty[key] = false;
        });

        // Remove any notification elements
        const notifications = document.querySelectorAll('.notification');
        notifications.forEach(notification => {
            notification.remove();
        });

        // Close any open modals
        const modals = document.querySelectorAll('.slide-up-panel, .pattern-edit-panel');
        modals.forEach(modal => {
            modal.classList.remove('active', 'open');
        });

        // Hide splash screen if it's still showing
        const splashScreen = document.getElementById('splash-screen');
        if (splashScreen) {
            splashScreen.style.display = 'none';
        }

        // Reset mute overlay
        const muteOverlay = document.querySelector('.mute-overlay');
        if (muteOverlay) {
            muteOverlay.classList.remove('active');
        }

        console.log('OTTO Interface destroyed successfully');
    }

    cleanupAllEventListeners() {
        // Enhanced cleanup with proper tracking
        console.log('Starting comprehensive event listener cleanup...');

        // Clean up registry-based listeners
        Object.keys(this.eventListenerRegistry).forEach(category => {
            const listeners = this.eventListenerRegistry[category];
            listeners.forEach(({ element, event, handler }) => {
                if (element && handler) {
                    element.removeEventListener(event, handler);
                }
            });
            // Clear the array
            this.eventListenerRegistry[category] = [];
        });

        // Clean up legacy arrays (for backward compatibility)
        const legacyArrays = [
            this.eventListeners,
            this.sliderListeners,
            this.dropdownListeners,
            this.modalListeners,
            this.documentListeners
        ];

        legacyArrays.forEach(array => {
            array.forEach(({ element, event, handler }) => {
                if (element && handler) {
                    element.removeEventListener(event, handler);
                }
            });
            array.length = 0; // Clear the array
        });

        // Clean up specific handlers
        Object.keys(this.specificHandlers).forEach(key => {
            const handler = this.specificHandlers[key];
            if (handler) {
                // Determine where this handler was attached
                switch(key) {
                    case 'presetDropdownClose':
                    case 'keyboardShortcut':
                        document.removeEventListener('click', handler);
                        document.removeEventListener('keydown', handler);
                        break;
                    case 'beforeUnload':
                        window.removeEventListener('beforeunload', handler);
                        break;
                    case 'addGroup':
                        const addBtn = document.getElementById('add-group-btn');
                        if (addBtn) addBtn.removeEventListener('click', handler);
                        break;
                    case 'renameGroup':
                        const renameBtn = document.getElementById('rename-group-btn');
                        if (renameBtn) renameBtn.removeEventListener('click', handler);
                        break;
                }
                this.specificHandlers[key] = null;
            }
        });

        // Clean up document-level handlers
        this.documentHandlers.forEach((handlers, eventType) => {
            handlers.forEach(handler => {
                document.removeEventListener(eventType, handler);
            });
        });
        this.documentHandlers.clear();

        // Clean up any dropdown option handlers (these are stored on DOM elements)
        document.querySelectorAll('.dropdown-option').forEach(option => {
            if (option._clickHandler) {
                option.removeEventListener('click', option._clickHandler);
                delete option._clickHandler;
            }
            // Clean up any other handlers stored on elements
            const handlers = this.elementHandlerMap.get(option);
            if (handlers) {
                Object.keys(handlers).forEach(eventType => {
                    handlers[eventType].forEach(handler => {
                        option.removeEventListener(eventType, handler);
                    });
                });
                this.elementHandlerMap.delete(option);
            }
        });

        // Clean up slider data attributes
        document.querySelectorAll('.custom-slider').forEach(slider => {
            if (slider.dataset.listenersAdded) {
                delete slider.dataset.listenersAdded;
            }
        });

        // Clean up drag-drop listeners more safely
        const patternSlots = document.querySelectorAll('.pattern-slot');
        patternSlots.forEach(slot => {
            // Get all handlers for this element
            const handlers = this.elementHandlerMap.get(slot);
            if (handlers) {
                Object.keys(handlers).forEach(eventType => {
                    handlers[eventType].forEach(handler => {
                        slot.removeEventListener(eventType, handler);
                    });
                });
                this.elementHandlerMap.delete(slot);
            }
        });

        // Clear the WeakMap references (they'll be garbage collected)
        this.elementHandlerMap = new WeakMap();

        // Clear all timers
        this.clearAllTimers();

        console.log('Event listener cleanup completed');
    }

    addEventListener(element, event, handler, category = 'element') {
        // Enhanced event listener management with proper tracking
        if (!element || !handler || this.isDestroyed) return false;

        // Check if this exact listener already exists to prevent duplicates
        const existingHandlers = this.elementHandlerMap.get(element);
        if (existingHandlers) {
            const eventHandlers = existingHandlers[event];
            if (eventHandlers && eventHandlers.includes(handler)) {
                console.warn(`Duplicate listener prevented for ${event} on`, element);
                return false; // Listener already exists
            }
        }

        // Add the event listener
        element.addEventListener(event, handler);

        // Store in WeakMap for efficient lookup
        if (!this.elementHandlerMap.has(element)) {
            this.elementHandlerMap.set(element, {});
        }
        const elementHandlers = this.elementHandlerMap.get(element);
        if (!elementHandlers[event]) {
            elementHandlers[event] = [];
        }
        elementHandlers[event].push(handler);

        // Store in registry by category
        if (this.eventListenerRegistry[category]) {
            this.eventListenerRegistry[category].push({ element, event, handler });
        } else {
            // Default to element category if invalid category provided
            this.eventListenerRegistry.element.push({ element, event, handler });
        }

        // Also store in legacy arrays for backward compatibility
        const legacyMap = {
            'element': this.eventListeners,
            'slider': this.sliderListeners,
            'dropdown': this.dropdownListeners,
            'modal': this.modalListeners,
            'document': this.documentListeners,
            'pattern': this.eventListeners
        };
        
        const trackingArray = legacyMap[category] || this.eventListeners;
        trackingArray.push({ element, event, handler });

        return true; // Successfully added
    }

    removeEventListener(element, event, handler, category = 'element') {
        // Enhanced event listener removal with proper cleanup
        if (!element || !handler) return false;

        // Remove the event listener
        element.removeEventListener(event, handler);

        // Remove from WeakMap
        const elementHandlers = this.elementHandlerMap.get(element);
        if (elementHandlers && elementHandlers[event]) {
            const index = elementHandlers[event].indexOf(handler);
            if (index > -1) {
                elementHandlers[event].splice(index, 1);
                // Clean up empty arrays
                if (elementHandlers[event].length === 0) {
                    delete elementHandlers[event];
                }
                // Clean up empty objects
                if (Object.keys(elementHandlers).length === 0) {
                    this.elementHandlerMap.delete(element);
                }
            }
        }

        // Remove from registry
        if (this.eventListenerRegistry[category]) {
            const registry = this.eventListenerRegistry[category];
            const index = registry.findIndex(item => 
                item.element === element && 
                item.event === event && 
                item.handler === handler
            );
            if (index > -1) {
                registry.splice(index, 1);
            }
        }

        // Remove from legacy arrays
        const legacyMap = {
            'element': this.eventListeners,
            'slider': this.sliderListeners,
            'dropdown': this.dropdownListeners,
            'modal': this.modalListeners,
            'document': this.documentListeners,
            'pattern': this.eventListeners
        };
        
        const trackingArray = legacyMap[category] || this.eventListeners;
        const legacyIndex = trackingArray.findIndex(item => 
            item.element === element && 
            item.event === event && 
            item.handler === handler
        );
        if (legacyIndex > -1) {
            trackingArray.splice(legacyIndex, 1);
        }

        return true; // Successfully removed
    }

    clearAllTimers() {
        // Clear all active timers
        this.activeTimers.forEach(timer => clearTimeout(timer));
        this.activeTimers.clear();

        // Clear notification timers
        this.notificationTimers.forEach(timer => clearTimeout(timer));
        this.notificationTimers.clear();

        // Clear debounce timers
        this.debounceTimers.forEach(timer => clearTimeout(timer));
        this.debounceTimers.clear();

        // Clear specific timers
        if (this.miniSliderDebounceTimer) {
            clearTimeout(this.miniSliderDebounceTimer);
            this.miniSliderDebounceTimer = null;
        }

        // Clear save timers
        Object.keys(this.saveTimers).forEach(key => {
            if (this.saveTimers[key]) {
                clearTimeout(this.saveTimers[key]);
                this.saveTimers[key] = null;
            }
        });

        // Clear state update timer
        if (this.stateUpdateTimer) {
            clearTimeout(this.stateUpdateTimer);
            this.stateUpdateTimer = null;
        }

        // Clear animation frame
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    // State Operation Management System
    acquireStateLock(operation) {
        // Create a mutex system for state operations
        if (!this.stateLocks) {
            this.stateLocks = new Map();
            this.lockQueue = [];
            this.activeLock = null;
        }

        return new Promise((resolve) => {
            const lockRequest = {
                operation,
                resolve,
                timestamp: Date.now(),
                id: `${operation}_${Date.now()}_${Math.random()}`
            };

            // If no active lock, grant immediately
            if (!this.activeLock) {
                this.activeLock = lockRequest;
                this.stateLocks.set(operation, lockRequest);
                resolve(lockRequest);
            } else {
                // Queue the request
                this.lockQueue.push(lockRequest);
            }
        });
    }

    releaseStateLock(lockRequest) {
        if (!lockRequest || !this.stateLocks) return;

        // Only release if this is the active lock
        if (this.activeLock && this.activeLock.id === lockRequest.id) {
            this.stateLocks.delete(lockRequest.operation);
            this.activeLock = null;

            // Process next in queue
            if (this.lockQueue.length > 0) {
                const next = this.lockQueue.shift();
                this.activeLock = next;
                this.stateLocks.set(next.operation, next);
                next.resolve(next);
            }
        }
    }

    // Atomic state update with versioning
    async atomicStateUpdate(operation, updateFn) {
        if (this.isDestroyed) return false;

        const lock = await this.acquireStateLock(operation);
        
        try {
            // Increment state version
            if (!this.stateVersion) {
                this.stateVersion = 0;
            }
            this.stateVersion++;
            
            // Execute the update function
            const result = await updateFn(this.stateVersion);
            
            // Mark successful update
            if (!this.stateUpdateHistory) {
                this.stateUpdateHistory = [];
            }
            this.stateUpdateHistory.push({
                operation,
                version: this.stateVersion,
                timestamp: Date.now(),
                success: true
            });
            
            // Keep only last 100 updates in history
            if (this.stateUpdateHistory.length > 100) {
                this.stateUpdateHistory = this.stateUpdateHistory.slice(-100);
            }
            
            return result;
        } catch (error) {
            console.error(`Atomic state update failed for ${operation}:`, error);
            
            // Log failed update
            if (this.stateUpdateHistory) {
                this.stateUpdateHistory.push({
                    operation,
                    version: this.stateVersion,
                    timestamp: Date.now(),
                    success: false,
                    error: error.message
                });
            }
            
            throw error;
        } finally {
            this.releaseStateLock(lock);
        }
    }

    // Check if operation can proceed
    canProceedWithOperation(operation) {
        if (this.isDestroyed) return false;
        
        // Check if there's a conflicting operation in progress
        const conflictingOps = {
            'preset-load': ['preset-save', 'preset-load', 'preset-delete'],
            'preset-save': ['preset-load', 'preset-delete'],
            'preset-delete': ['preset-load', 'preset-save'],
            'player-switch': ['preset-load'],
            'state-update': ['preset-load']
        };
        
        const conflicts = conflictingOps[operation] || [];
        
        if (this.activeLock) {
            return !conflicts.includes(this.activeLock.operation);
        }
        
        return true;
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

