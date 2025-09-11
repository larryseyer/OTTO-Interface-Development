/**
 * JUCEBridge.js
 * Bridge interface for communication between HTML UI and JUCE C++ backend
 * Phase 6 Implementation
 */

class JUCEBridge {
  constructor() {
    // Message queue for buffering
    this.messageQueue = [];
    this.isConnected = false;
    this.pendingCallbacks = new Map();
    this.callbackId = 0;

    // Message types
    this.MessageTypes = {
      // UI to JUCE
      UI_READY: "ui_ready",
      STATE_CHANGE: "state_change",
      PRESET_LOAD: "preset_load",
      PRESET_SAVE: "preset_save",
      PATTERN_CHANGE: "pattern_change",
      KIT_CHANGE: "kit_change",
      TRANSPORT_CONTROL: "transport_control",
      PARAMETER_CHANGE: "parameter_change",
      WINDOW_EVENT: "window_event",

      // JUCE to UI
      ENGINE_STATE: "engine_state",
      AUDIO_LEVELS: "audio_levels",
      MIDI_EVENT: "midi_event",
      PRESET_LIST: "preset_list",
      ERROR: "error",
      ACK: "acknowledge",
    };

    // Protocol version for compatibility checking
    this.protocolVersion = "1.0.0";

    // Performance monitoring
    this.metrics = {
      messagesSent: 0,
      messagesReceived: 0,
      averageLatency: 0,
      errors: 0,
    };

    // Initialize connection
    this.initialize();
  }

  /**
   * Initialize JUCE bridge connection
   */
  initialize() {
    // Check for JUCE backend
    if (this.isJUCEAvailable()) {
      this.connectToJUCE();
    } else {
      console.log("JUCE backend not available, running in standalone mode");
      this.setupStandaloneMode();
    }

    // Setup message handlers
    this.setupMessageHandlers();

    // Setup heartbeat
    this.startHeartbeat();
  }

  /**
   * Check if JUCE backend is available
   */
  isJUCEAvailable() {
    // JUCE will inject a global object or use WebView messaging
    return (
      typeof window.__JUCE__ !== "undefined" ||
      typeof window.webkit?.messageHandlers?.juce !== "undefined"
    );
  }

  /**
   * Connect to JUCE backend
   */
  connectToJUCE() {
    try {
      // Different connection methods depending on platform
      if (window.__JUCE__) {
        // Direct injection method
        this.backend = window.__JUCE__;
        this.isConnected = true;
      } else if (window.webkit?.messageHandlers?.juce) {
        // WebKit message handler (macOS/iOS)
        this.backend = {
          postMessage: (msg) => {
            window.webkit.messageHandlers.juce.postMessage(msg);
          },
        };
        this.isConnected = true;
      }

      if (this.isConnected) {
        console.log("Connected to JUCE backend");
        this.sendMessage(this.MessageTypes.UI_READY, {
          version: this.protocolVersion,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("Failed to connect to JUCE:", error);
      this.isConnected = false;
    }
  }

  /**
   * Setup standalone mode for development
   */
  setupStandaloneMode() {
    // Create mock backend for standalone testing
    this.backend = {
      postMessage: (msg) => {
        // Echo messages back for testing
        console.log("[Mock JUCE] Received:", msg);

        // Simulate response
        setTimeout(() => {
          this.handleMessage({
            type: this.MessageTypes.ACK,
            id: msg.id,
            data: { received: true },
          });
        }, 10);
      },
    };
  }

  /**
   * Setup message handlers
   */
  setupMessageHandlers() {
    // Listen for messages from JUCE
    window.addEventListener("message", (event) => {
      // Validate origin if needed
      if (this.isValidOrigin(event.origin)) {
        this.handleMessage(event.data);
      }
    });

    // Alternative: direct function call from JUCE
    window.onJUCEMessage = (message) => {
      this.handleMessage(message);
    };
  }

  /**
   * Validate message origin
   */
  isValidOrigin(origin) {
    // In production, validate the origin
    // For now, accept all in development
    return true;
  }

  /**
   * Send message to JUCE
   */
  sendMessage(type, data = {}, callback = null) {
    const message = {
      id: ++this.callbackId,
      type,
      data,
      timestamp: Date.now(),
    };

    // Store callback if provided
    if (callback) {
      this.pendingCallbacks.set(message.id, {
        callback,
        timestamp: Date.now(),
      });
    }

    // Queue or send message
    if (this.isConnected) {
      this.sendMessageDirect(message);
    } else {
      this.messageQueue.push(message);
    }

    this.metrics.messagesSent++;
    return message.id;
  }

  /**
   * Send message directly to backend
   */
  sendMessageDirect(message) {
    try {
      if (this.backend && this.backend.postMessage) {
        // Send as JSON string
        this.backend.postMessage(JSON.stringify(message));
      } else {
        console.warn("Backend not available for message:", message);
      }
    } catch (error) {
      console.error("Error sending message to JUCE:", error);
      this.metrics.errors++;
    }
  }

  /**
   * Handle incoming message from JUCE
   */
  handleMessage(message) {
    try {
      // Parse if string
      if (typeof message === "string") {
        message = JSON.parse(message);
      }

      this.metrics.messagesReceived++;

      // Handle callback if this is a response
      if (message.id && this.pendingCallbacks.has(message.id)) {
        const { callback, timestamp } = this.pendingCallbacks.get(message.id);
        this.pendingCallbacks.delete(message.id);

        // Update latency metric
        const latency = Date.now() - timestamp;
        this.updateLatencyMetric(latency);

        if (callback) {
          callback(message.data);
        }
      }

      // Route message by type
      this.routeMessage(message);
    } catch (error) {
      console.error("Error handling JUCE message:", error);
      this.metrics.errors++;
    }
  }

  /**
   * Route message to appropriate handler
   */
  routeMessage(message) {
    switch (message.type) {
      case this.MessageTypes.ENGINE_STATE:
        this.handleEngineState(message.data);
        break;

      case this.MessageTypes.AUDIO_LEVELS:
        this.handleAudioLevels(message.data);
        break;

      case this.MessageTypes.MIDI_EVENT:
        this.handleMidiEvent(message.data);
        break;

      case this.MessageTypes.PRESET_LIST:
        this.handlePresetList(message.data);
        break;

      case this.MessageTypes.ERROR:
        this.handleError(message.data);
        break;

      case this.MessageTypes.ACK:
        // Acknowledgment already handled
        break;

      default:
        console.warn("Unknown message type from JUCE:", message.type);
    }
  }

  /**
   * Handle engine state update
   */
  handleEngineState(data) {
    if (window.ottoInterface) {
      // Update UI based on engine state
      if (data.tempo !== undefined) {
        window.ottoInterface.tempo = data.tempo;
      }
      if (data.isPlaying !== undefined) {
        window.ottoInterface.isPlaying = data.isPlaying;
      }
      // Update other state as needed
    }
  }

  /**
   * Handle audio level meters
   */
  handleAudioLevels(data) {
    // Update level meters in UI
    if (window.ottoInterface && window.ottoInterface.updateLevelMeters) {
      window.ottoInterface.updateLevelMeters(data);
    }
  }

  /**
   * Handle MIDI events
   */
  handleMidiEvent(data) {
    // Process MIDI events for visualization
    if (window.ottoInterface && window.ottoInterface.handleMidiEvent) {
      window.ottoInterface.handleMidiEvent(data);
    }
  }

  /**
   * Handle preset list update
   */
  handlePresetList(data) {
    if (window.ottoInterface) {
      window.ottoInterface.presets = data.presets;
      window.ottoInterface.renderPresetList();
    }
  }

  /**
   * Handle errors from JUCE
   */
  handleError(data) {
    console.error("JUCE Error:", data.message);
    if (window.ottoInterface && window.ottoInterface.showNotification) {
      window.ottoInterface.showNotification(data.message, "error");
    }
  }

  /**
   * Send state change to JUCE
   */
  sendStateChange(playerNum, stateType, value) {
    this.sendMessage(this.MessageTypes.STATE_CHANGE, {
      player: playerNum,
      type: stateType,
      value: value,
    });
  }

  /**
   * Send parameter change to JUCE
   */
  sendParameterChange(playerNum, param, value) {
    this.sendMessage(this.MessageTypes.PARAMETER_CHANGE, {
      player: playerNum,
      parameter: param,
      value: value,
    });
  }

  /**
   * Send transport control
   */
  sendTransportControl(action) {
    this.sendMessage(this.MessageTypes.TRANSPORT_CONTROL, {
      action: action, // play, pause, stop, record
    });
  }

  /**
   * Request preset load
   */
  loadPreset(presetName, callback) {
    this.sendMessage(
      this.MessageTypes.PRESET_LOAD,
      {
        name: presetName,
      },
      callback,
    );
  }

  /**
   * Request preset save
   */
  savePreset(presetName, data, callback) {
    this.sendMessage(
      this.MessageTypes.PRESET_SAVE,
      {
        name: presetName,
        data: data,
      },
      callback,
    );
  }

  /**
   * Send pattern change
   */
  sendPatternChange(playerNum, patternData) {
    this.sendMessage(this.MessageTypes.PATTERN_CHANGE, {
      player: playerNum,
      pattern: patternData,
    });
  }

  /**
   * Send kit change
   */
  sendKitChange(playerNum, kitName) {
    this.sendMessage(this.MessageTypes.KIT_CHANGE, {
      player: playerNum,
      kit: kitName,
    });
  }

  /**
   * Send window event
   */
  sendWindowEvent(eventType, windowName, data = {}) {
    this.sendMessage(this.MessageTypes.WINDOW_EVENT, {
      event: eventType,
      window: windowName,
      ...data,
    });
  }

  /**
   * Start heartbeat to check connection
   */
  startHeartbeat() {
    setInterval(() => {
      if (this.isConnected) {
        this.sendMessage("heartbeat", {}, (response) => {
          if (!response) {
            console.warn("JUCE heartbeat failed");
            this.isConnected = false;
          }
        });
      }

      // Clean up old callbacks
      this.cleanupCallbacks();

      // Process queued messages
      this.processMessageQueue();
    }, 5000);
  }

  /**
   * Process queued messages
   */
  processMessageQueue() {
    if (this.isConnected && this.messageQueue.length > 0) {
      const messages = [...this.messageQueue];
      this.messageQueue = [];

      messages.forEach((msg) => this.sendMessageDirect(msg));
    }
  }

  /**
   * Cleanup old callbacks
   */
  cleanupCallbacks() {
    const timeout = 30000; // 30 seconds
    const now = Date.now();

    for (const [id, { timestamp }] of this.pendingCallbacks) {
      if (now - timestamp > timeout) {
        this.pendingCallbacks.delete(id);
        console.warn(`Callback ${id} timed out`);
      }
    }
  }

  /**
   * Update latency metric
   */
  updateLatencyMetric(latency) {
    const weight = 0.1; // Exponential moving average weight
    this.metrics.averageLatency =
      this.metrics.averageLatency * (1 - weight) + latency * weight;
  }

  /**
   * Get metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queuedMessages: this.messageQueue.length,
      pendingCallbacks: this.pendingCallbacks.size,
      connected: this.isConnected,
    };
  }

  /**
   * Destroy bridge
   */
  destroy() {
    this.isConnected = false;
    this.messageQueue = [];
    this.pendingCallbacks.clear();

    // Remove event listeners
    window.onJUCEMessage = null;
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = JUCEBridge;
}
