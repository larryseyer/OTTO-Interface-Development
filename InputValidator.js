/**
 * Input Validation Framework
 * Comprehensive validation for all user inputs with security focus
 */

class InputValidator {
    constructor() {
        // Validation rules registry
        this.rules = new Map();
        this.customValidators = new Map();
        
        // Initialize default rules
        this.initializeDefaultRules();
    }

    /**
     * Initialize default validation rules
     */
    initializeDefaultRules() {
        // String validators
        this.addRule('string', {
            minLength: 0,
            maxLength: 1000,
            pattern: null,
            allowEmpty: true,
            trim: true,
            sanitize: true
        });

        // Number validators
        this.addRule('number', {
            min: -Infinity,
            max: Infinity,
            integer: false,
            positive: false,
            allowNaN: false,
            allowInfinity: false
        });

        // Common patterns
        this.patterns = {
            email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
            alphanumeric: /^[a-zA-Z0-9]+$/,
            alphaDash: /^[a-zA-Z0-9_-]+$/,
            filename: /^[a-zA-Z0-9_\-\.\s]+$/,
            presetName: /^[a-zA-Z0-9\s\-_()]+$/,
            patternName: /^[a-zA-Z0-9\s\-_]+$/,
            hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
            tempo: /^([3-9][0-9]|[1-2][0-9]{2}|300)$/, // 30-300 BPM
            percentage: /^(100|[1-9]?[0-9])$/ // 0-100
        };

        // OTTO-specific validators
        this.addRule('presetName', {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            pattern: this.patterns.presetName,
            sanitize: true
        });

        this.addRule('patternName', {
            type: 'string',
            minLength: 1,
            maxLength: 30,
            pattern: this.patterns.patternName,
            sanitize: true
        });

        this.addRule('kitName', {
            type: 'string',
            minLength: 1,
            maxLength: 30,
            allowedValues: ['Acoustic', 'Electronic', 'Rock', 'Jazz', 'Pop', 'Funk', 'Latin', 'Vintage']
        });

        this.addRule('tempo', {
            type: 'number',
            min: 30,
            max: 300,
            integer: true
        });

        this.addRule('sliderValue', {
            type: 'number',
            min: 0,
            max: 100,
            integer: false
        });

        this.addRule('playerNumber', {
            type: 'number',
            min: 1,
            max: 8,
            integer: true
        });
    }

    /**
     * Add a validation rule
     * @param {string} name - Rule name
     * @param {Object} config - Rule configuration
     */
    addRule(name, config) {
        this.rules.set(name, config);
    }

    /**
     * Add a custom validator function
     * @param {string} name - Validator name
     * @param {Function} validator - Validator function
     */
    addCustomValidator(name, validator) {
        this.customValidators.set(name, validator);
    }

    /**
     * Validate input against rules
     * @param {*} value - Value to validate
     * @param {string|Object} rules - Rule name or rule config
     * @returns {Object} Validation result
     */
    validate(value, rules) {
        const result = {
            valid: true,
            value: value,
            errors: [],
            warnings: []
        };

        // Get rule configuration
        let ruleConfig;
        if (typeof rules === 'string') {
            ruleConfig = this.rules.get(rules);
            if (!ruleConfig) {
                result.valid = false;
                result.errors.push(`Unknown validation rule: ${rules}`);
                return result;
            }
        } else {
            ruleConfig = rules;
        }

        // Apply validation based on type
        if (ruleConfig.type) {
            const typeResult = this.validateType(value, ruleConfig.type);
            if (!typeResult.valid) {
                result.valid = false;
                result.errors.push(...typeResult.errors);
                return result;
            }
        }

        // String validation
        if (typeof value === 'string' || ruleConfig.type === 'string') {
            const stringResult = this.validateString(value, ruleConfig);
            result.valid = result.valid && stringResult.valid;
            result.value = stringResult.value;
            result.errors.push(...stringResult.errors);
            result.warnings.push(...stringResult.warnings);
        }

        // Number validation
        if (typeof value === 'number' || ruleConfig.type === 'number') {
            const numberResult = this.validateNumber(value, ruleConfig);
            result.valid = result.valid && numberResult.valid;
            result.value = numberResult.value;
            result.errors.push(...numberResult.errors);
        }

        // Array validation
        if (Array.isArray(value) && ruleConfig.arrayRules) {
            const arrayResult = this.validateArray(value, ruleConfig.arrayRules);
            result.valid = result.valid && arrayResult.valid;
            result.errors.push(...arrayResult.errors);
        }

        // Object validation
        if (typeof value === 'object' && !Array.isArray(value) && ruleConfig.objectRules) {
            const objectResult = this.validateObject(value, ruleConfig.objectRules);
            result.valid = result.valid && objectResult.valid;
            result.errors.push(...objectResult.errors);
        }

        // Custom validator
        if (ruleConfig.custom) {
            const customValidator = this.customValidators.get(ruleConfig.custom);
            if (customValidator) {
                const customResult = customValidator(value, ruleConfig);
                result.valid = result.valid && customResult.valid;
                if (customResult.errors) {
                    result.errors.push(...customResult.errors);
                }
            }
        }

        // Allowed values check
        if (ruleConfig.allowedValues && !ruleConfig.allowedValues.includes(value)) {
            result.valid = false;
            result.errors.push(`Value must be one of: ${ruleConfig.allowedValues.join(', ')}`);
        }

        return result;
    }

    /**
     * Validate type
     * @private
     */
    validateType(value, expectedType) {
        const result = { valid: true, errors: [] };
        const actualType = Array.isArray(value) ? 'array' : typeof value;

        if (actualType !== expectedType) {
            // Try type coercion for numbers
            if (expectedType === 'number' && typeof value === 'string') {
                const num = Number(value);
                if (!isNaN(num)) {
                    return { valid: true, errors: [], value: num };
                }
            }

            result.valid = false;
            result.errors.push(`Expected ${expectedType}, got ${actualType}`);
        }

        return result;
    }

    /**
     * Validate string
     * @private
     */
    validateString(value, rules) {
        const result = {
            valid: true,
            value: value,
            errors: [],
            warnings: []
        };

        // Convert to string if needed
        if (typeof value !== 'string') {
            value = String(value);
            result.value = value;
        }

        // Trim if requested
        if (rules.trim) {
            value = value.trim();
            result.value = value;
        }

        // Empty check
        if (!rules.allowEmpty && value.length === 0) {
            result.valid = false;
            result.errors.push('Value cannot be empty');
            return result;
        }

        // Length validation
        if (rules.minLength !== undefined && value.length < rules.minLength) {
            result.valid = false;
            result.errors.push(`Minimum length is ${rules.minLength}`);
        }

        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
            result.valid = false;
            result.errors.push(`Maximum length is ${rules.maxLength}`);
        }

        // Pattern validation
        if (rules.pattern) {
            const pattern = rules.pattern instanceof RegExp ? rules.pattern : new RegExp(rules.pattern);
            if (!pattern.test(value)) {
                result.valid = false;
                result.errors.push('Value does not match required pattern');
            }
        }

        // Sanitization
        if (rules.sanitize) {
            result.value = this.sanitizeString(value);
            if (result.value !== value) {
                result.warnings.push('Value was sanitized for security');
            }
        }

        return result;
    }

    /**
     * Validate number
     * @private
     */
    validateNumber(value, rules) {
        const result = {
            valid: true,
            value: value,
            errors: []
        };

        // Convert to number if needed
        if (typeof value !== 'number') {
            value = Number(value);
            if (isNaN(value)) {
                result.valid = false;
                result.errors.push('Value is not a valid number');
                return result;
            }
            result.value = value;
        }

        // NaN check
        if (!rules.allowNaN && isNaN(value)) {
            result.valid = false;
            result.errors.push('Value cannot be NaN');
        }

        // Infinity check
        if (!rules.allowInfinity && !isFinite(value)) {
            result.valid = false;
            result.errors.push('Value cannot be Infinity');
        }

        // Range validation
        if (rules.min !== undefined && value < rules.min) {
            result.valid = false;
            result.errors.push(`Minimum value is ${rules.min}`);
        }

        if (rules.max !== undefined && value > rules.max) {
            result.valid = false;
            result.errors.push(`Maximum value is ${rules.max}`);
        }

        // Integer check
        if (rules.integer && !Number.isInteger(value)) {
            // Try rounding
            result.value = Math.round(value);
            result.warnings = ['Value was rounded to integer'];
        }

        // Positive check
        if (rules.positive && value < 0) {
            result.valid = false;
            result.errors.push('Value must be positive');
        }

        return result;
    }

    /**
     * Validate array
     * @private
     */
    validateArray(value, rules) {
        const result = { valid: true, errors: [] };

        if (!Array.isArray(value)) {
            result.valid = false;
            result.errors.push('Value must be an array');
            return result;
        }

        // Length validation
        if (rules.minLength !== undefined && value.length < rules.minLength) {
            result.valid = false;
            result.errors.push(`Array must have at least ${rules.minLength} items`);
        }

        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
            result.valid = false;
            result.errors.push(`Array cannot have more than ${rules.maxLength} items`);
        }

        // Item validation
        if (rules.itemRules) {
            value.forEach((item, index) => {
                const itemResult = this.validate(item, rules.itemRules);
                if (!itemResult.valid) {
                    result.valid = false;
                    result.errors.push(`Item ${index}: ${itemResult.errors.join(', ')}`);
                }
            });
        }

        return result;
    }

    /**
     * Validate object
     * @private
     */
    validateObject(value, rules) {
        const result = { valid: true, errors: [] };

        if (typeof value !== 'object' || value === null) {
            result.valid = false;
            result.errors.push('Value must be an object');
            return result;
        }

        // Validate each property
        for (const [key, propRules] of Object.entries(rules)) {
            if (propRules.required && !(key in value)) {
                result.valid = false;
                result.errors.push(`Missing required property: ${key}`);
                continue;
            }

            if (key in value) {
                const propResult = this.validate(value[key], propRules);
                if (!propResult.valid) {
                    result.valid = false;
                    result.errors.push(`Property ${key}: ${propResult.errors.join(', ')}`);
                }
            }
        }

        return result;
    }

    /**
     * Sanitize string for security
     * @private
     */
    sanitizeString(str) {
        // Remove any HTML tags
        str = str.replace(/<[^>]*>/g, '');
        
        // Escape HTML entities
        const htmlEntities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        };
        
        str = str.replace(/[&<>"'\/]/g, char => htmlEntities[char]);
        
        // Remove any script-like content
        str = str.replace(/javascript:/gi, '');
        str = str.replace(/on\w+\s*=/gi, '');
        
        // Remove null bytes
        str = str.replace(/\0/g, '');
        
        // Trim whitespace
        str = str.trim();
        
        return str;
    }

    /**
     * Batch validate multiple inputs
     * @param {Object} inputs - Object with key-value pairs to validate
     * @param {Object} rulesMap - Object with validation rules for each key
     * @returns {Object} Validation results
     */
    validateBatch(inputs, rulesMap) {
        const results = {
            valid: true,
            values: {},
            errors: {}
        };

        for (const [key, value] of Object.entries(inputs)) {
            if (rulesMap[key]) {
                const result = this.validate(value, rulesMap[key]);
                results.values[key] = result.value;
                
                if (!result.valid) {
                    results.valid = false;
                    results.errors[key] = result.errors;
                }
            } else {
                // No validation rules, pass through
                results.values[key] = value;
            }
        }

        return results;
    }

    /**
     * Create a validator function for forms
     * @param {Object} rulesMap - Validation rules map
     * @returns {Function} Validator function
     */
    createFormValidator(rulesMap) {
        return (formData) => {
            return this.validateBatch(formData, rulesMap);
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputValidator;
}