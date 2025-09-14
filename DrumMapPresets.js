class DrumMapPresets {
  constructor() {
    // Note mappings for major drum software vendors
    // Each mapping defines which MIDI notes trigger which drum sounds
    this.presets = this.initializePresets();
  }

  initializePresets() {
    return {
      // General MIDI - Industry Standard Reference
      generalMidi: {
        name: "General MIDI",
        vendor: "MIDI Standard",
        description: "Industry standard MIDI drum mapping",
        mapping: {
          35: "Acoustic Bass Drum 2",
          36: "Acoustic Bass Drum 1",
          37: "Side Stick",
          38: "Acoustic Snare",
          39: "Hand Clap",
          40: "Electric Snare",
          41: "Low Floor Tom",
          42: "Closed Hi-Hat",
          43: "High Floor Tom",
          44: "Pedal Hi-Hat",
          45: "Low Tom",
          46: "Open Hi-Hat",
          47: "Low-Mid Tom",
          48: "Hi-Mid Tom",
          49: "Crash Cymbal 1",
          50: "High Tom",
          51: "Ride Cymbal 1",
          52: "Chinese Cymbal",
          53: "Ride Bell",
          54: "Tambourine",
          55: "Splash Cymbal",
          56: "Cowbell",
          57: "Crash Cymbal 2",
          58: "Vibraslap",
          59: "Ride Cymbal 2",
          60: "Hi Bongo",
          61: "Low Bongo",
          62: "Mute Hi Conga",
          63: "Open Hi Conga",
          64: "Low Conga",
          65: "High Timbale",
          66: "Low Timbale",
          67: "High Agogo",
          68: "Low Agogo",
          69: "Cabasa",
          70: "Maracas",
          71: "Short Whistle",
          72: "Long Whistle",
          73: "Short Guiro",
          74: "Long Guiro",
          75: "Claves",
          76: "Hi Wood Block",
          77: "Low Wood Block",
          78: "Mute Cuica",
          79: "Open Cuica",
          80: "Mute Triangle",
          81: "Open Triangle",
        },
      },

      // XLN Audio - Addictive Drums 2
      addictiveDrums2: {
        name: "Addictive Drums 2",
        vendor: "XLN Audio",
        description: "XLN Audio Addictive Drums 2 mapping",
        mapping: {
          36: "Kick",
          37: "Snare Sidestick",
          38: "Snare",
          39: "Snare Rimshot",
          40: "Snare 2",
          41: "Tom 5 (Floor 2)",
          42: "Hihat Closed",
          43: "Tom 4 (Floor 1)",
          44: "Hihat Pedal",
          45: "Tom 3",
          46: "Hihat Open",
          47: "Tom 2",
          48: "Tom 1",
          49: "Crash 1",
          51: "Ride",
          52: "Crash 2",
          53: "Ride Bell",
          55: "Splash",
          57: "Crash 3",
          59: "Ride Edge",
          // Extended articulations
          22: "Hihat Tight",
          23: "Hihat Semi-Open",
          24: "Hihat Loose",
          25: "Hihat Very Loose",
          26: "Hihat Closed Bell",
          27: "Hihat Open Bell",
          60: "Crash 1 Choke",
          61: "Crash 2 Choke",
          62: "Splash Choke",
        },
      },

      // Toontrack - Superior Drummer 3
      superiorDrummer3: {
        name: "Superior Drummer 3",
        vendor: "Toontrack",
        description: "Toontrack Superior Drummer 3 mapping",
        mapping: {
          35: "Kick Out",
          36: "Kick In",
          37: "Snare Sidestick",
          38: "Snare Center",
          39: "Snare Rimshot",
          40: "Snare Off-Center",
          41: "Tom 6",
          42: "Hihat Closed Tip",
          43: "Tom 5",
          44: "Hihat Pedal",
          45: "Tom 4",
          46: "Hihat Open",
          47: "Tom 3",
          48: "Tom 2",
          49: "Crash 1",
          50: "Tom 1",
          51: "Ride Tip",
          52: "China",
          53: "Ride Bell",
          54: "Tambourine",
          55: "Splash",
          56: "Cowbell",
          57: "Crash 2",
          58: "Crash 3",
          59: "Ride Edge",
          // Extended articulations
          20: "Hihat Closed Shank",
          21: "Hihat Closed Foot",
          22: "Hihat Half-Open Tip",
          23: "Hihat Half-Open Shank",
          24: "Hihat Open 1",
          25: "Hihat Open 2",
          26: "Hihat Open 3",
          27: "Hihat Open 4",
          28: "Hihat Open 5",
          60: "Ride Bow",
          61: "Crash 1 Choke",
          62: "Crash 2 Choke",
          63: "Crash 3 Choke",
          64: "China Choke",
          65: "Splash Choke",
        },
      },

      // Native Instruments - Battery 4
      battery4: {
        name: "Battery 4",
        vendor: "Native Instruments",
        description: "Native Instruments Battery 4 mapping",
        mapping: {
          // Standard 4x4 pad layout (C1 starts at MIDI note 36)
          36: "Pad 1 (C1)",
          37: "Pad 2 (C#1)",
          38: "Pad 3 (D1)",
          39: "Pad 4 (D#1)",
          40: "Pad 5 (E1)",
          41: "Pad 6 (F1)",
          42: "Pad 7 (F#1)",
          43: "Pad 8 (G1)",
          44: "Pad 9 (G#1)",
          45: "Pad 10 (A1)",
          46: "Pad 11 (A#1)",
          47: "Pad 12 (B1)",
          48: "Pad 13 (C2)",
          49: "Pad 14 (C#2)",
          50: "Pad 15 (D2)",
          51: "Pad 16 (D#2)",
          // Extended cells
          52: "Pad 17 (E2)",
          53: "Pad 18 (F2)",
          54: "Pad 19 (F#2)",
          55: "Pad 20 (G2)",
          56: "Pad 21 (G#2)",
          57: "Pad 22 (A2)",
          58: "Pad 23 (A#2)",
          59: "Pad 24 (B2)",
          60: "Pad 25 (C3)",
          61: "Pad 26 (C#3)",
          62: "Pad 27 (D3)",
          63: "Pad 28 (D#3)",
          64: "Pad 29 (E3)",
          65: "Pad 30 (F3)",
          66: "Pad 31 (F#3)",
          67: "Pad 32 (G3)",
        },
      },

      // Native Instruments - Maschine
      maschine: {
        name: "Maschine",
        vendor: "Native Instruments",
        description: "Native Instruments Maschine mapping",
        mapping: {
          // Maschine pad layout (starting from C1)
          36: "Pad 13",
          37: "Pad 14",
          38: "Pad 15",
          39: "Pad 16",
          40: "Pad 9",
          41: "Pad 10",
          42: "Pad 11",
          43: "Pad 12",
          44: "Pad 5",
          45: "Pad 6",
          46: "Pad 7",
          47: "Pad 8",
          48: "Pad 1",
          49: "Pad 2",
          50: "Pad 3",
          51: "Pad 4",
        },
      },

      // FXpansion - BFD3
      bfd3: {
        name: "BFD3",
        vendor: "FXpansion/inMusic",
        description: "BFD3 drum mapping with extensive articulations",
        mapping: {
          36: "Kick",
          37: "Snare Sidestick",
          38: "Snare Hit",
          39: "Snare Rim Click",
          40: "Snare Flam",
          41: "Tom 4 (Floor)",
          42: "Hihat Closed",
          43: "Tom 3",
          44: "Hihat Foot",
          45: "Tom 2",
          46: "Hihat Open",
          47: "Tom 1",
          48: "Crash 1",
          49: "Crash 2",
          50: "Ride Tip",
          51: "Ride Bell",
          52: "China",
          53: "Splash 1",
          54: "Splash 2",
          55: "Crash 3",
          56: "Crash 4",
          57: "Ride Shank",
          // Extended articulations
          24: "Kick Sub",
          25: "Snare Drag",
          26: "Snare Roll",
          27: "Hihat Variable 1",
          28: "Hihat Variable 2",
          29: "Hihat Variable 3",
          30: "Hihat Variable 4",
          31: "Hihat Variable 5",
        },
      },

      // Steven Slate Drums 5
      ssd5: {
        name: "Steven Slate Drums 5.5",
        vendor: "Steven Slate",
        description: "Steven Slate Drums 5.5 mapping",
        mapping: {
          36: "Kick",
          37: "Snare Sidestick",
          38: "Snare",
          39: "Snare Rimshot",
          40: "Snare 2",
          41: "Tom Floor 2",
          42: "Hihat Closed",
          43: "Tom Floor 1",
          44: "Hihat Foot",
          45: "Tom Low",
          46: "Hihat Open",
          47: "Tom Mid",
          48: "Tom High",
          49: "Crash 1",
          50: "Crash 2",
          51: "Ride",
          52: "China",
          53: "Ride Bell",
          54: "Tambourine",
          55: "Splash",
          56: "Cowbell",
          57: "Crash 3",
          59: "Ride Edge",
        },
      },

      // Roland TR-808
      tr808: {
        name: "TR-808",
        vendor: "Roland",
        description: "Roland TR-808 classic drum machine",
        mapping: {
          35: "Bass Drum",
          36: "Bass Drum",
          37: "Rim Shot",
          38: "Snare Drum",
          39: "Hand Clap",
          40: "Snare Drum",
          41: "Low Tom",
          42: "Closed Hi-Hat",
          43: "Low Tom",
          44: "Closed Hi-Hat",
          45: "Mid Tom",
          46: "Open Hi-Hat",
          47: "Mid Tom",
          48: "Hi Tom",
          49: "Cymbal",
          50: "Hi Tom",
          51: "Cymbal",
          56: "Cowbell",
          62: "Hi Conga",
          63: "Mid Conga",
          64: "Low Conga",
          70: "Maracas",
          75: "Claves",
        },
      },

      // Roland TR-909
      tr909: {
        name: "TR-909",
        vendor: "Roland",
        description: "Roland TR-909 classic drum machine",
        mapping: {
          36: "Bass Drum",
          37: "Rim Shot",
          38: "Snare Drum",
          39: "Hand Clap",
          41: "Low Tom",
          42: "Closed Hi-Hat",
          43: "Low Tom",
          45: "Mid Tom",
          46: "Open Hi-Hat",
          47: "Mid Tom",
          48: "Hi Tom",
          49: "Crash Cymbal",
          50: "Hi Tom",
          51: "Ride Cymbal",
        },
      },

      // Arturia Spark 2
      spark2: {
        name: "Spark 2",
        vendor: "Arturia",
        description: "Arturia Spark 2 drum synthesizer",
        mapping: {
          36: "Kick",
          37: "Snare",
          38: "Clap",
          39: "Percussion 1",
          40: "Percussion 2",
          41: "Tom Low",
          42: "Hihat Closed",
          43: "Tom Mid",
          44: "Hihat Open",
          45: "Tom High",
          46: "Cymbal",
          47: "FX 1",
          48: "FX 2",
          49: "FX 3",
          50: "FX 4",
          51: "FX 5",
        },
      },

      // IK Multimedia MODO Drum
      modoDrum: {
        name: "MODO Drum",
        vendor: "IK Multimedia",
        description: "IK Multimedia MODO Drum physical modeling",
        mapping: {
          36: "Kick",
          37: "Snare Cross Stick",
          38: "Snare",
          39: "Snare Rimshot",
          40: "Snare 2",
          41: "Tom Floor Low",
          42: "Hihat Closed",
          43: "Tom Floor High",
          44: "Hihat Pedal",
          45: "Tom Low",
          46: "Hihat Open",
          47: "Tom Mid",
          48: "Tom High",
          49: "Crash 1",
          50: "Tom High 2",
          51: "Ride",
          52: "China",
          53: "Ride Bell",
          55: "Splash",
          57: "Crash 2",
          59: "Ride Edge",
        },
      },

      // GetGood Drums - Modern & Massive
      getGoodDrums: {
        name: "Modern & Massive",
        vendor: "GetGood Drums",
        description: "GetGood Drums Modern & Massive mapping",
        mapping: {
          36: "Kick",
          37: "Snare Sidestick",
          38: "Snare",
          39: "Snare Rimshot",
          40: "Snare Alt",
          41: "Tom 5",
          42: "Hihat Closed",
          43: "Tom 4",
          44: "Hihat Foot",
          45: "Tom 3",
          46: "Hihat Open",
          47: "Tom 2",
          48: "Tom 1",
          49: "Crash 1",
          51: "Ride",
          52: "China",
          53: "Ride Bell",
          55: "Splash",
          57: "Crash 2",
          58: "Crash 3",
          59: "Stack",
        },
      },

      // EastWest ProDrummer
      proDrummer: {
        name: "ProDrummer",
        vendor: "EastWest",
        description: "EastWest ProDrummer mapping",
        mapping: {
          36: "Kick",
          37: "Snare Sidestick",
          38: "Snare",
          39: "Snare Rimshot",
          41: "Tom Floor",
          42: "Hihat Closed",
          43: "Tom Low",
          44: "Hihat Pedal",
          45: "Tom Mid",
          46: "Hihat Open",
          47: "Tom High",
          49: "Crash 1",
          51: "Ride",
          52: "China",
          53: "Ride Bell",
          55: "Splash",
          57: "Crash 2",
        },
      },

      // Spectrasonics Stylus RMX
      stylusRmx: {
        name: "Stylus RMX",
        vendor: "Spectrasonics",
        description: "Spectrasonics Stylus RMX groove mapping",
        mapping: {
          // Stylus RMX uses a unique mapping for groove elements
          36: "Groove Element 1",
          37: "Groove Element 2",
          38: "Groove Element 3",
          39: "Groove Element 4",
          40: "Groove Element 5",
          41: "Groove Element 6",
          42: "Groove Element 7",
          43: "Groove Element 8",
          // Chaos Designer elements
          48: "Chaos 1",
          49: "Chaos 2",
          50: "Chaos 3",
          51: "Chaos 4",
          52: "Chaos 5",
          53: "Chaos 6",
          54: "Chaos 7",
          55: "Chaos 8",
        },
      },
    };
  }

  getPreset(presetId) {
    return this.presets[presetId] || null;
  }

  getAllPresets() {
    return Object.keys(this.presets).map((id) => ({
      id,
      name: this.presets[id].name,
      vendor: this.presets[id].vendor,
      description: this.presets[id].description,
    }));
  }

  getVendorPresets(vendor) {
    return Object.keys(this.presets)
      .filter((id) => this.presets[id].vendor === vendor)
      .map((id) => ({
        id,
        name: this.presets[id].name,
        description: this.presets[id].description,
      }));
  }

  translateNote(sourcePreset, targetPreset, note) {
    const source = this.presets[sourcePreset];
    const target = this.presets[targetPreset];

    if (!source || !target) {
      console.warn("Invalid preset IDs provided");
      return note;
    }

    // Find what drum sound this note represents in the source
    const drumSound = source.mapping[note];
    if (!drumSound) {
      return note; // No mapping found, return original
    }

    // Find corresponding note in target preset
    for (const [targetNote, targetSound] of Object.entries(target.mapping)) {
      if (this.soundsMatch(drumSound, targetSound)) {
        return parseInt(targetNote);
      }
    }

    // No direct match found, try to find closest match
    return this.findClosestMatch(drumSound, target.mapping, note);
  }

  soundsMatch(sound1, sound2) {
    // Normalize and compare drum sound names
    const normalize = (s) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .replace(/drum|cymbal/g, "");

    const n1 = normalize(sound1);
    const n2 = normalize(sound2);

    // Exact match
    if (n1 === n2) return true;

    // Check for common drum types
    const drumTypes = {
      kick: ["kick", "bass", "bd"],
      snare: ["snare", "sd"],
      hihat: ["hihat", "hat", "hh"],
      tom: ["tom"],
      crash: ["crash"],
      ride: ["ride"],
      splash: ["splash"],
      china: ["china", "chinese"],
    };

    for (const [type, aliases] of Object.entries(drumTypes)) {
      const match1 = aliases.some((alias) => n1.includes(alias));
      const match2 = aliases.some((alias) => n2.includes(alias));
      if (match1 && match2) return true;
    }

    return false;
  }

  findClosestMatch(drumSound, targetMapping, originalNote) {
    // Try to find a similar drum type in the target
    const drumCategories = {
      kick: [35, 36],
      snare: [37, 38, 39, 40],
      hihat: [42, 44, 46],
      tom: [41, 43, 45, 47, 48, 50],
      crash: [49, 52, 57],
      ride: [51, 53, 59],
      splash: [55],
    };

    // Determine category of source sound
    let sourceCategory = null;
    const soundLower = drumSound.toLowerCase();

    for (const [category, notes] of Object.entries(drumCategories)) {
      if (
        soundLower.includes(category) ||
        (category === "kick" && soundLower.includes("bass")) ||
        (category === "hihat" && soundLower.includes("hat"))
      ) {
        sourceCategory = category;
        break;
      }
    }

    if (sourceCategory && drumCategories[sourceCategory]) {
      // Find first available note in target that matches category
      for (const note of drumCategories[sourceCategory]) {
        if (targetMapping[note]) {
          return note;
        }
      }
    }

    // If no match found, return original note
    return originalNote;
  }

  exportPreset(presetId) {
    const preset = this.presets[presetId];
    if (!preset) return null;

    return {
      id: presetId,
      ...preset,
      exportDate: new Date().toISOString(),
    };
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = DrumMapPresets;
}
