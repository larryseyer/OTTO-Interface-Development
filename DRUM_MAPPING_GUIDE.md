# OTTO Drum Mapping System - User Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Basic Operations](#basic-operations)
4. [Advanced Features](#advanced-features)
5. [Factory Presets](#factory-presets)
6. [Troubleshooting](#troubleshooting)

## Overview

The OTTO Drum Mapping System provides comprehensive control over drum sound assignments, supporting all major drum software formats and offering professional-grade features for custom mapping creation.

### Key Features
- 40+ factory drum map presets from major vendors
- Visual drag-and-drop interface
- Velocity layer support
- Round-robin sample playback
- MIDI learn functionality
- A/B comparison mode
- Real-time sample audition
- SFZ file generation

## Getting Started

### Opening the Drum Map Editor

1. Click the **Drum Kit Edit** button in the OTTO interface
2. The full-screen drum mapping editor will open
3. The interface is divided into three main sections:
   - **Left Panel**: MIDI note grid (0-127)
   - **Center Panel**: Mapping connections and sample browser
   - **Right Panel**: Mixer channels (15 standard OTTO channels)

### Understanding the Layout

#### OTTO Standard Mixer Channels
1. **Kick** - Primary kick drum
2. **Snare** - Primary snare drum
3. **SideStick** - Side stick/rim click
4. **HiHat** - All hi-hat articulations
5. **Tom1-5** - Tom drums (high to low)
6. **Crash1-3** - Crash cymbals
7. **Ride** - Ride cymbal
8. **Bell** - Ride bell/cowbell
9. **Splash** - Splash cymbal/effects

## Basic Operations

### Selecting a Drum Map

1. Use the **Drum Map** dropdown at the top of the editor
2. Factory presets are listed under "Factory Presets"
3. Custom maps appear under "Custom Maps"
4. The current map loads automatically

### Creating a Custom Map

1. Click the **+** button next to the map selector
2. Enter a name for your custom map
3. Choose to start from scratch or duplicate an existing map
4. Your new map becomes active immediately

### Assigning Notes to Channels

#### Method 1: Drag and Drop
1. Click and drag a note from the left panel
2. Drop it onto a mixer channel in the right panel
3. The note is now assigned to that channel

#### Method 2: Click Selection
1. Click a note in the grid to select it
2. Click the target mixer channel
3. Press the "Assign" button

### Viewing Modes

Toggle between three view modes using the buttons above the note grid:

- **Grid View**: 8x16 matrix of all 128 MIDI notes
- **List View**: Shows only mapped notes with details
- **Piano View**: Traditional piano roll layout

### Previewing Sounds

1. Select any note in the grid
2. Adjust the velocity slider (0-127)
3. Click **Preview Note** to hear the sound
4. The sound plays through the assigned mixer channel

## Advanced Features

### Velocity Layers

Add multiple samples triggered by velocity ranges:

1. Select a note
2. Click **Add Velocity Layer**
3. Set the velocity range (min-max)
4. Choose the sample file
5. Repeat for additional layers

**Auto-Create Layers**:
- Select multiple samples
- Choose velocity curve (linear/exponential/logarithmic)
- System automatically distributes velocity ranges

### Round-Robin Samples

Rotate between multiple samples for natural variation:

1. Select a note
2. Click **Add Round-Robin**
3. Select multiple sample files
4. Samples will rotate on each trigger

### MIDI Learn

Map notes using your MIDI controller:

1. Click **MIDI Learn** button
2. Button turns red (active)
3. Play a note on your MIDI controller
4. Click the target channel or note
5. Mapping is created automatically

### A/B Comparison

Compare two drum maps side-by-side:

1. Load Map A
2. Click **Enable Comparison**
3. Select Map B
4. Use **Switch A/B** to toggle instantly
5. View differences report

### Importing MIDI Files

1. Click **Import MIDI**
2. Select a MIDI file
3. System auto-detects the vendor format
4. Choose target mapping format
5. Translation happens automatically

### Exporting Maps

#### Export as JSON:
1. Click **Export Map**
2. Choose "JSON Format"
3. File downloads to your computer

#### Export as SFZ:
1. Click **Export Map**
2. Choose "SFZ Format"
3. Creates a complete SFZ file with all mappings

## Factory Presets

### Available Vendor Maps

#### Industry Standards
- **General MIDI** - Universal standard mapping
- **GM2** - General MIDI Level 2

#### Popular Software
- **XLN Audio**
  - Addictive Drums 2
  - XO

- **Toontrack**
  - Superior Drummer 3
  - EZdrummer 3
  - EZdrummer 2

- **Native Instruments**
  - Battery 4
  - Maschine
  - Abbey Road Series
  - Studio Drummer

- **FXpansion/inMusic**
  - BFD3
  - BFD Eco

- **Steven Slate**
  - SSD 5.5
  - Trigger 2

#### Classic Drum Machines
- **Roland**
  - TR-808
  - TR-909
  - TR-606
  - TR-707

### Loading Factory Presets

1. Open the Drum Map dropdown
2. Navigate to "Factory Presets"
3. Select the desired vendor/format
4. Map loads instantly
5. Factory presets are read-only (duplicate to edit)

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Preview selected note |
| `1-3` | Switch view modes (Grid/List/Piano) |
| `Delete` | Remove selected note mapping |
| `Ctrl+S` | Save current custom map |
| `Ctrl+D` | Duplicate current map |
| `Ctrl+Z` | Undo last action |
| `Ctrl+Y` | Redo action |
| `Tab` | Switch between panels |
| `Escape` | Close drum editor |
| `A/B` | Toggle comparison mode |
| `M` | Toggle MIDI learn |

## Troubleshooting

### Common Issues

#### MIDI Learn Not Working
- Ensure browser has MIDI permissions
- Check MIDI device is connected before opening OTTO
- Try refreshing the page with device connected

#### Samples Not Playing
- Verify sample files exist in Assets/Drumkits/
- Check browser console for loading errors
- Ensure Web Audio API is supported

#### Maps Not Saving
- Custom maps auto-save after 2 seconds
- Check browser storage is not full
- Try manual export as backup

#### Slow Performance
- Reduce number of velocity layers
- Clear unused round-robin samples
- Close other browser tabs

### Best Practices

1. **Start with Factory Presets**: Duplicate and modify rather than starting from scratch
2. **Use Consistent Naming**: Name custom maps descriptively
3. **Test Mappings**: Always preview before saving
4. **Export Regularly**: Keep JSON backups of custom maps
5. **Organize Samples**: Keep samples in appropriate folders

## Technical Details

### File Structure
```
/Assets/DrumMaps/
  ├── factory/     # Read-only factory presets
  └── user/        # Custom user maps
```

### Map Data Format
- JSON structure with mapping definitions
- Supports velocity layers and round-robin
- Includes mixer channel assignments
- Stores color coding and metadata

### Browser Requirements
- Chrome 66+ / Firefox 60+ / Safari 11+
- Web MIDI API support (for MIDI Learn)
- Web Audio API support (for preview)
- Local storage enabled

## Support

For issues or feature requests, please refer to:
- GitHub Issues: [OTTO-Interface-Development](https://github.com/larryseyer/OTTO-Interface-Development)
- Documentation updates in DRUM_MAPPING_IMPLEMENTATION.md

---
*Last Updated: 2025-01-13*
*Version: 1.0*