/**
 * MessageProtocol.js
 * Defines the message protocol and data structures for JUCE communication
 * Phase 6 Implementation
 */

class MessageProtocol {
  constructor() {
    // Protocol version
    this.VERSION = "1.0.0";

    // Message structure definitions
    this.schemas = {
      // Base message structure
      message: {
        id: "number", // Unique message ID
        type: "string", // Message type
        data: "object", // Message payload
        timestamp: "number", // Unix timestamp
      },

      // Player state structure
      playerState: {
        playerNumber: "number",
        presetName: "string",
        kitName: "string",
        patternGroup: "string",
        selectedPattern: "string",
        muted: "boolean",
        toggleStates: "object",
        fillStates: "object",
        sliderValues: "object",
      },

      // Pattern data structure
      pattern: {
        name: "string",
        steps: "array", // Array of step data
        length: "number", // Pattern length in steps
        swing: "number", // Swing amount
        velocity: "array", // Per-step velocities
      },

      // Kit data structure
      kit: {
        name: "string",
        samples: "array", // Array of sample paths
        volumes: "array", // Per-sample volumes
        pans: "array", // Per-sample pan values
        settings: "object", // Additional kit settings
      },

      // Parameter change structure
      parameterChange: {
        player: "number",
        parameter: "string",
        value: "any",
        normalized: "number", // 0-1 normalized value
      },

      // Audio level structure
      audioLevel: {
        player: "number",
        channel: "number",
        peak: "number", // Peak level (0-1)
        rms: "number", // RMS level (0-1)
        clip: "boolean", // Clipping indicator
      },

      // MIDI event structure
      midiEvent: {
        type: "string", // note_on, note_off, cc, etc.
        channel: "number",
        note: "number",
        velocity: "number",
        timestamp: "number",
      },
    };

    // Command definitions
    this.commands = {
      // Transport commands
      PLAY: "transport.play",
      PAUSE: "transport.pause",
      STOP: "transport.stop",
      RECORD: "transport.record",
      LOOP: "transport.loop",

      // Player commands
      SELECT_PLAYER: "player.select",
      MUTE_PLAYER: "player.mute",
      SOLO_PLAYER: "player.solo",

      // Pattern commands
      SELECT_PATTERN: "pattern.select",
      EDIT_PATTERN: "pattern.edit",
      CLEAR_PATTERN: "pattern.clear",
      COPY_PATTERN: "pattern.copy",
      PASTE_PATTERN: "pattern.paste",

      // Kit commands
      LOAD_KIT: "kit.load",
      SAVE_KIT: "kit.save",
      EDIT_KIT: "kit.edit",

      // Preset commands
      LOAD_PRESET: "preset.load",
      SAVE_PRESET: "preset.save",
      DELETE_PRESET: "preset.delete",
      RENAME_PRESET: "preset.rename",

      // System commands
      GET_STATE: "system.getState",
      SET_STATE: "system.setState",
      RESET: "system.reset",
      SHUTDOWN: "system.shutdown",
    };

    // Event types from JUCE
    this.events = {
      // State events
      STATE_CHANGED: "state.changed",
      PRESET_LOADED: "preset.loaded",
      PRESET_SAVED: "preset.saved",

      // Audio events
      AUDIO_STARTED: "audio.started",
      AUDIO_STOPPED: "audio.stopped",
      BUFFER_UNDERRUN: "audio.bufferUnderrun",

      // MIDI events
      MIDI_RECEIVED: "midi.received",
      MIDI_DEVICE_CONNECTED: "midi.deviceConnected",
      MIDI_DEVICE_DISCONNECTED: "midi.deviceDisconnected",

      // Error events
      ERROR_OCCURRED: "error.occurred",
      WARNING_RAISED: "warning.raised",

      // System events
      READY: "system.ready",
      SHUTTING_DOWN: "system.shuttingDown",
    };

    // Error codes
    this.errorCodes = {
      SUCCESS: 0,
      INVALID_MESSAGE: 1001,
      INVALID_PARAMETER: 1002,
      INVALID_PLAYER: 1003,
      PRESET_NOT_FOUND: 2001,
      PRESET_SAVE_FAILED: 2002,
      KIT_NOT_FOUND: 2003,
      PATTERN_NOT_FOUND: 2004,
      AUDIO_INIT_FAILED: 3001,
      MIDI_INIT_FAILED: 3002,
      FILE_NOT_FOUND: 4001,
      FILE_READ_ERROR: 4002,
      FILE_WRITE_ERROR: 4003,
      MEMORY_ERROR: 5001,
      UNKNOWN_ERROR: 9999,
    };
  }

  /**
   * Create a message
   */
  createMessage(type, data = {}) {
    return {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      version: this.VERSION,
    };
  }

  /**
   * Create a command message
   */
  createCommand(command, params = {}) {
    return this.createMessage("command", {
      command,
      params,
    });
  }

  /**
   * Create a response message
   */
  createResponse(requestId, data = {}, error = null) {
    return {
      id: this.generateId(),
      requestId,
      type: "response",
      data,
      error,
      timestamp: Date.now(),
      version: this.VERSION,
    };
  }

  /**
   * Create an event message
   */
  createEvent(event, data = {}) {
    return this.createMessage("event", {
      event,
      data,
    });
  }

  /**
   * Create an error message
   */
  createError(code, message, details = {}) {
    return {
      id: this.generateId(),
      type: "error",
      error: {
        code,
        message,
        details,
      },
      timestamp: Date.now(),
      version: this.VERSION,
    };
  }

  /**
   * Validate message structure
   */
  validateMessage(message) {
    if (!message || typeof message !== "object") {
      return { valid: false, error: "Invalid message format" };
    }

    if (!message.id || !message.type || !message.timestamp) {
      return { valid: false, error: "Missing required fields" };
    }

    if (message.version && !this.isCompatibleVersion(message.version)) {
      return { valid: false, error: "Incompatible protocol version" };
    }

    return { valid: true };
  }

  /**
   * Serialize message for transmission
   */
  serialize(message) {
    try {
      return JSON.stringify(message);
    } catch (error) {
      console.error("Failed to serialize message:", error);
      return null;
    }
  }

  /**
   * Deserialize received message
   */
  deserialize(data) {
    try {
      if (typeof data === "string") {
        return JSON.parse(data);
      }
      return data;
    } catch (error) {
      console.error("Failed to deserialize message:", error);
      return null;
    }
  }

  /**
   * Generate unique message ID
   */
  generateId() {
    return Date.now() * 1000 + Math.floor(Math.random() * 1000);
  }

  /**
   * Check version compatibility
   */
  isCompatibleVersion(version) {
    const [major] = version.split(".");
    const [ourMajor] = this.VERSION.split(".");
    return major === ourMajor;
  }

  /**
   * Encode binary data for transmission
   */
  encodeBinary(data) {
    // Convert ArrayBuffer to base64 for JSON transmission
    if (data instanceof ArrayBuffer) {
      const bytes = new Uint8Array(data);
      let binary = "";
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
    return data;
  }

  /**
   * Decode binary data from transmission
   */
  decodeBinary(encoded) {
    try {
      const binary = atob(encoded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    } catch (error) {
      console.error("Failed to decode binary data:", error);
      return null;
    }
  }

  /**
   * Create batch message for multiple operations
   */
  createBatch(messages) {
    return this.createMessage("batch", {
      messages,
      count: messages.length,
    });
  }

  /**
   * Extract messages from batch
   */
  extractBatch(batchMessage) {
    if (batchMessage.type !== "batch" || !batchMessage.data.messages) {
      return [];
    }
    return batchMessage.data.messages;
  }

  /**
   * Create state snapshot message
   */
  createStateSnapshot(state) {
    return this.createMessage("state_snapshot", {
      players: state.players,
      patterns: state.patterns,
      kits: state.kits,
      presets: state.presets,
      settings: state.settings,
      timestamp: Date.now(),
    });
  }

  /**
   * Create delta update message
   */
  createDeltaUpdate(changes) {
    return this.createMessage("delta_update", {
      changes,
      timestamp: Date.now(),
    });
  }

  /**
   * Get error message for code
   */
  getErrorMessage(code) {
    const messages = {
      [this.errorCodes.INVALID_MESSAGE]: "Invalid message format",
      [this.errorCodes.INVALID_PARAMETER]: "Invalid parameter value",
      [this.errorCodes.INVALID_PLAYER]: "Invalid player number",
      [this.errorCodes.PRESET_NOT_FOUND]: "Preset not found",
      [this.errorCodes.PRESET_SAVE_FAILED]: "Failed to save preset",
      [this.errorCodes.KIT_NOT_FOUND]: "Kit not found",
      [this.errorCodes.PATTERN_NOT_FOUND]: "Pattern not found",
      [this.errorCodes.AUDIO_INIT_FAILED]: "Audio initialization failed",
      [this.errorCodes.MIDI_INIT_FAILED]: "MIDI initialization failed",
      [this.errorCodes.FILE_NOT_FOUND]: "File not found",
      [this.errorCodes.FILE_READ_ERROR]: "File read error",
      [this.errorCodes.FILE_WRITE_ERROR]: "File write error",
      [this.errorCodes.MEMORY_ERROR]: "Memory allocation error",
      [this.errorCodes.UNKNOWN_ERROR]: "Unknown error occurred",
    };

    return messages[code] || "Unknown error";
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = MessageProtocol;
}
