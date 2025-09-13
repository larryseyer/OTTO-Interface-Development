class DrumMapManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.currentMap = null;
    this.customMaps = new Map();
    this.factoryMaps = new Map();
    this.activeKitName = null;
    this.listeners = new Set();

    // OTTO standard mixer channels
    this.standardChannels = [
      'kick', 'snare', 'sideStick', 'hihat',
      'tom1', 'tom2', 'tom3', 'tom4', 'tom5',
      'crash1', 'crash2', 'crash3',
      'ride', 'bell', 'splash'
    ];

    // Channel colors for UI
    this.channelColors = {
      kick: '#FF3030',
      snare: '#30FF30',
      sideStick: '#90EE90',
      hihat: '#3030FF',
      tom1: '#FF9030',
      tom2: '#FFA030',
      tom3: '#FFB030',
      tom4: '#FFC030',
      tom5: '#FFD030',
      crash1: '#FF30FF',
      crash2: '#FF50FF',
      crash3: '#FF70FF',
      ride: '#30FFFF',
      bell: '#FFFF30',
      splash: '#90FF90'
    };

    this.initialize();
  }

  async initialize() {
    // Load factory presets
    await this.loadFactoryMaps();

    // Load user custom maps from storage
    this.loadCustomMaps();

    // Set default map (General MIDI)
    this.setActiveMap('generalMidi', 'factory');
  }

  async loadFactoryMaps() {
    try {
      // Load the factory map index
      const response = await fetch('/Assets/DrumMaps/factory/index.json');
      if (response.ok) {
        const index = await response.json();

        // Load each factory map
        for (const mapId of index.maps) {
          const mapResponse = await fetch(`/Assets/DrumMaps/factory/${mapId}.json`);
          if (mapResponse.ok) {
            const mapData = await mapResponse.json();
            this.factoryMaps.set(mapId, mapData);
          }
        }
      }
    } catch (error) {
      console.warn('Could not load factory drum maps:', error);
      // Fall back to built-in General MIDI
      this.factoryMaps.set('generalMidi', this.getGeneralMidiMap());
    }
  }

  loadCustomMaps() {
    const stored = this.storageManager.get('customDrumMaps');
    if (stored) {
      try {
        const maps = JSON.parse(stored);
        Object.entries(maps).forEach(([id, map]) => {
          this.customMaps.set(id, map);
        });
      } catch (error) {
        console.error('Error loading custom drum maps:', error);
      }
    }
  }

  saveCustomMaps() {
    const maps = {};
    this.customMaps.forEach((map, id) => {
      maps[id] = map;
    });
    this.storageManager.set('customDrumMaps', JSON.stringify(maps));
  }

  getGeneralMidiMap() {
    return {
      name: 'General MIDI',
      version: '1.0',
      vendor: 'MIDI Standard',
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      mapping: {
        35: { samplePath: 'kick2.wav', mixerChannel: 'kick', articulation: 'acoustic' },
        36: { samplePath: 'kick.wav', mixerChannel: 'kick', articulation: 'main' },
        37: { samplePath: 'sidestick.wav', mixerChannel: 'sideStick', articulation: 'main' },
        38: { samplePath: 'snare.wav', mixerChannel: 'snare', articulation: 'main' },
        39: { samplePath: 'clap.wav', mixerChannel: 'snare', articulation: 'clap' },
        40: { samplePath: 'snare2.wav', mixerChannel: 'snare', articulation: 'electric' },
        41: { samplePath: 'tom_low2.wav', mixerChannel: 'tom5', articulation: 'main' },
        42: { samplePath: 'hihat_closed.wav', mixerChannel: 'hihat', articulation: 'closed' },
        43: { samplePath: 'tom_low.wav', mixerChannel: 'tom4', articulation: 'main' },
        44: { samplePath: 'hihat_pedal.wav', mixerChannel: 'hihat', articulation: 'pedal' },
        45: { samplePath: 'tom_mid2.wav', mixerChannel: 'tom3', articulation: 'main' },
        46: { samplePath: 'hihat_open.wav', mixerChannel: 'hihat', articulation: 'open' },
        47: { samplePath: 'tom_mid.wav', mixerChannel: 'tom2', articulation: 'main' },
        48: { samplePath: 'tom_high2.wav', mixerChannel: 'tom2', articulation: 'high' },
        49: { samplePath: 'crash.wav', mixerChannel: 'crash1', articulation: 'main' },
        50: { samplePath: 'tom_high.wav', mixerChannel: 'tom1', articulation: 'main' },
        51: { samplePath: 'ride.wav', mixerChannel: 'ride', articulation: 'main' },
        52: { samplePath: 'crash2.wav', mixerChannel: 'crash2', articulation: 'chinese' },
        53: { samplePath: 'ride_bell.wav', mixerChannel: 'bell', articulation: 'main' },
        54: { samplePath: 'tambourine.wav', mixerChannel: 'splash', articulation: 'tambourine' },
        55: { samplePath: 'splash.wav', mixerChannel: 'splash', articulation: 'main' },
        56: { samplePath: 'cowbell.wav', mixerChannel: 'bell', articulation: 'cowbell' },
        57: { samplePath: 'crash3.wav', mixerChannel: 'crash3', articulation: 'main' },
        59: { samplePath: 'ride2.wav', mixerChannel: 'ride', articulation: 'ride2' }
      },
      mixerChannels: {
        kick: { notes: [35, 36], color: '#FF3030', defaultLevel: 75, defaultPan: 0 },
        snare: { notes: [37, 38, 39, 40], color: '#30FF30', defaultLevel: 70, defaultPan: 0 },
        sideStick: { notes: [37], color: '#90EE90', defaultLevel: 60, defaultPan: -10 },
        hihat: { notes: [42, 44, 46], color: '#3030FF', defaultLevel: 65, defaultPan: 20 },
        tom1: { notes: [50], color: '#FF9030', defaultLevel: 70, defaultPan: -30 },
        tom2: { notes: [47, 48], color: '#FFA030', defaultLevel: 70, defaultPan: -15 },
        tom3: { notes: [45], color: '#FFB030', defaultLevel: 70, defaultPan: 0 },
        tom4: { notes: [43], color: '#FFC030', defaultLevel: 70, defaultPan: 15 },
        tom5: { notes: [41], color: '#FFD030', defaultLevel: 70, defaultPan: 30 },
        crash1: { notes: [49], color: '#FF30FF', defaultLevel: 80, defaultPan: -40 },
        crash2: { notes: [52], color: '#FF50FF', defaultLevel: 80, defaultPan: 40 },
        crash3: { notes: [57], color: '#FF70FF', defaultLevel: 80, defaultPan: 0 },
        ride: { notes: [51, 59], color: '#30FFFF', defaultLevel: 70, defaultPan: 35 },
        bell: { notes: [53, 56], color: '#FFFF30', defaultLevel: 65, defaultPan: 10 },
        splash: { notes: [54, 55], color: '#90FF90', defaultLevel: 75, defaultPan: -20 }
      },
      metadata: {
        description: 'Standard General MIDI drum mapping',
        author: 'MIDI Manufacturers Association',
        tags: ['standard', 'gm', 'general midi', 'default']
      }
    };
  }

  setActiveMap(mapId, type = 'factory') {
    const map = type === 'factory' ? this.factoryMaps.get(mapId) : this.customMaps.get(mapId);
    if (map) {
      this.currentMap = { ...map, id: mapId, type };
      this.notifyListeners('mapChanged', this.currentMap);
      return true;
    }
    return false;
  }

  getCurrentMap() {
    return this.currentMap;
  }

  createCustomMap(name, baseMapId = null) {
    const id = `custom_${Date.now()}`;
    let newMap;

    if (baseMapId) {
      // Clone from existing map
      const baseMap = this.factoryMaps.get(baseMapId) || this.customMaps.get(baseMapId);
      if (baseMap) {
        newMap = JSON.parse(JSON.stringify(baseMap));
        newMap.name = name;
        newMap.vendor = 'User';
        newMap.created = new Date().toISOString();
        newMap.modified = new Date().toISOString();
      }
    }

    if (!newMap) {
      // Create blank map
      newMap = {
        name,
        version: '1.0',
        vendor: 'User',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        mapping: {},
        mixerChannels: this.getEmptyChannelMap(),
        metadata: {
          description: `Custom drum map created by user`,
          author: 'User',
          tags: ['custom', 'user']
        }
      };
    }

    this.customMaps.set(id, newMap);
    this.saveCustomMaps();
    this.notifyListeners('mapCreated', { id, map: newMap });
    return id;
  }

  updateCustomMap(mapId, updates) {
    const map = this.customMaps.get(mapId);
    if (map) {
      Object.assign(map, updates);
      map.modified = new Date().toISOString();
      this.saveCustomMaps();

      if (this.currentMap && this.currentMap.id === mapId) {
        this.currentMap = { ...map, id: mapId, type: 'custom' };
      }

      this.notifyListeners('mapUpdated', { id: mapId, map });
      return true;
    }
    return false;
  }

  deleteCustomMap(mapId) {
    if (this.customMaps.has(mapId)) {
      this.customMaps.delete(mapId);
      this.saveCustomMaps();

      // If deleted map was active, switch to General MIDI
      if (this.currentMap && this.currentMap.id === mapId) {
        this.setActiveMap('generalMidi', 'factory');
      }

      this.notifyListeners('mapDeleted', mapId);
      return true;
    }
    return false;
  }

  assignNoteToChannel(note, channel, samplePath = null) {
    if (!this.currentMap || this.currentMap.type !== 'custom') {
      console.warn('Can only edit custom maps');
      return false;
    }

    if (!this.standardChannels.includes(channel)) {
      console.warn('Invalid channel:', channel);
      return false;
    }

    // Update mapping
    if (!this.currentMap.mapping[note]) {
      this.currentMap.mapping[note] = {};
    }

    this.currentMap.mapping[note].mixerChannel = channel;
    if (samplePath) {
      this.currentMap.mapping[note].samplePath = samplePath;
    }

    // Update channel notes array
    this.updateChannelNotes();

    // Save changes
    this.updateCustomMap(this.currentMap.id, this.currentMap);
    this.notifyListeners('noteAssigned', { note, channel, samplePath });

    return true;
  }

  removeNoteAssignment(note) {
    if (!this.currentMap || this.currentMap.type !== 'custom') {
      console.warn('Can only edit custom maps');
      return false;
    }

    delete this.currentMap.mapping[note];
    this.updateChannelNotes();
    this.updateCustomMap(this.currentMap.id, this.currentMap);
    this.notifyListeners('noteRemoved', note);

    return true;
  }

  updateChannelNotes() {
    if (!this.currentMap) return;

    // Reset all channel notes arrays
    Object.keys(this.currentMap.mixerChannels).forEach(channel => {
      this.currentMap.mixerChannels[channel].notes = [];
    });

    // Rebuild from mapping
    Object.entries(this.currentMap.mapping).forEach(([note, data]) => {
      const channel = data.mixerChannel;
      if (channel && this.currentMap.mixerChannels[channel]) {
        this.currentMap.mixerChannels[channel].notes.push(parseInt(note));
      }
    });
  }

  getEmptyChannelMap() {
    const channels = {};
    this.standardChannels.forEach(channel => {
      channels[channel] = {
        notes: [],
        color: this.channelColors[channel] || '#808080',
        defaultLevel: 70,
        defaultPan: 0
      };
    });
    return channels;
  }

  getAllMaps() {
    const maps = [];

    // Add factory maps
    this.factoryMaps.forEach((map, id) => {
      maps.push({
        id,
        name: map.name,
        vendor: map.vendor,
        type: 'factory',
        editable: false
      });
    });

    // Add custom maps
    this.customMaps.forEach((map, id) => {
      maps.push({
        id,
        name: map.name,
        vendor: map.vendor,
        type: 'custom',
        editable: true
      });
    });

    return maps;
  }

  exportMap(mapId, type = 'custom') {
    const map = type === 'factory' ? this.factoryMaps.get(mapId) : this.customMaps.get(mapId);
    if (map) {
      return JSON.stringify(map, null, 2);
    }
    return null;
  }

  importMap(jsonString) {
    try {
      const map = JSON.parse(jsonString);
      const id = this.createCustomMap(map.name + ' (Imported)');
      this.updateCustomMap(id, map);
      return id;
    } catch (error) {
      console.error('Error importing drum map:', error);
      return null;
    }
  }

  getMidiNoteInfo(note) {
    const noteNames = [
      'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
    ];
    const octave = Math.floor(note / 12) - 1;
    const noteName = noteNames[note % 12];
    return {
      number: note,
      name: `${noteName}${octave}`,
      frequency: 440 * Math.pow(2, (note - 69) / 12)
    };
  }

  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in drum map listener:', error);
      }
    });
  }

  destroy() {
    this.listeners.clear();
    this.currentMap = null;
    this.customMaps.clear();
    this.factoryMaps.clear();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DrumMapManager;
}