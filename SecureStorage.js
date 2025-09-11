/**
 * Secure Storage Layer
 * Provides encrypted storage with integrity checks and quota management
 */

class SecureStorage {
    constructor(encryptionKey = null) {
        this.storageType = this.detectStorageType();
        this.encryptionEnabled = false;
        this.encryptionKey = null;
        this.integrityChecks = new Map();
        this.quotaManager = new QuotaManager();
        
        if (encryptionKey) {
            this.enableEncryption(encryptionKey);
        }
        
        // Initialize integrity checking
        this.initializeIntegrityChecks();
    }

    /**
     * Detect available storage type
     * @private
     */
    detectStorageType() {
        try {
            // Test localStorage
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return 'localStorage';
        } catch {
            // Fall back to memory storage
            console.warn('localStorage not available, using memory storage');
            return 'memory';
        }
    }

    /**
     * Enable encryption for sensitive data
     * @param {string} key - Encryption key
     */
    async enableEncryption(key) {
        try {
            // Generate crypto key from password
            this.encryptionKey = await this.deriveKey(key);
            this.encryptionEnabled = true;
        } catch (error) {
            console.error('Failed to enable encryption:', error);
            this.encryptionEnabled = false;
        }
    }

    /**
     * Derive encryption key from password
     * @private
     */
    async deriveKey(password) {
        const encoder = new TextEncoder();
        const salt = encoder.encode('otto-storage-salt');
        
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypt data
     * @private
     */
    async encrypt(data) {
        if (!this.encryptionEnabled || !this.encryptionKey) {
            return data;
        }

        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(JSON.stringify(data));
            
            // Generate IV
            const iv = crypto.getRandomValues(new Uint8Array(12));
            
            // Encrypt
            const encryptedBuffer = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                this.encryptionKey,
                dataBuffer
            );

            // Combine IV and encrypted data
            const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encryptedBuffer), iv.length);

            // Convert to base64
            return btoa(String.fromCharCode.apply(null, combined));
        } catch (error) {
            console.error('Encryption failed:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt data
     * @private
     */
    async decrypt(encryptedData) {
        if (!this.encryptionEnabled || !this.encryptionKey) {
            return encryptedData;
        }

        try {
            // Convert from base64
            const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
            
            // Extract IV and encrypted data
            const iv = combined.slice(0, 12);
            const encrypted = combined.slice(12);

            // Decrypt
            const decryptedBuffer = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                this.encryptionKey,
                encrypted
            );

            // Convert back to string
            const decoder = new TextDecoder();
            const jsonString = decoder.decode(decryptedBuffer);
            
            return JSON.parse(jsonString);
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Initialize integrity checks for stored data
     * @private
     */
    initializeIntegrityChecks() {
        // Load existing integrity checks
        try {
            const stored = this.getRawItem('__integrity_checks__');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.integrityChecks = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.error('Failed to load integrity checks:', error);
        }
    }

    /**
     * Calculate integrity hash for data
     * @private
     */
    async calculateHash(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Verify data integrity
     * @private
     */
    async verifyIntegrity(key, data) {
        const storedHash = this.integrityChecks.get(key);
        if (!storedHash) {
            return true; // No hash stored, assume valid
        }

        const currentHash = await this.calculateHash(data);
        return currentHash === storedHash;
    }

    /**
     * Update integrity hash
     * @private
     */
    async updateIntegrity(key, data) {
        const hash = await this.calculateHash(data);
        this.integrityChecks.set(key, hash);
        
        // Save integrity checks
        try {
            const checksObject = Object.fromEntries(this.integrityChecks);
            this.setRawItem('__integrity_checks__', JSON.stringify(checksObject));
        } catch (error) {
            console.error('Failed to save integrity checks:', error);
        }
    }

    /**
     * Set item in storage with security measures
     * @param {string} key - Storage key
     * @param {*} value - Value to store
     * @param {Object} options - Storage options
     * @returns {Promise<boolean>} Success status
     */
    async setItem(key, value, options = {}) {
        try {
            // Validate key
            if (!this.isValidKey(key)) {
                throw new Error('Invalid storage key');
            }

            // Check quota
            const size = this.estimateSize(value);
            if (!this.quotaManager.checkQuota(size)) {
                throw new Error('Storage quota exceeded');
            }

            // Prepare data
            const storageData = {
                value: value,
                timestamp: Date.now(),
                version: '1.0',
                expires: options.expires || null
            };

            // Encrypt if needed
            let dataToStore = storageData;
            if (options.encrypt || this.shouldEncrypt(key)) {
                dataToStore = await this.encrypt(storageData);
            }

            // Store data
            const serialized = JSON.stringify(dataToStore);
            this.setRawItem(key, serialized);

            // Update integrity
            await this.updateIntegrity(key, storageData);

            // Update quota tracking
            this.quotaManager.updateUsage(key, size);

            return true;
        } catch (error) {
            console.error(`Failed to store item ${key}:`, error);
            return false;
        }
    }

    /**
     * Get item from storage with security checks
     * @param {string} key - Storage key
     * @param {*} defaultValue - Default value if not found
     * @returns {Promise<*>} Stored value or default
     */
    async getItem(key, defaultValue = null) {
        try {
            // Validate key
            if (!this.isValidKey(key)) {
                return defaultValue;
            }

            // Get raw data
            const raw = this.getRawItem(key);
            if (!raw) {
                return defaultValue;
            }

            // Parse data
            let parsed = JSON.parse(raw);

            // Decrypt if needed
            if (typeof parsed === 'string' && this.encryptionEnabled) {
                try {
                    parsed = await this.decrypt(parsed);
                } catch {
                    // Not encrypted or decryption failed
                }
            }

            // Check structure
            if (!parsed || typeof parsed !== 'object' || !('value' in parsed)) {
                // Legacy format, return as-is
                return parsed;
            }

            // Check expiration
            if (parsed.expires && Date.now() > parsed.expires) {
                await this.removeItem(key);
                return defaultValue;
            }

            // Verify integrity
            const isValid = await this.verifyIntegrity(key, parsed);
            if (!isValid) {
                console.warn(`Integrity check failed for ${key}`);
                await this.removeItem(key);
                return defaultValue;
            }

            return parsed.value;
        } catch (error) {
            console.error(`Failed to retrieve item ${key}:`, error);
            return defaultValue;
        }
    }

    /**
     * Remove item from storage
     * @param {string} key - Storage key
     * @returns {Promise<boolean>} Success status
     */
    async removeItem(key) {
        try {
            this.removeRawItem(key);
            this.integrityChecks.delete(key);
            this.quotaManager.removeUsage(key);
            return true;
        } catch (error) {
            console.error(`Failed to remove item ${key}:`, error);
            return false;
        }
    }

    /**
     * Clear all storage
     * @param {boolean} preserveSettings - Preserve app settings
     * @returns {Promise<boolean>} Success status
     */
    async clear(preserveSettings = true) {
        try {
            const settingsKeys = ['__integrity_checks__', '__quota_usage__', 'otto_settings'];
            const preserved = {};

            // Preserve settings if requested
            if (preserveSettings) {
                for (const key of settingsKeys) {
                    const value = this.getRawItem(key);
                    if (value) {
                        preserved[key] = value;
                    }
                }
            }

            // Clear storage
            this.clearRawStorage();

            // Restore preserved items
            for (const [key, value] of Object.entries(preserved)) {
                this.setRawItem(key, value);
            }

            // Reset tracking
            if (!preserveSettings) {
                this.integrityChecks.clear();
                this.quotaManager.reset();
            }

            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    }

    /**
     * Get all keys
     * @returns {Array<string>} Storage keys
     */
    getKeys() {
        if (this.storageType === 'localStorage') {
            return Object.keys(localStorage).filter(key => 
                !key.startsWith('__') // Exclude internal keys
            );
        } else {
            return Array.from(this.memoryStorage.keys());
        }
    }

    /**
     * Check if key is valid
     * @private
     */
    isValidKey(key) {
        if (typeof key !== 'string' || key.length === 0) {
            return false;
        }

        // Block potentially dangerous keys
        const dangerousPatterns = [
            /^__proto__$/,
            /^constructor$/,
            /^prototype$/
        ];

        return !dangerousPatterns.some(pattern => pattern.test(key));
    }

    /**
     * Check if key should be encrypted
     * @private
     */
    shouldEncrypt(key) {
        const sensitiveKeys = [
            'otto_presets',
            'otto_user_data',
            'otto_api_tokens'
        ];

        return sensitiveKeys.some(sensitive => key.includes(sensitive));
    }

    /**
     * Estimate data size
     * @private
     */
    estimateSize(data) {
        const str = JSON.stringify(data);
        return new Blob([str]).size;
    }

    /**
     * Low-level storage operations
     * @private
     */
    setRawItem(key, value) {
        if (this.storageType === 'localStorage') {
            localStorage.setItem(key, value);
        } else {
            if (!this.memoryStorage) {
                this.memoryStorage = new Map();
            }
            this.memoryStorage.set(key, value);
        }
    }

    getRawItem(key) {
        if (this.storageType === 'localStorage') {
            return localStorage.getItem(key);
        } else {
            return this.memoryStorage?.get(key) || null;
        }
    }

    removeRawItem(key) {
        if (this.storageType === 'localStorage') {
            localStorage.removeItem(key);
        } else {
            this.memoryStorage?.delete(key);
        }
    }

    clearRawStorage() {
        if (this.storageType === 'localStorage') {
            localStorage.clear();
        } else {
            this.memoryStorage?.clear();
        }
    }
}

/**
 * Quota Manager - Manages storage quotas
 */
class QuotaManager {
    constructor() {
        this.maxSize = 10 * 1024 * 1024; // 10MB default
        this.usage = new Map();
        this.loadUsage();
    }

    /**
     * Load usage data
     * @private
     */
    loadUsage() {
        try {
            const stored = localStorage.getItem('__quota_usage__');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.usage = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.error('Failed to load quota usage:', error);
        }
    }

    /**
     * Save usage data
     * @private
     */
    saveUsage() {
        try {
            const usageObject = Object.fromEntries(this.usage);
            localStorage.setItem('__quota_usage__', JSON.stringify(usageObject));
        } catch (error) {
            console.error('Failed to save quota usage:', error);
        }
    }

    /**
     * Check if size fits in quota
     * @param {number} size - Size to check
     * @returns {boolean} Fits in quota
     */
    checkQuota(size) {
        const currentUsage = this.getCurrentUsage();
        return (currentUsage + size) <= this.maxSize;
    }

    /**
     * Get current usage
     * @returns {number} Current usage in bytes
     */
    getCurrentUsage() {
        let total = 0;
        for (const size of this.usage.values()) {
            total += size;
        }
        return total;
    }

    /**
     * Update usage for a key
     * @param {string} key - Storage key
     * @param {number} size - Size in bytes
     */
    updateUsage(key, size) {
        this.usage.set(key, size);
        this.saveUsage();
    }

    /**
     * Remove usage for a key
     * @param {string} key - Storage key
     */
    removeUsage(key) {
        this.usage.delete(key);
        this.saveUsage();
    }

    /**
     * Get usage statistics
     * @returns {Object} Usage stats
     */
    getStats() {
        const current = this.getCurrentUsage();
        return {
            used: current,
            available: this.maxSize - current,
            total: this.maxSize,
            percentage: (current / this.maxSize) * 100
        };
    }

    /**
     * Reset usage tracking
     */
    reset() {
        this.usage.clear();
        this.saveUsage();
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SecureStorage, QuotaManager };
}