/**
 * Abstract Interfaces - Platform-agnostic interfaces for JUCE compatibility
 * These map to JUCE's abstract base classes and interfaces
 */

/**
 * Audio Processor Interface
 * Maps to JUCE's AudioProcessor
 */
class IAudioProcessor {
    /**
     * Prepare for playback
     * @param {number} sampleRate - Sample rate in Hz
     * @param {number} blockSize - Maximum block size
     */
    prepareToPlay(sampleRate, blockSize) {
        throw new Error('IAudioProcessor.prepareToPlay() must be implemented');
    }

    /**
     * Process audio block
     * @param {Object} buffer - Audio buffer
     */
    processBlock(buffer) {
        throw new Error('IAudioProcessor.processBlock() must be implemented');
    }

    /**
     * Release resources
     */
    releaseResources() {
        throw new Error('IAudioProcessor.releaseResources() must be implemented');
    }

    /**
     * Get tail length in samples
     * @returns {number} Tail length
     */
    getTailLengthSamples() {
        return 0;
    }

    /**
     * Accept MIDI messages
     * @returns {boolean} Accepts MIDI
     */
    acceptsMidi() {
        return false;
    }

    /**
     * Produce MIDI messages
     * @returns {boolean} Produces MIDI
     */
    producesMidi() {
        return false;
    }

    /**
     * Get processor name
     * @returns {string} Name
     */
    getName() {
        return 'Unnamed Processor';
    }
}

/**
 * Graphics Context Interface
 * Maps to JUCE's Graphics class
 */
class IGraphicsContext {
    /**
     * Set current color
     * @param {Object} color - Color object {r, g, b, a}
     */
    setColor(color) {
        throw new Error('IGraphicsContext.setColor() must be implemented');
    }

    /**
     * Fill rectangle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    fillRect(x, y, width, height) {
        throw new Error('IGraphicsContext.fillRect() must be implemented');
    }

    /**
     * Draw rectangle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {number} lineWidth - Line width
     */
    drawRect(x, y, width, height, lineWidth = 1) {
        throw new Error('IGraphicsContext.drawRect() must be implemented');
    }

    /**
     * Draw line
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} lineWidth - Line width
     */
    drawLine(x1, y1, x2, y2, lineWidth = 1) {
        throw new Error('IGraphicsContext.drawLine() must be implemented');
    }

    /**
     * Draw text
     * @param {string} text - Text to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Object} options - Text options
     */
    drawText(text, x, y, options = {}) {
        throw new Error('IGraphicsContext.drawText() must be implemented');
    }

    /**
     * Save graphics state
     */
    save() {
        throw new Error('IGraphicsContext.save() must be implemented');
    }

    /**
     * Restore graphics state
     */
    restore() {
        throw new Error('IGraphicsContext.restore() must be implemented');
    }

    /**
     * Set clipping region
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    setClipBounds(x, y, width, height) {
        throw new Error('IGraphicsContext.setClipBounds() must be implemented');
    }
}

/**
 * File System Interface
 * Maps to JUCE's File class
 */
class IFileSystem {
    /**
     * Read file
     * @param {string} path - File path
     * @returns {Promise<*>} File contents
     */
    async readFile(path) {
        throw new Error('IFileSystem.readFile() must be implemented');
    }

    /**
     * Write file
     * @param {string} path - File path
     * @param {*} data - Data to write
     * @returns {Promise<boolean>} Success
     */
    async writeFile(path, data) {
        throw new Error('IFileSystem.writeFile() must be implemented');
    }

    /**
     * Delete file
     * @param {string} path - File path
     * @returns {Promise<boolean>} Success
     */
    async deleteFile(path) {
        throw new Error('IFileSystem.deleteFile() must be implemented');
    }

    /**
     * Check if file exists
     * @param {string} path - File path
     * @returns {Promise<boolean>} Exists
     */
    async exists(path) {
        throw new Error('IFileSystem.exists() must be implemented');
    }

    /**
     * Create directory
     * @param {string} path - Directory path
     * @returns {Promise<boolean>} Success
     */
    async createDirectory(path) {
        throw new Error('IFileSystem.createDirectory() must be implemented');
    }

    /**
     * List directory contents
     * @param {string} path - Directory path
     * @returns {Promise<Array>} File list
     */
    async listDirectory(path) {
        throw new Error('IFileSystem.listDirectory() must be implemented');
    }

    /**
     * Get file info
     * @param {string} path - File path
     * @returns {Promise<Object>} File info
     */
    async getFileInfo(path) {
        throw new Error('IFileSystem.getFileInfo() must be implemented');
    }
}

/**
 * Networking Interface
 * Maps to JUCE's URL and WebInputStream classes
 */
class INetworking {
    /**
     * HTTP GET request
     * @param {string} url - URL
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response
     */
    async get(url, options = {}) {
        throw new Error('INetworking.get() must be implemented');
    }

    /**
     * HTTP POST request
     * @param {string} url - URL
     * @param {*} data - Data to send
     * @param {Object} options - Request options
     * @returns {Promise<Object>} Response
     */
    async post(url, data, options = {}) {
        throw new Error('INetworking.post() must be implemented');
    }

    /**
     * Download file
     * @param {string} url - URL
     * @param {string} destination - Local path
     * @param {Function} progressCallback - Progress callback
     * @returns {Promise<boolean>} Success
     */
    async downloadFile(url, destination, progressCallback = null) {
        throw new Error('INetworking.downloadFile() must be implemented');
    }

    /**
     * Create WebSocket connection
     * @param {string} url - WebSocket URL
     * @returns {Object} WebSocket interface
     */
    createWebSocket(url) {
        throw new Error('INetworking.createWebSocket() must be implemented');
    }
}

/**
 * Threading Interface
 * Maps to JUCE's Thread and ThreadPool classes
 */
class IThreading {
    /**
     * Run task asynchronously
     * @param {Function} task - Task function
     * @returns {Promise<*>} Task result
     */
    async runAsync(task) {
        throw new Error('IThreading.runAsync() must be implemented');
    }

    /**
     * Run task on main thread
     * @param {Function} task - Task function
     */
    runOnMainThread(task) {
        throw new Error('IThreading.runOnMainThread() must be implemented');
    }

    /**
     * Create worker thread
     * @param {string} scriptPath - Worker script path
     * @returns {Object} Worker interface
     */
    createWorker(scriptPath) {
        throw new Error('IThreading.createWorker() must be implemented');
    }

    /**
     * Sleep for milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} Sleep promise
     */
    async sleep(ms) {
        throw new Error('IThreading.sleep() must be implemented');
    }

    /**
     * Create mutex
     * @returns {Object} Mutex interface
     */
    createMutex() {
        throw new Error('IThreading.createMutex() must be implemented');
    }
}

/**
 * Timer Interface
 * Maps to JUCE's Timer class
 */
class ITimer {
    constructor() {
        this.interval = 0;
        this.running = false;
    }

    /**
     * Start timer
     * @param {number} intervalMs - Interval in milliseconds
     */
    start(intervalMs) {
        this.interval = intervalMs;
        this.running = true;
        this.startImplementation();
    }

    /**
     * Stop timer
     */
    stop() {
        this.running = false;
        this.stopImplementation();
    }

    /**
     * Timer callback
     */
    timerCallback() {
        throw new Error('ITimer.timerCallback() must be implemented');
    }

    /**
     * Start implementation (platform-specific)
     * @protected
     */
    startImplementation() {
        throw new Error('ITimer.startImplementation() must be implemented');
    }

    /**
     * Stop implementation (platform-specific)
     * @protected
     */
    stopImplementation() {
        throw new Error('ITimer.stopImplementation() must be implemented');
    }

    /**
     * Check if running
     * @returns {boolean} Is running
     */
    isRunning() {
        return this.running;
    }
}

/**
 * Component Interface
 * Maps to JUCE's Component class
 */
class IComponent {
    constructor() {
        this.bounds = { x: 0, y: 0, width: 0, height: 0 };
        this.visible = true;
        this.enabled = true;
        this.children = [];
        this.parent = null;
    }

    /**
     * Paint component
     * @param {IGraphicsContext} g - Graphics context
     */
    paint(g) {
        throw new Error('IComponent.paint() must be implemented');
    }

    /**
     * Handle resize
     */
    resized() {
        // Override in subclasses
    }

    /**
     * Set bounds
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     */
    setBounds(x, y, width, height) {
        this.bounds = { x, y, width, height };
        this.resized();
    }

    /**
     * Add child component
     * @param {IComponent} child - Child component
     */
    addChild(child) {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        this.children.push(child);
        child.parent = this;
    }

    /**
     * Remove child component
     * @param {IComponent} child - Child component
     */
    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    /**
     * Mouse down event
     * @param {Object} event - Mouse event
     */
    mouseDown(event) {
        // Override in subclasses
    }

    /**
     * Mouse up event
     * @param {Object} event - Mouse event
     */
    mouseUp(event) {
        // Override in subclasses
    }

    /**
     * Mouse move event
     * @param {Object} event - Mouse event
     */
    mouseMove(event) {
        // Override in subclasses
    }

    /**
     * Mouse drag event
     * @param {Object} event - Mouse event
     */
    mouseDrag(event) {
        // Override in subclasses
    }

    /**
     * Set visible
     * @param {boolean} visible - Visibility
     */
    setVisible(visible) {
        this.visible = visible;
    }

    /**
     * Set enabled
     * @param {boolean} enabled - Enabled state
     */
    setEnabled(enabled) {
        this.enabled = enabled;
    }

    /**
     * Repaint component
     */
    repaint() {
        // Trigger repaint - implementation specific
    }
}

/**
 * Platform Factory Interface
 * Creates platform-specific implementations
 */
class IPlatformFactory {
    /**
     * Create audio processor
     * @returns {IAudioProcessor} Audio processor
     */
    createAudioProcessor() {
        throw new Error('IPlatformFactory.createAudioProcessor() must be implemented');
    }

    /**
     * Create graphics context
     * @returns {IGraphicsContext} Graphics context
     */
    createGraphicsContext() {
        throw new Error('IPlatformFactory.createGraphicsContext() must be implemented');
    }

    /**
     * Create file system
     * @returns {IFileSystem} File system
     */
    createFileSystem() {
        throw new Error('IPlatformFactory.createFileSystem() must be implemented');
    }

    /**
     * Create networking
     * @returns {INetworking} Networking
     */
    createNetworking() {
        throw new Error('IPlatformFactory.createNetworking() must be implemented');
    }

    /**
     * Create threading
     * @returns {IThreading} Threading
     */
    createThreading() {
        throw new Error('IPlatformFactory.createThreading() must be implemented');
    }

    /**
     * Create timer
     * @returns {ITimer} Timer
     */
    createTimer() {
        throw new Error('IPlatformFactory.createTimer() must be implemented');
    }

    /**
     * Create component
     * @returns {IComponent} Component
     */
    createComponent() {
        throw new Error('IPlatformFactory.createComponent() must be implemented');
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IAudioProcessor,
        IGraphicsContext,
        IFileSystem,
        INetworking,
        IThreading,
        ITimer,
        IComponent,
        IPlatformFactory
    };
}