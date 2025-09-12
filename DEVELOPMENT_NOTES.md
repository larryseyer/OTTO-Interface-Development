# OTTO Interface Development Notes

## CRITICAL: Project Purpose and Scope

### THIS IS A UI TEMPLATE ONLY - NOT A JUCE CLIENT

This project is an HTML/CSS/JavaScript prototype that serves as a **visual and behavioral template** for the OTTO interface. It will be used as a reference when building the actual native interface in JUCE 8.

## Key Points to Remember

1. **No JUCE Communication**: This web interface does NOT connect to JUCE or any backend
2. **Template Purpose**: This is purely for UI/UX design and behavior specification
3. **Standalone Operation**: All functionality is self-contained in the browser
4. **Local Storage Only**: Data persistence uses browser localStorage, not a database
5. **No Audio Processing**: No actual audio functionality - just UI simulation

## What We're Building

- A complete, interactive UI prototype that demonstrates:
  - Visual design and styling
  - User interactions and workflows
  - State management patterns
  - Animation and transitions
  - Responsive behavior

## What We're NOT Building

- ❌ JUCE bridge or communication layer
- ❌ WebSocket connections
- ❌ Message passing to/from backend
- ❌ Audio engine integration
- ❌ MIDI processing
- ❌ Real-time audio controls

## Development Guidelines

1. Keep all functionality browser-based
2. Use localStorage for persistence
3. Focus on UI/UX perfection
4. Document behaviors clearly for JUCE developers
5. Maintain clean, readable code as reference implementation

## Current Features

- ✅ 8 player tabs with state management
- ✅ Preset system with save/load/lock functionality
- ✅ Pattern grid and group management
- ✅ Drumkit selection
- ✅ Toggle and fill controls
- ✅ Slider controls (swing, energy, volume)
- ✅ Link system for parameter synchronization
- ✅ Settings and store windows
- ✅ Local storage persistence

## Storage Keys Used

- `ottoAppState` - Global app state (current preset, player, tempo, etc.)
- `otto_presets` - All saved presets
- `otto_preset_locks` - Preset lock states
- `otto_player_*` - Individual player states
- `otto_pattern_groups` - Pattern group definitions

## For JUCE Developers

This interface demonstrates the expected:
- Component layouts and sizing
- Color schemes and styling
- Animation timings
- User interaction patterns
- State management logic
- Data structures

Use this as your visual and behavioral specification when implementing in JUCE 8.

---

Last Updated: 2025-01-11
Purpose: UI/UX Template for JUCE 8 Native Implementation