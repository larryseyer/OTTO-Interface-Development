# OTTO Drum Mapping System Implementation Plan

## Overview
Comprehensive drum mapping system for OTTO to handle MIDI note assignments, SFZ editing, and translation between different drum software layouts.

## Project Status
- **Start Date**: 2025-01-13
- **Current Phase**: Phase 1 - Core Infrastructure
- **Status**: In Progress

## File Organization

### JavaScript Files (Root Directory)
- `DrumMapManager.js` - Main controller for drum mapping operations
- `DrumMapPresets.js` - Database of all vendor drum mappings
- `SFZEditor.js` - SFZ file parsing and manipulation
- `MidiTranslator.js` - MIDI file translation between mapping schemes
- `DrumMapUI.js` - UI components for drum kit editor

### Drum Maps (`/Assets/DrumMaps/`)
```
/Assets/DrumMaps/
  ├── factory/               # Built-in vendor mappings
  │   ├── generalMidi.json
  │   ├── xlnAudio/
  │   │   ├── addictiveDrums2.json
  │   │   └── xo.json
  │   ├── steinberg/
  │   │   ├── grooveAgent5.json
  │   │   ├── grooveAgentSE.json
  │   │   └── backbone.json
  │   ├── toontrack/
  │   │   ├── superiorDrummer3.json
  │   │   ├── ezDrummer3.json
  │   │   └── ezDrummer2.json
  │   ├── nativeInstruments/
  │   │   ├── battery4.json
  │   │   ├── studioDrummer.json
  │   │   ├── abbeyRoad50s.json
  │   │   ├── abbeyRoad60s.json
  │   │   ├── abbeyRoad70s.json
  │   │   ├── abbeyRoad80s.json
  │   │   ├── abbeyRoadModern.json
  │   │   ├── abbeyRoadVintage.json
  │   │   ├── maschine.json
  │   │   └── drumlab.json
  │   ├── fxpansion/
  │   │   ├── bfd3.json
  │   │   ├── bfdEco.json
  │   │   └── bfdPlayer.json
  │   ├── stevenSlate/
  │   │   ├── ssd5.json
  │   │   └── trigger2.json
  │   ├── ikMultimedia/
  │   │   ├── modoDrum.json
  │   │   └── sampleTankDrums.json
  │   ├── arturia/
  │   │   ├── spark2.json
  │   │   └── drumBruteImpact.json
  │   ├── roland/
  │   │   ├── rolandCloud.json
  │   │   ├── tr808.json
  │   │   ├── tr909.json
  │   │   ├── tr606.json
  │   │   └── tr707.json
  │   ├── spectrasonics/
  │   │   └── stylusRmx.json
  │   ├── pluginBoutique/
  │   │   ├── drumMaster.json
  │   │   └── drumTools.json
  │   ├── getGoodDrums/
  │   │   ├── modernMassive.json
  │   │   ├── invasion.json
  │   │   └── mattHalpern.json
  │   ├── other/
  │   │   ├── mlDrums.json
  │   │   ├── mtPowerDrumKit2.json
  │   │   ├── sennheiserDrumMica.json
  │   │   ├── oceanWayDrums.json
  │   │   ├── abbeyRoadDrumsWaves.json
  │   │   ├── perfectDrums.json
  │   │   ├── eastWestProDrummer.json
  │   │   ├── vengeancePhalanx.json
  │   │   ├── audioRealismAdm.json
  │   │   ├── d16Nithonat.json
  │   │   ├── d16Nepheton.json
  │   │   ├── d16Drumazon.json
  │   │   ├── d16PunchBox.json
  │   │   ├── sugarBytesDrumComputer.json
  │   │   ├── microtonic.json
  │   │   ├── drumPro.json
  │   │   ├── drumCore4.json
  │   │   ├── jamstix4.json
  │   │   ├── airStrike2.json
  │   │   ├── heavyocityDamage.json
  │   │   ├── heavyocityDamage2.json
  │   │   ├── outputArcade.json
  │   │   ├── algonautAtlas2.json
  │   │   ├── talDrum.json
  │   │   ├── waveAlchemyRevolution.json
  │   │   └── samplesFromMars.json
  └── user/                  # User custom mappings
```

## OTTO Standard Mixer Channels
1. **Kick** - Primary kick drum
2. **Snare** - Primary snare drum
3. **SideStick** - Side stick/rim click
4. **HiHat** - Hi-hat (all articulations)
5. **Tom1** - High tom
6. **Tom2** - Mid tom
7. **Tom3** - Low tom
8. **Tom4** - Floor tom 1
9. **Tom5** - Floor tom 2
10. **Crash1** - Crash cymbal 1
11. **Crash2** - Crash cymbal 2
12. **Crash3** - Crash cymbal 3
13. **Ride** - Ride cymbal
14. **Bell** - Ride bell/cowbell
15. **Splash** - Splash cymbal/effects

## Implementation Phases

### Phase 1: Core Infrastructure ✅ IN PROGRESS
- [x] Create implementation plan document
- [ ] Research all drum manufacturer layouts
- [ ] Modify kit-edit-panel to full screen
- [ ] Create DrumMapManager.js
- [ ] Create DrumMapPresets.js with vendor database
- [ ] Create basic SFZ parsing in SFZEditor.js

### Phase 2: UI Development
- [ ] Build three-column layout in kit-edit-panel
- [ ] Create note assignment matrix (0-127)
- [ ] Implement mixer channel assignment panel
- [ ] Add mapping presets selector
- [ ] Implement drag & drop functionality
- [ ] Add visual feedback and color coding

### Phase 3: MIDI Translation
- [ ] Create MidiTranslator.js engine
- [ ] Implement vendor detection algorithms
- [ ] Build translation matrices
- [ ] Test with various MIDI file formats
- [ ] Handle unmapped notes gracefully

### Phase 4: Advanced Features
- [ ] Velocity layer editing interface
- [ ] Round-robin sample support
- [ ] Articulation switching
- [ ] MIDI learn functionality
- [ ] A/B comparison mode
- [ ] Import/export custom mappings

## Data Structure Specifications

### Drum Map Object
```javascript
{
  name: "String - Map name",
  version: "String - Version number",
  vendor: "String - Vendor name",
  created: "Date - Creation timestamp",
  modified: "Date - Last modification",
  mapping: {
    // MIDI Note (0-127) : Sound Definition
    noteNumber: {
      samplePath: "String - Path to sample file",
      mixerChannel: "String - One of 15 standard channels",
      articulation: "String - main/ghost/flam/roll/etc",
      velocityLayers: [
        {
          min: "Number - Min velocity (0-127)",
          max: "Number - Max velocity (0-127)",
          sample: "String - Sample file for this layer"
        }
      ],
      roundRobin: ["Array of sample paths"],
      humanize: {
        timing: "Number - Timing variation in ms",
        velocity: "Number - Velocity variation %"
      }
    }
  },
  mixerChannels: {
    channelName: {
      notes: ["Array of MIDI note numbers"],
      color: "String - Hex color for UI",
      defaultLevel: "Number - Default volume 0-100",
      defaultPan: "Number - Default pan -100 to 100"
    }
  },
  metadata: {
    description: "String - Map description",
    author: "String - Creator name",
    tags: ["Array of searchable tags"]
  }
}
```

## UI Component Specifications

### Edit Drumkits Window (Full Screen)
- **Header**: Title, preset selector, save/load buttons
- **Left Panel (30%)**: Available samples & MIDI note grid
- **Center Panel (40%)**: Mapping matrix with visual connections
- **Right Panel (30%)**: Mixer channels & mapping tools
- **Footer**: Preview controls, MIDI monitor, help text

## Testing Requirements
- [ ] Test all vendor preset mappings
- [ ] Verify MIDI translation accuracy
- [ ] Performance test with large sample libraries
- [ ] Cross-browser compatibility
- [ ] Memory leak testing
- [ ] User acceptance testing

## Known Vendor-Specific Considerations
- **General MIDI**: Industry standard, base reference
- **XLN Audio**: Uses extended mapping for hi-hat articulations
- **Toontrack**: Extensive articulation system
- **Native Instruments**: Machine-specific pad layouts
- **Roland**: Classic drum machine layouts (x0x style)
- **FXpansion BFD**: Deep velocity layers and articulations

## Next Steps
1. Complete vendor layout research
2. Modify UI to full screen
3. Begin core JavaScript implementation
4. Create factory preset JSON files

## Notes
- All JavaScript files stored in root directory per project convention
- Drum maps stored in `/Assets/DrumMaps/` hierarchy
- System uses General MIDI as default/reference mapping
- Must support real-time translation for live MIDI input

---
*Last Updated: 2025-01-13*