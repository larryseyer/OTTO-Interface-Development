/**
 * Parameter System - JUCE-ready parameter management
 * Maps to JUCE's AudioProcessorParameter and RangedAudioParameter
 */

class Parameter {
    constructor(id, name, defaultValue, minValue, maxValue, options = {}) {
        this.id = id;
        this.name = name;
        this.defaultValue = defaultValue;
        this.minValue = minValue;
        this.maxValue = maxValue;
        this.value = defaultValue;
        
        // Options
        this.units = options.units || '';
        this.skew = options.skew || 1.0;
        this.step = options.step || 0;
        this.automatable = options.automatable !== false;
        this.saveable = options.saveable !== false;
        this.smoothing = options.smoothing || 0;
        
        // State
        this.listeners = new Set();
        this.gestureActive = false;
        this.normalizedValue = this.valueToNormalized(defaultValue);
        this.targetValue = defaultValue;
        this.smoothingActive = false;
        
        // Modulation
        this.modulations = new Map();
        this.modulationDepth = 0;
    }

    /**
     * Set parameter value
     * @param {number} newValue - New value (will be clamped)
     * @param {boolean} notify - Whether to notify listeners
     */
    setValue(newValue, notify = true) {
        const clampedValue = this.clamp(newValue);
        
        if (this.smoothing > 0 && !this.gestureActive) {
            this.targetValue = clampedValue;
            this.startSmoothing();
        } else {
            this.value = clampedValue;
            this.normalizedValue = this.valueToNormalized(clampedValue);
            
            if (notify) {
                this.notifyListeners();
            }
        }
    }

    /**
     * Set normalized value (0-1)
     * @param {number} normalized - Normalized value
     * @param {boolean} notify - Whether to notify listeners
     */
    setNormalizedValue(normalized, notify = true) {
        const clampedNorm = Math.max(0, Math.min(1, normalized));
        const value = this.normalizedToValue(clampedNorm);
        this.setValue(value, notify);
    }

    /**
     * Get current value
     * @returns {number} Current value
     */
    getValue() {
        return this.value + this.getModulationOffset();
    }

    /**
     * Get normalized value (0-1)
     * @returns {number} Normalized value
     */
    getNormalizedValue() {
        return this.normalizedValue;
    }

    /**
     * Convert value to normalized (0-1)
     * @private
     */
    valueToNormalized(value) {
        const range = this.maxValue - this.minValue;
        if (range === 0) return 0;
        
        const normalized = (value - this.minValue) / range;
        
        // Apply skew
        if (this.skew !== 1.0) {
            return Math.pow(normalized, 1.0 / this.skew);
        }
        
        return normalized;
    }

    /**
     * Convert normalized to value
     * @private
     */
    normalizedToValue(normalized) {
        // Apply skew
        let skewed = normalized;
        if (this.skew !== 1.0) {
            skewed = Math.pow(normalized, this.skew);
        }
        
        const value = this.minValue + skewed * (this.maxValue - this.minValue);
        
        // Apply stepping
        if (this.step > 0) {
            return Math.round(value / this.step) * this.step;
        }
        
        return value;
    }

    /**
     * Clamp value to range
     * @private
     */
    clamp(value) {
        return Math.max(this.minValue, Math.min(this.maxValue, value));
    }

    /**
     * Start smoothing to target value
     * @private
     */
    startSmoothing() {
        if (this.smoothingActive) return;
        
        this.smoothingActive = true;
        const smoothStep = () => {
            if (!this.smoothingActive) return;
            
            const diff = this.targetValue - this.value;
            if (Math.abs(diff) < 0.001) {
                this.value = this.targetValue;
                this.smoothingActive = false;
                this.notifyListeners();
                return;
            }
            
            this.value += diff * (1.0 - this.smoothing);
            this.normalizedValue = this.valueToNormalized(this.value);
            this.notifyListeners();
            
            requestAnimationFrame(smoothStep);
        };
        
        requestAnimationFrame(smoothStep);
    }

    /**
     * Add modulation source
     * @param {string} sourceId - Modulation source ID
     * @param {number} depth - Modulation depth (-1 to 1)
     */
    addModulation(sourceId, depth) {
        this.modulations.set(sourceId, depth);
        this.updateModulationDepth();
    }

    /**
     * Remove modulation source
     * @param {string} sourceId - Modulation source ID
     */
    removeModulation(sourceId) {
        this.modulations.delete(sourceId);
        this.updateModulationDepth();
    }

    /**
     * Update total modulation depth
     * @private
     */
    updateModulationDepth() {
        this.modulationDepth = 0;
        for (const depth of this.modulations.values()) {
            this.modulationDepth += depth;
        }
        this.modulationDepth = Math.max(-1, Math.min(1, this.modulationDepth));
    }

    /**
     * Get modulation offset
     * @private
     */
    getModulationOffset() {
        const range = this.maxValue - this.minValue;
        return this.modulationDepth * range * 0.5;
    }

    /**
     * Begin gesture (for automation)
     */
    beginGesture() {
        this.gestureActive = true;
        this.notifyListeners('gesture-begin');
    }

    /**
     * End gesture (for automation)
     */
    endGesture() {
        this.gestureActive = false;
        this.notifyListeners('gesture-end');
    }

    /**
     * Reset to default value
     */
    reset() {
        this.setValue(this.defaultValue);
    }

    /**
     * Add value change listener
     * @param {Function} callback - Listener function
     */
    addListener(callback) {
        this.listeners.add(callback);
    }

    /**
     * Remove value change listener
     * @param {Function} callback - Listener function
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notify all listeners
     * @private
     */
    notifyListeners(eventType = 'value-changed') {
        for (const listener of this.listeners) {
            try {
                listener(this, eventType);
            } catch (error) {
                console.error('Parameter listener error:', error);
            }
        }
    }

    /**
     * Get display text for current value
     * @returns {string} Display text
     */
    getDisplayText() {
        let text = this.getValue().toFixed(this.step > 0 ? 0 : 2);
        if (this.units) {
            text += ' ' + this.units;
        }
        return text;
    }

    /**
     * Serialize parameter state
     * @returns {Object} Serialized state
     */
    serialize() {
        return {
            id: this.id,
            value: this.value,
            normalizedValue: this.normalizedValue
        };
    }

    /**
     * Deserialize parameter state
     * @param {Object} state - Serialized state
     */
    deserialize(state) {
        if (state.id === this.id) {
            this.setValue(state.value, false);
        }
    }
}

/**
 * Parameter Group - Manages collections of parameters
 */
class ParameterGroup {
    constructor(name) {
        this.name = name;
        this.parameters = new Map();
        this.groups = new Map();
    }

    /**
     * Add a parameter to the group
     * @param {Parameter} parameter - Parameter to add
     */
    addParameter(parameter) {
        this.parameters.set(parameter.id, parameter);
    }

    /**
     * Add a sub-group
     * @param {ParameterGroup} group - Sub-group to add
     */
    addGroup(group) {
        this.groups.set(group.name, group);
    }

    /**
     * Get parameter by ID (searches recursively)
     * @param {string} id - Parameter ID
     * @returns {Parameter|null} Parameter or null
     */
    getParameter(id) {
        if (this.parameters.has(id)) {
            return this.parameters.get(id);
        }

        for (const group of this.groups.values()) {
            const param = group.getParameter(id);
            if (param) return param;
        }

        return null;
    }

    /**
     * Get all parameters (recursively)
     * @returns {Array} All parameters
     */
    getAllParameters() {
        const params = Array.from(this.parameters.values());
        
        for (const group of this.groups.values()) {
            params.push(...group.getAllParameters());
        }
        
        return params;
    }

    /**
     * Serialize all parameters
     * @returns {Object} Serialized state
     */
    serialize() {
        const state = {
            name: this.name,
            parameters: {},
            groups: {}
        };

        for (const [id, param] of this.parameters) {
            state.parameters[id] = param.serialize();
        }

        for (const [name, group] of this.groups) {
            state.groups[name] = group.serialize();
        }

        return state;
    }

    /**
     * Deserialize all parameters
     * @param {Object} state - Serialized state
     */
    deserialize(state) {
        if (state.parameters) {
            for (const [id, paramState] of Object.entries(state.parameters)) {
                const param = this.parameters.get(id);
                if (param) {
                    param.deserialize(paramState);
                }
            }
        }

        if (state.groups) {
            for (const [name, groupState] of Object.entries(state.groups)) {
                const group = this.groups.get(name);
                if (group) {
                    group.deserialize(groupState);
                }
            }
        }
    }

    /**
     * Reset all parameters to defaults
     */
    reset() {
        for (const param of this.parameters.values()) {
            param.reset();
        }

        for (const group of this.groups.values()) {
            group.reset();
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Parameter, ParameterGroup };
}