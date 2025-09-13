class MidiTranslator {
  constructor(drumMapManager, drumMapPresets) {
    this.drumMapManager = drumMapManager;
    this.drumMapPresets = drumMapPresets || new DrumMapPresets();
    this.translationCache = new Map();
    this.detectedVendor = null;
  }

  // Parse MIDI file and detect vendor format
  async parseMidiFile(midiData) {
    // This would typically use a MIDI parsing library
    // For now, we'll create a structure that represents parsed MIDI data
    const midiEvents = this.extractMidiEvents(midiData);
    const vendor = this.detectVendorFormat(midiEvents);

    return {
      events: midiEvents,
      detectedVendor: vendor,
      tempo: this.extractTempo(midiData),
      timeSignature: this.extractTimeSignature(midiData),
      duration: this.calculateDuration(midiEvents)
    };
  }

  // Extract MIDI events from raw data
  extractMidiEvents(midiData) {
    // Simplified MIDI event extraction
    // In production, use a proper MIDI parser library
    const events = [];

    // Mock structure for MIDI events
    // Real implementation would parse actual MIDI binary data
    return events;
  }

  // Detect vendor format based on note patterns
  detectVendorFormat(midiEvents) {
    const noteUsage = {};
    const notePatterns = new Map();

    // Count note usage
    midiEvents.forEach(event => {
      if (event.type === 'noteOn') {
        noteUsage[event.note] = (noteUsage[event.note] || 0) + 1;
      }
    });

    // Analyze patterns for vendor detection
    const vendors = [
      {
        id: 'generalMidi',
        confidence: 0,
        keyNotes: [36, 38, 42, 46, 49, 51] // Kick, snare, closed/open hats, crash, ride
      },
      {
        id: 'addictiveDrums2',
        confidence: 0,
        keyNotes: [36, 38, 42, 46, 22, 23, 24] // Includes extended hihat articulations
      },
      {
        id: 'superiorDrummer3',
        confidence: 0,
        keyNotes: [35, 36, 38, 20, 21, 22] // Dual kick, extended hihats
      },
      {
        id: 'battery4',
        confidence: 0,
        keyNotes: Array.from({length: 16}, (_, i) => 36 + i) // Sequential pad layout
      },
      {
        id: 'bfd3',
        confidence: 0,
        keyNotes: [36, 38, 24, 25, 26, 27] // Extended articulations
      },
      {
        id: 'tr808',
        confidence: 0,
        keyNotes: [35, 36, 37, 38, 39, 56] // Classic 808 notes including cowbell
      },
      {
        id: 'tr909',
        confidence: 0,
        keyNotes: [36, 37, 38, 39, 41, 42] // Classic 909 layout
      }
    ];

    // Calculate confidence scores
    vendors.forEach(vendor => {
      let matches = 0;
      let totalNotes = 0;

      vendor.keyNotes.forEach(note => {
        if (noteUsage[note]) {
          matches++;
          totalNotes += noteUsage[note];
        }
      });

      // Calculate confidence based on matches and usage
      if (vendor.keyNotes.length > 0) {
        vendor.confidence = (matches / vendor.keyNotes.length) * 100;

        // Boost confidence if high usage of key notes
        if (totalNotes > Object.values(noteUsage).reduce((a, b) => a + b, 0) * 0.5) {
          vendor.confidence += 20;
        }
      }
    });

    // Sort by confidence and return best match
    vendors.sort((a, b) => b.confidence - a.confidence);

    if (vendors[0].confidence > 60) {
      this.detectedVendor = vendors[0].id;
      return {
        vendor: vendors[0].id,
        confidence: vendors[0].confidence,
        alternatives: vendors.slice(1, 3).map(v => ({
          vendor: v.id,
          confidence: v.confidence
        }))
      };
    }

    // Default to General MIDI if no strong match
    return {
      vendor: 'generalMidi',
      confidence: 50,
      alternatives: vendors.slice(0, 2).map(v => ({
        vendor: v.id,
        confidence: v.confidence
      }))
    };
  }

  // Translate MIDI file from source to target format
  translateMidiFile(midiData, sourceVendor, targetVendor = 'generalMidi') {
    const parsedMidi = typeof midiData === 'object' ? midiData : this.parseMidiFile(midiData);
    const translatedEvents = [];

    // Use detected vendor if not specified
    if (!sourceVendor && parsedMidi.detectedVendor) {
      sourceVendor = parsedMidi.detectedVendor.vendor || parsedMidi.detectedVendor;
    }

    // Get translation map
    const translationMap = this.getTranslationMap(sourceVendor, targetVendor);

    // Translate each event
    parsedMidi.events.forEach(event => {
      if (event.type === 'noteOn' || event.type === 'noteOff') {
        const translatedNote = translationMap[event.note] || event.note;
        translatedEvents.push({
          ...event,
          note: translatedNote,
          originalNote: event.note
        });
      } else {
        // Non-note events pass through unchanged
        translatedEvents.push(event);
      }
    });

    return {
      ...parsedMidi,
      events: translatedEvents,
      sourceVendor,
      targetVendor,
      translationMap
    };
  }

  // Get or create translation map between vendors
  getTranslationMap(sourceVendor, targetVendor) {
    const cacheKey = `${sourceVendor}->${targetVendor}`;

    if (this.translationCache.has(cacheKey)) {
      return this.translationCache.get(cacheKey);
    }

    const map = {};
    const sourcePreset = this.drumMapPresets.getPreset(sourceVendor);
    const targetPreset = this.drumMapPresets.getPreset(targetVendor);

    if (!sourcePreset || !targetPreset) {
      console.warn(`Missing preset for ${sourceVendor} or ${targetVendor}`);
      // Return identity map
      for (let i = 0; i < 128; i++) {
        map[i] = i;
      }
      return map;
    }

    // Build translation map
    for (let note = 0; note < 128; note++) {
      map[note] = this.drumMapPresets.translateNote(sourceVendor, targetVendor, note);
    }

    this.translationCache.set(cacheKey, map);
    return map;
  }

  // Translate real-time MIDI input
  translateRealtimeNote(note, velocity, sourceVendor = null) {
    if (!sourceVendor) {
      sourceVendor = this.detectedVendor || 'generalMidi';
    }

    const currentMap = this.drumMapManager.getCurrentMap();
    if (!currentMap) {
      return { note, velocity };
    }

    // Get translation for current drum map
    const targetVendor = currentMap.vendor === 'OTTO' ? 'generalMidi' : currentMap.id;
    const translationMap = this.getTranslationMap(sourceVendor, targetVendor);

    return {
      note: translationMap[note] || note,
      velocity,
      originalNote: note,
      sourceVendor,
      targetVendor
    };
  }

  // Create MIDI file from events
  createMidiFile(events, options = {}) {
    // This would use a MIDI writing library in production
    // For now, return a structure representing MIDI file
    return {
      format: options.format || 1,
      ticksPerQuarter: options.ticksPerQuarter || 480,
      tracks: [
        {
          name: options.trackName || 'Drums',
          events: events
        }
      ],
      tempo: options.tempo || 120,
      timeSignature: options.timeSignature || '4/4'
    };
  }

  // Extract tempo from MIDI data
  extractTempo(midiData) {
    // Simplified tempo extraction
    // Real implementation would parse tempo meta events
    return 120; // Default BPM
  }

  // Extract time signature from MIDI data
  extractTimeSignature(midiData) {
    // Simplified time signature extraction
    // Real implementation would parse time signature meta events
    return '4/4';
  }

  // Calculate duration of MIDI events
  calculateDuration(events) {
    if (!events || events.length === 0) return 0;

    let maxTime = 0;
    events.forEach(event => {
      if (event.time > maxTime) {
        maxTime = event.time;
      }
    });

    return maxTime;
  }

  // Analyze MIDI file for statistics
  analyzeMidiFile(midiData) {
    const parsedMidi = typeof midiData === 'object' ? midiData : this.parseMidiFile(midiData);
    const analysis = {
      noteCount: {},
      velocityRange: { min: 127, max: 0 },
      duration: 0,
      uniqueNotes: new Set(),
      dynamics: {
        pp: 0,  // 0-31
        p: 0,   // 32-63
        mf: 0,  // 64-95
        f: 0,   // 96-127
      },
      articulations: {},
      tempo: parsedMidi.tempo,
      timeSignature: parsedMidi.timeSignature
    };

    parsedMidi.events.forEach(event => {
      if (event.type === 'noteOn') {
        // Count notes
        analysis.noteCount[event.note] = (analysis.noteCount[event.note] || 0) + 1;
        analysis.uniqueNotes.add(event.note);

        // Track velocity range
        if (event.velocity < analysis.velocityRange.min) {
          analysis.velocityRange.min = event.velocity;
        }
        if (event.velocity > analysis.velocityRange.max) {
          analysis.velocityRange.max = event.velocity;
        }

        // Categorize dynamics
        if (event.velocity < 32) analysis.dynamics.pp++;
        else if (event.velocity < 64) analysis.dynamics.p++;
        else if (event.velocity < 96) analysis.dynamics.mf++;
        else analysis.dynamics.f++;
      }
    });

    analysis.duration = this.calculateDuration(parsedMidi.events);
    analysis.noteRange = {
      lowest: Math.min(...analysis.uniqueNotes),
      highest: Math.max(...analysis.uniqueNotes)
    };

    return analysis;
  }

  // Convert MIDI events to pattern grid format
  convertToPatternGrid(midiEvents, resolution = 16) {
    const grid = {};
    const quantize = (time, resolution) => Math.round(time * resolution) / resolution;

    midiEvents.forEach(event => {
      if (event.type === 'noteOn') {
        const step = quantize(event.time, resolution);
        if (!grid[step]) {
          grid[step] = [];
        }
        grid[step].push({
          note: event.note,
          velocity: event.velocity,
          duration: event.duration || 0.1
        });
      }
    });

    return grid;
  }

  // Batch translate multiple MIDI files
  async batchTranslate(files, sourceVendor, targetVendor) {
    const results = [];

    for (const file of files) {
      try {
        const translated = await this.translateMidiFile(
          file.data,
          sourceVendor || file.vendor,
          targetVendor
        );

        results.push({
          filename: file.name,
          success: true,
          data: translated
        });
      } catch (error) {
        results.push({
          filename: file.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  // Get vendor compatibility report
  getVendorCompatibility(sourceVendor, targetVendor) {
    const sourcePreset = this.drumMapPresets.getPreset(sourceVendor);
    const targetPreset = this.drumMapPresets.getPreset(targetVendor);

    if (!sourcePreset || !targetPreset) {
      return { compatible: false, reason: 'Missing preset data' };
    }

    const report = {
      compatible: true,
      coverage: 0,
      missingMappings: [],
      recommendations: []
    };

    // Check coverage
    let mapped = 0;
    let total = 0;

    Object.keys(sourcePreset.mapping).forEach(note => {
      total++;
      const translated = this.drumMapPresets.translateNote(sourceVendor, targetVendor, parseInt(note));
      if (translated !== parseInt(note)) {
        mapped++;
      } else {
        report.missingMappings.push({
          note: parseInt(note),
          sound: sourcePreset.mapping[note]
        });
      }
    });

    report.coverage = total > 0 ? (mapped / total) * 100 : 0;

    // Add recommendations
    if (report.coverage < 50) {
      report.recommendations.push('Consider using General MIDI as intermediate format');
    }
    if (report.missingMappings.length > 10) {
      report.recommendations.push('Manual mapping may be required for some sounds');
    }

    return report;
  }

  // Clear translation cache
  clearCache() {
    this.translationCache.clear();
    this.detectedVendor = null;
  }

  // Export translation map as JSON
  exportTranslationMap(sourceVendor, targetVendor) {
    const map = this.getTranslationMap(sourceVendor, targetVendor);
    return JSON.stringify({
      source: sourceVendor,
      target: targetVendor,
      created: new Date().toISOString(),
      mappings: map
    }, null, 2);
  }

  // Import custom translation map
  importTranslationMap(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      const cacheKey = `${data.source}->${data.target}`;
      this.translationCache.set(cacheKey, data.mappings);
      return true;
    } catch (error) {
      console.error('Error importing translation map:', error);
      return false;
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MidiTranslator;
}