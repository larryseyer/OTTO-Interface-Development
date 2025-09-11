/**
 * Security Manager - XSS Prevention and Content Security
 * Provides comprehensive security measures for the OTTO interface
 */

class SecurityManager {
    constructor() {
        this.cspNonce = this.generateNonce();
        this.trustedTypes = null;
        this.sanitizer = new DOMSanitizer();
        this.rateLimiter = new RateLimiter();
        
        // Initialize security measures
        this.initializeCSP();
        this.initializeTrustedTypes();
        this.setupSecurityHeaders();
    }

    /**
     * Generate a secure nonce for CSP
     * @private
     */
    generateNonce() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return btoa(String.fromCharCode.apply(null, array));
    }

    /**
     * Initialize Content Security Policy
     */
    initializeCSP() {
        // Create CSP meta tag if not exists
        let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
        
        if (!cspMeta) {
            cspMeta = document.createElement('meta');
            cspMeta.httpEquiv = 'Content-Security-Policy';
            document.head.appendChild(cspMeta);
        }

        // Set strict CSP directives
        const cspDirectives = [
            `default-src 'self'`,
            `script-src 'self' 'nonce-${this.cspNonce}'`,
            `style-src 'self' 'unsafe-inline'`, // Needed for dynamic styles
            `img-src 'self' data: blob:`,
            `font-src 'self'`,
            `connect-src 'self' https://api.otto-drummer.com`,
            `media-src 'self'`,
            `object-src 'none'`,
            `base-uri 'self'`,
            `form-action 'self'`,
            `frame-ancestors 'none'`,
            `upgrade-insecure-requests`
        ];

        cspMeta.content = cspDirectives.join('; ');
    }

    /**
     * Initialize Trusted Types API if available
     */
    initializeTrustedTypes() {
        if (window.trustedTypes && window.trustedTypes.createPolicy) {
            try {
                this.trustedTypes = window.trustedTypes.createPolicy('otto-security', {
                    createHTML: (input) => this.sanitizer.sanitizeHTML(input),
                    createScript: (input) => {
                        // Block all dynamic script creation
                        console.warn('Dynamic script creation blocked');
                        return '';
                    },
                    createScriptURL: (input) => {
                        // Only allow same-origin scripts
                        const url = new URL(input, window.location.origin);
                        if (url.origin === window.location.origin) {
                            return url.href;
                        }
                        console.warn('Cross-origin script blocked:', input);
                        return '';
                    }
                });
            } catch (error) {
                console.error('Trusted Types initialization failed:', error);
            }
        }
    }

    /**
     * Setup security headers (for server configuration reference)
     */
    setupSecurityHeaders() {
        // These headers should be set server-side, but we document them here
        this.recommendedHeaders = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
        };
    }

    /**
     * Create safe HTML element
     * @param {string} tagName - Element tag name
     * @param {Object} attributes - Element attributes
     * @param {string} content - Element content
     * @returns {HTMLElement} Safe element
     */
    createElement(tagName, attributes = {}, content = '') {
        const element = document.createElement(tagName);

        // Sanitize attributes
        for (const [key, value] of Object.entries(attributes)) {
            if (this.isSafeAttribute(key, value)) {
                element.setAttribute(key, this.sanitizer.sanitizeAttribute(key, value));
            }
        }

        // Sanitize content
        if (content) {
            element.textContent = content; // Use textContent to prevent HTML injection
        }

        return element;
    }

    /**
     * Check if attribute is safe
     * @private
     */
    isSafeAttribute(name, value) {
        // Block event handlers
        if (name.toLowerCase().startsWith('on')) {
            return false;
        }

        // Block javascript: URLs
        if (typeof value === 'string' && value.toLowerCase().includes('javascript:')) {
            return false;
        }

        // Whitelist safe attributes
        const safeAttributes = [
            'id', 'class', 'style', 'title', 'alt', 'src', 'href',
            'type', 'name', 'value', 'placeholder', 'disabled',
            'readonly', 'checked', 'selected', 'data-*'
        ];

        return safeAttributes.some(attr => 
            attr === name || (attr.endsWith('*') && name.startsWith(attr.slice(0, -1)))
        );
    }

    /**
     * Sanitize user input for display
     * @param {string} input - User input
     * @param {Object} options - Sanitization options
     * @returns {string} Sanitized input
     */
    sanitizeInput(input, options = {}) {
        return this.sanitizer.sanitize(input, options);
    }

    /**
     * Validate and sanitize JSON
     * @param {string} jsonString - JSON string to validate
     * @returns {Object|null} Parsed object or null if invalid
     */
    parseJSON(jsonString) {
        try {
            // Remove any BOM
            jsonString = jsonString.replace(/^\uFEFF/, '');
            
            // Basic validation
            if (!jsonString || typeof jsonString !== 'string') {
                return null;
            }

            // Parse JSON
            const parsed = JSON.parse(jsonString);

            // Recursively sanitize strings in the object
            return this.sanitizeObject(parsed);
        } catch (error) {
            console.error('JSON parsing failed:', error);
            return null;
        }
    }

    /**
     * Recursively sanitize object properties
     * @private
     */
    sanitizeObject(obj) {
        if (typeof obj === 'string') {
            return this.sanitizer.sanitize(obj);
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.sanitizeObject(item));
        }

        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(obj)) {
                // Sanitize key
                const safeKey = this.sanitizer.sanitize(key);
                // Recursively sanitize value
                sanitized[safeKey] = this.sanitizeObject(value);
            }
            return sanitized;
        }

        return obj;
    }

    /**
     * Check for clickjacking attempts
     */
    checkFraming() {
        if (window.self !== window.top) {
            // In a frame, potential clickjacking
            document.body.style.display = 'none';
            throw new Error('Framing not allowed');
        }
    }

    /**
     * Generate secure random token
     * @param {number} length - Token length
     * @returns {string} Secure token
     */
    generateToken(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Hash sensitive data
     * @param {string} data - Data to hash
     * @returns {Promise<string>} Hashed data
     */
    async hashData(data) {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Validate URL safety
     * @param {string} url - URL to validate
     * @returns {boolean} Is safe
     */
    isSafeURL(url) {
        try {
            const parsed = new URL(url);
            
            // Block dangerous protocols
            const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
            if (dangerousProtocols.includes(parsed.protocol)) {
                return false;
            }

            // Only allow http(s)
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }
}

/**
 * DOM Sanitizer - Sanitizes HTML content
 */
class DOMSanitizer {
    constructor() {
        // Allowed HTML tags
        this.allowedTags = new Set([
            'div', 'span', 'p', 'a', 'button', 'input', 'select', 'option',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
            'strong', 'em', 'i', 'b', 'br', 'hr'
        ]);

        // Allowed attributes per tag
        this.allowedAttributes = {
            'a': ['href', 'title'],
            'button': ['type', 'class', 'id', 'disabled'],
            'input': ['type', 'name', 'value', 'placeholder', 'disabled', 'readonly'],
            'select': ['name', 'id', 'class'],
            'option': ['value', 'selected'],
            '*': ['class', 'id', 'data-*']
        };
    }

    /**
     * Sanitize HTML string
     * @param {string} html - HTML to sanitize
     * @returns {string} Sanitized HTML
     */
    sanitizeHTML(html) {
        const template = document.createElement('template');
        template.innerHTML = html;
        
        this.sanitizeNode(template.content);
        
        return template.innerHTML;
    }

    /**
     * Recursively sanitize DOM node
     * @private
     */
    sanitizeNode(node) {
        const nodesToRemove = [];

        for (const child of node.childNodes) {
            if (child.nodeType === Node.ELEMENT_NODE) {
                const tagName = child.tagName.toLowerCase();

                if (!this.allowedTags.has(tagName)) {
                    nodesToRemove.push(child);
                } else {
                    // Sanitize attributes
                    this.sanitizeAttributes(child);
                    // Recursively sanitize children
                    this.sanitizeNode(child);
                }
            } else if (child.nodeType === Node.TEXT_NODE) {
                // Text nodes are safe
                continue;
            } else {
                // Remove other node types (comments, etc.)
                nodesToRemove.push(child);
            }
        }

        // Remove unsafe nodes
        nodesToRemove.forEach(n => n.parentNode.removeChild(n));
    }

    /**
     * Sanitize element attributes
     * @private
     */
    sanitizeAttributes(element) {
        const tagName = element.tagName.toLowerCase();
        const allowedAttrs = [
            ...(this.allowedAttributes[tagName] || []),
            ...(this.allowedAttributes['*'] || [])
        ];

        const attributesToRemove = [];

        for (const attr of element.attributes) {
            const attrName = attr.name.toLowerCase();
            
            // Check if attribute is allowed
            let isAllowed = false;
            for (const allowed of allowedAttrs) {
                if (allowed.endsWith('*')) {
                    if (attrName.startsWith(allowed.slice(0, -1))) {
                        isAllowed = true;
                        break;
                    }
                } else if (attrName === allowed) {
                    isAllowed = true;
                    break;
                }
            }

            if (!isAllowed || attrName.startsWith('on')) {
                attributesToRemove.push(attrName);
            } else {
                // Sanitize attribute value
                attr.value = this.sanitizeAttribute(attrName, attr.value);
            }
        }

        // Remove unsafe attributes
        attributesToRemove.forEach(name => element.removeAttribute(name));
    }

    /**
     * Sanitize attribute value
     * @param {string} name - Attribute name
     * @param {string} value - Attribute value
     * @returns {string} Sanitized value
     */
    sanitizeAttribute(name, value) {
        // Remove javascript: and data: URLs
        if (name === 'href' || name === 'src') {
            if (value.toLowerCase().startsWith('javascript:') || 
                value.toLowerCase().startsWith('data:')) {
                return '#';
            }
        }

        // HTML encode
        return this.sanitize(value);
    }

    /**
     * Basic string sanitization
     * @param {string} str - String to sanitize
     * @returns {string} Sanitized string
     */
    sanitize(str) {
        if (typeof str !== 'string') {
            return String(str);
        }

        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;',
            '`': '&#x60;',
            '=': '&#x3D;'
        };

        return str.replace(/[&<>"'`=\/]/g, char => htmlEntities[char]);
    }
}

/**
 * Rate Limiter - Prevents abuse
 */
class RateLimiter {
    constructor() {
        this.limits = new Map();
        this.defaultLimit = {
            maxRequests: 100,
            windowMs: 60000 // 1 minute
        };
    }

    /**
     * Check if action is rate limited
     * @param {string} action - Action identifier
     * @param {Object} options - Rate limit options
     * @returns {boolean} Is allowed
     */
    checkLimit(action, options = {}) {
        const limit = { ...this.defaultLimit, ...options };
        const now = Date.now();
        
        if (!this.limits.has(action)) {
            this.limits.set(action, {
                requests: [],
                blocked: false
            });
        }

        const actionLimit = this.limits.get(action);
        
        // Remove old requests outside the window
        actionLimit.requests = actionLimit.requests.filter(
            time => now - time < limit.windowMs
        );

        // Check if limit exceeded
        if (actionLimit.requests.length >= limit.maxRequests) {
            actionLimit.blocked = true;
            return false;
        }

        // Add current request
        actionLimit.requests.push(now);
        actionLimit.blocked = false;
        
        return true;
    }

    /**
     * Reset limits for an action
     * @param {string} action - Action identifier
     */
    resetLimit(action) {
        this.limits.delete(action);
    }

    /**
     * Get current limit status
     * @param {string} action - Action identifier
     * @returns {Object} Limit status
     */
    getStatus(action) {
        if (!this.limits.has(action)) {
            return { requests: 0, blocked: false };
        }

        const actionLimit = this.limits.get(action);
        return {
            requests: actionLimit.requests.length,
            blocked: actionLimit.blocked
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SecurityManager, DOMSanitizer, RateLimiter };
}