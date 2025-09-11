/**
 * PatternGroupManager.js
 * Manages pattern groups with 16-pattern enforcement
 * Phase 2 Implementation
 */

class PatternGroupManager {
  constructor(storageManager) {
    this.storageManager = storageManager;

    // Pattern group requirements
    this.PATTERNS_PER_GROUP = 16; // 4x4 grid requirement
    this.MIN_GROUP_NAME_LENGTH = 1;
    this.MAX_GROUP_NAME_LENGTH = 50;

    // Pattern groups storage
    this.groups = new Map();

    // Current group tracking
    this.currentGroupKey = "favorites";

    // Available patterns from MIDI folder (mock data for now)
    this.availablePatterns = [
      "basic",
      "bassa",
      "busybeat",
      "buyoun",
      "chacha",
      "funk",
      "jazz",
      "just-hat",
      "just-kick",
      "polka",
      "push",
      "shuffle",
      "ska",
      "surf",
      "swing",
      "waltz",
      "rock-steady",
      "reggae",
      "hip-hop",
      "trap",
      "dubstep",
      "house",
      "techno",
      "trance",
      "ambient",
      "chill",
      "lofi",
      "boom-bap",
      "breaks",
      "dnb",
      "garage",
      "grime",
    ];

    // Listeners
    this.listeners = new Map();

    // Initialize with defaults
    this.initialize();
  }

  /**
   * Initialize with default groups
   */
  initialize() {
    // Default favorites group
    this.groups.set("favorites", {
      name: "Favorites",
      patterns: [
        "basic",
        "bassa",
        "busybeat",
        "buyoun",
        "chacha",
        "funk",
        "jazz",
        "just-hat",
        "just-kick",
        "polka",
        "push",
        "shuffle",
        "ska",
        "surf",
        "swing",
        "waltz",
      ],
      selectedPattern: "funk",
      locked: false,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });

    // Default custom group
    this.groups.set("custom", {
      name: "Custom",
      patterns: Array(16).fill("empty"),
      selectedPattern: "empty",
      locked: false,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    });

    // Load saved groups from storage
    this.loadFromStorage();
  }

  /**
   * Create a new pattern group
   */
  createGroup(name, patterns = null) {
    // Validate name
    if (!this.validateGroupName(name)) {
      throw new Error(`Invalid group name: ${name}`);
    }

    // Generate unique key
    const key = this.generateGroupKey(name);

    // Check if already exists
    if (this.groups.has(key)) {
      throw new Error(`Group already exists: ${name}`);
    }

    // Validate or create patterns array
    const groupPatterns = patterns || Array(16).fill("empty");
    if (!this.validatePatternArray(groupPatterns)) {
      throw new Error(
        "Invalid pattern array - must contain exactly 16 patterns",
      );
    }

    // Create group
    const group = {
      name: name,
      patterns: [...groupPatterns],
      selectedPattern: groupPatterns[0] || "empty",
      locked: false,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
    };

    // Store group
    this.groups.set(key, group);

    // Save to storage
    this.saveToStorage();

    // Notify listeners
    this.notifyListeners("create", key, group);

    return key;
  }

  /**
   * Update a pattern group
   */
  updateGroup(key, updates) {
    const group = this.groups.get(key);
    if (!group) {
      throw new Error(`Group not found: ${key}`);
    }

    if (group.locked) {
      throw new Error(`Group is locked: ${key}`);
    }

    // Validate updates
    if (updates.name && !this.validateGroupName(updates.name)) {
      throw new Error(`Invalid group name: ${updates.name}`);
    }

    if (updates.patterns && !this.validatePatternArray(updates.patterns)) {
      throw new Error(
        "Invalid pattern array - must contain exactly 16 patterns",
      );
    }

    // Apply updates
    const updatedGroup = {
      ...group,
      ...updates,
      modifiedAt: Date.now(),
    };

    // Ensure selected pattern is in the group
    if (
      updates.patterns &&
      !updates.patterns.includes(updatedGroup.selectedPattern)
    ) {
      updatedGroup.selectedPattern = updates.patterns[0] || "empty";
    }

    // Store updated group
    this.groups.set(key, updatedGroup);

    // Save to storage
    this.saveToStorage();

    // Notify listeners
    this.notifyListeners("update", key, updatedGroup, group);

    return updatedGroup;
  }

  /**
   * Delete a pattern group
   */
  deleteGroup(key) {
    const group = this.groups.get(key);
    if (!group) {
      throw new Error(`Group not found: ${key}`);
    }

    if (group.locked) {
      throw new Error(`Cannot delete locked group: ${key}`);
    }

    // Don't allow deleting last group
    if (this.groups.size <= 1) {
      throw new Error("Cannot delete the last pattern group");
    }

    // Remove group
    this.groups.delete(key);

    // If this was the current group, switch to first available
    if (this.currentGroupKey === key) {
      this.currentGroupKey = this.groups.keys().next().value;
    }

    // Save to storage
    this.saveToStorage();

    // Notify listeners
    this.notifyListeners("delete", key, null, group);

    return true;
  }

  /**
   * Get a pattern group
   */
  getGroup(key) {
    return this.groups.get(key);
  }

  /**
   * Get all groups
   */
  getAllGroups() {
    const groups = {};
    this.groups.forEach((group, key) => {
      groups[key] = { ...group };
    });
    return groups;
  }

  /**
   * Set pattern at specific position in group
   */
  setPatternAt(groupKey, position, patternName) {
    if (position < 0 || position >= this.PATTERNS_PER_GROUP) {
      throw new Error(`Invalid position: ${position}`);
    }

    const group = this.groups.get(groupKey);
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }

    if (group.locked) {
      throw new Error(`Group is locked: ${groupKey}`);
    }

    // Update pattern array
    const newPatterns = [...group.patterns];
    newPatterns[position] = patternName;

    // Update group
    return this.updateGroup(groupKey, {
      patterns: newPatterns,
    });
  }

  /**
   * Swap patterns within a group
   */
  swapPatterns(groupKey, position1, position2) {
    if (
      position1 < 0 ||
      position1 >= this.PATTERNS_PER_GROUP ||
      position2 < 0 ||
      position2 >= this.PATTERNS_PER_GROUP
    ) {
      throw new Error("Invalid positions for swap");
    }

    const group = this.groups.get(groupKey);
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }

    if (group.locked) {
      throw new Error(`Group is locked: ${groupKey}`);
    }

    // Swap patterns
    const newPatterns = [...group.patterns];
    [newPatterns[position1], newPatterns[position2]] = [
      newPatterns[position2],
      newPatterns[position1],
    ];

    // Update group
    return this.updateGroup(groupKey, {
      patterns: newPatterns,
    });
  }

  /**
   * Set selected pattern for a group
   */
  setSelectedPattern(groupKey, patternName) {
    const group = this.groups.get(groupKey);
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }

    // Verify pattern is in group
    if (!group.patterns.includes(patternName)) {
      throw new Error(`Pattern not in group: ${patternName}`);
    }

    // Update selection
    return this.updateGroup(groupKey, {
      selectedPattern: patternName,
    });
  }

  /**
   * Lock/unlock a group
   */
  setGroupLock(groupKey, locked) {
    const group = this.groups.get(groupKey);
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }

    return this.updateGroup(groupKey, { locked: !!locked });
  }

  /**
   * Rename a group
   */
  renameGroup(groupKey, newName) {
    if (!this.validateGroupName(newName)) {
      throw new Error(`Invalid group name: ${newName}`);
    }

    const group = this.groups.get(groupKey);
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }

    if (group.locked) {
      throw new Error(`Group is locked: ${groupKey}`);
    }

    // Check if new name would create duplicate key
    const newKey = this.generateGroupKey(newName);
    if (newKey !== groupKey && this.groups.has(newKey)) {
      throw new Error(`Group with similar name already exists: ${newName}`);
    }

    // If key changes, we need to recreate the entry
    if (newKey !== groupKey) {
      // Create new entry with new key
      const updatedGroup = {
        ...group,
        name: newName,
        modifiedAt: Date.now(),
      };

      this.groups.set(newKey, updatedGroup);
      this.groups.delete(groupKey);

      // Update current group key if needed
      if (this.currentGroupKey === groupKey) {
        this.currentGroupKey = newKey;
      }

      // Save and notify
      this.saveToStorage();
      this.notifyListeners("rename", newKey, updatedGroup, {
        ...group,
        key: groupKey,
      });

      return newKey;
    } else {
      // Just update the name
      return this.updateGroup(groupKey, { name: newName });
    }
  }

  /**
   * Duplicate a group
   */
  duplicateGroup(groupKey, newName = null) {
    const group = this.groups.get(groupKey);
    if (!group) {
      throw new Error(`Group not found: ${groupKey}`);
    }

    // Generate new name
    const baseName = newName || `${group.name} Copy`;
    let finalName = baseName;
    let counter = 1;

    // Find unique name
    while (this.groups.has(this.generateGroupKey(finalName))) {
      finalName = `${baseName} ${counter}`;
      counter++;
    }

    // Create duplicate
    return this.createGroup(finalName, group.patterns);
  }

  /**
   * Search patterns
   */
  searchPatterns(query) {
    const lowerQuery = query.toLowerCase();
    const results = [];

    this.availablePatterns.forEach((pattern) => {
      if (pattern.toLowerCase().includes(lowerQuery)) {
        results.push({
          name: pattern,
          displayName: this.formatPatternName(pattern),
        });
      }
    });

    return results;
  }

  /**
   * Validate group name
   */
  validateGroupName(name) {
    if (!name || typeof name !== "string") return false;
    if (name.length < this.MIN_GROUP_NAME_LENGTH) return false;
    if (name.length > this.MAX_GROUP_NAME_LENGTH) return false;

    // Check for valid characters (alphanumeric, spaces, dashes, underscores)
    const validPattern = /^[a-zA-Z0-9\s\-_]+$/;
    return validPattern.test(name);
  }

  /**
   * Validate pattern array
   */
  validatePatternArray(patterns) {
    if (!Array.isArray(patterns)) return false;
    if (patterns.length !== this.PATTERNS_PER_GROUP) return false;

    // Each pattern should be a string
    return patterns.every((p) => typeof p === "string");
  }

  /**
   * Generate group key from name
   */
  generateGroupKey(name) {
    return name
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "");
  }

  /**
   * Format pattern name for display
   */
  formatPatternName(pattern) {
    // Convert kebab-case to Title Case
    return pattern
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Add listener
   */
  addListener(event, listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(listener);

    return () => this.removeListener(event, listener);
  }

  /**
   * Remove listener
   */
  removeListener(event, listener) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  /**
   * Notify listeners
   */
  notifyListeners(event, key, newData, oldData = null) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(key, newData, oldData);
        } catch (error) {
          console.error(`Error in pattern group listener (${event}):`, error);
        }
      });
    }

    // Also notify wildcard listeners
    const wildcardListeners = this.listeners.get("*");
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => {
        try {
          listener(event, key, newData, oldData);
        } catch (error) {
          console.error("Error in wildcard pattern group listener:", error);
        }
      });
    }
  }

  /**
   * Load from storage
   */
  async loadFromStorage() {
    if (!this.storageManager) return;

    try {
      const data = await this.storageManager.load("patternGroups");
      if (data && data.groups) {
        // Clear existing non-default groups
        this.groups.forEach((group, key) => {
          if (key !== "favorites" && key !== "custom") {
            this.groups.delete(key);
          }
        });

        // Load saved groups
        Object.entries(data.groups).forEach(([key, group]) => {
          if (this.validatePatternArray(group.patterns)) {
            this.groups.set(key, {
              ...group,
              modifiedAt: group.modifiedAt || Date.now(),
            });
          }
        });

        // Set current group
        if (data.currentGroupKey && this.groups.has(data.currentGroupKey)) {
          this.currentGroupKey = data.currentGroupKey;
        }
      }
    } catch (error) {
      console.error("Error loading pattern groups:", error);
    }
  }

  /**
   * Save to storage
   */
  async saveToStorage() {
    if (!this.storageManager) return;

    try {
      const data = {
        groups: {},
        currentGroupKey: this.currentGroupKey,
        version: "1.0.0",
      };

      this.groups.forEach((group, key) => {
        data.groups[key] = { ...group };
      });

      await this.storageManager.save("patternGroups", data);
    } catch (error) {
      console.error("Error saving pattern groups:", error);
    }
  }

  /**
   * Export groups
   */
  exportGroups() {
    const data = {
      groups: {},
      currentGroupKey: this.currentGroupKey,
      exportDate: new Date().toISOString(),
      version: "1.0.0",
    };

    this.groups.forEach((group, key) => {
      data.groups[key] = { ...group };
    });

    return data;
  }

  /**
   * Import groups
   */
  importGroups(data, merge = false) {
    if (!data || !data.groups) {
      throw new Error("Invalid import data");
    }

    if (!merge) {
      // Clear existing groups except defaults
      this.groups.clear();
    }

    // Import groups
    Object.entries(data.groups).forEach(([key, group]) => {
      if (this.validatePatternArray(group.patterns)) {
        this.groups.set(key, {
          ...group,
          importedAt: Date.now(),
        });
      }
    });

    // Ensure we have at least one group
    if (this.groups.size === 0) {
      this.initialize();
    }

    // Set current group
    if (data.currentGroupKey && this.groups.has(data.currentGroupKey)) {
      this.currentGroupKey = data.currentGroupKey;
    } else {
      this.currentGroupKey = this.groups.keys().next().value;
    }

    // Save to storage
    this.saveToStorage();

    // Notify listeners
    this.notifyListeners("import", null, this.getAllGroups());

    return true;
  }

  /**
   * Get statistics
   */
  getStats() {
    let totalPatterns = 0;
    let emptySlots = 0;
    let uniquePatterns = new Set();

    this.groups.forEach((group) => {
      group.patterns.forEach((pattern) => {
        totalPatterns++;
        if (pattern === "empty") {
          emptySlots++;
        } else {
          uniquePatterns.add(pattern);
        }
      });
    });

    return {
      groupCount: this.groups.size,
      totalPatterns,
      emptySlots,
      uniquePatterns: uniquePatterns.size,
      availablePatterns: this.availablePatterns.length,
    };
  }

  /**
   * Destroy manager
   */
  destroy() {
    this.groups.clear();
    this.listeners.clear();
  }
}

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = PatternGroupManager;
}
