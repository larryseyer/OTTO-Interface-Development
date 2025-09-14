class DrumMapAdvanced {
  constructor(drumMapManager, sfzEditor, midiTranslator) {
    this.drumMapManager = drumMapManager;
    this.sfzEditor = sfzEditor;
    this.midiTranslator = midiTranslator;

    // Velocity layer management
    this.velocityLayers = new Map();

    // Round-robin sample tracking
    this.roundRobinSamples = new Map();
    this.roundRobinCounters = new Map();

    // A/B comparison mode
    this.comparisonMode = false;
    this.mapA = null;
    this.mapB = null;
    this.activeComparison = "A";

    // MIDI learn state
    this.midiLearnActive = false;
    this.midiLearnCallback = null;
    this.midiInput = null;

    // Sample audition
    this.auditionContext = null;
    this.auditionBuffers = new Map();
  }

  // ==========================================
  // Velocity Layer Management
  // ==========================================

  addVelocityLayer(note, velocityRange, samplePath) {
    if (!this.velocityLayers.has(note)) {
      this.velocityLayers.set(note, []);
    }

    const layers = this.velocityLayers.get(note);

    // Check for overlapping ranges
    const overlap = layers.find(
      (layer) =>
        (velocityRange.min >= layer.min && velocityRange.min <= layer.max) ||
        (velocityRange.max >= layer.min && velocityRange.max <= layer.max),
    );

    if (overlap) {
      console.warn(
        `Velocity range ${velocityRange.min}-${velocityRange.max} overlaps with existing layer`,
      );
      return false;
    }

    layers.push({
      min: velocityRange.min,
      max: velocityRange.max,
      sample: samplePath,
    });

    // Sort layers by min velocity
    layers.sort((a, b) => a.min - b.min);

    // Update SFZ regions
    this.updateSFZVelocityLayers(note, layers);

    return true;
  }

  removeVelocityLayer(note, velocityMin) {
    if (!this.velocityLayers.has(note)) return false;

    const layers = this.velocityLayers.get(note);
    const index = layers.findIndex((layer) => layer.min === velocityMin);

    if (index === -1) return false;

    layers.splice(index, 1);

    if (layers.length === 0) {
      this.velocityLayers.delete(note);
    }

    this.updateSFZVelocityLayers(note, layers);
    return true;
  }

  updateSFZVelocityLayers(note, layers) {
    // Remove existing regions for this note
    this.sfzEditor.removeRegion({ key: note });

    // Add velocity layers to SFZ
    layers.forEach((layer) => {
      this.sfzEditor.addRegion({
        sample: layer.sample,
        key: note,
        lokey: note,
        hikey: note,
        lovel: layer.min,
        hivel: layer.max,
        pitch_keycenter: note,
        loop_mode: "one_shot",
      });
    });
  }

  getVelocityLayers(note) {
    return this.velocityLayers.get(note) || [];
  }

  autoCreateVelocityLayers(note, samples, velocityCurve = "linear") {
    if (!samples || samples.length === 0) return false;

    const layers = [];
    const velocityStep = Math.floor(127 / samples.length);

    samples.forEach((sample, index) => {
      let min = index * velocityStep;
      let max = (index + 1) * velocityStep - 1;

      if (index === samples.length - 1) {
        max = 127; // Ensure last layer goes to 127
      }

      // Apply velocity curve
      if (velocityCurve === "exponential") {
        min = Math.floor(Math.pow(min / 127, 2) * 127);
        max = Math.floor(Math.pow(max / 127, 2) * 127);
      } else if (velocityCurve === "logarithmic") {
        min = Math.floor((Math.log(min + 1) / Math.log(128)) * 127);
        max = Math.floor((Math.log(max + 1) / Math.log(128)) * 127);
      }

      layers.push({
        min: Math.max(0, min),
        max: Math.min(127, max),
        sample: sample,
      });
    });

    this.velocityLayers.set(note, layers);
    this.updateSFZVelocityLayers(note, layers);

    return true;
  }

  // ==========================================
  // Round-Robin Sample Support
  // ==========================================

  addRoundRobinSamples(note, samples) {
    if (!samples || samples.length === 0) return false;

    this.roundRobinSamples.set(note, samples);
    this.roundRobinCounters.set(note, 0);

    // Update SFZ with round-robin regions
    this.sfzEditor.addRoundRobin(note, samples);

    return true;
  }

  getRoundRobinSample(note) {
    const samples = this.roundRobinSamples.get(note);
    if (!samples || samples.length === 0) return null;

    const counter = this.roundRobinCounters.get(note) || 0;
    const sample = samples[counter % samples.length];

    // Increment counter for next time
    this.roundRobinCounters.set(note, counter + 1);

    return sample;
  }

  removeRoundRobin(note) {
    this.roundRobinSamples.delete(note);
    this.roundRobinCounters.delete(note);

    // Remove from SFZ
    this.sfzEditor.removeRegion({ key: note });

    return true;
  }

  // ==========================================
  // A/B Comparison Mode
  // ==========================================

  enableComparisonMode(mapA, mapB) {
    this.comparisonMode = true;
    this.mapA = mapA;
    this.mapB = mapB;
    this.activeComparison = "A";

    // Set initial map
    this.drumMapManager.setActiveMap(mapA.id, mapA.type);

    return true;
  }

  switchComparison() {
    if (!this.comparisonMode) return false;

    if (this.activeComparison === "A") {
      this.activeComparison = "B";
      this.drumMapManager.setActiveMap(this.mapB.id, this.mapB.type);
    } else {
      this.activeComparison = "A";
      this.drumMapManager.setActiveMap(this.mapA.id, this.mapA.type);
    }

    return this.activeComparison;
  }

  disableComparisonMode() {
    this.comparisonMode = false;
    this.mapA = null;
    this.mapB = null;
    this.activeComparison = "A";
    return true;
  }

  getComparisonDifferences() {
    if (!this.mapA || !this.mapB) return null;

    const differences = {
      notesOnlyInA: [],
      notesOnlyInB: [],
      differentMappings: [],
    };

    // Check notes in A
    Object.keys(this.mapA.mapping).forEach((note) => {
      if (!this.mapB.mapping[note]) {
        differences.notesOnlyInA.push(note);
      } else if (
        this.mapA.mapping[note].mixerChannel !==
        this.mapB.mapping[note].mixerChannel
      ) {
        differences.differentMappings.push({
          note,
          channelA: this.mapA.mapping[note].mixerChannel,
          channelB: this.mapB.mapping[note].mixerChannel,
        });
      }
    });

    // Check notes only in B
    Object.keys(this.mapB.mapping).forEach((note) => {
      if (!this.mapA.mapping[note]) {
        differences.notesOnlyInB.push(note);
      }
    });

    return differences;
  }

  // ==========================================
  // MIDI Learn Integration
  // ==========================================

  async initializeMidiLearn() {
    if (!navigator.requestMIDIAccess) {
      console.error("Web MIDI API not supported");
      return false;
    }

    try {
      const midiAccess = await navigator.requestMIDIAccess();

      // Get first available MIDI input
      const inputs = Array.from(midiAccess.inputs.values());
      if (inputs.length > 0) {
        this.midiInput = inputs[0];
        return true;
      }

      console.warn("No MIDI inputs available");
      return false;
    } catch (error) {
      console.error("MIDI access denied:", error);
      return false;
    }
  }

  startMidiLearn(callback) {
    if (!this.midiInput) {
      console.error("MIDI input not initialized");
      return false;
    }

    this.midiLearnActive = true;
    this.midiLearnCallback = callback;

    this.midiInput.onmidimessage = (event) => {
      this.handleMidiMessage(event);
    };

    return true;
  }

  stopMidiLearn() {
    this.midiLearnActive = false;
    this.midiLearnCallback = null;

    if (this.midiInput) {
      this.midiInput.onmidimessage = null;
    }

    return true;
  }

  handleMidiMessage(event) {
    if (!this.midiLearnActive || !this.midiLearnCallback) return;

    const [status, note, velocity] = event.data;

    // Check for Note On message (status 144-159)
    if (status >= 144 && status <= 159 && velocity > 0) {
      this.midiLearnCallback(note, velocity);
    }
  }

  // ==========================================
  // Sample Audition
  // ==========================================

  async initializeAudition() {
    if (!this.auditionContext) {
      this.auditionContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    }
    return true;
  }

  async loadAuditionSample(samplePath) {
    if (this.auditionBuffers.has(samplePath)) {
      return this.auditionBuffers.get(samplePath);
    }

    try {
      const response = await fetch(samplePath);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer =
        await this.auditionContext.decodeAudioData(arrayBuffer);

      this.auditionBuffers.set(samplePath, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.error("Error loading sample:", error);
      return null;
    }
  }

  async auditionNote(note, velocity = 100) {
    if (!this.auditionContext) {
      await this.initializeAudition();
    }

    const currentMap = this.drumMapManager.getCurrentMap();
    if (!currentMap || !currentMap.mapping[note]) {
      console.warn("No mapping for note:", note);
      return false;
    }

    const mapping = currentMap.mapping[note];
    let samplePath = mapping.samplePath;

    // Check for velocity layers
    const velocityLayers = this.getVelocityLayers(note);
    if (velocityLayers.length > 0) {
      const layer = velocityLayers.find(
        (l) => velocity >= l.min && velocity <= l.max,
      );
      if (layer) {
        samplePath = layer.sample;
      }
    }

    // Check for round-robin
    const rrSample = this.getRoundRobinSample(note);
    if (rrSample) {
      samplePath = rrSample;
    }

    // Construct full path
    const fullPath = `/Assets/Drumkits/${currentMap.vendor}/${samplePath}`;

    // Load and play sample
    const buffer = await this.loadAuditionSample(fullPath);
    if (!buffer) return false;

    const source = this.auditionContext.createBufferSource();
    const gainNode = this.auditionContext.createGain();

    source.buffer = buffer;
    gainNode.gain.value = velocity / 127;

    source.connect(gainNode);
    gainNode.connect(this.auditionContext.destination);

    source.start(0);

    return true;
  }

  // ==========================================
  // MIDI File Import
  // ==========================================

  async importMidiFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          const midiData = event.target.result;
          const parsed = await this.midiTranslator.parseMidiFile(midiData);

          // Auto-detect vendor format
          const detectedVendor = parsed.detectedVendor;

          resolve({
            success: true,
            vendor: detectedVendor,
            events: parsed.events,
            analysis: this.midiTranslator.analyzeMidiFile(parsed),
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error("Failed to read MIDI file"));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  translateImportedMidi(midiData, targetVendor = "generalMidi") {
    return this.midiTranslator.translateMidiFile(
      midiData,
      midiData.vendor,
      targetVendor,
    );
  }

  // ==========================================
  // Batch Operations
  // ==========================================

  async batchAssignSamples(assignments) {
    const results = [];

    for (const assignment of assignments) {
      const { note, channel, sample } = assignment;
      const success = this.drumMapManager.assignNoteToChannel(
        note,
        channel,
        sample,
      );

      results.push({
        note,
        channel,
        sample,
        success,
      });
    }

    return results;
  }

  exportCurrentConfiguration() {
    const config = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      currentMap: this.drumMapManager.getCurrentMap(),
      velocityLayers: Array.from(this.velocityLayers.entries()),
      roundRobinSamples: Array.from(this.roundRobinSamples.entries()),
      sfzData: this.sfzEditor.toJSON(),
    };

    return JSON.stringify(config, null, 2);
  }

  importConfiguration(jsonString) {
    try {
      const config = JSON.parse(jsonString);

      // Restore velocity layers
      if (config.velocityLayers) {
        this.velocityLayers = new Map(config.velocityLayers);
      }

      // Restore round-robin samples
      if (config.roundRobinSamples) {
        this.roundRobinSamples = new Map(config.roundRobinSamples);
      }

      // Restore SFZ data
      if (config.sfzData) {
        this.sfzEditor.fromJSON(config.sfzData);
      }

      return true;
    } catch (error) {
      console.error("Error importing configuration:", error);
      return false;
    }
  }

  // ==========================================
  // Utility Functions
  // ==========================================

  analyzeDrumPattern(midiEvents) {
    const analysis = {
      noteFrequency: {},
      velocityDistribution: {},
      timingPatterns: [],
      suggestedMapping: {},
    };

    // Count note frequencies
    midiEvents.forEach((event) => {
      if (event.type === "noteOn") {
        analysis.noteFrequency[event.note] =
          (analysis.noteFrequency[event.note] || 0) + 1;

        if (!analysis.velocityDistribution[event.note]) {
          analysis.velocityDistribution[event.note] = [];
        }
        analysis.velocityDistribution[event.note].push(event.velocity);
      }
    });

    // Suggest channel mappings based on frequency
    const sortedNotes = Object.entries(analysis.noteFrequency).sort(
      (a, b) => b[1] - a[1],
    );

    // Common drum patterns
    const patterns = {
      kick: [35, 36],
      snare: [38, 40],
      hihat: [42, 44, 46],
      ride: [51, 59],
      crash: [49, 57],
    };

    sortedNotes.forEach(([note, count]) => {
      for (const [channel, notes] of Object.entries(patterns)) {
        if (notes.includes(parseInt(note))) {
          analysis.suggestedMapping[note] = channel;
          break;
        }
      }
    });

    return analysis;
  }

  optimizeVelocityLayers(note) {
    const layers = this.velocityLayers.get(note);
    if (!layers || layers.length < 2) return false;

    // Analyze velocity distribution
    const velocityData = [];
    // This would need actual velocity data from played notes
    // For now, we'll create even distribution

    const optimizedLayers = [];
    const layerCount = layers.length;

    for (let i = 0; i < layerCount; i++) {
      const min = Math.floor((i / layerCount) * 127);
      const max = Math.floor(((i + 1) / layerCount) * 127) - 1;

      optimizedLayers.push({
        min: Math.max(0, min),
        max: Math.min(127, max),
        sample: layers[i].sample,
      });
    }

    this.velocityLayers.set(note, optimizedLayers);
    this.updateSFZVelocityLayers(note, optimizedLayers);

    return true;
  }

  generateSFZFromCurrentState() {
    const sfzData = {
      global: {
        loop_mode: "one_shot",
        ampeg_release: 0.5,
      },
      groups: [],
      regions: [],
    };

    const currentMap = this.drumMapManager.getCurrentMap();
    if (!currentMap) return "";

    // Process each mapped note
    Object.entries(currentMap.mapping).forEach(([note, mapping]) => {
      const noteNum = parseInt(note);

      // Check for velocity layers
      const velocityLayers = this.velocityLayers.get(noteNum);
      if (velocityLayers && velocityLayers.length > 0) {
        velocityLayers.forEach((layer) => {
          sfzData.regions.push({
            sample: layer.sample,
            key: noteNum,
            lokey: noteNum,
            hikey: noteNum,
            lovel: layer.min,
            hivel: layer.max,
            pitch_keycenter: noteNum,
          });
        });
      } else if (mapping.samplePath) {
        // Single sample
        sfzData.regions.push({
          sample: mapping.samplePath,
          key: noteNum,
          lokey: noteNum,
          hikey: noteNum,
          pitch_keycenter: noteNum,
        });
      }

      // Check for round-robin
      const rrSamples = this.roundRobinSamples.get(noteNum);
      if (rrSamples && rrSamples.length > 0) {
        rrSamples.forEach((sample, index) => {
          sfzData.regions.push({
            sample: sample,
            key: noteNum,
            lokey: noteNum,
            hikey: noteNum,
            pitch_keycenter: noteNum,
            seq_length: rrSamples.length,
            seq_position: index + 1,
          });
        });
      }
    });

    return this.sfzEditor.generateSFZ(sfzData);
  }

  // Cleanup
  destroy() {
    this.stopMidiLearn();
    if (this.auditionContext) {
      this.auditionContext.close();
    }
    this.velocityLayers.clear();
    this.roundRobinSamples.clear();
    this.roundRobinCounters.clear();
    this.auditionBuffers.clear();
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = DrumMapAdvanced;
}
