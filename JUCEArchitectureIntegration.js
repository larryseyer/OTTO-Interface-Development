/**
 * JUCE Architecture Integration
 * Demonstrates how to integrate the new JUCE-ready architecture into the OTTO interface
 */

class OTTOJUCEArchitecture {
    constructor() {
        // Core systems
        this.messageBus = new MessageBus();
        this.commandManager = new CommandManager({ maxHistorySize: 100 });
        this.stateTree = new StateTree('otto-state');
        this.parameters = new ParameterGroup('main');
        
        // Initialize subsystems
        this.initializeParameters();
        this.initializeStateTree();
        this.initializeMessageChannels();
        this.initializeCommands();
    }

    /**
     * Initialize parameter system
     */
    initializeParameters() {
        // Global parameters
        const globalParams = new ParameterGroup('global');
        globalParams.addParameter(new Parameter('tempo', 'Tempo', 120, 30, 300, {
            units: 'BPM',
            step: 1,
            automatable: true
        }));
        globalParams.addParameter(new Parameter('master-volume', 'Master Volume', 75, 0, 100, {
            units: '%',
            smoothing: 0.95
        }));
        
        // Player parameters (for each of 8 players)
        for (let i = 1; i <= 8; i++) {
            const playerGroup = new ParameterGroup(`player-${i}`);
            
            // Sliders
            playerGroup.addParameter(new Parameter(`swing-${i}`, 'Swing', 50, 0, 100, {
                units: '%',
                smoothing: 0.9
            }));
            playerGroup.addParameter(new Parameter(`energy-${i}`, 'Energy', 50, 0, 100, {
                units: '%',
                smoothing: 0.9
            }));
            playerGroup.addParameter(new Parameter(`volume-${i}`, 'Volume', 75, 0, 100, {
                units: '%',
                smoothing: 0.9
            }));
            
            // Mini sliders
            playerGroup.addParameter(new Parameter(`mini1-${i}`, 'Mini 1', 50, 0, 100, {
                units: '%'
            }));
            playerGroup.addParameter(new Parameter(`mini2-${i}`, 'Mini 2', 50, 0, 100, {
                units: '%'
            }));
            playerGroup.addParameter(new Parameter(`mini3-${i}`, 'Mini 3', 50, 0, 100, {
                units: '%'
            }));
            
            this.parameters.addGroup(playerGroup);
        }
        
        this.parameters.addGroup(globalParams);
    }

    /**
     * Initialize state tree structure
     */
    initializeStateTree() {
        const root = this.stateTree.getRoot();
        
        // Global state
        const globalNode = new StateNode('global', 'global-state');
        globalNode.setProperty('tempo', 120);
        globalNode.setProperty('isPlaying', false);
        globalNode.setProperty('currentPreset', 'default');
        root.addChild(globalNode);
        
        // Players state
        const playersNode = new StateNode('players', 'players-state');
        for (let i = 1; i <= 8; i++) {
            const playerNode = new StateNode('player', `player-${i}`);
            playerNode.setProperty('kitName', 'Standard Kit');
            playerNode.setProperty('patternGroup', 'Default Group');
            playerNode.setProperty('selectedPattern', 'Basic');
            playerNode.setProperty('muted', false);
            
            // Toggles
            const togglesNode = new StateNode('toggles', `toggles-${i}`);
            togglesNode.setProperty('auto', true);
            togglesNode.setProperty('stick', false);
            togglesNode.setProperty('ride', false);
            togglesNode.setProperty('lock', false);
            playerNode.addChild(togglesNode);
            
            // Fills
            const fillsNode = new StateNode('fills', `fills-${i}`);
            fillsNode.setProperty('fill4', false);
            fillsNode.setProperty('fill8', false);
            fillsNode.setProperty('fill16', false);
            fillsNode.setProperty('fill32', false);
            fillsNode.setProperty('solo', false);
            playerNode.addChild(fillsNode);
            
            playersNode.addChild(playerNode);
        }
        root.addChild(playersNode);
        
        // Pattern groups state
        const patternGroupsNode = new StateNode('pattern-groups', 'pattern-groups-state');
        root.addChild(patternGroupsNode);
        
        // Drumkits state
        const drumkitsNode = new StateNode('drumkits', 'drumkits-state');
        root.addChild(drumkitsNode);
    }

    /**
     * Initialize message channels
     */
    initializeMessageChannels() {
        // UI events channel
        this.uiChannel = this.messageBus.createChannel('ui-events');
        
        // State change channel
        this.stateChannel = this.messageBus.createChannel('state-changes');
        
        // Parameter change channel
        this.paramChannel = this.messageBus.createChannel('param-changes');
        
        // JUCE bridge channel
        this.juceChannel = this.messageBus.createChannel('juce-bridge');
        
        // Set up parameter listeners
        const allParams = this.parameters.getAllParameters();
        for (const param of allParams) {
            param.addListener((param, eventType) => {
                this.paramChannel.send({
                    paramId: param.id,
                    value: param.getValue(),
                    normalizedValue: param.getNormalizedValue(),
                    eventType
                });
            });
        }
        
        // Set up state tree listeners
        this.stateTree.addListener((event, data) => {
            this.stateChannel.send({ event, data });
        });
    }

    /**
     * Initialize command system
     */
    initializeCommands() {
        // Listen for command events
        this.commandManager.addListener((event, command) => {
            console.log(`Command event: ${event}`, command);
            
            // Update UI based on undo/redo availability
            if (event === 'command-executed' || event === 'command-undone' || event === 'command-redone') {
                this.updateUndoRedoUI();
            }
        });
    }

    /**
     * Example: Change tempo command
     */
    createChangeTempoCommand(newTempo) {
        const self = this;
        const oldTempo = this.parameters.getParameter('tempo').getValue();
        
        return new class extends Command {
            constructor() {
                super(`Change tempo to ${newTempo}`);
                this.oldValue = oldTempo;
                this.newValue = newTempo;
            }
            
            execute() {
                self.parameters.getParameter('tempo').setValue(this.newValue);
                self.stateTree.getRoot().getChildById('global-state').setProperty('tempo', this.newValue);
                return true;
            }
            
            undo() {
                self.parameters.getParameter('tempo').setValue(this.oldValue);
                self.stateTree.getRoot().getChildById('global-state').setProperty('tempo', this.oldValue);
                return true;
            }
            
            canMergeWith(other) {
                return other.constructor.name === this.constructor.name &&
                       other.timestamp - this.timestamp < 500;
            }
            
            mergeWith(other) {
                this.newValue = other.newValue;
                return true;
            }
        };
    }

    /**
     * Example: Change pattern command
     */
    createChangePatternCommand(playerNumber, newPattern) {
        const self = this;
        const playerNode = this.stateTree.findNodeById(`player-${playerNumber}`);
        const oldPattern = playerNode.getProperty('selectedPattern');
        
        return new class extends Command {
            constructor() {
                super(`Change Player ${playerNumber} pattern to ${newPattern}`);
            }
            
            execute() {
                playerNode.setProperty('selectedPattern', newPattern);
                self.messageBus.publish('pattern-changed', {
                    player: playerNumber,
                    pattern: newPattern
                });
                return true;
            }
            
            undo() {
                playerNode.setProperty('selectedPattern', oldPattern);
                self.messageBus.publish('pattern-changed', {
                    player: playerNumber,
                    pattern: oldPattern
                });
                return true;
            }
        };
    }

    /**
     * Example: Complex preset change with transaction
     */
    loadPreset(presetData) {
        // Begin transaction for complex operation
        this.commandManager.beginTransaction('Load Preset');
        
        try {
            // Change tempo
            if (presetData.tempo) {
                const tempoCmd = this.createChangeTempoCommand(presetData.tempo);
                this.commandManager.execute(tempoCmd);
            }
            
            // Change player settings
            for (let i = 1; i <= 8; i++) {
                if (presetData.players && presetData.players[i]) {
                    const playerData = presetData.players[i];
                    
                    // Pattern
                    if (playerData.pattern) {
                        const patternCmd = this.createChangePatternCommand(i, playerData.pattern);
                        this.commandManager.execute(patternCmd);
                    }
                    
                    // Parameters
                    if (playerData.swing !== undefined) {
                        this.parameters.getParameter(`swing-${i}`).setValue(playerData.swing);
                    }
                    if (playerData.energy !== undefined) {
                        this.parameters.getParameter(`energy-${i}`).setValue(playerData.energy);
                    }
                    if (playerData.volume !== undefined) {
                        this.parameters.getParameter(`volume-${i}`).setValue(playerData.volume);
                    }
                }
            }
            
            // Commit transaction
            this.commandManager.commitTransaction();
            
            // Notify about preset load
            this.messageBus.publish('preset-loaded', {
                presetName: presetData.name,
                timestamp: Date.now()
            });
            
        } catch (error) {
            // Rollback on error
            this.commandManager.rollbackTransaction();
            console.error('Failed to load preset:', error);
            throw error;
        }
    }

    /**
     * Bridge to JUCE
     */
    sendToJUCE(messageType, data) {
        // This would communicate with JUCE backend
        this.juceChannel.send({
            type: messageType,
            data: data,
            timestamp: Date.now()
        });
        
        // In JUCE implementation, this would use:
        // - InterprocessConnection for IPC
        // - WebBrowserComponent for embedded web view
        // - Or native bindings
    }

    /**
     * Handle messages from JUCE
     */
    handleJUCEMessage(message) {
        // Process messages from JUCE backend
        switch (message.type) {
            case 'parameter-change':
                const param = this.parameters.getParameter(message.paramId);
                if (param) {
                    param.setValue(message.value, false); // Don't notify back
                }
                break;
                
            case 'state-update':
                // Update state tree from JUCE
                this.stateTree.deserialize(message.state);
                break;
                
            case 'audio-event':
                // Handle audio events from JUCE
                this.messageBus.publish('audio-event', message.data);
                break;
        }
    }

    /**
     * Update undo/redo UI
     */
    updateUndoRedoUI() {
        const canUndo = this.commandManager.canUndo();
        const canRedo = this.commandManager.canRedo();
        const undoDesc = this.commandManager.getUndoDescription();
        const redoDesc = this.commandManager.getRedoDescription();
        
        // Update UI elements (implementation specific)
        this.messageBus.publish('undo-redo-state', {
            canUndo,
            canRedo,
            undoDescription: undoDesc,
            redoDescription: redoDesc
        });
    }

    /**
     * Save complete state
     */
    saveState() {
        return {
            version: '2.0',
            parameters: this.parameters.serialize(),
            stateTree: this.stateTree.serialize(),
            commandHistory: this.commandManager.saveState()
        };
    }

    /**
     * Load complete state
     */
    loadState(savedState) {
        if (savedState.parameters) {
            this.parameters.deserialize(savedState.parameters);
        }
        if (savedState.stateTree) {
            this.stateTree.deserialize(savedState.stateTree);
        }
        // Command history is informational only, not restored
    }

    /**
     * Cleanup
     */
    destroy() {
        // Clear all listeners
        this.messageBus.destroy();
        this.commandManager.clearHistory();
        this.stateTree.clear();
        
        // Clear parameter listeners
        const allParams = this.parameters.getAllParameters();
        for (const param of allParams) {
            param.listeners.clear();
        }
    }
}

// Example usage integration with existing OTTO interface
function integrateJUCEArchitecture() {
    // Create JUCE architecture instance
    const juceArch = new OTTOJUCEArchitecture();
    
    // Subscribe to UI events
    juceArch.uiChannel.subscribe((data) => {
        console.log('UI Event:', data);
    });
    
    // Subscribe to state changes
    juceArch.stateChannel.subscribe((data) => {
        console.log('State Change:', data);
    });
    
    // Subscribe to parameter changes
    juceArch.paramChannel.subscribe((data) => {
        // Send to JUCE backend
        juceArch.sendToJUCE('parameter-update', data);
    });
    
    // Example: Handle tempo change with undo support
    function handleTempoChange(newTempo) {
        const command = juceArch.createChangeTempoCommand(newTempo);
        juceArch.commandManager.execute(command);
    }
    
    // Example: Handle pattern selection with undo support
    function handlePatternSelect(playerNumber, patternName) {
        const command = juceArch.createChangePatternCommand(playerNumber, patternName);
        juceArch.commandManager.execute(command);
    }
    
    // Example: Undo/Redo handlers
    function handleUndo() {
        juceArch.commandManager.undo();
    }
    
    function handleRedo() {
        juceArch.commandManager.redo();
    }
    
    // Return interface
    return {
        architecture: juceArch,
        handleTempoChange,
        handlePatternSelect,
        handleUndo,
        handleRedo
    };
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OTTOJUCEArchitecture, integrateJUCEArchitecture };
}