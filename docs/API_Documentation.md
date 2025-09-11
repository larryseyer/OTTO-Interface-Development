# OTTO Interface API Documentation

## Overview

The OTTO Interface is a modular, JUCE-ready architecture for managing a multi-player drum machine interface. This documentation covers all public APIs, their usage, and integration patterns.

---

## Core Components

### StateManager

Central state management system with history, validation, and persistence.

```javascript
const stateManager = new StateManager(initialState);
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `setState(state)` | `Object` state | `void` | Updates state and triggers subscribers |
| `getState()` | - | `Object` | Returns current state |
| `subscribe(callback)` | `Function` callback | `Function` | Returns unsubscribe function |
| `undo()` | - | `boolean` | Reverts to previous state |
| `redo()` | - | `boolean` | Advances to next state |
| `batchUpdate(fn)` | `Function` fn | `void` | Batches multiple state updates |
| `createSnapshot()` | - | `Object` | Creates state snapshot |
| `restoreSnapshot(snapshot)` | `Object` snapshot | `void` | Restores from snapshot |
| `setValidator(fn)` | `Function` fn | `void` | Sets state validation function |
| `destroy()` | - | `void` | Cleanup resources |

#### Events

- `stateChange` - Fired when state changes
- `historyChange` - Fired when history is modified
- `validationError` - Fired on validation failure

#### Example

```javascript
const stateManager = new StateManager();

// Subscribe to changes
const unsubscribe = stateManager.subscribe((newState) => {
    console.log('State updated:', newState);
});

// Update state
stateManager.setState({ tempo: 120 });

// Undo last change
stateManager.undo();

// Cleanup
unsubscribe();
```

---

### EventManager

Centralized event handling with memory management and delegation.

```javascript
const eventManager = new EventManager();
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `on(element, event, handler, options)` | `Element`, `string`, `Function`, `Object` | `void` | Add event listener |
| `off(element, event, handler)` | `Element`, `string`, `Function` | `void` | Remove event listener |
| `once(element, event, handler)` | `Element`, `string`, `Function` | `void` | Add one-time listener |
| `delegate(parent, event, selector, handler)` | `Element`, `string`, `string`, `Function` | `void` | Event delegation |
| `emit(element, event, data)` | `Element`, `string`, `any` | `void` | Emit custom event |
| `throttle(fn, delay)` | `Function`, `number` | `Function` | Returns throttled function |
| `debounce(fn, delay)` | `Function`, `number` | `Function` | Returns debounced function |
| `cleanupElement(element)` | `Element` | `void` | Remove all listeners from element |
| `destroy()` | - | `void` | Remove all listeners |

#### Example

```javascript
const eventManager = new EventManager();

// Add listener
eventManager.on(button, 'click', (e) => {
    console.log('Button clicked');
});

// Delegate events
eventManager.delegate(container, 'click', '.button', (e) => {
    console.log('Delegated click');
});

// Throttled handler
const throttled = eventManager.throttle(() => {
    console.log('Throttled');
}, 100);

eventManager.on(window, 'scroll', throttled);
```

---

### PlayerStateManager

Manages individual player states and synchronization.

```javascript
const playerManager = new PlayerStateManager(stateManager);
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `setPlayerState(playerId, state)` | `string`, `Object` | `Promise<void>` | Set complete player state |
| `getPlayerState(playerId)` | `string` | `Object` | Get player state |
| `setTempo(playerId, tempo)` | `string`, `number` | `Promise<void>` | Update tempo |
| `setDrumkit(playerId, kitName)` | `string`, `string` | `Promise<void>` | Change drumkit |
| `setPatternGroup(playerId, groupName)` | `string`, `string` | `Promise<void>` | Change pattern group |
| `setSliderValue(playerId, index, value)` | `string`, `number`, `number` | `Promise<void>` | Update slider |
| `getMixerState(playerId)` | `string` | `Object` | Get mixer state |
| `muteChannel(playerId, channel, mute)` | `string`, `number`, `boolean` | `Promise<void>` | Mute/unmute channel |
| `soloChannel(playerId, channel, solo)` | `string`, `number`, `boolean` | `Promise<void>` | Solo channel |
| `removePlayer(playerId)` | `string` | `Promise<void>` | Remove player |

#### Example

```javascript
const playerManager = new PlayerStateManager(stateManager);

// Set player state
await playerManager.setPlayerState('player1', {
    id: 'player1',
    kitName: 'Rock Kit',
    tempo: 120,
    patternGroup: 'Verse',
    sliders: Array(16).fill(50)
});

// Update tempo
await playerManager.setTempo('player1', 140);

// Mute channel
await playerManager.muteChannel('player1', 3, true);
```

---

### PatternGroupManager

Manages pattern groups and pattern operations.

```javascript
const patternManager = new PatternGroupManager(stateManager);
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `createPatternGroup(group)` | `Object` | `Promise<void>` | Create new pattern group |
| `getPatternGroup(name)` | `string` | `Object` | Get pattern group by name |
| `getAllGroups()` | - | `Array<Object>` | Get all pattern groups |
| `setPatterns(playerId, patterns)` | `string`, `Array` | `Promise<void>` | Set player patterns |
| `getPatterns(playerId)` | `string` | `Array` | Get player patterns |
| `activatePattern(playerId, index)` | `string`, `number` | `Promise<void>` | Activate pattern by index |
| `getActivePattern(playerId)` | `string` | `Object` | Get active pattern |
| `updatePattern(playerId, index, pattern)` | `string`, `number`, `Object` | `Promise<void>` | Update specific pattern |
| `clearPattern(playerId, index)` | `string`, `number` | `Promise<void>` | Clear pattern |

#### Pattern Structure

```javascript
{
    id: 'pattern_1',
    name: 'Pattern 1',
    steps: [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0],
    active: true,
    muted: false,
    length: 16
}
```

---

### DrumkitManager

Manages drumkit loading and caching.

```javascript
const drumkitManager = new DrumkitManager();
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `loadKit(kit)` | `Object` | `Promise<void>` | Load drumkit |
| `getKit(name)` | `string` | `Object` | Get loaded kit |
| `getAllKits()` | - | `Array<Object>` | Get all loaded kits |
| `preloadKits(names)` | `Array<string>` | `Promise<void>` | Preload multiple kits |
| `unloadKit(name)` | `string` | `void` | Unload kit from cache |
| `getMixerPreset(kitName)` | `string` | `Object` | Get kit's mixer preset |
| `clearCache()` | - | `void` | Clear all cached kits |

#### Kit Structure

```javascript
{
    name: 'Rock Kit',
    samples: ['kick.wav', 'snare.wav', ...],
    mixerPreset: {
        volumes: [80, 70, 60, ...],
        pans: [0, -10, 10, ...],
        effects: {
            reverb: 0.3,
            delay: 0.1,
            compression: 0.5
        }
    },
    metadata: {
        author: 'OTTO',
        version: '1.0.0',
        tags: ['rock', 'acoustic']
    }
}
```

---

### LinkManager

Manages parameter linking between players.

```javascript
const linkManager = new LinkManager(stateManager);
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `createLink(config)` | `Object` | `string` | Create parameter link, returns link ID |
| `removeLink(linkId)` | `string` | `void` | Remove link |
| `getLinks()` | - | `Array<Object>` | Get all links |
| `getLinksForPlayer(playerId)` | `string` | `Array<Object>` | Get player's links |
| `updateLink(linkId, config)` | `string`, `Object` | `void` | Update link configuration |
| `enableLink(linkId)` | `string` | `void` | Enable link |
| `disableLink(linkId)` | `string` | `void` | Disable link |

#### Link Configuration

```javascript
{
    source: {
        player: 'player1',
        parameter: 'tempo'
    },
    target: {
        player: 'player2',
        parameter: 'tempo'
    },
    type: 'bidirectional', // or 'unidirectional'
    enabled: true,
    transform: null // Optional transform function
}
```

---

### StorageManager

Handles all storage operations with compression and versioning.

```javascript
const storageManager = new StorageManager();
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `saveState(key, state)` | `string`, `Object` | `Promise<void>` | Save state |
| `loadState(key)` | `string` | `Promise<Object>` | Load state |
| `savePreset(preset)` | `Object` | `Promise<string>` | Save preset, returns ID |
| `loadPreset(presetId)` | `string` | `Promise<Object>` | Load preset |
| `getAllPresets()` | - | `Promise<Array>` | Get all presets |
| `deletePreset(presetId)` | `string` | `Promise<void>` | Delete preset |
| `exportData(format)` | `string` | `Promise<Blob>` | Export data |
| `importData(data)` | `Blob` | `Promise<void>` | Import data |
| `clearAll()` | - | `Promise<void>` | Clear all storage |

---

### SecurityManager

Centralized security operations and validation.

```javascript
const securityManager = new SecurityManager();
```

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `validateInput(input, rules)` | `any`, `Object` | `Object` | Validate input |
| `sanitizeHTML(html)` | `string` | `string` | Sanitize HTML content |
| `escapeString(str)` | `string` | `string` | Escape special characters |
| `checkPermission(action)` | `string` | `boolean` | Check action permission |
| `setCSPPolicy(policy)` | `string` | `void` | Set CSP policy |
| `enableAuditLog()` | - | `void` | Enable audit logging |
| `getAuditLog()` | - | `Array` | Get audit log entries |

---

## UI Components

### SliderComponent

Vertical/horizontal slider with touch support.

```javascript
const slider = new SliderComponent(element, {
    orientation: 'vertical',
    min: 0,
    max: 100,
    value: 50,
    step: 1
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `orientation` | `string` | `'vertical'` | Slider orientation |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `value` | `number` | `50` | Initial value |
| `step` | `number` | `1` | Value step |
| `disabled` | `boolean` | `false` | Disabled state |

#### Methods

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `setValue(value)` | `number` | `void` | Set slider value |
| `getValue()` | - | `number` | Get current value |
| `setEnabled(enabled)` | `boolean` | `void` | Enable/disable slider |
| `on(event, handler)` | `string`, `Function` | `void` | Add event listener |
| `destroy()` | - | `void` | Cleanup component |

#### Events

- `change` - Value changed
- `input` - Value changing (during drag)
- `start` - Interaction started
- `end` - Interaction ended

---

### DropdownComponent

Dropdown with virtual scrolling and search.

```javascript
const dropdown = new DropdownComponent(element, {
    items: ['Option 1', 'Option 2'],
    selected: 0,
    searchable: true
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `items` | `Array` | `[]` | Dropdown items |
| `selected` | `number` | `0` | Selected index |
| `searchable` | `boolean` | `false` | Enable search |
| `multiSelect` | `boolean` | `false` | Multiple selection |
| `placeholder` | `string` | `''` | Placeholder text |

---

### PatternGridComponent

Pattern grid with drag and drop support.

```javascript
const grid = new PatternGridComponent(element, {
    rows: 16,
    cols: 16,
    editable: true
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `rows` | `number` | `16` | Number of rows |
| `cols` | `number` | `16` | Number of columns |
| `editable` | `boolean` | `true` | Allow editing |
| `dragEnabled` | `boolean` | `true` | Enable drag/drop |

---

## Testing

### TestFramework

Lightweight testing framework.

```javascript
const test = new TestFramework();

test.describe('Component', () => {
    test.it('should work', () => {
        Assert.equal(1 + 1, 2);
    });
});

await test.runAll();
```

### PerformanceProfiler

Performance measurement and analysis.

```javascript
const profiler = new PerformanceProfiler();

profiler.startRecording();
// Perform operations
const report = profiler.stopRecording();
profiler.printReport(report);
```

---

## Migration to JUCE

### Component Mapping

| JavaScript | JUCE C++ |
|------------|----------|
| `StateManager` | `ValueTree` + `UndoManager` |
| `EventManager` | `ListenerList<T>` |
| `SliderComponent` | `Slider` |
| `DropdownComponent` | `ComboBox` |
| `PatternGridComponent` | Custom `Component` |
| `localStorage` | `PropertiesFile` |
| `Promise` | `AsyncUpdater` / `Thread` |
| `setTimeout` | `Timer` |

### State Management Translation

```cpp
// JavaScript
stateManager.setState({ tempo: 120 });

// JUCE C++
valueTree.setProperty("tempo", 120, undoManager);
```

### Event Handling Translation

```cpp
// JavaScript
eventManager.on(element, 'click', handler);

// JUCE C++
button.addListener(this);
void buttonClicked(Button* button) override { /* handler */ }
```

---

## Best Practices

1. **State Management**
   - Always use StateManager for global state
   - Validate state before updates
   - Use batch updates for multiple changes

2. **Event Handling**
   - Use EventManager for all DOM events
   - Clean up listeners on component destroy
   - Throttle/debounce expensive handlers

3. **Memory Management**
   - Call destroy() on all components
   - Use WeakMap for element references
   - Monitor memory usage in development

4. **Performance**
   - Profile critical paths
   - Use virtual scrolling for long lists
   - Batch DOM operations

5. **Security**
   - Validate all user inputs
   - Sanitize HTML content
   - Use CSP policies

---

## Error Handling

All async methods return Promises that may reject with errors:

```javascript
try {
    await playerManager.setTempo('player1', 500);
} catch (error) {
    if (error.code === 'VALIDATION_ERROR') {
        console.error('Invalid tempo value');
    }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `NOT_FOUND` | Resource not found |
| `STORAGE_ERROR` | Storage operation failed |
| `NETWORK_ERROR` | Network request failed |
| `PERMISSION_DENIED` | Insufficient permissions |
| `LIMIT_EXCEEDED` | Resource limit exceeded |

---

## Version History

- **1.0.0** - Initial release with core components
- **1.1.0** - Added security layer
- **1.2.0** - Performance optimizations
- **2.0.0** - JUCE-ready architecture

---

## Support

For issues and questions, please refer to the project repository or contact the development team.