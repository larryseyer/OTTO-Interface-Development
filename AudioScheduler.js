/**
 * AudioScheduler.js
 * Optimized audio event scheduling and timing
 * Phase 4 Implementation
 */

class AudioScheduler {
  constructor() {
    // Audio context
    this.audioContext = null;
    this.lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
    this.scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)

    // Timing
    this.currentNote = 0; // Current note in sequence
    this.nextNoteTime = 0.0; // When the next note is due
    this.noteLength = 0.05; // Length of "beep" (in seconds)
    this.notesInQueue = []; // Notes that have been put into the web audio

    // Tempo and timing
    this.tempo = 120.0;
    this.isPlaying = false;
    this.startTime = 0;
    this.pauseTime = 0;

    // Pattern data
    this.patterns = new Map();
    this.currentPattern = null;
    this.beatsPerBar = 4;
    this.subdivision = 16; // 16th notes

    // Scheduling
    this.timerWorker = null;
    this.schedulerTimer = null;

    // Event callbacks
    this.callbacks = new Map();

    // Performance metrics
    this.metrics = {
      scheduledEvents: 0,
      missedEvents: 0,
      latency: 0,
      jitter: 0,
      lastScheduleTime: 0,
    };

    // Initialize
    this.initialize();
  }

  /**
   * Initialize audio context and worker
   */
  async initialize() {
    try {
      // Create or get audio context
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();

      // Create timer worker for accurate timing
      this.createTimerWorker();

      // Set up audio context state handling
      if (this.audioContext.state === "suspended") {
        document.addEventListener(
          "click",
          () => {
            this.audioContext.resume();
          },
          { once: true },
        );
      }
    } catch (error) {
      console.error("Failed to initialize AudioScheduler:", error);
    }
  }

  /**
   * Create web worker for accurate timing
   */
  createTimerWorker() {
    const workerCode = `
      let timerID = null;
      let interval = 100;
      
      self.addEventListener('message', function(e) {
        if (e.data.command === 'start') {
          interval = e.data.interval;
          timerID = setInterval(function() {
            self.postMessage('tick');
          }, interval);
        } else if (e.data.command === 'stop') {
          clearInterval(timerID);
          timerID = null;
        } else if (e.data.command === 'interval') {
          interval = e.data.interval;
          if (timerID) {
            clearInterval(timerID);
            timerID = setInterval(function() {
              self.postMessage('tick');
            }, interval);
          }
        }
      });
    `;

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const workerUrl = URL.createObjectURL(blob);

    this.timerWorker = new Worker(workerUrl);
    this.timerWorker.addEventListener("message", (e) => {
      if (e.data === "tick") {
        this.scheduler();
      }
    });
  }

  /**
   * Main scheduler function
   */
  scheduler() {
    if (!this.isPlaying) return;

    const startSchedule = performance.now();

    // Schedule all notes that fall within the look-ahead window
    while (
      this.nextNoteTime <
      this.audioContext.currentTime + this.scheduleAheadTime
    ) {
      this.scheduleNote(this.currentNote, this.nextNoteTime);
      this.nextNote();
    }

    // Update metrics
    const scheduleTime = performance.now() - startSchedule;
    this.updateMetrics(scheduleTime);
  }

  /**
   * Schedule a single note
   */
  scheduleNote(beatNumber, time) {
    // Add note to queue for visualization
    this.notesInQueue.push({ note: beatNumber, time: time });

    // Clean old notes from queue
    const currentTime = this.audioContext.currentTime;
    this.notesInQueue = this.notesInQueue.filter(
      (n) => n.time > currentTime - 0.1,
    );

    // Get pattern data for this beat
    if (this.currentPattern) {
      const patternData = this.patterns.get(this.currentPattern);
      if (patternData && patternData[beatNumber]) {
        // Schedule audio events for this beat
        this.scheduleAudioEvents(patternData[beatNumber], time);
      }
    }

    // Trigger callbacks
    this.triggerCallbacks("beat", beatNumber, time);

    this.metrics.scheduledEvents++;
  }

  /**
   * Schedule audio events for a beat
   */
  scheduleAudioEvents(events, time) {
    events.forEach((event) => {
      switch (event.type) {
        case "drum":
          this.scheduleDrumHit(event, time);
          break;
        case "sample":
          this.scheduleSample(event, time);
          break;
        case "parameter":
          this.scheduleParameterChange(event, time);
          break;
      }
    });
  }

  /**
   * Schedule a drum hit
   */
  scheduleDrumHit(event, time) {
    if (!this.audioContext) return;

    // Create oscillator for now (would be replaced with actual drum samples)
    const osc = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    osc.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Set frequency based on drum type
    const frequencies = {
      kick: 60,
      snare: 200,
      hihat: 800,
      crash: 1200,
    };

    osc.frequency.value = frequencies[event.drum] || 440;

    // Envelope
    gainNode.gain.setValueAtTime(event.velocity || 0.5, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + this.noteLength);

    // Schedule play
    osc.start(time);
    osc.stop(time + this.noteLength);
  }

  /**
   * Schedule sample playback
   */
  scheduleSample(event, time) {
    // Would integrate with actual sample playback system
    this.triggerCallbacks("sample", event, time);
  }

  /**
   * Schedule parameter change
   */
  scheduleParameterChange(event, time) {
    // Schedule parameter automation
    this.triggerCallbacks("parameter", event, time);
  }

  /**
   * Move to next note
   */
  nextNote() {
    const secondsPerBeat = 60.0 / this.tempo / 4; // Assuming 16th notes

    this.nextNoteTime += secondsPerBeat;

    this.currentNote++;
    if (this.currentNote >= this.subdivision) {
      this.currentNote = 0;
      this.triggerCallbacks("bar", this.currentNote, this.nextNoteTime);
    }
  }

  /**
   * Start playback
   */
  play() {
    if (this.isPlaying) return;

    this.isPlaying = true;

    if (this.pauseTime) {
      // Resume from pause
      const pauseDuration = this.audioContext.currentTime - this.pauseTime;
      this.nextNoteTime += pauseDuration;
      this.pauseTime = 0;
    } else {
      // Start fresh
      this.currentNote = 0;
      this.nextNoteTime = this.audioContext.currentTime + 0.005;
    }

    // Start worker
    this.timerWorker.postMessage({
      command: "start",
      interval: this.lookahead,
    });

    this.triggerCallbacks("play");
  }

  /**
   * Stop playback
   */
  stop() {
    this.isPlaying = false;
    this.currentNote = 0;
    this.pauseTime = 0;

    // Stop worker
    if (this.timerWorker) {
      this.timerWorker.postMessage({ command: "stop" });
    }

    // Clear queue
    this.notesInQueue = [];

    this.triggerCallbacks("stop");
  }

  /**
   * Pause playback
   */
  pause() {
    if (!this.isPlaying) return;

    this.isPlaying = false;
    this.pauseTime = this.audioContext.currentTime;

    // Stop worker
    if (this.timerWorker) {
      this.timerWorker.postMessage({ command: "stop" });
    }

    this.triggerCallbacks("pause");
  }

  /**
   * Set tempo
   */
  setTempo(bpm) {
    this.tempo = Math.max(30, Math.min(300, bpm));

    // If playing, adjust next note time
    if (this.isPlaying) {
      const ratio = this.tempo / bpm;
      const timeSinceLastNote =
        this.audioContext.currentTime -
        (this.nextNoteTime - 60.0 / this.tempo / 4);
      this.nextNoteTime =
        this.audioContext.currentTime + timeSinceLastNote * ratio;
    }

    this.triggerCallbacks("tempo", this.tempo);
  }

  /**
   * Set pattern
   */
  setPattern(patternId, patternData) {
    this.patterns.set(patternId, patternData);
  }

  /**
   * Select current pattern
   */
  selectPattern(patternId) {
    if (this.patterns.has(patternId)) {
      this.currentPattern = patternId;
      this.triggerCallbacks("pattern", patternId);
    }
  }

  /**
   * Add event callback
   */
  on(event, callback) {
    if (!this.callbacks.has(event)) {
      this.callbacks.set(event, new Set());
    }
    this.callbacks.get(event).add(callback);

    return () => this.off(event, callback);
  }

  /**
   * Remove event callback
   */
  off(event, callback) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * Trigger callbacks
   */
  triggerCallbacks(event, ...args) {
    const callbacks = this.callbacks.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          // Use setTimeout to avoid blocking
          setTimeout(() => callback(...args), 0);
        } catch (error) {
          console.error(`Error in audio callback (${event}):`, error);
        }
      });
    }
  }

  /**
   * Get current playback position
   */
  getCurrentPosition() {
    if (!this.isPlaying) return 0;

    const secondsPerBeat = 60.0 / this.tempo / 4;
    const currentBeat = this.currentNote;
    const currentBar = Math.floor(currentBeat / this.subdivision);
    const beatInBar = currentBeat % this.subdivision;

    return {
      bar: currentBar,
      beat: beatInBar,
      time: this.nextNoteTime - secondsPerBeat,
      tempo: this.tempo,
    };
  }

  /**
   * Sync to external clock
   */
  syncToClock(masterClock) {
    // Implement clock sync for multiple instances
    const offset =
      masterClock.audioContext.currentTime - this.audioContext.currentTime;
    this.nextNoteTime += offset;
  }

  /**
   * Update performance metrics
   */
  updateMetrics(scheduleTime) {
    this.metrics.latency = scheduleTime;

    // Calculate jitter
    if (this.metrics.lastScheduleTime > 0) {
      const expectedInterval = this.lookahead;
      const actualInterval = performance.now() - this.metrics.lastScheduleTime;
      this.metrics.jitter = Math.abs(actualInterval - expectedInterval);
    }

    this.metrics.lastScheduleTime = performance.now();

    // Check for missed events
    if (scheduleTime > this.lookahead * 0.5) {
      this.metrics.missedEvents++;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      queueLength: this.notesInQueue.length,
      isPlaying: this.isPlaying,
      tempo: this.tempo,
      audioLatency: this.audioContext?.baseLatency || 0,
    };
  }

  /**
   * Optimize for low latency
   */
  optimizeLatency() {
    // Reduce lookahead for lower latency
    this.lookahead = 10.0;
    this.scheduleAheadTime = 0.05;

    if (this.timerWorker && this.isPlaying) {
      this.timerWorker.postMessage({
        command: "interval",
        interval: this.lookahead,
      });
    }
  }

  /**
   * Optimize for stability
   */
  optimizeStability() {
    // Increase lookahead for more stability
    this.lookahead = 25.0;
    this.scheduleAheadTime = 0.1;

    if (this.timerWorker && this.isPlaying) {
      this.timerWorker.postMessage({
        command: "interval",
        interval: this.lookahead,
      });
    }
  }

  /**
   * Destroy scheduler
   */
  destroy() {
    this.stop();

    if (this.timerWorker) {
      this.timerWorker.terminate();
      this.timerWorker = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.callbacks.clear();
    this.patterns.clear();
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = AudioScheduler;
}
