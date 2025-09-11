# OTTO Interface Storage System Redesign

## Overview
Complete restructuring of how players, MIDI files, drumkits (SFZ+mixer), and pattern groups interact. This eliminates complex state synchronization by having players directly own their MIDI/drumkit references while pattern groups become purely organizational tools.

## Core Principles
- **Players own**: MIDI file, drumkit (SFZ+mixer), and all their settings (swing, energy, volume, toggles, fills)
- **Presets own**: SliderLink states and collection of all player states
- **Pattern Groups**: Pure organizational tools for MIDI files (no state to maintain)
- **Transport**: Unchanged - handles all timing/sync globally
- **No Migration**: Fresh implementation, no backward compatibility needed

## Data Structure Changes

### 1. Player State Structure
```javascript
playerStates[i] = {
  // File references (NEW/MODIFIED)
  midiFile: "Afro Cuban Pop",     // Direct MIDI file reference
  drumkit: "Acoustic",             // Drumkit (SFZ + mixer combo)
  
  // All existing player settings (UNCHANGED)
  kitMixerActive: false,
  muted: false,
  toggleStates: {
    none: false,
    auto: true,
    manual: false,
    stick: false,
    ride: false,
    lock: false
  },
  fillStates: {
    now: false,
    4: false,
    8: false,
    16: true,
    32: false,
    solo: false
  },
  sliderValues: {
    swing: 10,
    energy: 50,
    volume: 70
  }
}
```

### 2. Preset Structure
```javascript
preset = {
  name: "My Preset",
  timestamp: Date.now(),
  playerStates: {...},  // All player states with their MIDI/drumkit/settings
  linkStates: {         // SliderLink at preset level (NOT player level)
    swing: { master: 1, slaves: new Set([2, 3]) },
    energy: { master: null, slaves: new Set() },
    volume: { master: null, slaves: new Set() }
  },
  tempo: 120,
  numberOfPlayers: 4
}
```

### 3. Pattern Group System (Simplified)
```javascript
patternGroups = {
  'favorites': {
    name: 'Favorites',
    patterns: ['Basic', 'Funk', 'Jazz', ...],  // Just MIDI file names for display
    deletable: false
  },
  'group-1': {
    name: 'Group 1',  // User-editable
    patterns: [...],
    deletable: true
  }
}
// No selectedPattern field needed - groups don't track state
```

### 4. MIDI File Registry (New)
```javascript
midiFileRegistry = {
  'Afro Cuban Pop': ['favorites', 'group-2'],
  'Basic': ['favorites'],
  'Funk': ['favorites', 'group-1']
  // Every file must be in at least one group
}
```

## Implementation Phases

### Phase 1: Data Model Foundation
**Goal**: Establish new data structures without breaking existing functionality

1. **Add new fields to player states**
   - Add `midiFile` field to player state structure
   - Keep existing `drumkit` field as-is
   - Maintain backward compatibility temporarily

2. **Create MIDI File Registry**
   - Implement `midiFileRegistry` object
   - Add registry management functions:
     - `initializeMidiRegistry()`
     - `updateMidiRegistry(midiFile, groups)`
     - `getMidiFileGroups(midiFile)`
     - `getGroupMidiFiles(groupKey)`

3. **Update storage keys**
   - Create new localStorage key for registry: `ottoMidiRegistry`
   - Keep existing storage keys during transition

### Phase 2: MIDI File Management System
**Goal**: Implement automatic MIDI file organization

1. **Implement `ensureAllMidiFilesAssigned()`**
   ```javascript
   function ensureAllMidiFilesAssigned() {
     // Get all MIDI files from the master list
     // Check each against registry
     // For unassigned files:
     //   - Find group with space (<16 patterns)
     //   - If no space, create new group
     //   - Add to registry
   }
   ```

2. **Auto-group creation**
   ```javascript
   function createAutoGroup() {
     // Find next available group number
     // Create group with name "Group X"
     // Return group key
   }
   ```

3. **Group capacity management**
   ```javascript
   function findGroupWithSpace() {
     // Check all groups except 'favorites'
     // Return first group with <16 patterns
     // Return null if all full
   }
   ```

### Phase 3: Player-MIDI Integration
**Goal**: Connect players directly to MIDI files

1. **Update pattern selection**
   ```javascript
   function onPatternSelected(playerNumber, midiFileName) {
     // Update player's midiFile directly
     playerStates[playerNumber].midiFile = midiFileName;
     // Mark as dirty for save
     setDirty("player", true);
   }
   ```

2. **Implement player-aware group switching**
   ```javascript
   function onPlayerLoaded(playerNumber) {
     const midiFile = playerStates[playerNumber].midiFile;
     const groups = getMidiFileGroups(midiFile);
     
     if (!groups.includes(currentDisplayedGroup)) {
       // Switch to first group containing this MIDI file
       switchToGroup(groups[0]);
     }
   }
   ```

3. **Update player switching logic**
   - When switching players, check if their MIDI file is in current group
   - Auto-switch groups if needed
   - Highlight the player's current MIDI file in the pattern grid

### Phase 4: Group Management Overhaul
**Goal**: Transform groups into organizational tools

1. **Remove state from groups**
   - Remove `selectedPattern` field from groups
   - Groups only store pattern lists
   - No state synchronization needed

2. **Implement group CRUD operations**
   ```javascript
   function createGroup(name) { /* Create empty group */ }
   function deleteGroup(groupKey) { /* Delete with safety checks */ }
   function renameGroup(groupKey, newName) { /* Rename group */ }
   ```

3. **Pattern-to-group assignment**
   ```javascript
   function addPatternToGroup(midiFile, groupKey) {
     // Add to group (max 16)
     // Update registry
   }
   
   function removePatternFromGroup(midiFile, groupKey) {
     // Check if last group
     // Prevent or reassign if needed
   }
   ```

### Phase 5: Preset System Updates
**Goal**: Update presets to work with new structure

1. **Modify preset creation**
   ```javascript
   function createPresetFromCurrentState(name) {
     return {
       name: name,
       timestamp: Date.now(),
       playerStates: clonePlayerStates(), // Includes midiFile
       linkStates: structuredClone(linkStates),
       tempo: tempo,
       numberOfPlayers: numberOfPlayers
     };
   }
   ```

2. **Update preset loading**
   ```javascript
   function loadPreset(presetKey) {
     // Load player states with midiFile references
     // Apply SliderLink states
     // For each player, ensure their MIDI file has a group
     // Update UI
   }
   ```

3. **Remove old references**
   - Remove `patternGroup` from preset saves
   - Remove `selectedPattern` from preset saves

### Phase 6: UI Updates
**Goal**: Update user interface for new system

1. **Pattern grid behavior**
   - Click pattern → updates player's midiFile
   - Show patterns from current group
   - Highlight current player's pattern if in group

2. **Group dropdown**
   - Purely for display organization
   - No state management
   - Add create/rename/delete options

3. **Drag and drop**
   - Implement dragging patterns between groups
   - Update registry on drop
   - Enforce 16 pattern limit

4. **Group management UI**
   - Add "New Group" button
   - Add rename capability (except Favorites)
   - Add delete capability (except Favorites)
   - Show pattern count (X/16)

### Phase 7: Cleanup and Optimization
**Goal**: Remove old code and optimize

1. **Remove deprecated code**
   - Remove old pattern group state management
   - Remove synchronization logic
   - Clean up unused functions

2. **Optimize performance**
   - Cache registry lookups
   - Batch UI updates
   - Minimize storage writes

3. **Add error handling**
   - Handle missing MIDI files gracefully
   - Validate group operations
   - Add user notifications for errors

## Key Functions Reference

### Core Functions
- `ensureAllMidiFilesAssigned()` - Ensures every MIDI file is in at least one group
- `initializeMidiRegistry()` - Builds initial registry from groups and files
- `onPatternSelected(player, midi)` - Updates player's MIDI file
- `onPlayerLoaded(player)` - Handles player selection/preset load
- `getMidiFileGroups(midi)` - Returns groups containing a MIDI file
- `findOrCreateGroupForMidi(midi)` - Finds space or creates new group

### Group Management
- `createGroup(name)` - Creates new empty group
- `deleteGroup(key)` - Deletes group with safety checks
- `renameGroup(key, name)` - Renames group
- `addPatternToGroup(midi, group)` - Adds MIDI to group
- `removePatternFromGroup(midi, group)` - Removes with safety

### Storage
- `saveMidiRegistry()` - Saves registry to localStorage
- `loadMidiRegistry()` - Loads registry from localStorage
- `savePatternGroups()` - Saves groups (organizational only)
- `loadPatternGroups()` - Loads groups

## Testing Checklist

### Phase 1 Tests
- [ ] New player state fields are added
- [ ] Registry structure is created
- [ ] Storage doesn't break existing data

### Phase 2 Tests
- [ ] All MIDI files get assigned to groups
- [ ] Auto-group creation works
- [ ] 16 pattern limit is enforced

### Phase 3 Tests
- [ ] Pattern selection updates player's midiFile
- [ ] Player loading finds correct group
- [ ] Group switching works when player changes

### Phase 4 Tests
- [ ] Groups can be created/renamed/deleted
- [ ] Patterns can be in multiple groups
- [ ] Every pattern stays in at least one group

### Phase 5 Tests
- [ ] Presets save with new structure
- [ ] Presets load correctly
- [ ] SliderLink remains at preset level

### Phase 6 Tests
- [ ] UI reflects new organization
- [ ] Drag and drop works between groups
- [ ] Group management UI functions properly

### Phase 7 Tests
- [ ] No old code remains
- [ ] Performance is acceptable
- [ ] Error handling works

## Benefits Summary

1. **Simpler Mental Model**: Players own files, groups organize them
2. **No State Synchronization**: Groups don't track selection state
3. **Flexible Organization**: MIDI files can be in multiple groups
4. **Automatic Management**: System ensures all files are accessible
5. **Clean Separation**: Clear ownership of data (player vs preset vs group)
6. **Better UX**: Users can organize patterns however they want

## Notes

- Transport/sync system remains completely unchanged
- No migration needed - fresh implementation
- Favorites group is special: cannot be deleted or renamed
- Each group has max 16 patterns for UI consistency
- Players remember their complete state including MIDI/drumkit combo