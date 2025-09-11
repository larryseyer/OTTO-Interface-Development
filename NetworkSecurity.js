/**
 * Network Security - Secure network communications and API interactions
 */

class NetworkSecurity {
    constructor() {
        this.trustedOrigins = new Set([
            window.location.origin,
            'https://api.otto-drummer.com',
            'https://otto-drummer.com'
        ]);
        
        this.requestValidator = new RequestValidator();
        this.responseValidator = new ResponseValidator();
        this.corsPolicy = new CORSPolicy();
        this.rateLimiter = new NetworkRateLimiter();
        
        // API token management
        this.apiTokens = new Map();
        this.tokenRefreshCallbacks = new Map();
        
        // Initialize interceptors
        this.initializeInterceptors();
    }

    /**
     * Initialize request/response interceptors
     * @private
     */
    initializeInterceptors() {
        // Store original fetch
        this._originalFetch = window.fetch;
        
        // Override fetch with security wrapper
        window.fetch = async (url, options = {}) => {
            return this.secureFetch(url, options);
        };

        // XMLHttpRequest interceptor
        this.interceptXHR();
    }

    /**
     * Secure fetch wrapper
     * @param {string|URL} url - Request URL
     * @param {Object} options - Fetch options
     * @returns {Promise<Response>} Secure response
     */
    async secureFetch(url, options = {}) {
        try {
            // Validate URL
            const validatedUrl = this.validateURL(url);
            if (!validatedUrl) {
                throw new Error('Invalid or untrusted URL');
            }

            // Check rate limiting
            if (!this.rateLimiter.checkLimit(validatedUrl.hostname)) {
                throw new Error('Rate limit exceeded');
            }

            // Validate request
            const secureOptions = await this.requestValidator.validate(options);

            // Add security headers
            secureOptions.headers = {
                ...secureOptions.headers,
                'X-Requested-With': 'OTTOInterface',
                'X-CSRF-Token': this.getCSRFToken()
            };

            // Add API token if needed
            const token = this.getAPIToken(validatedUrl.hostname);
            if (token) {
                secureOptions.headers['Authorization'] = `Bearer ${token}`;
            }

            // Enforce HTTPS
            if (validatedUrl.protocol !== 'https:' && validatedUrl.hostname !== 'localhost') {
                validatedUrl.protocol = 'https:';
            }

            // Make request
            const response = await this._originalFetch(validatedUrl.toString(), secureOptions);

            // Validate response
            const validatedResponse = await this.responseValidator.validate(response);

            // Check for token refresh
            if (response.status === 401 && this.tokenRefreshCallbacks.has(validatedUrl.hostname)) {
                const refreshCallback = this.tokenRefreshCallbacks.get(validatedUrl.hostname);
                const newToken = await refreshCallback();
                if (newToken) {
                    this.setAPIToken(validatedUrl.hostname, newToken);
                    // Retry with new token
                    secureOptions.headers['Authorization'] = `Bearer ${newToken}`;
                    return this._originalFetch(validatedUrl.toString(), secureOptions);
                }
            }

            return validatedResponse;
        } catch (error) {
            console.error('Secure fetch error:', error);
            throw error;
        }
    }

    /**
     * Validate URL
     * @private
     */
    validateURL(url) {
        try {
            const parsed = new URL(url, window.location.origin);

            // Check protocol
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                console.warn('Invalid protocol:', parsed.protocol);
                return null;
            }

            // Check trusted origins for cross-origin requests
            if (parsed.origin !== window.location.origin) {
                if (!this.trustedOrigins.has(parsed.origin)) {
                    console.warn('Untrusted origin:', parsed.origin);
                    return null;
                }
            }

            // Check for suspicious patterns
            const suspiciousPatterns = [
                /\.\.\//g,  // Path traversal
                /<script/gi, // Script injection
                /javascript:/gi, // JavaScript protocol
                /data:/gi  // Data URLs (for most cases)
            ];

            const urlString = parsed.toString();
            for (const pattern of suspiciousPatterns) {
                if (pattern.test(urlString)) {
                    console.warn('Suspicious URL pattern detected');
                    return null;
                }
            }

            return parsed;
        } catch (error) {
            console.error('URL validation error:', error);
            return null;
        }
    }

    /**
     * Intercept XMLHttpRequest
     * @private
     */
    interceptXHR() {
        const originalOpen = XMLHttpRequest.prototype.open;
        const originalSend = XMLHttpRequest.prototype.send;
        const self = this;

        XMLHttpRequest.prototype.open = function(method, url, async = true, user, password) {
            this._securityUrl = url;
            this._securityMethod = method;
            return originalOpen.apply(this, arguments);
        };

        XMLHttpRequest.prototype.send = function(data) {
            // Validate URL
            const validatedUrl = self.validateURL(this._securityUrl);
            if (!validatedUrl) {
                throw new Error('XHR blocked: Invalid URL');
            }

            // Add security headers
            this.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            this.setRequestHeader('X-CSRF-Token', self.getCSRFToken());

            return originalSend.apply(this, arguments);
        };
    }

    /**
     * Get CSRF token
     * @private
     */
    getCSRFToken() {
        let token = sessionStorage.getItem('csrf_token');
        if (!token) {
            token = this.generateToken();
            sessionStorage.setItem('csrf_token', token);
        }
        return token;
    }

    /**
     * Generate secure token
     * @private
     */
    generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Set API token for a domain
     * @param {string} domain - Domain
     * @param {string} token - API token
     */
    setAPIToken(domain, token) {
        this.apiTokens.set(domain, token);
    }

    /**
     * Get API token for a domain
     * @param {string} domain - Domain
     * @returns {string|null} API token
     */
    getAPIToken(domain) {
        return this.apiTokens.get(domain) || null;
    }

    /**
     * Register token refresh callback
     * @param {string} domain - Domain
     * @param {Function} callback - Refresh callback
     */
    registerTokenRefresh(domain, callback) {
        this.tokenRefreshCallbacks.set(domain, callback);
    }

    /**
     * Add trusted origin
     * @param {string} origin - Origin to trust
     */
    addTrustedOrigin(origin) {
        try {
            const url = new URL(origin);
            this.trustedOrigins.add(url.origin);
        } catch (error) {
            console.error('Invalid origin:', origin);
        }
    }
}

/**
 * Request Validator
 */
class RequestValidator {
    constructor() {
        this.maxBodySize = 5 * 1024 * 1024; // 5MB
        this.allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
        this.allowedContentTypes = [
            'application/json',
            'application/x-www-form-urlencoded',
            'multipart/form-data',
            'text/plain'
        ];
    }

    /**
     * Validate request options
     * @param {Object} options - Request options
     * @returns {Object} Validated options
     */
    async validate(options) {
        const validated = { ...options };

        // Validate method
        if (validated.method) {
            const method = validated.method.toUpperCase();
            if (!this.allowedMethods.includes(method)) {
                throw new Error(`Invalid HTTP method: ${method}`);
            }
            validated.method = method;
        }

        // Validate headers
        if (validated.headers) {
            validated.headers = this.validateHeaders(validated.headers);
        } else {
            validated.headers = {};
        }

        // Validate body
        if (validated.body) {
            validated.body = await this.validateBody(validated.body, validated.headers);
        }

        // Set default credentials
        if (!validated.credentials) {
            validated.credentials = 'same-origin';
        }

        // Set default mode
        if (!validated.mode) {
            validated.mode = 'cors';
        }

        return validated;
    }

    /**
     * Validate headers
     * @private
     */
    validateHeaders(headers) {
        const validated = {};
        const dangerous = ['cookie', 'host', 'origin', 'referer'];

        for (const [key, value] of Object.entries(headers)) {
            const lowerKey = key.toLowerCase();
            
            // Skip dangerous headers
            if (dangerous.includes(lowerKey)) {
                console.warn(`Skipping dangerous header: ${key}`);
                continue;
            }

            // Validate value
            if (typeof value !== 'string') {
                console.warn(`Invalid header value for ${key}`);
                continue;
            }

            validated[key] = value;
        }

        return validated;
    }

    /**
     * Validate request body
     * @private
     */
    async validateBody(body, headers) {
        // Check size for string/object bodies
        if (typeof body === 'string' || typeof body === 'object') {
            const size = new Blob([JSON.stringify(body)]).size;
            if (size > this.maxBodySize) {
                throw new Error('Request body too large');
            }
        }

        // Validate based on content type
        const contentType = headers['Content-Type'] || headers['content-type'];
        if (contentType) {
            const baseType = contentType.split(';')[0].trim();
            if (!this.allowedContentTypes.includes(baseType)) {
                throw new Error(`Unsupported content type: ${baseType}`);
            }
        }

        // Sanitize JSON bodies
        if (typeof body === 'object' && !(body instanceof FormData)) {
            return this.sanitizeObject(body);
        }

        return body;
    }

    /**
     * Sanitize object for transmission
     * @private
     */
    sanitizeObject(obj) {
        const sanitized = {};
        
        for (const [key, value] of Object.entries(obj)) {
            // Skip prototype pollution keys
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue;
            }

            if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }
}

/**
 * Response Validator
 */
class ResponseValidator {
    constructor() {
        this.maxResponseSize = 10 * 1024 * 1024; // 10MB
        this.trustedContentTypes = [
            'application/json',
            'text/plain',
            'text/html',
            'application/xml'
        ];
    }

    /**
     * Validate response
     * @param {Response} response - Fetch response
     * @returns {Response} Validated response
     */
    async validate(response) {
        // Check response status
        if (!response.ok && response.status >= 500) {
            console.error('Server error:', response.status);
        }

        // Validate headers
        this.validateResponseHeaders(response.headers);

        // Check content type
        const contentType = response.headers.get('content-type');
        if (contentType) {
            const baseType = contentType.split(';')[0].trim();
            if (!this.trustedContentTypes.some(type => baseType.includes(type))) {
                console.warn('Untrusted content type:', baseType);
            }
        }

        // Check size
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > this.maxResponseSize) {
            throw new Error('Response too large');
        }

        return response;
    }

    /**
     * Validate response headers
     * @private
     */
    validateResponseHeaders(headers) {
        // Check for security headers
        const securityHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection'
        ];

        for (const header of securityHeaders) {
            if (!headers.has(header)) {
                console.warn(`Missing security header: ${header}`);
            }
        }
    }
}

/**
 * CORS Policy Manager
 */
class CORSPolicy {
    constructor() {
        this.allowedOrigins = new Set([window.location.origin]);
        this.allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
        this.allowedHeaders = ['Content-Type', 'Authorization', 'X-Requested-With'];
        this.maxAge = 86400; // 24 hours
    }

    /**
     * Check if origin is allowed
     * @param {string} origin - Origin to check
     * @returns {boolean} Is allowed
     */
    isOriginAllowed(origin) {
        return this.allowedOrigins.has(origin) || this.allowedOrigins.has('*');
    }

    /**
     * Add allowed origin
     * @param {string} origin - Origin to allow
     */
    addAllowedOrigin(origin) {
        this.allowedOrigins.add(origin);
    }

    /**
     * Get CORS headers
     * @returns {Object} CORS headers
     */
    getCORSHeaders() {
        return {
            'Access-Control-Allow-Origin': Array.from(this.allowedOrigins).join(', '),
            'Access-Control-Allow-Methods': this.allowedMethods.join(', '),
            'Access-Control-Allow-Headers': this.allowedHeaders.join(', '),
            'Access-Control-Max-Age': this.maxAge.toString()
        };
    }
}

/**
 * Network Rate Limiter
 */
class NetworkRateLimiter {
    constructor() {
        this.limits = new Map();
        this.defaultLimit = {
            maxRequests: 60,
            windowMs: 60000 // 1 minute
        };
    }

    /**
     * Check if request is allowed
     * @param {string} identifier - Request identifier (e.g., hostname)
     * @returns {boolean} Is allowed
     */
    checkLimit(identifier) {
        const now = Date.now();
        
        if (!this.limits.has(identifier)) {
            this.limits.set(identifier, {
                requests: [],
                blocked: false
            });
        }

        const limit = this.limits.get(identifier);
        
        // Remove old requests
        limit.requests = limit.requests.filter(
            time => now - time < this.defaultLimit.windowMs
        );

        // Check limit
        if (limit.requests.length >= this.defaultLimit.maxRequests) {
            limit.blocked = true;
            console.warn(`Rate limit exceeded for ${identifier}`);
            return false;
        }

        // Add current request
        limit.requests.push(now);
        limit.blocked = false;
        
        return true;
    }

    /**
     * Reset limits for an identifier
     * @param {string} identifier - Request identifier
     */
    resetLimit(identifier) {
        this.limits.delete(identifier);
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NetworkSecurity,
        RequestValidator,
        ResponseValidator,
        CORSPolicy,
        NetworkRateLimiter
    };
}