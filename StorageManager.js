/**
 * StorageManager.js
 * Abstracted storage operations with compression and migration
 * Phase 2 Implementation
 */

class StorageManager {
  constructor() {
    // Storage configuration
    this.prefix = 'otto_';
    this.maxSize = 5 * 1024 * 1024; // 5MB
    this.compressionThreshold = 1024; // Compress data larger than 1KB
    this.version = '1.0.0';
    
    // Storage backend
    this.backend = localStorage;
    
    // Cache for frequently accessed data
    this.cache = new Map();
    this.cacheMaxAge = 5 * 60 * 1000; // 5 minutes
    
    // Migration registry
    this.migrations = new Map();
    
    // Statistics
    this.stats = {
      reads: 0,
      writes: 0,
      cacheHits: 0,
      cacheMisses: 0,
      compressions: 0,
      decompressions: 0,
      errors: 0
    };
    
    // Initialize
    this.initialize();
  }
  
  /**
   * Initialize storage
   */
  initialize() {
    // Check storage availability
    if (!this.isStorageAvailable()) {
      console.error('StorageManager: Local storage not available');
      return;
    }
    
    // Run migrations if needed
    this.runMigrations();
    
    // Clean up old data
    this.cleanupOldData();
  }
  
  /**
   * Check if storage is available
   */
  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      this.backend.setItem(test, 'test');
      this.backend.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Save data to storage
   */
  async save(key, data) {
    this.stats.writes++;
    
    try {
      const fullKey = this.prefix + key;
      
      // Add metadata
      const wrappedData = {
        version: this.version,
        timestamp: Date.now(),
        data: data
      };
      
      // Serialize
      let serialized = JSON.stringify(wrappedData);
      
      // Check size
      const size = new Blob([serialized]).size;
      if (size > this.maxSize) {
        throw new Error(`Data too large: ${size} bytes (max: ${this.maxSize})`);
      }
      
      // Compress if needed
      if (size > this.compressionThreshold) {
        serialized = await this.compress(serialized);
        this.stats.compressions++;
      }
      
      // Store
      this.backend.setItem(fullKey, serialized);
      
      // Update cache
      this.cache.set(key, {
        data: data,
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      this.stats.errors++;
      
      if (error.name === 'QuotaExceededError') {
        // Handle quota exceeded
        await this.handleQuotaExceeded();
        // Retry once
        try {
          return await this.save(key, data);
        } catch (retryError) {
          console.error('StorageManager: Save failed after cleanup', retryError);
          return false;
        }
      }
      
      console.error(`StorageManager: Error saving ${key}`, error);
      return false;
    }
  }
  
  /**
   * Load data from storage
   */
  async load(key) {
    this.stats.reads++;
    
    try {
      // Check cache first
      const cached = this.cache.get(key);
      if (cached) {
        const age = Date.now() - cached.timestamp;
        if (age < this.cacheMaxAge) {
          this.stats.cacheHits++;
          return cached.data;
        }
      }
      
      this.stats.cacheMisses++;
      
      const fullKey = this.prefix + key;
      let serialized = this.backend.getItem(fullKey);
      
      if (!serialized) {
        return null;
      }
      
      // Decompress if needed
      if (serialized.startsWith('LZ:')) {
        serialized = await this.decompress(serialized);
        this.stats.decompressions++;
      }
      
      // Parse
      const wrappedData = JSON.parse(serialized);
      
      // Check version and migrate if needed
      if (wrappedData.version !== this.version) {
        const migrated = await this.migrateData(key, wrappedData);
        if (migrated) {
          wrappedData.data = migrated;
          // Save migrated data
          await this.save(key, migrated);
        }
      }
      
      // Update cache
      this.cache.set(key, {
        data: wrappedData.data,
        timestamp: Date.now()
      });
      
      return wrappedData.data;
      
    } catch (error) {
      this.stats.errors++;
      console.error(`StorageManager: Error loading ${key}`, error);
      
      // Try to recover corrupted data
      const recovered = await this.recoverCorruptedData(key);
      if (recovered) {
        return recovered;
      }
      
      return null;
    }
  }
  
  /**
   * Delete data from storage
   */
  remove(key) {
    try {
      const fullKey = this.prefix + key;
      this.backend.removeItem(fullKey);
      this.cache.delete(key);
      return true;
    } catch (error) {
      this.stats.errors++;
      console.error(`StorageManager: Error removing ${key}`, error);
      return false;
    }
  }
  
  /**
   * Check if key exists
   */
  exists(key) {
    const fullKey = this.prefix + key;
    return this.backend.getItem(fullKey) !== null;
  }
  
  /**
   * Get all keys
   */
  getAllKeys() {
    const keys = [];
    for (let i = 0; i < this.backend.length; i++) {
      const key = this.backend.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }
  
  /**
   * Clear all storage
   */
  clearAll() {
    const keys = this.getAllKeys();
    keys.forEach(key => this.remove(key));
    this.cache.clear();
    return true;
  }
  
  /**
   * Get storage size
   */
  getStorageSize() {
    let totalSize = 0;
    const items = [];
    
    for (let i = 0; i < this.backend.length; i++) {
      const key = this.backend.key(i);
      if (key && key.startsWith(this.prefix)) {
        const value = this.backend.getItem(key);
        const size = new Blob([value]).size;
        totalSize += size;
        items.push({
          key: key.substring(this.prefix.length),
          size: size
        });
      }
    }
    
    return {
      totalSize,
      items: items.sort((a, b) => b.size - a.size),
      maxSize: this.maxSize,
      usage: (totalSize / this.maxSize) * 100
    };
  }
  
  /**
   * Compress data (simplified LZ-like compression)
   */
  async compress(data) {
    // Simple compression: find repeated patterns and replace them
    // This is a placeholder - in production, use a proper compression library
    
    const patterns = new Map();
    const minPatternLength = 10;
    const maxPatternLength = 100;
    
    // Find repeated patterns
    for (let len = maxPatternLength; len >= minPatternLength; len--) {
      for (let i = 0; i <= data.length - len; i++) {
        const pattern = data.substring(i, i + len);
        if (patterns.has(pattern)) {
          patterns.set(pattern, patterns.get(pattern) + 1);
        } else {
          patterns.set(pattern, 1);
        }
      }
    }
    
    // Replace most frequent patterns
    let compressed = data;
    let dictionary = {};
    let dictIndex = 0;
    
    const sortedPatterns = Array.from(patterns.entries())
      .filter(([pattern, count]) => count > 2)
      .sort((a, b) => (b[1] * b[0].length) - (a[1] * a[0].length))
      .slice(0, 50);
    
    sortedPatterns.forEach(([pattern, count]) => {
      const key = `§${dictIndex}§`;
      dictionary[key] = pattern;
      compressed = compressed.split(pattern).join(key);
      dictIndex++;
    });
    
    // Only use compression if it actually reduces size
    const compressedData = JSON.stringify({ d: dictionary, c: compressed });
    if (compressedData.length < data.length * 0.9) {
      return 'LZ:' + compressedData;
    }
    
    return data;
  }
  
  /**
   * Decompress data
   */
  async decompress(data) {
    if (!data.startsWith('LZ:')) {
      return data;
    }
    
    try {
      const compressed = JSON.parse(data.substring(3));
      let decompressed = compressed.c;
      
      // Restore from dictionary
      Object.entries(compressed.d).forEach(([key, pattern]) => {
        decompressed = decompressed.split(key).join(pattern);
      });
      
      return decompressed;
    } catch (error) {
      console.error('StorageManager: Decompression failed', error);
      return data;
    }
  }
  
  /**
   * Handle quota exceeded
   */
  async handleQuotaExceeded() {
    console.warn('StorageManager: Quota exceeded, cleaning up...');
    
    const storageInfo = this.getStorageSize();
    const itemsToDelete = [];
    
    // Find old items to delete
    for (const item of storageInfo.items) {
      try {
        const fullKey = this.prefix + item.key;
        const value = this.backend.getItem(fullKey);
        const data = JSON.parse(value.startsWith('LZ:') ? await this.decompress(value) : value);
        
        // Delete items older than 30 days
        if (data.timestamp && Date.now() - data.timestamp > 30 * 24 * 60 * 60 * 1000) {
          itemsToDelete.push(item.key);
        }
      } catch (error) {
        // If we can't parse it, it's probably corrupted, delete it
        itemsToDelete.push(item.key);
      }
    }
    
    // Delete old items
    itemsToDelete.forEach(key => this.remove(key));
    
    // If still not enough space, delete largest non-essential items
    if (itemsToDelete.length === 0) {
      const nonEssential = storageInfo.items
        .filter(item => !item.key.includes('preset') && !item.key.includes('default'))
        .slice(0, 5);
      
      nonEssential.forEach(item => this.remove(item.key));
    }
    
    console.log(`StorageManager: Cleaned up ${itemsToDelete.length} items`);
  }
  
  /**
   * Clean up old data
   */
  cleanupOldData() {
    const maxAge = 90 * 24 * 60 * 60 * 1000; // 90 days
    const now = Date.now();
    const keysToDelete = [];
    
    this.getAllKeys().forEach(key => {
      try {
        const fullKey = this.prefix + key;
        const value = this.backend.getItem(fullKey);
        if (value) {
          const data = JSON.parse(value.startsWith('LZ:') ? value : value);
          if (data.timestamp && now - data.timestamp > maxAge) {
            keysToDelete.push(key);
          }
        }
      } catch (error) {
        // Corrupted data, mark for deletion
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.remove(key));
    
    if (keysToDelete.length > 0) {
      console.log(`StorageManager: Cleaned up ${keysToDelete.length} old items`);
    }
  }
  
  /**
   * Recover corrupted data
   */
  async recoverCorruptedData(key) {
    console.warn(`StorageManager: Attempting to recover corrupted data for ${key}`);
    
    // Try backup keys
    const backupKey = key + '_backup';
    const backup = await this.load(backupKey);
    if (backup) {
      console.log(`StorageManager: Recovered from backup for ${key}`);
      return backup;
    }
    
    // Try to find in history
    const historyKey = key + '_history';
    const history = await this.load(historyKey);
    if (history && Array.isArray(history) && history.length > 0) {
      console.log(`StorageManager: Recovered from history for ${key}`);
      return history[history.length - 1];
    }
    
    // Return defaults based on key type
    if (key.includes('preset')) {
      return this.getDefaultPresets();
    } else if (key.includes('pattern')) {
      return this.getDefaultPatternGroups();
    } else if (key.includes('drumkit')) {
      return this.getDefaultDrumkits();
    }
    
    return null;
  }
  
  /**
   * Register a migration
   */
  registerMigration(fromVersion, toVersion, migrationFn) {
    const key = `${fromVersion}->${toVersion}`;
    this.migrations.set(key, migrationFn);
  }
  
  /**
   * Run migrations
   */
  async runMigrations() {
    // Get current data version
    const versionKey = this.prefix + '_version';
    const currentVersion = this.backend.getItem(versionKey) || '0.0.0';
    
    if (currentVersion === this.version) {
      return; // No migration needed
    }
    
    console.log(`StorageManager: Migrating from ${currentVersion} to ${this.version}`);
    
    // Find migration path
    const migrationKey = `${currentVersion}->${this.version}`;
    const migration = this.migrations.get(migrationKey);
    
    if (migration) {
      try {
        await migration(this);
        this.backend.setItem(versionKey, this.version);
        console.log('StorageManager: Migration completed');
      } catch (error) {
        console.error('StorageManager: Migration failed', error);
      }
    } else {
      // No specific migration, just update version
      this.backend.setItem(versionKey, this.version);
    }
  }
  
  /**
   * Migrate data
   */
  async migrateData(key, wrappedData) {
    const fromVersion = wrappedData.version || '0.0.0';
    const migrationKey = `${fromVersion}->${this.version}`;
    const migration = this.migrations.get(migrationKey);
    
    if (migration) {
      try {
        return await migration(wrappedData.data, key);
      } catch (error) {
        console.error(`StorageManager: Data migration failed for ${key}`, error);
      }
    }
    
    return wrappedData.data;
  }
  
  /**
   * Get default presets
   */
  getDefaultPresets() {
    return {
      default: {
        name: 'Default',
        locked: true,
        data: {}
      }
    };
  }
  
  /**
   * Get default pattern groups
   */
  getDefaultPatternGroups() {
    return {
      favorites: {
        name: 'Favorites',
        patterns: Array(16).fill('empty')
      }
    };
  }
  
  /**
   * Get default drumkits
   */
  getDefaultDrumkits() {
    return {
      acoustic: {
        name: 'Acoustic',
        mixerPresets: {}
      }
    };
  }
  
  /**
   * Export all data
   */
  async exportAll() {
    const data = {};
    const keys = this.getAllKeys();
    
    for (const key of keys) {
      data[key] = await this.load(key);
    }
    
    return {
      version: this.version,
      exportDate: new Date().toISOString(),
      data: data
    };
  }
  
  /**
   * Import all data
   */
  async importAll(exportedData) {
    if (!exportedData || !exportedData.data) {
      throw new Error('Invalid import data');
    }
    
    const results = [];
    
    for (const [key, value] of Object.entries(exportedData.data)) {
      const success = await this.save(key, value);
      results.push({ key, success });
    }
    
    return results;
  }
  
  /**
   * Get statistics
   */
  getStats() {
    const storageSize = this.getStorageSize();
    
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      cacheHitRate: this.stats.reads > 0 
        ? (this.stats.cacheHits / this.stats.reads * 100).toFixed(2) + '%'
        : '0%',
      storageUsage: storageSize.usage.toFixed(2) + '%',
      totalSize: (storageSize.totalSize / 1024).toFixed(2) + ' KB',
      itemCount: storageSize.items.length
    };
  }
  
  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
  
  /**
   * Destroy manager
   */
  destroy() {
    this.cache.clear();
    this.migrations.clear();
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageManager;
}