/**
 * Unit Tests for StateManager
 */

const { TestFramework, Assert, Mock } = require('../TestFramework');

const test = new TestFramework();

test.describe('StateManager', () => {
    let stateManager;
    
    test.beforeEach(() => {
        // Reset StateManager instance for each test
        stateManager = new StateManager();
    });
    
    test.afterEach(() => {
        // Cleanup
        if (stateManager && stateManager.destroy) {
            stateManager.destroy();
        }
    });
    
    test.it('should initialize with default state', () => {
        Assert.isDefined(stateManager.state);
        Assert.equal(stateManager.history.length, 1);
        Assert.equal(stateManager.historyIndex, 0);
    });
    
    test.it('should update state correctly', () => {
        const newState = { test: 'value' };
        stateManager.setState(newState);
        
        Assert.equal(stateManager.state.test, 'value');
        Assert.equal(stateManager.history.length, 2);
    });
    
    test.it('should merge state updates', () => {
        stateManager.setState({ a: 1, b: 2 });
        stateManager.setState({ b: 3, c: 4 });
        
        Assert.equal(stateManager.state.a, 1);
        Assert.equal(stateManager.state.b, 3);
        Assert.equal(stateManager.state.c, 4);
    });
    
    test.it('should maintain history with max size limit', () => {
        const maxHistory = 50; // Default max history
        
        for (let i = 0; i < maxHistory + 10; i++) {
            stateManager.setState({ count: i });
        }
        
        Assert.lessThan(stateManager.history.length, maxHistory + 1);
    });
    
    test.it('should support undo operation', () => {
        stateManager.setState({ step: 1 });
        stateManager.setState({ step: 2 });
        stateManager.setState({ step: 3 });
        
        stateManager.undo();
        Assert.equal(stateManager.state.step, 2);
        
        stateManager.undo();
        Assert.equal(stateManager.state.step, 1);
    });
    
    test.it('should support redo operation', () => {
        stateManager.setState({ step: 1 });
        stateManager.setState({ step: 2 });
        
        stateManager.undo();
        Assert.equal(stateManager.state.step, 1);
        
        stateManager.redo();
        Assert.equal(stateManager.state.step, 2);
    });
    
    test.it('should clear future history on new state after undo', () => {
        stateManager.setState({ step: 1 });
        stateManager.setState({ step: 2 });
        stateManager.setState({ step: 3 });
        
        stateManager.undo();
        stateManager.undo();
        
        stateManager.setState({ step: 99 });
        
        Assert.equal(stateManager.state.step, 99);
        Assert.equal(stateManager.historyIndex, stateManager.history.length - 1);
    });
    
    test.it('should validate state updates', () => {
        stateManager.setValidator((state) => {
            if (state.value && state.value < 0) {
                throw new Error('Value cannot be negative');
            }
        });
        
        Assert.throws(() => {
            stateManager.setState({ value: -1 });
        }, Error);
        
        stateManager.setState({ value: 10 });
        Assert.equal(stateManager.state.value, 10);
    });
    
    test.it('should emit state change events', () => {
        const listener = Mock.fn();
        stateManager.subscribe(listener);
        
        stateManager.setState({ test: 'value' });
        
        Assert.equal(listener.mock.calls.length, 1);
        Assert.deepEqual(listener.mock.calls[0][0], { test: 'value' });
    });
    
    test.it('should handle batch updates', () => {
        const listener = Mock.fn();
        stateManager.subscribe(listener);
        
        stateManager.batchUpdate(() => {
            stateManager.setState({ a: 1 });
            stateManager.setState({ b: 2 });
            stateManager.setState({ c: 3 });
        });
        
        // Should only emit once for batch
        Assert.equal(listener.mock.calls.length, 1);
        Assert.equal(stateManager.state.a, 1);
        Assert.equal(stateManager.state.b, 2);
        Assert.equal(stateManager.state.c, 3);
    });
    
    test.it('should calculate state diffs', () => {
        const oldState = { a: 1, b: 2, c: 3 };
        const newState = { a: 1, b: 5, d: 4 };
        
        const diff = stateManager.getDiff(oldState, newState);
        
        Assert.isDefined(diff.added);
        Assert.isDefined(diff.removed);
        Assert.isDefined(diff.changed);
        Assert.contains(diff.changed, 'b');
        Assert.contains(diff.added, 'd');
        Assert.contains(diff.removed, 'c');
    });
    
    test.it('should support state snapshots', () => {
        stateManager.setState({ data: 'initial' });
        const snapshot = stateManager.createSnapshot();
        
        stateManager.setState({ data: 'modified' });
        Assert.equal(stateManager.state.data, 'modified');
        
        stateManager.restoreSnapshot(snapshot);
        Assert.equal(stateManager.state.data, 'initial');
    });
    
    test.it('should handle concurrent updates safely', async () => {
        const updates = [];
        
        // Simulate concurrent updates
        for (let i = 0; i < 10; i++) {
            updates.push(
                new Promise(resolve => {
                    setTimeout(() => {
                        stateManager.setState({ [`prop${i}`]: i });
                        resolve();
                    }, Math.random() * 10);
                })
            );
        }
        
        await Promise.all(updates);
        
        // All updates should be applied
        for (let i = 0; i < 10; i++) {
            Assert.equal(stateManager.state[`prop${i}`], i);
        }
    });
    
    test.it('should clean up resources on destroy', () => {
        const listener = Mock.fn();
        stateManager.subscribe(listener);
        
        stateManager.destroy();
        
        // Should not emit after destroy
        stateManager.setState({ test: 'value' });
        Assert.equal(listener.mock.calls.length, 0);
        
        // History should be cleared
        Assert.equal(stateManager.history.length, 0);
    });
    
    test.it('should handle nested state updates', () => {
        stateManager.setState({
            user: {
                name: 'John',
                settings: {
                    theme: 'dark'
                }
            }
        });
        
        stateManager.updateNested('user.settings.theme', 'light');
        
        Assert.equal(stateManager.state.user.settings.theme, 'light');
        Assert.equal(stateManager.state.user.name, 'John');
    });
    
    test.it('should persist state to storage', () => {
        const mockStorage = {
            setItem: Mock.fn(),
            getItem: Mock.fn().mockReturnValue('{"persisted": true}')
        };
        
        stateManager.enablePersistence('test-key', mockStorage);
        stateManager.setState({ data: 'test' });
        
        Assert.equal(mockStorage.setItem.mock.calls.length, 1);
        Assert.equal(mockStorage.setItem.mock.calls[0][0], 'test-key');
    });
    
    test.it('should restore state from storage', () => {
        const mockStorage = {
            getItem: Mock.fn().mockReturnValue('{"restored": true}')
        };
        
        stateManager.enablePersistence('test-key', mockStorage);
        stateManager.restoreFromStorage();
        
        Assert.equal(stateManager.state.restored, true);
    });
});

// Export test suite
if (typeof module !== 'undefined' && module.exports) {
    module.exports = test;
}