/**
 * Integration Tests for Player State Management
 * Tests the interaction between multiple managers and components
 */

const { TestFramework, Assert, Mock } = require('../TestFramework');

const test = new TestFramework();

test.describe('Player State Integration', () => {
    let stateManager;
    let playerManager;
    let patternManager;
    let drumkitManager;
    let linkManager;
    let storageManager;
    
    test.beforeAll(() => {
        // Initialize all managers
        stateManager = new StateManager();
        playerManager = new PlayerStateManager(stateManager);
        patternManager = new PatternGroupManager(stateManager);
        drumkitManager = new DrumkitManager();
        linkManager = new LinkManager(stateManager);
        storageManager = new StorageManager();
    });
    
    test.afterAll(() => {
        // Cleanup all managers
        [stateManager, playerManager, patternManager, drumkitManager, linkManager].forEach(manager => {
            if (manager && manager.destroy) {
                manager.destroy();
            }
        });
    });
    
    test.it('should synchronize player state across managers', async () => {
        // Create initial player state
        const playerState = {
            id: 'player1',
            kitName: 'Rock Kit',
            patternGroup: 'Verse',
            tempo: 120,
            sliders: Array(16).fill(50)
        };
        
        // Set player state
        await playerManager.setPlayerState('player1', playerState);
        
        // Verify state is synchronized
        const currentState = playerManager.getPlayerState('player1');
        Assert.equal(currentState.kitName, 'Rock Kit');
        Assert.equal(currentState.tempo, 120);
        
        // Verify state manager has the update
        Assert.isDefined(stateManager.state.players);
        Assert.isDefined(stateManager.state.players.player1);
    });
    
    test.it('should handle pattern group changes', async () => {
        // Create pattern group
        const patternGroup = {
            name: 'Chorus',
            patterns: Array(16).fill(null).map((_, i) => ({
                id: `pattern_${i}`,
                steps: Array(16).fill(0),
                active: i === 0
            }))
        };
        
        await patternManager.createPatternGroup(patternGroup);
        
        // Assign to player
        await playerManager.setPatternGroup('player1', 'Chorus');
        
        // Verify assignment
        const playerState = playerManager.getPlayerState('player1');
        Assert.equal(playerState.patternGroup, 'Chorus');
        
        // Verify pattern manager has the group
        const groups = patternManager.getAllGroups();
        Assert.isTrue(groups.some(g => g.name === 'Chorus'));
    });
    
    test.it('should load and apply drumkit settings', async () => {
        // Mock drumkit data
        const drumkit = {
            name: 'Electronic Kit',
            samples: ['kick.wav', 'snare.wav', 'hihat.wav'],
            mixerPreset: {
                volumes: [80, 70, 60],
                pans: [0, -10, 10],
                effects: {
                    reverb: 0.3,
                    delay: 0.1
                }
            }
        };
        
        // Load drumkit
        await drumkitManager.loadKit(drumkit);
        
        // Apply to player
        await playerManager.setDrumkit('player1', 'Electronic Kit');
        
        // Verify kit is applied
        const playerState = playerManager.getPlayerState('player1');
        Assert.equal(playerState.kitName, 'Electronic Kit');
        
        // Verify mixer settings are applied
        const mixerState = playerManager.getMixerState('player1');
        Assert.isDefined(mixerState);
        Assert.equal(mixerState.effects.reverb, 0.3);
    });
    
    test.it('should handle parameter linking between players', async () => {
        // Create second player
        await playerManager.setPlayerState('player2', {
            id: 'player2',
            kitName: 'Jazz Kit',
            patternGroup: 'Intro',
            tempo: 100,
            sliders: Array(16).fill(30)
        });
        
        // Link tempo between players
        await linkManager.createLink({
            source: { player: 'player1', parameter: 'tempo' },
            target: { player: 'player2', parameter: 'tempo' },
            type: 'bidirectional'
        });
        
        // Change tempo on player1
        await playerManager.setTempo('player1', 140);
        
        // Verify player2 tempo is updated
        const player2State = playerManager.getPlayerState('player2');
        Assert.equal(player2State.tempo, 140);
    });
    
    test.it('should persist and restore complete state', async () => {
        // Create complex state
        const complexState = {
            players: {
                player1: {
                    kitName: 'Rock Kit',
                    tempo: 120,
                    patternGroup: 'Verse'
                },
                player2: {
                    kitName: 'Jazz Kit',
                    tempo: 120,
                    patternGroup: 'Chorus'
                }
            },
            patternGroups: ['Verse', 'Chorus', 'Bridge'],
            links: [
                { source: 'player1.tempo', target: 'player2.tempo' }
            ]
        };
        
        // Save state
        await storageManager.saveState('test-session', complexState);
        
        // Clear current state
        stateManager.reset();
        
        // Restore state
        const restored = await storageManager.loadState('test-session');
        
        // Verify restoration
        Assert.deepEqual(restored.players, complexState.players);
        Assert.deepEqual(restored.patternGroups, complexState.patternGroups);
        Assert.deepEqual(restored.links, complexState.links);
    });
    
    test.it('should handle concurrent player updates', async () => {
        const updates = [];
        
        // Simulate concurrent updates to different players
        for (let i = 0; i < 4; i++) {
            updates.push(
                playerManager.setPlayerState(`player${i}`, {
                    id: `player${i}`,
                    kitName: `Kit ${i}`,
                    tempo: 100 + i * 10,
                    patternGroup: `Group ${i}`,
                    sliders: Array(16).fill(50 + i * 5)
                })
            );
        }
        
        await Promise.all(updates);
        
        // Verify all updates were applied
        for (let i = 0; i < 4; i++) {
            const state = playerManager.getPlayerState(`player${i}`);
            Assert.equal(state.kitName, `Kit ${i}`);
            Assert.equal(state.tempo, 100 + i * 10);
        }
    });
    
    test.it('should validate state transitions', async () => {
        // Set initial valid state
        await playerManager.setPlayerState('player1', {
            id: 'player1',
            kitName: 'Valid Kit',
            tempo: 120,
            sliders: Array(16).fill(50)
        });
        
        // Attempt invalid tempo change
        await Assert.throwsAsync(async () => {
            await playerManager.setTempo('player1', 400); // Out of range
        }, Error);
        
        // Verify state didn't change
        const state = playerManager.getPlayerState('player1');
        Assert.equal(state.tempo, 120);
    });
    
    test.it('should handle pattern switching correctly', async () => {
        // Create patterns
        const patterns = Array(16).fill(null).map((_, i) => ({
            id: `pattern_${i}`,
            name: `Pattern ${i + 1}`,
            steps: Array(16).fill(0).map((_, j) => j === i ? 1 : 0)
        }));
        
        await patternManager.setPatterns('player1', patterns);
        
        // Switch active pattern
        await patternManager.activatePattern('player1', 5);
        
        // Verify pattern is active
        const activePattern = patternManager.getActivePattern('player1');
        Assert.equal(activePattern.id, 'pattern_5');
        
        // Verify only one pattern is active
        const allPatterns = patternManager.getPatterns('player1');
        const activeCount = allPatterns.filter(p => p.active).length;
        Assert.equal(activeCount, 1);
    });
    
    test.it('should handle mixer state changes', async () => {
        // Set initial mixer state
        const mixerState = {
            volumes: Array(16).fill(70),
            pans: Array(16).fill(0),
            mutes: Array(16).fill(false),
            solos: Array(16).fill(false),
            effects: {
                reverb: 0.2,
                delay: 0.1,
                compression: 0.5
            }
        };
        
        await playerManager.setMixerState('player1', mixerState);
        
        // Mute channel 3
        await playerManager.muteChannel('player1', 3, true);
        
        // Solo channel 7
        await playerManager.soloChannel('player1', 7, true);
        
        // Verify changes
        const currentMixer = playerManager.getMixerState('player1');
        Assert.isTrue(currentMixer.mutes[3]);
        Assert.isTrue(currentMixer.solos[7]);
    });
    
    test.it('should handle preset save and load', async () => {
        // Configure state
        const presetState = {
            name: 'My Preset',
            players: {
                player1: playerManager.getPlayerState('player1')
            },
            patterns: patternManager.getPatterns('player1'),
            mixer: playerManager.getMixerState('player1')
        };
        
        // Save preset
        const presetId = await storageManager.savePreset(presetState);
        
        // Modify current state
        await playerManager.setTempo('player1', 150);
        
        // Load preset
        await storageManager.loadPreset(presetId);
        
        // Verify state is restored
        const restoredState = playerManager.getPlayerState('player1');
        Assert.equal(restoredState.tempo, 120); // Original tempo
    });
    
    test.it('should handle error recovery', async () => {
        // Simulate storage error
        const mockStorage = {
            getItem: Mock.fn().mockImplementation(() => {
                throw new Error('Storage unavailable');
            })
        };
        
        storageManager.setStorage(mockStorage);
        
        // Attempt to load state
        const result = await storageManager.loadState('test-key');
        
        // Should return default state on error
        Assert.isNotNull(result);
        Assert.isDefined(result.players);
    });
    
    test.it('should clean up resources properly', async () => {
        // Create temporary resources
        const tempPlayer = 'temp-player';
        await playerManager.setPlayerState(tempPlayer, {
            id: tempPlayer,
            kitName: 'Temp Kit',
            tempo: 120
        });
        
        // Verify player exists
        Assert.isDefined(playerManager.getPlayerState(tempPlayer));
        
        // Remove player
        await playerManager.removePlayer(tempPlayer);
        
        // Verify cleanup
        Assert.isNull(playerManager.getPlayerState(tempPlayer));
        
        // Verify state manager is updated
        Assert.isUndefined(stateManager.state.players[tempPlayer]);
    });
});

// Export test suite
if (typeof module !== 'undefined' && module.exports) {
    module.exports = test;
}