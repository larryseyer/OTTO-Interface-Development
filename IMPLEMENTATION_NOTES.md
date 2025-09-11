# OTTO Interface - Implementation Notes

## Pending Tasks and Issues

### 1. Mixer Window State Management (IMPORTANT)

**Date Added:** 2025-09-10  
**Status:** Needs Implementation  
**Priority:** High

#### Current Issue:

- The `kitMixerActive` boolean is stored in player state and saved with presets
- This tracks whether the mixer window is open/closed, NOT actual mixer values
- Opening/closing the mixer window was incorrectly marking presets as dirty
- This creates duplicate state tracking (WindowManager already tracks open windows)

#### What Needs to Be Done:

1. **Remove `kitMixerActive` from player state completely**
   - Remove from initial state creation
   - Remove from preset saving/loading
   - Remove from state validation schema

2. **Use WindowManager for button state**
   - Update mixer button visual state based on `windowManager.isWindowOpen("panel", "mixer")`
   - Remove redundant state tracking

3. **Implement actual mixer value tracking**
   - Create proper mixer state structure (volume, EQ, effects, etc.)
   - Only set dirty flags when mixer VALUES change
   - Save actual mixer settings with presets, not window state

4. **Update the mixer panel UI**
   - Currently shows placeholder text
   - Needs actual mixer controls (faders, knobs, etc.)
   - Controls should update the mixer values and trigger dirty flags appropriately

#### Files to Modify:

- `script.js` - Remove kitMixerActive from player states
- `WindowManager.js` - Already handles window state properly
- `index.html` - Update mixer panel with actual controls

#### Example of Proper Implementation:

```javascript
// Instead of kitMixerActive, track actual mixer values:
playerStates[playerNum].mixerSettings = {
  volume: 75,
  pan: 0,
  eq: {
    low: 0,
    mid: 0,
    high: 0
  },
  effects: {
    reverb: 0,
    delay: 0,
    compression: 0
  }
};

// Only set dirty when values change:
onMixerVolumeChange(playerNum, value) {
  this.playerStates[playerNum].mixerSettings.volume = value;
  this.setDirty("preset", true); // NOW it makes sense to mark as dirty
}
```

---

### 2. Other Implementation Notes

(Add other pending tasks here as they come up)

---

## Completed Fixes

### Phase 1-5 Completed:

- ✅ Memory leak fixes with WeakMap
- ✅ Event listener lifecycle management
- ✅ Timer management system
- ✅ Separate manager classes architecture
- ✅ Data validation layer
- ✅ Performance optimizations
- ✅ UI component refactoring

### Recent Fixes:

- ✅ Fixed mixer window not opening (WindowManager mutex group error)
- ✅ Fixed incorrect addEventListener parameter usage
- ✅ Removed unnecessary dirty flag when opening mixer window

---

## Architecture Notes

### Manager Classes:

- **EventManager** - Centralized event handling with automatic cleanup
- **TimerManager** - Timer lifecycle management
- **StateManager** - State transactions and validation
- **PlayerStateManager** - Player-specific state (4 active, 8 max)
- **WindowManager** - Window/panel state management
- **StorageManager** - Abstracted storage operations
- **DataValidator** - Schema-based validation
- **InputSanitizer** - Security and input sanitization

### Key Principles:

1. No backward compatibility needed (internal use only)
2. Preparing for JUCE 8 C++ implementation
3. 4 players active by default, 8 maximum
4. Clean separation of concerns
5. No duplicate state tracking
