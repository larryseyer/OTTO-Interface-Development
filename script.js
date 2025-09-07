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

    init() {
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
        // Base gap is 5px for 8 players, increases significantly for fewer players
        // For 4 players: much more spacing for better distribution
        const gaps = {
            8: 5,    // Original perfect spacing for 8 players
            7: 10,   // Double for 7 players
            6: 15,   // Triple for 6 players
            5: 20,   // 4x for 5 players
            4: 30    // 6x for 4 players - lots of space
        };
        const gap = gaps[this.numberOfPlayers] || 5;
        
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
    }

    setupPresetControls() {
        // Custom dropdown functionality
        const dropdown = document.getElementById('preset-dropdown');
        const dropdownSelected = document.getElementById('preset-selected');
        const dropdownOptions = document.getElementById('preset-options');
        const dropdownText = dropdown.querySelector('.dropdown-text');
        
        // Toggle dropdown on click
        if (dropdownSelected) {
            dropdownSelected.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });
        }
        
        // Handle option selection
        const options = dropdown.querySelectorAll('.dropdown-option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Update selected text
                const selectedText = option.textContent;
                dropdownText.textContent = selectedText;
                
                // Update selected state
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // Close dropdown
                dropdown.classList.remove('open');
                
                // Update player state
                this.playerStates[this.currentPlayer].presetName = selectedText;
                this.currentPreset = option.dataset.value;
                this.onPresetChanged(this.currentPlayer, selectedText);
                console.log(`Player ${this.currentPlayer} preset changed to: ${selectedText}`);
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
        
        // Preset navigation buttons (if they're re-enabled)
        const presetPrev = document.querySelector('.preset-prev');
        const presetNext = document.querySelector('.preset-next');

        if (presetPrev) {
            presetPrev.addEventListener('click', () => {
                this.navigatePreset(-1);
            });
        }

        if (presetNext) {
            presetNext.addEventListener('click', () => {
                this.navigatePreset(1);
            });
        }
    }

    navigatePreset(direction) {
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

        // Update kit select dropdown
        const kitSelect = document.querySelector('.kit-select');
        if (kitSelect) {
            kitSelect.value = state.kitName.toLowerCase();
        }

        // Update kit mixer button state
        const kitMixerBtn = document.getElementById('kit-mixer-btn');
        if (kitMixerBtn) {
            kitMixerBtn.classList.toggle('active', state.kitMixerActive);
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

        // Kit select dropdown
        const kitSelect = document.querySelector('.kit-select');
        if (kitSelect) {
            kitSelect.addEventListener('change', (e) => {
                const kitName = e.target.options[e.target.selectedIndex].text;
                this.playerStates[this.currentPlayer].kitName = kitName;
                this.onKitChanged(this.currentPlayer, kitName);
                console.log(`Player ${this.currentPlayer} kit changed to: ${kitName}`);
            });
        }

        // Kit mixer button
        const kitMixerBtn = document.getElementById('kit-mixer-btn');
        if (kitMixerBtn) {
            kitMixerBtn.addEventListener('click', () => {
                const state = this.playerStates[this.currentPlayer];
                state.kitMixerActive = !state.kitMixerActive;
                kitMixerBtn.classList.toggle('active', state.kitMixerActive);
                this.onKitMixerToggle(this.currentPlayer, state.kitMixerActive);
                console.log(`Player ${this.currentPlayer} kit mixer: ${state.kitMixerActive}`);
            });
        }

        // Edit button
        document.querySelectorAll('.edit-btn').forEach(editBtn => {
            editBtn.addEventListener('click', () => {
                this.onEditKit(this.currentPlayer);
                console.log(`Edit kit for Player ${this.currentPlayer}`);
            });
        });
    }

    navigateKit(direction) {
        const kits = ['Acoustic', 'Electronic', 'Rock', 'Jazz', 'Pop', 'Funk', 'Latin', 'Vintage'];
        const state = this.playerStates[this.currentPlayer];
        const currentIndex = kits.indexOf(state.kitName);
        let newIndex = currentIndex + direction;

        if (newIndex < 0) newIndex = kits.length - 1;
        if (newIndex >= kits.length) newIndex = 0;

        state.kitName = kits[newIndex];
        this.updateUIForCurrentPlayer();

        // Update kit select dropdown
        const kitSelect = document.querySelector('.kit-select');
        if (kitSelect) {
            kitSelect.value = state.kitName.toLowerCase();
        }

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

        const favoritesSelect = document.querySelector('.favorites-select');
        if (favoritesSelect) {
            favoritesSelect.addEventListener('change', (e) => {
                this.onPatternGroupChanged(this.currentPlayer, e.target.value);
                console.log(`Player ${this.currentPlayer} pattern group: ${e.target.value}`);
            });
        }
    }

    navigatePatternGroup(direction) {
        const groups = ['Favorites', 'All Patterns', 'Custom', 'Recent', 'Rock', 'Jazz', 'Latin'];
        const select = document.querySelector('.favorites-select');
        if (!select) return;

        const currentIndex = Array.from(select.options).findIndex(opt => opt.selected);
        let newIndex = currentIndex + direction;

        if (newIndex < 0) newIndex = select.options.length - 1;
        if (newIndex >= select.options.length) newIndex = 0;

        select.selectedIndex = newIndex;
        select.dispatchEvent(new Event('change'));
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
