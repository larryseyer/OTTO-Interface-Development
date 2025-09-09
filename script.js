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
        
        // Setup preset management UI
        this.setupPresetManagement();
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

    setupPresetManagement() {
        const presetEditBtn = document.getElementById('preset-edit-btn');
        const presetModal = document.getElementById('preset-modal');
        const presetModalClose = document.getElementById('preset-modal-close');
        const presetSaveBtn = document.getElementById('preset-save-btn');
        const presetSaveAsBtn = document.getElementById('preset-save-as-btn');
        const presetNameInput = document.getElementById('preset-name-input');
        
        // Open preset modal
        if (presetEditBtn) {
            presetEditBtn.addEventListener('click', () => {
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
        
        // Save preset (overwrite current)
        if (presetSaveBtn) {
            presetSaveBtn.addEventListener('click', () => {
                this.saveCurrentPreset();
            });
        }
        
        // Save As new preset
        if (presetSaveAsBtn) {
            presetSaveAsBtn.addEventListener('click', () => {
                const name = presetNameInput.value.trim();
                if (name) {
                    this.savePresetAs(name);
                    presetNameInput.value = '';
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
        
        for (const [key, preset] of Object.entries(this.presets)) {
            const presetItem = document.createElement('div');
            presetItem.className = 'preset-item';
            
            const presetName = document.createElement('div');
            presetName.className = 'preset-item-name';
            presetName.textContent = preset.name;
            presetName.addEventListener('click', () => {
                this.loadPreset(key);
                this.closePresetModal();
            });
            
            const presetActions = document.createElement('div');
            presetActions.className = 'preset-item-actions';
            
            // Load button
            const loadBtn = document.createElement('button');
            loadBtn.className = 'preset-item-btn';
            loadBtn.innerHTML = '<i class="ph-thin ph-download-simple"></i>';
            loadBtn.title = 'Load Preset';
            loadBtn.addEventListener('click', () => {
                this.loadPreset(key);
                this.closePresetModal();
            });
            
            // Delete button (not for default)
            if (key !== 'default') {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'preset-item-btn delete';
                deleteBtn.innerHTML = '<i class="ph-thin ph-trash"></i>';
                deleteBtn.title = 'Delete Preset';
                deleteBtn.addEventListener('click', () => {
                    if (confirm(`Delete preset "${preset.name}"?`)) {
                        this.deletePreset(key);
                    }
                });
                presetActions.appendChild(deleteBtn);
            }
            
            presetActions.appendChild(loadBtn);
            presetItem.appendChild(presetName);
            presetItem.appendChild(presetActions);
            presetList.appendChild(presetItem);
        }
    }

    saveCurrentPreset() {
        const preset = this.createPresetFromCurrentState(this.presets[this.currentPreset]?.name || 'Untitled');
        this.presets[this.currentPreset] = preset;
        this.savePresetsToStorage();
        this.showNotification(`Preset "${preset.name}" saved`);
        this.renderPresetList();
    }

    savePresetAs(name) {
        const key = name.toLowerCase().replace(/\s+/g, '-');
        const preset = this.createPresetFromCurrentState(name);
        this.presets[key] = preset;
        this.currentPreset = key;
        
        // Update dropdown
        this.updatePresetDropdown();
        
        this.savePresetsToStorage();
        this.showNotification(`Preset "${name}" created`);
        this.renderPresetList();
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
        
        // Update preset dropdown
        const dropdownText = document.querySelector('#preset-dropdown .dropdown-text');
        if (dropdownText) {
            dropdownText.textContent = preset.name;
        }
        
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

    updatePresetDropdown() {
        const presetOptions = document.getElementById('preset-options');
        if (!presetOptions) return;
        
        presetOptions.innerHTML = '';
        
        for (const [key, preset] of Object.entries(this.presets)) {
            const option = document.createElement('div');
            option.className = 'dropdown-option';
            option.dataset.value = key;
            option.textContent = preset.name;
            presetOptions.appendChild(option);
        }
        
        // Re-setup dropdown handlers
        this.setupPresetControls();
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
        this.initPresetSystem();  // Initialize preset system first
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

        // Initialize UI for player 1
        this.updateUIForCurrentPlayer();

        console.log('OTTO Accurate Interface initialized with', this.numberOfPlayers, 'active players (max:', this.maxPlayers, ')');
    }

    // Method to change number of active players
    setNumberOfPlayers(num) {
        if (num >= 4 && num <= 8) {
            this.numberOfPlayers = num;
            this.setupPlayerTabs();  // Refresh the player tabs and spacing

            // If current player is beyond the new limit, switch to player 1
            if (this.currentPlayer > num) {
                this.switchToPlayer(1);
            }

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

        // Update main sliders
        Object.keys(state.sliderValues).forEach(sliderKey => {
            const slider = document.querySelector(`[data-param="${sliderKey}"]`);
            if (slider) {
                slider.value = state.sliderValues[sliderKey];
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

                console.log(`Player ${this.currentPlayer} fill ${fillType}: ${!isActive}`);
            });
        });
    }

    setupSliders() {
        // Main vertical sliders
        document.querySelectorAll('.main-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const sliderType = slider.dataset.param;
                const value = parseInt(e.target.value);

                this.playerStates[this.currentPlayer].sliderValues[sliderType] = value;
                this.onSliderChanged(this.currentPlayer, sliderType, value);

                // Check if this player is a master and propagate value
                if (this.linkStates && this.linkStates[sliderType]) {
                    const linkState = this.linkStates[sliderType];
                    if (linkState.master === this.currentPlayer) {
                        this.propagateSliderValue(sliderType, value, this.currentPlayer);
                    }
                }

                console.log(`Player ${this.currentPlayer} ${sliderType} slider: ${value}`);
            });
        });

        // Mini sliders in kit section
        document.querySelectorAll('.mini-slider').forEach((slider, index) => {
            slider.addEventListener('input', (e) => {
                const sliderIndex = index + 1;
                const value = parseInt(e.target.value);

                this.playerStates[this.currentPlayer].miniSliders[sliderIndex] = value;
                this.onMiniSliderChanged(this.currentPlayer, sliderIndex, value);

                console.log(`Player ${this.currentPlayer} mini slider ${sliderIndex}: ${value}`);
            });
        });
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
            const slider = document.querySelector(`.main-slider[data-param="${param}"]`);
            if (slider) {
                slider.value = value;
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
    }

    setTempo(bpm) {
        this.tempo = bpm;
        const tempoDisplay = document.getElementById('tempo-display');
        if (tempoDisplay) {
            tempoDisplay.textContent = Math.round(bpm);
        }
        this.onTempoChanged(bpm);
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
