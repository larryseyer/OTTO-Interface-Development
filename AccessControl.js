/**
 * Access Control System - Feature flags, permissions, and session management
 */

class AccessControl {
    constructor() {
        this.permissions = new PermissionManager();
        this.featureFlags = new FeatureFlagManager();
        this.sessionManager = new SessionManager();
        this.auditLog = new AuditLog();
        
        // Initialize system
        this.initialize();
    }

    /**
     * Initialize access control system
     * @private
     */
    async initialize() {
        await this.sessionManager.initialize();
        await this.permissions.loadPermissions();
        await this.featureFlags.loadFlags();
        
        // Start session monitoring
        this.startSessionMonitoring();
    }

    /**
     * Check if user has permission
     * @param {string} permission - Permission to check
     * @returns {boolean} Has permission
     */
    hasPermission(permission) {
        // Log access attempt
        this.auditLog.logAccess(permission);
        
        // Check session validity
        if (!this.sessionManager.isValid()) {
            this.auditLog.logEvent('session-invalid', { permission });
            return false;
        }

        // Check permission
        const hasAccess = this.permissions.check(permission);
        
        if (!hasAccess) {
            this.auditLog.logEvent('permission-denied', { permission });
        }
        
        return hasAccess;
    }

    /**
     * Check if feature is enabled
     * @param {string} feature - Feature flag name
     * @returns {boolean} Is enabled
     */
    isFeatureEnabled(feature) {
        return this.featureFlags.isEnabled(feature);
    }

    /**
     * Require permission (throws if not granted)
     * @param {string} permission - Required permission
     */
    requirePermission(permission) {
        if (!this.hasPermission(permission)) {
            throw new Error(`Permission denied: ${permission}`);
        }
    }

    /**
     * Start session monitoring
     * @private
     */
    startSessionMonitoring() {
        // Monitor for session timeout
        setInterval(() => {
            if (this.sessionManager.isExpired()) {
                this.handleSessionExpired();
            }
        }, 60000); // Check every minute

        // Monitor for suspicious activity
        window.addEventListener('storage', (e) => {
            if (e.key === 'otto_session') {
                this.handleSessionChange(e);
            }
        });
    }

    /**
     * Handle expired session
     * @private
     */
    handleSessionExpired() {
        this.auditLog.logEvent('session-expired');
        this.sessionManager.destroy();
        
        // Notify user
        if (window.OTTOInterface) {
            window.OTTOInterface.showNotification('Session expired. Please refresh the page.');
        }
    }

    /**
     * Handle session change
     * @private
     */
    handleSessionChange(event) {
        if (!event.newValue) {
            // Session deleted
            this.auditLog.logEvent('session-deleted');
            this.sessionManager.destroy();
        } else if (event.oldValue && event.newValue !== event.oldValue) {
            // Session modified
            this.auditLog.logEvent('session-modified');
            // Validate new session
            if (!this.sessionManager.validateSession(event.newValue)) {
                this.sessionManager.destroy();
            }
        }
    }
}

/**
 * Permission Manager
 */
class PermissionManager {
    constructor() {
        this.permissions = new Set();
        this.roles = new Map();
        this.currentRole = 'user';
        
        // Define default roles and permissions
        this.defineDefaultRoles();
    }

    /**
     * Define default roles
     * @private
     */
    defineDefaultRoles() {
        // Admin role - all permissions
        this.roles.set('admin', new Set([
            'preset.create',
            'preset.edit',
            'preset.delete',
            'preset.share',
            'pattern.create',
            'pattern.edit',
            'pattern.delete',
            'kit.create',
            'kit.edit',
            'kit.delete',
            'settings.modify',
            'data.export',
            'data.import',
            'debug.access'
        ]));

        // User role - standard permissions
        this.roles.set('user', new Set([
            'preset.create',
            'preset.edit',
            'preset.delete',
            'pattern.create',
            'pattern.edit',
            'pattern.delete',
            'kit.edit',
            'data.export',
            'data.import'
        ]));

        // Guest role - limited permissions
        this.roles.set('guest', new Set([
            'preset.create',
            'pattern.create',
            'data.export'
        ]));
    }

    /**
     * Load permissions from storage
     */
    async loadPermissions() {
        try {
            const stored = localStorage.getItem('otto_permissions');
            if (stored) {
                const data = JSON.parse(stored);
                this.currentRole = data.role || 'user';
                if (data.customPermissions) {
                    this.permissions = new Set(data.customPermissions);
                } else {
                    this.permissions = this.roles.get(this.currentRole) || new Set();
                }
            } else {
                // Default to user role
                this.setRole('user');
            }
        } catch (error) {
            console.error('Failed to load permissions:', error);
            this.setRole('user');
        }
    }

    /**
     * Save permissions to storage
     * @private
     */
    savePermissions() {
        try {
            const data = {
                role: this.currentRole,
                customPermissions: Array.from(this.permissions)
            };
            localStorage.setItem('otto_permissions', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save permissions:', error);
        }
    }

    /**
     * Set user role
     * @param {string} role - Role name
     */
    setRole(role) {
        if (this.roles.has(role)) {
            this.currentRole = role;
            this.permissions = new Set(this.roles.get(role));
            this.savePermissions();
        }
    }

    /**
     * Check permission
     * @param {string} permission - Permission to check
     * @returns {boolean} Has permission
     */
    check(permission) {
        // Check wildcard permissions
        const parts = permission.split('.');
        for (let i = parts.length; i > 0; i--) {
            const wildcardPerm = parts.slice(0, i - 1).join('.') + '.*';
            if (this.permissions.has(wildcardPerm)) {
                return true;
            }
        }
        
        return this.permissions.has(permission);
    }

    /**
     * Grant permission
     * @param {string} permission - Permission to grant
     */
    grant(permission) {
        this.permissions.add(permission);
        this.savePermissions();
    }

    /**
     * Revoke permission
     * @param {string} permission - Permission to revoke
     */
    revoke(permission) {
        this.permissions.delete(permission);
        this.savePermissions();
    }

    /**
     * Get all permissions
     * @returns {Array} Permission list
     */
    getAllPermissions() {
        return Array.from(this.permissions);
    }
}

/**
 * Feature Flag Manager
 */
class FeatureFlagManager {
    constructor() {
        this.flags = new Map();
        this.overrides = new Map();
        
        // Define default flags
        this.defineDefaultFlags();
    }

    /**
     * Define default feature flags
     * @private
     */
    defineDefaultFlags() {
        this.flags.set('newUI', {
            enabled: true,
            description: 'New UI components',
            rollout: 100 // Percentage
        });

        this.flags.set('advancedPatterns', {
            enabled: true,
            description: 'Advanced pattern editing',
            rollout: 100
        });

        this.flags.set('cloudSync', {
            enabled: false,
            description: 'Cloud synchronization',
            rollout: 0
        });

        this.flags.set('experimentalFeatures', {
            enabled: false,
            description: 'Experimental features',
            rollout: 0
        });

        this.flags.set('debugMode', {
            enabled: false,
            description: 'Debug mode',
            rollout: 0
        });

        this.flags.set('performanceMode', {
            enabled: true,
            description: 'Performance optimizations',
            rollout: 100
        });
    }

    /**
     * Load flags from storage
     */
    async loadFlags() {
        try {
            const stored = localStorage.getItem('otto_feature_flags');
            if (stored) {
                const data = JSON.parse(stored);
                // Apply overrides
                for (const [key, value] of Object.entries(data)) {
                    this.overrides.set(key, value);
                }
            }
        } catch (error) {
            console.error('Failed to load feature flags:', error);
        }

        // Check for URL parameters
        this.checkURLFlags();
    }

    /**
     * Check URL for feature flag overrides
     * @private
     */
    checkURLFlags() {
        const params = new URLSearchParams(window.location.search);
        
        for (const [key, value] of params) {
            if (key.startsWith('ff_')) {
                const flagName = key.substring(3);
                this.overrides.set(flagName, value === 'true');
            }
        }
    }

    /**
     * Check if feature is enabled
     * @param {string} feature - Feature name
     * @returns {boolean} Is enabled
     */
    isEnabled(feature) {
        // Check override first
        if (this.overrides.has(feature)) {
            return this.overrides.get(feature);
        }

        // Check flag definition
        const flag = this.flags.get(feature);
        if (!flag) {
            return false;
        }

        // Check if enabled
        if (!flag.enabled) {
            return false;
        }

        // Check rollout percentage
        if (flag.rollout < 100) {
            const userId = this.getUserId();
            const hash = this.hashCode(userId + feature);
            const percentage = Math.abs(hash) % 100;
            return percentage < flag.rollout;
        }

        return true;
    }

    /**
     * Set feature flag override
     * @param {string} feature - Feature name
     * @param {boolean} enabled - Enabled status
     */
    setOverride(feature, enabled) {
        this.overrides.set(feature, enabled);
        this.saveOverrides();
    }

    /**
     * Save overrides to storage
     * @private
     */
    saveOverrides() {
        try {
            const data = Object.fromEntries(this.overrides);
            localStorage.setItem('otto_feature_flags', JSON.stringify(data));
        } catch (error) {
            console.error('Failed to save feature flags:', error);
        }
    }

    /**
     * Get user ID for rollout
     * @private
     */
    getUserId() {
        let userId = localStorage.getItem('otto_user_id');
        if (!userId) {
            userId = this.generateUserId();
            localStorage.setItem('otto_user_id', userId);
        }
        return userId;
    }

    /**
     * Generate user ID
     * @private
     */
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Hash code for rollout calculation
     * @private
     */
    hashCode(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash;
    }

    /**
     * Get all flags
     * @returns {Object} All flags with status
     */
    getAllFlags() {
        const result = {};
        
        for (const [name, flag] of this.flags) {
            result[name] = {
                ...flag,
                enabled: this.isEnabled(name),
                overridden: this.overrides.has(name)
            };
        }
        
        return result;
    }
}

/**
 * Session Manager
 */
class SessionManager {
    constructor() {
        this.sessionId = null;
        this.sessionData = {};
        this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
        this.lastActivity = Date.now();
    }

    /**
     * Initialize session
     */
    async initialize() {
        // Load existing session
        const stored = sessionStorage.getItem('otto_session');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                if (this.validateSession(data)) {
                    this.sessionId = data.id;
                    this.sessionData = data.data || {};
                    this.lastActivity = data.lastActivity || Date.now();
                } else {
                    this.createSession();
                }
            } catch {
                this.createSession();
            }
        } else {
            this.createSession();
        }

        // Update activity on user interaction
        this.setupActivityTracking();
    }

    /**
     * Create new session
     * @private
     */
    createSession() {
        this.sessionId = this.generateSessionId();
        this.sessionData = {
            created: Date.now(),
            userAgent: navigator.userAgent,
            screen: {
                width: screen.width,
                height: screen.height
            }
        };
        this.lastActivity = Date.now();
        this.saveSession();
    }

    /**
     * Generate session ID
     * @private
     */
    generateSessionId() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Validate session data
     * @param {Object} data - Session data
     * @returns {boolean} Is valid
     */
    validateSession(data) {
        if (!data || !data.id) {
            return false;
        }

        // Check expiration
        const age = Date.now() - (data.lastActivity || 0);
        if (age > this.sessionTimeout) {
            return false;
        }

        // Validate structure
        if (typeof data.id !== 'string' || data.id.length !== 64) {
            return false;
        }

        return true;
    }

    /**
     * Save session to storage
     * @private
     */
    saveSession() {
        const data = {
            id: this.sessionId,
            data: this.sessionData,
            lastActivity: this.lastActivity
        };
        sessionStorage.setItem('otto_session', JSON.stringify(data));
    }

    /**
     * Setup activity tracking
     * @private
     */
    setupActivityTracking() {
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
        
        const updateActivity = () => {
            const now = Date.now();
            if (now - this.lastActivity > 60000) { // Update every minute
                this.lastActivity = now;
                this.saveSession();
            }
        };

        events.forEach(event => {
            window.addEventListener(event, updateActivity, { passive: true });
        });
    }

    /**
     * Check if session is valid
     * @returns {boolean} Is valid
     */
    isValid() {
        return this.sessionId !== null && !this.isExpired();
    }

    /**
     * Check if session is expired
     * @returns {boolean} Is expired
     */
    isExpired() {
        return (Date.now() - this.lastActivity) > this.sessionTimeout;
    }

    /**
     * Get session data
     * @param {string} key - Data key
     * @returns {*} Data value
     */
    get(key) {
        return this.sessionData[key];
    }

    /**
     * Set session data
     * @param {string} key - Data key
     * @param {*} value - Data value
     */
    set(key, value) {
        this.sessionData[key] = value;
        this.saveSession();
    }

    /**
     * Destroy session
     */
    destroy() {
        this.sessionId = null;
        this.sessionData = {};
        sessionStorage.removeItem('otto_session');
    }
}

/**
 * Audit Log
 */
class AuditLog {
    constructor() {
        this.events = [];
        this.maxEvents = 1000;
        this.flushInterval = 5 * 60 * 1000; // 5 minutes
        
        // Start periodic flush
        setInterval(() => this.flush(), this.flushInterval);
    }

    /**
     * Log access attempt
     * @param {string} resource - Resource accessed
     */
    logAccess(resource) {
        this.logEvent('access', { resource });
    }

    /**
     * Log generic event
     * @param {string} type - Event type
     * @param {Object} data - Event data
     */
    logEvent(type, data = {}) {
        const event = {
            type,
            timestamp: Date.now(),
            sessionId: sessionStorage.getItem('otto_session_id'),
            ...data
        };

        this.events.push(event);

        // Trim if too many events
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }

        // Log critical events immediately
        if (this.isCritical(type)) {
            console.warn('Security event:', event);
            this.flush();
        }
    }

    /**
     * Check if event is critical
     * @private
     */
    isCritical(type) {
        const critical = [
            'permission-denied',
            'session-hijack',
            'invalid-token',
            'rate-limit-exceeded'
        ];
        return critical.includes(type);
    }

    /**
     * Flush events to storage/server
     * @private
     */
    flush() {
        if (this.events.length === 0) {
            return;
        }

        // Save to local storage (in production, send to server)
        try {
            const existing = localStorage.getItem('otto_audit_log');
            const allEvents = existing ? JSON.parse(existing) : [];
            allEvents.push(...this.events);
            
            // Keep only recent events
            const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
            const recent = allEvents.filter(e => e.timestamp > cutoff);
            
            localStorage.setItem('otto_audit_log', JSON.stringify(recent));
            
            this.events = [];
        } catch (error) {
            console.error('Failed to flush audit log:', error);
        }
    }

    /**
     * Get recent events
     * @param {number} limit - Number of events
     * @returns {Array} Recent events
     */
    getRecentEvents(limit = 100) {
        try {
            const stored = localStorage.getItem('otto_audit_log');
            const allEvents = stored ? JSON.parse(stored) : [];
            return [...allEvents, ...this.events]
                .sort((a, b) => b.timestamp - a.timestamp)
                .slice(0, limit);
        } catch {
            return this.events.slice(-limit);
        }
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        AccessControl,
        PermissionManager,
        FeatureFlagManager,
        SessionManager,
        AuditLog
    };
}